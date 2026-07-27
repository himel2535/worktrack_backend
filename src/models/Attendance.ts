import { Schema, model, Document, Types } from "mongoose";
import { AttendanceStatus } from "../types";

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  date: string;
  day: string;
  inTime?: string;
  outTime?: string;
  workTime: string;
  workSeconds: number;
  breakSeconds: number;
  status: AttendanceStatus;
  lateMinutes: number;
  points: number;
  isOffDay: boolean;
  overtimeSeconds: number;
  notes?: string;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    day: String,
    inTime: String,
    outTime: String,
    workTime: { type: String, default: "0h 0m" },
    workSeconds: { type: Number, default: 0 },
    breakSeconds: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["present", "late", "absent", "weekly_off", "approved_leave", "holiday"],
      default: "absent",
    },
    lateMinutes: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    isOffDay: { type: Boolean, default: false },
    overtimeSeconds: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = model<IAttendance>("Attendance", attendanceSchema);

export interface ITimelineEvent extends Document {
  userId: Types.ObjectId;
  time: string;
  title: string;
  description?: string;
  type: string;
  points?: number;
  badge?: string;
  date: string;
}

const timelineSchema = new Schema<ITimelineEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    time: String,
    title: String,
    description: String,
    type: String,
    points: Number,
    badge: String,
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export const TimelineEvent = model<ITimelineEvent>("TimelineEvent", timelineSchema);

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  action: string;
  ip?: string;
  userAgent?: string;
  geo?: string;
  metadata?: Record<string, unknown>;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    ip: String,
    userAgent: String,
    geo: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);

export interface IUserNote extends Document {
  userId: Types.ObjectId;
  date: string;
  note: string;
}

const userNoteSchema = new Schema<IUserNote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

userNoteSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserNote = model<IUserNote>("UserNote", userNoteSchema);

export interface IPointHistory extends Document {
  userId: Types.ObjectId;
  time: string;
  description: string;
  points: number;
  date: string;
}

const pointHistorySchema = new Schema<IPointHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    time: String,
    description: String,
    points: Number,
    date: String,
  },
  { timestamps: true }
);

export const PointHistory = model<IPointHistory>("PointHistory", pointHistorySchema);
