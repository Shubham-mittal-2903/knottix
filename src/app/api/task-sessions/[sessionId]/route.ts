import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { getTaskSessionProgress } from '@/lib/task-sessions';
import { assertTaskSessionsAvailable } from '@/lib/task-sessions/demo-guard';
import { isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { TaskSessionProgress } from '@/lib/task-sessions';

/** Polled by the Task Sessions page for live progress — real recovery: this works identically
 *  whether the underlying goal execution is still in-process or was rehydrated from persisted
 *  state after a restart (see `WorkflowExecutor.resume()`/`getGoalStatus()`'s fallback paths). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<ServerActionResponse<TaskSessionProgress>>> {
  try {
    assertTaskSessionsAvailable();
    const user = await requirePermission('workflows:read');
    const { sessionId } = await params;

    const progress = await getTaskSessionProgress(sessionId, user);
    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.task-sessions.progress', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'Task session not found.' }, { status: 404 });
  }
}
