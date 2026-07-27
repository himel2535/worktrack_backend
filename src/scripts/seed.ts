import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { Department } from "../models/Department";
import { CompanySettings } from "../models/CompanySettings";
import { Project } from "../models/Project";
import { Task } from "../models/Task";
import { Holiday } from "../models/Leave";

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    CompanySettings.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Holiday.deleteMany({}),
  ]);

  const settings = await CompanySettings.create({});

  const devDept = await Department.create({ name: "Development", slug: "development" });
  const cateringDept = await Department.create({ name: "Catering", slug: "catering" });
  const marketingDept = await Department.create({ name: "Marketing", slug: "marketing" });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await User.create({
    email: "admin@worktrack.com",
    passwordHash,
    name: "Admin User",
    role: "admin",
    designation: "HR Admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
  });

  const devManager = await User.create({
    email: "manager.dev@worktrack.com",
    passwordHash,
    name: "Dev Manager",
    role: "manager",
    departmentId: devDept._id,
    designation: "Development Head",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DevManager",
  });

  const cateringManager = await User.create({
    email: "manager.catering@worktrack.com",
    passwordHash,
    name: "Catering Manager",
    role: "manager",
    departmentId: cateringDept._id,
    designation: "Catering Head",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CateringManager",
  });

  devDept.headUserId = devManager._id;
  cateringDept.headUserId = cateringManager._id;
  await devDept.save();
  await cateringDept.save();

  const employees = await User.insertMany([
    {
      email: "himel@worktrack.com",
      passwordHash,
      name: "Himel Hossain",
      role: "employee",
      departmentId: devDept._id,
      designation: "UI/UX Designer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Himel",
    },
    {
      email: "dev1@worktrack.com",
      passwordHash,
      name: "Rahim Dev",
      role: "employee",
      departmentId: devDept._id,
      designation: "Full Stack Developer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahim",
    },
    {
      email: "catering1@worktrack.com",
      passwordHash,
      name: "Karim Catering",
      role: "employee",
      departmentId: cateringDept._id,
      designation: "Chef",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Karim",
    },
    {
      email: "marketing1@worktrack.com",
      passwordHash,
      name: "Sadia Marketing",
      role: "employee",
      departmentId: marketingDept._id,
      designation: "Social Media Manager",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sadia",
    },
    {
      email: "dev2@worktrack.com",
      passwordHash,
      name: "Farhan Dev",
      role: "employee",
      departmentId: devDept._id,
      designation: "Backend Developer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Farhan",
    },
  ]);

  const project = await Project.create({
    name: "WorkTrack ERP",
    category: "Development",
    description: "Employee productivity tracking system",
    progress: 65,
    tasksCompleted: 3,
    tasksTotal: 5,
    deadline: "2026-08-30",
    status: "in_progress",
    lastWorked: "Today",
    icon: "code",
    createdBy: admin._id,
    departmentId: devDept._id,
  });

  await Task.insertMany([
    {
      title: "Dashboard UI Polish",
      description: "Improve dashboard widgets and animations",
      projectId: project._id,
      projectName: project.name,
      assignedTo: employees[0]._id,
      assignedBy: devManager._id,
      departmentId: devDept._id,
      priority: "high",
      status: "in_progress",
      deadline: "2026-07-30",
      progress: 75,
      taskType: "Feature",
      estimatedTime: "8h",
      departmentFields: { devType: "Feature", githubUrl: "https://github.com/worktrack", jiraUrl: "WT-101" },
    },
    {
      title: "API Integration",
      description: "Connect frontend to Express API",
      projectId: project._id,
      projectName: project.name,
      assignedTo: employees[1]._id,
      assignedBy: devManager._id,
      departmentId: devDept._id,
      priority: "high",
      status: "in_progress",
      deadline: "2026-07-28",
      progress: 50,
      taskType: "Feature",
      estimatedTime: "16h",
      departmentFields: { devType: "Feature" },
    },
  ]);

  await Holiday.insertMany([
    { name: "Independence Day", date: "2026-03-26", type: "government", createdBy: admin._id },
    { name: "Eid ul-Fitr", date: "2026-03-30", type: "government", createdBy: admin._id },
    { name: "Company Anniversary", date: "2026-06-15", type: "company", createdBy: admin._id },
  ]);

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials (password: password123):");
  console.log("  Admin:    admin@worktrack.com");
  console.log("  Manager:  manager.dev@worktrack.com");
  console.log("  Employee: himel@worktrack.com");
  console.log("");

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
