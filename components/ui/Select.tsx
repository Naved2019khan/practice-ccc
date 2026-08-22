'use client';

import React, { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';
import { FieldLabel } from './FieldLabel';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  /** Renders the required marker on the label. */
  required?: boolean;
  /** Right-aligned label hint, e.g. "Optional". */
  labelHint?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      children,
      id,
      disabled,
      required,
      labelHint,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const selectId = id || autoId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={selectId} required={required} hint={labelHint}>
            {label}
          </FieldLabel>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={twMerge(
              clsx(
                'w-full appearance-none bg-ember-surface border border-ember-border rounded-input px-3.5 py-2 pr-9 text-sm text-ember-text-primary transition-all duration-150 cursor-pointer',
                'focus:outline-none focus:border-ember-primary focus:ring-2 focus:ring-ember-primary/15',
                'disabled:bg-ember-surface-raised disabled:text-ember-neutral disabled:cursor-not-allowed',
                error && 'border-ember-error focus:border-ember-error focus:ring-ember-error/15',
                className
              )
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-3 w-4 h-4 text-ember-neutral pointer-events-none" />
        </div>
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

Select.displayName = 'Select';
