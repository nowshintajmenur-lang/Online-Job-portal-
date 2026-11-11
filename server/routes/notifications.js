import express from "express";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications   -> latest 50 + unread count
router.get("/", wrap(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ unread, items });
}));

// PATCH /api/notifications/read-all
router.patch("/read-all", wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: "All marked as read" });
}));

// PATCH /api/notifications/:id/read
router.patch("/:id/read", wrap(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!n) throw httpError(404, "Notification not found");
  res.json(n);
}));

export default router;
