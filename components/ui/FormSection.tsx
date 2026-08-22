'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface FormSectionProps {
  title: string;
  description?: string;
  /** Usually a lucide icon; rendered in a tinted square beside the title. */
  icon?: React.ReactNode;
  /** Right-aligned note, e.g. "Optional". */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * A titled group of fields. Gives long forms a scannable structure — see
 * `components/leads/NewLeadDrawer.tsx` for the canonical usage.
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon,
  aside,
  children,
  className,
}) => (
  <section className={twMerge(clsx('space-y-3', className))}>
    <div className="flex items-start justify-between gap-3 pb-2 border-b border-ember-border">
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && (
          <span className="w-7 h-7 shrink-0 rounded-btn bg-ember-primary/10 text-ember-primary flex items-center justify-center">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h4 className="text-sm font-bold font-display text-ember-text-primary">{title}</h4>
          {description && (
            <p className="text-[11px] text-ember-text-secondary mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {aside && (
        <span className="text-[11px] font-semibold text-ember-neutral shrink-0 pt-1">{aside}</span>
      )}
    </div>

    <div className="space-y-3">{children}</div>
  </section>
);
