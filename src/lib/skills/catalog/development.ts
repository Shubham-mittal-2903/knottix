import type { RegisterSkillInput } from '../types';
import { extractProjectPath, step } from './shared';

/**
 * Development skills — every step calls a real, already-registered Desktop Runtime dev tool
 * (`src/lib/desktop-runtime/dev-tools.ts`) or a real AI Employee. No skill here is speculative:
 * "Build Next.js Project" and "Debug TypeScript" (named as illustrative examples in the mission)
 * are deliberately NOT registered — Knottix has no code-scaffolding or type-checking tool to back
 * them, and a skill with no real tool behind it would be exactly the placeholder the mission's
 * "No Placeholders" rule forbids.
 */
export function createDevelopmentSkills(): RegisterSkillInput[] {
  return [
    {
      key: 'deploy-project',
      name: 'Deploy Project',
      description: 'Stages, commits, and pushes a project\'s current changes, then verifies a clean working tree.',
      category: 'development',
      requiredTools: ['git_status', 'git_add', 'git_commit', 'git_push'],
      requiredPermission: 'workflows:execute',
      inputs: [{ name: 'path', type: 'string', description: 'Absolute project directory', required: true }],
      outputs: 'Git status before/after, the commit result, and the push result.',
      verificationMethod: 'Re-runs git_status after the push and reports the resulting working-tree state.',
      keywords: ['deploy', 'push my changes', 'ship it', 'ship this'],
      buildPlan: (goalText) => {
        const path = extractProjectPath(goalText);
        if (!path) return null;
        return {
          startStepId: 's1',
          steps: [
            step('s1', 'Check working tree', 'tool', { toolName: 'git_status', params: { path } }, 's2'),
            step('s2', 'Stage changes', 'tool', { toolName: 'git_add', params: { path } }, 's3'),
            step('s3', 'Commit changes', 'tool', { toolName: 'git_commit', params: { path, message: `Deploy: ${goalText}`.slice(0, 72) } }, 's4'),
            step('s4', 'Push to remote', 'tool', { toolName: 'git_push', params: { path } }, 's5'),
            step('s5', 'Verify clean tree', 'tool', { toolName: 'git_status', params: { path } }),
          ],
        };
      },
    },
    {
      key: 'sync-repository',
      name: 'Sync Repository',
      description: 'Fetches and pulls the latest changes for a project, then verifies the result.',
      category: 'development',
      requiredTools: ['git_fetch', 'git_pull', 'git_status'],
      requiredPermission: 'workflows:execute',
      inputs: [{ name: 'path', type: 'string', description: 'Absolute project directory', required: true }],
      outputs: 'Fetch result, pull result, and the resulting git status.',
      verificationMethod: 'Runs git_status after the pull and reports the working-tree state.',
      keywords: ['sync my repo', 'sync repo', 'pull latest', 'update the repo', 'pull the repo', 'sync my project'],
      buildPlan: (goalText) => {
        const path = extractProjectPath(goalText);
        if (!path) return null;
        return {
          startStepId: 's1',
          steps: [
            step('s1', 'Fetch remote', 'tool', { toolName: 'git_fetch', params: { path } }, 's2'),
            step('s2', 'Pull latest', 'tool', { toolName: 'git_pull', params: { path }, retry: { maxAttempts: 2 } }, 's3'),
            step('s3', 'Verify status', 'tool', { toolName: 'git_status', params: { path } }),
          ],
        };
      },
    },
    {
      key: 'check-git-status',
      name: 'Check Git Status',
      description: 'Reports the current git status of a project — no changes are made.',
      category: 'development',
      requiredTools: ['git_status'],
      requiredPermission: 'workflows:execute',
      inputs: [{ name: 'path', type: 'string', description: 'Absolute project directory', required: true }],
      outputs: 'Raw git status output.',
      verificationMethod: 'The tool call itself is the check — a single read-only step, nothing to separately verify.',
      keywords: ['git status', 'check my repo', 'check the repo', 'repo status'],
      buildPlan: (goalText) => {
        const path = extractProjectPath(goalText);
        if (!path) return null;
        return { startStepId: 's1', steps: [step('s1', 'Check git status', 'tool', { toolName: 'git_status', params: { path } })] };
      },
    },
    {
      key: 'engineering-summary',
      name: 'Engineering Summary',
      description: "Asks Developer AI for a summary of recent engineering activity, grounded in connected GitHub repositories.",
      category: 'development',
      requiredTools: [],
      requiredPermission: 'agents:execute',
      inputs: [{ name: 'goal', type: 'string', description: 'What to summarize (e.g. "this week", "the ACCD repo")', required: true }],
      outputs: "Developer AI's written summary.",
      verificationMethod: 'Fails the skill if the agent step itself fails; the response is otherwise not automatically fact-checked.',
      keywords: ['engineering summary', 'weekly engineering', 'repo summary', 'repository summary', 'inactive repositor'],
      buildPlan: (goalText) => ({ startStepId: 's1', steps: [step('s1', 'Ask Developer AI', 'agent', { agentKey: 'developer-ai', input: goalText })] }),
    },
  ];
}
