'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { MODULES } from '@/constants/modules';
import type { Module } from '@/types';

function labelForSegment(segment: string): string {
  const asModule = MODULES[segment as Module];
  if (asModule) return asModule.label;
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return <span className="text-sm font-medium text-foreground">Home</span>;

  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
            {isLast ? (
              <span className="truncate font-medium text-foreground">{labelForSegment(segment)}</span>
            ) : (
              <Link href={href as Route} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                {labelForSegment(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
