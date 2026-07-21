import { logger } from '@/lib/logger';
import { getGitHubClientForOrganization } from './credentials';
import { isGitHubApiError } from './errors';
import type {
  GitHubRepository,
  GitHubBranch,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  GitHubRelease,
  GitHubContributor,
  GitHubItemState,
} from './types';
import type { GitHubClient } from './client';

/**
 * Every read goes through this envelope instead of throwing, so a missing connection or a
 * transient GitHub failure degrades a page/tool gracefully instead of crashing it — the same
 * "wrap in try/catch, never blank the screen" discipline DEC-031 applied to Knowledge Highlights.
 */
export interface GitHubServiceResult<T> {
  connected: boolean;
  data: T | null;
  error: string | null;
}

async function withClient<T>(
  organizationId: string,
  fn: (client: GitHubClient) => Promise<T>,
): Promise<GitHubServiceResult<T>> {
  const client = await getGitHubClientForOrganization(organizationId);
  if (!client) {
    return { connected: false, data: null, error: null };
  }
  try {
    const data = await fn(client);
    return { connected: true, data, error: null };
  } catch (error) {
    const message = isGitHubApiError(error) ? error.message : 'GitHub request failed';
    logger.warn('github.service', message, { organizationId, error: message });
    return { connected: true, data: null, error: message };
  }
}

/** "owner/name" → { owner, name }, or null if the string isn't a valid repo slug. */
export function parseRepoSlug(repo: string): { owner: string; name: string } | null {
  const parts = repo.trim().split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], name: parts[1] };
}

export async function listRepositories(organizationId: string, limit = 30) {
  return withClient(organizationId, (client) => client.listRepositories(limit));
}

export async function getRepository(organizationId: string, owner: string, name: string) {
  return withClient(organizationId, (client) => client.getRepository(owner, name));
}

export async function listBranches(organizationId: string, owner: string, name: string, limit = 20) {
  return withClient(organizationId, (client) => client.listBranches(owner, name, limit));
}

export async function listCommits(organizationId: string, owner: string, name: string, limit = 15) {
  return withClient(organizationId, (client) => client.listCommits(owner, name, limit));
}

export async function listPullRequests(
  organizationId: string,
  owner: string,
  name: string,
  state: GitHubItemState = 'open',
  limit = 15,
) {
  return withClient(organizationId, (client) => client.listPullRequests(owner, name, state, limit));
}

export async function listIssues(
  organizationId: string,
  owner: string,
  name: string,
  state: GitHubItemState = 'open',
  limit = 15,
) {
  return withClient(organizationId, (client) => client.listIssues(owner, name, state, limit));
}

export async function getLatestRelease(organizationId: string, owner: string, name: string) {
  return withClient(organizationId, (client) => client.getLatestRelease(owner, name));
}

export async function listContributors(organizationId: string, owner: string, name: string, limit = 10) {
  return withClient(organizationId, (client) => client.listContributors(owner, name, limit));
}

const PRIMARY_REPO_CACHE_TTL_MS = 30_000;
const primaryRepoCache = new Map<string, { repo: { owner: string; name: string }; expiresAt: number }>();

/**
 * Picks the most recently pushed connected repository as the implicit default for any
 * optional-`repo` GitHub tool — this is what makes the tools zero-required-parameter and
 * therefore auto-invokable by the existing Tool Resolution mechanism (DEC-028). Cached briefly
 * per organization so one AI Chat turn (which auto-invokes 8 GitHub tools) doesn't re-fetch the
 * repository list 8 times.
 */
export async function resolvePrimaryRepository(organizationId: string): Promise<{ owner: string; name: string } | null> {
  const cached = primaryRepoCache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) return cached.repo;

  const result = await listRepositories(organizationId, 5);
  if (!result.data || result.data.length === 0) return null;

  const primary = result.data[0]; // already sorted by pushed desc
  const repo = { owner: primary.owner, name: primary.name };
  primaryRepoCache.set(organizationId, { repo, expiresAt: Date.now() + PRIMARY_REPO_CACHE_TTL_MS });
  return repo;
}

export interface GitHubRepositoryDetail {
  repository: GitHubRepository;
  branches: GitHubBranch[];
  commits: GitHubCommit[];
  pullRequests: GitHubPullRequest[];
  issues: GitHubIssue[];
  releases: GitHubRelease[];
  contributors: GitHubContributor[];
}

export async function getRepositoryDetail(
  organizationId: string,
  owner: string,
  name: string,
): Promise<GitHubRepositoryDetail | null> {
  const client = await getGitHubClientForOrganization(organizationId);
  if (!client) return null;

  try {
    const [repository, branches, commits, pullRequests, issues, releases, contributors] = await Promise.all([
      client.getRepository(owner, name),
      client.listBranches(owner, name, 20),
      client.listCommits(owner, name, 15),
      client.listPullRequests(owner, name, 'open', 15),
      client.listIssues(owner, name, 'open', 15),
      client.listReleases(owner, name, 5),
      client.listContributors(owner, name, 10),
    ]);
    return { repository, branches, commits, pullRequests, issues, releases, contributors };
  } catch (error) {
    logger.warn('github.service', 'Failed to load repository detail', {
      organizationId,
      owner,
      name,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface GitHubSummary {
  connected: boolean;
  repositoryCount: number;
  primaryRepository: { owner: string; name: string; fullName: string } | null;
  recentCommits: GitHubCommit[];
  openPullRequests: number;
  openIssues: number;
  latestRelease: GitHubRelease | null;
}

/** Powers the Mission Control GitHub widget — bounded to the primary repository so it costs a handful of API calls, not one per connected repo. */
export async function getGitHubSummary(organizationId: string): Promise<GitHubSummary> {
  const empty: GitHubSummary = {
    connected: false,
    repositoryCount: 0,
    primaryRepository: null,
    recentCommits: [],
    openPullRequests: 0,
    openIssues: 0,
    latestRelease: null,
  };

  const reposResult = await listRepositories(organizationId, 30);
  if (!reposResult.connected) return empty;
  const repos = reposResult.data ?? [];
  if (repos.length === 0) return { ...empty, connected: true };

  const primary = repos[0]; // already sorted by pushed desc

  const [commits, pulls, issues, release] = await Promise.all([
    listCommits(organizationId, primary.owner, primary.name, 5),
    listPullRequests(organizationId, primary.owner, primary.name, 'open', 50),
    listIssues(organizationId, primary.owner, primary.name, 'open', 50),
    getLatestRelease(organizationId, primary.owner, primary.name),
  ]);

  return {
    connected: true,
    repositoryCount: repos.length,
    primaryRepository: { owner: primary.owner, name: primary.name, fullName: primary.fullName },
    recentCommits: commits.data ?? [],
    openPullRequests: pulls.data?.length ?? 0,
    openIssues: issues.data?.length ?? 0,
    latestRelease: release.data ?? null,
  };
}
