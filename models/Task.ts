import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  leadId?: mongoose.Types.ObjectId | null;
  assignedTo: mongoose.Types.ObjectId;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: Date;
  status: 'Pending' | 'In Progress' | 'Completed';
  sendEmailAlert: boolean;
  emailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending', index: true },
    sendEmailAlert: { type: Boolean, default: false },
    emailSentAt: { type: Date },
  },
  { timestamps: true }
);

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
