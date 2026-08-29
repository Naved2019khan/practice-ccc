'use client';

import React, {
  forwardRef,
  useId,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { Plane, MapPin, Search } from 'lucide-react';
import { FieldLabel } from './FieldLabel';
import AirportData from '@/data/airportSData.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AirportOption {
  airportCode: string;
  airportName: string;
  cityCode: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  continent: string;
}

export interface AirportInputProps {
  /** Label shown above the field */
  label?: string;
  /** Right-aligned label hint, e.g. "Optional" */
  labelHint?: React.ReactNode;
  /** Shows the required marker */
  required?: boolean;
  /** Current display value (free-text stored in form state) */
  value: string;
  /** Called whenever the text changes (free-typed or after a selection) */
  onChange: (value: string) => void;
  /** Called when the user picks a suggestion from the dropdown */
  onSelect?: (option: AirportOption) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /**
   * ISO country code used to sort results from the user's likely home country
   * to the top of the list. Defaults to "IN".
   */
  priorityCountry?: string;
}

// ── Sorting util (matches the filter logic from the original LocationInput) ──

const MAX_RESULTS = 8;

function getFilteredAirports(
  query: string,
  priorityCountry: string
): AirportOption[] {
  const rawQ = (query || '').trim();
  const q = rawQ.toLowerCase();

  // If query contains (CODE), extract code or clean city
  const codeMatch = q.match(/\(([a-z0-9]{3})\)/i);
  const searchCode = codeMatch ? codeMatch[1].toLowerCase() : null;
  const cleanQuery = q.replace(/\([^)]*\)/g, '').trim();

  const allAirports = AirportData as AirportOption[];

  if (q.length < 1) {
    // No query – show priority country airports first
    return [...allAirports]
      .sort((a, b) => {
        if (a.countryCode === priorityCountry && b.countryCode !== priorityCountry) return -1;
        if (a.countryCode !== priorityCountry && b.countryCode === priorityCountry) return 1;
        return a.cityName.localeCompare(b.cityName);
      })
      .slice(0, MAX_RESULTS);
  }

  let matches = allAirports.filter((item) => {
    if (searchCode && item.airportCode.toLowerCase() === searchCode) return true;
    if (cleanQuery.length >= 2 && (item.cityName.toLowerCase().includes(cleanQuery) || item.airportName.toLowerCase().includes(cleanQuery))) {
      return true;
    }
    return (
      item.airportCode.toLowerCase().includes(q) ||
      item.airportName.toLowerCase().includes(q) ||
      item.cityName.toLowerCase().includes(q) ||
      item.cityCode.toLowerCase().includes(q) ||
      item.countryName.toLowerCase().includes(q)
    );
  });

  // If still no matches, show fallback suggestions
  if (matches.length === 0) {
    matches = allAirports
      .filter((item) => item.countryCode === priorityCountry || item.airportCode.toLowerCase().startsWith(q.slice(0, 2)))
      .slice(0, MAX_RESULTS);
  }

  return matches
    .sort((a, b) => {
      if (searchCode) {
        if (a.airportCode.toLowerCase() === searchCode) return -1;
        if (b.airportCode.toLowerCase() === searchCode) return 1;
      }
      // Exact code match first
      const aCodeExact = a.airportCode.toLowerCase() === q;
      const bCodeExact = b.airportCode.toLowerCase() === q;
      if (aCodeExact && !bCodeExact) return -1;
      if (!aCodeExact && bCodeExact) return 1;

      // Priority country bias
      if (a.countryCode === priorityCountry && b.countryCode !== priorityCountry) return -1;
      if (a.countryCode !== priorityCountry && b.countryCode === priorityCountry) return 1;

      return a.cityName.localeCompare(b.cityName);
    })
    .slice(0, MAX_RESULTS);
}

// ── Component ────────────────────────────────────────────────────────────────

