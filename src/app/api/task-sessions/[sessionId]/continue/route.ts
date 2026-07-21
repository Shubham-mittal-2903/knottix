import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { continueTaskSession } from '@/lib/task-sessions';
import { assertTaskSessionsAvailable } from '@/lib/task-sessions/demo-guard';
import { isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { TaskSessionProgress } from '@/lib/task-sessions';

/** "Continue my website" — resumes if paused, no-ops if already running, or starts another
 *  round toward the same objective if the session previously finished/blocked/failed. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<ServerActionResponse<TaskSessionProgress>>> {
  try {
    assertTaskSessionsAvailable();
    const user = await requirePermission('workflows:execute');
    const { sessionId } = await params;

    const progress = await continueTaskSession(sessionId, user);
    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.task-sessions.continue', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
