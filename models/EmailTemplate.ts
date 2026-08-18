import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailTemplate extends Document {
  name: string;
  category: 'Quotation' | 'Follow-up' | 'Ticket Confirmation' | 'Inquiry' | 'General';
  subject: string;
  bodyHtml: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Quotation', 'Follow-up', 'Ticket Confirmation', 'Inquiry', 'General'],
      default: 'General',
    },
    subject: { type: String, required: true, trim: true },
    bodyHtml: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const EmailTemplate: Model<IEmailTemplate> =
  mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;
