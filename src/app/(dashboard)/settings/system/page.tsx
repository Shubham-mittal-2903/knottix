import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Activity, Brain, Cpu, Flag, Server } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { getSystem, ensureOrganizationReady } from '@/lib/system/bootstrap';
import {
  isDemoMode,
  DEMO_KERNEL_PHASE,
  DEMO_MODULES,
  DEMO_PROVIDERS,
  DEMO_USAGE,
  DEMO_MEMORY_HEALTH,
  DEMO_FEATURE_FLAGS,
} from '@/lib/demo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'System Health' };

const PROVIDER_BADGE: Record<'healthy' | 'degraded' | 'unavailable', 'success' | 'warning' | 'error'> = {
  healthy: 'success',
  degraded: 'warning',
  unavailable: 'error',
};

interface ModuleDisplay {
  id: string;
  name: string;
  version: string;
  status: string;
}

interface ProviderDisplay {
  id: string;
  name: string;
  available: boolean;
  status: 'healthy' | 'degraded' | 'unavailable';
  averageLatencyMs: number | null;
}

export default async function SystemHealthPage() {
  const user = await requireAuth();
  if (!user.isFounder) redirect('/workspace');

  let kernelPhase: string;
  let modules: ModuleDisplay[];
  let providers: ProviderDisplay[];
  let usage: { totalRequests: number; failedRequests: number; totalTokens: { totalTokens: number }; totalCostUsd: number };
  let memoryHealth: { storeAvailable: boolean; cacheAvailable: boolean; totalEntries: number; lastWriteAt: number | null; lastReadAt: number | null };
  let flags: Record<string, boolean>;

  if (isDemoMode()) {
    kernelPhase = DEMO_KERNEL_PHASE;
    modules = DEMO_MODULES;
    providers = DEMO_PROVIDERS.map((p) => ({ id: p.id, name: p.name, available: p.isAvailable, status: p.status, averageLatencyMs: p.averageLatencyMs }));
    usage = DEMO_USAGE;
    memoryHealth = DEMO_MEMORY_HEALTH;
    flags = DEMO_FEATURE_FLAGS;
  } else {
    const system = await getSystem();
    await ensureOrganizationReady(system, user.organizationId);

    kernelPhase = system.kernel.lifecycle.current();
    modules = system.kernel.modules.list();

    const providerHealth = system.aiRuntime.health.getAllHealth();
    providers = system.aiRuntime.providers.list().map((id) => {
      const provider = system.aiRuntime.providers.get(id);
      const health = providerHealth[id];
      return {
        id,
        name: provider?.name ?? id,
        available: provider?.isAvailable() ?? false,
        status: health?.status ?? 'unavailable',
        averageLatencyMs: health?.averageLatencyMs ?? null,
      };
    });

    usage = system.aiRuntime.getUsageSummary();
    memoryHealth = system.memoryEngine.getHealth();
    flags = system.kernel.features.list();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" description="Live introspection of the running Knottix system." />

      <RevealGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevealItem>
          <Card className="card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                Kernel
              </CardTitle>
              <Badge variant={kernelPhase === 'ready' ? 'success' : 'warning'}>{kernelPhase}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {modules.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">v{m.version}</p>
                    </div>
                    <Badge variant={m.status === 'ready' ? 'success' : m.status === 'error' ? 'error' : 'default'}>
                      {m.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-4 text-primary" />
                AI Runtime — Providers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-foreground">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {provider.available ? 'Configured' : 'No API key'}
                      {provider.averageLatencyMs ? ` · ${Math.round(provider.averageLatencyMs)}ms avg` : ''}
                    </p>
                  </div>
                  <Badge variant={PROVIDER_BADGE[provider.status]}>{provider.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-4 text-primary" />
                Memory Engine
              </CardTitle>
              <Badge variant={memoryHealth.storeAvailable ? 'success' : 'error'}>
                {memoryHealth.storeAvailable ? 'available' : 'unavailable'}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-0 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cached entries</p>
                <p className="mt-1 text-foreground">{memoryHealth.totalEntries}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cache</p>
                <p className="mt-1 text-foreground">{memoryHealth.cacheAvailable ? 'Available' : 'Unavailable'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last write</p>
                <p className="mt-1 text-foreground">
                  {memoryHealth.lastWriteAt ? formatRelativeTime(new Date(memoryHealth.lastWriteAt)) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last read</p>
                <p className="mt-1 text-foreground">
                  {memoryHealth.lastReadAt ? formatRelativeTime(new Date(memoryHealth.lastReadAt)) : 'Never'}
                </p>
              </div>
            </CardContent>
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                AI Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-0 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total requests</p>
                <p className="mt-1 text-foreground">{usage.totalRequests}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="mt-1 text-foreground">{usage.failedRequests}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total tokens</p>
                <p className="mt-1 text-foreground">{usage.totalTokens.totalTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. cost</p>
                <p className="mt-1 text-foreground">${usage.totalCostUsd.toFixed(4)}</p>
              </div>
            </CardContent>
          </Card>
        </RevealItem>

        <RevealItem className="lg:col-span-2">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="size-4 text-primary" />
                Feature Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {Object.keys(flags).length === 0 ? (
                <p className="text-sm text-muted-foreground">No feature flags set for this organization.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(flags).map(([flag, enabled]) => (
                    <li key={flag} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="truncate text-foreground">{flag}</span>
                      <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'on' : 'off'}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}
