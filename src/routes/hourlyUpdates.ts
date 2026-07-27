import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { HourlyUpdate } from "../models/WorkSession";
import { WorkSession } from "../models/WorkSession";
import { TimelineEvent } from "../models/Attendance";
import { addPoints, getCompanySettings } from "../services/scoring";
import { formatTime12, todayDateStr } from "../utils/helpers";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const updates = await HourlyUpdate.find({
    userId: new Types.ObjectId(req.user!.id),
    date,
  }).sort({ createdAt: -1 });
  res.json(updates);
});

router.post("/", async (req: AuthRequest, res) => {
  const { title, description, attachments } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title required" });

  const now = new Date();
  const date = todayDateStr();
  const session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date,
    isActive: true,
  }) || await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date,
  }).sort({ updatedAt: -1 });

  const settings = await getCompanySettings();
  let status: "on_time" | "missed" = "on_time";
  let points = 1;

  if (session?.nextUpdateDueAt) {
    if (now > session.nextUpdateDueAt) {
      status = "missed";
      points = -1;
    }
  }

  const update = await HourlyUpdate.create({
    userId: new Types.ObjectId(req.user!.id),
    workSessionId: session?._id,
    time: formatTime12(now),
    title,
    description,
    status,
    points,
    attachments,
    date,
  });

  if (session) {
    session.lastUpdateAt = now;
    session.nextUpdateDueAt = new Date(now.getTime() + settings.updateIntervalMin * 60 * 1000);
    await session.save();
  }

  await addPoints(req.user!.id, points, `Hourly update: ${title} (${status})`);
  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(now),
    title: "Update Submitted",
    description: title,
    type: "update",
    points,
    date,
  });

  res.json(update);
});

router.get("/stats", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const updates = await HourlyUpdate.find({
    userId: new Types.ObjectId(req.user!.id),
    date,
  });
  const settings = await getCompanySettings();
  const expected = 8;
  res.json({
    expected,
    submitted: updates.length,
    missed: updates.filter((u) => u.status === "missed").length,
    onTime: updates.filter((u) => u.status === "on_time").length,
    upcoming: Math.max(0, expected - updates.length),
    intervalMin: settings.updateIntervalMin,
  });
});

export default router;
