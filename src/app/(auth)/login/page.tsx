import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { isDemoMode } from '@/lib/demo';
import { Logo } from '@/components/brand/Logo';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  const demoMode = isDemoMode();

  return (
    <div className="glass fade-in-up relative z-10 w-full max-w-sm space-y-6 rounded-2xl p-8 shadow-2xl">
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/15">
          <span className="absolute inset-0 -z-10 animate-glow-pulse rounded-2xl bg-primary/30 blur-lg" aria-hidden />
          <Logo size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Knottix</h1>
          <p className="text-sm text-muted-foreground">Sign in to the Intelligence Platform</p>
        </div>
      </div>
      <LoginForm />
      {demoMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-wide text-muted-foreground/60 uppercase">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Link
            href="/command"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/15 hover:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
          >
            <Sparkles className="size-4" />
            Continue in Demo Mode
          </Link>
        </div>
      )}
    </div>
  );
}
