'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CHUNK_MS = 4000;

/**
 * Functional voice wiring for the Command Center — continuous short-chunk recording via
 * `MediaRecorder`, each chunk sent to `/api/voice/transcribe` (real Whisper/Deepgram STT). When
 * a chunk's transcript contains "Hey Knottix", the text after it is handed to `onCommand`, which
 * the Command Center feeds into the exact same `submit()` typed commands already use — voice and
 * typed input share one execution pipeline, per the mission. No new UI was designed for this;
 * `CommandCenter.tsx` only adds one toggle button reusing its existing button styling.
 */
export function useVoiceMode(onCommand: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const stopListening = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setListening(false);
    setStatus('idle');
  }, []);

  const processChunk = useCallback(
    async (blob: Blob) => {
      try {
        const res = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'content-type': blob.type || 'audio/webm' },
          body: blob,
        });
        const json = await res.json();
        if (json.success && json.data.woken && json.data.command) {
          onCommand(json.data.command);
        }
      } catch {
        // A single failed chunk (network blip, no STT provider configured) shouldn't kill the
        // listening loop — it just quietly retries on the next chunk.
      }
    },
    [onCommand],
  );

  const startListening = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) void processChunk(event.data);
      };
      recorder.start(CHUNK_MS);

      setListening(true);
      setStatus('listening');
    } catch {
      setStatus('error');
    }
  }, [processChunk]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      void startListening();
    }
  }, [listening, startListening, stopListening]);

  useEffect(() => stopListening, [stopListening]);

  return { listening, status, toggleListening };
}

/** Speaks `text` out loud on the local machine via `/api/voice/speak` (real ElevenLabs/SAPI playback). */
export async function speakResult(text: string): Promise<void> {
  try {
    await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Best-effort — a failed TTS call shouldn't surface as an error in the Command Center UI.
  }
}
