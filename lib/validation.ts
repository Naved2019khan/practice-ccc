/**
 * Dependency-free validators shared by the New Lead drawer and the
 * `POST /api/leads` route. Client-side validation is a UX affordance, not a
 * security boundary — the API re-runs `validateLeadForm` on every request.
 *
 * Error keys are flat dotted paths (`billing.card.number`) so a single
 * `Record<string, string>` can describe a nested form.
 */

export type ValidationErrors = Record<string, string>;

export interface CardFormValues {
  holderName?: string;
  /** May contain the grouping spaces the input adds; digits are extracted. */
  number?: string;
  /** `MM/YY`. */
  expiry?: string;
  cvv?: string;
}

export interface BillingFormValues {
  email?: string;
  phoneDialCode?: string;
  phone?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  card?: CardFormValues;
}

export interface LeadFormValues {
  name?: string;
  phoneDialCode?: string;
  phone?: string;
  email?: string;
  source?: string;
  origin?: string;
  destination?: string;
  travelDate?: string;
  returnDate?: string;
  pax?: number | string;
  tripType?: string;
  bookingType?: string;
  stage?: string;
  status?: string;
  priceQuoted?: number | string;
  nextFollowUpDate?: string;
  assignedTo?: string;
  initialNote?: string;
  passengers?: any[];
  flightLegs?: any[];
  multiCityRoutes?: any[];
  addOns?: {
    meal?: string;
    baggage?: string;
    seat?: string;
    notes?: string;
  };
  billing?: BillingFormValues;
}

/* ------------------------------------------------------------------ atoms */

export const digitsOnly = (v: string): string => v.replace(/\D/g, '');

export const lettersAndSpacesOnly = (v: string): string => v.replace(/[^A-Za-z\s.'"-]/g, '');

export const isBlank = (v: unknown): boolean =>
  v === undefined || v === null || String(v).trim() === '';

export const isEmail = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());

/** 7–15 digits, per E.164, ignoring separators and an optional leading '+'. */
export const isPhone = (v: string): boolean => {
  const d = digitsOnly(v);
  return d.length >= 7 && d.length <= 15;
};

export const isPostalCode = (v: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/.test(v.trim());

/** Luhn mod-10 checksum — catches mistyped card numbers. */
export const luhn = (value: string): boolean => {
  const d = digitsOnly(value);
  if (d.length < 12) return false;

  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
};

export type CardBrand =
  | 'Visa'
  | 'Mastercard'
  | 'Amex'
  | 'Discover'
  | 'Diners Club'
  | 'JCB'
  | 'UnionPay'
  | 'Maestro'
  | 'RuPay'
  | 'Unknown';

/** Brand from the issuer identification number. Widened as digits arrive. */
export const detectCardBrand = (value: string): CardBrand => {
  const d = digitsOnly(value);
  if (!d) return 'Unknown';
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^(6011|64[4-9]|65)/.test(d)) return 'Discover';
  if (/^3(0[0-5]|[68])/.test(d)) return 'Diners Club';
  if (/^35(2[89]|[3-8])/.test(d)) return 'JCB';
  if (/^62/.test(d)) return 'UnionPay';
  if (/^(50|5[6-9]|6[07]|63)/.test(d)) return 'Maestro';
  // RuPay overlaps Discover/Maestro in the 6x ranges, which are matched above;
  // only its distinct 81/82 prefixes reach here.
  if (/^8[12]/.test(d)) return 'RuPay';
  return 'Unknown';
};

/** Digit counts the brand actually issues. */
export const cardNumberLengths = (brand: CardBrand): number[] => {
  switch (brand) {
    case 'Amex':
      return [15];
    case 'Diners Club':
      return [14, 16, 19];
    case 'Visa':
      return [13, 16, 19];
    case 'Mastercard':
      return [16];
    case 'Discover':
    case 'JCB':
    case 'RuPay':
      return [16, 19];
    case 'UnionPay':
      return [16, 17, 18, 19];
    case 'Maestro':
      return [12, 13, 14, 15, 16, 17, 18, 19];
    default:
      return [13, 14, 15, 16, 17, 18, 19];
  }
};

/** Amex prints a 4-digit CID; everyone else uses 3. */
export const cvvLength = (brand: CardBrand): number => (brand === 'Amex' ? 4 : 3);

/** Groups for display: Amex is 4-6-5, Diners 4-6-4, everything else 4s. */
export const formatCardNumber = (value: string): string => {
  const brand = detectCardBrand(value);
  const max = Math.max(...cardNumberLengths(brand));
  const d = digitsOnly(value).slice(0, max);

  const groups = brand === 'Amex' ? [4, 6, 5] : brand === 'Diners Club' ? [4, 6, 4] : null;
  if (!groups) return d.replace(/(.{4})/g, '$1 ').trim();

  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + size));
    i += size;
  }
  if (i < d.length) parts.push(d.slice(i));
  return parts.join(' ');
};

