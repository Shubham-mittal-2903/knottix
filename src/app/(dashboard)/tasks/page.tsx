import type { Metadata } from 'next';
import { CheckSquare } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listTasksAssignedToMember, listTasksForOrganization, listTasksForWorkspace } from '@/lib/db/queries/task';
import { isDemoMode, DEMO_TASKS } from '@/lib/demo';
import { TaskList } from '@/components/modules/tasks/TaskList';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Tasks' };

export default async function TasksPage() {
  const user = await requireAuth();

  const tasks = isDemoMode()
    ? DEMO_TASKS
    : user.isFounder
      ? await listTasksForOrganization(user.organizationId, 150)
      : user.workspaceId
        ? await listTasksForWorkspace(user.workspaceId, 150)
        : await listTasksAssignedToMember(user.memberId, 150);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={user.isFounder ? 'Every open work item across the organization.' : 'Work items in your workspace.'}
      />

      {tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Tasks will appear here as they're created." />
      ) : (
        <Reveal delay={0.05}>
          <div className="rounded-xl border border-border px-4">
            <TaskList tasks={tasks} showProject />
          </div>
        </Reveal>
      )}
    </div>
  );
}
