import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { WorkSession } from "../models/WorkSession";
import { Break } from "../models/Break";
import { TimelineEvent } from "../models/Attendance";
import { logActivity, addPoints, getCompanySettings } from "../services/scoring";
import { formatDuration, formatTime12, getClientIp, todayDateStr } from "../utils/helpers";

const router = Router();
router.use(authenticate);

router.get("/current", async (req: AuthRequest, res) => {
  const date = todayDateStr();
  let session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date,
    isActive: true,
  });
  if (!session) {
    session = await WorkSession.findOne({
      userId: new Types.ObjectId(req.user!.id),
      date,
    }).sort({ updatedAt: -1 });
  }
  const activeBreak = await Break.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date,
    ongoing: true,
  });
  res.json({ session, activeBreak });
});

router.post("/start", async (req: AuthRequest, res) => {
  const { projectId, projectName, taskId, taskName, workPlan, startPhotoUrl } = req.body;
  const date = todayDateStr();
  const now = new Date();
  const settings = await getCompanySettings();

  await WorkSession.updateMany(
    { userId: new Types.ObjectId(req.user!.id), isActive: true },
    { isActive: false, endedAt: now }
  );

  const nextDue = new Date(now.getTime() + settings.updateIntervalMin * 60 * 1000);
  const session = await WorkSession.create({
    userId: new Types.ObjectId(req.user!.id),
    isActive: true,
    projectId: projectId ? new Types.ObjectId(projectId) : undefined,
    projectName,
    taskId: taskId ? new Types.ObjectId(taskId) : undefined,
    taskName,
    workPlan,
    startedAt: now,
    nextUpdateDueAt: nextDue,
    lastUpdateAt: now,
    startPhotoUrl,
    date,
  });

  await logActivity(req.user!.id, "work_start", {
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] as string,
    metadata: { projectName, taskName, workPlan },
  });
  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(now),
    title: "Work Started",
    description: workPlan || taskName || projectName,
    type: "work_start",
    date,
  });

  res.json(session);
});

router.post("/pause", async (req: AuthRequest, res) => {
  const session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    isActive: true,
  });
  if (!session) return res.status(404).json({ error: "No active session" });
  session.isActive = false;
  session.pausedAt = new Date();
  if (session.startedAt) {
    session.totalWorkSeconds += Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
  }
  await session.save();
  res.json(session);
});

router.post("/stop", async (req: AuthRequest, res) => {
  const { endPhotoUrl } = req.body;
  const session = await WorkSession.findOne({
    userId: new Types.ObjectId(req.user!.id),
    isActive: true,
  });
  if (!session) return res.status(404).json({ error: "No active session" });
  session.isActive = false;
  session.endedAt = new Date();
  session.endPhotoUrl = endPhotoUrl;
  if (session.startedAt) {
    session.totalWorkSeconds += Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
  }
  await session.save();
  await logActivity(req.user!.id, "work_stop", {
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] as string,
  });
  await TimelineEvent.create({
    userId: new Types.ObjectId(req.user!.id),
    time: formatTime12(),
    title: "Work Stopped",
    type: "work_start",
    date: todayDateStr(),
  });
  res.json(session);
});

router.get("/history", async (req: AuthRequest, res) => {
  const sessions = await WorkSession.find({ userId: new Types.ObjectId(req.user!.id) })
    .sort({ createdAt: -1 })
    .limit(30);
  res.json(sessions);
});

export default router;
