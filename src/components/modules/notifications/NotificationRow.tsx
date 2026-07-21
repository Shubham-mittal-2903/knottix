'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useTransition } from 'react';
import { Check } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import { markNotificationReadAction } from '@/app/(dashboard)/notifications/actions';
import { cn } from '@/lib/utils';

export function NotificationRow({
  id,
  title,
  body,
  actionUrl,
  read,
  createdAt,
  readOnly = false,
}: {
  id: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
  readOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const content = (
    <div className="min-w-0 flex-1">
      <p className={cn('text-sm', read ? 'text-foreground' : 'font-medium text-foreground')}>{title}</p>
      {body && <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(new Date(createdAt))}</p>
    </div>
  );

  return (
    <li className="flex items-start gap-3 py-3">
      {!read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
      {read && <span className="mt-1.5 size-1.5 shrink-0" aria-hidden />}
      {actionUrl ? (
        <Link href={actionUrl as Route} className="min-w-0 flex-1">
          {content}
        </Link>
      ) : (
        content
      )}
      {!read && !readOnly && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markNotificationReadAction(id))}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          <Check className="size-3" />
          Mark read
        </button>
      )}
    </li>
  );
}
