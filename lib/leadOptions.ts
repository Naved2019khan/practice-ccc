/**
 * Booking Type and Status vocabularies for a lead.
 *
 * Single source of truth: the Mongoose enums, the New Lead drawer, the pipeline
 * table's inline dropdowns and filters, and the CSV/XLSX export all read from
 * here, so adding a value is a one-line change.
 *
 * Values are stored as their display strings, matching how `stage`, `source`
 * and `paymentStatus` already work in `models/Lead.ts`.
 */

/** What the customer is actually asking the agent to do. */
export const BOOKING_TYPES = [
  'New Booking',
  'Date Change',
  'Time Change',
  'Flight Exchange',
  'Schedule Change',
  'Cancellation – Refund',
  'Cancellation – Future Travel Credit',
  'Seat Assignment',
  'Seat Upgrade',
  'Flight Assistance',
  'Name Correction',
  'Baggage Assistance',
  'Special Assistance (Wheelchair, Meals, etc.)',
] as const;

export type BookingType = (typeof BOOKING_TYPES)[number];

export const DEFAULT_BOOKING_TYPE: BookingType = 'New Booking';

/**
 * Where the request has got to operationally. Distinct from `stage`, which
 * tracks the sales pipeline (New → Quoted → Ticketed): a lead can be
 * `Ticketed` and still `Waiting for Airline` on a schedule change.
 */
export const LEAD_STATUSES = [
  'Open',
  'In Progress',
  'Waiting for Airline',
  'Waiting for Customer',
  'Completed',
  'Cancelled / Refunded / Chargeback',
  'Lost',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DEFAULT_LEAD_STATUS: LeadStatus = 'Open';

/**
 * Tailwind classes per status, so the table dropdown reads at a glance.
 * Written as literal strings because Tailwind scans this file for class names.
 */
const STATUS_TONES: Record<string, string> = {
  Open: 'bg-amber-50 text-amber-900 border-amber-300',
  'In Progress': 'bg-blue-50 text-blue-900 border-blue-300',
  'Waiting for Airline': 'bg-purple-50 text-purple-900 border-purple-300',
  'Waiting for Customer': 'bg-orange-50 text-orange-900 border-orange-300',
  Completed: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  'Cancelled / Refunded / Chargeback': 'bg-red-50 text-red-900 border-red-300',
  Lost: 'bg-stone-100 text-stone-700 border-stone-300',
};

export const statusTone = (status: string | undefined): string =>
  STATUS_TONES[status ?? ''] ?? 'bg-ember-surface text-ember-text-primary border-ember-border';

/** Shorter labels for the narrow table column; falls back to the full value. */
const BOOKING_TYPE_SHORT: Record<string, string> = {
  'Cancellation – Refund': 'Cancel – Refund',
  'Cancellation – Future Travel Credit': 'Cancel – Credit',
  'Special Assistance (Wheelchair, Meals, etc.)': 'Special Assistance',
};

export const bookingTypeShort = (value: string | undefined): string =>
  value ? BOOKING_TYPE_SHORT[value] ?? value : '';

export const isBookingType = (v: unknown): v is BookingType =>
  BOOKING_TYPES.includes(v as BookingType);

export const isLeadStatus = (v: unknown): v is LeadStatus =>
  LEAD_STATUSES.includes(v as LeadStatus);
