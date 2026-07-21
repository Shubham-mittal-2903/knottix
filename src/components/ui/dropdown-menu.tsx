import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

function DropdownMenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger {...props} />;
}

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: MenuPrimitive.Popup.Props & { align?: 'start' | 'center' | 'end'; sideOffset?: number }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <MenuPrimitive.Popup
          className={cn(
            'min-w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[0_24px_48px_rgba(0,0,0,0.4)]',
            'origin-[var(--transform-origin)] transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuGroupLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="separator" className={cn('my-1 h-px bg-border', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroupLabel,
  DropdownMenuSeparator,
};
