'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  User as UserIcon,
  Plane,
  Wallet,
  CreditCard,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { FormSection } from '@/components/ui/FormSection';
import { FormRow } from '@/components/ui/FormRow';
import { PhoneField } from '@/components/ui/PhoneField';
import { CardNumberInput } from '@/components/ui/CardNumberInput';
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry, getDialCode } from '@/lib/countries';
import {
  BOOKING_TYPES,
  DEFAULT_BOOKING_TYPE,
  LEAD_STATUSES,
  DEFAULT_LEAD_STATUS,
} from '@/lib/leadOptions';
import {
  validateLeadForm,
  firstErrorKey,
  formatExpiry,
  digitsOnly,
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
  const [form, setForm] = useState<LeadFormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Clear after the slide-out so the fields don't visibly empty mid-animation.
    setTimeout(reset, 320);
  }, [onClose, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);

    const firstBad = firstErrorKey(errors);
    if (firstBad) {
      const el = fieldRefs.current[firstBad];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const dial = getDialCode(form.phoneDialCode);
      const country = getCountry(billing.countryCode);

      const payload = {
        name: form.name,
        // Combined into the single `phone` field the Lead model and CSV import
        // already use, so search and dedupe keep working.
        phone: `${dial} ${form.phone}`.trim(),
        email: form.email,
        source: form.source,
        origin: form.origin,
        destination: form.destination,
        travelDate: form.travelDate || undefined,
        returnDate: form.tripType === 'One Way' ? undefined : form.returnDate || undefined,
        pax: form.pax,
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
          // Sent raw; the API normalizes expiry, brand and last4.
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

      onClose();
      reset();
      onCreated?.(data.lead);
    } catch (err: any) {
      setSubmitError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorCount = submitAttempted ? Object.keys(errors).length : 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Flight Lead"
      description="Enter passenger flight requirements. If unassigned and auto-assign is on, it will be round-robined."
      width="2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-ember-neutral">
            <span className="text-ember-error font-bold">*</span> Required fields
          </p>
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
        {(errorCount > 0 || submitError) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-btn bg-red-50 border border-ember-error/30"
          >
            <AlertCircle className="w-4 h-4 text-ember-error shrink-0 mt-0.5" />
            <div className="text-xs text-ember-error">
              {submitError ??
                `Please fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} before creating this lead.`}
            </div>
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
              onChange={(e) => setField('name', e.target.value)}
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
              helperText="Where the request has got to operationally."
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow cols={2}>
            <Input
              ref={registerField('origin')}
              label="Origin (Airport / City)"
              required
              placeholder="e.g. JFK (New York)"
              value={String(form.origin ?? '')}
              onChange={(e) => setField('origin', e.target.value)}
              onBlur={blur('origin')}
              error={errorFor('origin')}
            />
            <Input
              ref={registerField('destination')}
              label="Destination (Airport / City)"
              required
              placeholder="e.g. LHR (London)"
              value={String(form.destination ?? '')}
              onChange={(e) => setField('destination', e.target.value)}
              onBlur={blur('destination')}
              error={errorFor('destination')}
            />
          </FormRow>

          <FormRow cols={3}>
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
            <Input
              ref={registerField('pax')}
              label="Pax (Passengers)"
              type="number"
              min={1}
              max={99}
              value={String(form.pax ?? 1)}
              onChange={(e) => setField('pax', e.target.value)}
              onBlur={blur('pax')}
              error={errorFor('pax')}
            />
          </FormRow>

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
              {hasCardInput(card) && (
                <span className="text-[10px] font-semibold text-ember-neutral">
                  All card fields required
                </span>
              )}
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
  );
};
