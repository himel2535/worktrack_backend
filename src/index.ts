import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { startCronJobs } from "./jobs/cron";

import authRoutes from "./routes/auth";
import attendanceRoutes from "./routes/attendance";
import workSessionRoutes from "./routes/workSessions";
import breakRoutes from "./routes/breaks";
import hourlyUpdateRoutes from "./routes/hourlyUpdates";
import taskRoutes from "./routes/tasks";
import projectRoutes from "./routes/projects";
import performanceRoutes from "./routes/performance";
import adminRoutes from "./routes/admin";
import managerRoutes from "./routes/manager";
import leaveRoutes from "./routes/leaves";
import teamRoutes from "./routes/team";
import holidayRoutes from "./routes/holidays";
import notificationRoutes from "./routes/notifications";
import reportRoutes from "./routes/reports";
import leaderboardRoutes from "./routes/leaderboard";
import uploadRoutes from "./routes/upload";

const app = express();

const allowedOrigins = env.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/work-sessions", workSessionRoutes);
app.use("/api/breaks", breakRoutes);
app.use("/api/hourly-updates", hourlyUpdateRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/upload", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  startCronJobs();
  app.listen(env.port, () => {
    console.log(`WorkTrack API running on http://localhost:${env.port}`);
  });
}

start().catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});
