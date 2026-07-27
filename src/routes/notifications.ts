import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Notification } from "../models/Leave";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const notifications = await Notification.find({ userId: new Types.ObjectId(req.user!.id) })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notifications);
});

router.get("/unread-count", async (req: AuthRequest, res) => {
  const count = await Notification.countDocuments({
    userId: new Types.ObjectId(req.user!.id),
    read: false,
  });
  res.json({ count });
});

router.patch("/:id/read", async (req: AuthRequest, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: new Types.ObjectId(req.user!.id) },
    { read: true }
  );
  res.json({ success: true });
});

router.patch("/read-all", async (req: AuthRequest, res) => {
  await Notification.updateMany(
    { userId: new Types.ObjectId(req.user!.id), read: false },
    { read: true }
  );
  res.json({ success: true });
});

export default router;
