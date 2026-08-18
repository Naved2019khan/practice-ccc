'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Plane,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpDown,
  RefreshCw,
  User,
  Eye,
  Plus,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StageBadge, PaymentBadge, FollowUpBadge, Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';

function LeadsContent() {
  const searchParams = useSearchParams();
  const initialUrgencyFilter = searchParams.get('filter') || '';

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState(
    initialUrgencyFilter === 'overdue'
      ? 'overdue'
      : initialUrgencyFilter === 'today'
      ? 'today'
      : ''
  );

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // 1. Fetch current user
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
        if (meData.user?.role === 'admin') {
          const staffRes = await fetch('/api/staff');
          if (staffRes.ok) {
            const staffData = await staffRes.json();
            setStaffList(staffData.staff || []);
          }
        }
      }

      // 2. Fetch leads with query parameters
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedStage) params.append('stage', selectedStage);
      if (selectedSource) params.append('source', selectedSource);
      if (selectedPayment) params.append('paymentStatus', selectedPayment);
      if (selectedStaff) params.append('staffId', selectedStaff);
      if (selectedUrgency) params.append('urgency', selectedUrgency);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedStage, selectedSource, selectedPayment, selectedStaff, selectedUrgency]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Quick Stage Update handler
  const handleQuickStageChange = async (leadId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l._id === leadId ? { ...l, stage: newStage } : l))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Export
  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (selectedStage) params.append('stage', selectedStage);
    window.open(`/api/leads/export?${params.toString()}`, '_blank');
  };

  return (
    <AppLayout onSearchChange={setSearch}>
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-ember-text-primary">
              Flight Leads Pipeline
            </h1>
            <p className="text-xs text-ember-text-secondary mt-0.5">
              {currentUser?.role === 'admin'
                ? `Managing all ${leads.length} leads across staff`
                : `Managing your assigned leads (${leads.length} total)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleExport('csv')}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('xlsx')}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="col-span-2 md:col-span-1">
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:border-ember-primary"
              />
            </div>

            {/* Stage Filter */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
              >
                <option value="">All Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Quoted">Quoted</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Booked">Booked</option>
                <option value="Ticketed">Ticketed</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            {/* Follow-up Urgency Filter */}
            <div>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
              >
                <option value="">All Follow-ups</option>
                <option value="overdue">🚨 Overdue</option>
                <option value="today">📅 Due Today</option>
                <option value="upcoming">⏳ Upcoming</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
              >
                <option value="">All Payments</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {/* Staff Filter (Admin only) */}
            {currentUser?.role === 'admin' && (
              <div>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
                >
                  <option value="">All Staff</option>
                  <option value="unassigned">Unassigned Only</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-ember-border text-xs">
            <span className="text-ember-neutral text-[11px] font-semibold">Quick Filters:</span>
            <button
              onClick={() => {
                setSelectedStage('');
                setSelectedUrgency('');
                setSelectedPayment('');
                setSelectedStaff('');
                setSearch('');
              }}
              className={`px-2 py-0.5 rounded-chip text-xs font-semibold ${
                !selectedStage && !selectedUrgency && !selectedPayment && !selectedStaff && !search
                  ? 'bg-ember-primary text-white'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
            >
              Reset All
            </button>
            <button
              onClick={() => setSelectedUrgency('overdue')}
              className={`px-2 py-0.5 rounded-chip text-xs font-semibold ${
                selectedUrgency === 'overdue'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              🚨 Overdue Follow-ups
            </button>
            <button
              onClick={() => setSelectedUrgency('today')}
              className={`px-2 py-0.5 rounded-chip text-xs font-semibold ${
                selectedUrgency === 'today'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              📅 Due Today
            </button>
            <button
              onClick={() => setSelectedStage('Ticketed')}
              className={`px-2 py-0.5 rounded-chip text-xs font-semibold ${
                selectedStage === 'Ticketed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              ✅ Ticketed
            </button>
          </div>
        </Card>

        {/* Leads Table */}
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ember-surface-raised border-b border-ember-border text-ember-text-secondary uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Passenger & Contact</th>
                  <th className="py-3 px-4">Flight Route & Dates</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Follow-Up Urgency</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Fare / PNR</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ember-border bg-ember-surface">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ember-neutral">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-ember-primary border-t-transparent animate-spin" />
                        <span>Loading flight leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ember-neutral">
                      <Plane className="w-8 h-8 text-ember-neutral/50 mx-auto mb-2" />
                      <p className="font-semibold text-ember-text-primary">No matching flight leads found</p>
                      <p className="text-[11px] mt-0.5">Try adjusting your filters or create a new lead.</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const travelDateFormatted = lead.travelDate
                      ? new Date(lead.travelDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Date Flexible';

                    return (
                      <tr
                        key={lead._id}
                        className="hover:bg-ember-surface-raised/60 transition-colors group"
                      >
                        {/* Passenger */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/leads/${lead._id}`}
                            className="font-bold text-ember-text-primary hover:text-ember-primary group-hover:underline block"
                          >
                            {lead.name}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-ember-neutral mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-ember-neutral" />
                              {lead.phone}
                            </span>
                            {lead.email && (
                              <span className="truncate max-w-[120px]">{lead.email}</span>
                            )}
                          </div>
                        </td>

                        {/* Route */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ember-text-primary flex items-center gap-1.5">
                            <span>{lead.origin}</span>
                            <span className="text-ember-primary">&rarr;</span>
                            <span>{lead.destination}</span>
                          </div>
                          <div className="text-[11px] text-ember-text-secondary mt-0.5">
                            {travelDateFormatted} &bull; {lead.pax} {lead.pax === 1 ? 'Pax' : 'Pax'}
                          </div>
                        </td>

                        {/* Stage Dropdown */}
                        <td className="py-3 px-4">
                          <select
                            value={lead.stage}
                            onChange={(e) => handleQuickStageChange(lead._id, e.target.value)}
                            className="bg-ember-surface border border-ember-border rounded px-2 py-1 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary cursor-pointer"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Quoted">Quoted</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Booked">Booked</option>
                            <option value="Ticketed">Ticketed</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>

                        {/* Follow-up Urgency Alert */}
                        <td className="py-3 px-4">
                          <FollowUpBadge date={lead.nextFollowUpDate} />
                        </td>

                        {/* Assigned Staff */}
                        <td className="py-3 px-4">
                          {lead.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={lead.assignedTo.name}
                                src={lead.assignedTo.avatar}
                                size="sm"
                              />
                              <span className="font-semibold text-ember-text-primary text-xs truncate max-w-[100px]">
                                {lead.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Payment */}
                        <td className="py-3 px-4">
                          <PaymentBadge status={lead.paymentStatus} size="sm" />
                        </td>

                        {/* Fare / PNR */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-ember-text-primary">
                            {lead.priceQuoted > 0 ? `$${lead.priceQuoted}` : '—'}
                          </div>
                          {lead.pnr && (
                            <span className="font-code text-[11px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {lead.pnr}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Link href={`/leads/${lead._id}`}>
                            <Button size="sm" variant="secondary" className="px-2.5 py-1 text-xs">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ember-bg flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-ember-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}
