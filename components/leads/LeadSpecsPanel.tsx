'use client';

import React from 'react';
import {
  Plane,
  FileText,
  Users,
  Phone,
  Mail,
  CreditCard,
  Edit2,
  User,
  MapPin,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PaymentBadge } from '@/components/ui/Chip';
import { HtmlPnrConverter } from '@/components/leads/HtmlPnrConverter';
import { PassengerList } from '@/components/leads/PassengerList';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { extractRouteFromHtml } from '@/lib/pnrHtmlExtract';
import { BOOKING_TYPES, LEAD_STATUSES, statusTone, bookingTypeShort } from '@/lib/leadOptions';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AED', 'PKR', 'INR', 'SAR'];

/** Renders sanitized PNR itinerary HTML, or a <pre> for non-HTML pastes. */
function PnrPreview({ html }: { html?: string }) {
  if (!html || !html.trim()) {
    return <p className="text-xs text-ember-neutral italic">No itinerary pasted yet.</p>;
  }
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  return (
    <div className="rounded-btn border border-ember-border bg-white p-3 max-h-[420px] overflow-auto shadow-inner">
      {looksLikeHtml ? (
        <>
          <style>{`
            .pnr-html-preview table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; border: 1px solid #e2e8f0; }
            .pnr-html-preview th { background: #f1f5f9; color: #0b3c8a; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8; padding: 8px 10px; text-align: left; vertical-align: middle; white-space: nowrap; }
            .pnr-html-preview td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; color: #1e293b; text-align: left; vertical-align: middle; }
            .pnr-html-preview img { max-height: 28px; max-width: 90px; width: auto; height: auto; vertical-align: middle; display: inline-block; }
            .pnr-html-preview a { color: #0b3c8a; text-decoration: underline; }
          `}</style>
          <div
            className="pnr-html-preview text-xs text-ember-text-primary overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />
        </>
      ) : (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs text-ember-text-primary m-0">{html}</pre>
      )}
    </div>
  );
}

