import { cn } from '@/lib/utils';

export type LedgerStatus = 'active' | 'done' | 'attention' | 'blocked';

export interface LedgerEntryData {
  id: string;
  /** Already-formatted display time (e.g. "09:14" or "2h ago") — this component never formats
   *  dates itself, so it never drifts from whatever time convention the caller's screen uses. */
  timeLabel: string;
  /** Omit entirely when the real data has no resolved actor name — never fabricate one. */
  actor?: string;
  actorType?: 'ai' | 'human' | 'system';
  verb: string;
  object: string;
  status: LedgerStatus;
}

/**
 * The append-only activity feed from the knottix-proto design system — ported from
 * `.hero-ledger*` classes. Purely presentational: it renders whatever real entries it's given
 * (there is no persistence, ordering, or "immutability" logic here — that's the caller's real
 * data source's job, e.g. the Activity Log's own audit trail). `variant="rail"` renders the
 * fixed-width right-side ambient stream used on Mission Control; the default renders inline,
 * full-width, for use inside an AI Employee Detail panel.
 */
export function Ledger({
  entries,
  title = 'Ledger',
  variant = 'inline',
  className,
}: {
  entries: LedgerEntryData[];
  title?: string;
  variant?: 'inline' | 'rail';
  className?: string;
}) {
  return (
    <div className={cn('hero-ledger', variant === 'rail' && 'hero-ledger--rail', className)}>
      <div className="hero-ledger__head">
        <div className="hero-ledger__head-left">
          <span className="hero-eyebrow">{title}</span>
          {entries.length > 0 && <span className="hero-ledger__live" />}
        </div>
      </div>
      <div className="hero-ledger__body">
        {entries.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs" style={{ color: 'var(--hero-ink-tertiary)' }}>
            Nothing recorded yet.
          </p>
        ) : (
          entries.map((e) => <LedgerRow key={e.id} entry={e} />)
        )}
      </div>
      <div className="hero-ledger__foot">Immutable · nothing here can be edited or deleted, only appended</div>
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntryData }) {
  return (
    <div className="hero-ledger-entry">
      <span className="hero-ledger-entry__time">{entry.timeLabel}</span>
      {entry.actor && (
        <span className={cn('hero-ledger-entry__actor', entry.actorType === 'ai' ? 'hero-ledger-entry__actor--ai' : 'hero-ledger-entry__actor--human')}>
          {entry.actorType === 'ai' ? `↳ ${entry.actor}` : entry.actor}
        </span>
      )}
      <span className="hero-ledger-entry__verb">{entry.verb}</span>
      <span className="hero-ledger-entry__object">{entry.object}</span>
      <span className="hero-ledger-entry__status">
        <span className={cn('hero-dot', `hero-dot--${entry.status}`)} />
        {entry.status}
      </span>
    </div>
  );
}
