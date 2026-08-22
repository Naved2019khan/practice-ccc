'use client';

import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  stripeColor?: string;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  active = false,
  stripeColor,
  elevated = false,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'relative bg-ember-surface border border-ember-border rounded-card p-4 transition-all duration-200 overflow-hidden',
          elevated ? 'shadow-card hover:shadow-card-hover hover:-translate-y-0.5' : 'shadow-sm',
          active && 'border-l-4 border-l-ember-primary',
          className
        )
      )}
      {...props}
    >
      {stripeColor && (
        <div
          className="absolute top-0 left-0 bottom-0 w-1"
          style={{ backgroundColor: stripeColor }}
        />
      )}
      {children}
    </div>
  );
};
