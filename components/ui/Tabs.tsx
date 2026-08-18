'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={twMerge('flex border-b border-ember-border gap-2 overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all relative whitespace-nowrap cursor-pointer',
              isActive
                ? 'text-ember-primary border-b-2 border-ember-primary -mb-px'
                : 'text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised/60 rounded-t-btn'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'text-xs px-1.5 py-0.5 rounded-chip font-bold',
                  isActive ? 'bg-ember-primary/10 text-ember-primary' : 'bg-stone-200 text-stone-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
