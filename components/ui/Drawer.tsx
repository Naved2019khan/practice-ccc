'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Pinned action bar at the bottom of the panel. */
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  side?: 'right' | 'left';
}

const TRANSITION_MS = 300;

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'lg',
  side = 'right',
}) => {
  // Stay mounted through the slide-out so the panel animates away instead of
  // vanishing. `entered` drives the transform; it flips one frame after mount.
  const [isMounted, setIsMounted] = useState(isOpen);
  const [hasEntered, setHasEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Callers usually pass an inline arrow, so `onClose` changes identity on every
  // parent render. Read it through a ref so the effects below don't churn — a
  // re-running focus effect would steal focus back from whatever field the user
  // is typing into.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }
    setHasEntered(false);
    const timer = setTimeout(() => setIsMounted(false), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted || !isOpen) return;
    const frame = requestAnimationFrame(() => setHasEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMounted]);

  // Focus the panel once per open, never again — otherwise focus is pulled out
  // of the field the user is typing into. `isMounted` is in the deps because the
  // panel isn't in the DOM yet on the render where `isOpen` first flips true;
  // both only change on open/close, so this still runs once per open.
  useEffect(() => {
    if (!isOpen || !isMounted) return;
    panelRef.current?.focus();
  }, [isOpen, isMounted]);

  if (!isMounted) return null;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  const closedTransform = side === 'right' ? 'translate-x-full' : '-translate-x-full';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          hasEntered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`absolute inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} w-full ${
          widths[width]
        } flex flex-col bg-ember-surface border-ember-border ${
          side === 'right' ? 'border-l rounded-l-card' : 'border-r rounded-r-card'
        } shadow-drawer overflow-hidden outline-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasEntered ? 'translate-x-0' : closedTransform
        }`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 p-5 border-b border-ember-border bg-ember-bg/50 shrink-0">
            <div>
              {title && (
                <h3 className="text-lg font-bold text-ember-text-primary font-display">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-ember-text-secondary mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-btn text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>

        {/* Pinned footer */}
        {footer && (
          <div className="shrink-0 p-5 border-t border-ember-border bg-ember-bg/50">{footer}</div>
        )}
      </div>
    </div>
  );
};
