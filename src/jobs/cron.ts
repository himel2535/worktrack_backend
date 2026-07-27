import cron from "node-cron";
import { Types } from "mongoose";
import { WorkSession } from "../models/WorkSession";
import { Notification } from "../models/Leave";
import { HourlyUpdate } from "../models/WorkSession";
import { User } from "../models/User";
import { todayDateStr } from "../utils/helpers";

export function startCronJobs() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const reminderWindow = new Date(now.getTime() + 10 * 60 * 1000);
      const sessions = await WorkSession.find({
        isActive: true,
        nextUpdateDueAt: { $lte: reminderWindow, $gt: now },
      });

      for (const session of sessions) {
        const existing = await Notification.findOne({
          userId: session.userId,
          type: "update_reminder",
          createdAt: { $gte: new Date(now.getTime() - 15 * 60 * 1000) },
        });
        if (!existing) {
          await Notification.create({
            userId: session.userId,
            type: "update_reminder",
            title: "Hourly Update Due Soon",
            body: "Your next hourly update is due in about 10 minutes.",
            link: "/hourly-updates",
          });
        }
      }
    } catch (e) {
      console.error("Reminder cron error:", e);
    }
  });

  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const date = todayDateStr();
      const sessions = await WorkSession.find({
        isActive: true,
        nextUpdateDueAt: { $lt: now },
      });

      for (const session of sessions) {
        const missed = await HourlyUpdate.findOne({
          userId: session.userId,
          date,
          createdAt: { $gte: session.nextUpdateDueAt },
        });
        if (!missed) {
          await Notification.create({
            userId: session.userId,
            type: "missed_update",
            title: "Missed Hourly Update",
            body: "You missed an hourly update. Please submit as soon as possible.",
            link: "/hourly-updates",
          });

          const user = await User.findById(session.userId);
          if (user?.departmentId) {
            const managers = await User.find({
              role: "manager",
              departmentId: user.departmentId,
            });
            for (const mgr of managers) {
              await Notification.create({
                userId: mgr._id,
                type: "missed_update",
                title: "Team Member Missed Update",
                body: `${user.name} missed an hourly update.`,
                link: "/manager/alerts",
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Missed update cron error:", e);
    }
  });

  console.log("Cron jobs started");
}
