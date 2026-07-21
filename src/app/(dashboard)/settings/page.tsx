import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Plug, ShieldCheck, User } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Your account and system configuration." />

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-0 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="mt-1 text-foreground">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="mt-1 text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="mt-1 text-foreground">{user.isFounder ? 'Founder' : (user.systemRole ?? 'Member')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="mt-1 text-foreground">{user.organizationSlug}</p>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {(user.isFounder || user.permissions.includes('integrations:read')) && (
        <Reveal delay={0.05}>
          <Link href="/settings/integrations">
            <Card className="card-hover">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plug className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Integrations</p>
                    <p className="text-xs text-muted-foreground">GitHub and future external service connections</p>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </Reveal>
      )}

      {user.isFounder && (
        <Reveal delay={0.1}>
          <Link href="/settings/system">
            <Card className="card-hover">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">System Health</p>
                    <p className="text-xs text-muted-foreground">Kernel, AI Runtime, Memory, Providers, Feature Flags</p>
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
