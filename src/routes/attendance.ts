import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Attendance } from "../models/Attendance";
import { TimelineEvent } from "../models/Attendance";
import { WorkSession } from "../models/WorkSession";
import { evaluateCheckIn, logActivity, getCompanySettings } from "../services/scoring";
import { formatDuration, formatTime12, getClientIp, todayDateStr } from "../utils/helpers";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const records = await Attendance.find({ userId: new Types.ObjectId(req.user!.id) })
    .sort({ date: -1 })
    .limit(60);
  res.json(records);
});

router.get("/today", async (req: AuthRequest, res) => {
  const record = await Attendance.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date: todayDateStr(),
  });
  res.json(record || { isClockedIn: false });
});

router.post("/check-in", async (req: AuthRequest, res) => {
  const now = new Date();
  const { status, lateMinutes } = await evaluateCheckIn(req.user!.id, now);
  await logActivity(req.user!.id, "check_in", {
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] as string,
  });
  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(now),
    title: status === "late" ? "Checked In (Late)" : "Checked In",
    type: "present",
    date: todayDateStr(),
  });
  res.json({ status, lateMinutes, inTime: formatTime12(now) });
});

router.post("/check-out", async (req: AuthRequest, res) => {
  const now = new Date();
  const date = todayDateStr();
  const session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date,
    isActive: true,
  });
  const record = await Attendance.findOneAndUpdate(
    { userId: new Types.ObjectId(req.user!.id), date },
    { outTime: formatTime12(now) },
    { new: true }
  );
  if (session) {
    session.isActive = false;
    session.endedAt = now;
    await session.save();
  }
  await logActivity(req.user!.id, "check_out", {
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] as string,
  });
  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(now),
    title: "Checked Out",
    type: "present",
    date,
  });
  res.json(record);
});

router.post("/off-day", async (req: AuthRequest, res) => {
  const date = todayDateStr();
  const record = await Attendance.findOneAndUpdate(
    { userId: new Types.ObjectId(req.user!.id), date },
    {
      userId: new Types.ObjectId(req.user!.id),
      date,
      status: "weekly_off",
      isOffDay: true,
      workTime: "0h 0m",
      day: new Date().toLocaleDateString("en-US", { weekday: "short" }),
    },
    { upsert: true, new: true }
  );
  res.json(record);
});

router.get("/calendar", async (req: AuthRequest, res) => {
  const month = (req.query.month as string) || todayDateStr().slice(0, 7);
  const records = await Attendance.find({
    userId: new Types.ObjectId(req.user!.id),
    date: { $regex: `^${month}` },
  });
  res.json(records);
});

router.get("/stats", async (req: AuthRequest, res) => {
  const month = (req.query.month as string) || todayDateStr().slice(0, 7);
  const records = await Attendance.find({
    userId: new Types.ObjectId(req.user!.id),
    date: { $regex: `^${month}` },
  });
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const total = records.length || 1;
  res.json({
    presentDays: present,
    lateDays: late,
    absentDays: absent,
    attendancePercent: Math.round((present / total) * 100),
    latePenalty: late >= 3 ? 5 : 0,
  });
});

export default router;
