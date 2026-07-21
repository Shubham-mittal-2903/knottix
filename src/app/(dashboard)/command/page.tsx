import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { countActiveProjectsForOrganization } from '@/lib/db/queries/project';
import { countOpenTasksForOrganization, listTasksForOrganization } from '@/lib/db/queries/task';
import { countUpcomingMeetingsForOrganization, listMeetingsForOrganization } from '@/lib/db/queries/meeting';
import { listActivityForOrganization } from '@/lib/db/queries/activity';
import { listMembersForOrganization } from '@/lib/db/queries/member';
import { getSystem } from '@/lib/system/bootstrap';
import { AI_EMPLOYEES } from '@/config/ai-employees';
import {
  isDemoMode,
  withDemo,
  DEMO_ACTIVE_PROJECT_COUNT,
  DEMO_OPEN_TASK_COUNT,
  DEMO_MEETINGS_TODAY_COUNT,
  DEMO_TEAM_MEMBER_COUNT,
  DEMO_ACTIVITY,
  DEMO_TASKS,
  DEMO_MEETINGS,
  DEMO_MEMORY_ENTRIES,
  DEMO_GITHUB_SUMMARY,
} from '@/lib/demo';
import { getGitHubSummary } from '@/lib/github/service';
import { StatusStrip } from '@/components/modules/system/StatusStrip';
import { QuickActions } from '@/components/modules/command/QuickActions';
import { CommandHistoryWidget } from '@/components/modules/command/CommandHistoryWidget';
import { GitHubWidget } from '@/components/modules/github/GitHubWidget';
import { GoalExecutionWidget } from '@/components/modules/goals/GoalExecutionWidget';
import { TaskSessionsWidget } from '@/components/modules/task-sessions/TaskSessionsWidget';
import { Orb } from '@/components/hero/Orb';
import { StatChip } from '@/components/hero/StatChip';
import { Ledger } from '@/components/hero/Ledger';
import { activityItemToLedgerEntry } from '@/components/hero/adapters';
import { OpenCommandButton } from '@/components/hero/OpenCommandButton';
import { formatRelativeTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Mission Control' };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function MissionControlPage() {
  const user = await requireAuth();
  if (!user.isFounder) redirect('/workspace');

  const demo = isDemoMode();

  const [activeProjects, openTasks, upcomingMeetingsCount, teamMemberCount, activity, allTasks, allMeetings, githubSummary] =
    await Promise.all([
      withDemo(DEMO_ACTIVE_PROJECT_COUNT, () => countActiveProjectsForOrganization(user.organizationId)),
      withDemo(DEMO_OPEN_TASK_COUNT, () => countOpenTasksForOrganization(user.organizationId)),
      withDemo(DEMO_MEETINGS_TODAY_COUNT, () => countUpcomingMeetingsForOrganization(user.organizationId)),
      withDemo(DEMO_TEAM_MEMBER_COUNT, async () => (await listMembersForOrganization(user.organizationId)).total),
      withDemo(DEMO_ACTIVITY.slice(0, 6), () => listActivityForOrganization(user.organizationId, 6)),
      withDemo(DEMO_TASKS, () => listTasksForOrganization(user.organizationId, 200)),
      withDemo(DEMO_MEETINGS, () => listMeetingsForOrganization(user.organizationId, 100)),
      withDemo(DEMO_GITHUB_SUMMARY, () => getGitHubSummary(user.organizationId)),
    ]);

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const dueTodayOrOverdue = allTasks
    .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
    .filter((t) => t.dueDate && t.dueDate <= endOfToday)
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
    .slice(0, 5);

  const meetingsToday = allMeetings
    .filter((m) => m.startTime >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && m.startTime <= endOfToday)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const upcomingMeetings = allMeetings
    .filter((m) => m.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 4);

  let knowledgeHighlights: Array<{ id: string; title: string; summary: string | null; sourceType: string }> = [];
  if (demo) {
    knowledgeHighlights = DEMO_MEMORY_ENTRIES.slice(0, 4).map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.summary,
      sourceType: e.sourceType,
    }));
  } else {
    try {
      const system = await getSystem();
      const page = await system.memoryEngine.query(
        {
          userId: user.id,
          memberId: user.memberId,
          organizationId: user.organizationId,
          workspaceId: user.workspaceId,
          roleId: user.roleId,
          isFounder: user.isFounder,
          permissions: user.permissions,
        },
        { namespace: 'organization', scopeId: user.organizationId, status: 'active' },
        1,
        4,
      );
      knowledgeHighlights = page.entries.map((e) => ({ id: e.id, title: e.title, summary: e.summary, sourceType: e.sourceType }));
    } catch {
      knowledgeHighlights = [];
    }
  }

  const firstName = user.name.split(' ')[0];
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const ledgerEntries = activity.map(activityItemToLedgerEntry);
  const needsAttention = [...meetingsToday.map((m) => ({ kind: 'meeting' as const, item: m })), ...dueTodayOrOverdue.map((t) => ({ kind: 'task' as const, item: t }))];

  return (
    <div className="hero-scope space-y-8 pb-4">
      {/* Now strip */}
      <div className="hero-now-strip">
        <div className="hero-eyebrow hero-eyebrow--cyan flex items-center gap-2">
          <span className="hero-dot hero-dot--active" />
          Live
        </div>
        <div style={{ color: 'var(--hero-ink-secondary)' }}>
          <strong style={{ color: 'var(--hero-ink-primary)' }}>{AI_EMPLOYEES.length}</strong> AI employees available ·{' '}
          <strong style={{ color: 'var(--hero-ink-primary)' }}>{dueTodayOrOverdue.length}</strong> task{dueTodayOrOverdue.length === 1 ? '' : 's'} due ·{' '}
          <strong style={{ color: 'var(--hero-ink-primary)' }}>{meetingsToday.length}</strong> meeting{meetingsToday.length === 1 ? '' : 's'} today
        </div>
        <div className="hero-font-mono ml-auto" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-ink-tertiary)' }}>
          {demo ? 'Demo Mode' : 'Live'}
        </div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_480px_1fr]">
        <div className="flex flex-col gap-3">
          <StatChip label="Active Projects" value={activeProjects} sub={`${openTasks} open tasks`} />
          <StatChip label="Team Members" value={teamMemberCount} sub="across the organization" />
        </div>

        <div className="flex flex-col items-center gap-5 text-center">
          <div className="hero-eyebrow hero-eyebrow--cyan">Knottix · listening</div>
          <Orb size="xxl" state="idle" wire />
          <div className="hero-font-display" style={{ fontSize: 17, lineHeight: 1.3, color: 'var(--hero-ink-primary)' }}>
            {greeting()}, <strong style={{ color: 'var(--hero-cyan-bright)', fontWeight: 500 }}>{firstName}</strong>.
            <br />
            {dueTodayOrOverdue.length > 0 || meetingsToday.length > 0
              ? `${dueTodayOrOverdue.length} thing${dueTodayOrOverdue.length === 1 ? '' : 's'} need${dueTodayOrOverdue.length === 1 ? 's' : ''} you. The rest is running.`
              : 'Nothing urgent today. The rest is running.'}
          </div>
          <OpenCommandButton />
        </div>

        <div className="flex flex-col items-end gap-3">
          <StatChip label="Meetings Today" value={upcomingMeetingsCount} align="right" />
          <StatChip label="Knowledge Entries" value={knowledgeHighlights.length} align="right" />
        </div>
      </div>

      <div className="hero-panel" style={{ padding: 'var(--hero-space-4)' }}>
        <StatusStrip anthropicConfigured={anthropicConfigured} demoMode={demo} />
        <div className="mt-4">
          <QuickActions />
        </div>
      </div>

      {/* Below the fold */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        {/* Needs You */}
        <section className="hero-panel" style={{ padding: 'var(--hero-space-4)' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="hero-eyebrow hero-eyebrow--cyan">Needs You</span>
            <span className="hero-font-mono" style={{ fontSize: 11, color: 'var(--hero-signal)' }}>
              {needsAttention.length}
            </span>
          </div>
          {needsAttention.length === 0 ? (
            <p className="py-6 text-center text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>
              Nothing due today. Enjoy the clear runway.
            </p>
          ) : (
            <div className="space-y-2">
              {needsAttention.map(({ kind, item }) =>
                kind === 'meeting' ? (
                  <div key={`m-${item.id}`} className="hero-item">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="hero-dot hero-dot--attention" />
                      <span className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-ink-tertiary)' }}>
                        meeting · {formatRelativeTime(item.startTime)}
                      </span>
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--hero-ink-primary)' }}>{item.title}</div>
                  </div>
                ) : (
                  <Link key={`t-${item.id}`} href="/tasks" className="hero-item block">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={item.dueDate && item.dueDate < now ? 'hero-dot hero-dot--blocked' : 'hero-dot hero-dot--attention'} />
                      <span className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-ink-tertiary)' }}>
                        task · {item.priority.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--hero-ink-primary)' }}>{item.title}</div>
                    {item.project && (
                      <div className="mt-0.5 text-[11px]" style={{ color: 'var(--hero-ink-secondary)' }}>{item.project.title}</div>
                    )}
                  </Link>
                ),
              )}
            </div>
          )}

          <div className="mt-6 mb-3 flex items-center justify-between">
            <span className="hero-eyebrow hero-eyebrow--cyan">Upcoming Meetings</span>
            <Link href="/meetings" className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-cyan)' }}>
              See all →
            </Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <p className="py-4 text-center text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>Nothing scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.map((m) => (
                <div key={m.id} className="hero-item">
                  <div className="text-xs font-medium" style={{ color: 'var(--hero-ink-primary)' }}>{m.title}</div>
                  <div className="mt-0.5 hero-font-mono" style={{ fontSize: 11, color: 'var(--hero-ink-tertiary)' }}>{formatRelativeTime(m.startTime)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-5">
          {/* AI Status */}
          <section className="hero-panel" style={{ padding: 'var(--hero-space-4)' }}>
            <div className="mb-4 flex items-center justify-between">
              <span className="hero-eyebrow hero-eyebrow--cyan">Your Staff</span>
              <Link href="/agents" className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-cyan)' }}>
                See all →
              </Link>
            </div>
            <div className="space-y-1">
              {AI_EMPLOYEES.map((e) => (
                <Link key={e.key} href={`/agents/${e.key}`} className="flex items-center gap-3 rounded-md px-1 py-1.5 text-xs hover:bg-white/[0.02]">
                  <Orb size="sm" state="idle" glow={false} />
                  <span className="flex-1" style={{ color: 'var(--hero-ink-primary)' }}>{e.name}</span>
                  <span className="hero-font-mono" style={{ fontSize: 11, color: 'var(--hero-ink-tertiary)' }}>{e.role}</span>
                </Link>
              ))}
            </div>
          </section>

          <GitHubWidget summary={githubSummary} />
          <GoalExecutionWidget />
          {!demo && <TaskSessionsWidget />}
          <CommandHistoryWidget />

          {/* Knowledge Highlights */}
          <section className="hero-panel" style={{ padding: 'var(--hero-space-4)' }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="hero-eyebrow hero-eyebrow--cyan">Knowledge Highlights</span>
              <Link href="/memory" className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-cyan)' }}>
                Browse →
              </Link>
            </div>
            {knowledgeHighlights.length === 0 ? (
              <p className="py-4 text-center text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>
                Knowledge captured across the organization will surface here.
              </p>
            ) : (
              <div className="space-y-2">
                {knowledgeHighlights.map((entry) => (
                  <div key={entry.id} className="hero-item">
                    <p className="line-clamp-1 text-xs font-medium" style={{ color: 'var(--hero-ink-primary)' }}>{entry.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: 'var(--hero-ink-secondary)' }}>{entry.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Ledger — real org activity */}
      <Ledger title="Activity Ledger" entries={ledgerEntries} />
    </div>
  );
}
