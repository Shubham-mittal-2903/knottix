import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Layers } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listWorkspacesForOrganization } from '@/lib/db/queries/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Workspaces' };

export default async function WorkspacesPage() {
  const user = await requireAuth();
  if (!user.isFounder) redirect('/workspace');

  const workspaces = await listWorkspacesForOrganization(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader title="Workspaces" description="Workspaces within your organization." />

      {workspaces.length === 0 ? (
        <EmptyState icon={Layers} title="No workspaces yet" description="Workspaces will appear here once created." />
      ) : (
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <RevealItem key={ws.id}>
              <Card className="card-hover h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers className="size-4" />
                    </div>
                    {ws.name}
                  </CardTitle>
                  {ws.id === user.workspaceId && <Badge variant="accent">Current</Badge>}
                </CardHeader>
                <CardContent className="flex items-center gap-4 pt-0 text-xs text-muted-foreground">
                  <span>{ws._count.projects} projects</span>
                  <span>{ws._count.clients} clients</span>
                </CardContent>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
