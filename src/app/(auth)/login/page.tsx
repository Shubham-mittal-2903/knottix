import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { isDemoMode } from '@/lib/demo';
import { Logo } from '@/components/brand/Logo';
import { LoginForm } from './LoginForm';
import { loginWithGoogle } from './actions';

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  const demoMode = isDemoMode();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

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
      {(googleEnabled || demoMode) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-wide text-muted-foreground/60 uppercase">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          {googleEnabled && (
            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-border/80 hover:bg-secondary/40"
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.27a12 12 0 0 0 0 10.78l4-3.12Z" />
                  <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.12C6.22 6.86 8.87 4.75 12 4.75Z" />
                </svg>
                Sign in with Google
              </button>
            </form>
          )}
          {demoMode && (
            <Link
              href="/command"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/15 hover:shadow-[0_0_0_3px_var(--knottix-accent-glow)]"
            >
              <Sparkles className="size-4" />
              Continue in Demo Mode
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
