'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, UserSession } from './Sidebar';
import { Navbar } from './Navbar';
import { NewLeadDrawer } from './leads/NewLeadDrawer';

export interface AppLayoutProps {
  children: React.ReactNode;
  onSearchChange?: (val: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onSearchChange }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewLeadDrawerOpen, setIsNewLeadDrawerOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);

      // If admin, fetch staff for assignment dropdown
      if (data.user?.role === 'admin') {
        const staffRes = await fetch('/api/staff');
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaffList(staffData.staff || []);
        }
      }
    } catch (e) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const closeNewLeadDrawer = useCallback(() => setIsNewLeadDrawerOpen(false), []);

  const handleLeadCreated = useCallback(() => {
    router.refresh();
    if (window.location.pathname === '/leads' || window.location.pathname === '/dashboard') {
      window.location.reload();
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ember-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-ember-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-ember-neutral">Loading Ember CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-ember-bg">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onSearchChange={onSearchChange}
          onNewLeadClick={() => setIsNewLeadDrawerOpen(true)}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Global Manual Add Lead Drawer. Owns its own form state so typing in it
          doesn't re-render the sidebar, navbar and page tree. */}
      <NewLeadDrawer
        isOpen={isNewLeadDrawerOpen}
        onClose={closeNewLeadDrawer}
        user={user}
        staffList={staffList}
        onCreated={handleLeadCreated}
      />
    </div>
  );
};
