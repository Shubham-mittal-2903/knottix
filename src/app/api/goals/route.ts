import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { startGoal } from '@/lib/goal-engine';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { GoalExecutionSummary } from '@/lib/goal-engine';

const requestSchema = z.object({
  goal: z.string().min(1).max(500),
});

/**
 * Starts a new Goal Execution — plans (`planGoal`) and immediately begins executing via the
 * Workflow Engine. If the plan's first confirmation-gated step is reached before this call
 * returns, the response comes back with `status: 'WAITING_CONFIRMATION'` and the client polls
 * `GET /api/goals/[executionId]` / posts to `/confirm` — the same pause/resume contract every
 * other confirmation-gated flow in Knottix already uses (DEC-035/038).
 */
export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<GoalExecutionSummary>>> {
  try {
    const user = await requirePermission('workflows:execute');

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const summary = await startGoal(body.data.goal, user);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.goals', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
