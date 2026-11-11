import express from "express";
import User from "../models/User.js";
import { verifyOnly, requireAuth, publicUser } from "../middleware/auth.js";
import { httpError, wrap } from "../utils/http.js";

const router = express.Router();

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

// POST /api/auth/sync   body: { name, role: "seeker" | "employer" }
// Call this right after Firebase register/login. It creates our database
// profile the first time, and returns the REAL role from the database.
router.post("/sync", verifyOnly, wrap(async (req, res) => {
  const email = (req.firebase.email || "").toLowerCase();
  if (!email) throw httpError(400, "Login has no email");

  const isAdmin = adminEmails().includes(email);
  let user = await User.findOne({ email });

  if (!user) {
    // New users can only choose seeker or employer. Admin comes from ADMIN_EMAILS.
    const wanted = req.body.role === "employer" ? "Employer" : "Job Seeker";
    user = await User.create({
      name: (req.body.name || req.firebase.name || email.split("@")[0]).trim(),
      email,
      firebaseUid: req.firebase.sub,
      role: isAdmin ? "Admin" : wanted,
    });
  } else {
    let changed = false;
    if (!user.firebaseUid) { user.firebaseUid = req.firebase.sub; changed = true; }
    if (isAdmin && user.role !== "Admin") { user.role = "Admin"; changed = true; }
    if (changed) await user.save();
  }

  if (user.status === "Suspended") throw httpError(403, "Your account is suspended");
  res.json({ user: publicUser(user) });
}));

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// PATCH /api/auth/me   body: { name, phone, location, education, resumeUrl }
router.patch("/me", requireAuth, wrap(async (req, res) => {
  for (const k of ["name", "phone", "location", "education", "resumeUrl"]) {
    if (req.body[k] !== undefined) req.user[k] = req.body[k];
  }
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));

export default router;
