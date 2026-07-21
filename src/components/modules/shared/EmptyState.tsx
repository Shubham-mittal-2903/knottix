'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 py-20 text-center"
    >
      <div className="relative flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <span className="absolute inset-0 -z-10 animate-glow-pulse rounded-xl bg-primary/10 blur-md" aria-hidden />
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
