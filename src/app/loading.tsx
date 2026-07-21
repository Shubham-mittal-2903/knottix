export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading Knottix...</p>
      </div>
    </div>
  );
}
