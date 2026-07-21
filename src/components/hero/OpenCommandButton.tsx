'use client';

import { OPEN_COMMAND_CENTER_EVENT } from '@/lib/command-center-events';

/** Dispatches the exact same `OPEN_COMMAND_CENTER_EVENT` every other Command Center trigger in the
 *  app already uses (`QuickActions`, `Sidebar`, `Topbar`) — no new wiring, just a hero-styled button. */
export function OpenCommandButton({ label = 'Speak to Knottix' }: { label?: string }) {
  return (
    <button
      type="button"
      className="hero-btn hero-btn--primary"
      style={{ height: 44, padding: '0 20px', fontSize: 14 }}
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_CENTER_EVENT))}
    >
      {label}
      <span className="hero-kbd" style={{ borderColor: 'var(--hero-cyan-deep)', color: 'var(--hero-cyan-bright)', background: 'transparent' }}>
        ⌘K
      </span>
    </button>
  );
}
