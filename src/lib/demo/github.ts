import type {
  GitHubRepository,
  GitHubBranch,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  GitHubRelease,
  GitHubContributor,
} from '@/lib/github/types';
import type { GitHubRepositoryDetail, GitHubSummary } from '@/lib/github/service';

const DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();
const agoISO = (hours: number) => new Date(now().getTime() - hours * 60 * 60 * 1000).toISOString();
const agoDaysISO = (days: number) => new Date(now().getTime() - days * DAY).toISOString();

export const DEMO_GITHUB_CONNECTED = true;
export const DEMO_GITHUB_LOGIN = '4knotts-bot';

export const DEMO_REPOSITORIES: GitHubRepository[] = [
  {
    id: 1001,
    owner: '4knotts',
    name: 'knottix',
    fullName: '4knotts/knottix',
    description: 'Central intelligence system — internal AI-powered operating system for 4 Knotts.',
    private: true,
    htmlUrl: 'https://github.com/4knotts/knottix',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 4,
    forksCount: 0,
    openIssuesCount: 5,
    pushedAt: agoISO(2),
    updatedAt: agoISO(2),
  },
  {
    id: 1002,
    owner: '4knotts',
    name: 'accd-jubilee-website',
    fullName: '4knotts/accd-jubilee-website',
    description: 'Air Cargo Club of Delhi jubilee site — navy/gold theme, WebGL radar globe.',
    private: true,
    htmlUrl: 'https://github.com/4knotts/accd-jubilee-website',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 2,
    forksCount: 0,
    openIssuesCount: 3,
    pushedAt: agoISO(9),
    updatedAt: agoISO(9),
  },
  {
    id: 1003,
    owner: '4knotts',
    name: 'judge',
    fullName: '4knotts/judge',
    description: 'Judge by 4 Knotts — scoring and review platform.',
    private: true,
    htmlUrl: 'https://github.com/4knotts/judge',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 1,
    forksCount: 0,
    openIssuesCount: 4,
    pushedAt: agoISO(20),
    updatedAt: agoISO(20),
  },
  {
    id: 1004,
    owner: '4knotts',
    name: 'kreativ-website',
    fullName: '4knotts/kreativ-website',
    description: 'Kreativ agency marketing site.',
    private: true,
    htmlUrl: 'https://github.com/4knotts/kreativ-website',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 1,
    pushedAt: agoDaysISO(4),
    updatedAt: agoDaysISO(4),
  },
  {
    id: 1005,
    owner: '4knotts',
    name: 'coverhub',
    fullName: '4knotts/coverhub',
    description: 'CoverHub — client project on hold pending budget approval.',
    private: true,
    htmlUrl: 'https://github.com/4knotts/coverhub',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 0,
    pushedAt: agoDaysISO(18),
    updatedAt: agoDaysISO(18),
  },
  {
    id: 1006,
    owner: '4knotts',
    name: 'internal-crm',
    fullName: '4knotts/internal-crm',
    description: 'Early-stage internal CRM.',
    private: true,
    htmlUrl: 'https://github.com/4knotts/internal-crm',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 0,
    pushedAt: agoDaysISO(35),
    updatedAt: agoDaysISO(35),
  },
];

function branches(defaultBranch: string): GitHubBranch[] {
  return [
    { name: defaultBranch, commitSha: 'a1b2c3d', protected: true },
    { name: 'develop', commitSha: 'e4f5a6b', protected: false },
  ];
}

const KNOTTIX_COMMITS: GitHubCommit[] = [
  { sha: 'a1b2c3d4e5', message: 'feat: add GitHub integration reference implementation', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoISO(2), url: 'https://github.com/4knotts/knottix/commit/a1b2c3d4e5' },
  { sha: 'b2c3d4e5f6', message: 'feat: presentation-layer polish — splash, transitions, presentation mode', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoISO(18), url: 'https://github.com/4knotts/knottix/commit/b2c3d4e5f6' },
  { sha: 'c3d4e5f6a7', message: 'fix: nav-icon server/client boundary crash in DashboardLayout', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoISO(20), url: 'https://github.com/4knotts/knottix/commit/c3d4e5f6a7' },
  { sha: 'd4e5f6a7b8', message: 'feat: AI Employee Platform — 7 registered agents', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoDaysISO(1), url: 'https://github.com/4knotts/knottix/commit/d4e5f6a7b8' },
  { sha: 'e5f6a7b8c9', message: 'refactor: persistence layer — write-through decorators for registries', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoDaysISO(2), url: 'https://github.com/4knotts/knottix/commit/e5f6a7b8c9' },
];

const KNOTTIX_PRS: GitHubPullRequest[] = [
  { number: 42, title: 'GitHub Integration — reference implementation', state: 'open', merged: false, draft: false, authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoISO(3), updatedAt: agoISO(1), url: 'https://github.com/4knotts/knottix/pull/42', labels: ['integration', 'ai-employees'] },
  { number: 41, title: 'Presentation-mode polish for live demo', state: 'open', merged: false, draft: false, authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoISO(20), updatedAt: agoISO(18), url: 'https://github.com/4knotts/knottix/pull/41', labels: ['ui'] },
];

const KNOTTIX_ISSUES: GitHubIssue[] = [
  { number: 58, title: 'Wire real Kernel/Memory/AI Runtime health into StatusStrip', state: 'open', authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoDaysISO(1), updatedAt: agoDaysISO(1), url: 'https://github.com/4knotts/knottix/issues/58', labels: ['idea'], comments: 0 },
  { number: 57, title: 'Real password-reset flow behind "Forgot password?"', state: 'open', authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoDaysISO(1), updatedAt: agoDaysISO(1), url: 'https://github.com/4knotts/knottix/issues/57', labels: ['idea', 'auth'], comments: 1 },
  { number: 55, title: 'Register real Workflow definitions for AI Employee "Suggested Workflows"', state: 'open', authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoDaysISO(2), updatedAt: agoDaysISO(2), url: 'https://github.com/4knotts/knottix/issues/55', labels: ['idea'], comments: 2 },
];

