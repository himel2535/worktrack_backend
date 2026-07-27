import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { PointHistory } from "../models/Attendance";
import { User } from "../models/User";
import { Department } from "../models/Department";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const departments = await Department.find();
  const result = [];

  for (const dept of departments) {
    const members = await User.find({ departmentId: dept._id, isActive: true, role: "employee" });
    const rankings = await Promise.all(
      members.map(async (user) => {
        const points = await PointHistory.find({
          userId: user._id,
          date: { $gte: weekStartStr },
        });
        const total = points.reduce((s, p) => s + p.points, 0);
        return { userId: user._id, name: user.name, avatar: user.avatar, points: total };
      })
    );
    rankings.sort((a, b) => b.points - a.points);
    result.push({ department: dept.name, slug: dept.slug, rankings });
  }

  res.json(result);
});

export default router;
