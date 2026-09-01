'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plane,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Users,
  DollarSign,
  ArrowRight,
  Clock,
  ExternalLink,
  Shield,
  Activity,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StageBadge, FollowUpBadge, PaymentBadge } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [urgentLeads, setUrgentLeads] = useState<any[]>([]);
  const [staffMetrics, setStaffMetrics] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Get Me
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      // 2. Get Summary Counts
      const sumRes = await fetch('/api/leads?summary=true');
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData.counts);
      }

      // 3. Get Urgent Leads (Overdue + Due Today)
      const urgentRes = await fetch('/api/leads');
      if (urgentRes.ok) {
        const leadsData = await urgentRes.json();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

        const urgent = (leadsData.leads || []).filter((l: any) => {
          if (!l.nextFollowUpDate || l.stage === 'Ticketed' || l.stage === 'Lost') return false;
          const fTime = new Date(l.nextFollowUpDate).getTime();
          return fTime < tomorrowStart; // Overdue or today
        });
        setUrgentLeads(urgent.slice(0, 6));
      }

      // 4. If Admin, fetch staff metrics
      const staffRes = await fetch('/api/staff');
      if (staffRes.ok) {
        const sData = await staffRes.json();
        setStaffMetrics(sData.staff || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stagesList = [
    { key: 'New', label: 'New Inquiries', color: '#F59E0B' },
    { key: 'Contacted', label: 'Contacted', color: '#78716C' },
    { key: 'Quoted', label: 'Quoted', color: '#D97706' },
    { key: 'Negotiation', label: 'Negotiation', color: '#C2410C' },
    { key: 'Booked', label: 'Booked', color: '#0D9488' },
    { key: 'Ticketed', label: 'Ticketed / Won', color: '#16A34A' },
    { key: 'Lost', label: 'Lost', color: '#DC2626' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-ember-text-primary">
              Good day, {currentUser?.name || 'Agent'}
            </h1>
            <p className="text-xs text-ember-text-secondary mt-1">
              {currentUser?.role === 'admin'
                ? 'CRM Overview & Team Performance Dashboard'
                : 'Your Assigned Leads Pipeline & Today’s Follow-up Actions'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/leads">
              <Button size="sm" variant="secondary" className="gap-1.5">
                <Plane className="w-3.5 h-3.5" />
                <span>View Full Pipeline</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Leads */}
          <Card elevated className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ember-neutral uppercase tracking-wider">
                Total Leads
              </span>
              <div className="w-8 h-8 rounded-btn bg-ember-primary/10 text-ember-primary flex items-center justify-center">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-display text-ember-text-primary">
              {summary?.total || 0}
            </div>
            <p className="text-[11px] text-ember-text-secondary">
              <span className="font-semibold text-emerald-700">+{summary?.newToday || 0}</span> new today
            </p>
          </Card>

          {/* Card 2: Overdue Follow-ups */}
          <Card elevated className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ember-neutral uppercase tracking-wider">
                Overdue Follow-ups
              </span>
              <div className="w-8 h-8 rounded-btn bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-display text-red-600">
              {summary?.overdue || 0}
            </div>
            <p className="text-[11px] text-ember-text-secondary">Requires urgent client contact</p>
          </Card>

          {/* Card 3: Due Today */}
          <Card elevated className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ember-neutral uppercase tracking-wider">
                Due Today
              </span>
              <div className="w-8 h-8 rounded-btn bg-amber-100 text-amber-800 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-display text-amber-700">
              {summary?.dueToday || 0}
            </div>
            <p className="text-[11px] text-ember-text-secondary">Scheduled calls & quotes</p>
          </Card>

          {/* Card 4: Booked Revenue */}
          <Card elevated className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ember-neutral uppercase tracking-wider">
                Ticketed Value
              </span>
              <div className="w-8 h-8 rounded-btn bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700">
              ${(summary?.bookedRevenue || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-ember-text-secondary">
              Conversion Rate: <span className="font-bold text-ember-text-primary">{summary?.conversionRate || 0}%</span>
            </p>
          </Card>
        </div>

        {/* Pipeline Stage Distribution & Urgent Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage Funnel Bar (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-display text-ember-text-primary">
                Flight Pipeline Funnel
              </h2>
              <span className="text-xs text-ember-neutral font-semibold">
                {summary?.total || 0} Total in Pipeline
              </span>
            </div>

            <Card className="space-y-3">
              <div className="space-y-2.5">
                {stagesList.map((st) => {
                  const count = summary?.stages?.[st.key] || 0;
                  const total = summary?.total || 1;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={st.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: st.color }}
                          />
                          <span className="font-semibold text-ember-text-primary">{st.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ember-text-primary">{count} leads</span>
                          <span className="text-ember-neutral text-[11px]">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: st.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Urgent Follow-ups Queue (1 Col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-display text-ember-text-primary">
                Urgent Follow-ups
              </h2>
              <Link href="/leads?filter=overdue" className="text-xs text-ember-primary font-semibold hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2.5">
              {urgentLeads.length === 0 ? (
                <Card className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-ember-text-primary">All caught up!</p>
                  <p className="text-[11px] text-ember-neutral mt-0.5">No overdue follow-ups right now.</p>
                </Card>
              ) : (
                urgentLeads.map((lead) => (
                  <Link key={lead._id} href={`/leads/${lead._id}`}>
                    <Card
                      elevated
                      className="p-3 hover:border-ember-primary transition-all group cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ember-text-primary group-hover:text-ember-primary truncate">
                            {lead.name}
                          </p>
                          <p className="text-[11px] text-ember-text-secondary truncate">
                            {lead.origin} &rarr; {lead.destination}
                          </p>
                        </div>
                        <StageBadge stage={lead.stage} size="sm" />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-ember-border text-[11px]">
                        <FollowUpBadge date={lead.nextFollowUpDate} />
                        {Number(lead.totalAmount) > 0 && (
                          <span className="font-bold text-ember-text-primary">
                            ${Number(lead.totalAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Admin Section: Staff Team Performance */}
        {currentUser?.role === 'admin' && staffMetrics.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-ember-primary" />
                <h2 className="text-base font-bold font-display text-ember-text-primary">
                  Staff Performance Leaderboard
                </h2>
              </div>
              <Link href="/staff" className="text-xs text-ember-primary font-semibold hover:underline">
                Manage Staff Team &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {staffMetrics.map((staff) => (
                <Card key={staff._id} elevated className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={staff.name} src={staff.avatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-ember-text-primary truncate">{staff.name}</p>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            staff.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {staff.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-[11px] text-ember-neutral truncate">{staff.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-ember-border text-center">
                    <div>
                      <span className="text-[10px] text-ember-neutral block">Assigned</span>
                      <span className="text-sm font-bold text-ember-text-primary">{staff.totalLeads}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ember-neutral block">Active</span>
                      <span className="text-sm font-bold text-amber-700">{staff.activeLeads}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ember-neutral block">Win Rate</span>
                      <span className="text-sm font-bold text-emerald-700">{staff.conversionRate}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
