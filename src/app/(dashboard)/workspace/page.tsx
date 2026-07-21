import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, CheckSquare, Sparkles } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listTasksAssignedToMember } from '@/lib/db/queries/task';
import { listMeetingsForMember } from '@/lib/db/queries/meeting';
import { withDemo, DEMO_TASKS, DEMO_MEETINGS } from '@/lib/demo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskList } from '@/components/modules/tasks/TaskList';
import { MeetingList } from '@/components/modules/meetings/MeetingList';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'My Work' };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function WorkspaceHomePage() {
  const user = await requireAuth();

  const [tasks, meetings] = await Promise.all([
    withDemo(DEMO_TASKS.slice(0, 8), () => listTasksAssignedToMember(user.memberId, 8)),
    withDemo(DEMO_MEETINGS.slice(0, 5), () => listMeetingsForMember(user.memberId, 5)),
  ]);

  return (
    <div className="space-y-8">
      <Reveal>
        <div className="gradient-mesh rounded-2xl border border-border px-8 py-9">
          <p className="text-xs font-medium tracking-widest text-primary uppercase">{greeting()}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gradient sm:text-3xl">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Here&apos;s what needs your attention today.</p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-primary" />
                  My Tasks
                </CardTitle>
                <Link href="/tasks" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                <TaskList tasks={tasks} showProject />
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  Upcoming Meetings
                </CardTitle>
                <Link href="/meetings" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                <MeetingList meetings={meetings} />
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <Reveal delay={0.05}>
          <Card className="glow-ring flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Assigned AI
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Ask the Founder Executive Assistant about organizational knowledge, projects, or meetings.
              </p>
              <Link
                href="/agents"
                className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open AI
              </Link>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
