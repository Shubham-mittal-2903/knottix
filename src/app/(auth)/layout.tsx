export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gradient-mesh relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 animate-glow-pulse bg-[radial-gradient(circle_at_50%_20%,var(--knottix-accent-glow),transparent_60%)]"
      />
      {children}
    </div>
  );
}
