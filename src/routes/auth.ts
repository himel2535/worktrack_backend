import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const authUser = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId?.toString(),
    designation: user.designation,
    avatar: user.avatar,
  };

  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken, user: authUser });
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

    const authUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId?.toString(),
      designation: user.designation,
      avatar: user.avatar,
    };

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
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password incorrect" });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true });
});

export default router;
