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
  MessageSquare,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StageBadge, PaymentBadge, FollowUpBadge, Chip } from '@/components/ui/Chip';
import {
  BOOKING_TYPES,
  LEAD_STATUSES,
  DEFAULT_BOOKING_TYPE,
  DEFAULT_LEAD_STATUS,
  bookingTypeShort,
  statusTone,
} from '@/lib/leadOptions';
import { LeadEmailComposerModal } from '@/components/leads/LeadEmailComposerModal';
import { useToast } from '@/context/ToastContext';

function LeadsContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const initialUrgencyFilter = searchParams.get('filter') || '';

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [emailModalLead, setEmailModalLead] = useState<any | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedBookingType, setSelectedBookingType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
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
      if (selectedBookingType) params.append('bookingType', selectedBookingType);
      if (selectedStatus) params.append('status', selectedStatus);
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
  }, [
    selectedStage,
    selectedBookingType,
    selectedStatus,
    selectedSource,
    selectedPayment,
    selectedStaff,
    selectedUrgency,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Inline row edit — PATCHes one or more fields and mirrors them into local
   * state so the dropdown doesn't snap back while the request is in flight.
   * On failure the row is reverted to what the server still holds.
   */
  const handleQuickUpdate = async (leadId: string, patch: Record<string, string>) => {
    const previous = leads.find((l) => l._id === leadId);
    setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, ...patch } : l)));

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      const fieldKey = Object.keys(patch)[0];
      const val = patch[fieldKey];
      toast.success('Lead Updated', `Updated ${fieldKey} to "${val}".`);
    } catch (e: any) {
      console.error(e);
      toast.error('Update Failed', e.message || 'Could not update lead');
      if (previous) {
        setLeads((prev) => prev.map((l) => (l._id === leadId ? previous : l)));
      }
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
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
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

            {/* Booking Type Filter */}
            <div>
              <select
                value={selectedBookingType}
                onChange={(e) => setSelectedBookingType(e.target.value)}
                className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
              >
                <option value="">All Booking Types</option>
                {BOOKING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
                <option value="Authorized">Authorized</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
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
                setSelectedBookingType('');
                setSelectedStatus('');
                setSelectedUrgency('');
                setSelectedPayment('');
                setSelectedStaff('');
                setSearch('');
              }}
              className={`px-2 py-0.5 rounded-chip text-xs font-semibold ${
                !selectedStage &&
                !selectedBookingType &&
                !selectedStatus &&
                !selectedUrgency &&
                !selectedPayment &&
                !selectedStaff &&
                !search
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
                <tr className="bg-ember-surface-raised border-b-2 border-ember-border text-ember-text-primary uppercase text-[11px] tracking-wider font-bold">
                  <th className="py-3.5 px-5">Passenger & Contact</th>
                  <th className="py-3.5 px-5">Flight Route & Dates</th>
                  <th className="py-3.5 px-5">Booking Type</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Stage</th>
                  <th className="py-3.5 px-5">Follow-Up</th>
                  <th className="py-3.5 px-5">Agent</th>
                  <th className="py-3.5 px-5">Payment</th>
                  <th className="py-3.5 px-5">Fare</th>
                  <th className="py-3.5 px-5">PNR / Ticket</th>
                  <th className="py-3.5 px-5 text-center" title="Notes & Comments">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-ember-neutral" />
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ember-border bg-ember-surface">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-14 text-center text-ember-neutral">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-ember-primary border-t-transparent animate-spin" />
                        <span className="text-sm">Loading flight leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-14 text-center text-ember-neutral">
                      <Plane className="w-8 h-8 text-ember-neutral/50 mx-auto mb-2" />
                      <p className="font-semibold text-ember-text-primary">No matching flight leads found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or create a new lead.</p>
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
                        className="hover:bg-ember-surface-raised/60 transition-colors group border-b border-ember-border/50 last:border-b-0"
                      >
                        {/* Passenger */}
                        <td className="py-4 px-5">
                          <Link
                            href={`/leads/${lead._id}`}
                            className="font-bold text-[13px] text-ember-text-primary hover:text-ember-primary group-hover:underline block leading-tight"
                          >
                            {lead.name}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-ember-text-secondary mt-1">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          </div>
                          {lead.email && (
                            <div className="text-xs text-ember-text-secondary mt-0.5 truncate max-w-[160px]">
                              {lead.email}
                            </div>
                          )}
                          {lead.customerPortal?.lastSentAt && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {lead.customerPortal?.viewCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  Opened ({lead.customerPortal.viewCount})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  ✉️ Emailed
                                </span>
                              )}
                              {lead.customerPortal?.lastViewedIp && (
                                <span
                                  className="text-[10px] font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200"
                                  title={`Visitor Device: ${lead.customerPortal?.lastViewedDevice || 'Unknown'}`}
                                >
                                  IP: {lead.customerPortal.lastViewedIp}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Route */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-[13px] text-ember-text-primary flex items-center gap-1.5">
                            <span>{lead.origin}</span>
                            <Plane className="w-3.5 h-3.5 text-ember-primary rotate-90" />
                            <span>{lead.destination}</span>
                          </div>
                          <div className="text-xs text-ember-text-secondary mt-1">
                            {travelDateFormatted}
                          </div>
                          <div className="text-xs text-ember-text-secondary">
                            {lead.pax} Passenger{lead.pax !== 1 ? 's' : ''}
                          </div>
                        </td>

                        {/* Booking Type Dropdown */}
                        <td className="py-4 px-5">
                          <select
                            value={lead.bookingType || DEFAULT_BOOKING_TYPE}
                            onChange={(e) =>
                              handleQuickUpdate(lead._id, { bookingType: e.target.value })
                            }
                            title={lead.bookingType || DEFAULT_BOOKING_TYPE}
                            className="max-w-[150px] bg-ember-surface border border-ember-border rounded px-2 py-1.5 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary cursor-pointer"
                          >
                            {BOOKING_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {bookingTypeShort(t)}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Status Dropdown */}
                        <td className="py-4 px-5">
                          <select
                            value={lead.status || DEFAULT_LEAD_STATUS}
                            onChange={(e) =>
                              handleQuickUpdate(lead._id, { status: e.target.value })
                            }
                            className={`max-w-[150px] border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-ember-primary cursor-pointer ${statusTone(
                              lead.status || DEFAULT_LEAD_STATUS
                            )}`}
                          >
                            {LEAD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Stage Dropdown */}
                        <td className="py-4 px-5">
                          <select
                            value={lead.stage}
                            onChange={(e) => handleQuickUpdate(lead._id, { stage: e.target.value })}
                            className="bg-ember-surface border border-ember-border rounded px-2 py-1.5 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary cursor-pointer"
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
                        <td className="py-4 px-5">
                          <FollowUpBadge date={lead.nextFollowUpDate} />
                        </td>

                        {/* Assigned Staff */}
                        <td className="py-4 px-5">
                          {lead.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-semibold text-ember-text-primary text-xs truncate max-w-[130px]">
                                {lead.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold inline-block">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Payment */}
                        <td className="py-4 px-5">
                          <PaymentBadge status={lead.paymentStatus} size="sm" />
                        </td>

                        {/* Fare */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-[13px] text-ember-text-primary">
                            {lead.priceQuoted > 0 ? `$${lead.priceQuoted.toLocaleString()}` : '—'}
                          </div>
                        </td>

                        {/* PNR / Ticket */}
                        <td className="py-4 px-5">
                          {lead.pnr ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold uppercase text-emerald-700">PNR</span>
                                <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 tracking-widest">
                                  {lead.pnr}
                                </span>
                              </div>
                              {lead.ticketNumber && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold uppercase text-stone-500">TKT</span>
                                  <span className="font-mono text-[11px] text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                                    {lead.ticketNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-ember-neutral/60">—</span>
                          )}
                        </td>

                        {/* Comment Count */}
                        <td className="py-4 px-5 text-center">
                          <Link href={`/leads/${lead._id}?tab=comments`} className="inline-block group/c">
                            {(() => {
                              const total = (lead.comments || []).reduce(
                                (acc: number, c: any) => acc + 1 + (c.replies?.length || 0),
                                0
                              );
                              return total > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs group-hover/c:bg-blue-100 group-hover/c:border-blue-300 transition-all shadow-xs">
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{total}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-stone-300 group-hover/c:text-stone-500 text-xs transition-colors">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">0</span>
                                </span>
                              );
                            })()}
                          </Link>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEmailModalLead(lead)}
                              className="px-2 py-1.5 text-xs text-ember-primary border-ember-primary/30 hover:bg-ember-primary/10"
                              title="Email Customer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline ml-1">Email</span>
                            </Button>
                            <Link href={`/leads/${lead._id}`}>
                              <Button size="sm" variant="secondary" className="px-2.5 py-1.5 text-xs">
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>
                            </Link>
                          </div>
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

      {/* Quick Email Customer Modal */}
      {emailModalLead && (
        <LeadEmailComposerModal
          isOpen={Boolean(emailModalLead)}
          onClose={() => setEmailModalLead(null)}
          lead={emailModalLead}
          onEmailSent={() => {
            fetchLeads();
          }}
        />
      )}
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
