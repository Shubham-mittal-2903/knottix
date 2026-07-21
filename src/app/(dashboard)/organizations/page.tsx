import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listOrganizationsForUser } from '@/lib/db/queries/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Organizations' };

export default async function OrganizationsPage() {
  const user = await requireAuth();
  if (!user.isFounder) redirect('/workspace');

  const organizations = await listOrganizationsForUser(user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Tenant organizations you belong to." />

      <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <RevealItem key={org.id}>
            <Card className="card-hover h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </div>
                  {org.name}
                </CardTitle>
                {org.id === user.organizationId && <Badge variant="accent">Current</Badge>}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">/{org.slug}</p>
              </CardContent>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
