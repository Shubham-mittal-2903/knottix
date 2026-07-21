import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CircleDot,
  GitBranch,
  GitCommit,
  GitFork,
  GitPullRequest,
  Star,
  Tag,
  Users,
} from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode, getDemoRepositoryDetail } from '@/lib/demo';
import { getRepositoryDetail } from '@/lib/github/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal, RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';
import { formatRelativeTime, formatDate } from '@/lib/format';

interface RepoParams {
  repo: string[];
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export async function generateMetadata({ params }: { params: Promise<RepoParams> }): Promise<Metadata> {
  const { repo } = await params;
  return { title: repo.length === 2 ? `${repo[0]}/${repo[1]}` : 'Repository' };
}

export default async function GitHubRepositoryDetailPage({ params }: { params: Promise<RepoParams> }) {
  const { repo } = await params;
  if (repo.length !== 2) notFound();
  const [owner, name] = repo;

  const user = await requirePermission('integrations:read');
  const demo = isDemoMode();

  const detail = demo ? getDemoRepositoryDetail(owner, name) : await getRepositoryDetail(user.organizationId, owner, name);
  if (!detail) notFound();

  const { repository, branches, commits, pullRequests, issues, releases, contributors } = detail;

  return (
    <div className="space-y-6">
      <PageHeader title={repository.fullName} description={repository.description ?? 'No description provided.'} />

      <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RevealItem>
          <StatTile icon={Star} label="Stars" value={repository.stargazersCount} />
        </RevealItem>
        <RevealItem>
          <StatTile icon={GitFork} label="Forks" value={repository.forksCount} />
        </RevealItem>
        <RevealItem>
          <StatTile icon={CircleDot} label="Open issues" value={repository.openIssuesCount} />
        </RevealItem>
        <RevealItem>
          <StatTile icon={GitBranch} label="Branches" value={branches.length} />
        </RevealItem>
      </RevealGroup>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommit className="size-4 text-primary" />
                  Commit Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {commits.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No commits recorded.</p>
                ) : (
                  <ul className="space-y-3">
                    {commits.map((commit) => (
                      <li key={commit.sha} className="border-l-2 border-border/60 pl-3">
                        <p className="line-clamp-1 text-sm text-foreground">{commit.message.split('\n')[0]}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {commit.authorLogin ? `@${commit.authorLogin}` : commit.authorName} · {formatRelativeTime(new Date(commit.date))} ·{' '}
                          <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="size-4 text-primary" />
                  Branches
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {branches.map((branch) => (
                    <li key={branch.name} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-foreground">{branch.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{branch.commitSha.slice(0, 7)}</span>
                        {branch.protected && <Badge variant="outline">Protected</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Contributors
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {contributors.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No contributor data.</p>
                ) : (
                  <ul className="space-y-2">
                    {contributors.map((c) => (
                      <li key={c.login} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">@{c.login}</span>
                        <span className="text-xs text-muted-foreground">{c.contributions} commits</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="space-y-5">
          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="size-4 text-primary" />
                  Pull Requests
                </CardTitle>
                <Badge variant="outline">{pullRequests.length} open</Badge>
              </CardHeader>
              <CardContent className="pt-0">
                {pullRequests.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No open pull requests.</p>
                ) : (
                  <ul className="space-y-3">
                    {pullRequests.map((pr) => (
                      <li key={pr.number} className="border-l-2 border-border/60 pl-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-sm text-foreground">
                            #{pr.number} {pr.title}
                          </p>
                          {pr.draft && <Badge variant="outline">Draft</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          @{pr.authorLogin} · updated {formatRelativeTime(new Date(pr.updatedAt))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CircleDot className="size-4 text-primary" />
                  Issues
                </CardTitle>
                <Badge variant="outline">{issues.length} open</Badge>
              </CardHeader>
              <CardContent className="pt-0">
                {issues.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No open issues.</p>
                ) : (
                  <ul className="space-y-3">
                    {issues.map((issue) => (
                      <li key={issue.number} className="border-l-2 border-border/60 pl-3">
                        <p className="line-clamp-1 text-sm text-foreground">
                          #{issue.number} {issue.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          @{issue.authorLogin} · {issue.comments} comment{issue.comments === 1 ? '' : 's'} · updated{' '}
                          {formatRelativeTime(new Date(issue.updatedAt))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="size-4 text-primary" />
                  Releases
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {releases.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No releases published.</p>
                ) : (
                  <ul className="space-y-3">
                    {releases.map((release) => (
                      <li key={release.id} className="border-l-2 border-border/60 pl-3">
                        <p className="text-sm text-foreground">{release.name ?? release.tagName}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{release.body ?? 'No release notes.'}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {release.publishedAt ? formatDate(new Date(release.publishedAt)) : 'Unpublished'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
