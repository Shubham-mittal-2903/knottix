import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Sparkles, Wrench } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { AI_EMPLOYEES } from '@/config/ai-employees';
import { isDemoMode, DEMO_AI_RECENT_ACTIVITY } from '@/lib/demo';
import { Orb } from '@/components/hero/Orb';

export const metadata: Metadata = { title: 'AI Directory' };

export default async function AIDirectoryPage() {
  const user = await requirePermission('agents:read');
  const canExecute = user.isFounder || user.permissions.includes('agents:execute');
  const demo = isDemoMode();

  return (
    <div className="hero-scope space-y-6">
      <div>
        <p className="hero-eyebrow">AI Directory</p>
        <h1 className="hero-font-display mt-2" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--hero-ink-primary)' }}>
          Your staff, always at their desks.
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--hero-ink-secondary)' }}>
          Purpose-built AI Employees, grounded only in real organizational data — no fabricated business logic.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AI_EMPLOYEES.map((employee) => (
          <Link
            key={employee.key}
            href={(canExecute ? `/agents/${employee.key}` : '/unauthorized') as Route}
            className="hero-ai-card flex flex-col"
          >
            <div className="mb-4 flex items-center gap-4">
              <Orb size="md" state="idle" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="hero-dot hero-dot--idle" />
                  <span className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-ink-tertiary)' }}>
                    idle
                  </span>
                </div>
                <p className="hero-font-display truncate" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--hero-ink-primary)' }}>
                  {employee.name}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--hero-ink-secondary)' }}>{employee.role}</p>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--hero-ink-secondary)' }}>{employee.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {employee.responsibilities.slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="rounded-md border px-2 py-0.5 text-xs"
                  style={{ borderColor: 'var(--hero-border)', color: 'var(--hero-ink-secondary)' }}
                >
                  {r}
                </span>
              ))}
              {employee.responsibilities.length > 3 && (
                <span className="rounded-md border px-2 py-0.5 text-xs" style={{ borderColor: 'var(--hero-border)', color: 'var(--hero-ink-secondary)' }}>
                  +{employee.responsibilities.length - 3} more
                </span>
              )}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-3 mt-4 text-xs" style={{ borderColor: 'var(--hero-border-subtle)' }}>
              <div className="flex items-center gap-1.5" style={{ color: 'var(--hero-ink-tertiary)' }}>
                <Wrench className="size-3" />
                <span>{employee.accessibleTools.length} tools</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: 'var(--hero-ink-tertiary)' }}>
                <Sparkles className="size-3" />
                <span className="truncate">{employee.recommendedModel.split(' — ')[0]}</span>
              </div>
            </div>

            {demo && DEMO_AI_RECENT_ACTIVITY[employee.key] && (
              <p className="mt-3 line-clamp-1 text-xs italic" style={{ color: 'var(--hero-ink-tertiary)' }}>
                {DEMO_AI_RECENT_ACTIVITY[employee.key]}
              </p>
            )}

            <div className="hero-btn hero-btn--primary mt-4 justify-center">
              Start conversation
              <ArrowUpRight className="size-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
