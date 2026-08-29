'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Globe,
  Eye,
  EyeOff,
  ShieldCheck,
  Edit2,
  Check,
  X,
  Lock,
  DollarSign,
  AlertCircle,
  Building,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { COUNTRIES } from '@/lib/countries';
import { useToast } from '@/context/ToastContext';
import { IBilling } from '@/models/Lead';

interface LeadBillingManagerProps {
  leadId: string;
  billing?: IBilling;
  onUpdateBilling: (updatedBilling: IBilling) => void;
  disabled?: boolean;
}

export const LeadBillingManager: React.FC<LeadBillingManagerProps> = ({
  leadId,
  billing = {},
  onUpdateBilling,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(true); // CVV shown by default
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state
  const [form, setForm] = useState<IBilling>({
    email: billing.email || '',
    phoneDialCode: billing.phoneDialCode || '+1',
    phoneCountryCode: billing.phoneCountryCode || 'US',
    phone: billing.phone || '',
    alternatePhone: billing.alternatePhone || '',
    country: billing.country || 'United States',
    countryCode: billing.countryCode || 'US',
    address: {
      line1: billing.address?.line1 || '',
      line2: billing.address?.line2 || '',
      city: billing.address?.city || '',
      state: billing.address?.state || '',
      postalCode: billing.address?.postalCode || '',
    },
    card: {
      holderName: billing.card?.holderName || '',
      number: billing.card?.number || '',
      cvv: billing.card?.cvv || '',
      expiryMonth: billing.card?.expiryMonth || undefined,
      expiryYear: billing.card?.expiryYear || undefined,
      brand: billing.card?.brand || '',
      last4: billing.card?.last4 || '',
    },
  });

  const handleCountryChange = (countryCode: string) => {
    const found = COUNTRIES.find((c) => c.code === countryCode);
    if (found) {
      setForm((prev) => ({
        ...prev,
        country: found.name,
        countryCode: found.code,
        phoneDialCode: found.dial,
        phoneCountryCode: found.code,
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing: form }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save billing details');
      }

      onUpdateBilling(data.lead.billing || form);
      setIsEditing(false);
      toast.success('Billing & Card Details Saved', 'Customer payment and card details updated successfully.');
    } catch (err: any) {
      setSaveError(err.message || 'Save failed');
      toast.error('Save Failed', err.message || 'Failed to update billing details');
    } finally {
      setIsSaving(false);
    }
  };

  const card = billing.card || {};
  const address = billing.address || {};
  const hasCard = Boolean(card.holderName || card.number || card.last4);
  const hasAddress = Boolean(address.line1 || address.city || address.postalCode);
  const hasContact = Boolean(billing.email || billing.phone || billing.alternatePhone);

  const formattedCardNumber = card.number
    ? card.number.replace(/(\d{4})/g, '$1 ').trim()
    : card.last4
    ? `•••• •••• •••• ${card.last4}`
    : 'No card on file';

  // Calculate if the card is Expired
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isExpired =
    card.expiryYear && card.expiryMonth
      ? card.expiryYear < currentYear ||
        (card.expiryYear === currentYear && Number(card.expiryMonth) < currentMonth)
      : false;

  return (
    <Card elevated className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-ember-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-btn bg-ember-primary/10 text-ember-primary flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-ember-text-primary">
              Billing & Debit/Credit Card Details
            </h3>
            <p className="text-xs text-ember-text-secondary">
              Secure customer billing address, dial codes, and debit card information.
            </p>
          </div>
        </div>

        {!disabled && (
          <Button
            size="sm"
            variant={isEditing ? 'ghost' : 'secondary'}
            onClick={() => {
              if (isEditing) {
                setSaveError(null);
              }
              setIsEditing(!isEditing);
            }}
            className="text-xs gap-1.5"
          >
            {isEditing ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Billing</span>
              </>
            )}
          </Button>
        )}
      </div>

      {saveError && (
        <div className="p-2.5 rounded-btn bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* VIEW MODE */}
      {!isEditing ? (
        <div className="space-y-4">
          {/* Card Showcase Box */}
          <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white p-5 border border-stone-800 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-stone-300">
                  {card.brand || 'Debit / Credit Card'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isExpired && (
                  <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/80 border border-red-700/80 px-2 py-0.5 rounded">
                    EXPIRED
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                  {billing.countryCode || 'INTL'}
                </span>
              </div>
            </div>

            {/* Card Number with Reveal Toggle */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-stone-400">Card Number</span>
              <div className="flex items-center justify-between">
                <p className="font-mono text-base sm:text-lg tracking-widest font-bold text-stone-100">
                  {showCardNumber
                    ? card.number
                      ? card.number.replace(/(\d{4})/g, '$1 ').trim()
                      : formattedCardNumber
                    : card.last4
                    ? `•••• •••• •••• ${card.last4}`
                    : card.number
                    ? `•••• •••• •••• ${card.number.slice(-4)}`
                    : '•••• •••• •••• ••••'}
                </p>
                {card.number && (
                  <button
                    type="button"
                    onClick={() => setShowCardNumber(!showCardNumber)}
                    className="p-1.5 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                    title={showCardNumber ? 'Hide number' : 'Show full number'}
                  >
                    {showCardNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Cardholder, Expiry & CVV */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Cardholder</span>
                <p className="font-bold text-stone-200 truncate uppercase">
                  {card.holderName || 'Not Provided'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-mono text-stone-400 block">Expiry</span>
                  {isExpired && (
                    <span className="text-[8px] font-mono font-bold text-red-400 uppercase bg-red-950 px-1 py-0.2 rounded border border-red-800">
                      Expired
                    </span>
                  )}
                </div>
                <p className={`font-mono font-bold ${isExpired ? 'text-red-400' : 'text-stone-200'}`}>
                  {card.expiryMonth && card.expiryYear
                    ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`
                    : 'MM/YY'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-stone-400 block">CVV / CVC</span>
                <div className="flex items-center gap-1.5">
                  <p className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                    {showCvv ? card.cvv || '—' : card.cvv ? '•••' : '—'}
                  </p>
                  {card.cvv && (
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="text-stone-400 hover:text-white p-0.5"
                      title={showCvv ? 'Hide CVV' : 'Show CVV'}
                    >
                      {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Address Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Billing Contact */}
            <div className="p-3.5 rounded-btn bg-ember-surface-raised border border-ember-border space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ember-neutral block">
                Billing Contact
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-ember-neutral shrink-0" />
                  <span className="text-ember-text-primary font-medium truncate">
                    {billing.email || 'No billing email specified'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-ember-neutral shrink-0" />
                  <span className="text-ember-text-primary font-medium">
                    {billing.phoneDialCode ? `${billing.phoneDialCode} ` : ''}
                    {billing.phone || 'No billing phone'}
                  </span>
                </div>
                {billing.alternatePhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-ember-neutral shrink-0" />
                    <span className="text-ember-text-secondary text-[11px]">
                      Alt: {billing.alternatePhone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Address & Country */}
            <div className="p-3.5 rounded-btn bg-ember-surface-raised border border-ember-border space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ember-neutral block">
                Billing Address & Country
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-ember-neutral shrink-0" />
                  <span className="font-bold text-ember-text-primary">
                    {billing.country || 'Not Specified'}{' '}
                    {billing.countryCode ? `(${billing.countryCode})` : ''}
                  </span>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-ember-neutral shrink-0 mt-0.5" />
                  <div className="text-ember-text-secondary leading-relaxed">
                    {address.line1 ? (
                      <>
                        <p>{address.line1}</p>
                        {address.line2 && <p>{address.line2}</p>}
                        <p>
                          {[address.city, address.state, address.postalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </>
                    ) : (
                      <p className="text-ember-neutral">No physical billing address recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT FORM MODE */
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {/* Section 1: Contact & Country */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ember-neutral flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-ember-primary" />
              <span>Country & Billing Contacts</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ember-text-primary">
                  Country Selection
                </label>
                <select
                  value={form.countryCode || 'US'}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.dial})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Billing Email"
                type="email"
                placeholder="billing@domain.com"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ember-text-primary">
                  Billing Phone Number
                </label>
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-2 rounded-input bg-ember-surface-raised border border-ember-border text-xs font-mono font-bold text-ember-text-primary shrink-0 flex items-center">
                    {form.phoneDialCode || '+1'}
                  </span>
                  <input
                    type="tel"
                    placeholder="Primary phone..."
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-ember-surface border border-ember-border rounded-input px-3 py-2 text-xs text-ember-text-primary placeholder:text-ember-neutral focus:outline-none focus:border-ember-primary"
                  />
                </div>
              </div>

              <Input
                label="Alternate Phone Number"
                type="tel"
                placeholder="Optional backup phone..."
                value={form.alternatePhone || ''}
                onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Physical Address */}
          <div className="space-y-3 pt-2 border-t border-ember-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ember-neutral flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-ember-primary" />
              <span>Billing Address</span>
            </h4>

            <Input
              label="Address Line 1"
              placeholder="Street address, suite, P.O. box..."
              value={form.address?.line1 || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...(form.address || {}), line1: e.target.value },
                })
              }
            />

            <Input
              label="Address Line 2 (Optional)"
              placeholder="Apartment, unit, building, floor..."
              value={form.address?.line2 || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...(form.address || {}), line2: e.target.value },
                })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                placeholder="City..."
                value={form.address?.city || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...(form.address || {}), city: e.target.value },
                  })
                }
              />
              <Input
                label="State / Province"
                placeholder="State / Region..."
                value={form.address?.state || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...(form.address || {}), state: e.target.value },
                  })
                }
              />
              <Input
                label="Postal / ZIP Code"
                placeholder="ZIP Code..."
                value={form.address?.postalCode || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...(form.address || {}), postalCode: e.target.value },
                  })
                }
              />
            </div>
          </div>

          {/* Section 3: Debit / Credit Card Information */}
          <div className="space-y-3 pt-2 border-t border-ember-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ember-neutral flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-ember-primary" />
                <span>Debit / Credit Card Payment Details</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Secure Vault Storage
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Cardholder Name"
                placeholder="Name as it appears on card..."
                value={form.card?.holderName || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    card: { ...(form.card || {}), holderName: e.target.value },
                  })
                }
              />

              <div className="space-y-1">
                <label className="block text-xs font-bold text-ember-text-primary">
                  Card Brand
                </label>
                <select
                  value={form.card?.brand || 'Visa'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      card: { ...(form.card || {}), brand: e.target.value },
                    })
                  }
                  className="w-full bg-ember-surface-raised border border-ember-border rounded-input px-3 py-2 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="American Express">American Express</option>
                  <option value="Discover">Discover</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 1: Card Number (full width on mobile, 2/3 on sm+) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Account / Card Number"
                  placeholder="16-digit card number..."
                  value={form.card?.number || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      card: { ...(form.card || {}), number: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <Input
                  label="CVV / CVC"
                  type="password"
                  placeholder="3 or 4 digits"
                  maxLength={4}
                  value={form.card?.cvv || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      card: { ...(form.card || {}), cvv: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {/* Row 2: Expiry Month + Year each in their own comfortable column */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-ember-text-primary mb-1">
                  Expiry Month
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="MM"
                  value={form.card?.expiryMonth || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      card: { ...(form.card || {}), expiryMonth: Number(e.target.value) || undefined },
                    })
                  }
                  className="w-full bg-ember-surface border border-ember-border rounded-input px-3 py-2 text-xs text-center text-ember-text-primary focus:outline-none focus:border-ember-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ember-text-primary mb-1">
                  Expiry Year
                </label>
                <input
                  type="number"
                  min={2024}
                  max={2040}
                  placeholder="YYYY"
                  value={form.card?.expiryYear || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      card: { ...(form.card || {}), expiryYear: Number(e.target.value) || undefined },
                    })
                  }
                  className="w-full bg-ember-surface border border-ember-border rounded-input px-3 py-2 text-xs text-center text-ember-text-primary focus:outline-none focus:border-ember-primary"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-ember-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Save Billing Details</span>
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};
