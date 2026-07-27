import { Schema, model, Document, Types } from "mongoose";
import { LeaveType, LeaveStatus } from "../types";

export interface ILeave extends Document {
  userId: Types.ObjectId;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
  days: number;
}

const leaveSchema = new Schema<ILeave>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["sick", "casual", "earned"], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote: String,
    reviewedAt: Date,
    days: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Leave = model<ILeave>("Leave", leaveSchema);

export interface ILeaveBalance extends Document {
  userId: Types.ObjectId;
  year: number;
  sick: { entitled: number; used: number };
  casual: { entitled: number; used: number };
  earned: { entitled: number; used: number };
}

const leaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    sick: { entitled: { type: Number, default: 10 }, used: { type: Number, default: 0 } },
    casual: { entitled: { type: Number, default: 10 }, used: { type: Number, default: 0 } },
    earned: { entitled: { type: Number, default: 14 }, used: { type: Number, default: 0 } },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

export const LeaveBalance = model<ILeaveBalance>("LeaveBalance", leaveBalanceSchema);

export interface IHoliday extends Document {
  name: string;
  date: string;
  type: "government" | "optional" | "company";
  description?: string;
  createdBy: Types.ObjectId;
}

const holidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["government", "optional", "company"], default: "government" },
    description: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Holiday = model<IHoliday>("Holiday", holidaySchema);

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    read: { type: Boolean, default: false },
    link: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Notification = model<INotification>("Notification", notificationSchema);
