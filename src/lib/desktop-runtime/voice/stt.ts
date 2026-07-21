import { logger } from '@/lib/logger';

export interface TranscriptionResult {
  text: string;
  provider: 'whisper' | 'deepgram';
}

async function transcribeWithWhisper(audio: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), 'audio.webm');
  form.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Whisper API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text?: string };
  return json.text?.trim() ?? '';
}

async function transcribeWithDeepgram(audio: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'content-type': mimeType,
    },
    body: new Uint8Array(audio),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Deepgram API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  return json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';
}

/**
 * Transcribes real audio via whichever real STT provider is configured — Deepgram preferred if
 * `DEEPGRAM_API_KEY` is set (lower latency, purpose-built for streaming/short chunks), otherwise
 * OpenAI Whisper if `OPENAI_API_KEY` is set. Throws a clear error (never a fake transcript) if
 * neither is configured or the call fails.
 */
export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<TranscriptionResult> {
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (deepgramKey) {
    const text = await transcribeWithDeepgram(audio, mimeType, deepgramKey);
    return { text, provider: 'deepgram' };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const text = await transcribeWithWhisper(audio, mimeType, openaiKey);
    return { text, provider: 'whisper' };
  }

  logger.warn('desktop-runtime.voice.stt', 'No STT provider configured (DEEPGRAM_API_KEY or OPENAI_API_KEY)');
  throw new Error('No speech-to-text provider is configured. Set DEEPGRAM_API_KEY or OPENAI_API_KEY.');
}
