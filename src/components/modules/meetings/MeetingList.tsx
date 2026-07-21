import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import type { MeetingStatus } from '@/types/database';

export interface MeetingListItem {
  id: string;
  title: string;
  status: MeetingStatus;
  startTime: Date;
  endTime: Date | null;
  summary: string | null;
  workspace?: { name: string } | null;
}

const STATUS_VARIANT: Record<MeetingStatus, 'default' | 'accent' | 'success' | 'warning' | 'error'> = {
  SCHEDULED: 'accent',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
  POSTPONED: 'default',
};

export function MeetingList({ meetings, showWorkspace = false }: { meetings: MeetingListItem[]; showWorkspace?: boolean }) {
  if (meetings.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No meetings scheduled.</p>;
  }

  return (
    <ul className="divide-y divide-border/70">
      {meetings.map((meeting) => (
        <li
          key={meeting.id}
          className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/30"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{meeting.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {formatDateTime(meeting.startTime)}
              {showWorkspace && meeting.workspace ? ` · ${meeting.workspace.name}` : ''}
            </p>
            {meeting.summary && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{meeting.summary}</p>}
          </div>
          <Badge variant={STATUS_VARIANT[meeting.status]} className="shrink-0">
            {meeting.status.replace('_', ' ')}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
