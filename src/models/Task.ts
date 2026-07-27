import { Schema, model, Document, Types } from "mongoose";
import { TaskStatus, TaskPriority } from "../types";

export interface ITask extends Document {
  title: string;
  description: string;
  projectId: Types.ObjectId;
  projectName: string;
  assignedTo?: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  progress: number;
  taskType: string;
  estimatedTime: string;
  spentTime: string;
  departmentFields?: Record<string, unknown>;
  attachments?: { name: string; size: string; type: string; url?: string }[];
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "review", "completed"], default: "todo" },
    deadline: String,
    progress: { type: Number, default: 0 },
    taskType: { type: String, default: "General" },
    estimatedTime: String,
    spentTime: { type: String, default: "0h 0m" },
    departmentFields: Schema.Types.Mixed,
    attachments: [{ name: String, size: String, type: String, url: String }],
  },
  { timestamps: true }
);

export const Task = model<ITask>("Task", taskSchema);
