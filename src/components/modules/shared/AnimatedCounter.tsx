'use client';

import { useEffect, useRef, useState } from 'react';

export function AnimatedCounter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}
