import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listMeetingsForMember, listMeetingsForWorkspace } from '@/lib/db/queries/meeting';
import { isDemoMode, DEMO_MEETINGS } from '@/lib/demo';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';
import type { MeetingStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Calendar' };

const STATUS_VARIANT: Record<MeetingStatus, 'default' | 'accent' | 'success' | 'warning' | 'error'> = {
  SCHEDULED: 'accent',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
  POSTPONED: 'default',
};

export default async function CalendarPage() {
  const user = await requireAuth();

  const meetings = isDemoMode()
    ? DEMO_MEETINGS
    : user.workspaceId
      ? await listMeetingsForWorkspace(user.workspaceId, 100)
      : await listMeetingsForMember(user.memberId, 100);

  const upcoming = meetings.filter((m) => m.startTime >= new Date()).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const byDate = new Map<string, typeof upcoming>();
  for (const meeting of upcoming) {
    const key = formatDate(meeting.startTime);
    const list = byDate.get(key) ?? [];
    list.push(meeting);
    byDate.set(key, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Upcoming meetings, grouped by day." />

      {byDate.size === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Upcoming meetings will appear here, grouped by day." />
      ) : (
        <div className="space-y-6">
          {Array.from(byDate.entries()).map(([date, dayMeetings], groupIndex) => (
            <Reveal key={date} delay={groupIndex * 0.05}>
              <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{date}</p>
              <div className="space-y-2">
                {dayMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="card-hover flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {meeting.startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[meeting.status]}>{meeting.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
