import Link from 'next/link';
import { ArrowUpRight, CircleDot, GitBranch, GitCommit, GitPullRequest, Tag } from 'lucide-react';
import type { GitHubSummary } from '@/lib/github/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { formatRelativeTime } from '@/lib/format';

export function GitHubWidget({ summary }: { summary: GitHubSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          GitHub
        </CardTitle>
        {summary.connected ? (
          <Link href="/settings/integrations/github/repos" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Browse <ArrowUpRight className="size-3" />
          </Link>
        ) : (
          <Badge variant="default">Not connected</Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {!summary.connected ? (
          <EmptyState
            icon={GitBranch}
            title="GitHub is not connected"
            description="Connect a GitHub account in Settings → Integrations to see repository activity here."
          />
        ) : summary.repositoryCount === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Connected — no accessible repositories yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-lg font-semibold text-foreground">{summary.repositoryCount}</p>
                <p className="text-xs text-muted-foreground">Repositories</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-lg font-semibold text-foreground">
                  <GitPullRequest className="size-3.5 text-primary" />
                  {summary.openPullRequests}
                </p>
                <p className="text-xs text-muted-foreground">Open PRs</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-lg font-semibold text-foreground">
                  <CircleDot className="size-3.5 text-primary" />
                  {summary.openIssues}
                </p>
                <p className="text-xs text-muted-foreground">Open issues</p>
              </div>
            </div>

            {summary.primaryRepository && (
              <p className="text-xs text-muted-foreground">
                Most active: <span className="text-foreground">{summary.primaryRepository.fullName}</span>
              </p>
            )}

            {summary.recentCommits.length > 0 && (
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GitCommit className="size-3" />
                  Recent commits
                </p>
                <ul className="space-y-1.5">
                  {summary.recentCommits.slice(0, 3).map((commit) => (
                    <li key={commit.sha} className="line-clamp-1 text-xs text-muted-foreground">
                      <span className="text-foreground">{commit.message.split('\n')[0]}</span> · {formatRelativeTime(new Date(commit.date))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.latestRelease && (
              <div className="flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <Tag className="size-3" />
                Latest release: <span className="text-foreground">{summary.latestRelease.name ?? summary.latestRelease.tagName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
