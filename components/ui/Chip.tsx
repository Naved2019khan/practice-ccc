'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'amber' | 'success' | 'warning' | 'error' | 'outline' | 'stone';
  size?: 'sm' | 'md';
}

export const Chip: React.FC<ChipProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-chip transition-colors select-none';

  const variants = {
    default: 'bg-stone-200 text-stone-700',
    primary: 'bg-ember-primary text-white font-semibold',
    stone: 'bg-stone-100 text-stone-700 border border-stone-200',
    amber: 'bg-amber-100 text-amber-800 border border-amber-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-orange-100 text-orange-800 border border-orange-200',
    error: 'bg-red-100 text-red-800 border border-red-200',
    outline: 'bg-transparent border border-ember-border text-ember-text-secondary',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))} {...props}>
      {children}
    </span>
  );
};

export const StageBadge: React.FC<{ stage: string; size?: 'sm' | 'md' }> = ({ stage, size = 'sm' }) => {
  switch (stage) {
    case 'New':
      return <Chip variant="amber" size={size}>New</Chip>;
    case 'Contacted':
      return <Chip variant="stone" size={size}>Contacted</Chip>;
    case 'Quoted':
      return <Chip variant="warning" size={size}>Quoted</Chip>;
    case 'Negotiation':
      return <Chip variant="primary" size={size}>Negotiation</Chip>;
    case 'Booked':
      return <Chip variant="success" size={size}>Booked</Chip>;
    case 'Ticketed':
      return <Chip variant="success" size={size} className="bg-emerald-600 text-white font-bold">Ticketed</Chip>;
    case 'Lost':
      return <Chip variant="error" size={size}>Lost</Chip>;
    default:
      return <Chip variant="default" size={size}>{stage}</Chip>;
  }
};

export const PaymentBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  switch (status) {
    case 'Paid':
      return (
        <Chip variant="success" size={size} className="font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Paid
        </Chip>
      );
    case 'Authorized':
      return (
        <Chip variant="primary" size={size} className="bg-blue-600 text-white font-bold">
          <CheckCircle2 className="w-3 h-3 text-blue-200" />
          Authorized
        </Chip>
      );
    case 'Partial':
      return (
        <Chip variant="warning" size={size} className="font-semibold">
          Partial
        </Chip>
      );
    case 'Failed':
      return (
        <Chip variant="error" size={size} className="font-semibold">
          Failed
        </Chip>
      );
    case 'Refunded':
      return (
        <Chip variant="stone" size={size} className="font-semibold">
          Refunded
        </Chip>
      );
    case 'Pending':
    default:
      return (
        <Chip variant="amber" size={size} className="font-semibold">
          Pending
        </Chip>
      );
  }
};

export const FollowUpBadge: React.FC<{ date?: string | Date }> = ({ date }) => {
  if (!date) return <span className="text-xs text-ember-neutral">No follow-up set</span>;

  const targetDate = new Date(date);
  const now = new Date();

  // Strip time for day comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  const isOverdue = targetStart < todayStart;
  const isToday = targetStart === todayStart;

  const formattedDate = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-semibold bg-red-100 text-red-700 border border-red-300 shadow-sm animate-pulse-subtle">
        <span className="w-2 h-2 rounded-full bg-red-600" />
        <AlertCircle className="w-3 h-3" />
        Overdue: {formattedDate}
      </span>
    );
  }

  if (isToday) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
        <Calendar className="w-3 h-3 text-amber-700" />
        Due Today
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-xs text-stone-600 bg-stone-100 border border-stone-200">
      <Clock className="w-3 h-3 text-stone-400" />
      {formattedDate}
    </span>
  );
};
