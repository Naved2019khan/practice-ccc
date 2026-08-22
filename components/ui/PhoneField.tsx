'use client';

import React, { forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';
import { FieldLabel } from './FieldLabel';
import { COUNTRIES, getCountry } from '@/lib/countries';

export interface PhoneFieldProps {
  label?: string;
  /** ISO 3166-1 alpha-2 code selected in the dial-code tab. */
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  /** The national number, without the dial code. */
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  labelHint?: React.ReactNode;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
  className?: string;
}

/**
 * A country dial-code tab welded to a national-number input: one label, one
 * error slot, one focus ring across both halves.
 *
 * The number is stored without the dial code — combine them at submit time.
 */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  (
    {
      label,
      countryCode,
      onCountryCodeChange,
      value,
      onValueChange,
      onBlur,
      error,
      helperText,
      placeholder = '555 123 4567',
      required,
      labelHint,
      disabled,
      name,
      autoComplete = 'tel-national',
      className,
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = `${autoId}-number`;
    const selectId = `${autoId}-dial`;
    const errorId = `${autoId}-error`;
    const helperId = `${autoId}-helper`;
    const dial = getCountry(countryCode)?.dial ?? '';

    return (
      <div className={twMerge(clsx('w-full flex flex-col gap-1.5', className))}>
        {label && (
          <FieldLabel htmlFor={inputId} required={required} hint={labelHint}>
            {label}
          </FieldLabel>
        )}

        {/* The wrapper carries the border and focus ring so the two controls
            read as one field. */}
        <div
          className={clsx(
            'flex w-full items-stretch bg-ember-surface border rounded-input transition-all duration-150 overflow-hidden',
            'focus-within:ring-2',
            error
              ? 'border-ember-error focus-within:border-ember-error focus-within:ring-ember-error/15'
              : 'border-ember-border focus-within:border-ember-primary focus-within:ring-ember-primary/15',
            disabled && 'bg-ember-surface-raised cursor-not-allowed'
          )}
        >
          <div className="relative shrink-0">
            <select
              id={selectId}
              value={countryCode}
              onChange={(e) => onCountryCodeChange(e.target.value)}
              disabled={disabled}
              aria-label="Country calling code"
              className="h-full appearance-none bg-transparent border-0 border-r border-ember-border pl-2.5 pr-7 py-2 text-sm text-ember-text-primary cursor-pointer focus:outline-none disabled:cursor-not-allowed"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.dial}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ember-neutral pointer-events-none" />
          </div>

          {dial && (
            <span className="flex items-center pl-2.5 text-sm font-medium text-ember-text-secondary select-none shrink-0">
              {dial}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            name={name}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            value={value}
            // Digits and the separators people paste; the dial code lives in
            // the tab, so a leading '+' is rejected here.
            onChange={(e) => onValueChange(e.target.value.replace(/[^\d\s()-]/g, ''))}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className="flex-1 min-w-0 bg-transparent border-0 px-2.5 py-2 text-sm text-ember-text-primary placeholder:text-ember-neutral focus:outline-none disabled:cursor-not-allowed"
          />
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

PhoneField.displayName = 'PhoneField';