const KNOTTIX_RELEASES: GitHubRelease[] = [
  {
    id: 9001,
    tagName: 'v0.15.0',
    name: 'AI Employee Platform + GitHub Integration',
    body: 'Seven registered AI Employees, GitHub as the reference integration, and a live-demo presentation layer.',
    draft: false,
    prerelease: false,
    publishedAt: agoDaysISO(1),
    url: 'https://github.com/4knotts/knottix/releases/tag/v0.15.0',
    authorLogin: '4knotts-bot',
  },
];

const KNOTTIX_CONTRIBUTORS: GitHubContributor[] = [
  { login: '4knotts-bot', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4', contributions: 214, htmlUrl: 'https://github.com/4knotts-bot' },
];

const ACCD_COMMITS: GitHubCommit[] = [
  { sha: 'f6a7b8c9d0', message: 'feat: sponsor carousel on landing page', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoISO(9), url: 'https://github.com/4knotts/accd-jubilee-website/commit/f6a7b8c9d0' },
  { sha: 'a7b8c9d0e1', message: 'fix: radar globe WebGL context loss on mobile', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoDaysISO(2), url: 'https://github.com/4knotts/accd-jubilee-website/commit/a7b8c9d0e1' },
];

const ACCD_PRS: GitHubPullRequest[] = [
  { number: 19, title: 'Sponsor carousel + client review fixes', state: 'open', merged: false, draft: false, authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoISO(10), updatedAt: agoISO(9), url: 'https://github.com/4knotts/accd-jubilee-website/pull/19', labels: ['client-review'] },
];

const ACCD_ISSUES: GitHubIssue[] = [
  { number: 24, title: 'Radar globe drops frames on low-end mobile GPUs', state: 'open', authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoDaysISO(3), updatedAt: agoDaysISO(2), url: 'https://github.com/4knotts/accd-jubilee-website/issues/24', labels: ['bug', 'performance'], comments: 3 },
];

const ACCD_RELEASES: GitHubRelease[] = [
  { id: 9002, tagName: 'v1.2.0', name: 'Sponsor carousel launch', body: 'Adds the sponsor carousel and fixes the mobile radar globe crash.', draft: false, prerelease: false, publishedAt: agoDaysISO(2), url: 'https://github.com/4knotts/accd-jubilee-website/releases/tag/v1.2.0', authorLogin: '4knotts-bot' },
];

const JUDGE_COMMITS: GitHubCommit[] = [
  { sha: 'b8c9d0e1f2', message: 'fix: scoring aggregation rounding bug', authorName: 'Shubham Mittal', authorLogin: '4knotts-bot', authorAvatarUrl: null, date: agoISO(20), url: 'https://github.com/4knotts/judge/commit/b8c9d0e1f2' },
];

const JUDGE_ISSUES: GitHubIssue[] = [
  { number: 12, title: 'Scoring aggregation rounds down instead of to nearest', state: 'open', authorLogin: '4knotts-bot', authorAvatarUrl: null, createdAt: agoDaysISO(4), updatedAt: agoISO(20), url: 'https://github.com/4knotts/judge/issues/12', labels: ['bug'], comments: 5 },
];

const DEMO_REPO_DETAILS: Record<string, GitHubRepositoryDetail> = {
  '4knotts/knottix': {
    repository: DEMO_REPOSITORIES[0],
    branches: branches('main'),
    commits: KNOTTIX_COMMITS,
    pullRequests: KNOTTIX_PRS,
    issues: KNOTTIX_ISSUES,
    releases: KNOTTIX_RELEASES,
    contributors: KNOTTIX_CONTRIBUTORS,
  },
  '4knotts/accd-jubilee-website': {
    repository: DEMO_REPOSITORIES[1],
    branches: branches('main'),
    commits: ACCD_COMMITS,
    pullRequests: ACCD_PRS,
    issues: ACCD_ISSUES,
    releases: ACCD_RELEASES,
    contributors: KNOTTIX_CONTRIBUTORS,
  },
  '4knotts/judge': {
    repository: DEMO_REPOSITORIES[2],
    branches: branches('main'),
    commits: JUDGE_COMMITS,
    pullRequests: [],
    issues: JUDGE_ISSUES,
    releases: [],
    contributors: KNOTTIX_CONTRIBUTORS,
  },
};

export function getDemoRepositoryDetail(owner: string, name: string): GitHubRepositoryDetail | null {
  const repository = DEMO_REPOSITORIES.find((r) => r.owner === owner && r.name === name);
  if (!repository) return null;
  const key = `${owner}/${name}`;
  return (
    DEMO_REPO_DETAILS[key] ?? {
      repository,
      branches: branches(repository.defaultBranch),
      commits: [],
      pullRequests: [],
      issues: [],
      releases: [],
      contributors: [],
    }
  );
}

export const DEMO_GITHUB_SUMMARY: GitHubSummary = {
  connected: true,
  repositoryCount: DEMO_REPOSITORIES.length,
  primaryRepository: { owner: '4knotts', name: 'knottix', fullName: '4knotts/knottix' },
  recentCommits: KNOTTIX_COMMITS.slice(0, 5),
  openPullRequests: KNOTTIX_PRS.length,
  openIssues: KNOTTIX_ISSUES.length,
  latestRelease: KNOTTIX_RELEASES[0] ?? null,
};
