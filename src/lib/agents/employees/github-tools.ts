import type { RegisterToolInput, ToolExecutionContext, ToolParameterDefinition } from '@/lib/tools';
import * as githubService from '@/lib/github/service';
import type { GitHubItemState } from '@/lib/github/types';

const REPO_PARAM: ToolParameterDefinition = {
  name: 'repo',
  type: 'string',
  description: 'Repository in "owner/name" format. Defaults to the most recently active connected repository.',
  required: false,
};

function limitParam(defaultValue: number): ToolParameterDefinition {
  return { name: 'limit', type: 'number', description: 'Maximum number of results to return.', required: false, defaultValue };
}

const STATE_PARAM: ToolParameterDefinition = {
  name: 'state',
  type: 'string',
  description: 'Filter by state.',
  required: false,
  enum: ['open', 'closed', 'all'],
  defaultValue: 'open',
};

async function resolveRepo(
  context: ToolExecutionContext,
  input: Record<string, unknown>,
): Promise<{ owner: string; name: string } | null> {
  const explicit = typeof input.repo === 'string' ? githubService.parseRepoSlug(input.repo) : null;
  if (explicit) return explicit;
  return githubService.resolvePrimaryRepository(context.organizationId);
}

const NOT_CONNECTED = { connected: false, message: 'GitHub is not connected for this organization. Connect it in Settings → Integrations → GitHub.' };
const NO_REPOSITORY = { connected: false, message: 'GitHub is not connected, or the connected account has no accessible repositories.' };

/**
 * Read-only, MCP-compatible GitHub tools for Developer AI, reusing the existing Tool Engine
 * (DEC-026/DEC-028) — no new registry or invocation mechanism. Every parameter is optional so
 * these are eligible for the existing zero-required-parameter auto-resolution that folds tool
 * output into agent context before the AI Runtime call (same mechanism as `list_projects`).
 */
export function createGitHubTools(): RegisterToolInput[] {
  return [
    {
      name: 'github_list_repositories',
      description: 'List GitHub repositories connected to this organization, with stars, language, and last-pushed date.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [limitParam(30)],
      version: '1.0.0',
      handler: async (input, context) => {
        const limit = typeof input.limit === 'number' ? input.limit : 30;
        const result = await githubService.listRepositories(context.organizationId, limit);
        if (!result.connected) return NOT_CONNECTED;
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repositories: result.data };
      },
    },
    {
      name: 'github_get_repository',
      description: 'Get details for a specific GitHub repository — description, default branch, stars, open issue count, last pushed date.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const result = await githubService.getRepository(context.organizationId, repo.owner, repo.name);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: result.data };
      },
    },
    {
      name: 'github_list_commits',
      description: 'List recent commits for a repository — message, author, date. Use to explain what changed recently.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM, limitParam(10)],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const limit = typeof input.limit === 'number' ? input.limit : 10;
        const result = await githubService.listCommits(context.organizationId, repo.owner, repo.name, limit);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: `${repo.owner}/${repo.name}`, commits: result.data };
      },
    },
    {
      name: 'github_list_pull_requests',
      description: 'List pull requests for a repository, filterable by state. Use to summarize PR activity.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM, STATE_PARAM, limitParam(15)],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const state = typeof input.state === 'string' ? (input.state as GitHubItemState) : 'open';
        const limit = typeof input.limit === 'number' ? input.limit : 15;
        const result = await githubService.listPullRequests(context.organizationId, repo.owner, repo.name, state, limit);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: `${repo.owner}/${repo.name}`, pullRequests: result.data };
      },
    },
    {
      name: 'github_list_issues',
      description: 'List issues for a repository, filterable by state. Use to review open issues or flag stale ones.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM, STATE_PARAM, limitParam(15)],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const state = typeof input.state === 'string' ? (input.state as GitHubItemState) : 'open';
        const limit = typeof input.limit === 'number' ? input.limit : 15;
        const result = await githubService.listIssues(context.organizationId, repo.owner, repo.name, state, limit);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: `${repo.owner}/${repo.name}`, issues: result.data };
      },
    },
    {
      name: 'github_get_release',
      description: 'Get the latest release for a repository — tag, name, notes, publish date. Use for release summaries.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const result = await githubService.getLatestRelease(context.organizationId, repo.owner, repo.name);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: `${repo.owner}/${repo.name}`, release: result.data };
      },
    },
    {
      name: 'github_get_contributors',
      description: 'List top contributors for a repository by commit count.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM, limitParam(10)],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const limit = typeof input.limit === 'number' ? input.limit : 10;
        const result = await githubService.listContributors(context.organizationId, repo.owner, repo.name, limit);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: `${repo.owner}/${repo.name}`, contributors: result.data };
      },
    },
    {
      name: 'github_list_branches',
      description: 'List branches for a repository.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [REPO_PARAM, limitParam(20)],
      version: '1.0.0',
      handler: async (input, context) => {
        const repo = await resolveRepo(context, input);
        if (!repo) return NO_REPOSITORY;
        const limit = typeof input.limit === 'number' ? input.limit : 20;
        const result = await githubService.listBranches(context.organizationId, repo.owner, repo.name, limit);
        if (result.error) return { connected: true, error: result.error };
        return { connected: true, repository: `${repo.owner}/${repo.name}`, branches: result.data };
      },
    },
  ];
}
