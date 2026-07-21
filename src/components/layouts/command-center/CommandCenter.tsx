'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, MicOff, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { staticCommands, type CommandAction, type NavItem } from '@/config/navigation';
import { OPEN_COMMAND_CENTER_EVENT } from '@/lib/command-center-events';
import { heuristicClassify, resolveNavigation } from '@/lib/command-center/router';
import type { CommandExecutionResult, CommandPlan } from '@/lib/command-center/types';
import { useCommandCenterStore } from '@/stores/command-center-store';
import { Orb } from '@/components/hero/Orb';
import { IntentBadge } from './IntentBadge';
import { CommandIdleView } from './CommandIdleView';
import { CommandConfirmCard } from './CommandConfirmCard';
import { CommandResultView } from './CommandResultView';
import { EXAMPLE_COMMANDS } from './constants';
import { useVoiceMode, speakResult } from './useVoiceMode';
import { cn } from '@/lib/utils';

type ViewState = 'idle' | 'loading' | 'confirm' | 'result';

const FAILED_RESULT_FALLBACK = (message: string): CommandExecutionResult => ({
  status: 'failed',
  message,
  demo: false,
  stepResults: [],
  conversationReply: null,
  latencyMs: 0,
  suggestions: [],
});

export function CommandCenter({
  isFounder,
  navItems,
  open,
  onOpenChange,
}: {
  isFounder: boolean;
  navItems: NavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [view, setView] = useState<ViewState>('idle');
  const [plan, setPlan] = useState<CommandPlan | null>(null);
  const [result, setResult] = useState<CommandExecutionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingPrefillRef = useRef<string | null>(null);
  const wasVoiceRef = useRef(false);
  const router = useRouter();
  const { recent, favorites, addRecent, toggleFavorite, isFavorite } = useCommandCenterStore();

  const availableCommands = useMemo(() => staticCommands.filter((c) => (isFounder ? true : !c.founderOnly)), [isFounder]);

  const liveIntent = useMemo(
    () => (query.trim() && view === 'idle' ? heuristicClassify(query, navItems, availableCommands) : null),
    [query, navItems, availableCommands, view],
  );

  const navSuggestions = useMemo<CommandAction[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return availableCommands
      .filter((c) => [c.label, ...(c.keywords ?? [])].join(' ').toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, availableCommands]);

  useEffect(() => {
    if (query) return;
    const interval = window.setInterval(() => setPlaceholderIndex((i) => (i + 1) % EXAMPLE_COMMANDS.length), 2800);
    return () => window.clearInterval(interval);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    function onOpenRequest(e: Event) {
      const prefill = (e as CustomEvent<{ query?: string }>).detail?.query;
      if (prefill) pendingPrefillRef.current = prefill;
      onOpenChange(true);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_COMMAND_CENTER_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_COMMAND_CENTER_EVENT, onOpenRequest);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery(pendingPrefillRef.current ?? '');
      pendingPrefillRef.current = null;
      setView('idle');
      setPlan(null);
      setResult(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function resetToIdle() {
    setView('idle');
    setPlan(null);
    setResult(null);
  }

  function startNewCommand() {
    setQuery('');
    resetToIdle();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectExample(text: string) {
    setQuery(text);
    resetToIdle();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function runNavSuggestion(action: CommandAction) {
    if (!action.href) return;
    addRecent({ text: action.label, intent: 'navigation' });
    onOpenChange(false);
    router.push(action.href as Route);
  }

  function finishWithResult(nextResult: CommandExecutionResult) {
    setResult(nextResult);
    setView('result');
    if (wasVoiceRef.current) {
      wasVoiceRef.current = false;
      void speakResult(nextResult.conversationReply ?? nextResult.message);
    }
  }

  async function submit(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    const nav = resolveNavigation(q, navItems, availableCommands);
    if (nav) {
      addRecent({ text: q, intent: 'navigation' });
      onOpenChange(false);
      router.push(nav.href as Route);
      return;
    }

    setView('loading');
    try {
      const res = await fetch('/api/command-center', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();

      if (!json.success) {
        setPlan(heuristicClassify(q, navItems, availableCommands));
        finishWithResult(FAILED_RESULT_FALLBACK(json.error ?? 'Something went wrong.'));
        return;
      }

      addRecent({ text: q, intent: json.data.plan.intent });
      setPlan(json.data.plan);

      if (json.data.result) {
        finishWithResult(json.data.result);
      } else {
        setView('confirm');
      }
    } catch {
      setPlan(heuristicClassify(q, navItems, availableCommands));
      finishWithResult(FAILED_RESULT_FALLBACK('Network error — try again.'));
    }
  }

  async function confirmExecute() {
    if (!plan) return;
    setView('loading');
    try {
      const res = await fetch('/api/command-center', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: plan.query, confirm: true }),
      });
      const json = await res.json();
      finishWithResult(json.data?.result ?? FAILED_RESULT_FALLBACK(json.error ?? 'Execution failed.'));
    } catch {
      finishWithResult(FAILED_RESULT_FALLBACK('Network error — try again.'));
    }
  }

  const { listening, toggleListening } = useVoiceMode((command) => {
    wasVoiceRef.current = true;
    onOpenChange(true);
    void submit(command);
  });

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || view !== 'idle') return;
    e.preventDefault();
    submit();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup className="hero-scope hero-cmd-panel fixed inset-x-4 top-[6%] bottom-[6%] z-[100] mx-auto flex max-w-2xl flex-col overflow-hidden rounded-3xl transition-[transform,opacity] duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:translate-y-3 data-[starting-style]:opacity-0 sm:inset-x-auto sm:top-[8%] sm:bottom-auto sm:h-[min(640px,80vh)] sm:w-full">
          <DialogPrimitive.Title className="sr-only">Command Center</DialogPrimitive.Title>

          <div className="hero-cmd-input-row relative">
            <Orb size="sm" state={view === 'loading' ? 'thinking' : 'idle'} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (view !== 'idle') resetToIdle();
              }}
              onKeyDown={onInputKeyDown}
              placeholder={query ? undefined : EXAMPLE_COMMANDS[placeholderIndex]}
              disabled={view === 'loading'}
              className="hero-cmd-input sm:text-lg"
            />
            {liveIntent && <IntentBadge intent={liveIntent.intent} className="hidden sm:flex" />}
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                listening ? 'text-[var(--hero-signal)]' : 'hover:bg-white/[0.04]',
              )}
              style={{ color: listening ? undefined : 'var(--hero-ink-tertiary)' }}
              aria-label={listening ? 'Stop listening for "Hey Knottix"' : 'Listen for "Hey Knottix"'}
              title={listening ? 'Listening for "Hey Knottix"...' : 'Voice mode'}
            >
              {listening ? <Mic className="size-4 animate-pulse" /> : <MicOff className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/[0.04]"
              style={{ color: 'var(--hero-ink-tertiary)' }}
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
            {view === 'idle' && (
              <CommandIdleView
                query={query}
                navSuggestions={navSuggestions}
                recent={recent}
                favorites={favorites}
                onRunNavSuggestion={runNavSuggestion}
                onSelectExample={selectExample}
              />
            )}

            {view === 'loading' && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm" style={{ color: 'var(--hero-ink-secondary)' }}>
                <Loader2 className="size-5 animate-spin" style={{ color: 'var(--hero-cyan)' }} />
                Thinking...
              </div>
            )}

            {view === 'confirm' && plan && <CommandConfirmCard plan={plan} onExecute={confirmExecute} onCancel={startNewCommand} />}

            {view === 'result' && plan && result && (
              <CommandResultView
                plan={plan}
                result={result}
                isFavorite={isFavorite(plan.query)}
                onToggleFavorite={() => toggleFavorite({ text: plan.query, intent: plan.intent })}
                onSuggestion={(label) => selectExample(label)}
                onNewCommand={startNewCommand}
              />
            )}
          </div>

          <div className="hero-cmd-foot sm:px-7">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="hero-kbd">↵</span>
                run
              </span>
              <span className="flex items-center gap-1">
                <span className="hero-kbd">ESC</span>
                close
              </span>
            </div>
            <span style={{ color: 'var(--hero-ink-tertiary)' }}>Knottix Command Center</span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
