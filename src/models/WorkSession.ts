import { Schema, model, Document, Types } from "mongoose";
import { UpdateStatus } from "../types";

export interface IWorkSession extends Document {
  userId: Types.ObjectId;
  isActive: boolean;
  projectId?: Types.ObjectId;
  projectName?: string;
  taskId?: Types.ObjectId;
  taskName?: string;
  workPlan?: string;
  startedAt?: Date;
  pausedAt?: Date;
  endedAt?: Date;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  lastUpdateAt?: Date;
  nextUpdateDueAt?: Date;
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  date: string;
}

const workSessionSchema = new Schema<IWorkSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: false },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    projectName: String,
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    taskName: String,
    workPlan: String,
    startedAt: Date,
    pausedAt: Date,
    endedAt: Date,
    totalWorkSeconds: { type: Number, default: 0 },
    totalBreakSeconds: { type: Number, default: 0 },
    lastUpdateAt: Date,
    nextUpdateDueAt: Date,
    startPhotoUrl: String,
    endPhotoUrl: String,
    date: { type: String, required: true },
  },
  { timestamps: true }
);

workSessionSchema.index({ userId: 1, date: 1 });

export const WorkSession = model<IWorkSession>("WorkSession", workSessionSchema);

export interface IHourlyUpdate extends Document {
  userId: Types.ObjectId;
  workSessionId?: Types.ObjectId;
  time: string;
  dueTime?: string;
  title: string;
  description: string;
  status: UpdateStatus;
  points: number;
  attachments?: string[];
  date: string;
}

const hourlyUpdateSchema = new Schema<IHourlyUpdate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workSessionId: { type: Schema.Types.ObjectId, ref: "WorkSession" },
    time: String,
    dueTime: String,
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: ["on_time", "missed", "upcoming", "submitted"], default: "submitted" },
    points: { type: Number, default: 1 },
    attachments: [String],
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export const HourlyUpdate = model<IHourlyUpdate>("HourlyUpdate", hourlyUpdateSchema);
