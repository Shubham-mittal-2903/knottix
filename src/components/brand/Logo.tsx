import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The real Knottix mark — cropped from the founder-provided brand file (`KNOTTIX-LOGO.png`),
 * background chroma-keyed to transparent so it sits cleanly inside any colored glow box.
 * Single source of truth: every place that shows the Knottix glyph (Sidebar, Splash Screen,
 * Login) renders this instead of each hand-rolling its own Lucide icon substitute.
 */
export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/knottix-logo.png"
      alt="Knottix"
      width={size}
      height={size}
      className={cn('object-contain', className)}
      priority
    />
  );
}
