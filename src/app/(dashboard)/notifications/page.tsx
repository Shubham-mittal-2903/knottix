import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listNotificationsForUser } from '@/lib/db/queries/notification';
import { isDemoMode, withDemo, DEMO_NOTIFICATIONS } from '@/lib/demo';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { NotificationRow } from '@/components/modules/notifications/NotificationRow';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const user = await requireAuth();
  const demo = isDemoMode();
  const notifications = await withDemo(DEMO_NOTIFICATIONS, () => listNotificationsForUser(user.id, 100));

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Mentions, assignments, and system alerts." />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New notifications will appear here." />
      ) : (
        <Reveal>
        <ul className="divide-y divide-border rounded-xl border border-border px-4">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              id={n.id}
              title={n.title}
              body={n.body}
              actionUrl={n.actionUrl}
              read={n.read}
              createdAt={n.createdAt.toISOString()}
              readOnly={demo}
            />
          ))}
        </ul>
        </Reveal>
      )}
    </div>
  );
}
