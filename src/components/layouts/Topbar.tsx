'use client';

import { Search } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { WorkspaceSwitcher, type WorkspaceOption } from './WorkspaceSwitcher';
import { NotificationBell, type NotificationPreview } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { DemoBadge } from './DemoBadge';
import { Separator } from '@/components/ui/separator';

export function Topbar({
  organizationName,
  currentWorkspaceId,
  workspaces,
  unreadCount,
  recentNotifications,
  demoMode = false,
  presentationMode = false,
  user,
  onOpenSearch,
}: {
  organizationName: string;
  currentWorkspaceId: string | null;
  workspaces: WorkspaceOption[];
  unreadCount: number;
  recentNotifications: NotificationPreview[];
  demoMode?: boolean;
  presentationMode?: boolean;
  user: { name: string; email: string; avatarUrl: string | null; roleLabel: string; isFounder: boolean };
  onOpenSearch: () => void;
}) {
  return (
    <header className="glass sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-4">
      {!presentationMode && (
        <>
          <WorkspaceSwitcher
            organizationName={organizationName}
            currentWorkspaceId={currentWorkspaceId}
            workspaces={workspaces}
          />
          <Separator orientation="vertical" className="h-5" />
        </>
      )}
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      {demoMode && <DemoBadge />}

      <button
        type="button"
        onClick={onOpenSearch}
        className="group flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-secondary hover:text-foreground hover:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
      >
        <Search className="size-3.5 transition-transform group-hover:scale-110" />
        <span>Search</span>
        <kbd className="rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
      </button>

      {!presentationMode && <NotificationBell unreadCount={unreadCount} recent={recentNotifications} />}
      <ProfileMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} roleLabel={user.roleLabel} isFounder={user.isFounder} />
    </header>
  );
}
