import type { RegisterSkillInput } from '../types';
import { extractAfterKeyword, extractQuoted, step } from './shared';

const APP_ALIASES: { keywords: string[]; toolName: string; app: string }[] = [
  { keywords: ['chrome'], toolName: 'open_chrome', app: 'Chrome' },
  { keywords: ['edge'], toolName: 'open_edge', app: 'Edge' },
  { keywords: ['vs code', 'vscode', 'visual studio code'], toolName: 'open_vscode', app: 'VS Code' },
  { keywords: ['cursor'], toolName: 'open_cursor', app: 'Cursor' },
  { keywords: ['file explorer', 'explorer'], toolName: 'open_file_explorer', app: 'File Explorer' },
  { keywords: ['terminal', 'command prompt'], toolName: 'open_terminal', app: 'Terminal' },
];

/** Desktop skills — every step calls a real, already-registered Desktop Runtime tool. */
export function createDesktopSkills(): RegisterSkillInput[] {
  return [
    {
      key: 'open-application',
      name: 'Open Application',
      description: 'Launches a known desktop application (Chrome, Edge, VS Code, Cursor, File Explorer, or a terminal).',
      category: 'desktop',
      requiredTools: ['open_chrome', 'open_edge', 'open_vscode', 'open_cursor', 'open_file_explorer', 'open_terminal'],
      requiredPermission: 'desktop:execute',
      inputs: [{ name: 'app', type: 'string', description: 'Which application to open', required: true }],
      outputs: 'Confirmation that the application process was launched.',
      verificationMethod: 'The launch tool reports success/failure; there is no post-launch window check.',
      keywords: ['open chrome', 'launch chrome', 'open edge', 'launch edge', 'open vs code', 'open vscode', 'open cursor', 'file explorer', 'open terminal', 'launch terminal', 'open an app', 'open application'],
      buildPlan: (goalText) => {
        const g = goalText.toLowerCase();
        const match = APP_ALIASES.find((a) => a.keywords.some((kw) => g.includes(kw)));
        if (!match) return null;
        return { startStepId: 's1', steps: [step('s1', `Open ${match.app}`, 'tool', { toolName: match.toolName })] };
      },
    },
    {
      key: 'close-application',
      name: 'Close Application',
      description: 'Force-closes a running application by process name. Always requires confirmation.',
      category: 'desktop',
      requiredTools: ['close_app'],
      requiredPermission: 'desktop:manage',
      inputs: [{ name: 'processName', type: 'string', description: 'Process name (e.g. "chrome", "Code")', required: true }],
      outputs: 'Confirmation the process was closed.',
      verificationMethod: 'The taskkill result reports success/failure directly.',
      keywords: ['close ', 'quit ', 'exit '],
      buildPlan: (goalText) => {
        const processName = extractAfterKeyword(goalText, ['close', 'quit', 'exit']);
        if (!processName) return null;
        return { startStepId: 's1', steps: [step('s1', `Close ${processName}`, 'tool', { toolName: 'close_app', params: { processName } })] };
      },
    },
    {
      key: 'take-screenshot',
      name: 'Take Screenshot',
      description: 'Captures the primary screen and saves it as a PNG file.',
      category: 'desktop',
      requiredTools: ['take_screenshot'],
      requiredPermission: 'desktop:execute',
      inputs: [],
      outputs: 'The saved PNG file path.',
      verificationMethod: 'A real file path is returned only if the capture succeeded; no path means the capture failed.',
      keywords: ['screenshot', 'capture screen', 'capture my screen', 'take a screenshot'],
      buildPlan: () => ({ startStepId: 's1', steps: [step('s1', 'Capture screenshot', 'tool', { toolName: 'take_screenshot' })] }),
    },
    {
      key: 'clipboard-write',
      name: 'Copy to Clipboard',
      description: 'Writes text to the system clipboard.',
      category: 'desktop',
      requiredTools: ['clipboard_write'],
      requiredPermission: 'desktop:execute',
      inputs: [{ name: 'text', type: 'string', description: 'Text to copy', required: true }],
      outputs: 'Confirmation and character count written.',
      verificationMethod: 'The clipboard tool reports the exact length written.',
      keywords: ['copy to clipboard', 'copy this'],
      buildPlan: (goalText) => {
        const text = extractQuoted(goalText) ?? extractAfterKeyword(goalText, ['copy to clipboard', 'copy']);
        if (!text) return null;
        return { startStepId: 's1', steps: [step('s1', 'Write clipboard', 'tool', { toolName: 'clipboard_write', params: { text } })] };
      },
    },
    {
      key: 'clipboard-read',
      name: 'Read Clipboard',
      description: 'Reads the current contents of the system clipboard.',
      category: 'desktop',
      requiredTools: ['clipboard_read'],
      requiredPermission: 'desktop:execute',
      inputs: [],
      outputs: 'The clipboard text.',
      verificationMethod: 'A single read-only step — nothing to separately verify.',
      keywords: ['read clipboard', "what's on my clipboard", 'clipboard contents'],
      buildPlan: () => ({ startStepId: 's1', steps: [step('s1', 'Read clipboard', 'tool', { toolName: 'clipboard_read' })] }),
    },
  ];
}
