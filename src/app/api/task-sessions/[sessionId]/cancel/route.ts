import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { cancelTaskSession } from '@/lib/task-sessions';
import { assertTaskSessionsAvailable } from '@/lib/task-sessions/demo-guard';
import { isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { TaskSession } from '@/lib/task-sessions';

/** "Pause current session" in the mission's own words maps to cancel here — Knottix has no
 *  mechanism to pause a step that's actively executing mid-flight (only confirmation-gated steps
 *  ever pause on their own); declining a pending confirmation and marking the session CANCELLED is
 *  the honest real behavior, not a fabricated "paused, will resume automatically later" state. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<ServerActionResponse<TaskSession>>> {
  try {
    assertTaskSessionsAvailable();
    const user = await requirePermission('workflows:execute');
    const { sessionId } = await params;

    const session = await cancelTaskSession(sessionId, user);
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.task-sessions.cancel', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
