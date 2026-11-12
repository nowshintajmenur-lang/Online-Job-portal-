import express from "express";
import Message from "../models/Message.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import { requireAuth, roleKey } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();
router.use(requireAuth);

// People I am allowed to talk to = the other side of my applications.
// seeker -> employers of jobs I applied to ; employer -> applicants of my jobs.
async function contactsOf(user) {
  const map = new Map(); // userId -> { user, jobTitle }
  if (roleKey(user) === "seeker") {
    const apps = await Application.find({ applicant: user._id })
      .populate({ path: "job", select: "title postedBy" });
    for (const a of apps) {
      if (!a.job?.postedBy) continue;
      const id = String(a.job.postedBy);
      if (!map.has(id)) map.set(id, { id, jobTitle: a.job.title });
    }
  } else if (roleKey(user) === "employer") {
    const apps = await Application.find().populate({ path: "job", select: "title postedBy" });
    for (const a of apps) {
      if (!a.job || String(a.job.postedBy) !== String(user._id)) continue;
      const id = String(a.applicant);
      if (!map.has(id)) map.set(id, { id, jobTitle: a.job.title });
    }
  }
  return map;
}

// GET /api/messages  -> conversation list
router.get("/", wrap(async (req, res) => {
  const me = req.user._id;
  const contacts = await contactsOf(req.user);
  const msgs = await Message.find({ $or: [{ sender: me }, { receiver: me }] }).sort({ createdAt: -1 });

  const last = new Map();
  const unread = new Map();
  for (const m of msgs) {
    const other = String(m.sender) === String(me) ? String(m.receiver) : String(m.sender);
    if (!last.has(other)) last.set(other, m);
    if (String(m.receiver) === String(me) && !m.isRead) unread.set(other, (unread.get(other) || 0) + 1);
    if (!contacts.has(other)) contacts.set(other, { id: other, jobTitle: "" });
  }

  const users = await User.find({ _id: { $in: [...contacts.keys()] } }).select("name email");
  const items = users.map((u) => {
    const id = String(u._id);
    const l = last.get(id);
    return {
      userId: id,
      name: u.name || u.email,
      role: contacts.get(id).jobTitle,
      lastMessage: l ? (String(l.sender) === String(me) ? "You: " : "") + l.text : "",
      time: l ? l.createdAt : null,
      unread: unread.get(id) || 0,
    };
  });
  items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  res.json(items);
}));

// GET /api/messages/:userId  -> the thread, and marks their messages as read
router.get("/:userId", wrap(async (req, res) => {
  const me = req.user._id;
  const other = req.params.userId;
  const thread = await Message.find({
    $or: [{ sender: me, receiver: other }, { sender: other, receiver: me }],
  }).sort({ createdAt: 1 });
  await Message.updateMany({ sender: other, receiver: me, isRead: false }, { isRead: true });
  res.json(thread.map((m) => ({
    id: m._id,
    from: String(m.sender) === String(me) ? "me" : "them",
    text: m.text,
    time: m.createdAt,
  })));
}));

// POST /api/messages  { to, text }
router.post("/", wrap(async (req, res) => {
  const { to, text } = req.body;
  const clean = String(text || "").trim();
  if (!to || !clean) throw httpError(400, "to and text are required");
  if (clean.length > 2000) throw httpError(400, "Message is too long");
  if (String(to) === String(req.user._id)) throw httpError(400, "You cannot message yourself");

  const contacts = await contactsOf(req.user);
  const hadChat = await Message.exists({
    $or: [{ sender: req.user._id, receiver: to }, { sender: to, receiver: req.user._id }],
  });
  if (!contacts.has(String(to)) && !hadChat) {
    throw httpError(403, "You can only message people connected through an application");
  }
  const msg = await Message.create({ sender: req.user._id, receiver: to, text: clean });
  res.status(201).json({ id: msg._id, from: "me", text: msg.text, time: msg.createdAt });
}));

export default router;
