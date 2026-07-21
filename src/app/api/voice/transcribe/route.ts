import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { transcribeAudio } from '@/lib/desktop-runtime/voice/stt';
import { detectWakePhrase } from '@/lib/desktop-runtime/voice/wake-word';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';

interface TranscribeResponse {
  text: string;
  provider: 'whisper' | 'deepgram';
  woken: boolean;
  command: string;
}

export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<TranscribeResponse>>> {
  try {
    await requireAuth();

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.startsWith('audio/') && !contentType.startsWith('multipart/')) {
      throw AppError.badRequest('Request body must be an audio blob (audio/webm, audio/wav, ...).');
    }

    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw AppError.badRequest('Empty audio payload.');

    const { text, provider } = await transcribeAudio(Buffer.from(arrayBuffer), contentType);
    const { woken, command } = detectWakePhrase(text);

    return NextResponse.json({ success: true, data: { text, provider, woken, command } });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.voice.transcribe', toErrorMessage(error));
    return NextResponse.json({ success: false, error: toErrorMessage(error) }, { status: 500 });
  }
}
