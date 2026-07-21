/**
 * Demo Mode — a presentation-layer switch only. No backend, Kernel, AI Runtime, Memory
 * Engine, or database schema code is aware this exists. Every page decides, at the point
 * where it would otherwise call a real query/service, whether to use `DEMO_*` fixture data
 * instead — via `withDemo()` below — so the switch lives in exactly one place per call site
 * and the branch itself is never duplicated.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Resolve either the demo fixture or the real data loader, depending on `isDemoMode()`.
 * `loadReal` is only invoked when demo mode is off, so no real query, AI call, or database
 * round-trip ever runs while demoing.
 */
export async function withDemo<T>(demoValue: T, loadReal: () => Promise<T>): Promise<T> {
  if (isDemoMode()) return demoValue;
  return loadReal();
}
