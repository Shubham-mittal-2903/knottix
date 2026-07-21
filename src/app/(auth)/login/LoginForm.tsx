'use client';

import { useActionState, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { login, type LoginState } from './actions';
import { Button } from '@/components/ui/button';

const initialState: LoginState = { error: '' };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="flex h-9 w-full rounded-md border border-input bg-background/60 px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground transition-shadow duration-200 focus:border-primary/40 focus:outline-none focus:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
          placeholder="you@company.com"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Forgot password?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="flex h-9 w-full rounded-md border border-input bg-background/60 px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground transition-shadow duration-200 focus:border-primary/40 focus:outline-none focus:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
          placeholder="••••••••"
        />
      </div>

      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="rounded-md border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              Password reset isn&apos;t available yet — contact your workspace admin to have your password reset.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <label htmlFor="remember" className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          defaultChecked
          className="size-3.5 rounded border-input accent-primary"
        />
        Remember me
      </label>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
