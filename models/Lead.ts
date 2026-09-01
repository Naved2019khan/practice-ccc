import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  BOOKING_TYPES,
  DEFAULT_BOOKING_TYPE,
  LEAD_STATUSES,
  DEFAULT_LEAD_STATUS,
  type BookingType,
  type LeadStatus,
} from '@/lib/leadOptions';

export interface INote {
  id: string;
  text: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
}

export interface IReply {
  id: string;
  text: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
}

export interface IComment {
  id: string;
  text: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
  replies: IReply[];
}

export interface IActivityLog {
  id: string;
  type: string;
  description: string;
  actorName: string;
  timestamp: Date;
  meta?: any;
}

export interface IEmailTrackingEvent {
  trackingId: string;
  type: 'open' | 'click';
  ip?: string;
  userAgent?: string;
  linkUrl?: string;
  timestamp: Date;
}

export interface IBillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface IBillingCard {
  holderName?: string;
  /** Digits only. */
  number?: string;
  cvv?: string;
  /** 1-12. */
  expiryMonth?: number;
  /** Four digits. */
  expiryYear?: number;
  /** Derived from the IIN at write time. */
  brand?: string;
  last4?: string;
}

export interface IBilling {
  email?: string;
  /** E.164 calling code, with leading '+'. */
  phoneDialCode?: string;
  /** ISO 3166-1 alpha-2 for the dial code above. */
  phoneCountryCode?: string;
  phone?: string;
  alternatePhone?: string;
  address?: IBillingAddress;
  country?: string;
  countryCode?: string;
  card?: IBillingCard;
}

