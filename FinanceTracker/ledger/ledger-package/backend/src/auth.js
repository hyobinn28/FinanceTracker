import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

if (process.env.NODE_ENV === "production" && JWT_SECRET.includes("dev-only")) {
  console.error("FATAL: JWT_SECRET is not set in production. Refusing to start.");
  process.exit(1);
}

export function signToken(user) {
  // Only non-sensitive identity goes in the token. Never the password hash.
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Middleware: requires a valid bearer token, attaches req.userId.
// This is the gate that guarantees every downstream query is scoped to one user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}
