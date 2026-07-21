'use client';

import { Clock, Star, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCommandCenterStore } from '@/stores/command-center-store';
import { OPEN_COMMAND_CENTER_EVENT } from '@/lib/command-center-events';
import { INTENT_META } from '@/components/layouts/command-center/constants';

function openWithQuery(query?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_CENTER_EVENT, { detail: query ? { query } : undefined }));
}

export function CommandHistoryWidget() {
  const recent = useCommandCenterStore((s) => s.recent);
  const favorites = useCommandCenterStore((s) => s.favorites);

  const hasHistory = recent.length > 0 || favorites.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          Command Center
        </CardTitle>
        <button type="button" onClick={() => openWithQuery()} className="text-xs text-primary hover:underline">
          Open ⌘K
        </button>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {!hasHistory ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No commands run yet — press <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘K</kbd> to try one.
          </p>
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                  <Star className="size-3" />
                  Favorite Commands
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {favorites.map((f) => {
                    const Icon = INTENT_META[f.intent].icon;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => openWithQuery(f.text)}
                        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <Icon className="size-3" />
                        {f.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recent.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                  <Clock className="size-3" />
                  Recent Commands
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.slice(0, 5).map((r) => {
                    const Icon = INTENT_META[r.intent].icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openWithQuery(r.text)}
                        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <Icon className="size-3" />
                        {r.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
