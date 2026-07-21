import { Brain, Cpu, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StatusIndicator {
  label: string;
  ok: boolean;
  icon: React.ElementType;
}

export function StatusStrip({ anthropicConfigured, demoMode }: { anthropicConfigured: boolean; demoMode: boolean }) {
  const indicators: StatusIndicator[] = [
    { label: 'Kernel Online', ok: true, icon: Cpu },
    { label: 'Memory Healthy', ok: true, icon: Brain },
    { label: 'AI Runtime Active', ok: true, icon: Server },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {indicators.map((indicator) => {
        const Icon = indicator.icon;
        return (
          <span
            key={indicator.label}
            className="flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground"
          >
            <Icon className="size-3" />
            <span
              className={`size-1.5 rounded-full ${indicator.ok ? 'animate-glow-pulse bg-knottix-success' : 'bg-knottix-error'}`}
              aria-hidden
            />
            {indicator.label}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
        <span
          className={`size-1.5 rounded-full ${anthropicConfigured ? 'animate-glow-pulse bg-knottix-success' : 'bg-muted-foreground/50'}`}
          aria-hidden
        />
        {anthropicConfigured ? 'Anthropic Connected' : 'Anthropic Not Configured'}
      </span>
      {demoMode && <Badge variant="accent">Demo Mode</Badge>}
    </div>
  );
}
