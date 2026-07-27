import { Router } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/auth";
import { AuthRequest } from "../types";
import { User } from "../models/User";
import { Department } from "../models/Department";
import { WorkSession } from "../models/WorkSession";
import { HourlyUpdate } from "../models/WorkSession";
import { Attendance } from "../models/Attendance";
import { Break } from "../models/Break";

const router = Router();
router.use(authenticate, authorize("admin"));

router.get("/dashboard", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const totalEmployees = await User.countDocuments({ role: "employee", isActive: true });
  const activeSessions = await WorkSession.find({ date: today, isActive: true }).populate("userId", "name departmentId");
  const onBreak = await Break.find({ date: today, ongoing: true }).populate("userId", "name");
  const checkedIn = await Attendance.find({ date: today, inTime: { $exists: true } });
  const attendancePercent = totalEmployees
    ? Math.round((checkedIn.length / totalEmployees) * 100)
    : 0;
  const lateCount = checkedIn.filter((a) => a.status === "late").length;
  const punctuality = checkedIn.length
    ? Math.round(((checkedIn.length - lateCount) / checkedIn.length) * 100)
    : 100;

  res.json({
    totalEmployees,
    working: activeSessions.length,
    onBreak: onBreak.length,
    absent: totalEmployees - checkedIn.length,
    notStarted: totalEmployees - checkedIn.length - activeSessions.length,
    attendancePercent,
    punctuality,
  });
});

router.get("/live-status", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const deptFilter = req.query.departmentId
    ? { departmentId: new Types.ObjectId(req.query.departmentId as string) }
    : {};

  const users = await User.find({ role: { $in: ["employee", "manager"] }, isActive: true, ...deptFilter })
    .select("name email role departmentId designation avatar")
    .populate("departmentId", "name slug");

  const statuses = await Promise.all(
    users.map(async (user) => {
      const uid = user._id;
      const session = await WorkSession.findOne({ userId: uid, date: today, isActive: true });
      const brk = await Break.findOne({ userId: uid, ongoing: true });
      const att = await Attendance.findOne({ userId: uid, date: today });
      const updates = await HourlyUpdate.countDocuments({ userId: uid, date: today });

      let status = "not_started";
      if (brk) status = "on_break";
      else if (session?.isActive) status = "working";
      else if (att?.inTime) status = "checked_in";

      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.departmentId,
          designation: user.designation,
          avatar: user.avatar,
        },
        status,
        updatesSubmitted: updates,
        checkInTime: att?.inTime,
      };
    })
  );

  res.json(statuses);
});

router.get("/alerts/missed-updates", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const users = await User.find({ role: "employee", isActive: true });
  const alerts = [];

  for (const user of users) {
    const missed = await HourlyUpdate.countDocuments({
      userId: user._id,
      date: today,
      status: "missed",
    });
    const total = await HourlyUpdate.countDocuments({ userId: user._id, date: today });
    if (missed >= 2 || (total === 0 && new Date().getHours() >= 12)) {
      alerts.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        missedCount: missed,
        submittedCount: total,
      });
    }
  }

  res.json(alerts);
});

router.get("/users", async (_req, res) => {
  const users = await User.find().select("-passwordHash -refreshTokenHash -totpSecret").populate("departmentId", "name slug");
  res.json(users);
});

router.post("/users", async (req, res) => {
  const { email, password, name, role, departmentId, designation, phone } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ error: "Email already exists" });

  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password || "password123", 10),
    name,
    role: role || "employee",
    departmentId: departmentId ? new Types.ObjectId(departmentId) : undefined,
    designation,
    phone,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  });
  res.status(201).json(user);
});

router.patch("/users/:id", async (req, res) => {
  const updates = { ...req.body };
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-passwordHash -refreshTokenHash");
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

router.delete("/users/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
});

router.get("/settings", async (_req, res) => {
  const { getCompanySettings } = await import("../services/scoring");
  const settings = await getCompanySettings();
  res.json(settings);
});

router.patch("/settings", async (req, res) => {
  const { CompanySettings } = await import("../models/CompanySettings");
  const settings = await CompanySettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
  res.json(settings);
});

router.get("/departments", async (_req, res) => {
  const depts = await Department.find().populate("headUserId", "name email");
  res.json(depts);
});

export default router;
