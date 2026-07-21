import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { listAuditLogsForOrganization } from '@/lib/db/queries/audit';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Audit Log' };

export default async function AuditPage() {
  const user = await requirePermission('audit:read');
  const logs = await listAuditLogsForOrganization(user.organizationId, 200);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Every sensitive action, traced." />

      {logs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audit events yet" description="Sensitive actions will be recorded here." />
      ) : (
        <Reveal>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Action</th>
                <th className="px-4 py-2.5 text-left font-medium">Entity</th>
                <th className="px-4 py-2.5 text-left font-medium">Actor</th>
                <th className="px-4 py-2.5 text-left font-medium">IP</th>
                <th className="px-4 py-2.5 text-left font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {log.entityName ?? log.entityType}
                    <span className="ml-1 text-xs text-muted-foreground">{log.entityType}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{log.actorId ?? 'system'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{log.ipAddress ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </Reveal>
      )}
    </div>
  );
}
