import type { Metadata } from 'next';
import { CircleCheck } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { PageHeader } from '@/components/modules/shared/PageHeader';

export const metadata: Metadata = { title: 'Approvals' };

export default async function ApprovalsPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader title="Approvals" description="Decisions awaiting sign-off." />

      <EmptyState
        icon={CircleCheck}
        title="No approval workflows yet"
        description="Knottix doesn't have an approvals data model yet — this surface is reserved for when a workflow-driven approval process is built on the existing Workflow Engine."
      />
    </div>
  );
}
