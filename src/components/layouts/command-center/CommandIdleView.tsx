import { Clock, CornerDownLeft, Star } from 'lucide-react';
import type { CommandAction } from '@/config/navigation';
import type { CommandHistoryEntry } from '@/stores/command-center-store';
import { EXAMPLE_COMMANDS } from './constants';
import { cn } from '@/lib/utils';

function HistoryChip({ entry, onSelect }: { entry: CommandHistoryEntry; onSelect: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.text)}
      className="flex items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[rgba(11,15,30,0.4)] px-3 py-1.5 text-xs text-[var(--hero-ink-secondary)] transition-colors hover:border-[var(--hero-cyan-deep)] hover:text-[var(--hero-ink-primary)]"
    >
      {entry.text}
    </button>
  );
}

export function CommandIdleView({
  query,
  navSuggestions,
  recent,
  favorites,
  onRunNavSuggestion,
  onSelectExample,
}: {
  query: string;
  navSuggestions: CommandAction[];
  recent: CommandHistoryEntry[];
  favorites: CommandHistoryEntry[];
  onRunNavSuggestion: (action: CommandAction) => void;
  onSelectExample: (text: string) => void;
}) {
  if (query.trim()) {
    return (
      <div className="space-y-1">
        {navSuggestions.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm" style={{ color: 'var(--hero-ink-secondary)' }}>
            Press <span className="hero-kbd">Enter</span> to run this command.
          </p>
        ) : (
          navSuggestions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onRunNavSuggestion(action)}
                className="hero-cmd-row group"
                style={{ color: 'var(--hero-ink-secondary)' }}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--hero-raised)', color: 'var(--hero-ink-tertiary)' }}>
                  <Icon className="size-3.5" />
                </span>
                <span className="truncate">{action.label}</span>
                <CornerDownLeft className="ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--hero-cyan)' }} />
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1 py-2">
      {favorites.length > 0 && (
        <div>
          <p className="hero-cmd-section-label mb-1 flex items-center gap-1.5">
            <Star className="size-3" />
            Favorite Commands
          </p>
          <div className="flex flex-wrap gap-2 px-2">
            {favorites.map((f) => (
              <HistoryChip key={f.id} entry={f} onSelect={onSelectExample} />
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <p className="hero-cmd-section-label mb-1 flex items-center gap-1.5">
            <Clock className="size-3" />
            Recent Commands
          </p>
          <div className="flex flex-wrap gap-2 px-2">
            {recent.map((r) => (
              <HistoryChip key={r.id} entry={r} onSelect={onSelectExample} />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="hero-cmd-section-label mb-1">Try asking</p>
        <div className="grid grid-cols-1 gap-1.5 px-2 sm:grid-cols-2">
          {EXAMPLE_COMMANDS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectExample(example)}
              className={cn(
                'group flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors hover:border-[var(--hero-cyan-deep)] hover:text-[var(--hero-ink-primary)]',
              )}
              style={{ borderColor: 'var(--hero-border-subtle)', background: 'rgba(11,15,30,0.35)', color: 'var(--hero-ink-secondary)' }}
            >
              <span className="truncate">{example}</span>
              <CornerDownLeft className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" style={{ color: 'var(--hero-cyan)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
