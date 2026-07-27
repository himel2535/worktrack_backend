import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { User, IUser } from "../models/User";
import { Department } from "../models/Department";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { authenticate } from "../middleware/auth";
import { AuthRequest, AuthUser } from "../types";
import { env } from "../config/env";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  designation: z.string().max(100).optional(),
  departmentId: z.string().optional(),
});

const googleSchema = z.object({
  idToken: z.string().min(10),
});

function toAuthUser(user: IUser): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId?.toString(),
    designation: user.designation,
    avatar: user.avatar,
  };
}

async function issueTokens(user: IUser, res: Response) {
  const authUser = toAuthUser(user);
  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, user: authUser };
}

router.get("/departments", async (_req, res) => {
  const depts = await Department.find().select("_id name").sort({ name: 1 });
  res.json(depts);
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  let departmentObjectId: Types.ObjectId | undefined;
  if (parsed.data.departmentId) {
    if (!Types.ObjectId.isValid(parsed.data.departmentId)) {
      return res.status(400).json({ error: "Invalid department" });
    }
    const dept = await Department.findById(parsed.data.departmentId);
    if (!dept) return res.status(400).json({ error: "Department not found" });
    departmentObjectId = dept._id;
  }

  const user = await User.create({
    email,
    passwordHash,
    name: parsed.data.name.trim(),
    designation: parsed.data.designation?.trim() || "Employee",
    role: "employee",
    departmentId: departmentObjectId,
    authProvider: "local",
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(parsed.data.name)}`,
  });

  const tokens = await issueTokens(user, res);
  res.status(201).json(tokens);
});

router.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!env.googleClientId) {
    return res.status(503).json({ error: "Google sign-in is not configured" });
  }

  try {
    const client = new OAuth2Client(env.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = payload.sub;
        if (payload.picture && !user.avatar) user.avatar = payload.picture;
        if (user.authProvider === "local" && !user.passwordHash) {
          user.authProvider = "google";
        }
        await user.save();
      }
      if (!user.isActive) return res.status(401).json({ error: "Account is inactive" });
    } else {
      user = await User.create({
        email,
        googleId: payload.sub,
        name: payload.name || email.split("@")[0],
        role: "employee",
        authProvider: "google",
        designation: "Employee",
        avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      });
    }

    const tokens = await issueTokens(user, res);
    res.json(tokens);
  } catch {
    return res.status(401).json({ error: "Google sign-in failed" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid credentials" });

  if (!user.passwordHash) {
    return res.status(401).json({ error: "Use Google sign-in for this account" });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const tokens = await issueTokens(user, res);
  res.json(tokens);
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ error: "Unauthorized" });

    const hash = crypto.createHash("sha256").update(token).digest("hex");
    if (user.refreshTokenHash !== hash) return res.status(401).json({ error: "Invalid refresh token" });

    const authUser = toAuthUser(user);
    const accessToken = signAccessToken(authUser);
    res.json({ accessToken, user: authUser });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", authenticate, async (req: AuthRequest, res) => {
  await User.findByIdAndUpdate(req.user!.id, { refreshTokenHash: null });
  res.clearCookie("refreshToken");
  res.json({ success: true });
});

router.get("/me", authenticate, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

router.patch("/password", authenticate, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Invalid password data" });
  }
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.passwordHash) {
    return res.status(400).json({ error: "Google accounts cannot change password here" });
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password incorrect" });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true });
});

export default router;
