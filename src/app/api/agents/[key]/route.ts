import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { getRequestContext } from '@/lib/request';
import { createAuditLog } from '@/lib/db/queries/audit';
import { buildIntelligenceContext } from '@/lib/system/request-context';
import { findAIEmployee } from '@/config/ai-employees';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { AgentExecutionResult } from '@/lib/agents';
import type { Prisma } from '@/generated/prisma/client';

const requestSchema = z.object({
  input: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse<ServerActionResponse<AgentExecutionResult>>> {
  try {
    const { key } = await params;
    const employee = findAIEmployee(key);
    if (!employee) throw AppError.notFound('AI Employee', key);

    const user = await requirePermission('agents:execute');

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) {
      throw AppError.validation('Invalid request body', { issues: body.error.issues });
    }

    const { system, context: intelligenceContext } = await buildIntelligenceContext(user, 'agents', body.data.conversationId);

    const { ipAddress, userAgent } = await getRequestContext();

    const result = await system.intelligence.agents.execute(
      { agentKey: employee.key, organizationId: user.organizationId, input: body.data.input },
      {
        userId: user.id,
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        isFounder: user.isFounder,
        permissions: user.permissions,
      },
      intelligenceContext,
    );

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'AI_EXECUTION',
      entityType: 'agent',
      entityId: employee.key,
      entityName: employee.name,
      after: { status: result.status, usage: result.usage, latencyMs: result.latencyMs } as unknown as Prisma.InputJsonValue,
      metadata: { requestId: result.requestId } as unknown as Prisma.InputJsonValue,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    if (result.status === 'failed') {
      return NextResponse.json({ success: false, error: result.error ?? 'Agent execution failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.agents', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
