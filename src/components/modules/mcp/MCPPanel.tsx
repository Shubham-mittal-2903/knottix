'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Network,
  Plug,
  RefreshCw,
  Trash2,
  Wrench,
  FileText,
  MessageSquareText,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MCPServerInfo, MCPCallLogEntry, MCPTransportType, MCPServerStatus } from '@/lib/mcp/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success || json.data === undefined) throw new Error(json.error ?? 'Request failed');
  return json.data;
}

async function postJson<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return (await res.json()) as ApiResponse<T>;
}

const STATUS_META: Record<MCPServerStatus, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline'; icon: typeof CheckCircle2 }> = {
  CONNECTED: { label: 'Connected', variant: 'success', icon: CheckCircle2 },
  CONNECTING: { label: 'Connecting', variant: 'accent', icon: Loader2 },
  DISCONNECTED: { label: 'Disconnected', variant: 'outline', icon: Plug },
  ERROR: { label: 'Error', variant: 'error', icon: XCircle },
};

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60';

export function MCPPanel() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [transport, setTransport] = useState<MCPTransportType>('HTTP');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [authToken, setAuthToken] = useState('');

  const { data: servers, refetch } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => getJson<MCPServerInfo[]>('/api/mcp/servers'),
    refetchInterval: 10_000,
  });

  const { data: calls } = useQuery({
    queryKey: ['mcp-calls'],
    queryFn: () => getJson<MCPCallLogEntry[]>('/api/mcp/calls'),
    refetchInterval: 10_000,
  });

  const selected = (servers ?? []).find((s) => s.server.id === selectedId) ?? servers?.[0] ?? null;

  function resetForm() {
    setName('');
    setTransport('HTTP');
    setCommand('');
    setArgs('');
    setUrl('');
    setAuthToken('');
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) return setFormError('Name is required.');
    if (transport === 'STDIO' && !command.trim()) return setFormError('STDIO servers require a command.');
    if (transport !== 'STDIO' && !url.trim()) return setFormError('SSE/HTTP servers require a url.');

    setSubmitting(true);
    setFormError(null);
    try {
      const json = await postJson<MCPServerInfo>('/api/mcp/servers', {
        name: name.trim(),
        transport,
        command: transport === 'STDIO' ? command.trim() : undefined,
        args: transport === 'STDIO' && args.trim() ? args.trim().split(/\s+/) : undefined,
        url: transport !== 'STDIO' ? url.trim() : undefined,
        authToken: authToken.trim() || undefined,
      });
      if (!json.success || !json.data) {
        setFormError(json.error ?? 'Failed to add MCP server.');
        return;
      }
      resetForm();
      setShowForm(false);
      setSelectedId(json.data.server.id);
      void refetch();
    } catch {
      setFormError('Failed to reach the MCP Client Manager.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshAll() {
    if (refreshingAll) return;
    setRefreshingAll(true);
    try {
      await postJson('/api/mcp/servers/refresh');
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['mcp-calls'] });
    } finally {
      setRefreshingAll(false);
    }
  }

  async function handleRefreshOne(serverId: string) {
    if (rowBusy) return;
    setRowBusy(serverId);
    try {
      await postJson(`/api/mcp/servers/${serverId}/refresh`);
      void refetch();
    } finally {
      setRowBusy(null);
    }
  }

  async function handleRemove(serverId: string) {
    if (rowBusy) return;
    setRowBusy(serverId);
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' });
      await res.json();
      if (selectedId === serverId) setSelectedId(null);
      void refetch();
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {servers ? `${servers.length} configured server${servers.length === 1 ? '' : 's'}` : 'Loading...'}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleRefreshAll} disabled={refreshingAll || !servers?.length}>
            {refreshingAll ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh All
          </Button>
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Add Server'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="size-4 text-primary" /> New MCP Server
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Figma)" className={inputClass} disabled={submitting} />
              <select value={transport} onChange={(e) => setTransport(e.target.value as MCPTransportType)} className={inputClass} disabled={submitting}>
                <option value="HTTP">HTTP (Streamable)</option>
                <option value="SSE">SSE</option>
                <option value="STDIO">STDIO (local process)</option>
              </select>
              {transport === 'STDIO' ? (
                <>
                  <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Command (e.g. npx)" className={inputClass} disabled={submitting} />
                  <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="Args (space-separated)" className={inputClass} disabled={submitting} />
                </>
              ) : (
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Server URL" className={inputClass} disabled={submitting} />
              )}
              <input value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Auth token (optional)" type="password" className={`${inputClass} sm:col-span-2`} disabled={submitting} />
              <Button type="submit" className="sm:col-span-2" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Add & Connect'}
              </Button>
            </form>
            {formError && <p className="text-xs text-knottix-error">{formError}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {!servers || servers.length === 0 ? (
            <Card>
              <CardContent className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
                No MCP servers configured yet. Add one to give Knottix external tools.
              </CardContent>
            </Card>
          ) : (
            servers.map((info) => {
              const meta = STATUS_META[info.server.status];
              const Icon = meta.icon;
              return (
                <button
                  key={info.server.id}
                  type="button"
                  onClick={() => setSelectedId(info.server.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${selected?.server.id === info.server.id ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-border'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{info.server.name}</p>
                    <Badge variant={meta.variant}>
                      <Icon className={`size-3 ${info.server.status === 'CONNECTING' ? 'animate-spin' : ''}`} /> {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {info.server.transport} · {info.tools.length} tool{info.tools.length === 1 ? '' : 's'} · {info.resources.length} resource{info.resources.length === 1 ? '' : 's'} · {info.prompts.length} prompt{info.prompts.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {info.server.latencyMs !== null ? `${info.server.latencyMs}ms` : 'no latency'} · last connected {timeAgo(info.server.lastConnectedAt)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-5">
          {!selected ? (
            <Card>
              <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">Select a server, or add one.</CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{selected.server.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selected.server.transport} · {selected.server.url ?? selected.server.command ?? ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_META[selected.server.status].variant}>{STATUS_META[selected.server.status].label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {selected.server.lastError && (
                  <p className="rounded-md border border-knottix-error/20 bg-knottix-error/5 px-3 py-2 text-xs text-knottix-error">
                    {selected.server.lastError} ({selected.server.consecutiveFailures} consecutive failure{selected.server.consecutiveFailures === 1 ? '' : 's'})
                  </p>
                )}

                <div className="flex flex-wrap gap-3 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                  <span>Latency: {selected.server.latencyMs !== null ? `${selected.server.latencyMs}ms` : '—'}</span>
                  <span>Last connected: {timeAgo(selected.server.lastConnectedAt)}</span>
                  <span>Version: {selected.server.serverVersion ?? 'unknown'}</span>
                  <span>Auth: {selected.server.hasAuthToken ? 'configured' : 'none'}</span>
                </div>

                {selected.tools.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                      <Wrench className="size-3" /> Tools ({selected.tools.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tools.map((t) => (
                        <Badge key={t.name} variant="outline" title={t.description ?? undefined}>{t.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selected.resources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                      <FileText className="size-3" /> Resources ({selected.resources.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.resources.map((r) => (
                        <Badge key={r.uri} variant="outline" title={r.uri}>{r.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selected.prompts.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                      <MessageSquareText className="size-3" /> Prompts ({selected.prompts.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.prompts.map((p) => (
                        <Badge key={p.name} variant="outline" title={p.description ?? undefined}>{p.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selected.server.status === 'CONNECTED' && selected.tools.length === 0 && selected.resources.length === 0 && selected.prompts.length === 0 && (
                  <p className="text-xs text-muted-foreground">Connected, but this server reports no tools, resources, or prompts.</p>
                )}

                <div className="flex items-center gap-2 border-t border-border/60 pt-3">
                  <Button type="button" size="sm" variant="outline" onClick={() => handleRefreshOne(selected.server.id)} disabled={rowBusy === selected.server.id}>
                    {rowBusy === selected.server.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleRemove(selected.server.id)} disabled={rowBusy === selected.server.id}>
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Calls</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!calls || calls.length === 0 ? (
                <p className="text-xs text-muted-foreground">No MCP calls logged yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {calls.slice(0, 15).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        {c.success ? <CheckCircle2 className="size-3.5 shrink-0 text-knottix-success" /> : <AlertTriangle className="size-3.5 shrink-0 text-knottix-error" />}
                        <span className="truncate text-foreground">{c.type.toLowerCase()}: {c.name}</span>
                        <span className="shrink-0 text-muted-foreground">({c.serverName})</span>
                      </div>
                      <span className="shrink-0 text-muted-foreground">{c.durationMs}ms · {timeAgo(c.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
