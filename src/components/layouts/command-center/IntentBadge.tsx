import { cn } from '@/lib/utils';
import type { CommandIntent } from '@/lib/command-center/types';
import { INTENT_META } from './constants';

export function IntentBadge({ intent, className }: { intent: CommandIntent; className?: string }) {
  const meta = INTENT_META[intent];
  const Icon = meta.icon;
  return (
    <span className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', meta.className, className)}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}
