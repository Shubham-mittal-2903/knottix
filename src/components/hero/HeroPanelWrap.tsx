import { cn } from '@/lib/utils';

/**
 * Light-touch wrapper for existing self-contained widgets (GitHubWidget, GoalExecutionWidget,
 * TaskSessionsWidget, CommandHistoryWidget, StatusStrip, QuickActions) that this redesign
 * deliberately does NOT rewrite internally — they're real, working client components with their
 * own data-fetching/loading/error states, and rewriting their internals is out of this visual-only
 * pass's scope. This just gives them the hero panel's border/background/radius so they sit
 * consistently among the newly-built hero components on the same page.
 */
export function HeroPanelWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hero-panel', 'hero-panel-wrap', className)}>{children}</div>;
}
