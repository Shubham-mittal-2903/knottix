'use client';

import { useTransition } from 'react';
import { disconnectGitHubAccount } from './actions';
import { Button } from '@/components/ui/button';

export function DisconnectGitHubButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void disconnectGitHubAccount();
        });
      }}
    >
      {pending ? 'Disconnecting...' : 'Disconnect'}
    </Button>
  );
}
