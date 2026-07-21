import { requireAuth } from '@/lib/auth/session';
import { requireOrganization } from '@/lib/db/queries/organization';
import { listWorkspacesForMember } from '@/lib/db/queries/workspace';
import { countUnreadNotifications, listNotificationsForUser } from '@/lib/db/queries/notification';
import { AppShell } from '@/components/layouts/AppShell';
import {
  isDemoMode,
  withDemo,
  DEMO_NOTIFICATIONS,
  DEMO_UNREAD_NOTIFICATION_COUNT,
  DEMO_ORGANIZATION,
  DEMO_WORKSPACES,
} from '@/lib/demo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const organization = await withDemo(DEMO_ORGANIZATION, () => requireOrganization(user.organizationId));

  const [workspaces, notifications, unreadCount] = await Promise.all([
    withDemo(DEMO_WORKSPACES, () => listWorkspacesForMember(user.memberId, user.organizationId)),
    withDemo(
      DEMO_NOTIFICATIONS.slice(0, 8).map((n) => ({ ...n })),
      () => listNotificationsForUser(user.id, 8),
    ),
    withDemo(DEMO_UNREAD_NOTIFICATION_COUNT, () => countUnreadNotifications(user.id)),
  ]);

  return (
    <AppShell
      permissions={user.permissions}
      experienceLabel={user.isFounder ? 'Mission Control' : 'Workspace'}
      organizationName={organization.name}
      currentWorkspaceId={user.workspaceId}
      workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
      unreadCount={unreadCount}
      recentNotifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        actionUrl: n.actionUrl,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }))}
      demoMode={isDemoMode()}
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleLabel: user.systemRole ?? 'Member',
        isFounder: user.isFounder,
      }}
    >
      {children}
    </AppShell>
  );
}
