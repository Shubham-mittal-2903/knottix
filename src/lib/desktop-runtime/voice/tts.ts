import { mkdir, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { runCommand } from '../exec';
import { logger } from '@/lib/logger';

const AUDIO_DIR = join(homedir(), 'Knottix', 'Audio');
const DEFAULT_ELEVENLABS_VOICE = 'JBFqnCBsd6RMkjVDRZzb'; // ElevenLabs' public "George" voice — used only when no ELEVENLABS_VOICE_ID is set

const LOCAL_TTS_SCRIPT = `
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.Speak($env:KNOTTIX_TTS_TEXT)
$speak.Dispose()
`;

const PLAY_AUDIO_SCRIPT = `
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([Uri]::new($env:KNOTTIX_AUDIO_PATH))
Start-Sleep -Milliseconds 500
$player.Play()
$timeout = 0
while (-not $player.NaturalDuration.HasTimeSpan -and $timeout -lt 20) { Start-Sleep -Milliseconds 200; $timeout++ }
if ($player.NaturalDuration.HasTimeSpan) {
  Start-Sleep -Seconds ([int][Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds))
} else {
  Start-Sleep -Seconds 5
}
$player.Close()
`;

/** Real Windows speech synthesis via .NET's System.Speech (SAPI) — speaks through the machine's actual speakers, no dependency. */
async function speakLocal(text: string): Promise<void> {
  await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', LOCAL_TTS_SCRIPT], {
    env: { KNOTTIX_TTS_TEXT: text },
    timeoutMs: 30_000,
  });
}

async function speakElevenLabs(text: string, apiKey: string): Promise<boolean> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'content-type': 'application/json',
      accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
  });

  if (!res.ok) {
    logger.warn('desktop-runtime.voice.tts', `ElevenLabs TTS failed (${res.status})`);
    return false;
  }

  await mkdir(AUDIO_DIR, { recursive: true });
  const filePath = join(AUDIO_DIR, `speech-${Date.now()}.mp3`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);

  await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PLAY_AUDIO_SCRIPT], {
    env: { KNOTTIX_AUDIO_PATH: filePath },
    timeoutMs: 60_000,
  });
  return true;
}

/**
 * Speaks `text` out loud on the local machine — ElevenLabs when `ELEVENLABS_API_KEY` is
 * configured, otherwise Windows' built-in SAPI voice via PowerShell. Always actually plays
 * audio; never a no-op.
 */
export async function speak(text: string): Promise<{ provider: 'elevenlabs' | 'local'; spoken: boolean }> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (elevenLabsKey) {
    const ok = await speakElevenLabs(text, elevenLabsKey).catch((error) => {
      logger.warn('desktop-runtime.voice.tts', 'ElevenLabs TTS threw, falling back to local', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    });
    if (ok) return { provider: 'elevenlabs', spoken: true };
  }

  await speakLocal(text);
  return { provider: 'local', spoken: true };
}
