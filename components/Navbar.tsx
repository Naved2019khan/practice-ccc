'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, AlertTriangle, Calendar, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/Button';

interface NavbarProps {
  onSearchChange?: (val: string) => void;
  onNewLeadClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchChange, onNewLeadClick }) => {
  const [urgentCounts, setUrgentCounts] = useState<{ overdue: number; today: number }>({
    overdue: 0,
    today: 0,
  });

  const fetchUrgentCounts = async () => {
    try {
      const res = await fetch('/api/leads?summary=true');
      const data = await res.json();
      if (data.counts) {
        setUrgentCounts({
          overdue: data.counts.overdue || 0,
          today: data.counts.dueToday || 0,
        });
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchUrgentCounts();
    const interval = setInterval(fetchUrgentCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-ember-border bg-ember-bg/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-ember-neutral absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by passenger, phone, email, route, PNR..."
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          className="w-full bg-ember-surface border border-ember-border rounded-input pl-10 pr-4 py-2 text-xs text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:border-ember-primary focus:ring-2 focus:ring-ember-primary/15 transition-all"
        />
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* Urgent Follow-Up Alerts */}
        <div className="flex items-center gap-2">
          {urgentCounts.overdue > 0 && (
            <Link
              href="/leads?filter=overdue"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-xs font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm hover:bg-red-200 transition-colors animate-pulse-subtle"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>{urgentCounts.overdue} Overdue</span>
            </Link>
          )}

          {urgentCounts.today > 0 && (
            <Link
              href="/leads?filter=today"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm hover:bg-amber-200 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>{urgentCounts.today} Due Today</span>
            </Link>
          )}
        </div>

        {/* Quick Add Lead Button */}
        {onNewLeadClick && (
          <Button size="sm" onClick={onNewLeadClick} className="gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>New Flight Lead</span>
          </Button>
        )}
      </div>
    </header>
  );
};
