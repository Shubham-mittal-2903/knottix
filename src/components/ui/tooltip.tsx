import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

function TooltipProvider({ delay = 200, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />;
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger {...props} />;
}

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 8,
  ...props
}: TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          className={cn(
            'z-50 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-[0_24px_48px_rgba(0,0,0,0.4)]',
            'origin-[var(--transform-origin)] transition-[transform,opacity] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent };
