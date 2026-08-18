'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-ember-text-primary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3 text-ember-neutral pointer-events-none">{icon}</div>}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full bg-ember-surface border border-ember-border rounded-input px-3.5 py-2 text-sm text-ember-text-primary placeholder:text-ember-neutral transition-all duration-150',
                'focus:outline-none focus:border-ember-primary focus:ring-2 focus:ring-ember-primary/15',
                'disabled:bg-ember-surface-raised disabled:text-ember-neutral disabled:cursor-not-allowed',
                icon && 'pl-9',
                error && 'border-ember-error focus:border-ember-error focus:ring-ember-error/15',
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-ember-error font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-ember-neutral">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