export const formatExpiry = (value: string): string => {
  const d = digitsOnly(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

export interface ParsedExpiry {
  month: number;
  /** Full year, e.g. 2028. */
  year: number;
}

export const parseExpiry = (value: string): ParsedExpiry | null => {
  const m = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(value.trim());
  if (!m) return null;

  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;

  // Two-digit years are assumed to be in the current century.
  const century = Math.floor(new Date().getFullYear() / 100) * 100;
  return { month, year: century + Number(m[2]) };
};

/** True when `MM/YY` parses and the card has not expired (the month counts). */
export const isExpiryValid = (value: string): boolean => {
  const parsed = parseExpiry(value);
  if (!parsed) return false;

  const now = new Date();
  // Cards are valid through the last day of the printed month.
  const endOfMonth = new Date(parsed.year, parsed.month, 1);
  return endOfMonth > new Date(now.getFullYear(), now.getMonth(), 1);
};

/** Local-midnight Date from a `yyyy-mm-dd` input value, or null. */
export const parseDateInput = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/* --------------------------------------------------------------- the form */

/** Fields that must always be present, in tab order. */
export const REQUIRED_LEAD_FIELDS = ['name', 'phone', 'origin', 'destination'] as const;

/**
 * Field order used to decide which invalid field to focus first. Only fields
 * that can produce an error need to be listed.
 */
export const LEAD_FIELD_ORDER: string[] = [
  'name',
  'phone',
  'email',
  'origin',
  'destination',
  'travelDate',
  'returnDate',
  'pax',
  'priceQuoted',
  'nextFollowUpDate',
  'billing.email',
  'billing.phone',
  'billing.alternatePhone',
  'billing.addressLine1',
  'billing.city',
  'billing.state',
  'billing.postalCode',
  'billing.countryCode',
  'billing.card.holderName',
  'billing.card.number',
  'billing.card.expiry',
  'billing.card.cvv',
];

const CARD_FIELDS: (keyof CardFormValues)[] = ['holderName', 'number', 'expiry', 'cvv'];

/** True once the user has entered anything at all in the card sub-block. */
export const hasCardInput = (card: CardFormValues | undefined): boolean =>
  !!card && CARD_FIELDS.some((f) => !isBlank(card[f]));

/**
 * Validates the whole lead form. Billing is optional as a block: an untouched
 * billing section yields no errors, but once any card field is filled the rest
 * of the card becomes required.
 */
export function validateLeadForm(values: LeadFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  /* -- customer ------------------------------------------------------- */
  if (isBlank(values.name)) errors.name = 'Passenger name is required';
  else if (!/^[A-Za-z][A-Za-z .'"-]*$/.test(String(values.name).trim()))
    errors.name = 'Name must contain letters only';
  else if (String(values.name).trim().length < 2)
    errors.name = 'Enter the passenger’s full name';

  if (isBlank(values.phone)) errors.phone = 'Phone number is required';
  else if (!isPhone(String(values.phone))) errors.phone = 'Enter a valid phone number';

  if (!isBlank(values.email) && !isEmail(String(values.email)))
    errors.email = 'Enter a valid email address';

  /* -- flight --------------------------------------------------------- */
  if (isBlank(values.origin)) errors.origin = 'Origin is required';
  if (isBlank(values.destination)) errors.destination = 'Destination is required';

  const originVal = String(values.origin ?? '').trim().toLowerCase();
  const destVal = String(values.destination ?? '').trim().toLowerCase();
  if (originVal && destVal && originVal === destVal)
    errors.destination = 'Destination must differ from origin';

  const travel = values.travelDate ? parseDateInput(String(values.travelDate)) : null;
  const ret = values.returnDate ? parseDateInput(String(values.returnDate)) : null;

  if (!isBlank(values.travelDate) && !travel) errors.travelDate = 'Enter a valid date';
  if (!isBlank(values.returnDate) && !ret) errors.returnDate = 'Enter a valid date';
  if (travel && ret && ret < travel)
    errors.returnDate = 'Return date cannot be before the travel date';
  if (values.tripType === 'One Way' && ret)
    errors.returnDate = 'A one-way trip has no return date';

  const pax = Number(values.pax);
  if (!isBlank(values.pax) && (!Number.isInteger(pax) || pax < 1 || pax > 99))
    errors.pax = 'Passengers must be a whole number from 1 to 99';

  const price = Number(values.priceQuoted);
  if (!isBlank(values.priceQuoted) && (Number.isNaN(price) || price < 0))
    errors.priceQuoted = 'Enter a price of 0 or more';

  if (!isBlank(values.nextFollowUpDate) && !parseDateInput(String(values.nextFollowUpDate)))
    errors.nextFollowUpDate = 'Enter a valid date';

  /* -- billing (optional as a block) ---------------------------------- */
  const billing = values.billing;
  if (billing) {
    if (!isBlank(billing.email) && !isEmail(String(billing.email)))
      errors['billing.email'] = 'Enter a valid billing email';

    if (!isBlank(billing.phone) && !isPhone(String(billing.phone)))
      errors['billing.phone'] = 'Enter a valid phone number';

    if (!isBlank(billing.alternatePhone) && !isPhone(String(billing.alternatePhone)))
      errors['billing.alternatePhone'] = 'Enter a valid alternate number';

    if (!isBlank(billing.postalCode) && !isPostalCode(String(billing.postalCode)))
      errors['billing.postalCode'] = 'Enter a valid postal / ZIP code';

    /* -- card: all-or-nothing once started -- */
    const card = billing.card;
    if (hasCardInput(card) && card) {
      const brand = detectCardBrand(String(card.number ?? ''));

      if (isBlank(card.holderName))
        errors['billing.card.holderName'] = 'Cardholder name is required';
      else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(String(card.holderName).trim()))
        errors['billing.card.holderName'] = 'Use the name printed on the card (letters only)';

      const numDigits = digitsOnly(String(card.number ?? ''));
      if (!numDigits) {
        errors['billing.card.number'] = 'Card number is required';
      } else if (!cardNumberLengths(brand).includes(numDigits.length)) {
        const expected = cardNumberLengths(brand);
        errors['billing.card.number'] =
          brand === 'Unknown'
            ? 'Card number must be 13 to 19 digits'
            : `A ${brand} number has ${expected.join(' or ')} digits`;
      } else if (!luhn(numDigits)) {
        errors['billing.card.number'] = 'This card number is invalid — check the digits';
      }

      if (isBlank(card.expiry)) errors['billing.card.expiry'] = 'Expiry is required';
      else if (!parseExpiry(String(card.expiry)))
        errors['billing.card.expiry'] = 'Use MM/YY';
      else if (!isExpiryValid(String(card.expiry)))
        errors['billing.card.expiry'] = 'This card has expired';

      const wantCvv = cvvLength(brand);
      if (isBlank(card.cvv)) errors['billing.card.cvv'] = 'CVV is required';
      else if (digitsOnly(String(card.cvv)).length !== wantCvv)
        errors['billing.card.cvv'] = `CVV must be ${wantCvv} digits`;
    }
  }

  return errors;
}

/** First error key in `LEAD_FIELD_ORDER`, for focusing after a failed submit. */
export function firstErrorKey(errors: ValidationErrors): string | undefined {
  const keys = Object.keys(errors);
  if (keys.length === 0) return undefined;
  return LEAD_FIELD_ORDER.find((k) => k in errors) ?? keys[0];
}
