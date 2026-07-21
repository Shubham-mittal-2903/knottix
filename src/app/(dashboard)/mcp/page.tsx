import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/demo';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { Reveal } from '@/components/modules/shared/Reveal';
import { MCPPanel } from '@/components/modules/mcp/MCPPanel';

export const metadata: Metadata = { title: 'MCP' };

/** Interoperability with external systems via the Model Context Protocol — configured servers,
 *  their real connection health, and every tool/resource/prompt they expose. Requires a real
 *  database and real, authenticated external connections, so it's honestly declined in Demo Mode
 *  rather than faking a "connected" server. */
export default async function MCPPage() {
  await requirePermission('integrations:read');
  const demo = isDemoMode();

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP"
        description="External MCP servers Knottix connects to — their tools, resources, and prompts appear as first-class Skills the Goal Engine can compose into any plan."
      />
      {demo ? (
        <p className="rounded-md border border-knottix-warning/30 bg-knottix-warning/5 px-4 py-3 text-sm text-foreground">
          MCP servers are real, authenticated external connections — not available in Demo Mode.
        </p>
      ) : (
        <Reveal>
          <MCPPanel />
        </Reveal>
      )}
    </div>
  );
}
