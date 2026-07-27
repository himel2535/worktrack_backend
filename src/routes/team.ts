import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { User } from "../models/User";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const users = await User.find({ isActive: true })
    .select("name email role designation phone avatar departmentId")
    .populate("departmentId", "name slug")
    .sort({ name: 1 });
  res.json(users);
});

export default router;
