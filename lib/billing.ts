/**
 * Turns the billing payload the New Lead drawer sends into the shape
 * `models/Lead.ts` stores: expiry split into month/year, brand and last4
 * derived from the number.
 *
 * Validation lives in `lib/validation.ts` and runs before this — normalization
 * assumes the values already passed `validateLeadForm`.
 */

import type { IBilling } from '@/models/Lead';
import { detectCardBrand, digitsOnly, parseExpiry, isBlank } from './validation';
import { findCountry, getDialCode } from './countries';

const str = (v: unknown): string | undefined => {
  if (isBlank(v)) return undefined;
  return String(v).trim();
};

/** Returns undefined when nothing usable was supplied, so no empty subdocument is written. */
export function normalizeBilling(raw: any): IBilling | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const country = raw.countryCode ? findCountry(String(raw.countryCode)) : undefined;

  const address = {
    line1: str(raw.address?.line1),
    line2: str(raw.address?.line2),
    city: str(raw.address?.city),
    state: str(raw.address?.state),
    postalCode: str(raw.address?.postalCode),
  };
  const hasAddress = Object.values(address).some(Boolean);

  let card: IBilling['card'];
  const rawCard = raw.card;
  if (rawCard && typeof rawCard === 'object') {
    const number = digitsOnly(String(rawCard.number ?? ''));
    const expiry = rawCard.expiry ? parseExpiry(String(rawCard.expiry)) : null;
    const holderName = str(rawCard.holderName);
    const cvv = digitsOnly(String(rawCard.cvv ?? '')) || undefined;

    if (number || holderName || expiry || cvv) {
      card = {
        holderName,
        number: number || undefined,
        cvv,
        expiryMonth: expiry?.month,
        expiryYear: expiry?.year,
        brand: number ? detectCardBrand(number) : undefined,
        last4: number ? number.slice(-4) : undefined,
      };
    }
  }

  const billing: IBilling = {
    email: str(raw.email)?.toLowerCase(),
    phoneCountryCode: str(raw.phoneCountryCode)?.toUpperCase(),
    // Trust the ISO code over a client-supplied dial string.
    phoneDialCode: str(raw.phoneCountryCode)
      ? getDialCode(String(raw.phoneCountryCode)) || str(raw.phoneDialCode)
      : str(raw.phoneDialCode),
    phone: str(raw.phone),
    alternatePhone: str(raw.alternatePhone),
    address: hasAddress ? address : undefined,
    country: country?.name ?? str(raw.country),
    countryCode: country?.code ?? str(raw.countryCode)?.toUpperCase(),
    card,
  };

  // Country/dial code default to the form's initial selection even when the rest
  // of the section is untouched, so they alone don't count as "filled in".
  const meaningful =
    billing.email ||
    billing.phone ||
    billing.alternatePhone ||
    billing.address ||
    billing.card;

  return meaningful ? billing : undefined;
}
