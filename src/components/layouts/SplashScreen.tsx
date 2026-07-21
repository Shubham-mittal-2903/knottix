'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const STAGES = [
  { id: 'kernel', label: 'Kernel' },
  { id: 'runtime', label: 'AI Runtime' },
  { id: 'memory', label: 'Memory' },
  { id: 'mission-control', label: 'Mission Control' },
  { id: 'done', label: 'Done' },
] as const;

const STAGE_DURATION_MS = 420;
const SESSION_KEY = 'knottix-splash-shown';

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;

    setVisible(true);
    window.sessionStorage.setItem(SESSION_KEY, '1');

    const timers: number[] = [];
    STAGES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStageIndex(i), i * STAGE_DURATION_MS));
    });
    timers.push(window.setTimeout(() => setVisible(false), STAGES.length * STAGE_DURATION_MS + 350));

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="gradient-mesh fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex size-16 items-center justify-center rounded-2xl bg-primary/15"
          >
            <span className="absolute inset-0 -z-10 animate-glow-pulse rounded-2xl bg-primary/30 blur-xl" aria-hidden />
            <Logo size={40} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="mt-6 text-xl font-semibold tracking-tight text-foreground"
          >
            Knottix
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            Initializing Intelligence Platform...
          </motion.p>

          <div className="mt-8 w-64 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-1 rounded-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <ul className="mt-6 space-y-1.5">
            {STAGES.map((stage, i) => {
              const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending';
              return (
                <li key={stage.id} className="flex items-center gap-2 text-xs">
                  <span className="flex size-4 items-center justify-center">
                    {state === 'done' && <Check className="size-3.5 text-knottix-success" />}
                    {state === 'active' && <Loader2 className="size-3.5 animate-spin text-primary" />}
                    {state === 'pending' && <span className="size-1.5 rounded-full bg-muted-foreground/40" />}
                  </span>
                  <span
                    className={
                      state === 'pending' ? 'text-muted-foreground/50' : state === 'active' ? 'text-foreground' : 'text-muted-foreground'
                    }
                  >
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
