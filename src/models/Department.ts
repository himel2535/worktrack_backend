import { Schema, model, Document, Types } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  slug: string;
  headUserId?: Types.ObjectId;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    headUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Department = model<IDepartment>("Department", departmentSchema);
