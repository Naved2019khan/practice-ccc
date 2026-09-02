'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  User as UserIcon,
  Plane,
  Wallet,
  CreditCard,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Users,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { FormSection } from '@/components/ui/FormSection';
import { FormRow } from '@/components/ui/FormRow';
import { PhoneField } from '@/components/ui/PhoneField';
import { CardNumberInput } from '@/components/ui/CardNumberInput';
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry, getDialCode } from '@/lib/countries';
import { HtmlPnrConverter } from '@/components/leads/HtmlPnrConverter';
import { extractRouteFromHtml } from '@/lib/pnrHtmlExtract';
import { PassengerList } from '@/components/leads/PassengerList';
import {
  BOOKING_TYPES,
  DEFAULT_BOOKING_TYPE,
  LEAD_STATUSES,
  DEFAULT_LEAD_STATUS,
} from '@/lib/leadOptions';
import { useToast } from '@/context/ToastContext';
import {
  validateLeadForm,
  firstErrorKey,
  formatExpiry,
  digitsOnly,
  lettersAndSpacesOnly,
  detectCardBrand,
  cvvLength,
  hasCardInput,
  formatDateOnly,
  type LeadFormValues,
  type BillingFormValues,
  type CardFormValues,
} from '@/lib/validation';

export interface NewLeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Signed-in user; drives the "Assign to Staff" control. */
  user: { name?: string; role?: string } | null;
  staffList: any[];
  /** Called after a successful create, with the created lead. */
  onCreated?: (lead: any) => void;
}

// ── Confirmation modal ────────────────────────────────────────────────────────

