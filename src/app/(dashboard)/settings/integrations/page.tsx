import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, GitBranch } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode, DEMO_GITHUB_CONNECTED } from '@/lib/demo';
import { getGitHubConnectionStatus } from '@/lib/github/credentials';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Integrations' };

export default async function IntegrationsPage() {
  const user = await requirePermission('integrations:read');
  const connected = isDemoMode() ? DEMO_GITHUB_CONNECTED : (await getGitHubConnectionStatus(user.organizationId)).connected;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external services so AI Employees and Mission Control can reason over real data."
      />

      <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RevealItem>
          <Link href="/settings/integrations/github">
            <Card className="card-hover">
              <CardContent className="flex items-center justify-between py-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <GitBranch className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">GitHub</p>
                    <p className="text-xs text-muted-foreground">Repositories, pull requests, issues, releases</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connected ? 'success' : 'default'}>{connected ? 'Connected' : 'Not connected'}</Badge>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}
