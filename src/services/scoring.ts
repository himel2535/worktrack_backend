import { Types } from "mongoose";
import { ActivityLog } from "../models/Attendance";
import { PointHistory } from "../models/Attendance";
import { Attendance } from "../models/Attendance";
import { CompanySettings } from "../models/CompanySettings";
import { formatTime12, parseTimeToMinutes, todayDateStr } from "../utils/helpers";

export async function logActivity(
  userId: string,
  action: string,
  meta?: { ip?: string; userAgent?: string; geo?: string; metadata?: Record<string, unknown> }
) {
  await ActivityLog.create({
    userId: new Types.ObjectId(userId),
    action,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    geo: meta?.geo,
    metadata: meta?.metadata,
  });
}

export async function addPoints(userId: string, points: number, description: string) {
  await PointHistory.create({
    userId: new Types.ObjectId(userId),
    time: formatTime12(),
    description,
    points,
    date: todayDateStr(),
  });
}

export async function getCompanySettings() {
  let settings = await CompanySettings.findOne();
  if (!settings) {
    settings = await CompanySettings.create({});
  }
  return settings;
}

export async function evaluateCheckIn(userId: string, checkInTime: Date) {
  const settings = await getCompanySettings();
  const date = todayDateStr();
  const nowMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  const officeStart = parseTimeToMinutes(settings.defaultOfficeStart);
  const graceEnd = officeStart + settings.graceMinutes;

  let status: "present" | "late" = "present";
  let lateMinutes = 0;
  if (nowMinutes > graceEnd) {
    status = "late";
    lateMinutes = nowMinutes - officeStart;
  }

  const day = checkInTime.toLocaleDateString("en-US", { weekday: "short" });
  await Attendance.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), date },
    {
      userId: new Types.ObjectId(userId),
      date,
      day,
      inTime: formatTime12(checkInTime),
      status,
      lateMinutes,
      workTime: "0h 0m",
    },
    { upsert: true, new: true }
  );

  return { status, lateMinutes };
}

export async function getPointsSummary(userId: string) {
  const today = todayDateStr();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const all = await PointHistory.find({ userId: new Types.ObjectId(userId) });
  const todayPoints = all.filter((p) => p.date === today).reduce((s, p) => s + p.points, 0);
  const weekPoints = all
    .filter((p) => new Date(p.date) >= weekStart)
    .reduce((s, p) => s + p.points, 0);
  const monthPoints = all
    .filter((p) => new Date(p.date) >= monthStart)
    .reduce((s, p) => s + p.points, 0);
  const allTimePoints = all.reduce((s, p) => s + p.points, 0);

  return { todayPoints, weekPoints, monthPoints, allTimePoints };
}

export async function calculatePerformance(userId: string) {
  const points = await getPointsSummary(userId);
  const updates = await PointHistory.find({
    userId: new Types.ObjectId(userId),
    description: /update/i,
  });
  const onTime = updates.filter((u) => u.points > 0).length;
  const total = updates.length || 1;

  const discipline = Math.min(100, 70 + onTime * 3);
  const workPerformance = Math.min(100, 60 + points.monthPoints);
  const productivity = Math.min(100, 65 + points.weekPoints);
  const timelyUpdates = Math.round((onTime / total) * 100);

  const overall = Math.round(
    discipline * 0.35 + workPerformance * 0.35 + productivity * 0.2 + timelyUpdates * 0.1
  );

  return {
    overall,
    categories: [
      { id: "discipline", name: "Discipline", score: discipline, weight: 35, color: "#3B82F6" },
      { id: "work", name: "Work Performance", score: workPerformance, weight: 35, color: "#8B5CF6" },
      { id: "productivity", name: "Productivity", score: productivity, weight: 20, color: "#F97316" },
      { id: "updates", name: "Timely Updates", score: timelyUpdates, weight: 10, color: "#10B981" },
    ],
    points,
  };
}
