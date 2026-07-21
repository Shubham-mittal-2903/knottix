import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { speak } from '@/lib/desktop-runtime/voice/tts';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';

const requestSchema = z.object({ text: z.string().min(1).max(2000) });

interface SpeakResponse {
  provider: 'elevenlabs' | 'local';
  spoken: boolean;
}

/** Speaks the given text out loud on the local machine (server-side, since Knottix runs on the user's own computer) — never a no-op. */
export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<SpeakResponse>>> {
  try {
    await requireAuth();

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const result = await speak(body.data.text);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.voice.speak', toErrorMessage(error));
    return NextResponse.json({ success: false, error: toErrorMessage(error) }, { status: 500 });
  }
}
