import { Schema, model, Document, Types } from "mongoose";
import { UserRole } from "../types";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  departmentId?: Types.ObjectId;
  designation?: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  refreshTokenHash?: string;
  officeHours?: { start: string; end: string };
  salaryMeta?: { amount?: number; currency?: string };
  totpSecret?: string;
  totpEnabled: boolean;
  notificationPrefs?: { email: boolean; push: boolean; updateReminder: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    designation: String,
    avatar: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    refreshTokenHash: String,
    officeHours: { start: String, end: String },
    salaryMeta: { amount: Number, currency: { type: String, default: "BDT" } },
    totpSecret: String,
    totpEnabled: { type: Boolean, default: false },
    notificationPrefs: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      updateReminder: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
