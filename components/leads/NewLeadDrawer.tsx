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
  CalendarDays,
  ArrowRight,
  Plus,
  Sparkles,
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
import { AirportInput } from '@/components/ui/AirportInput';
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry, getDialCode } from '@/lib/countries';
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
  const travelDateFormatted = form.travelDate
    ? new Date(form.travelDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : '—';

  const returnDateFormatted =
    form.tripType !== 'One Way' && form.returnDate
      ? new Date(form.returnDate).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        })
      : null;

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <UserIcon className="w-3.5 h-3.5" />,
      label: 'Passenger',
      value: form.name || '—',
    },
    {
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: 'Route',
      value:
        form.origin && form.destination
          ? `${form.origin}  →  ${form.destination}`
          : form.origin || form.destination || '—',
    },
    {
      icon: <Plane className="w-3.5 h-3.5" />,
      label: 'Trip type',
      value: `${form.tripType} · ${form.bookingType}`,
    },
    {
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: 'Depart',
      value: travelDateFormatted,
    },
    ...(returnDateFormatted
      ? [{ icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Return', value: returnDateFormatted }]
      : []),
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Passengers',
      value: `${form.pax ?? 1}`,
    },
    ...(form.priceQuoted
      ? [{ icon: <span className="text-[11px] font-bold">$</span>, label: 'Quoted', value: `$${Number(form.priceQuoted).toLocaleString()}` }]
      : []),
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

        {/* Stage & status pills */}
        <div className="flex flex-wrap gap-2">
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
  assignedTo: '',
  priceQuoted: '',
  nextFollowUpDate: '',
  initialNote: '',
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
        multiCityRoutes: form.multiCityRoutes,
        tripType: form.tripType,
        bookingType: form.bookingType,
        stage: form.stage,
        status: form.status,
        assignedTo: form.assignedTo || undefined,
        priceQuoted: form.priceQuoted || 0,
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
      width="2xl"
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
            <Input
              ref={registerField('name')}
              label="Passenger Name"
              required
              placeholder="e.g. John Doe"
              autoComplete="name"
              value={String(form.name ?? '')}
              onChange={(e) => setField('name', lettersAndSpacesOnly(e.target.value))}
              onBlur={blur('name')}
              error={errorFor('name')}
            />
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
          </FormRow>

          <FormRow cols={2}>
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
          </FormRow>
        </FormSection>

        {/* --------------------------------------------- Flight Details */}
        <FormSection
          title="Flight Details"
          description="Route, dates and where this lead sits in the pipeline."
          icon={<Plane className="w-3.5 h-3.5" />}
        >
          <FormRow cols={3}>
            <Select
              label="Trip Type"
              value={String(form.tripType ?? 'Round Trip')}
              onChange={(e) => {
                const tripType = e.target.value;
                setForm((f) => ({
                  ...f,
                  tripType,
                  returnDate: tripType === 'One Way' ? '' : f.returnDate,
                  multiCityRoutes:
                    tripType === 'Multi-City' && (!f.multiCityRoutes || f.multiCityRoutes.length === 0)
                      ? [
                          { id: `route_${Date.now()}_1`, origin: f.origin || '', destination: f.destination || '', travelDate: f.travelDate || '' },
                          { id: `route_${Date.now()}_2`, origin: f.destination || '', destination: '', travelDate: '' },
                        ]
                      : f.multiCityRoutes,
                }));
              }}
            >
              <option value="Round Trip">Round Trip</option>
              <option value="One Way">One Way</option>
              <option value="Multi-City">Multi-City</option>
            </Select>

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

          {/* If Multi-City Trip Type: Render Multi-City Route Builder */}
          {form.tripType === 'Multi-City' ? (
            <div className="space-y-2.5 p-3 rounded-btn bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-ember-text-primary uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 text-ember-primary" />
                  <span>Multi-City Route Sectors (Customer Itinerary)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentRoutes = (form.multiCityRoutes && form.multiCityRoutes.length > 0)
                      ? form.multiCityRoutes
                      : [
                          { id: `route_${Date.now()}_1`, origin: form.origin || '', destination: form.destination || '', travelDate: form.travelDate || '' },
                        ];
                    const lastRoute = currentRoutes[currentRoutes.length - 1];
                    const nextRoute = {
                      id: `route_${Date.now()}_${currentRoutes.length + 1}`,
                      origin: lastRoute?.destination || '',
                      destination: '',
                      travelDate: '',
                    };
                    const updated = [...currentRoutes, nextRoute];
                    setForm((f) => ({
                      ...f,
                      multiCityRoutes: updated,
                      origin: updated[0]?.origin || f.origin,
                      destination: updated[updated.length - 1]?.destination || f.destination,
                    }));
                  }}
                  className="px-2.5 py-1 rounded bg-ember-primary text-white text-[11px] font-bold hover:bg-ember-primary/90 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  Add Sector
                </button>
              </div>

              {((form.multiCityRoutes && form.multiCityRoutes.length > 0)
                ? form.multiCityRoutes
                : [
                    { id: `route_${Date.now()}_1`, origin: form.origin || '', destination: '', travelDate: form.travelDate || '' },
                    { id: `route_${Date.now()}_2`, origin: '', destination: form.destination || '', travelDate: '' },
                  ]
              ).map((route: any, rIdx: number, allRoutes: any[]) => (
                <div key={route.id || rIdx} className="p-2.5 rounded-btn bg-ember-surface-raised border border-ember-border text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-ember-primary text-[11px]">
                    <span>Sector {rIdx + 1}: {route.origin || 'Origin'} → {route.destination || 'Destination'}</span>
                    {allRoutes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = allRoutes.filter((_: any, i: number) => i !== rIdx);
                          setForm((f) => ({
                            ...f,
                            multiCityRoutes: updated,
                            origin: updated[0]?.origin || '',
                            destination: updated[updated.length - 1]?.destination || '',
                          }));
                        }}
                        className="text-ember-neutral hover:text-red-600 transition-colors text-[10px] font-bold"
                      >
                        Remove Sector
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <AirportInput
                      label={`From (Sector ${rIdx + 1})`}
                      placeholder="e.g. New York, JFK"
                      value={route.origin || ''}
                      onChange={(val) => {
                        const updated = [...allRoutes];
                        updated[rIdx] = { ...route, origin: val };
                        setForm((f) => ({
                          ...f,
                          multiCityRoutes: updated,
                          origin: updated[0]?.origin || f.origin,
                        }));
                      }}
                    />
                    <AirportInput
                      label={`To (Sector ${rIdx + 1})`}
                      placeholder="e.g. London, LHR"
                      value={route.destination || ''}
                      onChange={(val) => {
                        const updated = [...allRoutes];
                        updated[rIdx] = { ...route, destination: val };
                        setForm((f) => ({
                          ...f,
                          multiCityRoutes: updated,
                          destination: updated[updated.length - 1]?.destination || f.destination,
                        }));
                      }}
                    />
                    <Input
                      label="Departure Date"
                      type="date"
                      value={route.travelDate || ''}
                      onChange={(e) => {
                        const updated = [...allRoutes];
                        updated[rIdx] = { ...route, travelDate: e.target.value };
                        setForm((f) => ({
                          ...f,
                          multiCityRoutes: updated,
                          travelDate: rIdx === 0 ? e.target.value : f.travelDate,
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <FormRow cols={2}>
                <AirportInput
                  ref={registerField('origin')}
                  label="Origin (Airport / City)"
                  required
                  placeholder="e.g. New York, JFK…"
                  value={String(form.origin ?? '')}
                  onChange={(v) => setField('origin', v)}
                  onBlur={blur('origin')}
                  error={errorFor('origin')}
                />
                <AirportInput
                  ref={registerField('destination')}
                  label="Destination (Airport / City)"
                  required
                  placeholder="e.g. London, LHR…"
                  value={String(form.destination ?? '')}
                  onChange={(v) => setField('destination', v)}
                  onBlur={blur('destination')}
                  error={errorFor('destination')}
                />
              </FormRow>

              <FormRow cols={2}>
                <Input
                  ref={registerField('travelDate')}
                  label="Travel Date"
                  type="date"
                  value={String(form.travelDate ?? '')}
                  onChange={(e) => setField('travelDate', e.target.value)}
                  onBlur={blur('travelDate')}
                  error={errorFor('travelDate')}
                />
                <Input
                  ref={registerField('returnDate')}
                  label="Return Date"
                  type="date"
                  min={String(form.travelDate ?? '') || undefined}
                  disabled={form.tripType === 'One Way'}
                  value={String(form.returnDate ?? '')}
                  onChange={(e) => setField('returnDate', e.target.value)}
                  onBlur={blur('returnDate')}
                  error={errorFor('returnDate')}
                />
              </FormRow>
            </>
          )}

          {/* Pax Counter & Controls */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-ember-text-primary">Pax (Travelers)</label>
              <span className="text-[10px] text-ember-primary font-bold">
                {Number(form.pax ?? 1)} Person{Number(form.pax ?? 1) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const current = Math.max(1, Number(form.pax ?? 1));
                  if (current > 1) {
                    const next = current - 1;
                    const updated = (form.passengers || []).slice(0, next);
                    setForm((f) => ({ ...f, pax: next, passengers: updated }));
                  }
                }}
                className="w-9 h-[38px] rounded-btn bg-ember-surface-raised border border-ember-border hover:bg-ember-surface text-ember-text-primary font-bold flex items-center justify-center transition-colors text-base"
              >
                −
              </button>
              <input
                ref={registerField('pax')}
                type="number"
                min={1}
                max={99}
                value={String(form.pax ?? 1)}
                onChange={(e) => {
                  const next = Math.max(1, parseInt(e.target.value) || 1);
                  let updated = [...(form.passengers || [])];
                  if (updated.length < next) {
                    for (let i = updated.length; i < next; i++) {
                      updated.push({
                        id: `pax_${Date.now()}_${i}`,
                        firstName: '',
                        lastName: '',
                        dob: '',
                        gender: '',
                      });
                    }
                  } else if (updated.length > next) {
                    updated = updated.slice(0, next);
                  }
                  setForm((f) => ({ ...f, pax: next, passengers: updated }));
                }}
                onBlur={blur('pax')}
                className="flex-1 text-center h-[38px] px-2 bg-ember-surface-raised border border-ember-border rounded-input text-sm font-bold text-ember-text-primary focus:outline-none focus:border-ember-primary"
              />
              <button
                type="button"
                onClick={() => {
                  const current = Math.max(1, Number(form.pax ?? 1));
                  const next = current + 1;
                  const updated = [
                    ...(form.passengers || []),
                    {
                      id: `pax_${Date.now()}_${next}`,
                      firstName: '',
                      lastName: '',
                      dob: '',
                      gender: '',
                    },
                  ];
                  setForm((f) => ({ ...f, pax: next, passengers: updated }));
                }}
                className="w-9 h-[38px] rounded-btn bg-ember-surface-raised border border-ember-border hover:bg-ember-surface text-ember-text-primary font-bold flex items-center justify-center transition-colors text-base"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Pax Selection Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-ember-neutral uppercase tracking-wider">Quick Select:</span>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => {
              const currentPax = Number(form.pax ?? 1);
              const isSelected = currentPax === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    let updated = [...(form.passengers || [])];
                    if (updated.length < num) {
                      for (let i = updated.length; i < num; i++) {
                        updated.push({
                          id: `pax_${Date.now()}_${i}`,
                          firstName: '',
                          lastName: '',
                          dob: '',
                          gender: '',
                        });
                      }
                    } else if (updated.length > num) {
                      updated = updated.slice(0, num);
                    }
                    setForm((f) => ({ ...f, pax: num, passengers: updated }));
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                    isSelected
                      ? 'bg-ember-primary text-white border-ember-primary shadow-sm scale-105'
                      : 'bg-ember-surface-raised border-ember-border text-ember-neutral hover:text-ember-text-primary hover:border-ember-primary/40'
                  }`}
                >
                  {num} Pax
                </button>
              );
            })}
          </div>

          {/* Optional Individual Passenger Form Cards */}
          {Number(form.pax ?? 1) > 1 && (
            <div className="space-y-2 pt-2 border-t border-ember-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-ember-primary" />
                  <span>Passenger Details List ({Number(form.pax ?? 1)} Travelers)</span>
                </span>
                <span className="text-[11px] text-ember-neutral">Letters only for names</span>
              </div>

              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {Array.from({ length: Number(form.pax ?? 1) }).map((_, idx) => {
                  const p = (form.passengers && form.passengers[idx]) || {};
                  return (
                    <div key={idx} className="p-3 rounded-btn bg-ember-surface-raised border border-ember-border text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-ember-primary text-[11px]">
                        <span>Passenger {idx + 1} {idx === 0 ? '(Primary Lead Traveler)' : ''}</span>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (form.passengers || []).filter((_: any, i: number) => i !== idx);
                              setForm((f) => ({ ...f, passengers: updated, pax: Math.max(1, Number(f.pax ?? 1) - 1) }));
                            }}
                            className="text-ember-neutral hover:text-red-600 transition-colors text-[10px] font-bold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">First Name</label>
                          <input
                            type="text"
                            placeholder={idx === 0 ? (form.name?.split(' ')[0] || 'First name') : `First name`}
                            value={p.firstName ?? ''}
                            onChange={(e) => {
                              const updated = [...(form.passengers || [])];
                              while (updated.length <= idx) {
                                updated.push({ firstName: '', lastName: '', dob: '', gender: '' });
                              }
                              updated[idx] = { ...updated[idx], firstName: lettersAndSpacesOnly(e.target.value) };
                              setForm((f) => ({ ...f, passengers: updated }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Last Name</label>
                          <input
                            type="text"
                            placeholder={idx === 0 ? (form.name?.split(' ').slice(1).join(' ') || 'Last name') : `Last name`}
                            value={p.lastName ?? ''}
                            onChange={(e) => {
                              const updated = [...(form.passengers || [])];
                              while (updated.length <= idx) {
                                updated.push({ firstName: '', lastName: '', dob: '', gender: '' });
                              }
                              updated[idx] = { ...updated[idx], lastName: lettersAndSpacesOnly(e.target.value) };
                              setForm((f) => ({ ...f, passengers: updated }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Date of Birth</label>
                          <input
                            type="date"
                            value={p.dob ?? ''}
                            onChange={(e) => {
                              const updated = [...(form.passengers || [])];
                              while (updated.length <= idx) {
                                updated.push({ firstName: '', lastName: '', dob: '', gender: '' });
                              }
                              updated[idx] = { ...updated[idx], dob: e.target.value };
                              setForm((f) => ({ ...f, passengers: updated }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ember-neutral mb-0.5">Gender</label>
                          <select
                            value={p.gender ?? ''}
                            onChange={(e) => {
                              const updated = [...(form.passengers || [])];
                              while (updated.length <= idx) {
                                updated.push({ firstName: '', lastName: '', dob: '', gender: '' });
                              }
                              updated[idx] = { ...updated[idx], gender: e.target.value };
                              setForm((f) => ({ ...f, passengers: updated }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-input bg-ember-surface border border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary font-medium"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <FormRow cols={3}>
            <Select
              label="Trip Type"
              value={String(form.tripType ?? 'Round Trip')}
              onChange={(e) => {
                const tripType = e.target.value;
                // A one-way trip can't carry a return date.
                setForm((f) => ({
                  ...f,
                  tripType,
                  returnDate: tripType === 'One Way' ? '' : f.returnDate,
                }));
              }}
            >
              <option value="Round Trip">Round Trip</option>
              <option value="One Way">One Way</option>
              <option value="Multi-City">Multi-City</option>
            </Select>

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

            <Input
              ref={registerField('priceQuoted')}
              label="Quoted Price ($)"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 1450"
              value={String(form.priceQuoted ?? '')}
              onChange={(e) => setField('priceQuoted', e.target.value)}
              onBlur={blur('priceQuoted')}
              error={errorFor('priceQuoted')}
            />
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
            label="Initial Flight Note / Request"
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
