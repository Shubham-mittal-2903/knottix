import { existsSync } from 'fs';
import { join } from 'path';
import type { RegisterToolInput, ToolParameterDefinition } from '@/lib/tools';
import { commandExists, launchDetached, launchDirect, runCommand } from './exec';
import { openTerminal } from './os-tools';

const REQUIRED_PATH: ToolParameterDefinition = { name: 'path', type: 'string', description: 'Absolute project directory', required: true };

async function startDevServer(cwd: string, script: string): Promise<string> {
  const hasWt = await commandExists('wt');
  if (hasWt) {
    launchDetached('wt', ['-d', cwd, 'cmd', '/k', `npm run ${script}`]);
  } else {
    launchDetached('cmd.exe', ['/K', `cd /d "${cwd}" && npm run ${script}`]);
  }
  return `Started "npm run ${script}" in a new terminal window at ${cwd}.`;
}

async function gitCommand(cwd: string, args: string[]): Promise<{ output: string; error?: string }> {
  try {
    const { stdout, stderr } = await runCommand('git', args, { cwd });
    return { output: stdout.trim() || stderr.trim() || '(no output)' };
  } catch (error) {
    return { output: '', error: error instanceof Error ? error.message : 'git command failed' };
  }
}

/**
 * The allowlisted developer-tool alternative to unrestricted shell execution — each tool runs
 * exactly one fixed command (git status/pull/fetch/commit/push, npm run <script>), never an
 * arbitrary caller-supplied command string. Mutating git operations (commit, push) require
 * confirmation.
 */
export function createDevTools(): RegisterToolInput[] {
  return [
    {
      name: 'open_project',
      description: 'Open a project folder in VS Code.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => {
        const path = String(input.path);
        launchDetached('code', [`"${path}"`]);
        return { launched: true, path };
      },
    },
    {
      name: 'start_dev_server',
      description: 'Run "npm run <script>" (default "dev") for a project in a new terminal window.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [
        REQUIRED_PATH,
        { name: 'script', type: 'string', description: 'package.json script to run', required: false, defaultValue: 'dev' },
      ],
      version: '1.0.0',
      handler: async (input) => {
        const path = String(input.path);
        const script = typeof input.script === 'string' && input.script ? input.script : 'dev';
        const message = await startDevServer(path, script);
        return { started: true, message };
      },
    },
    {
      name: 'git_status',
      description: 'Run "git status" in a project directory.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => gitCommand(String(input.path), ['status']),
    },
    {
      name: 'git_pull',
      description: 'Run "git pull" in a project directory.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => gitCommand(String(input.path), ['pull']),
    },
    {
      name: 'git_fetch',
      description: 'Run "git fetch" in a project directory.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => gitCommand(String(input.path), ['fetch']),
    },
    {
      name: 'git_add',
      description: 'Run "git add -A" (stage all changes) in a project directory. Staging is reversible and non-destructive, so — unlike commit/push — this does not require confirmation.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => gitCommand(String(input.path), ['add', '-A']),
    },
    {
      name: 'git_commit',
      description: 'Commit currently staged changes with a message. Always requires confirmation.',
      category: 'system',
      permission: 'desktop:manage',
      metadata: { requiresConfirmation: true },
      parameters: [
        REQUIRED_PATH,
        { name: 'message', type: 'string', description: 'Commit message', required: true },
      ],
      version: '1.0.0',
      handler: async (input) => gitCommand(String(input.path), ['commit', '-m', String(input.message)]),
    },
    {
      name: 'git_push',
      description: 'Push the current branch to its upstream remote. Always requires confirmation.',
      category: 'system',
      permission: 'desktop:manage',
      metadata: { requiresConfirmation: true, isDangerous: true },
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => gitCommand(String(input.path), ['push']),
    },
    {
      name: 'open_terminal_in_project',
      description: 'Open a terminal window with its working directory set to a project folder.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => {
        const message = await openTerminal(String(input.path));
        return { launched: true, message };
      },
    },
    {
      name: 'open_logs',
      description: 'Open a project\'s "logs" folder in File Explorer, if one exists.',
      category: 'system',
      permission: 'desktop:execute',
      parameters: [REQUIRED_PATH],
      version: '1.0.0',
      handler: async (input) => {
        const projectPath = String(input.path);
        const logsPath = join(projectPath, 'logs');
        if (!existsSync(logsPath)) {
          return { found: false, message: `No "logs" folder found at ${logsPath}.` };
        }
        launchDirect('explorer.exe', [logsPath]);
        return { found: true, path: logsPath };
      },
    },
  ];
}
