'use client';

import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { lettersAndSpacesOnly } from '@/lib/validation';

export interface PassengerValue {
  id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  type?: string;
  dob?: string;
  gender?: string;
  [key: string]: any;
}

export interface PassengerListProps {
  /** Controlled list of passengers. */
  passengers: PassengerValue[];
  /** Called with the next passengers array whenever anything changes. */
  onChange: (passengers: PassengerValue[]) => void;
  /**
   * Optional per-field error lookup, keyed `passengers.<idx>.<field>`.
   * Return a message to show it inline and flag the field.
   */
  errorFor?: (key: string) => string | undefined;
  /** Optional blur handler, same key scheme, so touched-based errors work. */
  onFieldBlur?: (key: string) => void;
  /**
   * Optional ref registrar (key -> element) so a parent form can focus the
   * offending field after a failed submit.
   */
  registerField?: (key: string) => (el: HTMLElement | null) => void;
  className?: string;
}

const emptyPassenger = (): PassengerValue => ({
  id: `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  firstName: '',
  middleName: '',
  lastName: '',
  type: 'Adult',
  dob: '',
  gender: '',
});

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-ember-error">
      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
      {message}
    </p>
  );
}

/**
 * Shared passenger editor used by both the New Lead drawer and the lead detail
 * edit form: a pax stepper plus one card per traveller (First / Middle / Last,
 * Type, DOB, Gender). No quick-select chips. Fully controlled.
 */
export const PassengerList: React.FC<PassengerListProps> = ({
  passengers,
  onChange,
  errorFor,
  onFieldBlur,
  registerField,
  className = '',
}) => {
  const list = Array.isArray(passengers) ? passengers : [];
  const count = list.length || 1;

  const err = (idx: number, field: string) => errorFor?.(`passengers.${idx}.${field}`);
  const border = (idx: number, field: string) =>
    err(idx, field) ? 'border-ember-error' : 'border-ember-border';
  const blur = (idx: number, field: string) => () => onFieldBlur?.(`passengers.${idx}.${field}`);
  const reg = (idx: number, field: string) => registerField?.(`passengers.${idx}.${field}`);

  /** Ensure the array is long enough, then patch one passenger. */
  const patch = (idx: number, changes: Partial<PassengerValue>) => {
    const next = [...list];
    while (next.length <= idx) next.push(emptyPassenger());
    next[idx] = { ...next[idx], ...changes };
    onChange(next);
  };

  const setCount = (target: number) => {
    const n = Math.max(1, Math.min(99, target || 1));
    let next = [...list];
    if (next.length < n) {
      for (let i = next.length; i < n; i++) next.push(emptyPassenger());
    } else if (next.length > n) {
      next = next.slice(0, n);
    }
    onChange(next);
  };

  const removeAt = (idx: number) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Pax stepper */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-ember-text-primary">Pax (Travelers)</label>
          <span className="text-[10px] text-ember-primary font-bold">
            {count} Person{count > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCount(count - 1)}
            className="w-9 h-[38px] rounded-btn bg-ember-surface-raised border border-ember-border hover:bg-ember-surface text-ember-text-primary font-bold flex items-center justify-center transition-colors text-base"
            title="Decrease Pax"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={99}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10))}
            className="flex-1 text-center h-[38px] px-2 bg-ember-surface-raised border border-ember-border rounded-input text-sm font-bold text-ember-text-primary focus:outline-none focus:border-ember-primary"
          />
          <button
            type="button"
            onClick={() => setCount(count + 1)}
            className="w-9 h-[38px] rounded-btn bg-ember-surface-raised border border-ember-border hover:bg-ember-surface text-ember-text-primary font-bold flex items-center justify-center transition-colors text-base"
            title="Increase Pax"
          >
            +
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-1 border-t border-ember-border/60">
        <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-ember-primary" />
          <span>Passenger Details ({count} {count > 1 ? 'Travelers' : 'Traveler'})</span>
        </span>
        <span className="text-[11px] text-ember-neutral">
          <span className="text-ember-error font-bold">*</span> Required
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {Array.from({ length: count }).map((_, idx) => {
          const p = list[idx] || {};
          return (
            <div key={p.id || idx} className="p-3 rounded-btn bg-ember-surface-raised border border-ember-border text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-ember-primary text-[11px]">
                <span>Passenger {idx + 1} {idx === 0 ? '(Primary Lead Traveler)' : ''}</span>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="text-ember-neutral hover:text-red-600 transition-colors text-[10px] font-bold"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">First Name *</label>
                  <input
                    ref={reg(idx, 'firstName')}
                    type="text"
                    placeholder="First name"
                    value={p.firstName ?? ''}
                    onChange={(e) => patch(idx, { firstName: lettersAndSpacesOnly(e.target.value) })}
                    onBlur={blur(idx, 'firstName')}
                    className={`w-full px-2.5 py-1.5 rounded-input bg-ember-surface border ${border(idx, 'firstName')} text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium`}
                  />
                  <FieldError message={err(idx, 'firstName')} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">
                    Middle Name <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Middle name"
                    value={p.middleName ?? ''}
                    onChange={(e) => patch(idx, { middleName: lettersAndSpacesOnly(e.target.value) })}
                    onBlur={blur(idx, 'middleName')}
                    className={`w-full px-2.5 py-1.5 rounded-input bg-ember-surface border ${border(idx, 'middleName')} text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium`}
                  />
                  <FieldError message={err(idx, 'middleName')} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Last Name *</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={p.lastName ?? ''}
                    onChange={(e) => patch(idx, { lastName: lettersAndSpacesOnly(e.target.value) })}
                    onBlur={blur(idx, 'lastName')}
                    className={`w-full px-2.5 py-1.5 rounded-input bg-ember-surface border ${border(idx, 'lastName')} text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium`}
                  />
                  <FieldError message={err(idx, 'lastName')} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Passenger Type *</label>
                <select
                  value={p.type ?? 'Adult'}
                  onChange={(e) => patch(idx, { type: e.target.value })}
                  onBlur={blur(idx, 'type')}
                  className={`w-full px-2.5 py-1.5 rounded-input bg-ember-surface border ${border(idx, 'type')} text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium`}
                >
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                  <option value="Infant">Infant</option>
                </select>
                <FieldError message={err(idx, 'type')} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Date of Birth *</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={p.dob ?? ''}
                    onChange={(e) => patch(idx, { dob: e.target.value })}
                    onBlur={blur(idx, 'dob')}
                    className={`w-full px-2.5 py-1.5 rounded-input bg-ember-surface border ${border(idx, 'dob')} text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium`}
                  />
                  <FieldError message={err(idx, 'dob')} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Gender *</label>
                  <select
                    value={p.gender ?? ''}
                    onChange={(e) => patch(idx, { gender: e.target.value })}
                    onBlur={blur(idx, 'gender')}
                    className={`w-full px-2.5 py-1.5 rounded-input bg-ember-surface border ${border(idx, 'gender')} text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <FieldError message={err(idx, 'gender')} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
