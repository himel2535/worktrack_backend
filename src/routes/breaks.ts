import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Break } from "../models/Break";
import { WorkSession } from "../models/WorkSession";
import { TimelineEvent } from "../models/Attendance";
import { formatDuration, formatTime12, todayDateStr } from "../utils/helpers";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const breaks = await Break.find({
    userId: new Types.ObjectId(req.user!.id),
    date,
  }).sort({ createdAt: -1 });
  res.json(breaks);
});

router.get("/active", async (req: AuthRequest, res) => {
  const active = await Break.findOne({
    userId: new Types.ObjectId(req.user!.id),
    ongoing: true,
  });
  res.json(active);
});

const BREAK_DEFAULT_REASONS: Record<string, string> = {
  personal: "Personal break",
  lunch: "Lunch break",
  prayer: "Prayer break",
};

router.post("/start", async (req: AuthRequest, res) => {
  const { type, reason, projectName, taskName } = req.body;
  const breakType = type || "personal";
  const trimmedReason = reason?.trim();
  if (breakType === "other" && !trimmedReason) {
    return res.status(400).json({ error: "Please provide a reason for other break type" });
  }
  const finalReason = trimmedReason || BREAK_DEFAULT_REASONS[breakType] || "Break";

  const existing = await Break.findOne({
    userId: new Types.ObjectId(req.user!.id),
    ongoing: true,
  });
  if (existing) return res.status(400).json({ error: "Already on break" });

  const now = new Date();
  const date = todayDateStr();
  const brk = await Break.create({
    userId: new Types.ObjectId(req.user!.id),
    startTime: formatTime12(now),
    type: breakType,
    reason: finalReason,
    projectName,
    taskName,
    ongoing: true,
    date,
  });

  const session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    isActive: true,
  });
  if (session) {
    session.isActive = false;
    session.pausedAt = now;
    await session.save();
  }

  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(now),
    title: "Break Started",
    description: finalReason,
    type: "break_start",
    date,
  });

  res.json(brk);
});

router.post("/end", async (req: AuthRequest, res) => {
  const brk = await Break.findOne({
    userId: new Types.ObjectId(req.user!.id),
    ongoing: true,
  });
  if (!brk) return res.status(404).json({ error: "No active break" });

  const now = new Date();
  const startParts = brk.startTime.match(/(\d+):(\d+)/);
  let durationSeconds = 600;
  if (startParts) {
    const startDate = new Date();
    let h = parseInt(startParts[1]);
    const m = parseInt(startParts[2]);
    if (brk.startTime.includes("PM") && h < 12) h += 12;
    if (brk.startTime.includes("AM") && h === 12) h = 0;
    startDate.setHours(h, m, 0, 0);
    durationSeconds = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 1000));
  }

  brk.endTime = formatTime12(now);
  brk.ongoing = false;
  brk.durationSeconds = durationSeconds;
  brk.duration = formatDuration(durationSeconds);
  await brk.save();

  const session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date: todayDateStr(),
  }).sort({ updatedAt: -1 });
  if (session) {
    session.totalBreakSeconds += durationSeconds;
    session.isActive = true;
    session.startedAt = now;
    await session.save();
  }

  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(now),
    title: "Break Ended",
    type: "break_end",
    date: todayDateStr(),
  });

  res.json(brk);
});

router.get("/summary", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const breaks = await Break.find({
    userId: new Types.ObjectId(req.user!.id),
    date,
    ongoing: false,
  });
  const totalSeconds = breaks.reduce((s, b) => s + b.durationSeconds, 0);
  const byType = breaks.reduce(
    (acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + b.durationSeconds;
      return acc;
    },
    {} as Record<string, number>
  );
  const longest = breaks.reduce((max, b) => Math.max(max, b.durationSeconds), 0);
  res.json({
    totalBreakTime: formatDuration(totalSeconds),
    breakCount: breaks.length,
    longestBreak: formatDuration(longest),
    averageBreak: formatDuration(breaks.length ? Math.floor(totalSeconds / breaks.length) : 0),
    byType,
  });
});

export default router;
