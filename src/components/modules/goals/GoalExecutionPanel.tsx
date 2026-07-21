'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GoalExecutionSummary, GoalStepSummary } from '@/lib/goal-engine';

interface ApiResponse {
  success: boolean;
  data?: GoalExecutionSummary;
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<ApiResponse> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return (await res.json()) as ApiResponse;
}

const RUNNING_STATUSES = new Set(['PENDING', 'RUNNING']);

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

function statusBadge(status: GoalExecutionSummary['status']) {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'FAILED':
      return <Badge variant="error">Failed</Badge>;
    case 'WAITING_CONFIRMATION':
      return <Badge variant="warning">Waiting for confirmation</Badge>;
    case 'RUNNING':
      return <Badge variant="accent">Running</Badge>;
    case 'UNSUPPORTED':
      return <Badge variant="outline">Unsupported</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

/** Honest, not precise: derived from the average real duration of steps completed so far ×
 *  remaining step count. Never shown when fewer than one step has finished (nothing to average). */
function estimateRemainingMs(summary: GoalExecutionSummary): number | null {
  const finished = summary.steps.filter((s) => s.completedAt !== null);
  if (finished.length === 0) return null;
  const avgMs = finished.reduce((sum, s) => sum + (s.completedAt! - s.startedAt), 0) / finished.length;
  const remaining = summary.totalSteps - summary.steps.length;
  if (remaining <= 0) return null;
  return Math.round(avgMs * remaining);
}

export function GoalExecutionPanel({ initialGoal }: { initialGoal?: string } = {}) {
  const queryClient = useQueryClient();
  const [goalInput, setGoalInput] = useState(initialGoal ?? '');
  const [summary, setSummary] = useState<GoalExecutionSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const executionId = summary?.executionId ?? null;

  const { data: polled } = useQuery({
    queryKey: ['goal-execution', executionId],
    queryFn: async () => {
      const res = await fetch(`/api/goals/${executionId}`);
      const json = (await res.json()) as ApiResponse;
      if (!json.success || !json.data) throw new Error(json.error ?? 'Failed to load goal status');
      return json.data;
    },
    enabled: Boolean(executionId),
    initialData: summary ?? undefined,
    refetchInterval: (query) => (RUNNING_STATUSES.has(query.state.data?.status ?? '') ? 1500 : false),
  });

  const current = polled ?? summary;

  async function startGoal(goal: string) {
    if (!goal || starting) return;

    setStarting(true);
    setFormError(null);
    try {
      const json = await postJson('/api/goals', { goal });
      if (!json.success || !json.data) {
        setFormError(json.error ?? 'Failed to start goal');
        return;
      }
      setSummary(json.data);
      setGoalInput('');
    } catch {
      setFormError('Failed to reach the Goal Execution Engine.');
    } finally {
      setStarting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void startGoal(goalInput.trim());
  }

  useEffect(() => {
    if (initialGoal && !autoStarted.current) {
      autoStarted.current = true;
      void startGoal(initialGoal.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGoal]);

  async function handleConfirm(confirm: boolean) {
    if (!executionId || confirming) return;
    setConfirming(true);
    try {
      const json = await postJson(`/api/goals/${executionId}/confirm`, { confirm });
      if (json.success && json.data) {
        setSummary(json.data);
        queryClient.setQueryData(['goal-execution', executionId], json.data);
      }
    } finally {
      setConfirming(false);
    }
  }

  const pausedStep = current?.steps.find((s) => s.status === 'waiting_confirmation') ?? null;
  const remainingMs = current && current.status === 'RUNNING' ? estimateRemainingMs(current) : null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" />
            Give Knottix a goal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder='e.g. "Deploy my project at C:\path\to\project" or "Write a blog about our latest release"'
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              disabled={starting}
            />
            <Button type="submit" disabled={starting || !goalInput.trim()}>
              {starting ? <Loader2 className="size-4 animate-spin" /> : 'Execute Goal'}
            </Button>
          </form>
          {formError && <p className="mt-2 text-xs text-knottix-error">{formError}</p>}
        </CardContent>
      </Card>

      {current && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">{current.goal}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{current.templateName}</p>
              </div>
              {statusBadge(current.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {current.demo && (
              <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                Demo Mode — every step below is simulated. Nothing was actually executed.
              </p>
            )}

            {current.status === 'UNSUPPORTED' && (
              <p className="rounded-md border border-knottix-warning/30 bg-knottix-warning/5 px-3 py-2 text-sm text-foreground">
                {current.message}
              </p>
            )}

            {current.steps.length > 0 && (
              <ol className="space-y-2">
                {current.steps.map((s) => {
                  const Icon = STEP_ICON[s.status];
                  return (
                    <li key={s.id} className="flex items-start gap-2.5 rounded-md border border-border/60 px-3 py-2">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${STEP_COLOR[s.status]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{s.name}</p>
                          {s.attempts > 1 && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Wrench className="size-3" />
                              {s.attempts} attempts
                            </span>
                          )}
                        </div>
                        {s.summary && <p className="mt-0.5 text-xs text-muted-foreground">{s.summary}</p>}
                        {s.error && <p className="mt-0.5 text-xs text-knottix-error">{s.error}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {current.status === 'RUNNING' && current.currentStepId && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Current step: {current.steps.find((s) => s.id === current.currentStepId)?.name ?? current.currentStepId}
                {remainingMs !== null && ` — roughly ${Math.max(1, Math.round(remainingMs / 1000))}s remaining (estimate)`}
              </p>
            )}

            {current.error && current.status === 'FAILED' && (
              <p className="text-sm text-knottix-error">{current.error}</p>
            )}

            {pausedStep && (
              <div className="rounded-xl border border-knottix-warning/30 bg-knottix-warning/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-knottix-warning" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Confirmation required</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pausedStep.error ?? `"${pausedStep.name}" needs your confirmation before it runs.`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" onClick={() => handleConfirm(true)} disabled={confirming}>
                        {confirming ? <Loader2 className="size-4 animate-spin" /> : 'Confirm & Continue'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => handleConfirm(false)} disabled={confirming}>
                        Decline & Stop
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {current.status === 'COMPLETED' && (
              <p className="flex items-center gap-2 text-sm text-knottix-success">
                <Bot className="size-4" />
                Goal complete — {current.steps.length} of {current.totalSteps} steps ran.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
