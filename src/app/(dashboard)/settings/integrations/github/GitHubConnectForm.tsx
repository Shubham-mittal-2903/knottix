'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { connectGitHubAccount, type GitHubConnectState } from './actions';
import { Button } from '@/components/ui/button';

const initialState: GitHubConnectState = { error: '' };

export function GitHubConnectForm() {
  const [state, formAction, pending] = useActionState(connectGitHubAccount, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="token" className="text-sm font-medium text-foreground">
          Personal access token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoComplete="off"
          placeholder="ghp_..."
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Needs `repo` read scope. Stored encrypted (AES-256-GCM) — never shown again after connecting.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Connecting...
          </span>
        ) : (
          'Connect GitHub'
        )}
      </Button>
    </form>
  );
}
