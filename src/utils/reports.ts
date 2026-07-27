import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { Response } from "express";
import { Types } from "mongoose";
import { Attendance } from "../models/Attendance";
import { PointHistory } from "../models/Attendance";
import { Task } from "../models/Task";
import { User } from "../models/User";

export async function generateAttendancePdf(
  res: Response,
  userId: string,
  month: string,
  userName: string
) {
  const records = await Attendance.find({
    userId: new Types.ObjectId(userId),
    date: { $regex: `^${month}` },
  }).sort({ date: 1 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=attendance-${month}.pdf`);

  const doc = new PDFDocument();
  doc.pipe(res);
  doc.fontSize(18).text("WorkTrack Attendance Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Employee: ${userName}`);
  doc.text(`Month: ${month}`);
  doc.moveDown();

  records.forEach((r) => {
    doc.text(`${r.date} | ${r.day} | In: ${r.inTime || "-"} | Out: ${r.outTime || "-"} | ${r.status}`);
  });

  doc.end();
}

export async function generateAttendanceExcel(
  res: Response,
  userId: string,
  month: string,
  userName: string
) {
  const records = await Attendance.find({
    userId: new Types.ObjectId(userId),
    date: { $regex: `^${month}` },
  }).sort({ date: 1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance");
  sheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Day", key: "day", width: 10 },
    { header: "In Time", key: "inTime", width: 12 },
    { header: "Out Time", key: "outTime", width: 12 },
    { header: "Work Time", key: "workTime", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Late Min", key: "lateMinutes", width: 10 },
  ];
  records.forEach((r) => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=attendance-${month}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function generatePerformanceExcel(res: Response, userId: string, userName: string) {
  const history = await PointHistory.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).limit(100);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Performance");
  sheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Time", key: "time", width: 12 },
    { header: "Description", key: "description", width: 40 },
    { header: "Points", key: "points", width: 10 },
  ];
  history.forEach((h) => sheet.addRow(h));
  sheet.getRow(1).font = { bold: true };

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=performance-${userName}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function generateTaskReportExcel(res: Response, departmentId?: string) {
  const filter: Record<string, unknown> = {};
  if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
  const tasks = await Task.find(filter).populate("assignedTo", "name");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tasks");
  sheet.columns = [
    { header: "Title", key: "title", width: 30 },
    { header: "Project", key: "projectName", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Progress", key: "progress", width: 10 },
    { header: "Deadline", key: "deadline", width: 15 },
  ];
  tasks.forEach((t) => sheet.addRow(t));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=task-report.xlsx");
  await workbook.xlsx.write(res);
  res.end();
}
