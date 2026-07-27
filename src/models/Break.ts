import { Schema, model, Document, Types } from "mongoose";
import { BreakType } from "../types";

export interface IBreak extends Document {
  userId: Types.ObjectId;
  startTime: string;
  endTime?: string;
  type: BreakType;
  duration: string;
  durationSeconds: number;
  projectName?: string;
  taskName?: string;
  reason?: string;
  ongoing: boolean;
  date: string;
}

const breakSchema = new Schema<IBreak>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: String, required: true },
    endTime: String,
    type: { type: String, enum: ["personal", "lunch", "prayer", "other"], default: "personal" },
    duration: { type: String, default: "0m" },
    durationSeconds: { type: Number, default: 0 },
    projectName: String,
    taskName: String,
    reason: String,
    ongoing: { type: Boolean, default: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export const Break = model<IBreak>("Break", breakSchema);
