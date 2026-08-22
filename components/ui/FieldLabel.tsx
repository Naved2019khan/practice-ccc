'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface FieldLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  /** Renders the required marker and announces it to screen readers. */
  required?: boolean;
  /** Right-aligned hint, e.g. "Optional". */
  hint?: React.ReactNode;
  className?: string;
}

/**
 * The single source of the required marker. Field labels should never bake a
 * literal "*" into their text — pass `required` instead, so the marker is
 * styled and announced consistently everywhere.
 */
export const FieldLabel: React.FC<FieldLabelProps> = ({
  htmlFor,
  children,
  required = false,
  hint,
  className,
}) => (
  <div className="flex items-baseline justify-between gap-2">
    <label
      htmlFor={htmlFor}
      className={twMerge(
        clsx('text-xs font-semibold text-ember-text-primary', className)
      )}
    >
      {children}
      {required && (
        <span className="text-ember-error ml-0.5" aria-hidden="true">
          *
        </span>
      )}
      {required && <span className="sr-only"> (required)</span>}
    </label>
    {hint && <span className="text-[11px] text-ember-neutral shrink-0">{hint}</span>}
  </div>
);
