'use client';

import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, rows = 4, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-ember-text-primary">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          disabled={disabled}
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
        {error && <p className="text-xs text-ember-error font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-ember-neutral">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
