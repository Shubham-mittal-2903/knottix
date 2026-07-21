export interface GitHubRepository {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  pushedAt: string | null;
  updatedAt: string;
}

export interface GitHubBranch {
  name: string;
  commitSha: string;
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  date: string;
  url: string;
}

export type GitHubItemState = 'open' | 'closed' | 'all';

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  authorLogin: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  authorLogin: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
  comments: number;
}

export interface GitHubRelease {
  id: number;
  tagName: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  publishedAt: string | null;
  url: string;
  authorLogin: string;
}

export interface GitHubContributor {
  login: string;
  avatarUrl: string;
  contributions: number;
  htmlUrl: string;
}
