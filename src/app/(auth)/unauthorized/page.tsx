import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unauthorized',
};

export default function UnauthorizedPage() {
  return (
    <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Access Denied</h1>
      <p className="text-sm text-muted-foreground">
        You do not have permission to access this resource.
      </p>
      <Link
        href="/command"
        className="inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        Return to Command Center
      </Link>
    </div>
  );
}
