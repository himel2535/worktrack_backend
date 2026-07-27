import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/auth";
import { AuthRequest } from "../types";
import { User } from "../models/User";
import { WorkSession } from "../models/WorkSession";
import { HourlyUpdate } from "../models/WorkSession";
import { Attendance } from "../models/Attendance";
import { Break } from "../models/Break";
import { formatDuration, todayDateStr } from "../utils/helpers";

const router = Router();
router.use(authenticate, authorize("admin", "manager"));

router.get("/dashboard", async (req: AuthRequest, res) => {
  const today = todayDateStr();
  const deptFilter = req.user!.role === "manager" && req.user!.departmentId
    ? { departmentId: new Types.ObjectId(req.user!.departmentId) }
    : {};

  const team = await User.find({ role: "employee", isActive: true, ...deptFilter })
    .select("name email designation avatar departmentId")
    .populate("departmentId", "name");

  const members = await Promise.all(
    team.map(async (user) => {
      const session = await WorkSession.findOne({ userId: user._id, date: today });
      const updates = await HourlyUpdate.find({ userId: user._id, date: today });
      const att = await Attendance.findOne({ userId: user._id, date: today });
      const brk = await Break.findOne({ userId: user._id, ongoing: true });

      let status = "not_started";
      if (brk) status = "on_break";
      else if (session?.isActive) status = "working";
      else if (att?.inTime) status = "checked_in";

      return {
        user: { id: user._id, name: user.name, email: user.email, designation: user.designation, avatar: user.avatar },
        status,
        workTime: session ? formatDuration(session.totalWorkSeconds) : "0:00",
        updatesSubmitted: updates.length,
        updatesExpected: 8,
        missedUpdates: updates.filter((u) => u.status === "missed").length,
      };
    })
  );

  res.json({ teamSize: team.length, members });
});

router.get("/alerts/missed-updates", async (req: AuthRequest, res) => {
  const today = todayDateStr();
  const deptFilter = req.user!.role === "manager" && req.user!.departmentId
    ? { departmentId: new Types.ObjectId(req.user!.departmentId) }
    : {};

  const users = await User.find({ role: "employee", isActive: true, ...deptFilter });
  const alerts = [];

  for (const user of users) {
    const missed = await HourlyUpdate.countDocuments({ userId: user._id, date: today, status: "missed" });
    if (missed > 0) {
      alerts.push({ userId: user._id, name: user.name, missedCount: missed });
    }
  }

  res.json(alerts);
});

export default router;
