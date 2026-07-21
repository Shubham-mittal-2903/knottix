import type { RegisterToolInput, ToolParameterDefinition } from '@/lib/tools';
import { commandExists, launchDetached, launchDirect, runCommand } from './exec';

const REQUIRED_STRING = (name: string, description: string): ToolParameterDefinition => ({
  name,
  type: 'string',
  description,
  required: true,
});

export async function openTerminal(cwd?: string): Promise<string> {
  const hasWt = await commandExists('wt');
  if (hasWt) {
    launchDetached('wt', cwd ? ['-d', cwd] : []);
    return 'Opened Windows Terminal.';
  }
  launchDetached('cmd.exe', cwd ? ['/K', `cd /d "${cwd}"`] : []);
  return 'Opened Command Prompt (Windows Terminal not found on PATH).';
}

/** PowerShell's `Start-Process -WindowStyle` focus/switch helper — brings a running app's window to the foreground by process name, via a P/Invoke of user32's SetForegroundWindow. */
async function focusWindowByProcessName(processName: string): Promise<{ found: boolean }> {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -Name Win32 -Namespace Native -MemberDefinition '
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'
$proc = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($proc) {
  [Native.Win32]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
  [Native.Win32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
  Write-Output 'found'
} else {
  Write-Output 'not-found'
}
`;
  const { stdout } = await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  return { found: stdout.trim() === 'found' };
}

/** `taskkill` by process name/image — the only close-app path exposed, and only ever reached after Command Center confirmation (`metadata.requiresConfirmation`). */
async function closeAppByProcessName(processName: string): Promise<{ closed: boolean; message: string }> {
  try {
    await runCommand('taskkill.exe', ['/IM', processName.endsWith('.exe') ? processName : `${processName}.exe`, '/F']);
    return { closed: true, message: `Closed ${processName}.` };
  } catch (error) {
    return { closed: false, message: error instanceof Error ? error.message : `Could not close ${processName}.` };
  }
}

function searchUrl(engine: 'google' | 'youtube', query: string): string {
  const q = encodeURIComponent(query);
  return engine === 'google' ? `https://www.google.com/search?q=${q}` : `https://www.youtube.com/results?search_query=${q}`;
}

/**
 * Real, executing OS automation for Windows — every tool here spawns an actual process or shells
 * a small fixed PowerShell script via `execFile`/`spawn` (never string-interpolated `exec`).
 * Deliberately excludes raw global mouse/keyboard simulation and unrestricted shell execution —
 * see DEC-037 for why.
 */
export function createOsTools(): RegisterToolInput[] {
  return [
    {
      name: 'open_chrome',
      description: 'Launch Google Chrome.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        launchDetached('chrome');
        return { launched: true, app: 'chrome' };
      },
    },
    {
      name: 'open_edge',
      description: 'Launch Microsoft Edge.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        launchDetached('msedge');
        return { launched: true, app: 'edge' };
      },
    },
    {
      name: 'open_vscode',
      description: 'Launch Visual Studio Code, optionally opening a folder.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [{ name: 'path', type: 'string', description: 'Folder or file to open', required: false }],
      version: '1.0.0',
      handler: async (input) => {
        const path = typeof input.path === 'string' ? input.path : undefined;
        launchDetached('code', path ? [`"${path}"`] : []);
        return { launched: true, app: 'vscode', path: path ?? null };
      },
    },
    {
      name: 'open_cursor',
      description: 'Launch the Cursor editor, optionally opening a folder.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [{ name: 'path', type: 'string', description: 'Folder or file to open', required: false }],
      version: '1.0.0',
      handler: async (input) => {
        const path = typeof input.path === 'string' ? input.path : undefined;
        launchDetached('cursor', path ? [`"${path}"`] : []);
        return { launched: true, app: 'cursor', path: path ?? null };
      },
    },
    {
      name: 'open_file_explorer',
      description: 'Open Windows File Explorer, optionally at a specific folder.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [{ name: 'path', type: 'string', description: 'Folder path to open', required: false }],
      version: '1.0.0',
      handler: async (input) => {
        const path = typeof input.path === 'string' ? input.path : undefined;
        launchDirect('explorer.exe', path ? [path] : []);
        return { launched: true, app: 'explorer', path: path ?? null };
      },
    },
    {
      name: 'open_terminal',
      description: 'Open a terminal window (Windows Terminal if installed, otherwise Command Prompt), optionally in a specific folder.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [{ name: 'path', type: 'string', description: 'Working directory to open the terminal in', required: false }],
      version: '1.0.0',
      handler: async (input) => {
        const path = typeof input.path === 'string' ? input.path : undefined;
        const message = await openTerminal(path);
        return { launched: true, message };
      },
    },
    {
      name: 'open_folder',
      description: 'Open a specific folder in File Explorer.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('path', 'Absolute folder path to open')],
      version: '1.0.0',
      handler: async (input) => {
        const path = String(input.path);
        launchDirect('explorer.exe', [path]);
        return { launched: true, path };
      },
    },
    {
      name: 'open_file',
      description: 'Open a specific file with its default application.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('path', 'Absolute file path to open')],
      version: '1.0.0',
      handler: async (input) => {
        const path = String(input.path);
        launchDetached(path);
        return { launched: true, path };
      },
    },
    {
      name: 'open_url',
      description: 'Open a URL in the system default browser.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('url', 'The URL to open')],
      version: '1.0.0',
      handler: async (input) => {
        const url = String(input.url);
        launchDetached(url);
        return { launched: true, url };
      },
    },
    {
      name: 'google_search',
      description: 'Open a Google search for a query in the default browser.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('query', 'What to search for')],
      version: '1.0.0',
      handler: async (input) => {
        const query = String(input.query);
        const url = searchUrl('google', query);
        launchDetached(url);
        return { launched: true, query, url };
      },
    },
    {
      name: 'youtube_search',
      description: 'Open a YouTube search for a query in the default browser.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('query', 'What to search for')],
      version: '1.0.0',
      handler: async (input) => {
        const query = String(input.query);
        const url = searchUrl('youtube', query);
        launchDetached(url);
        return { launched: true, query, url };
      },
    },
    {
      name: 'focus_window',
      description: 'Bring a running application\'s window to the foreground by process name (e.g. "chrome", "Code").',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('processName', 'Process name, without .exe (e.g. "chrome", "Code", "explorer")')],
      version: '1.0.0',
      handler: async (input) => {
        const processName = String(input.processName);
        const result = await focusWindowByProcessName(processName);
        return { ...result, processName };
      },
    },
    {
      name: 'switch_window',
      description: 'Alias for focus_window — switches focus to a running application by process name.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_STRING('processName', 'Process name, without .exe')],
      version: '1.0.0',
      handler: async (input) => {
        const processName = String(input.processName);
        const result = await focusWindowByProcessName(processName);
        return { ...result, processName };
      },
    },
    {
      name: 'close_app',
      description: 'Force-close a running application by process name. Always requires confirmation.',
      category: 'system',
      permission: 'desktop:manage',
      metadata: { requiresConfirmation: true, isDangerous: true },
      parameters: [REQUIRED_STRING('processName', 'Process name, without .exe (e.g. "chrome", "Code")')],
      version: '1.0.0',
      handler: async (input) => {
        const processName = String(input.processName);
        return closeAppByProcessName(processName);
      },
    },
  ];
}
