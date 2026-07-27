import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Task } from "../models/Task";
import { Project } from "../models/Project";
import { Department } from "../models/Department";

const router = Router();
router.use(authenticate);

const DEPT_FIELDS: Record<string, string[]> = {
  development: ["devType", "githubUrl", "jiraUrl"],
  catering: ["orderEventId", "eventDate", "prepType"],
  marketing: ["campaignName", "platform", "contentType"],
};

function validateDeptFields(slug: string | undefined, fields: Record<string, unknown>) {
  if (!slug || !DEPT_FIELDS[slug]) return null;
  const missing = DEPT_FIELDS[slug].filter((k) => !fields[k]);
  if (missing.length) return `Missing fields: ${missing.join(", ")}`;
  return null;
}

router.get("/", async (req: AuthRequest, res) => {
  const filter: Record<string, unknown> = {};
  if (req.user!.role === "employee") {
    filter.$or = [
      { assignedTo: new Types.ObjectId(req.user!.id) },
      { assignedTo: { $exists: false } },
    ];
  } else if (req.user!.role === "manager" && req.user!.departmentId) {
    filter.departmentId = new Types.ObjectId(req.user!.departmentId);
  }
  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  res.json(tasks);
});

router.post("/", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  const { title, description, projectId, assignedTo, priority, deadline, taskType, departmentFields, estimatedTime } = req.body;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  let deptId = req.user!.departmentId;
  if (assignedTo) {
    const { User } = await import("../models/User");
    const assignee = await User.findById(assignedTo);
    if (!assignee) return res.status(404).json({ error: "Assignee not found" });
    if (req.user!.role === "manager" && assignee.departmentId?.toString() !== req.user!.departmentId) {
      return res.status(403).json({ error: "Cannot assign outside your department" });
    }
    deptId = assignee.departmentId?.toString();
  }

  let deptSlug: string | undefined;
  if (deptId) {
    const dept = await Department.findById(deptId);
    deptSlug = dept?.slug;
  }
  const err = validateDeptFields(deptSlug, departmentFields || {});
  if (err) return res.status(400).json({ error: err });

  const task = await Task.create({
    title,
    description,
    projectId,
    projectName: project.name,
    assignedTo: assignedTo ? new Types.ObjectId(assignedTo) : undefined,
    assignedBy: new Types.ObjectId(req.user!.id),
    departmentId: deptId ? new Types.ObjectId(deptId) : undefined,
    priority,
    deadline,
    taskType,
    estimatedTime,
    departmentFields,
  });

  await Project.findByIdAndUpdate(projectId, { $inc: { tasksTotal: 1 } });
  res.status(201).json(task);
});

router.patch("/:id", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

router.delete("/:id", authorize("admin", "manager"), async (req: AuthRequest, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (task.projectId) await Project.findByIdAndUpdate(task.projectId, { $inc: { tasksTotal: -1 } });
  res.json({ success: true });
});

router.patch("/:id/status", async (req: AuthRequest, res) => {
  const { status, progress } = req.body;
  const task = await Task.findByIdAndUpdate(req.params.id, { status, progress }, { new: true });
  if (!task) return res.status(404).json({ error: "Not found" });
  if (status === "completed" && task.projectId) {
    await Project.findByIdAndUpdate(task.projectId, { $inc: { tasksCompleted: 1 } });
  }
  res.json(task);
});

export default router;
