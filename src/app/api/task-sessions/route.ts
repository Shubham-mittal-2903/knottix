import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { startTaskSession, listTaskSessions } from '@/lib/task-sessions';
import { assertTaskSessionsAvailable } from '@/lib/task-sessions/demo-guard';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { TaskSession, TaskSessionProgress, TaskSessionStatus } from '@/lib/task-sessions';

const requestSchema = z.object({
  objective: z.string().min(1).max(500),
});

const STATUS_VALUES: TaskSessionStatus[] = ['RUNNING', 'PAUSED', 'BLOCKED', 'COMPLETED', 'FAILED', 'CANCELLED'];

/** Starts a new autonomous Task Session — creates the persisted session row, then runs the first
 *  round entirely through the existing Goal Execution Engine. See `task-sessions/manager.ts`. */
export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<TaskSessionProgress>>> {
  try {
    assertTaskSessionsAvailable();
    const user = await requirePermission('workflows:execute');

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const progress = await startTaskSession(body.data.objective, user);
    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.task-sessions', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/** Lists Task Sessions for the "Running / Paused / Completed / Failed" grouping the Task Sessions
 *  page needs — optionally filtered by `?status=`. */
export async function GET(req: Request): Promise<NextResponse<ServerActionResponse<TaskSession[]>>> {
  try {
    assertTaskSessionsAvailable();
    const user = await requirePermission('workflows:read');

    const statusParam = new URL(req.url).searchParams.get('status');
    const status = statusParam && STATUS_VALUES.includes(statusParam as TaskSessionStatus) ? (statusParam as TaskSessionStatus) : undefined;

    const sessions = await listTaskSessions(user, status);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.task-sessions', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
