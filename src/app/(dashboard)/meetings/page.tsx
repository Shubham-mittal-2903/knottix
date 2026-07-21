import type { Metadata } from 'next';
import { CalendarClock } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listMeetingsForMember, listMeetingsForOrganization, listMeetingsForWorkspace } from '@/lib/db/queries/meeting';
import { isDemoMode, DEMO_MEETINGS } from '@/lib/demo';
import { MeetingList } from '@/components/modules/meetings/MeetingList';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Meetings' };

export default async function MeetingsPage() {
  const user = await requireAuth();

  const meetings = isDemoMode()
    ? DEMO_MEETINGS
    : user.isFounder
      ? await listMeetingsForOrganization(user.organizationId, 100)
      : user.workspaceId
        ? await listMeetingsForWorkspace(user.workspaceId, 100)
        : await listMeetingsForMember(user.memberId, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description={user.isFounder ? 'Every meeting across the organization.' : 'Meetings in your workspace.'}
      />

      {meetings.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No meetings scheduled" description="Scheduled meetings will appear here." />
      ) : (
        <Reveal delay={0.05}>
          <div className="rounded-xl border border-border px-4">
            <MeetingList meetings={meetings} showWorkspace={user.isFounder} />
          </div>
        </Reveal>
      )}
    </div>
  );
}
