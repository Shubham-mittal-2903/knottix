import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { resumeTaskSession } from '@/lib/task-sessions';
import { assertTaskSessionsAvailable } from '@/lib/task-sessions/demo-guard';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { TaskSessionProgress } from '@/lib/task-sessions';

const requestSchema = z.object({ confirm: z.boolean() });

/** Resumes a session paused at a confirmation-gated step — `confirm: false` declines it. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<ServerActionResponse<TaskSessionProgress>>> {
  try {
    assertTaskSessionsAvailable();
    const user = await requirePermission('workflows:execute');
    const { sessionId } = await params;

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const progress = await resumeTaskSession(sessionId, body.data.confirm, user);
    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.task-sessions.confirm', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