export const AirportInput = forwardRef<HTMLInputElement, AirportInputProps>(
  (
    {
      label,
      labelHint,
      required,
      value,
      onChange,
      onSelect,
      onBlur,
      error,
      helperText,
      placeholder = 'City or airport code…',
      disabled,
      className,
      id,
      priorityCountry = 'IN',
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const listId = `${inputId}-listbox`;

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const suggestions = open ? getFilteredAirports(value, priorityCountry) : [];

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Scroll active item into view
    useEffect(() => {
      if (activeIndex < 0 || !listRef.current) return;
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setOpen(true);
      setActiveIndex(-1);
    };

    const handleSelect = useCallback(
      (option: AirportOption) => {
        // Store as "CITY_NAME (CODE)" so it's human-readable in the form
        onChange(`${option.cityName} (${option.airportCode})`);
        onSelect?.(option);
        setOpen(false);
        setActiveIndex(-1);
      },
      [onChange, onSelect]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    const handleBlur = () => {
      // Delay so a click on a suggestion fires before blur hides the list
      setTimeout(() => {
        if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
          setOpen(false);
          setActiveIndex(-1);
          onBlur?.();
        }
      }, 120);
    };

    return (
      <div ref={containerRef} className={clsx("relative w-full flex flex-col gap-1.5", open ? "z-40" : "z-10")}>
        {label && (
          <FieldLabel htmlFor={inputId} required={required} hint={labelHint}>
            {label}
          </FieldLabel>
        )}

        {/* Input */}
        <div className="relative flex items-center">
          <div className="absolute left-3 text-ember-neutral pointer-events-none">
            <Plane className="w-3.5 h-3.5" />
          </div>
          <input
            ref={ref}
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            autoComplete="off"
            disabled={disabled}
            required={required}
            value={value}
            placeholder={placeholder}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={twMerge(
              clsx(
                'w-full bg-ember-surface border border-ember-border rounded-input pl-9 pr-3.5 py-2 text-sm text-ember-text-primary placeholder:text-ember-neutral transition-all duration-150',
                'focus:outline-none focus:border-ember-primary focus:ring-2 focus:ring-ember-primary/15',
                'disabled:bg-ember-surface-raised disabled:text-ember-neutral disabled:cursor-not-allowed',
                error && 'border-ember-error focus:border-ember-error focus:ring-ember-error/15',
                className
              )
            )}
          />
        </div>

        {/* Error / helper */}
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

        {/* Dropdown */}
        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Airport suggestions"
            className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[320px] max-h-72 overflow-y-auto rounded-xl border border-ember-border bg-white shadow-xl py-1 focus:outline-none"
          >
            {suggestions.length === 0 ? (
              <li className="flex flex-col items-center gap-1.5 py-8 text-center">
                <Search className="w-5 h-5 text-ember-neutral" />
                <span className="text-xs font-semibold text-ember-text-primary">No airports found</span>
                <span className="text-[11px] text-ember-neutral">Try a city name or IATA code</span>
              </li>
            ) : (
              suggestions.map((option, index) => (
                <li
                  key={`${option.airportCode}-${index}`}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => {
                    // Prevent blur from firing before click
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors duration-100',
                    index === activeIndex
                      ? 'bg-ember-primary/8 text-ember-primary'
                      : 'hover:bg-ember-surface-raised'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={clsx(
                      'shrink-0 w-8 h-8 grid place-items-center rounded-full transition-colors',
                      index === activeIndex
                        ? 'bg-ember-primary/12 text-ember-primary'
                        : 'bg-ember-surface-raised text-ember-neutral'
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-ember-text-primary truncate">
                        {option.cityName}
                      </span>
                      <span className="text-[10px] font-bold text-ember-neutral uppercase bg-ember-surface-raised px-1 rounded shrink-0">
                        {option.countryCode}
                      </span>
                    </div>
                    <span className="text-xs text-ember-neutral truncate block">
                      {option.airportName}
                    </span>
                  </div>

                  {/* IATA code badge */}
                  <span
                    className={clsx(
                      'shrink-0 text-xs font-black tabular-nums transition-colors',
                      index === activeIndex ? 'text-ember-primary' : 'text-ember-text-primary'
                    )}
                  >
                    {option.airportCode}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    );
  }
);

AirportInput.displayName = 'AirportInput';
