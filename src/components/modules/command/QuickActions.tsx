'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { CalendarClock, FolderKanban, Search, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { OPEN_COMMAND_CENTER_EVENT } from '@/lib/command-center-events';

const ACTIONS = [
  { label: 'Open AI Chat', href: '/agents', icon: Sparkles },
  { label: 'Open Projects', href: '/projects', icon: FolderKanban },
  { label: 'Open Meetings', href: '/meetings', icon: CalendarClock },
  { label: 'Open Knowledge', href: '/memory', icon: Search },
  { label: 'System Health', href: '/settings/system', icon: ShieldCheck },
] as const;

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href as Route}
            className="group flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:border-primary/40 hover:bg-secondary hover:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
          >
            <Icon className="size-3.5 text-primary transition-transform group-hover:scale-110" />
            {action.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_CENTER_EVENT))}
        className="group flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:border-primary/40 hover:bg-secondary hover:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
      >
        <Terminal className="size-3.5 text-primary transition-transform group-hover:scale-110" />
        Command Center
        <kbd className="rounded border border-border bg-background px-1 text-[10px] text-muted-foreground">⌘K</kbd>
      </button>
    </div>
  );
}
