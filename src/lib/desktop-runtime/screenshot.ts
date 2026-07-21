import { mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { RegisterToolInput } from '@/lib/tools';
import { runCommand } from './exec';

const SCREENSHOT_DIR = join(homedir(), 'Knottix', 'Screenshots');

const CAPTURE_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save($env:KNOTTIX_SCREENSHOT_PATH, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;

/** Real screen capture via .NET's System.Drawing (through PowerShell) — no new dependency, produces an actual PNG on disk every call. */
export async function captureScreenshot(): Promise<string> {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const filePath = join(SCREENSHOT_DIR, `screenshot-${Date.now()}.png`);
  await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', CAPTURE_SCRIPT], {
    env: { KNOTTIX_SCREENSHOT_PATH: filePath },
    timeoutMs: 10_000,
  });
  return filePath;
}

export function createScreenshotTools(): RegisterToolInput[] {
  return [
    {
      name: 'take_screenshot',
      description: 'Capture the primary screen and save it as a PNG file.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const path = await captureScreenshot();
        return { path };
      },
    },
  ];
}
