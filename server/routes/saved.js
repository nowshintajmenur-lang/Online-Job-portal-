import express from "express";
import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();
router.use(requireAuth, allowRoles("seeker"));

// GET /api/saved   -> the jobs I saved
router.get("/", wrap(async (req, res) => {
  const saved = await SavedJob.find({ user: req.user._id }).populate("job").sort({ createdAt: -1 });
  res.json(saved.filter((s) => s.job)); // skip jobs that were deleted
}));

// POST /api/saved/:jobId
router.post("/:jobId", wrap(async (req, res) => {
  if (!(await Job.exists({ _id: req.params.jobId }))) throw httpError(404, "Job not found");
  try {
    const saved = await SavedJob.create({ user: req.user._id, job: req.params.jobId });
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) return res.json({ message: "Already saved" });
    throw err;
  }
}));

// DELETE /api/saved/:jobId
router.delete("/:jobId", wrap(async (req, res) => {
  await SavedJob.deleteOne({ user: req.user._id, job: req.params.jobId });
  res.json({ message: "Removed" });
}));

export default router;
