'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface WorkspaceOption {
  id: string;
  name: string;
}

export function WorkspaceSwitcher({
  organizationName,
  currentWorkspaceId,
  workspaces,
}: {
  organizationName: string;
  currentWorkspaceId: string | null;
  workspaces: WorkspaceOption[];
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Layers className="size-3.5" />
        </div>
        <div className="min-w-0 leading-none">
          <p className="truncate text-sm font-medium text-foreground">{organizationName}</p>
        </div>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuGroupLabel>Workspaces</DropdownMenuGroupLabel>
        {workspaces.length === 0 ? (
          <p className="px-2.5 py-2 text-xs text-muted-foreground">No workspaces available.</p>
        ) : (
          workspaces.map((ws) => {
            const active = ws.id === currentWorkspaceId;
            return (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => {
                  if (!active) setNotice('Switching workspace requires re-authentication — coming soon.');
                }}
                className={cn('justify-between', active && 'text-foreground')}
              >
                <span className="truncate">{ws.name}</span>
                {active && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
        {notice && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2.5 py-2 text-xs text-muted-foreground">{notice}</p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
