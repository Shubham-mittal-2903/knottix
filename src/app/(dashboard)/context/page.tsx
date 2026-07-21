import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/demo';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';
import { ContextInspectorPanel } from '@/components/modules/context/ContextInspectorPanel';

export const metadata: Metadata = { title: 'Context Inspector' };

/** Shows exactly what the Context Engine would collect, rank, select, and reject for any goal —
 *  the same real pipeline `startGoal()` runs before planning. Requires a real database (every
 *  source is a real Prisma/Memory/GitHub query), so it's honestly declined in Demo Mode. */
export default async function ContextInspectorPage() {
  await requirePermission('workflows:read');
  const demo = isDemoMode();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Context Inspector"
        description="See exactly what Knottix already knows before it plans or executes a goal — every source, every score, every reason."
      />
      {demo ? (
        <p className="rounded-md border border-knottix-warning/30 bg-knottix-warning/5 px-4 py-3 text-sm text-foreground">
          The Context Engine queries real Projects, Tasks, Meetings, Documents, Memory, GitHub, and Task Session data directly — not available in Demo Mode.
        </p>
      ) : (
        <Reveal>
          <ContextInspectorPanel />
        </Reveal>
      )}
    </div>
  );
}
