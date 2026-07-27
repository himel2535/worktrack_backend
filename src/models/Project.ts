import { Schema, model, Document, Types } from "mongoose";
import { ProjectStatus } from "../types";

export interface IProject extends Document {
  name: string;
  category: string;
  description: string;
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  deadline: string;
  status: ProjectStatus;
  lastWorked: string;
  icon: string;
  archived: boolean;
  createdBy: Types.ObjectId;
  departmentId?: Types.ObjectId;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    category: { type: String, default: "General" },
    description: String,
    progress: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksTotal: { type: Number, default: 0 },
    deadline: String,
    status: { type: String, enum: ["in_progress", "pending", "completed"], default: "pending" },
    lastWorked: String,
    icon: { type: String, default: "folder" },
    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
  },
  { timestamps: true }
);

export const Project = model<IProject>("Project", projectSchema);
