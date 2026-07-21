import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold tracking-tighter text-zinc-200">404</h1>
      <p className="text-lg text-muted-foreground">This route does not exist in Knottix.</p>
      <Link
        href="/command"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Return to Command Center
      </Link>
    </div>
  );
}
