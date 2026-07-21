import { ArrowRight, Bot, CheckCircle2, Clock3, Sparkles, Star, Wrench, XCircle } from 'lucide-react';
import type { CommandExecutionResult, CommandPlan } from '@/lib/command-center/types';
import { Badge } from '@/components/ui/badge';
import { MarkdownLite } from '@/components/modules/ai/MarkdownLite';
import { IntentBadge } from './IntentBadge';
import { cn } from '@/lib/utils';

const STATUS_ICON = { completed: CheckCircle2, failed: XCircle, unavailable: XCircle } as const;
const STATUS_COLOR = {
  completed: 'var(--hero-ok)',
  failed: 'var(--hero-signal)',
  unavailable: 'var(--hero-ink-tertiary)',
} as const;

export function CommandResultView({
  plan,
  result,
  isFavorite,
  onToggleFavorite,
  onSuggestion,
  onNewCommand,
}: {
  plan: CommandPlan;
  result: CommandExecutionResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSuggestion: (label: string) => void;
  onNewCommand: () => void;
}) {
  const StatusIcon = STATUS_ICON[result.status];

  return (
    <div className="mx-1 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--hero-raised)', color: STATUS_COLOR[result.status] }}>
            <StatusIcon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--hero-ink-primary)' }}>{result.message}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>&ldquo;{plan.query}&rdquo;</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
          style={{ color: isFavorite ? 'var(--hero-warn)' : 'var(--hero-ink-tertiary)' }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={cn('size-4', isFavorite && 'fill-current')} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <IntentBadge intent={plan.intent} />
        {result.demo && <Badge variant="accent">Demo Mode</Badge>}
        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--hero-ink-tertiary)' }}>
          <Clock3 className="size-3" />
          {result.latencyMs}ms
        </span>
        {plan.employeeName && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--hero-ink-tertiary)' }}>
            <Bot className="size-3" />
            {plan.employeeName}
          </span>
        )}
      </div>

      {result.conversationReply && (
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--hero-border-subtle)', background: 'rgba(11,15,30,0.5)' }}>
          <MarkdownLite content={result.conversationReply} />
        </div>
      )}

      {result.stepResults.length > 0 && (
        <div className="space-y-2">
          <p className="hero-cmd-section-label flex items-center gap-1.5">
            <Wrench className="size-3" />
            Tools executed
          </p>
          {result.stepResults.map((step) => (
            <div key={step.toolName} className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--hero-border-subtle)' }}>
              {step.success ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--hero-ok)' }} />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--hero-signal)' }} />
              )}
              <div className="min-w-0">
                <p style={{ color: 'var(--hero-ink-primary)' }}>{step.label}</p>
                <p className="text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>{step.error ?? step.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--hero-border-subtle)' }}>
          <p className="hero-cmd-section-label flex items-center gap-1.5">
            <Sparkles className="size-3" />
            Next suggested actions
          </p>
          <div className="flex flex-wrap gap-2">
            {result.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="group flex items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[rgba(11,15,30,0.4)] px-3 py-1.5 text-xs text-[var(--hero-ink-secondary)] transition-colors hover:border-[var(--hero-cyan-deep)] hover:text-[var(--hero-ink-primary)]"
              >
                {s}
                <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={onNewCommand} className="text-xs hover:underline" style={{ color: 'var(--hero-cyan)' }}>
        Ask something else
      </button>
    </div>
  );
}
