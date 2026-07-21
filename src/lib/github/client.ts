import { GitHubApiError } from './errors';
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

const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';

export interface GitHubClient {
  verifyToken(): Promise<{ login: string }>;
  listRepositories(limit?: number): Promise<GitHubRepository[]>;
  getRepository(owner: string, name: string): Promise<GitHubRepository>;
  listBranches(owner: string, name: string, limit?: number): Promise<GitHubBranch[]>;
  listCommits(owner: string, name: string, limit?: number): Promise<GitHubCommit[]>;
  listPullRequests(owner: string, name: string, state?: GitHubItemState, limit?: number): Promise<GitHubPullRequest[]>;
  listIssues(owner: string, name: string, state?: GitHubItemState, limit?: number): Promise<GitHubIssue[]>;
  listReleases(owner: string, name: string, limit?: number): Promise<GitHubRelease[]>;
  getLatestRelease(owner: string, name: string): Promise<GitHubRelease | null>;
  listContributors(owner: string, name: string, limit?: number): Promise<GitHubContributor[]>;
}

interface RawOwner {
  login: string;
}
interface RawRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  updated_at: string;
  owner: RawOwner;
}
interface RawBranch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}
interface RawGitUser {
  login: string;
  avatar_url: string;
}
interface RawCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
  author: RawGitUser | null;
}
interface RawLabel {
  name: string;
}
interface RawPullRequest {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  draft: boolean;
  user: RawGitUser;
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: RawLabel[];
}
interface RawIssue {
  number: number;
  title: string;
  state: string;
  user: RawGitUser;
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: (RawLabel | string)[];
  comments: number;
  pull_request?: unknown;
}
interface RawRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  author: RawGitUser;
}
interface RawContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}
interface RawUser {
  login: string;
}
interface RawErrorBody {
  message?: string;
}

async function githubFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `GitHub API error (${res.status})`;
    try {
      const body = (await res.json()) as RawErrorBody;
      if (body.message) message = body.message;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new GitHubApiError(message, res.status, path);
  }

  return res.json() as Promise<T>;
}

function mapRepository(raw: RawRepository): GitHubRepository {
  return {
    id: raw.id,
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    private: raw.private,
    htmlUrl: raw.html_url,
    defaultBranch: raw.default_branch,
    language: raw.language,
    stargazersCount: raw.stargazers_count,
    forksCount: raw.forks_count,
    openIssuesCount: raw.open_issues_count,
    pushedAt: raw.pushed_at,
    updatedAt: raw.updated_at,
  };
}

function mapBranch(raw: RawBranch): GitHubBranch {
  return { name: raw.name, commitSha: raw.commit.sha, protected: raw.protected };
}

function mapCommit(raw: RawCommit): GitHubCommit {
  return {
    sha: raw.sha,
    message: raw.commit.message,
    authorName: raw.commit.author.name,
    authorLogin: raw.author?.login ?? null,
    authorAvatarUrl: raw.author?.avatar_url ?? null,
    date: raw.commit.author.date,
    url: raw.html_url,
  };
}

function mapPullRequest(raw: RawPullRequest): GitHubPullRequest {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state === 'closed' ? 'closed' : 'open',
    merged: raw.merged_at !== null,
    draft: raw.draft,
    authorLogin: raw.user.login,
    authorAvatarUrl: raw.user.avatar_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    url: raw.html_url,
    labels: raw.labels.map((l) => l.name),
  };
}

function mapIssue(raw: RawIssue): GitHubIssue {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state === 'closed' ? 'closed' : 'open',
    authorLogin: raw.user.login,
    authorAvatarUrl: raw.user.avatar_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    url: raw.html_url,
    labels: raw.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    comments: raw.comments,
  };
}

function mapRelease(raw: RawRelease): GitHubRelease {
  return {
    id: raw.id,
    tagName: raw.tag_name,
    name: raw.name,
    body: raw.body,
    draft: raw.draft,
    prerelease: raw.prerelease,
    publishedAt: raw.published_at,
    url: raw.html_url,
    authorLogin: raw.author.login,
  };
}

function mapContributor(raw: RawContributor): GitHubContributor {
  return { login: raw.login, avatarUrl: raw.avatar_url, contributions: raw.contributions, htmlUrl: raw.html_url };
}

export function createGitHubClient(token: string): GitHubClient {
  return {
    async verifyToken() {
      const raw = await githubFetch<RawUser>(token, '/user');
      return { login: raw.login };
    },

    async listRepositories(limit = 30) {
      const raw = await githubFetch<RawRepository[]>(
        token,
        `/user/repos?sort=pushed&direction=desc&per_page=${limit}&affiliation=owner,collaborator,organization_member`,
      );
      return raw.map(mapRepository);
    },

    async getRepository(owner, name) {
      const raw = await githubFetch<RawRepository>(token, `/repos/${owner}/${name}`);
      return mapRepository(raw);
    },

    async listBranches(owner, name, limit = 20) {
      const raw = await githubFetch<RawBranch[]>(token, `/repos/${owner}/${name}/branches?per_page=${limit}`);
      return raw.map(mapBranch);
    },

    async listCommits(owner, name, limit = 15) {
      const raw = await githubFetch<RawCommit[]>(token, `/repos/${owner}/${name}/commits?per_page=${limit}`);
      return raw.map(mapCommit);
    },

    async listPullRequests(owner, name, state = 'open', limit = 15) {
      const raw = await githubFetch<RawPullRequest[]>(
        token,
        `/repos/${owner}/${name}/pulls?state=${state}&per_page=${limit}`,
      );
      return raw.map(mapPullRequest);
    },

    async listIssues(owner, name, state = 'open', limit = 15) {
      const raw = await githubFetch<RawIssue[]>(token, `/repos/${owner}/${name}/issues?state=${state}&per_page=${limit}`);
      return raw.filter((i) => !i.pull_request).map(mapIssue);
    },

    async listReleases(owner, name, limit = 5) {
      const raw = await githubFetch<RawRelease[]>(token, `/repos/${owner}/${name}/releases?per_page=${limit}`);
      return raw.map(mapRelease);
    },

    async getLatestRelease(owner, name) {
      try {
        const raw = await githubFetch<RawRelease>(token, `/repos/${owner}/${name}/releases/latest`);
        return mapRelease(raw);
      } catch (error) {
        if (error instanceof GitHubApiError && error.status === 404) return null;
        throw error;
      }
    },

    async listContributors(owner, name, limit = 10) {
      const raw = await githubFetch<RawContributor[]>(token, `/repos/${owner}/${name}/contributors?per_page=${limit}`);
      return raw.map(mapContributor);
    },
  };
}
