import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser, UserRole } from "../types";

export function signAccessToken(user: AuthUser) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, departmentId: user.departmentId },
    env.jwtSecret,
    { expiresIn: env.jwtAccessExpires as jwt.SignOptions["expiresIn"] }
  );
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ id: userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): Pick<AuthUser, "id" | "email" | "role" | "departmentId"> {
  const payload = jwt.verify(token, env.jwtSecret) as {
    id: string;
    email: string;
    role: UserRole;
    departmentId?: string;
  };
  return { id: payload.id, email: payload.email, role: payload.role, departmentId: payload.departmentId };
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, env.jwtRefreshSecret) as { id: string };
}
