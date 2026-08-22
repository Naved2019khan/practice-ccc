'use client';

import React, { forwardRef } from 'react';
import { CreditCard } from 'lucide-react';
import { Input, InputProps } from './Input';
import { detectCardBrand, formatCardNumber, digitsOnly, cardNumberLengths } from '@/lib/validation';

export interface CardNumberInputProps
  extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'trailing' | 'icon'> {
  value: string;
  /** Receives the display-formatted value (grouped with spaces). */
  onValueChange: (value: string) => void;
}

/**
 * Card number field that groups digits as they are typed (4-4-4-4, or 4-6-5 for
 * Amex) and shows the detected brand. Grouping is display-only — strip spaces
 * with `digitsOnly` before sending or storing.
 */
export const CardNumberInput = forwardRef<HTMLInputElement, CardNumberInputProps>(
  ({ value, onValueChange, error, helperText, ...props }, ref) => {
    const brand = detectCardBrand(value);
    const typed = digitsOnly(value).length;
    const complete = cardNumberLengths(brand).includes(typed);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        // maxLength counts the grouping spaces, so allow for them generously.
        maxLength={23}
        value={value}
        onChange={(e) => onValueChange(formatCardNumber(e.target.value))}
        error={error}
        helperText={helperText}
        icon={<CreditCard className="w-4 h-4" />}
        trailing={
          brand !== 'Unknown' && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                complete
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-ember-surface-raised text-ember-neutral'
              }`}
            >
              {brand}
            </span>
          )
        }
        className="font-code tracking-wide"
        {...props}
      />
    );
  }
);

CardNumberInput.displayName = 'CardNumberInput';
