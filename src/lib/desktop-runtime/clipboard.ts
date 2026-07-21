import type { RegisterToolInput } from '@/lib/tools';
import { runCommand } from './exec';

/**
 * Real Windows clipboard access via PowerShell's built-in `Get-Clipboard`/`Set-Clipboard`
 * cmdlets — no new npm dependency. The text to write is passed through an environment variable
 * (`$env:KNOTTIX_CLIP_TEXT`), never interpolated into the PowerShell script string, so arbitrary
 * clipboard content (quotes, backticks, `$(...)`) can never be parsed as PowerShell code.
 */
export async function clipboardRead(): Promise<string> {
  const { stdout } = await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Clipboard -Raw']);
  return stdout.replace(/\r\n$/, '');
}

export async function clipboardWrite(text: string): Promise<void> {
  await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Set-Clipboard -Value $env:KNOTTIX_CLIP_TEXT'], {
    env: { KNOTTIX_CLIP_TEXT: text },
  });
}

export function createClipboardTools(): RegisterToolInput[] {
  return [
    {
      name: 'clipboard_read',
      description: "Read the current contents of the system clipboard.",
      category: 'system',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const text = await clipboardRead();
        return { text };
      },
    },
    {
      name: 'clipboard_write',
      description: 'Write text to the system clipboard.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [{ name: 'text', type: 'string', description: 'Text to copy to the clipboard', required: true }],
      version: '1.0.0',
      handler: async (input) => {
        const text = String(input.text ?? '');
        await clipboardWrite(text);
        return { written: true, length: text.length };
      },
    },
  ];
}
