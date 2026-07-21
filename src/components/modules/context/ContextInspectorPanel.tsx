'use client';

import { useState } from 'react';
import { Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ContextCollectionResult, ContextItem } from '@/lib/context-engine';

interface ApiResponse {
  success: boolean;
  data?: ContextCollectionResult;
  error?: string;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded bg-secondary/40 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
      {label} {value.toFixed(2)}
    </span>
  );
}

function ItemRow({ item, ok }: { item: ContextItem; ok: boolean }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-start gap-2.5 rounded-md border border-border/60 px-3 py-2">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? 'text-knottix-success' : 'text-muted-foreground'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{item.source}</Badge>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.summary}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <ScorePill label="total" value={item.totalScore} />
          <ScorePill label="relevance" value={item.relevanceScore} />
          <ScorePill label="freshness" value={item.freshnessScore} />
          <ScorePill label="trust" value={item.trustScore} />
        </div>
        <p className="mt-1 text-[11px] text-primary">{item.reasonSelected}</p>
      </div>
    </li>
  );
}

export function ContextInspectorPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContextCollectionResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/context', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) });
      const json = (await res.json()) as ApiResponse;
      if (!json.success || !json.data) {
        setError(json.error ?? 'Failed to collect context');
        return;
      }
      setResult(json.data);
    } catch {
      setError('Failed to reach the Context Engine.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            Inspect Context for a Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "Continue ACCD" or "What do you know about ACCD?"'
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Inspect'}
            </Button>
          </form>
          {error && <p className="mt-2 text-xs text-knottix-error">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Context Sources</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {result.sourcesQueried.map((s) => (
                  <Badge key={s.source} variant={s.itemCount > 0 ? 'accent' : 'outline'}>
                    {s.source}: {s.itemCount}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Context ({result.selected.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {result.selected.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing selected — no real context matched this query above the relevance floor.</p>
              ) : (
                <ol className="space-y-2">
                  {result.selected.map((item) => (
                    <ItemRow key={`${item.source}:${item.id}`} item={item} ok />
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {result.rejected.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rejected Context ({result.rejected.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2">
                  {result.rejected.slice(0, 20).map((item) => (
                    <ItemRow key={`${item.source}:${item.id}`} item={item} ok={false} />
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
