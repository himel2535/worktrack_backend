import { Types } from "mongoose";
import { Leave, LeaveBalance } from "../models/Leave";
import { Attendance } from "../models/Attendance";
import { Notification } from "../models/Leave";
import { getCompanySettings } from "./scoring";
import { daysBetween } from "../utils/helpers";

export async function ensureLeaveBalance(userId: string, year: number) {
  let balance = await LeaveBalance.findOne({ userId: new Types.ObjectId(userId), year });
  if (!balance) {
    const settings = await getCompanySettings();
    balance = await LeaveBalance.create({
      userId: new Types.ObjectId(userId),
      year,
      sick: { entitled: settings.leaveEntitlements.sick, used: 0 },
      casual: { entitled: settings.leaveEntitlements.casual, used: 0 },
      earned: { entitled: settings.leaveEntitlements.earned, used: 0 },
    });
  }
  return balance;
}

export async function approveLeave(leaveId: string, reviewerId: string, note?: string) {
  const leave = await Leave.findById(leaveId);
  if (!leave) throw new Error("Leave not found");
  if (leave.status !== "pending") throw new Error("Leave already processed");

  leave.status = "approved";
  leave.reviewedBy = new Types.ObjectId(reviewerId);
  leave.reviewNote = note;
  leave.reviewedAt = new Date();
  await leave.save();

  const year = new Date(leave.startDate).getFullYear();
  const balance = await ensureLeaveBalance(leave.userId.toString(), year);
  const type = leave.type as "sick" | "casual" | "earned";
  balance[type].used += leave.days;
  await balance.save();

  const start = new Date(leave.startDate);
  for (let i = 0; i < leave.days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    await Attendance.findOneAndUpdate(
      { userId: leave.userId, date: dateStr },
      {
        userId: leave.userId,
        date: dateStr,
        status: "approved_leave",
        workTime: "0h 0m",
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
      },
      { upsert: true }
    );
  }

  await Notification.create({
    userId: leave.userId,
    type: "leave_decision",
    title: "Leave Approved",
    body: `Your ${leave.type} leave (${leave.startDate} to ${leave.endDate}) has been approved.`,
    link: "/leave/history",
  });

  return leave;
}

export async function rejectLeave(leaveId: string, reviewerId: string, note?: string) {
  const leave = await Leave.findById(leaveId);
  if (!leave) throw new Error("Leave not found");
  leave.status = "rejected";
  leave.reviewedBy = new Types.ObjectId(reviewerId);
  leave.reviewNote = note;
  leave.reviewedAt = new Date();
  await leave.save();

  await Notification.create({
    userId: leave.userId,
    type: "leave_decision",
    title: "Leave Rejected",
    body: note || `Your leave request has been rejected.`,
    link: "/leave/history",
  });

  return leave;
}

export function computeLeaveDays(startDate: string, endDate: string) {
  return daysBetween(startDate, endDate);
}
