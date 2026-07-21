'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  Package,
  Rocket,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TaskSession, TaskSessionProgress, TaskSessionStatus } from '@/lib/task-sessions';
import type { GoalStepSummary } from '@/lib/goal-engine';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function postJson<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return (await res.json()) as ApiResponse<T>;
}

const STATUS_META: Record<TaskSessionStatus, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline' }> = {
  RUNNING: { label: 'Running', variant: 'accent' },
  PAUSED: { label: 'Paused', variant: 'warning' },
  BLOCKED: { label: 'Blocked', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
};

const STEP_ICON: Record<GoalStepSummary['status'], typeof CheckCircle2> = {
  completed: CheckCircle2,
  failed: XCircle,
  skipped: Circle,
  waiting_confirmation: AlertTriangle,
};
const STEP_COLOR: Record<GoalStepSummary['status'], string> = {
  completed: 'text-knottix-success',
  failed: 'text-knottix-error',
  skipped: 'text-muted-foreground',
  waiting_confirmation: 'text-knottix-warning',
};

const GROUPS: { status: TaskSessionStatus[]; label: string }[] = [
  { status: ['RUNNING'], label: 'Running' },
  { status: ['PAUSED', 'BLOCKED'], label: 'Paused / Blocked' },
  { status: ['COMPLETED'], label: 'Completed' },
  { status: ['FAILED', 'CANCELLED'], label: 'Failed / Cancelled' },
];

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function TaskSessionsPanel() {
  const queryClient = useQueryClient();
  const [objective, setObjective] = useState('');
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const { data: sessions, refetch: refetchList } = useQuery({
    queryKey: ['task-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/task-sessions');
      const json = (await res.json()) as ApiResponse<TaskSession[]>;
      if (!json.success || !json.data) throw new Error(json.error ?? 'Failed to load task sessions');
      return json.data;
    },
    refetchInterval: 4000,
  });

  const { data: progress } = useQuery({
    queryKey: ['task-session', selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/task-sessions/${selectedId}`);
      const json = (await res.json()) as ApiResponse<TaskSessionProgress>;
      if (!json.success || !json.data) throw new Error(json.error ?? 'Failed to load session progress');
      return json.data;
    },
    enabled: Boolean(selectedId),
    refetchInterval: (query) => (query.state.data?.session.status === 'RUNNING' ? 2000 : false),
  });

  useEffect(() => {
    if (!selectedId && sessions && sessions.length > 0) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const goal = objective.trim();
    if (!goal || starting) return;
    setStarting(true);
    setFormError(null);
    try {
      const json = await postJson<TaskSessionProgress>('/api/task-sessions', { objective: goal });
      if (!json.success || !json.data) {
        setFormError(json.error ?? 'Failed to start task session');
        return;
      }
      setObjective('');
      setSelectedId(json.data.session.id);
      queryClient.setQueryData(['task-session', json.data.session.id], json.data);
      void refetchList();
    } catch {
      setFormError('Failed to reach the Task Session Engine.');
    } finally {
      setStarting(false);
    }
  }

  async function handleAction(action: 'confirm' | 'decline' | 'continue' | 'cancel') {
    if (!selectedId || acting) return;
    setActing(true);
    try {
      const url =
        action === 'continue'
          ? `/api/task-sessions/${selectedId}/continue`
          : action === 'cancel'
            ? `/api/task-sessions/${selectedId}/cancel`
            : `/api/task-sessions/${selectedId}/confirm`;
      const body = action === 'confirm' ? { confirm: true } : action === 'decline' ? { confirm: false } : undefined;
      const json = await postJson<TaskSessionProgress>(url, body);
      if (json.success && json.data) {
        queryClient.setQueryData(['task-session', selectedId], json.data);
      }
      void refetchList();
    } finally {
      setActing(false);
    }
  }

  const grouped = GROUPS.map((g) => ({ ...g, sessions: (sessions ?? []).filter((s) => g.status.includes(s.status)) }));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-4 text-primary" />
              New Task Session
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleStart} className="space-y-2">
              <input
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder='e.g. "Build a website for ACCD"'
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                disabled={starting}
              />
              <Button type="submit" className="w-full" disabled={starting || !objective.trim()}>
                {starting ? <Loader2 className="size-4 animate-spin" /> : 'Start Session'}
              </Button>
            </form>
            {formError && <p className="mt-2 text-xs text-knottix-error">{formError}</p>}
          </CardContent>
        </Card>

        {grouped.map((g) => (
          <div key={g.label} className="space-y-2">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">{g.label} ({g.sessions.length})</p>
            {g.sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">None</p>
            ) : (
              <div className="space-y-1.5">
                {g.sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${selectedId === s.id ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-border'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{s.objective}</p>
                      <Badge variant={STATUS_META[s.status].variant}>{STATUS_META[s.status].label}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(s.updatedAt)} · {s.artifacts.length} artifact{s.artifacts.length === 1 ? '' : 's'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        {!progress ? (
          <Card>
            <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select a session, or start a new one.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{progress.session.objective}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {progress.session.workflowExecutionIds.length} round{progress.session.workflowExecutionIds.length === 1 ? '' : 's'} · started {timeAgo(progress.session.startedAt)}
                  </p>
                </div>
                <Badge variant={STATUS_META[progress.session.status].variant}>{STATUS_META[progress.session.status].label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {(progress.currentSkillName || progress.currentEmployeeKey || progress.currentToolName) && (
                <div className="flex flex-wrap gap-3 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                  {progress.currentSkillName && <span className="flex items-center gap-1"><Wrench className="size-3" /> Skill: {progress.currentSkillName}</span>}
                  {progress.currentEmployeeKey && <span className="flex items-center gap-1"><Bot className="size-3" /> {progress.currentEmployeeKey}</span>}
                  {progress.estimatedRemainingMs !== null && <span>~{Math.max(1, Math.round(progress.estimatedRemainingMs / 1000))}s remaining (estimate)</span>}
                </div>
              )}

              {progress.session.lastError && (
                <p className="rounded-md border border-knottix-error/20 bg-knottix-error/5 px-3 py-2 text-xs text-knottix-error">{progress.session.lastError}</p>
              )}

              {progress.steps.length > 0 && (
                <ol className="space-y-2">
                  {progress.steps.map((s) => {
                    const Icon = STEP_ICON[s.status];
                    return (
                      <li key={s.id} className="flex items-start gap-2.5 rounded-md border border-border/60 px-3 py-2">
                        <Icon className={`mt-0.5 size-4 shrink-0 ${STEP_COLOR[s.status]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{s.name}</p>
                            {s.attempts > 1 && <span className="text-[11px] text-muted-foreground">{s.attempts} attempts</span>}
                          </div>
                          {s.summary && <p className="mt-0.5 text-xs text-muted-foreground">{s.summary}</p>}
                          {s.error && <p className="mt-0.5 text-xs text-knottix-error">{s.error}</p>}
                          {s.artifact && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                              <Package className="size-3" /> {s.artifact.type}: {s.artifact.value}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {progress.session.artifacts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">Artifacts Produced</p>
                  <div className="flex flex-wrap gap-1.5">
                    {progress.session.artifacts.map((a, i) => (
                      <Badge key={`${a.type}-${i}`} variant="outline">{a.type}: {a.value}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {progress.session.workingContext.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">Working Context ({progress.session.workingContext.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {progress.session.workingContext.slice(0, 10).map((c) => (
                      <Badge key={`${c.source}:${c.id}`} variant="outline" title={c.reasonSelected}>{c.source}: {c.title}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {progress.session.status === 'PAUSED' && (
                <div className="rounded-xl border border-knottix-warning/30 bg-knottix-warning/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-knottix-warning" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <p className="text-sm font-medium text-foreground">Confirmation required to continue</p>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={() => handleAction('confirm')} disabled={acting}>
                          {acting ? <Loader2 className="size-4 animate-spin" /> : 'Confirm & Continue'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleAction('decline')} disabled={acting}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-border/60 pt-3">
                {(progress.session.status === 'COMPLETED' || progress.session.status === 'BLOCKED' || progress.session.status === 'FAILED') && (
                  <Button type="button" size="sm" variant="outline" onClick={() => handleAction('continue')} disabled={acting}>
                    Continue Objective
                  </Button>
                )}
                {(progress.session.status === 'RUNNING' || progress.session.status === 'PAUSED') && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleAction('cancel')} disabled={acting}>
                    <X className="size-3.5" /> Cancel Session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
