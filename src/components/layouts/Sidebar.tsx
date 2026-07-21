'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { NavItem, NavSection } from '@/config/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/brand/Logo';

const SECTION_ORDER: NavSection[] = ['Overview', 'Work', 'Intelligence', 'Organization', 'System'];

function groupBySection(items: NavItem[]): Array<[NavSection, NavItem[]]> {
  const groups = new Map<NavSection, NavItem[]>();
  for (const item of items) {
    const list = groups.get(item.section) ?? [];
    list.push(item);
    groups.set(item.section, list);
  }
  return SECTION_ORDER.filter((s) => groups.has(s)).map((s) => [s, groups.get(s) as NavItem[]]);
}

export function Sidebar({
  navItems,
  collapsed,
  onToggle,
  experienceLabel,
  onOpenCommandCenter,
}: {
  navItems: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
  experienceLabel: string;
  onOpenCommandCenter: () => void;
}) {
  const pathname = usePathname();
  const sections = groupBySection(navItems);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 264 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="glass sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-sidebar-border"
    >
      <div className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <div className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15">
          <span className="absolute inset-0 -z-10 animate-glow-pulse rounded-md bg-primary/25 blur-sm" aria-hidden />
          <Logo size={20} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex min-w-0 flex-col justify-center overflow-hidden leading-none"
            >
              <span className="truncate text-sm font-semibold whitespace-nowrap text-sidebar-foreground">Knottix</span>
              <span className="mt-0.5 truncate text-[10px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                {experienceLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn('px-2 pt-2', collapsed && 'px-2')}>
        <button
          type="button"
          onClick={onOpenCommandCenter}
          className={cn(
            'group flex w-full items-center gap-2.5 rounded-md border border-border/70 bg-secondary/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-secondary hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          <Terminal className="size-3.5 shrink-0 text-primary transition-transform group-hover:scale-110" />
          {!collapsed && (
            <>
              <span className="truncate">Command Center</span>
              <kbd className="ml-auto shrink-0 rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <TooltipProvider>
        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-3">
          {sections.map(([section, items]) => (
            <div key={section} className="space-y-0.5">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                  {section}
                </p>
              )}
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href as Route}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-md bg-sidebar-accent"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                    {active && <span className="absolute left-0 h-4 w-0.5 rounded-full bg-primary" aria-hidden />}
                    <Icon className="relative size-4 shrink-0" />
                    {!collapsed && <span className="relative truncate">{item.label}</span>}
                  </Link>
                );

                if (!collapsed) return <div key={item.href}>{link}</div>;

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={link} />
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>
      </TooltipProvider>

      <button
        type="button"
        data-hide-presentation="true"
        onClick={onToggle}
        className={cn(
          'flex h-11 items-center gap-2 border-t border-sidebar-border px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-sidebar-foreground',
          collapsed && 'justify-center px-0',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </motion.aside>
  );
}
