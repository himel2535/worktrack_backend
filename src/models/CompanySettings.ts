import { Schema, model, Document } from "mongoose";

export interface ICompanySettings extends Document {
  defaultOfficeStart: string;
  defaultOfficeEnd: string;
  graceMinutes: number;
  updateIntervalMin: number;
  latePenaltyAfterDays: number;
  latePenaltyPoints: number;
  absentPenaltyPoints: number;
  leaveEntitlements: { sick: number; casual: number; earned: number };
}

const companySettingsSchema = new Schema<ICompanySettings>(
  {
    defaultOfficeStart: { type: String, default: "10:00" },
    defaultOfficeEnd: { type: String, default: "18:00" },
    graceMinutes: { type: Number, default: 10 },
    updateIntervalMin: { type: Number, default: 60 },
    latePenaltyAfterDays: { type: Number, default: 3 },
    latePenaltyPoints: { type: Number, default: 5 },
    absentPenaltyPoints: { type: Number, default: 2 },
    leaveEntitlements: {
      sick: { type: Number, default: 10 },
      casual: { type: Number, default: 10 },
      earned: { type: Number, default: 14 },
    },
  },
  { timestamps: true }
);

export const CompanySettings = model<ICompanySettings>("CompanySettings", companySettingsSchema);
