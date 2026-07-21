'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Check, Copy, RotateCcw, User as UserIcon } from 'lucide-react';
import { Orb } from '@/components/hero/Orb';
import { MarkdownLite } from './MarkdownLite';
import type { DemoConversationTurn } from '@/lib/demo/conversations';

interface ConsoleEntry {
  id: string;
  input: string;
  status: 'pending' | 'streaming' | 'completed' | 'failed';
  content?: string;
  displayedContent?: string;
  error?: string;
  latencyMs?: number;
}

let entryCounter = 0;

function nextId(): string {
  entryCounter += 1;
  return `entry-${entryCounter}`;
}

function seedFromTranscript(transcript: DemoConversationTurn[]): ConsoleEntry[] {
  return transcript.map((turn) => ({
    id: nextId(),
    input: turn.input,
    status: 'completed',
    content: turn.content,
    displayedContent: turn.content,
    latencyMs: turn.latencyMs,
  }));
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(content);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-white/[0.04] hover:text-[var(--hero-ink-primary)]"
      style={{ color: 'var(--hero-ink-tertiary)' }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Assistant is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-dot-bounce rounded-full"
          style={{ animationDelay: `${i * 0.15}s`, background: 'var(--hero-cyan)' }}
        />
      ))}
    </div>
  );
}

export function AIConsole({
  agentKey,
  agentName,
  canExecute,
  emptyStateHint,
  demoMode = false,
  demoTranscript,
}: {
  agentKey: string;
  agentName: string;
  canExecute: boolean;
  emptyStateHint: string;
  demoMode?: boolean;
  demoTranscript?: DemoConversationTurn[];
}) {
  const [entries, setEntries] = useState<ConsoleEntry[]>(() =>
    demoMode && demoTranscript && demoTranscript.length > 0 ? seedFromTranscript(demoTranscript) : [],
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
  }

  function streamContent(id: string, content: string, latencyMs: number) {
    const words = content.split(' ');
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'streaming', content, displayedContent: '' } : e)));
    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      const displayedContent = words.slice(0, i).join(' ');
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, displayedContent } : e)));
      scrollToEnd();
      if (i >= words.length) {
        window.clearInterval(interval);
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'completed', latencyMs } : e)));
        setBusy(false);
      }
    }, 35);
  }

  async function submitDemo(id: string, question: string) {
    await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 500));
    const content = `**Demo Mode** — ${agentName} would ground a real answer to "${question}" in live organizational data. Try one of the seeded example conversations above for a realistic response.`;
    streamContent(id, content, Math.round(900 + Math.random() * 400));
    scrollToEnd();
  }

  function regenerate(entry: ConsoleEntry) {
    if (busy) return;
    setBusy(true);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'pending', content: undefined, displayedContent: undefined, error: undefined } : e)));
    void submitDemo(entry.id, entry.input);
  }

  async function submitLive(id: string, question: string) {
    try {
      const res = await fetch(`/api/agents/${agentKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: question }),
      });
      const json = await res.json();

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? json.success
              ? { ...e, status: 'completed', content: json.data.content, latencyMs: json.data.latencyMs }
              : { ...e, status: 'failed', error: json.error ?? 'Request failed' }
            : e,
        ),
      );
    } catch {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: 'Network error' } : e)));
    } finally {
      setBusy(false);
      scrollToEnd();
    }
  }

  function submit() {
    const question = input.trim();
    if (!question || busy) return;

    const id = nextId();
    setEntries((prev) => [...prev, { id, input: question, status: 'pending' }]);
    setInput('');
    setBusy(true);

    if (demoMode) {
      void submitDemo(id, question);
    } else {
      void submitLive(id, question);
    }
  }

  return (
    <div className="hero-panel flex min-h-0 flex-1 flex-col" style={{ borderRadius: 'var(--hero-radius-lg)' }}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Orb size="lg" state="idle" />
            <p className="max-w-xs text-sm" style={{ color: 'var(--hero-ink-secondary)' }}>{emptyStateHint}</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-3"
            >
              {/* User message */}
              <div className="flex items-start justify-end gap-2.5">
                <div
                  className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm hero-msg__body--user"
                  style={{ borderRadius: 'var(--hero-radius-md)' }}
                >
                  {entry.input}
                </div>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--hero-raised)', color: 'var(--hero-ink-tertiary)' }}>
                  <UserIcon className="size-3.5" />
                </div>
              </div>

              {/* Assistant response */}
              <div className="flex items-start gap-2.5">
                <div className="pt-0.5">
                  <Orb size="sm" state={entry.status === 'pending' || entry.status === 'streaming' ? 'thinking' : 'idle'} glow={false} />
                </div>
                <div className="max-w-[85%] flex-1">
                  {entry.status === 'pending' && (
                    <div className="hero-msg__body--ai inline-block rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ borderRadius: 'var(--hero-radius-md)' }}>
                      <TypingIndicator />
                    </div>
                  )}
                  {entry.status === 'streaming' && (
                    <div className="hero-msg__body--ai rounded-2xl rounded-tl-sm px-4 py-3" style={{ borderRadius: 'var(--hero-radius-md)' }}>
                      <MarkdownLite content={entry.displayedContent ?? ''} />
                    </div>
                  )}
                  {entry.status === 'completed' && (
                    <div className="hero-msg__body--ai rounded-2xl rounded-tl-sm px-4 py-3" style={{ borderRadius: 'var(--hero-radius-md)' }}>
                      <MarkdownLite content={entry.displayedContent ?? entry.content ?? ''} />
                      <div className="mt-2.5 flex items-center gap-2">
                        {entry.latencyMs !== undefined && (
                          <p className="text-[11px]" style={{ color: 'var(--hero-ink-tertiary)' }}>
                            {agentName} · {entry.latencyMs}ms
                          </p>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          <CopyButton content={entry.content ?? ''} />
                          {demoMode && (
                            <button
                              type="button"
                              onClick={() => regenerate(entry)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-white/[0.04] hover:text-[var(--hero-ink-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ color: 'var(--hero-ink-tertiary)' }}
                            >
                              <RotateCcw className="size-3" />
                              Regenerate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {entry.status === 'failed' && (
                    <div
                      className="rounded-2xl rounded-tl-sm px-4 py-2.5"
                      style={{ borderRadius: 'var(--hero-radius-md)', border: `1px solid var(--hero-signal-faint)`, background: 'var(--hero-signal-faint)' }}
                    >
                      <p className="text-sm" style={{ color: 'var(--hero-signal)' }}>{entry.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--hero-border-subtle)' }}>
        <div className="hero-chat-input-row" style={{ borderRadius: 999 }}>
          <input
            value={input}
            disabled={!canExecute}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder={canExecute ? `Message ${agentName}...` : 'You do not have permission to invoke agents'}
            className="flex-1 bg-transparent px-2 text-sm focus:outline-none disabled:cursor-not-allowed"
            style={{ color: 'var(--hero-ink-primary)' }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canExecute || busy || !input.trim()}
            className="hero-btn hero-btn--primary flex size-8 shrink-0 items-center justify-center rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
