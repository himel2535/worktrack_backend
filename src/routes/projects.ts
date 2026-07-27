import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Project } from "../models/Project";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const filter: Record<string, unknown> = { archived: false };
  if (req.user!.role === "manager" && req.user!.departmentId) {
    filter.departmentId = new Types.ObjectId(req.user!.departmentId);
  }
  const projects = await Project.find(filter).sort({ updatedAt: -1 });
  res.json(projects);
});

router.post("/", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  const project = await Project.create({
    ...req.body,
    createdBy: new Types.ObjectId(req.user!.id),
    departmentId: req.user!.departmentId
      ? new Types.ObjectId(req.user!.departmentId)
      : req.body.departmentId,
  });
  res.status(201).json(project);
});

router.patch("/:id", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

router.delete("/:id", authorize("admin"), async (req: AuthRequest, res) => {
  await Project.findByIdAndUpdate(req.params.id, { archived: true });
  res.json({ success: true });
});

export default router;
