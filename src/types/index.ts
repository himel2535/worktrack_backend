import { Request } from "express";
import { Types } from "mongoose";

export type UserRole = "admin" | "manager" | "employee";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";
export type TaskPriority = "high" | "medium" | "low";
export type ProjectStatus = "in_progress" | "pending" | "completed";
export type UpdateStatus = "on_time" | "missed" | "upcoming" | "submitted";
export type BreakType = "personal" | "lunch" | "prayer" | "other";
export type AttendanceStatus = "present" | "late" | "absent" | "weekly_off" | "approved_leave" | "holiday";
export type LeaveType = "sick" | "casual" | "earned";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type NotificationType = "update_reminder" | "leave_decision" | "missed_update" | "general";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  designation?: string;
  avatar?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export type ObjectId = Types.ObjectId;
