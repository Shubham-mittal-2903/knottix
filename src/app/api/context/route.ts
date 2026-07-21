import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { collectContext, assertContextEngineAvailable } from '@/lib/context-engine';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { ContextCollectionResult } from '@/lib/context-engine';

const requestSchema = z.object({
  query: z.string().min(1).max(500),
});

/** Backs the Mission Control Context Inspector (`/context`) — runs the exact same
 *  `collectContext()` pipeline `startGoal()` itself calls, so "what would be collected for this
 *  goal" is always a live answer, never a separately-maintained description. */
export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<ContextCollectionResult>>> {
  try {
    assertContextEngineAvailable();
    const user = await requirePermission('workflows:read');

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const result = await collectContext(body.data.query, user);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.context', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
