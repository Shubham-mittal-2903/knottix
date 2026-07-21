const WAKE_PHRASE = /hey\s+knottix[,.]?\s*/i;

/**
 * Wake-phrase detection is STT-based (transcribe short rolling audio chunks, string-match the
 * phrase in the transcript) rather than a dedicated low-power acoustic wake-word model like
 * Porcupine — no wake-word engine or model file ships with this codebase, and adding one is a
 * real new dependency with its own licensing/setup story. This means each "listen" cycle costs a
 * real STT API call rather than running for free on-device; see IDEA-039 for upgrading to a
 * dedicated wake-word engine if that cost matters in practice.
 */
export function detectWakePhrase(transcript: string): { woken: boolean; command: string } {
  const match = transcript.match(WAKE_PHRASE);
  if (!match) return { woken: false, command: '' };

  const command = transcript.slice((match.index ?? 0) + match[0].length).trim();
  return { woken: true, command };
}
