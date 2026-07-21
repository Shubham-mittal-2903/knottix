import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';
import { GoalExecutionPanel } from '@/components/modules/goals/GoalExecutionPanel';

export const metadata: Metadata = { title: 'Goals' };

/** The Live Execution Panel — give Knottix a goal, it plans (via `templates.ts`'s Project
 *  Templates), executes via the Workflow Engine's real 'tool'/'agent' step handlers, pauses for
 *  confirmation-gated steps, and shows real task-graph state, polled from `GET /api/goals/[id]`. */
export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  await requirePermission('workflows:read');
  const { goal } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Give Knottix a goal instead of a step-by-step command — it plans, executes, verifies, and retries automatically."
      />
      <Reveal>
        <GoalExecutionPanel initialGoal={goal} />
      </Reveal>
    </div>
  );
}
