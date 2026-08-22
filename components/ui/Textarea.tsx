'use client';

import React, { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FieldLabel } from './FieldLabel';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Renders the required marker on the label. */
  required?: boolean;
  /** Right-aligned label hint, e.g. "Optional". */
  labelHint?: React.ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, helperText, id, disabled, rows = 4, required, labelHint, ...props },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={inputId} required={required} hint={labelHint}>
            {label}
          </FieldLabel>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={twMerge(
            clsx(
              'w-full bg-ember-surface border border-ember-border rounded-input px-3.5 py-2.5 text-sm text-ember-text-primary placeholder:text-ember-neutral transition-all duration-150',
              'focus:outline-none focus:border-ember-primary focus:ring-2 focus:ring-ember-primary/15',
              'disabled:bg-ember-surface-raised disabled:text-ember-neutral disabled:cursor-not-allowed resize-y',
              error && 'border-ember-error focus:border-ember-error focus:ring-ember-error/15',
              className
            )
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-ember-error font-medium">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-ember-neutral">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
