'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export interface NotificationPreview {
  id: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({
  unreadCount,
  recent,
}: {
  unreadCount: number;
  recent: NotificationPreview[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-1.5 rounded-full bg-primary" aria-hidden />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && <Badge variant="accent">{unreadCount} new</Badge>}
        </div>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          recent.slice(0, 6).map((n) => (
            <DropdownMenuItem key={n.id} render={<Link href={(n.actionUrl ?? '/notifications') as Route} />} className="flex-col items-start gap-0.5 py-2">
              <span className={n.read ? 'text-sm text-foreground' : 'text-sm font-medium text-foreground'}>{n.title}</span>
              {n.body && <span className="line-clamp-1 text-xs text-muted-foreground">{n.body}</span>}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroupLabel className="p-0">
          <Link href="/notifications" className="block px-2.5 py-1.5 text-xs font-medium text-primary hover:underline">
            View all notifications
          </Link>
        </DropdownMenuGroupLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