interface LeadSpecsPanelProps {
  lead: any;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  editForm: any;
  setEditForm: (next: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  currentUser: any;
  staffList: any[];
  onReassign: (staffId: string) => void;
}

export const LeadSpecsPanel: React.FC<LeadSpecsPanelProps> = ({
  lead,
  isEditing,
  onStartEdit,
  onCancelEdit,
  editForm,
  setEditForm,
  onSubmit,
  isSaving,
  currentUser,
  staffList,
  onReassign,
}) => {
  const set = (patch: any) => setEditForm({ ...editForm, ...patch });
  const billing = editForm.billing || {};
  const address = billing.address || {};
  const card = billing.card || {};
  const setBilling = (patch: any) => set({ billing: { ...billing, ...patch } });
  const setAddress = (patch: any) => set({ billing: { ...billing, address: { ...address, ...patch } } });
  const setCard = (patch: any) => set({ billing: { ...billing, card: { ...card, ...patch } } });

  const onPnrChange = (html: string) => {
    const { origin, destination } = extractRouteFromHtml(html);
    set({
      pnrHtml: html,
      origin: origin || editForm.origin,
      destination: destination || editForm.destination,
    });
  };

  const onPassengersChange = (passengers: any[]) => {
    const first = passengers[0] || {};
    const name = [first.firstName, first.lastName].filter(Boolean).join(' ');
    set({ passengers, pax: Math.max(1, passengers.length), name });
  };

  // ── EDIT MODE ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <Card elevated className="space-y-3">
        <h3 className="text-sm font-bold font-display text-ember-text-primary">Edit Flight Requirements</h3>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Operational fields */}
          <div className="grid grid-cols-2 gap-2">
            <Select label="Booking Type" value={editForm.bookingType || 'New Booking'} onChange={(e) => set({ bookingType: e.target.value })}>
              {BOOKING_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
            </Select>
            <Select label="Operational Status" value={editForm.status || 'Open'} onChange={(e) => set({ status: e.target.value })}>
              {LEAD_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Price Quoted" type="number" min={0} step="0.01" placeholder="0.00" value={editForm.priceQuoted ?? ''} onChange={(e) => set({ priceQuoted: e.target.value })} />
            <Select label="Currency" value={editForm.currency || 'USD'} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="PNR / Reference" value={editForm.pnr || ''} onChange={(e) => set({ pnr: e.target.value })} />
            <Input label="Airline Ticket #" placeholder="e.g. 016-2490123891" value={editForm.ticketNumber || ''} onChange={(e) => set({ ticketNumber: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Invoice #" value={editForm.invoiceNumber || ''} onChange={(e) => set({ invoiceNumber: e.target.value })} />
            <Select label="Payment Status" value={editForm.paymentStatus || 'Pending'} onChange={(e) => set({ paymentStatus: e.target.value })}>
              {['Pending', 'Authorized', 'Partial', 'Paid', 'Failed', 'Refunded'].map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Agent / Concierge"
              placeholder="e.g. Admin / Concierge Team"
              value={editForm.agentName ?? ''}
              onChange={(e) => set({ agentName: e.target.value })}
            />
            <Input label="Next Follow-Up" type="date" value={editForm.nextFollowUpDate || ''} onChange={(e) => set({ nextFollowUpDate: e.target.value })} />
          </div>

          {/* 1. Flight Detail — HTML PNR converter */}
          <div className="pt-3 border-t border-ember-border space-y-2">
            <div className="flex items-center gap-2">
              <Plane className="w-3.5 h-3.5 text-ember-primary" />
              <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Flight Detail</span>
            </div>
            <HtmlPnrConverter value={String(editForm.pnrHtml ?? '')} onChange={onPnrChange} />
            {(editForm.origin || editForm.destination) && (
              <p className="flex items-center gap-1.5 text-[11px] text-ember-primary font-semibold">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                Route detected: {editForm.origin || '—'} → {editForm.destination || '—'}
              </p>
            )}
          </div>

          {/* 2. Contact Detail — name from first passenger */}
          <div className="pt-3 border-t border-ember-border space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-ember-primary" />
              <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Contact Detail</span>
              {editForm.name && <span className="text-[11px] text-ember-neutral">· {editForm.name}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Phone" type="tel" placeholder="Primary contact phone..." value={editForm.phone || ''} onChange={(e) => set({ phone: e.target.value })} required />
              <Input label="Email" type="email" placeholder="Primary contact email..." value={editForm.email || ''} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>

          {/* 3. Passenger Detail */}
          <div className="pt-3 border-t border-ember-border space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-ember-primary" />
              <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Passenger Detail</span>
            </div>
            <PassengerList
              passengers={
                (editForm.passengers && editForm.passengers.length > 0)
                  ? editForm.passengers
                  : [{ id: `pax_${Date.now()}_0`, firstName: '', middleName: '', lastName: '', type: 'Adult', dob: '', gender: '' }]
              }
              onChange={onPassengersChange}
            />
          </div>

          {/* 4. Card / Billing Detail */}
          <div className="pt-3 border-t border-ember-border space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-ember-primary" />
              <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide">Card / Billing Detail</span>
              <span className="text-[10px] font-semibold text-ember-neutral">Optional</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Billing Email" type="email" placeholder="billing@example.com" value={billing.email || ''} onChange={(e) => setBilling({ email: e.target.value })} />
              <Input label="Billing Phone" type="tel" placeholder="Billing phone..." value={billing.phone || ''} onChange={(e) => setBilling({ phone: e.target.value })} />
            </div>
            <Input label="Address Line 1" placeholder="Street address, P.O. box" value={address.line1 || ''} onChange={(e) => setAddress({ line1: e.target.value })} />
            <Input aria-label="Address line 2" placeholder="Apartment, suite, unit (optional)" value={address.line2 || ''} onChange={(e) => setAddress({ line2: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input label="City" placeholder="e.g. New York" value={address.city || ''} onChange={(e) => setAddress({ city: e.target.value })} />
              <Input label="State / Province" placeholder="e.g. NY" value={address.state || ''} onChange={(e) => setAddress({ state: e.target.value })} />
              <Input label="Postal / ZIP" placeholder="e.g. 10001" value={address.postalCode || ''} onChange={(e) => setAddress({ postalCode: e.target.value })} />
            </div>

            <div className="mt-1 rounded-card border border-ember-border bg-ember-bg/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-ember-primary" />
                <h5 className="text-xs font-bold text-ember-text-primary">Debit / Credit Card</h5>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Card Holder Name" placeholder="Name on card" value={card.holderName || ''} onChange={(e) => setCard({ holderName: e.target.value })} />
                <Input label="Card / Account Number" placeholder="Card number" value={card.number || ''} onChange={(e) => setCard({ number: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Expiry (MM/YY)" placeholder="MM/YY" maxLength={5} value={card.expiry || ''} onChange={(e) => setCard({ expiry: e.target.value })} className="font-code" />
                <Input label="CVV / CVC" type="password" placeholder="CVV" maxLength={4} value={card.cvv || ''} onChange={(e) => setCard({ cvv: e.target.value })} className="font-code tracking-widest" />
              </div>
            </div>
          </div>

          {/* Remark */}
          <div className="pt-3 border-t border-ember-border/60">
            <label className="block text-xs font-bold text-ember-text-primary mb-1">Remark</label>
            <textarea
              rows={2}
              placeholder="e.g. Prefers direct flight, premium economy..."
              value={editForm.remarks || editForm.initialNote || ''}
              onChange={(e) => set({ remarks: e.target.value, initialNote: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface-raised border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium placeholder:text-ember-neutral"
            />
          </div>

          {/* Single Save action */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={isSaving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    );
  }

  // ── VIEW MODE ────────────────────────────────────────────────────────────
  const passengers = lead.passengers || [];
  const followUp = lead.nextFollowUpDate
    ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-4">
      <Card elevated className="space-y-4">
        {/* Header + edit */}
        <div className="flex items-center justify-between pb-3 border-b border-ember-border flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusTone(lead.status)}`}>{lead.status || 'Open'}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ember-primary/10 text-ember-primary border border-ember-primary/20">{bookingTypeShort(lead.bookingType) || 'Booking'}</span>
            <PaymentBadge status={lead.paymentStatus} size="sm" />
          </div>
          <Button size="sm" variant="secondary" onClick={onStartEdit} className="text-xs gap-1.5">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Flight Details</span>
          </Button>
        </div>

        {/* 1. Raw PNR itinerary preview — on TOP */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ember-neutral">
            <FileText className="w-3 h-3 text-ember-primary" />
            <span>Flight Itinerary (PNR)</span>
          </div>
          <PnrPreview html={lead.pnrHtml} />
        </div>

        {/* Route + PNR summary line */}
        <div className="bg-ember-surface-raised p-3.5 rounded-btn space-y-1">
          <div className="flex items-center justify-between font-bold text-sm text-ember-text-primary">
            <span>{lead.origin || '—'}</span>
            <span className="text-ember-primary">&rarr;</span>
            <span>{lead.destination || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-ember-text-secondary">
            <span>{lead.pax || 1} Passenger(s)</span>
            {lead.pnr && <span className="font-mono font-bold text-emerald-800">PNR {lead.pnr}</span>}
          </div>
        </div>

        {/* Booking summary */}
        <div className="space-y-0 text-xs divide-y divide-ember-border/60">
          {[
            { label: 'Quoted Fare', value: lead.priceQuoted > 0 ? `${lead.currency || 'USD'} ${lead.priceQuoted.toLocaleString()}` : 'Not Quoted', highlight: lead.priceQuoted > 0 },
            { label: 'PNR', value: lead.pnr || '—', mono: true, highlight: !!lead.pnr },
            { label: 'Ticket #', value: lead.ticketNumber || '—', mono: true },
            { label: 'Invoice #', value: lead.invoiceNumber || '—', mono: true },
            { label: 'Agent / Concierge', value: lead.agentName || (lead.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo.name : '') || 'Concierge Team' },
            { label: 'Payment', value: lead.paymentStatus },
            { label: 'Next Follow-Up', value: followUp },
          ].map(({ label, value, mono, highlight }: any) => (
            <div key={label} className="flex items-center justify-between py-1.5">
              <span className="text-ember-neutral">{label}:</span>
              <span className={`font-semibold ${mono ? 'font-mono' : ''} ${highlight ? 'text-ember-primary' : 'text-ember-text-primary'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Passenger details */}
        <div className="pt-3 border-t border-ember-border space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-ember-neutral" />
            <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">
              Passenger Details{passengers.length > 0 && <span className="ml-1 text-ember-primary">({passengers.length})</span>}
            </span>
          </div>
          {passengers.length === 0 ? (
            <p className="text-xs text-ember-neutral italic">No passengers recorded.</p>
          ) : (
            passengers.map((pax: any, idx: number) => (
              <div key={pax.id || idx} className="rounded-btn border border-ember-border overflow-hidden text-xs">
                <div className="flex items-center justify-between px-3 py-1.5 bg-ember-primary/10 border-b border-ember-border/60">
                  <span className="font-bold text-ember-primary">Passenger {idx + 1}{idx === 0 ? ' (Lead)' : ''}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-ember-primary/10 text-ember-primary border border-ember-primary/20 rounded">{pax.type || 'Adult'}</span>
                </div>
                <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Full Name</span>
                    <span className="font-bold text-ember-text-primary text-sm">
                      {[pax.firstName, pax.middleName, pax.lastName].filter(Boolean).join(' ') || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Date of Birth</span>
                    <span className="font-semibold text-ember-text-primary">
                      {pax.dob ? new Date(pax.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-ember-neutral italic font-normal">—</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-ember-neutral block mb-0.5">Gender</span>
                    <span className="font-semibold text-ember-text-primary">{pax.gender || <span className="text-ember-neutral italic font-normal">—</span>}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Contact detail */}
        <div className="pt-3 border-t border-ember-border space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-ember-neutral" />
            <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">Contact Detail</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Phone className="w-3 h-3 text-ember-neutral shrink-0" />
            <a href={`tel:${lead.phone}`} className="font-semibold text-ember-text-primary hover:text-ember-primary">{lead.phone || '—'}</a>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Mail className="w-3 h-3 text-ember-neutral shrink-0" />
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="font-semibold text-ember-text-primary hover:text-ember-primary">{lead.email}</a>
            ) : (
              <span className="text-ember-neutral italic">No email on file</span>
            )}
          </div>
        </div>

        {/* Assigned agent */}
        <div className="pt-3 border-t border-ember-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ember-neutral">Assigned Agent</span>
            {currentUser?.role === 'admin' && <span className="text-[10px] text-ember-primary font-bold">Admin Reassign</span>}
          </div>
          {currentUser?.role === 'admin' ? (
            <select
              value={lead.assignedTo?._id || ''}
              onChange={(e) => onReassign(e.target.value)}
              className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2 text-xs font-semibold text-ember-text-primary focus:outline-none focus:border-ember-primary"
            >
              <option value="">Unassigned</option>
              {staffList.filter((s) => s.active).map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2.5 p-2 bg-ember-surface-raised rounded-btn border border-ember-border/60">
              <div className="w-7 h-7 rounded-full bg-ember-primary/10 text-ember-primary flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-ember-text-primary">{lead.assignedTo?.name || 'Unassigned'}</p>
                <p className="text-[11px] text-ember-neutral">{lead.assignedTo?.email || '—'}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
