import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initSchema } from "./db.js";
import authRoutes from "./routes.auth.js";
import dataRoutes from "./routes.data.js";

dotenv.config();
initSchema();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS: only allow the configured frontend origins to call this API.
const origins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api", dataRoutes);

// Fallback error handler so we never leak stack traces to clients.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`✓ Ledger API listening on http://localhost:${PORT}`);
  console.log(`  Allowed origins: ${origins.join(", ")}`);
});
