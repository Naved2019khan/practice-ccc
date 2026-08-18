'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plane,
  Upload,
  FileText,
  Users,
  Settings,
  CheckSquare,
  LogOut,
  ExternalLink,
  Shield,
  UserCheck,
  Compass,
} from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (onLogout) onLogout();
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Leads Pipeline', href: '/leads', icon: Plane },
    { label: 'Tasks & Todos', href: '/tasks', icon: CheckSquare },
    { label: 'Import Leads', href: '/import', icon: Upload },
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
          <div className="w-9 h-9 rounded-btn bg-ember-primary flex items-center justify-center text-white shadow-primary-glow">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-ember-text-primary leading-tight">
              Ember Flight
            </h1>
            <span className="text-[11px] font-semibold tracking-wider text-ember-neutral uppercase">
              Lead Concierge
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

        {/* Public Pages Quick Access */}
        <div className="pt-5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ember-neutral">
          Public Client Forms
        </div>
        <Link
          href="/contact"
          target="_blank"
          className="flex items-center justify-between px-3.5 py-2 rounded-btn text-xs font-medium text-ember-text-secondary hover:text-ember-text-primary hover:bg-ember-surface transition-all"
        >
          <span>Quote Request Form</span>
          <ExternalLink className="w-3.5 h-3.5 text-ember-neutral" />
        </Link>
        <Link
          href="/newsletter"
          target="_blank"
          className="flex items-center justify-between px-3.5 py-2 rounded-btn text-xs font-medium text-ember-text-secondary hover:text-ember-text-primary hover:bg-ember-surface transition-all"
        >
          <span>Newsletter Capture</span>
          <ExternalLink className="w-3.5 h-3.5 text-ember-neutral" />
        </Link>
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
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-btn text-ember-neutral hover:text-ember-error hover:bg-ember-surface-raised transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
