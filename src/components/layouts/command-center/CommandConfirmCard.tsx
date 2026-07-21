import { AlertTriangle, Bot, Tag, Wrench } from 'lucide-react';
import type { CommandPlan } from '@/lib/command-center/types';
import { IntentBadge } from './IntentBadge';

export function CommandConfirmCard({
  plan,
  onExecute,
  onCancel,
}: {
  plan: CommandPlan;
  onExecute: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-1 rounded-xl border p-5" style={{ borderColor: 'var(--hero-warn-faint)', background: 'var(--hero-warn-faint)' }}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(255,176,32,0.15)', color: 'var(--hero-warn)' }}>
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--hero-ink-primary)' }}>This command will modify data</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>Review what will run before confirming.</p>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <dt className="w-32 shrink-0 text-xs" style={{ color: 'var(--hero-ink-tertiary)' }}>Detected intent</dt>
              <dd>
                <IntentBadge intent={plan.intent} />
              </dd>
            </div>
            {plan.employeeName && (
              <div className="flex items-center gap-2.5">
                <dt className="flex w-32 shrink-0 items-center gap-1.5 text-xs" style={{ color: 'var(--hero-ink-tertiary)' }}>
                  <Bot className="size-3" />
                  AI Employee
                </dt>
                <dd style={{ color: 'var(--hero-ink-primary)' }}>{plan.employeeName}</dd>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <dt className="flex w-32 shrink-0 items-center gap-1.5 text-xs" style={{ color: 'var(--hero-ink-tertiary)' }}>
                <Wrench className="size-3" />
                Tools to execute
              </dt>
              <dd style={{ color: 'var(--hero-ink-primary)' }}>{plan.steps.length > 0 ? plan.steps.map((s) => s.label).join(', ') : 'None registered yet'}</dd>
            </div>
            {plan.affectedResources.length > 0 && (
              <div className="flex items-center gap-2.5">
                <dt className="flex w-32 shrink-0 items-center gap-1.5 text-xs" style={{ color: 'var(--hero-ink-tertiary)' }}>
                  <Tag className="size-3" />
                  Affected resources
                </dt>
                <dd style={{ color: 'var(--hero-ink-primary)' }}>{plan.affectedResources.join(', ')}</dd>
              </div>
            )}
          </dl>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" className="hero-btn hero-btn--primary" onClick={onExecute}>
              Execute
            </button>
            <button type="button" className="hero-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
