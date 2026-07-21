import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { resumeGoal } from '@/lib/goal-engine';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { GoalExecutionSummary } from '@/lib/goal-engine';

const requestSchema = z.object({
  confirm: z.boolean(),
});

/** Resumes a goal execution paused at a confirmation-gated step (git_commit, git_push,
 *  close_app, whatsapp_send_message, ...) — `confirm: false` declines it and stops the goal
 *  rather than skipping ahead, so a declined step is never silently treated as optional. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ executionId: string }> },
): Promise<NextResponse<ServerActionResponse<GoalExecutionSummary>>> {
  try {
    const user = await requirePermission('workflows:execute');
    const { executionId } = await params;

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const summary = await resumeGoal(executionId, body.data.confirm, user);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.goals.confirm', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
