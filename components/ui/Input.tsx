'use client';

import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FieldLabel } from './FieldLabel';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  /** Renders the required marker on the label. Also sets `aria-required`. */
  required?: boolean;
  /** Right-aligned label hint, e.g. "Optional". */
  labelHint?: React.ReactNode;
  /** Element after the field, e.g. a card brand badge. */
  trailing?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      icon,
      id,
      disabled,
      required,
      labelHint,
      trailing,
      ...props
    },
    ref
  ) => {
    // Generated rather than derived from the label: labels repeat across pages,
    // and duplicate ids make a <label> focus the wrong field.
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
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-ember-neutral pointer-events-none">{icon}</div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            // Kept on the element so existing forms that rely on native
            // validation keep working; forms with their own validation opt out
            // with `noValidate` on the <form>.
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={twMerge(
              clsx(
                'w-full bg-ember-surface border border-ember-border rounded-input px-3.5 py-2 text-sm text-ember-text-primary placeholder:text-ember-neutral transition-all duration-150',
                'focus:outline-none focus:border-ember-primary focus:ring-2 focus:ring-ember-primary/15',
                'disabled:bg-ember-surface-raised disabled:text-ember-neutral disabled:cursor-not-allowed',
                icon && 'pl-9',
                trailing && 'pr-16',
                error && 'border-ember-error focus:border-ember-error focus:ring-ember-error/15',
                className
              )
            )}
            {...props}
          />
          {trailing && (
            <div className="absolute right-3 flex items-center pointer-events-none">{trailing}</div>
          )}
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

Input.displayName = 'Input';
