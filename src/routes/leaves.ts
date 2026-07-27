import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Leave, LeaveBalance } from "../models/Leave";
import { approveLeave, rejectLeave, computeLeaveDays, ensureLeaveBalance } from "../services/leave";
import { authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/balance", async (req: AuthRequest, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const balance = await ensureLeaveBalance(req.user!.id, year);
  res.json(balance);
});

router.get("/", async (req: AuthRequest, res) => {
  const filter: Record<string, unknown> = {};
  if (req.user!.role === "employee") {
    filter.userId = new Types.ObjectId(req.user!.id);
  } else if (req.user!.role === "manager" && req.user!.departmentId) {
    const { User } = await import("../models/User");
    const teamIds = await User.find({ departmentId: req.user!.departmentId }).distinct("_id");
    filter.userId = { $in: teamIds };
  }
  const leaves = await Leave.find(filter)
    .populate("userId", "name email")
    .populate("reviewedBy", "name")
    .sort({ createdAt: -1 });
  res.json(leaves);
});

router.post("/", async (req: AuthRequest, res) => {
  const { type, startDate, endDate, reason } = req.body;
  if (!type || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: "All fields required" });
  }
  const days = computeLeaveDays(startDate, endDate);
  const leave = await Leave.create({
    userId: new Types.ObjectId(req.user!.id),
    type,
    startDate,
    endDate,
    reason,
    days,
  });
  res.status(201).json(leave);
});

router.patch("/:id/approve", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  try {
    const leave = await approveLeave(String(req.params.id), req.user!.id, req.body.note);
    res.json(leave);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.patch("/:id/reject", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  try {
    const leave = await rejectLeave(String(req.params.id), req.user!.id, req.body.note);
    res.json(leave);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;
