'use client';

import Link from 'next/link';
import { LogOut, Monitor, Settings, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/app/(auth)/logout/actions';
import { usePresentationStore } from '@/stores/presentation-store';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function ProfileMenu({
  name,
  email,
  avatarUrl,
  roleLabel,
  isFounder,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  roleLabel: string;
  isFounder: boolean;
}) {
  const presentationMode = usePresentationStore((s) => s.enabled);
  const togglePresentation = usePresentationStore((s) => s.toggle);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-secondary focus-visible:outline-none">
        <Avatar className="size-7">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{initials(name) || <UserIcon className="size-3.5" />}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroupLabel>{isFounder ? 'Founder' : roleLabel}</DropdownMenuGroupLabel>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        {isFounder && (
          <DropdownMenuItem render={<Link href="/settings/system" />}>
            <ShieldCheck className="size-4" />
            System Health
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={togglePresentation}>
          <Monitor className="size-4" />
          {presentationMode ? 'Exit Presentation Mode' : 'Presentation Mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logout();
          }}
          className="text-knottix-error data-[highlighted]:bg-knottix-error/10 data-[highlighted]:text-knottix-error"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
