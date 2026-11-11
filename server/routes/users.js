import express from "express";
import User from "../models/User.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import Notification from "../models/Notification.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { httpError, wrap, esc } from "../utils/http.js";

const router = express.Router();

// Everything in this file is admin only
router.use(requireAuth, allowRoles("admin"));

// GET /api/users?role=Employer&status=Active&search=
router.get("/", wrap(async (req, res) => {
  const { role, status, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(esc(search), "i") },
      { email: new RegExp(esc(search), "i") },
    ];
  }
  res.json(await User.find(filter).select("-password").sort({ createdAt: -1 }));
}));

// PATCH /api/users/:id   body: { status: "Active" | "Suspended" }
router.patch("/:id", wrap(async (req, res) => {
  const { status } = req.body;
  if (!["Active", "Suspended"].includes(status)) throw httpError(400, "Invalid status");
  if (req.params.id === String(req.user._id)) throw httpError(400, "You cannot change your own status");
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-password");
  if (!user) throw httpError(404, "User not found");
  res.json(user);
}));

// DELETE /api/users/:id
router.delete("/:id", wrap(async (req, res) => {
  if (req.params.id === String(req.user._id)) throw httpError(400, "You cannot delete yourself");
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw httpError(404, "User not found");
  await Application.deleteMany({ applicant: user._id });
  await SavedJob.deleteMany({ user: user._id });
  await Notification.deleteMany({ user: user._id });
  res.json({ message: "User deleted" });
}));

export default router;