interface ConfirmLeadModalProps {
  isOpen: boolean;
  form: LeadFormValues;
  isSubmitting: boolean;
  submitError: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmLeadModal({ isOpen, form, isSubmitting, submitError, onConfirm, onCancel }: ConfirmLeadModalProps) {
  const passengers = Array.isArray(form.passengers) ? form.passengers : [];
  const paxCount = Number(form.pax ?? passengers.length ?? 1);
  const dial = getDialCode(form.phoneDialCode);
  const hasItinerary = Boolean(form.pnrHtml && String(form.pnrHtml).trim());

  const formatDob = (dob?: string) => formatDateOnly(dob) || '—';

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: 'Route',
      value:
        form.origin && form.destination
          ? `${form.origin}  →  ${form.destination}`
          : form.origin || form.destination || 'Not detected from itinerary',
    },
    {
      icon: <UserIcon className="w-3.5 h-3.5" />,
      label: 'Contact',
      value: [`${dial} ${form.phone ?? ''}`.trim(), form.email].filter(Boolean).join('  ·  ') || '—',
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Passengers',
      value: `${paxCount} ${paxCount === 1 ? 'traveller' : 'travellers'}`,
    },
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: 'Itinerary',
      value: hasItinerary ? 'PNR itinerary attached' : 'No itinerary pasted',
    },
    ...(() => {
      const total =
        form.totalAmount !== undefined && String(form.totalAmount) !== ''
          ? Number(form.totalAmount)
          : (Number(form.airlineCharge) || 0) + (Number(form.airlineConsolidatorCharge) || 0);
      return total
        ? [{ icon: <span className="text-[11px] font-bold">$</span>, label: 'Total', value: `$${total.toLocaleString()}` }]
        : [];
    })(),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Confirm New Lead"
      description="Review the details below before creating this flight lead."
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Summary table */}
        <div className="rounded-xl border border-ember-border overflow-hidden">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-start gap-3 px-4 py-3 ${
                i < rows.length - 1 ? 'border-b border-ember-border' : ''
              } ${i % 2 === 0 ? 'bg-ember-surface' : 'bg-ember-bg/40'}`}
            >
              <span className="mt-0.5 text-ember-neutral shrink-0">{row.icon}</span>
              <span className="text-xs text-ember-neutral w-24 shrink-0">{row.label}</span>
              <span className="text-xs font-semibold text-ember-text-primary break-words">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Passenger details */}
        {passengers.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ember-neutral">
              <Users className="w-3 h-3 text-ember-primary" />
              <span>Passenger Details</span>
            </div>
            <div className="rounded-xl border border-ember-border overflow-hidden divide-y divide-ember-border">
              {passengers.slice(0, paxCount).map((p: any, i: number) => (
                <div key={p.id || i} className="px-3 py-2 bg-ember-surface flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ember-text-primary break-words">
                      {[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || `Passenger ${i + 1}`}
                    </p>
                    <p className="text-[11px] text-ember-neutral">
                      {formatDob(p.dob)} · {p.gender || '—'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
                    {p.type || 'Adult'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking, stage & status pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-ember-surface-raised text-ember-text-secondary border border-ember-border">
            Booking: {form.bookingType}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
            Stage: {form.stage}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-ember-surface-raised text-ember-text-secondary border border-ember-border">
            Status: {form.status}
          </span>
          {form.initialNote && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Note attached
            </span>
          )}
        </div>

        {/* API error */}
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Go back & edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isSubmitting}
            className="gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirm & Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const EMPTY_CARD: CardFormValues = { holderName: '', number: '', expiry: '', cvv: '' };

const EMPTY_BILLING: BillingFormValues = {
  email: '',
  phoneDialCode: DEFAULT_COUNTRY_CODE,
  phone: '',
  alternatePhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  countryCode: DEFAULT_COUNTRY_CODE,
  card: EMPTY_CARD,
};

/** Sentinel for the "Unassigned" choice, distinct from '' (auto-assign). */
const UNASSIGNED_VALUE = '__UNASSIGNED__';

const EMPTY_FORM: LeadFormValues = {
  name: '',
  phoneDialCode: DEFAULT_COUNTRY_CODE,
  phone: '',
  email: '',
  source: 'Website',
  origin: '',
  destination: '',
  travelDate: '',
  returnDate: '',
  pax: 1,
  tripType: 'Round Trip',
  bookingType: DEFAULT_BOOKING_TYPE,
  stage: 'New',
  status: DEFAULT_LEAD_STATUS,
  assignedTo: UNASSIGNED_VALUE,
  airlineCharge: '',
  airlineConsolidatorCharge: '',
  totalAmount: '',
  pricingDisplayMode: 'total',
  nextFollowUpDate: '',
  initialNote: '',
  pnrHtml: '',
  billing: EMPTY_BILLING,
};

/**
 * Manual lead capture. Owns its own form state so typing here doesn't re-render
 * the app shell around it.
 */
export const NewLeadDrawer: React.FC<NewLeadDrawerProps> = ({
  isOpen,
  onClose,
  user,
  staffList,
  onCreated,
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState<LeadFormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Keyed by the same dotted paths `validateLeadForm` reports, so a failed
  // submit can focus the offending control.
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const registerField = (key: string) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  // Derived, not stored — no chance of errors going stale against the values.
  const errors = useMemo(() => validateLeadForm(form), [form]);
  const billing = form.billing ?? EMPTY_BILLING;
  const card = billing.card ?? EMPTY_CARD;
  const cardBrand = detectCardBrand(String(card.number ?? ''));

  /** Errors stay hidden until the field is blurred or the form is submitted. */
  const errorFor = (key: string) =>
    touched[key] || submitAttempted ? errors[key] : undefined;

  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  const setField = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /**
   * Update one of the two charge fields and refresh the running total to their
   * sum. The total remains directly editable afterward for manual overrides.
   */
  const onChargeChange = (
    key: 'airlineCharge' | 'airlineConsolidatorCharge',
    value: string
  ) =>
    setForm((f) => {
      const airline = key === 'airlineCharge' ? value : String(f.airlineCharge ?? '');
      const consolidator =
        key === 'airlineConsolidatorCharge' ? value : String(f.airlineConsolidatorCharge ?? '');
      const sum = (Number(airline) || 0) + (Number(consolidator) || 0);
      return {
        ...f,
        [key]: value,
        totalAmount: sum ? String(sum) : '',
      };
    });

  /**
   * Store the pasted itinerary HTML and derive the route from it, so the leads
   * table can show origin → destination without the user typing them.
   */
  const handlePnrHtmlChange = (html: string) => {
    const { origin, destination } = extractRouteFromHtml(html);
    setForm((f) => ({
      ...f,
      pnrHtml: html,
      // Only overwrite when we actually found codes; keeps any manual value.
      origin: origin || f.origin,
      destination: destination || f.destination,
    }));
  };

  /** Keep pax count and the derived lead `name` (from passenger[0]) in sync. */
  const handlePassengersChange = (passengers: any[]) => {
    const first = passengers[0] || {};
    const derivedName = [first.firstName, first.lastName].filter(Boolean).join(' ');
    setForm((f) => ({
      ...f,
      passengers,
      pax: Math.max(1, passengers.length),
      name: derivedName,
    }));
  };

  const setBilling = (patch: Partial<BillingFormValues>) =>
    setForm((f) => ({ ...f, billing: { ...(f.billing ?? EMPTY_BILLING), ...patch } }));

  const setCard = (patch: Partial<CardFormValues>) =>
    setForm((f) => {
      const b = f.billing ?? EMPTY_BILLING;
      return { ...f, billing: { ...b, card: { ...(b.card ?? EMPTY_CARD), ...patch } } };
    });

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setTouched({});
    setSubmitAttempted(false);
    setSubmitError(null);
    setShowConfirm(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  /** Step 1 — validate the form; if clean, open the confirmation modal. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);

    const validationErrors = validateLeadForm(form);
    if (Object.keys(validationErrors).length > 0) {
      const first = firstErrorKey(validationErrors);
      if (first && fieldRefs.current[first]) {
        fieldRefs.current[first]?.focus();
      }
      toast.warning('Incomplete Form', 'Please correct the highlighted fields before submitting.');
      return;
    }

    // Validation passed — show confirmation modal instead of hitting the API.
    setShowConfirm(true);
  };

  /** Step 2 — user confirmed; now actually create the lead. */
  const handleConfirmedCreate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const dial = getDialCode(form.phoneDialCode);
      const country = getCountry(billing.countryCode);

      const payload = {
        name: form.name,
        phone: `${dial} ${form.phone}`.trim(),
        email: form.email,
        source: form.source,
        origin: form.origin,
        destination: form.destination,
        travelDate: form.travelDate || undefined,
        returnDate: form.tripType === 'One Way' ? undefined : form.returnDate || undefined,
        pax: form.pax,
        passengers: form.passengers,
        flightLegs: form.flightLegs,
        multiCityRoutes: form.multiCityRoutes,
        tripType: form.tripType,
        bookingType: form.bookingType,
        stage: form.stage,
        status: form.status,
        pnrHtml: form.pnrHtml || '',
        assignedTo:
          form.assignedTo === UNASSIGNED_VALUE
            ? null
            : form.assignedTo || undefined,
        airlineCharge: form.airlineCharge || 0,
        airlineConsolidatorCharge: form.airlineConsolidatorCharge || 0,
        totalAmount:
          form.totalAmount !== undefined && String(form.totalAmount) !== ''
            ? form.totalAmount
            : (Number(form.airlineCharge) || 0) + (Number(form.airlineConsolidatorCharge) || 0),
        pricingDisplayMode: form.pricingDisplayMode || 'total',
        nextFollowUpDate: form.nextFollowUpDate || undefined,
        initialNote: form.initialNote,
        billing: {
          email: billing.email,
          phoneDialCode: getDialCode(billing.phoneDialCode),
          phoneCountryCode: billing.phoneDialCode,
          phone: billing.phone,
          alternatePhone: billing.alternatePhone,
          address: {
            line1: billing.addressLine1,
            line2: billing.addressLine2,
            city: billing.city,
            state: billing.state,
            postalCode: billing.postalCode,
          },
          country: country?.name,
          countryCode: billing.countryCode,
          card: hasCardInput(card)
            ? {
                holderName: card.holderName,
                number: digitsOnly(String(card.number ?? '')),
                expiry: card.expiry,
                cvv: card.cvv,
              }
            : undefined,
        },
      };

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');

      setShowConfirm(false);
      onClose();
      reset();
      onCreated?.(data.lead);
      toast.success('Lead Created', `Flight lead for ${payload.name} created successfully.`);
    } catch (err: any) {
      // Keep the modal open so the user can see the error without losing their input.
      setSubmitError(err?.message || 'Something went wrong. Please try again.');
      toast.error('Lead Creation Failed', err?.message || 'Could not create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorCount = submitAttempted ? Object.keys(errors).length : 0;

  return (
    <>
      <ConfirmLeadModal
        isOpen={showConfirm}
        form={form}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onConfirm={handleConfirmedCreate}
        onCancel={() => {
          if (!isSubmitting) {
            setShowConfirm(false);
            setSubmitError(null);
          }
        }}
      />

      <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Flight Lead"
      description="Enter passenger flight requirements. If unassigned and auto-assign is on, it will be round-robined."
      width="4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          {errorCount > 0 ? (
            <p className="flex items-center gap-1.5 text-[11px] text-ember-error font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Please fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} before creating this lead.
            </p>
          ) : (
            <p className="text-[11px] text-ember-neutral">
              <span className="text-ember-error font-bold">*</span> Required fields
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" form="new-lead-form" isLoading={isSubmitting}>
              Create Flight Lead
            </Button>
          </div>
        </div>
      }
    >
      {/* noValidate: `validateLeadForm` owns the messaging, so native browser
          bubbles don't fire alongside it. */}
      <form id="new-lead-form" onSubmit={handleSubmit} noValidate className="space-y-7">
        {submitError && !showConfirm && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-btn bg-red-50 border border-ember-error/30"
          >
            <AlertCircle className="w-4 h-4 text-ember-error shrink-0 mt-0.5" />
            <div className="text-xs text-ember-error">{submitError}</div>
          </div>
        )}

        {/* ------------------------------------------- Customer Details */}
        <FormSection
          title="Customer Details"
          description="Who is travelling and how to reach them."
          icon={<UserIcon className="w-3.5 h-3.5" />}
        >
          <FormRow cols={2}>
            <PhoneField
              ref={registerField('phone')}
              label="Phone Number"
              required
              countryCode={String(form.phoneDialCode ?? DEFAULT_COUNTRY_CODE)}
              onCountryCodeChange={(code) => setField('phoneDialCode', code)}
              value={String(form.phone ?? '')}
              onValueChange={(v) => setField('phone', v)}
              onBlur={blur('phone')}
              error={errorFor('phone')}
            />
            <Input
              ref={registerField('email')}
              label="Email Address"
              labelHint="Optional"
              type="email"
              placeholder="john@example.com"
              autoComplete="email"
              value={String(form.email ?? '')}
              onChange={(e) => setField('email', e.target.value)}
              onBlur={blur('email')}
              error={errorFor('email')}
            />
          </FormRow>

          <Select
            label="Lead Source"
            value={String(form.source ?? 'Website')}
            onChange={(e) => setField('source', e.target.value)}
          >
            <option value="Website">Website</option>
            <option value="Contact Us">Contact Us</option>
            <option value="Referral">Referral</option>
            <option value="Phone">Phone Inquiry</option>
            <option value="Ads">Meta / Google Ads</option>
            <option value="Newsletter">Newsletter</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Other">Other</option>
          </Select>
        </FormSection>

        {/* --------------------------------------------- Flight Details */}
        <FormSection
          title="Flight Details"
          description="Route, dates and itinerary requirements."
          icon={<Plane className="w-3.5 h-3.5" />}
        >
          {/* -------- Import Itinerary (paste converted HTML) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ember-text-primary uppercase tracking-wide">
              <FileText className="w-3.5 h-3.5 text-ember-primary" />
              <span>Import Itinerary (PNR / GDS)</span>
            </div>
            <HtmlPnrConverter
              value={String(form.pnrHtml ?? '')}
              onChange={handlePnrHtmlChange}
            />
            {(form.origin || form.destination) && (
              <p className="flex items-center gap-1.5 text-[11px] text-ember-primary font-semibold">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                Route detected: {form.origin || '—'} → {form.destination || '—'}
              </p>
            )}
          </div>

          {/* -------- Booking classification (always shown) */}
          <FormRow cols={2}>
            <Select
              label="Booking Type"
              value={String(form.bookingType ?? DEFAULT_BOOKING_TYPE)}
              onChange={(e) => setField('bookingType', e.target.value)}
              helperText="What the customer is asking for."
            >
              {BOOKING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              value={String(form.status ?? DEFAULT_LEAD_STATUS)}
              onChange={(e) => setField('status', e.target.value)}
              helperText="Operational state."
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormRow>

          {/* Flight route/date details removed — itinerary is captured via the
              PNR HTML above. Origin/destination/dates default on the server. */}

          {/* -------- Passengers */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-ember-text-primary uppercase tracking-wide pt-1">
            <Users className="w-3.5 h-3.5 text-ember-primary" />
            <span>Passengers &amp; Pax Details</span>
          </div>

          <PassengerList
            passengers={
              (form.passengers && form.passengers.length > 0)
                ? form.passengers
                : [{ id: `pax_${Date.now()}_0`, firstName: '', middleName: '', lastName: '', type: 'Adult', dob: '', gender: '' }]
            }
            onChange={handlePassengersChange}
            errorFor={errorFor}
            onFieldBlur={(key) => setTouched((t) => ({ ...t, [key]: true }))}
            registerField={registerField}
          />

          <FormRow cols={2}>
            <Select
              label="Initial Stage"
              value={String(form.stage ?? 'New')}
              onChange={(e) => setField('stage', e.target.value)}
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Quoted">Quoted</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Booked">Booked</option>
              <option value="Ticketed">Ticketed</option>
            </Select>

            <div className="hidden sm:block" />
          </FormRow>

          {/* Pricing: airline + consolidator charge, total auto-calculates (editable) */}
          <FormRow cols={2}>
            <Input
              ref={registerField('airlineCharge')}
              label="Airline Charge ($)"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 1200"
              value={String(form.airlineCharge ?? '')}
              onChange={(e) => onChargeChange('airlineCharge', e.target.value)}
              onBlur={blur('airlineCharge')}
              error={errorFor('airlineCharge')}
            />
            <Input
              ref={registerField('airlineConsolidatorCharge')}
              label="Airline Consolidator Charge ($)"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 250"
              value={String(form.airlineConsolidatorCharge ?? '')}
              onChange={(e) => onChargeChange('airlineConsolidatorCharge', e.target.value)}
              onBlur={blur('airlineConsolidatorCharge')}
              error={errorFor('airlineConsolidatorCharge')}
            />
          </FormRow>

          <FormRow cols={2}>
            <Input
              ref={registerField('totalAmount')}
              label="Total Amount ($)"
              labelHint="Auto = Airline + Consolidator · editable"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={String(form.totalAmount ?? '')}
              onChange={(e) => setField('totalAmount', e.target.value)}
              onBlur={blur('totalAmount')}
              error={errorFor('totalAmount')}
            />
            <Select
              label="Template Pricing Display"
              value={String(form.pricingDisplayMode ?? 'total')}
              onChange={(e) => setField('pricingDisplayMode', e.target.value as 'total' | 'breakdown')}
            >
              <option value="total">Show Total Amount only</option>
              <option value="breakdown">Show all three (breakdown)</option>
            </Select>
          </FormRow>

          <FormRow cols={2}>
            <Input
              ref={registerField('nextFollowUpDate')}
              label="Next Follow-Up Date"
              type="date"
              value={String(form.nextFollowUpDate ?? '')}
              onChange={(e) => setField('nextFollowUpDate', e.target.value)}
              onBlur={blur('nextFollowUpDate')}
              error={errorFor('nextFollowUpDate')}
            />

            {user?.role === 'admin' ? (
              <Select
                label="Assign to Staff"
                value={String(form.assignedTo ?? '')}
                onChange={(e) => setField('assignedTo', e.target.value)}
              >
                <option value="">Auto-Assign (Round-Robin)</option>
                <option value={UNASSIGNED_VALUE}>Unassigned (No Staff)</option>
                {staffList
                  .filter((s) => s.active)
                  .map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} ({staff.email})
                    </option>
                  ))}
              </Select>
            ) : (
              <div className="text-xs text-ember-neutral flex items-center pt-6">
                <span>Assigned to you ({user?.name})</span>
              </div>
            )}
          </FormRow>

          <Textarea
            label="Remark"
            labelHint="Optional"
            placeholder="e.g. Prefers direct flight, premium economy, flexible on +/- 2 days."
            rows={2}
            value={String(form.initialNote ?? '')}
            onChange={(e) => setField('initialNote', e.target.value)}
          />

          {/* Add-ons: Meal, Baggage, Seat */}
          <div className="pt-3 border-t border-ember-border/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ember-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-ember-primary" />
              <span>Add-ons &amp; Ancillary Services (Optional)</span>
            </div>
            <FormRow cols={3}>
              <Input
                label="Meal Preference"
                placeholder="e.g. Vegetarian, Halal..."
                value={form.addOns?.meal ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, addOns: { ...(f.addOns || {}), meal: e.target.value } }))}
              />
              <Input
                label="Baggage Allowance"
                placeholder="e.g. 2 x 23kg Bags..."
                value={form.addOns?.baggage ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, addOns: { ...(f.addOns || {}), baggage: e.target.value } }))}
              />
              <Input
                label="Seat Selection"
                placeholder="e.g. Window, 14A..."
                value={form.addOns?.seat ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, addOns: { ...(f.addOns || {}), seat: e.target.value } }))}
              />
            </FormRow>
          </div>
        </FormSection>

        {/* -------------------------------------------- Billing Details */}
        <FormSection
          title="Billing Details"
          description="Invoicing contact, address and payment instrument."
          icon={<Wallet className="w-3.5 h-3.5" />}
          aside="Optional"
        >
          <FormRow cols={2}>
            <Input
              ref={registerField('billing.email')}
              label="Billing Email"
              type="email"
              placeholder="billing@example.com"
              value={String(billing.email ?? '')}
              onChange={(e) => setBilling({ email: e.target.value })}
              onBlur={blur('billing.email')}
              error={errorFor('billing.email')}
            />
            <PhoneField
              ref={registerField('billing.phone')}
              label="Billing Phone Number"
              countryCode={String(billing.phoneDialCode ?? DEFAULT_COUNTRY_CODE)}
              onCountryCodeChange={(code) => setBilling({ phoneDialCode: code })}
              value={String(billing.phone ?? '')}
              onValueChange={(v) => setBilling({ phone: v })}
              onBlur={blur('billing.phone')}
              error={errorFor('billing.phone')}
            />
          </FormRow>

          <FormRow cols={2}>
            <Input
              ref={registerField('billing.alternatePhone')}
              label="Alternate Number"
              type="tel"
              inputMode="tel"
              placeholder="e.g. +1 555 987 6543"
              helperText="A second number to try if the primary doesn’t answer."
              value={String(billing.alternatePhone ?? '')}
              onChange={(e) => setBilling({ alternatePhone: e.target.value })}
              onBlur={blur('billing.alternatePhone')}
              error={errorFor('billing.alternatePhone')}
            />
            <Select
              ref={registerField('billing.countryCode')}
              label="Country"
              value={String(billing.countryCode ?? DEFAULT_COUNTRY_CODE)}
              onChange={(e) => {
                const countryCode = e.target.value;
                // Keep the dial-code tab in step until the user types a number
                // of their own, then leave their choice alone.
                setBilling(
                  billing.phone
                    ? { countryCode }
                    : { countryCode, phoneDialCode: countryCode }
                );
              }}
              helperText={`Dial code ${getDialCode(billing.countryCode) || '—'}`}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.dial})
                </option>
              ))}
            </Select>
          </FormRow>

          <Input
            ref={registerField('billing.addressLine1')}
            label="Billing Address"
            placeholder="Street address, P.O. box"
            autoComplete="billing address-line1"
            value={String(billing.addressLine1 ?? '')}
            onChange={(e) => setBilling({ addressLine1: e.target.value })}
            onBlur={blur('billing.addressLine1')}
            error={errorFor('billing.addressLine1')}
          />
          <Input
            aria-label="Billing address line 2"
            placeholder="Apartment, suite, unit, floor (optional)"
            autoComplete="billing address-line2"
            value={String(billing.addressLine2 ?? '')}
            onChange={(e) => setBilling({ addressLine2: e.target.value })}
          />

          <FormRow cols={3}>
            <Input
              ref={registerField('billing.city')}
              label="City"
              placeholder="e.g. New York"
              autoComplete="billing address-level2"
              value={String(billing.city ?? '')}
              onChange={(e) => setBilling({ city: e.target.value })}
              onBlur={blur('billing.city')}
              error={errorFor('billing.city')}
            />
            <Input
              ref={registerField('billing.state')}
              label="State / Province"
              placeholder="e.g. NY"
              autoComplete="billing address-level1"
              value={String(billing.state ?? '')}
              onChange={(e) => setBilling({ state: e.target.value })}
              onBlur={blur('billing.state')}
              error={errorFor('billing.state')}
            />
            <Input
              ref={registerField('billing.postalCode')}
              label="Postal / ZIP Code"
              placeholder="e.g. 10001"
              autoComplete="billing postal-code"
              value={String(billing.postalCode ?? '')}
              onChange={(e) => setBilling({ postalCode: e.target.value })}
              onBlur={blur('billing.postalCode')}
              error={errorFor('billing.postalCode')}
            />
          </FormRow>

          {/* ------------------------------------ Card sub-block */}
          <div className="mt-2 rounded-card border border-ember-border bg-ember-bg/60 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-ember-primary" />
              <h5 className="text-xs font-bold text-ember-text-primary">
                Debit / Credit Card Details
              </h5>
              <span className="text-[10px] font-semibold text-ember-neutral">Optional</span>
            </div>

            <FormRow cols={2}>
              <Input
                ref={registerField('billing.card.holderName')}
                label="Card Holder Name"
                required={hasCardInput(card)}
                placeholder="Name as printed on the card"
                autoComplete="cc-name"
                value={String(card.holderName ?? '')}
                onChange={(e) => setCard({ holderName: e.target.value })}
                onBlur={blur('billing.card.holderName')}
                error={errorFor('billing.card.holderName')}
              />
              <CardNumberInput
                ref={registerField('billing.card.number')}
                label="Card / Account Number"
                required={hasCardInput(card)}
                value={String(card.number ?? '')}
                onValueChange={(v) => setCard({ number: v })}
                onBlur={blur('billing.card.number')}
                error={errorFor('billing.card.number')}
              />
            </FormRow>

            <FormRow cols={2}>
              <Input
                ref={registerField('billing.card.expiry')}
                label="Expiry Date"
                required={hasCardInput(card)}
                placeholder="MM/YY"
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                value={String(card.expiry ?? '')}
                onChange={(e) => setCard({ expiry: formatExpiry(e.target.value) })}
                onBlur={blur('billing.card.expiry')}
                error={errorFor('billing.card.expiry')}
                className="font-code"
              />
              <Input
                ref={registerField('billing.card.cvv')}
                label="CVV / CVC"
                required={hasCardInput(card)}
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={cardBrand === 'Amex' ? '4 digits' : '3 digits'}
                maxLength={cvvLength(cardBrand)}
                value={String(card.cvv ?? '')}
                onChange={(e) =>
                  setCard({ cvv: digitsOnly(e.target.value).slice(0, cvvLength(cardBrand)) })
                }
                onBlur={blur('billing.card.cvv')}
                error={errorFor('billing.card.cvv')}
                className="font-code tracking-widest"
              />
            </FormRow>

            <p className="flex items-start gap-1.5 text-[11px] text-ember-neutral">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px text-ember-warning" />
              <span>
                Card details are stored on the lead record. Only enter them with the
                cardholder’s consent.
              </span>
            </p>
          </div>
        </FormSection>
      </form>
    </Drawer>
    </>
  );
};
