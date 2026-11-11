import express from "express";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import { requireAuth, allowRoles, roleKey } from "../middleware/auth.js";
import { httpError, wrap, esc } from "../utils/http.js";

const router = express.Router();

// Add an "applicants" number to each job
async function withCounts(jobs) {
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: "$job", n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  return jobs.map((j) => ({ ...j.toObject(), applicants: map[String(j._id)] || 0 }));
}

const EDITABLE = ["title", "location", "type", "salaryMin", "salaryMax", "description", "requirements", "status"];

// GET /api/jobs?search=&type=&location=   (public, open jobs only)
router.get("/", wrap(async (req, res) => {
  const { search, type, location } = req.query;
  const filter = { status: "Open" };
  if (type) filter.type = type;
  if (location) filter.location = new RegExp(esc(location), "i");
  if (search) {
    filter.$or = [
      { title: new RegExp(esc(search), "i") },
      { companyName: new RegExp(esc(search), "i") },
    ];
  }
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(await withCounts(jobs));
}));

// GET /api/jobs/mine   (employer: own jobs, open and closed)
router.get("/mine", requireAuth, allowRoles("employer"), wrap(async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
  res.json(await withCounts(jobs));
}));

// GET /api/jobs/admin/all   (admin: every job)
router.get("/admin/all", requireAuth, allowRoles("admin"), wrap(async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json(await withCounts(jobs));
}));

// GET /api/jobs/:id
router.get("/:id", wrap(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw httpError(404, "Job not found");
  res.json(job);
}));

// POST /api/jobs   (employer)
router.post("/", requireAuth, allowRoles("employer"), wrap(async (req, res) => {
  const { title, location, type, salaryMin, salaryMax, description, requirements } = req.body;
  if (!title || !location) throw httpError(400, "Title and location are required");

  const company = await Company.findOne({ owner: req.user._id });
  const job = await Job.create({
    title, location, type, salaryMin, salaryMax, description, requirements,
    companyName: company?.name || req.user.name,
    company: company?._id,
    postedBy: req.user._id,
    postedByEmail: req.user.email,
  });
  res.status(201).json(job);
}));

// Only the employer who posted the job (or an admin) may change it
async function ownJob(req) {
  const job = await Job.findById(req.params.id);
  if (!job) throw httpError(404, "Job not found");
  const isOwner = job.postedBy && job.postedBy.equals(req.user._id);
  if (roleKey(req.user) !== "admin" && !isOwner) throw httpError(403, "This is not your job");
  return job;
}

// PATCH /api/jobs/:id   (edit, or close with { status: "Closed" })
router.patch("/:id", requireAuth, allowRoles("employer", "admin"), wrap(async (req, res) => {
  const job = await ownJob(req);
  for (const k of EDITABLE) if (req.body[k] !== undefined) job[k] = req.body[k];
  await job.save();
  res.json(job);
}));

// DELETE /api/jobs/:id
router.delete("/:id", requireAuth, allowRoles("employer", "admin"), wrap(async (req, res) => {
  const job = await ownJob(req);
  await Application.deleteMany({ job: job._id });
  await SavedJob.deleteMany({ job: job._id });
  await job.deleteOne();
  res.json({ message: "Job deleted" });
}));

export default router;
