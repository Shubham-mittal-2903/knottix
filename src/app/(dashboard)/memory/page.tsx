import type { Metadata } from 'next';
import { Search, Sparkles } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { getSystem } from '@/lib/system/bootstrap';
import { isDemoMode, DEMO_MEMORY_ENTRIES } from '@/lib/demo';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Knowledge' };

interface KnowledgeEntry {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  sourceType: string;
  createdAt: number;
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission('memory:read');
  const { q } = await searchParams;

  let entries: KnowledgeEntry[];
  if (isDemoMode()) {
    const query = q?.toLowerCase().trim();
    entries = query
      ? DEMO_MEMORY_ENTRIES.filter((e) => e.title.toLowerCase().includes(query) || e.content.toLowerCase().includes(query))
      : [...DEMO_MEMORY_ENTRIES];
  } else {
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
      { namespace: 'organization', scopeId: user.organizationId, status: 'active', search: q },
      1,
      50,
    );
    entries = page.entries;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge" description="Organizational memory — permanent, searchable, source-attributed." />

      <form className="flex items-center gap-2.5" action="/memory">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search knowledge..."
            className="w-full rounded-full border border-border bg-secondary/30 py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:border-primary/40 focus:shadow-[0_0_0_3px_var(--knottix-accent-glow)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={q ? 'No matching memories' : 'No memory recorded yet'}
          description={q ? 'Try a different search term.' : 'Knowledge captured by the Founder Executive Assistant and project activity will appear here.'}
        />
      ) : (
        <RevealGroup className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <RevealItem key={entry.id}>
              <Card className="card-hover h-full">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">{entry.title}</h3>
                    <Badge variant="outline">{entry.sourceType}</Badge>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{entry.summary ?? entry.content}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(entry.createdAt))}</p>
                </CardContent>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
