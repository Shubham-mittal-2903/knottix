import { Sparkles } from 'lucide-react';

export function DemoBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <Sparkles className="size-3" />
      Demo Mode
    </span>
  );
}
