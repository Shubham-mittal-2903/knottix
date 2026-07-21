import { formatRelativeTime } from '@/lib/format';
import type { ActivityItem } from '@/components/modules/activity/ActivityFeed';
import type { LedgerEntryData, LedgerStatus } from './Ledger';

const STATUS_BY_TYPE: Partial<Record<ActivityItem['type'], LedgerStatus>> = {
  CREATED: 'done',
  UPDATED: 'active',
  DELETED: 'attention',
  MEMBER_INVITED: 'done',
  ROLE_CHANGED: 'attention',
  PERMISSION_CHANGED: 'attention',
};

/**
 * Maps the real `ActivityItem[]` the Activity Log already fetches (`listActivityForOrganization`)
 * into the Ledger's display shape — no new data source, no fabricated actor name. `actorId` is
 * only an ID today (no name-resolution join exists on this query), so `actor` is left undefined
 * rather than inventing a label; the Ledger component already renders that honestly (no actor
 * segment at all) instead of showing a raw UUID or a guessed name.
 */
export function activityItemToLedgerEntry(item: ActivityItem): LedgerEntryData {
  return {
    id: item.id,
    timeLabel: formatRelativeTime(item.createdAt),
    verb: item.type.toLowerCase().replace(/_/g, ' '),
    object: item.description ?? item.entityName ?? item.entityType,
    status: STATUS_BY_TYPE[item.type] ?? 'active',
  };
}
