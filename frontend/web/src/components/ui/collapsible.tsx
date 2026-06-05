'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Collapsible — lightweight React implementation (no Radix UI)
// Compatible with Tailwind v4 data-state animations.
// ============================================================

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  className,
  children,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div
        className={cn(className)}
        data-state={open ? 'open' : 'closed'}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, onOpenChange } = React.useContext(CollapsibleContext);

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => onOpenChange(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

interface CollapsibleContentProps {
  className?: string;
  children?: React.ReactNode;
}

function CollapsibleContent({ className, children }: CollapsibleContentProps) {
  const { open } = React.useContext(CollapsibleContext);

  return (
    <div
      data-state={open ? 'open' : 'closed'}
      className={cn(
        'overflow-hidden transition-all duration-200',
        open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
