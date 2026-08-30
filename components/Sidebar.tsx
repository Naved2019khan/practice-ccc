'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plane,
  FileText,
  Users,
  Settings,
  CheckSquare,
  LogOut,
  Shield,
  UserCheck,
  Compass,
  Image as ImageIcon,
  Mail,
} from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { ConfirmDialog } from './ui/ConfirmDialog';

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  avatar?: string;
}

interface SidebarProps {
  user: UserSession | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setShowLogoutConfirm(false);
      if (onLogout) onLogout();
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Leads Pipeline', href: '/leads', icon: Plane },
    { label: 'Tasks & Todos', href: '/tasks', icon: CheckSquare },
    { label: 'Email Templates', href: '/templates', icon: FileText },
    ...(user?.role === 'admin'
      ? [{ label: 'Staff Team', href: '/staff', icon: Users, adminOnly: true }]
      : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-ember-bg border-r border-ember-border flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-ember-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-btn bg-[#072B66] border border-[#FFC107] flex items-center justify-center text-[#FFC107] font-bold text-sm shadow-sm">
            ✈
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-ember-text-primary leading-tight tracking-tight">
              AirlinesConsolidator
            </h1>
            <span className="text-[10px] font-bold tracking-wider text-amber-700 uppercase">
              Flight CRM
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ember-neutral">
          Workspace
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-btn text-sm font-semibold transition-all relative ${
                isActive
                  ? 'bg-ember-surface-raised text-ember-primary'
                  : 'text-ember-text-secondary hover:text-ember-text-primary hover:bg-ember-surface'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-ember-primary rounded-r" />
              )}
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-ember-primary' : 'text-ember-neutral group-hover:text-ember-text-primary'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.adminOnly && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-ember-primary/10 text-ember-primary font-bold">
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3.5 border-t border-ember-border bg-ember-surface/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={user?.name || 'User'} src={user?.avatar} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ember-text-primary truncate">
                {user?.name || 'Guest Agent'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {user?.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ember-primary">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ember-neutral">
                    <UserCheck className="w-3 h-3" /> Staff
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Sign out"
            className="p-1.5 rounded-btn text-ember-neutral hover:text-ember-error hover:bg-ember-surface-raised transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

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
    </aside>
  );
};
