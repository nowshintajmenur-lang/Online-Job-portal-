import { createRemoteJWKSet, jwtVerify } from "jose";
import User from "../models/User.js";
import { httpError, wrap } from "../utils/http.js";

// Google's public keys. Firebase signs every login token with them,
// so we can check a token without any secret key.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const DB_TO_KEY = { "Job Seeker": "seeker", Employer: "employer", Admin: "admin" };
export const roleKey = (user) => DB_TO_KEY[user.role] || "seeker";

// The user object we send to the frontend (never includes anything secret)
export const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: roleKey(u),
  status: u.status,
  phone: u.phone,
  location: u.location,
  education: u.education,
  resumeUrl: u.resumeUrl,
});

async function readToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw httpError(401, "Not logged in");
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw httpError(500, "FIREBASE_PROJECT_ID is missing in server/.env");
  try {
    const { payload } = await jwtVerify(header.slice(7), JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return payload;
  } catch {
    throw httpError(401, "Invalid or expired login. Please log in again.");
  }
}

// Only checks the Firebase login. Used by /auth/sync (the user may not be in our database yet).
export const verifyOnly = wrap(async (req, res, next) => {
  req.firebase = await readToken(req);
  next();
});

// Checks the login AND loads the user from our database into req.user.
export const requireAuth = wrap(async (req, res, next) => {
  const payload = await readToken(req);
  const email = (payload.email || "").toLowerCase();
  const user = email && (await User.findOne({ email }));
  if (!user) throw httpError(403, "Profile not set up yet. Please log in again.");
  if (user.status === "Suspended") throw httpError(403, "Your account is suspended");
  req.firebase = payload;
  req.user = user;
  next();
});

// Use after requireAuth: allowRoles("employer", "admin")
export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(roleKey(req.user))) {
    return next(httpError(403, "You are not allowed to do this"));
  }
  next();
};
