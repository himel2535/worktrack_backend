import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Holiday } from "../models/Leave";
import { Attendance } from "../models/Attendance";
import { Types } from "mongoose";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const year = (req.query.year as string) || new Date().getFullYear().toString();
  const holidays = await Holiday.find({ date: { $regex: `^${year}` } }).sort({ date: 1 });
  res.json(holidays);
});

router.post("/", authorize("admin"), async (req: AuthRequest, res) => {
  const holiday = await Holiday.create({
    ...req.body,
    createdBy: new Types.ObjectId(req.user!.id),
  });
  res.status(201).json(holiday);
});

router.patch("/:id", authorize("admin"), async (req, res) => {
  const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!holiday) return res.status(404).json({ error: "Not found" });
  res.json(holiday);
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  await Holiday.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