export interface ILeadAttachment {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  formattedSize: string;
  fileType: string;
  url: string;
  s3Key?: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

export interface IPassenger {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  type?: 'Adult' | 'Child' | 'Infant';
  dob?: string; // stored as ISO date string for simplicity
  gender?: 'Male' | 'Female' | 'Other' | '';
  phone?: string;
  email?: string;
}

export interface IAddOns {
  meal?: string;
  baggage?: string;
  seat?: string;
  notes?: string;
}

export interface IMultiCityRoute {
  id: string;
  origin: string;
  destination: string;
  travelDate?: string;
}

export interface IFlightLeg {
  id: string;
  carrier?: string;
  flightNumber?: string;
  flightClass?: string;
  departingAirport?: string;
  departingAt?: string; // ISO datetime string
  arrivingAirport?: string;
  arrivingAt?: string;
  meal?: string;
  baggage?: string;
  seat?: string;
}

export interface IPortalTrackingItem {
  id: string;
  event: 'email_sent' | 'portal_viewed' | 'link_clicked' | 'ticket_downloaded' | 'booking_authorized';
  description?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  /** For booking_authorized: geo-resolved location string, e.g. "New York, NY, US" */
  location?: string;
  meta?: any;
  timestamp: Date;
}

export interface ICustomerPortal {
  trackingToken?: string;
  lastSentAt?: Date;
  lastSentTo?: string;
  lastSentSubject?: string;
  lastSentBy?: string;
  lastViewedAt?: Date;
  lastViewedIp?: string;
  lastViewedLocation?: string;
  lastViewedDevice?: string;
  viewCount: number;
  downloadCount: number;
  history: IPortalTrackingItem[];
}

export interface ILead extends Document {
  name: string;
  phone: string;
  email?: string;
  source: string;
  origin: string;
  destination: string;
  travelDate?: Date;
  returnDate?: Date;
  pax: number;
  tripType: 'One Way' | 'Round Trip' | 'Multi-City';
  /** What the customer is asking for — new booking, date change, refund, etc. */
  bookingType: BookingType;
  stage: 'New' | 'Contacted' | 'Quoted' | 'Negotiation' | 'Booked' | 'Ticketed' | 'Lost';
  /** Operational state of the request, orthogonal to the sales `stage`. */
  status: LeadStatus;
  assignedTo?: mongoose.Types.ObjectId | null;
  /** Agent or Concierge name override */
  agentName?: string;
  paymentStatus: 'Pending' | 'Authorized' | 'Partial' | 'Paid' | 'Failed' | 'Refunded';
  pnr?: string;
  /** HTML itinerary pasted from an external PNR converter (e.g. pnrconverter.com). */
  pnrHtml?: string;
  ticketNumber?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  /** Charge paid to the airline. */
  airlineCharge?: number;
  /** Consolidator's charge / service fee. */
  airlineConsolidatorCharge?: number;
  /** Total amount — defaults to airlineCharge + airlineConsolidatorCharge but may be overridden. */
  totalAmount?: number;
  /** Controls how pricing is rendered in the booking template. */
  pricingDisplayMode?: 'total' | 'breakdown';
  currency: string;
  nextFollowUpDate?: Date;
  billing?: IBilling;
  attachments: ILeadAttachment[];
  passengers: IPassenger[];
  flightLegs: IFlightLeg[];
  multiCityRoutes?: IMultiCityRoute[];
  addOns?: IAddOns;
  remarks?: string;
  initialNote?: string;
  customerPortal?: ICustomerPortal;
  notes: INote[];
  comments: IComment[];
  activityLog: IActivityLog[];
  emailTrackingEvents: IEmailTrackingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    authorName: { type: String, default: 'System' },
    authorRole: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReplySchema = new Schema<IReply>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    authorName: { type: String, default: 'System' },
    authorRole: { type: String, default: 'staff' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommentSchema = new Schema<IComment>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    authorName: { type: String, default: 'System' },
    authorRole: { type: String, default: 'staff' },
    createdAt: { type: Date, default: Date.now },
    replies: [ReplySchema],
  },
  { _id: false }
);

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    actorName: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const EmailTrackingEventSchema = new Schema<IEmailTrackingEvent>(
  {
    trackingId: { type: String, required: true },
    type: { type: String, enum: ['open', 'click'], required: true },
    ip: { type: String },
    userAgent: { type: String },
    linkUrl: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BillingAddressSchema = new Schema<IBillingAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

/**
 * Payment instrument stored against the lead.
 *
 * NOTE: `number` and `cvv` hold the raw values, at the product owner's explicit
 * request. Holding a full PAN or any CVV in your own datastore puts this
 * collection in PCI-DSS scope and makes it a breach target — a payment
 * processor's token (or `brand` + `last4` alone) is the safe alternative.
 * `select: false` keeps them out of query results unless a caller asks for them
 * by name.
 */
const BillingCardSchema = new Schema<IBillingCard>(
  {
    holderName: { type: String, trim: true },
    number: { type: String, trim: true, select: false },
    cvv: { type: String, trim: true, select: false },
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
    brand: { type: String, trim: true },
    last4: { type: String, trim: true },
  },
  { _id: false }
);

const BillingSchema = new Schema<IBilling>(
  {
    email: { type: String, trim: true, lowercase: true },
    phoneDialCode: { type: String, trim: true },
    phoneCountryCode: { type: String, trim: true, uppercase: true },
    phone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    address: { type: BillingAddressSchema, default: undefined },
    country: { type: String, trim: true },
    countryCode: { type: String, trim: true, uppercase: true },
    card: { type: BillingCardSchema, default: undefined },
  },
  { _id: false }
);

const LeadAttachmentSchema = new Schema<ILeadAttachment>(
  {
    id: { type: String, required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    formattedSize: { type: String, default: '0 KB' },
    fileType: { type: String, default: 'application/pdf' },
    url: { type: String, required: true },
    s3Key: { type: String },
    uploadedBy: { type: String, default: 'System' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PassengerSchema = new Schema<IPassenger>(
  {
    id: { type: String, required: true },
    firstName: { type: String, trim: true, default: '' },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['Adult', 'Child', 'Infant'], default: 'Adult' },
    dob: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
  },
  { _id: false }
);

const MultiCityRouteSchema = new Schema<IMultiCityRoute>(
  {
    id: { type: String, required: true },
    origin: { type: String, trim: true, default: '' },
    destination: { type: String, trim: true, default: '' },
    travelDate: { type: String, default: '' },
  },
  { _id: false }
);

const AddOnsSchema = new Schema<IAddOns>(
  {
    meal: { type: String, trim: true, default: '' },
    baggage: { type: String, trim: true, default: '' },
    seat: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const FlightLegSchema = new Schema<IFlightLeg>(
  {
    id: { type: String, required: true },
    carrier: { type: String, trim: true, default: '' },
    flightNumber: { type: String, trim: true, default: '' },
    flightClass: { type: String, trim: true, default: 'Economy' },
    departingAirport: { type: String, trim: true, default: '' },
    departingAt: { type: String, default: '' },
    arrivingAirport: { type: String, trim: true, default: '' },
    arrivingAt: { type: String, default: '' },
    meal: { type: String, trim: true, default: '' },
    baggage: { type: String, trim: true, default: '' },
    seat: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const PortalTrackingItemSchema = new Schema<IPortalTrackingItem>(
  {
    id: { type: String, required: true },
    event: {
      type: String,
      enum: ['email_sent', 'portal_viewed', 'link_clicked', 'ticket_downloaded', 'booking_authorized'],
      required: true,
    },
    description: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    location: { type: String },
    meta: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerPortalSchema = new Schema<ICustomerPortal>(
  {
    trackingToken: { type: String, index: true },
    lastSentAt: { type: Date },
    lastSentTo: { type: String },
    lastSentSubject: { type: String },
    lastSentBy: { type: String },
    lastViewedAt: { type: Date },
    lastViewedIp: { type: String },
    lastViewedLocation: { type: String },
    lastViewedDevice: { type: String },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    history: [PortalTrackingItemSchema],
  },
  { _id: false }
);

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    source: {
      type: String,
      default: 'Website',
      enum: ['Website', 'Contact Us', 'Referral', 'Phone', 'Ads', 'Newsletter', 'Walk-in', 'Import', 'Manual', 'Other'],
    },
    origin: { type: String, trim: true, default: '' },
    destination: { type: String, trim: true, default: '' },
    travelDate: { type: Date },
    returnDate: { type: Date },
    pax: { type: Number, default: 1, min: 1 },
    tripType: {
      type: String,
      enum: ['One Way', 'Round Trip', 'Multi-City'],
      default: 'Round Trip',
    },
    bookingType: {
      type: String,
      enum: [...BOOKING_TYPES],
      default: DEFAULT_BOOKING_TYPE,
      index: true,
    },
    stage: {
      type: String,
      enum: ['New', 'Contacted', 'Quoted', 'Negotiation', 'Booked', 'Ticketed', 'Lost'],
      default: 'New',
      index: true,
    },
    status: {
      type: String,
      enum: [...LEAD_STATUSES],
      default: DEFAULT_LEAD_STATUS,
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    agentName: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Authorized', 'Partial', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
      index: true,
    },
    pnr: { type: String, trim: true },
    pnrHtml: { type: String, default: '' },
    ticketNumber: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    referenceNumber: { type: String, trim: true, index: true },
    airlineCharge: { type: Number, default: 0 },
    airlineConsolidatorCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    pricingDisplayMode: { type: String, enum: ['total', 'breakdown'], default: 'total' },
    currency: { type: String, default: 'USD' },
    nextFollowUpDate: { type: Date, index: true },
    billing: { type: BillingSchema, default: undefined },
    attachments: { type: [LeadAttachmentSchema], default: [] },
    passengers: { type: [PassengerSchema], default: [] },
    flightLegs: { type: [FlightLegSchema], default: [] },
    multiCityRoutes: { type: [MultiCityRouteSchema], default: [] },
    addOns: { type: AddOnsSchema, default: () => ({ meal: '', baggage: '', seat: '', notes: '' }) },
    remarks: { type: String, trim: true },
    initialNote: { type: String, trim: true },
    customerPortal: { type: CustomerPortalSchema, default: () => ({ viewCount: 0, downloadCount: 0, history: [] }) },
    notes: [NoteSchema],
    comments: [CommentSchema],
    activityLog: [ActivityLogSchema],
    emailTrackingEvents: [EmailTrackingEventSchema],
  },
  { timestamps: true }
);

// Auto-generate referenceNumber and invoiceNumber if not provided
LeadSchema.pre('save', function (next) {
  if (!this.referenceNumber) {
    const shortId = this._id ? this._id.toString().slice(-6).toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referenceNumber = this.invoiceNumber || `AC-${shortId}`;
  }
  if (!this.invoiceNumber) {
    this.invoiceNumber = this.referenceNumber;
  }
  next();
});

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;
