import { cn } from '@/lib/utils';

export type OrbSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type OrbState = 'idle' | 'thinking' | 'executing' | 'blocked';

export interface OrbProps {
  size?: OrbSize;
  state?: OrbState;
  /** Adds a slowly rotating wireframe sphere overlay — used for the Mission Control hero and AI
   *  Employee Detail's header avatar, where the orb reads as a live "presence," not a status icon. */
  wire?: boolean;
  glow?: boolean;
  className?: string;
}

/**
 * Knottix's AI presence indicator — a breathing, glowing sphere whose color and animation speed
 * change with `state`. Ported 1:1 from knottix-proto/assets/js/app.js's `orb()` builder onto the
 * `.hero-orb*` classes in `src/styles/hero-theme.css`. Purely presentational: callers decide what
 * `state` means (there is no live per-employee "thinking/executing" signal in the real app today —
 * screens that don't have one should pass `state="idle"` rather than inventing one).
 */
export function Orb({ size = 'md', state = 'idle', wire = false, glow = true, className }: OrbProps) {
  return (
    <div className={cn('hero-orb', `hero-orb--${size}`, `hero-orb--${state}`, className)}>
      {glow && <div className="hero-orb__glow" />}
      {wire && (
        <svg className="hero-orb__wire" viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="50" rx="50" ry="50" />
          <ellipse cx="50" cy="50" rx="50" ry="20" />
          <ellipse cx="50" cy="50" rx="50" ry="35" />
          <ellipse cx="50" cy="50" rx="20" ry="50" />
          <ellipse cx="50" cy="50" rx="35" ry="50" />
        </svg>
      )}
      <div className="hero-orb__ring" />
      <div className="hero-orb__ring hero-orb__ring--2" />
      <div className="hero-orb__ring hero-orb__ring--3" />
      <div className="hero-orb__core" />
    </div>
  );
}
