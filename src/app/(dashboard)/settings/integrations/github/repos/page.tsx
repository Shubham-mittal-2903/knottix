import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CircleDot, GitBranch, GitFork, Star } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode, DEMO_REPOSITORIES } from '@/lib/demo';
import { listRepositories } from '@/lib/github/service';
import type { GitHubRepository } from '@/lib/github/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { formatRelativeTime } from '@/lib/format';

export const metadata: Metadata = { title: 'GitHub Repositories' };

export default async function GitHubRepositoriesPage() {
  const user = await requirePermission('integrations:read');
  const demo = isDemoMode();

  let repositories: GitHubRepository[] = DEMO_REPOSITORIES;
  if (!demo) {
    const result = await listRepositories(user.organizationId, 30);
    if (!result.connected) redirect('/settings/integrations/github');
    repositories = result.data ?? [];
  }

  return (
    <div className="space-y-6">
      <PageHeader title="GitHub Repositories" description="Repositories accessible to the connected GitHub account." />

      {repositories.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories found"
          description="The connected GitHub account has no accessible repositories."
        />
      ) : (
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <RevealItem key={repo.fullName}>
              <Link href={`/settings/integrations/github/repos/${repo.owner}/${repo.name}` as Route}>
                <Card className="card-hover flex h-full flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 py-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{repo.fullName}</p>
                      {repo.private && <Badge variant="outline">Private</Badge>}
                    </div>
                    <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">{repo.description ?? 'No description'}</p>
                    <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="flex items-center gap-1">
                        <Star className="size-3" />
                        {repo.stargazersCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="size-3" />
                        {repo.forksCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDot className="size-3" />
                        {repo.openIssuesCount}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">
                      {repo.pushedAt ? `Pushed ${formatRelativeTime(new Date(repo.pushedAt))}` : 'No pushes recorded'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
