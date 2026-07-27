import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types";
import { verifyAccessToken } from "../utils/jwt";
import { User } from "../models/User";

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id).select("-passwordHash -refreshTokenHash");
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId?.toString(),
      designation: user.designation,
      avatar: user.avatar,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function authorizeManagerOfDepartment(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role === "admin") return next();
  if (req.user.role === "manager") return next();
  return res.status(403).json({ error: "Forbidden" });
}
