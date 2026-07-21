import { cn } from '@/lib/utils';

export function StatChip({
  label,
  value,
  sub,
  tone = 'default',
  align = 'left',
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'ok' | 'signal';
  align?: 'left' | 'right';
}) {
  return (
    <div
      className="hero-panel"
      style={{ padding: 'var(--hero-space-3) var(--hero-space-4)', minWidth: 200, textAlign: align }}
    >
      <div className="hero-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div className="hero-font-display" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--hero-ink-primary)' }}>
        {value}
      </div>
      {sub && (
        <div
          className={cn('hero-font-mono')}
          style={{
            fontSize: 11,
            marginTop: 4,
            color: tone === 'ok' ? 'var(--hero-ok)' : tone === 'signal' ? 'var(--hero-signal)' : 'var(--hero-ink-secondary)',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
