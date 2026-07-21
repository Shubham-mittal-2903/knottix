import {
  Activity as ActivityIcon,
  FilePlus,
  KeyRound,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import type { ActivityType } from '@/types/database';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  entityType: string;
  entityId: string;
  entityName: string | null;
  description: string | null;
  actorId: string | null;
  createdAt: Date;
}

const ICONS: Partial<Record<ActivityType, LucideIcon>> = {
  CREATED: FilePlus,
  UPDATED: Pencil,
  DELETED: Trash2,
  MEMBER_INVITED: UserPlus,
  ROLE_CHANGED: ShieldAlert,
  PERMISSION_CHANGED: KeyRound,
};

function describe(item: ActivityItem): string {
  if (item.description) return item.description;
  const entity = item.entityName ?? item.entityType;
  switch (item.type) {
    case 'CREATED':
      return `${entity} was created`;
    case 'UPDATED':
      return `${entity} was updated`;
    case 'DELETED':
      return `${entity} was deleted`;
    case 'STATUS_CHANGED':
      return `${entity} status changed`;
    default:
      return `${entity} — ${item.type.toLowerCase().replace(/_/g, ' ')}`;
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? ActivityIcon;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{describe(item)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
