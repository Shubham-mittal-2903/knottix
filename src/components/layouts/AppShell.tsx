'use client';

import { useMemo, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandCenter } from './command-center/CommandCenter';
import { SplashScreen } from './SplashScreen';
import { PageTransition } from './PageTransition';
import { usePresentationStore } from '@/stores/presentation-store';
import { getNavForUser } from '@/config/navigation';
import type { WorkspaceOption } from './WorkspaceSwitcher';
import type { NotificationPreview } from './NotificationBell';

export interface AppShellProps {
  permissions: string[];
  experienceLabel: string;
  organizationName: string;
  currentWorkspaceId: string | null;
  workspaces: WorkspaceOption[];
  unreadCount: number;
  recentNotifications: NotificationPreview[];
  demoMode?: boolean;
  user: { name: string; email: string; avatarUrl: string | null; roleLabel: string; isFounder: boolean };
  children: React.ReactNode;
}

export function AppShell({
  permissions,
  experienceLabel,
  organizationName,
  currentWorkspaceId,
  workspaces,
  unreadCount,
  recentNotifications,
  demoMode = false,
  user,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const presentationMode = usePresentationStore((s) => s.enabled);
  const navItems = useMemo(() => getNavForUser(permissions, user.isFounder), [permissions, user.isFounder]);

  return (
    <div data-presentation={presentationMode} className="flex min-h-screen bg-background">
      <SplashScreen />
      <Sidebar
        navItems={navItems}
        collapsed={collapsed || presentationMode}
        onToggle={() => setCollapsed((c) => !c)}
        experienceLabel={experienceLabel}
        onOpenCommandCenter={() => setSearchOpen(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          organizationName={organizationName}
          currentWorkspaceId={currentWorkspaceId}
          workspaces={workspaces}
          unreadCount={unreadCount}
          recentNotifications={recentNotifications}
          demoMode={demoMode}
          presentationMode={presentationMode}
          user={user}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <CommandCenter isFounder={user.isFounder} navItems={navItems} open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
