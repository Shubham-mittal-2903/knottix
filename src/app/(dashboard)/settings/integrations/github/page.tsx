import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, FolderGit2, GitBranch } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode, DEMO_GITHUB_CONNECTED, DEMO_GITHUB_LOGIN } from '@/lib/demo';
import { getGitHubConnectionStatus } from '@/lib/github/credentials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';
import { formatRelativeTime } from '@/lib/format';
import { GitHubConnectForm } from './GitHubConnectForm';
import { DisconnectGitHubButton } from './DisconnectGitHubButton';

export const metadata: Metadata = { title: 'GitHub Integration' };

export default async function GitHubIntegrationPage() {
  const user = await requirePermission('integrations:read');
  const canManage = user.isFounder || user.permissions.includes('integrations:manage');
  const demo = isDemoMode();

  const status = demo
    ? {
        connected: DEMO_GITHUB_CONNECTED,
        status: 'CONNECTED' as const,
        connectedLogin: DEMO_GITHUB_LOGIN,
        maskedToken: '••••••••demo',
        lastSyncAt: new Date(),
        syncError: null as string | null,
      }
    : await getGitHubConnectionStatus(user.organizationId);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="GitHub"
        description="Connect a GitHub account so Developer AI and Mission Control can reason over real repository activity."
      />

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4 text-primary" />
              Connection Status
            </CardTitle>
            <Badge variant={status.connected ? 'success' : status.status === 'ERROR' ? 'error' : 'default'}>
              {status.connected ? 'Connected' : status.status === 'ERROR' ? 'Error' : 'Not connected'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-sm">
            {status.connected ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Connected as</p>
                    <p className="mt-1 text-foreground">@{status.connectedLogin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Token</p>
                    <p className="mt-1 font-mono text-foreground">{status.maskedToken}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last synced</p>
                    <p className="mt-1 text-foreground">{status.lastSyncAt ? formatRelativeTime(status.lastSyncAt) : 'Never'}</p>
                  </div>
                </div>
                {demo ? (
                  <p className="text-xs text-muted-foreground italic">
                    Demo Mode — showing realistic fixture data, not a real GitHub connection.
                  </p>
                ) : (
                  canManage && <DisconnectGitHubButton />
                )}
              </>
            ) : (
              <>
                {status.syncError && <p className="text-knottix-error">{status.syncError}</p>}
                {canManage ? (
                  <GitHubConnectForm />
                ) : (
                  <p className="text-muted-foreground">Ask an administrator or founder to connect GitHub.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {status.connected && (
        <Reveal delay={0.05}>
          <Link href="/settings/integrations/github/repos">
            <Card className="card-hover">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderGit2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Repository Browser</p>
                    <p className="text-xs text-muted-foreground">Browse connected repositories, commits, PRs, and issues</p>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </Reveal>
      )}
    </div>
  );
}
