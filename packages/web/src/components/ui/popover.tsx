import { Popover as PopoverPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  container,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  container?: HTMLElement | null;
}) {
  // Get reference to content for manual positioning if needed
  const [contentRef, setContentRef] = React.useState<HTMLDivElement | null>(null);
  
  // Fix positioning issue in SDK embed (e.g. Environment dropdown in Connect to ADA BMP)
  // Radix applies both left/top and transform, doubling the offset and pushing content off-screen.
  // Only applies when running in SDK context (detected by __AP_SDK_MODULE__ on window)
  React.useEffect(() => {
    const isSDKEmbed = typeof window !== 'undefined' && (window as any).__AP_SDK_MODULE__;
    if (!isSDKEmbed || !contentRef) return;

    const wrapper = contentRef.closest('[data-radix-popper-content-wrapper]') as HTMLElement;
    if (!wrapper) return;

    const applyPosition = () => {
      // Find trigger - try multiple selectors since SearchableSelect uses a Button inside PopoverTrigger
      let trigger = document.querySelector(
        '[data-slot="popover-trigger"][data-state="open"]',
      ) as HTMLElement;
      
      // If not found, try to find the trigger via the popover's parent relationship
      if (!trigger) {
        trigger = document.querySelector(
          '[data-slot="popover-trigger"][aria-expanded="true"]',
        ) as HTMLElement;
      }
      
      // Also try to find via Button with combobox role that's expanded
      if (!trigger) {
        trigger = document.querySelector(
          'button[role="combobox"][aria-expanded="true"]',
        ) as HTMLElement;
      }

      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        wrapper.style.transform = 'none';
        wrapper.style.top = `${rect.bottom + sideOffset}px`;
        wrapper.style.left = `${rect.left}px`;
        
        // For SearchableSelect/Combobox popovers (role="combobox"), match the trigger width
        // This ensures the dropdown has proper width even if inline styles had 0px initially
        // Don't apply to regular filter popovers (they use normal buttons without combobox role)
        const isCombobox = trigger.getAttribute('role') === 'combobox' || 
                           trigger.querySelector('[role="combobox"]') !== null;
        if (isCombobox) {
          wrapper.style.width = `${rect.width}px`;
          wrapper.style.minWidth = `${rect.width}px`;
          if (contentRef) {
            contentRef.style.width = `${rect.width}px`;
            contentRef.style.minWidth = `${rect.width}px`;
            contentRef.style.maxWidth = `${rect.width}px`;
          }
        }
      }
    };

    // Run after Radix has applied its inline styles (next frame); fix applies for any transform
    const id = requestAnimationFrame(() => {
      applyPosition();
      requestAnimationFrame(applyPosition);
    });
    return () => cancelAnimationFrame(id);
  }, [contentRef, sideOffset]);
  
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={setContentRef}
        data-radix-portal=""
        data-slot="popover-content"
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={10}
        className={cn(
          'z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="popover-header"
      className={cn('flex flex-col gap-1 text-sm', className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <div
      data-slot="popover-title"
      className={cn('font-medium', className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="popover-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
};
