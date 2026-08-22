import { connectToDatabase } from '@/lib/db';
import { User, IUser } from '@/models/User';
import { Setting } from '@/models/Setting';
import mongoose from 'mongoose';

export interface AssignResult {
  assignedTo: mongoose.Types.ObjectId | null;
  assignedStaffName: string | null;
  assignedStaffEmail: string | null;
  autoAssigned: boolean;
}

/**
 * Checks if auto-assignment is enabled and determines the next staff member via Round-Robin
 */
export async function getNextRoundRobinStaff(): Promise<AssignResult> {
  await connectToDatabase();

  // 1. Check auto-assign setting
  const autoAssignSetting = await Setting.findOne({ key: 'autoAssignEnabled' });
  const isAutoAssignOn = autoAssignSetting ? Boolean(autoAssignSetting.value) : true; // Default ON

  if (!isAutoAssignOn) {
    return {
      assignedTo: null,
      assignedStaffName: null,
      assignedStaffEmail: null,
      autoAssigned: false,
    };
  }

  // 2. Fetch all active staff members
  const activeStaff = await User.find({ role: 'staff', active: true }).sort({ createdAt: 1 });

  if (activeStaff.length === 0) {
    return {
      assignedTo: null,
      assignedStaffName: null,
      assignedStaffEmail: null,
      autoAssigned: false,
    };
  }

  // 3. Retrieve or initialize round-robin index
  let indexSetting = await Setting.findOne({ key: 'roundRobinIndex' });
  let currentIndex = indexSetting ? Number(indexSetting.value) : 0;

  if (isNaN(currentIndex) || currentIndex < 0) {
    currentIndex = 0;
  }

  // Determine selected staff
  const staffIndex = currentIndex % activeStaff.length;
  const selectedStaff = activeStaff[staffIndex];

  // 4. Increment index for the next lead
  const nextIndex = (staffIndex + 1) % activeStaff.length;
  await Setting.findOneAndUpdate(
    { key: 'roundRobinIndex' },
    { value: nextIndex, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return {
    assignedTo: selectedStaff._id as mongoose.Types.ObjectId,
    assignedStaffName: selectedStaff.name,
    assignedStaffEmail: selectedStaff.email,
    autoAssigned: true,
  };
}
