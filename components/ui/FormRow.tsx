'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface FormRowProps {
  /** Columns at `md` and up; always one column on mobile. */
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

const COLS: Record<NonNullable<FormRowProps['cols']>, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};

/** Responsive field row — replaces hand-written `grid-cols-*` wrappers. */
export const FormRow: React.FC<FormRowProps> = ({ cols = 2, children, className }) => (
  <div className={twMerge(clsx('grid grid-cols-1 gap-3 items-start', COLS[cols], className))}>
    {children}
  </div>
);
