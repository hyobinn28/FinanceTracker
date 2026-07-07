import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import db, { seedNewUser } from "./db.js";
import { signToken, requireAuth } from "./auth.js";

const router = express.Router();

// Throttle auth attempts so nobody can brute-force passwords on a public URL.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function publicUser(u) {
  return { id: u.id, username: u.username, firstName: u.first_name, lastName: u.last_name };
}

// ── POST /api/auth/register ──────────────────────────────────────────────
router.post("/register", authLimiter, (req, res) => {
  let { username, firstName, lastName, password } = req.body || {};
  username = (username || "").trim();
  firstName = (firstName || "").trim();
  lastName = (lastName || "").trim();

  if (!USERNAME_RE.test(username))
    return res.status(400).json({ error: "Username must be 3–20 letters, numbers, or underscores." });
  if (!firstName || !lastName)
    return res.status(400).json({ error: "First and last name are required." });
  if (!password || password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });

  const exists = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(username);
  if (exists) return res.status(409).json({ error: "That username is already taken." });

  const password_hash = bcrypt.hashSync(password, 12);
  const info = db.prepare(
    "INSERT INTO users (username, first_name, last_name, password_hash) VALUES (?,?,?,?)"
  ).run(username, firstName, lastName, password_hash);

  seedNewUser(info.lastInsertRowid);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post("/login", authLimiter, (req, res) => {
  let { username, password } = req.body || {};
  username = (username || "").trim();

  const user = db.prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE").get(username);
  // Same generic message whether the username or password is wrong (don't leak which).
  if (!user || !bcrypt.compareSync(password || "", user.password_hash))
    return res.status(401).json({ error: "Incorrect username or password." });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────
// Lets the frontend confirm a saved token is still valid on app load.
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Account not found." });
  res.json({ user: publicUser(user) });
});

export default router;
