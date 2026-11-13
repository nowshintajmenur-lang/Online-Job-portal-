import express from "express";
import crypto from "crypto";
import Interview from "../models/Interview.js";
import Application from "../models/Application.js";
import Notification from "../models/Notification.js";
import { requireAuth, allowRoles, roleKey } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();
router.use(requireAuth);

// A free Jitsi room. The random part makes the link impossible to guess.
const newRoomUrl = () => "https://meet.jit.si/JobHub-" + crypto.randomBytes(8).toString("hex");

const fmt = (d) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const populate = (q) =>
  q.populate("job", "title companyName")
    .populate("seeker", "name email")
    .populate("employer", "name email");

// POST /api/interviews  { applicationId, scheduledAt, durationMin?, note? }   (employer)
router.post("/", allowRoles("employer"), wrap(async (req, res) => {
  const { applicationId, scheduledAt, durationMin, note } = req.body;
  if (!applicationId || !scheduledAt) throw httpError(400, "applicationId and scheduledAt are required");
  const when = new Date(scheduledAt);
  if (isNaN(when)) throw httpError(400, "Invalid date");
  if (when < new Date()) throw httpError(400, "Interview time must be in the future");

  const app = await Application.findById(applicationId).populate("job");
  if (!app || !app.job) throw httpError(404, "Application not found");
  if (!app.job.postedBy || !app.job.postedBy.equals(req.user._id)) {
    throw httpError(403, "This is not your job");
  }

  const interview = await Interview.create({
    application: app._id,
    job: app.job._id,
    employer: req.user._id,
    seeker: app.applicant,
    scheduledAt: when,
    durationMin: Number(durationMin) || 30,
    meetingUrl: newRoomUrl(),
    note: String(note || "").slice(0, 500),
  });

  app.status = "Interview";
  await app.save();
  await Notification.create({
    user: app.applicant,
    text: `Interview scheduled for "${app.job.title}" on ${fmt(when)}. Open Interviews to join.`,
  });
  res.status(201).json(await populate(Interview.findById(interview._id)));
}));

// GET /api/interviews/mine  -> my interviews (seeker or employer), soonest first
router.get("/mine", allowRoles("seeker", "employer"), wrap(async (req, res) => {
  const filter = roleKey(req.user) === "employer" ? { employer: req.user._id } : { seeker: req.user._id };
  res.json(await populate(Interview.find(filter).sort({ scheduledAt: 1 })));
}));

// PATCH /api/interviews/:id  { scheduledAt?, durationMin?, note?, status? }   (the employer who owns it)
router.patch("/:id", allowRoles("employer"), wrap(async (req, res) => {
  const interview = await Interview.findById(req.params.id).populate("job", "title");
  if (!interview) throw httpError(404, "Interview not found");
  if (!interview.employer.equals(req.user._id)) throw httpError(403, "This is not your interview");

  const { scheduledAt, durationMin, note, status } = req.body;
  let message = null;
  if (scheduledAt) {
    const when = new Date(scheduledAt);
    if (isNaN(when) || when < new Date()) throw httpError(400, "Pick a valid future time");
    interview.scheduledAt = when;
    message = `Your interview for "${interview.job.title}" was moved to ${fmt(when)}.`;
  }
  if (durationMin) interview.durationMin = Number(durationMin) || interview.durationMin;
  if (note !== undefined) interview.note = String(note).slice(0, 500);
  if (status) {
    if (!["Scheduled", "Completed", "Cancelled"].includes(status)) throw httpError(400, "Invalid status");
    interview.status = status;
    if (status === "Cancelled") message = `Your interview for "${interview.job.title}" was cancelled.`;
  }
  await interview.save();
  if (message) await Notification.create({ user: interview.seeker, text: message });
  res.json(await populate(Interview.findById(interview._id)));
}));

export default router;
