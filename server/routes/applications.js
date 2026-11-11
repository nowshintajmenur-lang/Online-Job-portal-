import express from "express";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Notification from "../models/Notification.js";
import { requireAuth, allowRoles, roleKey } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();

const STATUSES = Application.schema.path("status").enumValues;

// POST /api/applications   (seeker)   body: { jobId, coverLetter }
router.post("/", requireAuth, allowRoles("seeker"), wrap(async (req, res) => {
  const { jobId, coverLetter } = req.body;
  const job = await Job.findById(jobId);
  if (!job) throw httpError(404, "Job not found");
  if (job.status !== "Open") throw httpError(400, "This job is closed");

  let application;
  try {
    application = await Application.create({ job: job._id, applicant: req.user._id, coverLetter });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, "You already applied to this job");
    throw err;
  }
  if (job.postedBy) {
    await Notification.create({
      user: job.postedBy,
      text: `${req.user.name} applied to ${job.title}`,
    });
  }
  res.status(201).json(application);
}));

// GET /api/applications/mine   (seeker)
router.get("/mine", requireAuth, allowRoles("seeker"), wrap(async (req, res) => {
  const apps = await Application.find({ applicant: req.user._id })
    .populate("job", "title companyName location type status")
    .sort({ createdAt: -1 });
  res.json(apps);
}));

const APPLICANT_FIELDS = "name email phone location education resumeUrl";

// GET /api/applications/employer   (applicants for the employer's own jobs)
router.get("/employer", requireAuth, allowRoles("employer"), wrap(async (req, res) => {
  const myJobs = await Job.find({ postedBy: req.user._id }).select("_id");
  const apps = await Application.find({ job: { $in: myJobs.map((j) => j._id) } })
    .populate("job", "title")
    .populate("applicant", APPLICANT_FIELDS)
    .sort({ createdAt: -1 });
  res.json(apps);
}));

// GET /api/applications   (admin: everything)
router.get("/", requireAuth, allowRoles("admin"), wrap(async (req, res) => {
  const apps = await Application.find()
    .populate("job", "title companyName")
    .populate("applicant", "name email")
    .sort({ createdAt: -1 });
  res.json(apps);
}));

// PATCH /api/applications/:id   body: { status }   (the job's employer, or admin)
router.patch("/:id", requireAuth, allowRoles("employer", "admin"), wrap(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) throw httpError(400, `Status must be one of: ${STATUSES.join(", ")}`);

  const application = await Application.findById(req.params.id).populate("job");
  if (!application) throw httpError(404, "Application not found");
  const isOwner = application.job?.postedBy && application.job.postedBy.equals(req.user._id);
  if (roleKey(req.user) !== "admin" && !isOwner) throw httpError(403, "This is not your job");

  application.status = status;
  await application.save();
  await Notification.create({
    user: application.applicant,
    text: `Your application for ${application.job?.title || "a job"} is now: ${status}`,
  });
  res.json(application);
}));

export default router;
