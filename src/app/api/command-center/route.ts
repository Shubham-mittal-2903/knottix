import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { getNavForUser, staticCommands } from '@/config/navigation';
import { planCommand, executeCommand } from '@/lib/command-center/engine';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { CommandCenterResponse } from '@/lib/command-center/types';

const requestSchema = z.object({
  query: z.string().min(1).max(500),
  confirm: z.boolean().optional(),
});

/**
 * Single entry point for the Command Center: always classifies, and either executes immediately
 * (read-only intents) or — when the plan `requiresConfirmation` and the client hasn't sent
 * `confirm: true` yet — returns the plan alone so the UI can render the confirmation card. One
 * route, one branch on `confirm`, no second execution path.
 */
export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<CommandCenterResponse>>> {
  try {
    const user = await requireAuth();

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const navItems = getNavForUser(user.permissions, user.isFounder);
    const plan = await planCommand(body.data.query, user, navItems, staticCommands);

    if (plan.requiresConfirmation && !body.data.confirm) {
      return NextResponse.json({ success: true, data: { plan, result: null } });
    }

    const result = await executeCommand(plan, user);
    return NextResponse.json({ success: true, data: { plan, result } });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.command-center', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
