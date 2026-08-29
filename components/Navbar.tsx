'use client';

import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Calendar, Plus, LogOut, User as UserIcon, Shield, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { UserSession } from './Sidebar';

interface NavbarProps {
  user?: UserSession | null;
  onSearchChange?: (val: string) => void;
  onNewLeadClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSearchChange, onNewLeadClick }) => {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setShowLogoutConfirm(false);
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-ember-border bg-ember-bg/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 gap-4">
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

          {/* Top Profile & Sign Out Button */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-ember-border">
              {/* Profile Card */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-ember-surface rounded-btn border border-ember-border">
                <div className="w-6 h-6 rounded-full bg-ember-primary/10 text-ember-primary flex items-center justify-center font-bold text-[10px]">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-ember-text-primary leading-none truncate max-w-[110px]">
                    {user.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {user.role === 'admin' ? (
                      <span className="text-[10px] font-bold text-ember-primary flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-ember-neutral flex items-center gap-0.5">
                        <UserCheck className="w-2.5 h-2.5" /> Staff
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-ember-neutral hover:text-red-600 hover:border-red-300 hover:bg-red-50 gap-1 text-xs px-2.5 py-1.5"
                title="Sign out of CRM"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Sign Out Confirmation Modal Popup */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out Confirmation"
        description="Are you sure you want to log out of Airlines Consolidator CRM?"
        confirmLabel="Yes, Sign Out"
        cancelLabel="Stay Signed In"
        variant="destructive"
        isLoading={isLoggingOut}
      />
    </>
  );
};
