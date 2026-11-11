import express from "express";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { wrap } from "../utils/http.js";

const router = express.Router();

const countByStatus = async (match) => {
  const rows = await Application.aggregate([
    { $match: match },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

// GET /api/stats/admin
router.get("/admin", requireAuth, allowRoles("admin"), wrap(async (req, res) => {
  const [users, companies, activeJobs, applications, pendingCompanies] = await Promise.all([
    User.countDocuments(),
    Company.countDocuments(),
    Job.countDocuments({ status: "Open" }),
    Application.countDocuments(),
    Company.find({ status: "Pending" }).limit(5),
  ]);
  res.json({ users, companies, activeJobs, applications, pendingCompanies });
}));

// GET /api/stats/employer
router.get("/employer", requireAuth, allowRoles("employer"), wrap(async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).select("_id status");
  const ids = jobs.map((j) => j._id);
  res.json({
    totalJobs: jobs.length,
    openJobs: jobs.filter((j) => j.status === "Open").length,
    applicants: await Application.countDocuments({ job: { $in: ids } }),
    byStatus: await countByStatus({ job: { $in: ids } }),
  });
}));

// GET /api/stats/seeker
router.get("/seeker", requireAuth, allowRoles("seeker"), wrap(async (req, res) => {
  res.json({
    applications: await Application.countDocuments({ applicant: req.user._id }),
    saved: await SavedJob.countDocuments({ user: req.user._id }),
    byStatus: await countByStatus({ applicant: req.user._id }),
  });
}));

export default router;
