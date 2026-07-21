import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/demo';
import { recallSessionPatterns } from '@/lib/task-sessions';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';
import { TaskSessionsPanel } from '@/components/modules/task-sessions/TaskSessionsPanel';

export const metadata: Metadata = { title: 'Task Sessions' };

/** Long-running autonomous work sessions — real, persisted `TaskSession` rows wrapping one or
 *  more Goal Execution rounds. Requires a real database (session recovery across a restart is the
 *  whole point), so it's honestly declined in Demo Mode rather than faked. */
export default async function TaskSessionsPage() {
  const user = await requirePermission('workflows:read');
  const demo = isDemoMode();
  const patterns = demo ? null : await recallSessionPatterns(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Sessions"
        description="Give Knottix one high-level objective and leave — it continues working, pausing only for confirmation, until the objective is complete."
      />
      {demo ? (
        <p className="rounded-md border border-knottix-warning/30 bg-knottix-warning/5 px-4 py-3 text-sm text-foreground">
          Task Sessions require a real database — session recovery across a restart is the whole point, and there is no honest way to demo that without one. Not available in Demo Mode.
        </p>
      ) : (
        <>
          {patterns && (patterns.succeeded > 0 || patterns.failed > 0 || patterns.cancelled > 0) && (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary">
              From memory: {patterns.succeeded} session{patterns.succeeded === 1 ? '' : 's'} succeeded, {patterns.failed} failed, {patterns.cancelled} cancelled
              {patterns.avgDurationMs !== null && ` — averaging ${Math.round(patterns.avgDurationMs / 1000)}s to complete`}.
            </p>
          )}
          <Reveal>
            <TaskSessionsPanel />
          </Reveal>
        </>
      )}
    </div>
  );
}
