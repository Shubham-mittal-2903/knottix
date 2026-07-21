import type { ServerActionResponse } from '@/types';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export function success<T>(data: T): ServerActionResponse<T> {
  return { success: true, data };
}

export function fail(error: string): ServerActionResponse<never> {
  return { success: false, error };
}

export async function actionHandler<T>(
  fn: () => Promise<T>,
  actionName: string,
): Promise<ServerActionResponse<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === 'INTERNAL') {
        logger.error(actionName, error.message, error.context);
      }
      return fail(error.message);
    }
    logger.error(actionName, toErrorMessage(error));
    return fail('An unexpected error occurred');
  }
}
