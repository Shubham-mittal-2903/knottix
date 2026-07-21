import type { Metadata } from 'next';
import { Activity as ActivityIcon } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listActivityForOrganization } from '@/lib/db/queries/activity';
import { withDemo, DEMO_ACTIVITY } from '@/lib/demo';
import { ActivityFeed } from '@/components/modules/activity/ActivityFeed';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Activity' };

export default async function ActivityPage() {
  const user = await requireAuth();
  const activity = await withDemo(DEMO_ACTIVITY, () => listActivityForOrganization(user.organizationId, 100));

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="A timeline of what's happening across the organization." />

      {activity.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet" description="Organization events will appear here as they happen." />
      ) : (
        <Reveal>
          <Card>
            <CardContent className="py-5">
              <ActivityFeed items={activity} />
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
