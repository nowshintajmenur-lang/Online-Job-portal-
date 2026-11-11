import express from "express";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import Notification from "../models/Notification.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();

const FIELDS = ["name", "tagline", "industry", "size", "founded", "website", "location", "description"];

// GET /api/companies/mine   (employer's own company, or null if not created yet)
router.get("/mine", requireAuth, allowRoles("employer"), wrap(async (req, res) => {
  res.json(await Company.findOne({ owner: req.user._id }));
}));

// PUT /api/companies/mine   (employer creates or updates their company)
router.put("/mine", requireAuth, allowRoles("employer"), wrap(async (req, res) => {
  let company = await Company.findOne({ owner: req.user._id });
  if (!company) company = new Company({ owner: req.user._id, name: req.user.name });
  for (const k of FIELDS) if (req.body[k] !== undefined) company[k] = req.body[k];
  if (!company.name) throw httpError(400, "Company name is required");
  await company.save();
  res.json(company);
}));

// GET /api/companies   (admin: all companies with how many jobs each has)
router.get("/", requireAuth, allowRoles("admin"), wrap(async (req, res) => {
  const companies = await Company.find().populate("owner", "name email").sort({ createdAt: -1 });
  const out = await Promise.all(
    companies.map(async (c) => ({
      ...c.toObject(),
      jobs: await Job.countDocuments({ $or: [{ company: c._id }, { postedBy: c.owner?._id }] }),
    }))
  );
  res.json(out);
}));

// PATCH /api/companies/:id   body: { status: "Approved" | "Rejected" | "Pending" }   (admin)
router.patch("/:id", requireAuth, allowRoles("admin"), wrap(async (req, res) => {
  const { status } = req.body;
  if (!["Pending", "Approved", "Rejected"].includes(status)) throw httpError(400, "Invalid status");
  const company = await Company.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!company) throw httpError(404, "Company not found");
  await Notification.create({ user: company.owner, text: `Your company "${company.name}" was ${status.toLowerCase()}` });
  res.json(company);
}));

export default router;
