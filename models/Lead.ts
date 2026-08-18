import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote {
  id: string;
  text: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
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
  stage: 'New' | 'Contacted' | 'Quoted' | 'Negotiation' | 'Booked' | 'Ticketed' | 'Lost';
  assignedTo?: mongoose.Types.ObjectId | null;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  pnr?: string;
  invoiceNumber?: string;
  priceQuoted?: number;
  currency: string;
  nextFollowUpDate?: Date;
  notes: INote[];
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

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    source: {
      type: String,
      default: 'Website',
      enum: ['Website', 'Contact Us', 'Referral', 'Phone', 'Ads', 'Newsletter', 'Walk-in', 'Other'],
    },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    travelDate: { type: Date },
    returnDate: { type: Date },
    pax: { type: Number, default: 1, min: 1 },
    tripType: {
      type: String,
      enum: ['One Way', 'Round Trip', 'Multi-City'],
      default: 'Round Trip',
    },
    stage: {
      type: String,
      enum: ['New', 'Contacted', 'Quoted', 'Negotiation', 'Booked', 'Ticketed', 'Lost'],
      default: 'New',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Paid'],
      default: 'Pending',
      index: true,
    },
    pnr: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    priceQuoted: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    nextFollowUpDate: { type: Date, index: true },
    notes: [NoteSchema],
    activityLog: [ActivityLogSchema],
    emailTrackingEvents: [EmailTrackingEventSchema],
  },
  { timestamps: true }
);

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;
