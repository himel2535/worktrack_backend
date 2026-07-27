import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { calculatePerformance, getPointsSummary } from "../services/scoring";
import { PointHistory } from "../models/Attendance";
import { TimelineEvent } from "../models/Attendance";
import { UserNote } from "../models/Attendance";
import { todayDateStr } from "../utils/helpers";

const router = Router();
router.use(authenticate);

router.get("/me", async (req: AuthRequest, res) => {
  const perf = await calculatePerformance(req.user!.id);
  res.json(perf);
});

router.get("/points/summary", async (req: AuthRequest, res) => {
  const points = await getPointsSummary(req.user!.id);
  res.json(points);
});

router.get("/points/history", async (req: AuthRequest, res) => {
  const history = await PointHistory.find({ userId: new Types.ObjectId(req.user!.id) })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(history);
});

router.get("/timeline", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const events = await TimelineEvent.find({
    userId: new Types.ObjectId(req.user!.id),
    date,
  }).sort({ createdAt: 1 });
  res.json(events);
});

router.get("/note", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const note = await UserNote.findOne({
    userId: new Types.ObjectId(req.user!.id),
    date,
  });
  res.json(note || { note: "" });
});

router.put("/note", async (req: AuthRequest, res) => {
  const date = (req.query.date as string) || todayDateStr();
  const note = await UserNote.findOneAndUpdate(
    { userId: new Types.ObjectId(req.user!.id), date },
    { note: req.body.note || "" },
    { upsert: true, new: true }
  );
  res.json(note);
});

export default router;
