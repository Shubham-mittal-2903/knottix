import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { getGoalStatus } from '@/lib/goal-engine';
import { isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { GoalExecutionSummary } from '@/lib/goal-engine';

/** Polled by the Live Execution Panel to reflect real, current task-graph state — no websocket
 *  infra exists in this codebase, so TanStack Query's polling (already a project dependency,
 *  DEC-007) is the reuse-first choice over introducing one. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ executionId: string }> },
): Promise<NextResponse<ServerActionResponse<GoalExecutionSummary>>> {
  try {
    const user = await requirePermission('workflows:read');
    const { executionId } = await params;

    const summary = await getGoalStatus(executionId, user);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.goals.status', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'Goal execution not found.' }, { status: 404 });
  }
}
