import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Runs a fixed executable with an argument array — never a shell-interpolated string, so
 * user-supplied values (a commit message, a search query) can never break out of their argument
 * position and inject a second command. Every Desktop Runtime tool that needs a result (git
 * status, clipboard read, screenshot) goes through this, not `exec()`.
 */
export async function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number; env?: Record<string, string> },
): Promise<ExecResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options?.cwd,
    timeout: options?.timeoutMs ?? 15_000,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
  });
  return { stdout: stdout.toString(), stderr: stderr.toString() };
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync('where', [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detached, fire-and-forget launch for GUI apps and long-running processes (a dev server) that
 * must keep running after the tool call returns. Routed through `cmd.exe /c start` — the
 * standard Windows idiom for launching an app without the child process being tied to (or
 * killed with) this Node process.
 */
export function launchDetached(target: string, args: string[] = [], options?: { cwd?: string }): void {
  const child = spawn('cmd.exe', ['/c', 'start', '""', target, ...args], {
    cwd: options?.cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

/** Same as `launchDetached` but bypasses `start` — for executables (explorer.exe) that don't need shell resolution. */
export function launchDirect(target: string, args: string[] = [], options?: { cwd?: string }): void {
  const child = spawn(target, args, {
    cwd: options?.cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();
}
