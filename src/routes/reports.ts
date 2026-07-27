import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import {
  generateAttendancePdf,
  generateAttendanceExcel,
  generatePerformanceExcel,
  generateTaskReportExcel,
} from "../utils/reports";

const router = Router();
router.use(authenticate);

router.get("/attendance", async (req: AuthRequest, res) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const format = (req.query.format as string) || "xlsx";
  let userId = req.user!.id;
  let userName = req.user!.name;

  if (req.query.userId && (req.user!.role === "admin" || req.user!.role === "manager")) {
    userId = req.query.userId as string;
    const { User } = await import("../models/User");
    const u = await User.findById(userId);
    userName = u?.name || userName;
  }

  if (format === "pdf") {
    await generateAttendancePdf(res, userId, month, userName);
  } else {
    await generateAttendanceExcel(res, userId, month, userName);
  }
});

router.get("/performance", async (req: AuthRequest, res) => {
  let userId = req.user!.id;
  let userName = req.user!.name;
  if (req.query.userId && req.user!.role !== "employee") {
    userId = req.query.userId as string;
    const { User } = await import("../models/User");
    const u = await User.findById(userId);
    userName = u?.name || userName;
  }
  await generatePerformanceExcel(res, userId, userName);
});

router.get("/tasks", async (req: AuthRequest, res) => {
  const deptId = req.user!.role === "manager" ? req.user!.departmentId : (req.query.departmentId as string);
  await generateTaskReportExcel(res, deptId);
});

export default router;
