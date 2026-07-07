import express from "express";
import db from "./db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();

// Every route below is gated by requireAuth and scoped to req.userId.
// A user can only ever read or write their own rows.
router.use(requireAuth);

// Helper: confirm a row belongs to the requesting user before mutating it.
function ownsRow(table, id, userId) {
  const row = db.prepare(`SELECT user_id FROM ${table} WHERE id = ?`).get(id);
  return row && row.user_id === userId;
}

// ════════════════ BOOTSTRAP ════════════════
// One call the frontend makes on load to get everything for this user.
router.get("/bootstrap", (req, res) => {
  const uid = req.userId;
  const categories = db.prepare(
    "SELECT id, name, monthly_limit AS monthlyLimit, sort_order AS sortOrder, is_income AS isIncome FROM categories WHERE user_id = ? ORDER BY sort_order, id"
  ).all(uid);
  const transactions = db.prepare(
    "SELECT id, category_id AS categoryId, description, amount, type, recurrence, date FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC"
  ).all(uid);
  const accounts = db.prepare(
    "SELECT id, name, amount, is_market AS isMarket, sort_order AS sortOrder FROM accounts WHERE user_id = ? ORDER BY sort_order, id"
  ).all(uid);
  let settings = db.prepare(
    "SELECT currency, savings_goal AS savingsGoal FROM settings WHERE user_id = ?"
  ).get(uid);
  if (!settings) {
    db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(uid);
    settings = { currency: "USD", savingsGoal: 1500 };
  }
  res.json({ categories, transactions, accounts, settings });
});

// ════════════════ CATEGORIES ════════════════
router.post("/categories", (req, res) => {
  const { name, monthlyLimit = 0, isIncome = 0 } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Category name is required." });
  const order = db.prepare("SELECT COALESCE(MAX(sort_order)+1,0) AS n FROM categories WHERE user_id = ?").get(req.userId).n;
  const info = db.prepare(
    "INSERT INTO categories (user_id, name, monthly_limit, sort_order, is_income) VALUES (?,?,?,?,?)"
  ).run(req.userId, name.trim(), Number(monthlyLimit) || 0, order, isIncome ? 1 : 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch("/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!ownsRow("categories", id, req.userId)) return res.status(404).json({ error: "Not found." });
  const { name, monthlyLimit } = req.body || {};
  const cur = db.prepare("SELECT name, monthly_limit FROM categories WHERE id = ?").get(id);
  db.prepare("UPDATE categories SET name = ?, monthly_limit = ? WHERE id = ?")
    .run(name != null ? String(name) : cur.name, monthlyLimit != null ? Number(monthlyLimit) : cur.monthly_limit, id);
  res.json({ ok: true });
});

router.delete("/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!ownsRow("categories", id, req.userId)) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  res.json({ ok: true });
});

// ════════════════ TRANSACTIONS ════════════════
router.post("/transactions", (req, res) => {
  const { description, amount, type, recurrence = "One-time", date, categoryId } = req.body || {};
  if (!description || !description.trim()) return res.status(400).json({ error: "Description is required." });
  if (!(Number(amount) > 0)) return res.status(400).json({ error: "Amount must be greater than zero." });
  if (type !== "in" && type !== "out") return res.status(400).json({ error: "Type must be 'in' or 'out'." });
  if (!date) return res.status(400).json({ error: "Date is required." });
  if (categoryId != null && !ownsRow("categories", Number(categoryId), req.userId))
    return res.status(400).json({ error: "Invalid category." });

  const info = db.prepare(
    "INSERT INTO transactions (user_id, category_id, description, amount, type, recurrence, date) VALUES (?,?,?,?,?,?,?)"
  ).run(req.userId, categoryId ?? null, description.trim(), Number(amount), type, recurrence, date);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch("/transactions/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!ownsRow("transactions", id, req.userId)) return res.status(404).json({ error: "Not found." });
  const cur = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  const { description, amount, type, recurrence, date, categoryId } = req.body || {};
  db.prepare(
    "UPDATE transactions SET description=?, amount=?, type=?, recurrence=?, date=?, category_id=? WHERE id=?"
  ).run(
    description ?? cur.description, amount != null ? Number(amount) : cur.amount,
    type ?? cur.type, recurrence ?? cur.recurrence, date ?? cur.date,
    categoryId !== undefined ? categoryId : cur.category_id, id
  );
  res.json({ ok: true });
});

router.delete("/transactions/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!ownsRow("transactions", id, req.userId)) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  res.json({ ok: true });
});

// ════════════════ ACCOUNTS (net worth) ════════════════
router.post("/accounts", (req, res) => {
  const { name, amount = 0, isMarket = 0 } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Account name is required." });
  const order = db.prepare("SELECT COALESCE(MAX(sort_order)+1,0) AS n FROM accounts WHERE user_id = ?").get(req.userId).n;
  const info = db.prepare(
    "INSERT INTO accounts (user_id, name, amount, is_market, sort_order) VALUES (?,?,?,?,?)"
  ).run(req.userId, name.trim(), Number(amount) || 0, isMarket ? 1 : 0, order);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch("/accounts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!ownsRow("accounts", id, req.userId)) return res.status(404).json({ error: "Not found." });
  const cur = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
  const { name, amount, isMarket } = req.body || {};
  db.prepare("UPDATE accounts SET name=?, amount=?, is_market=? WHERE id=?")
    .run(name ?? cur.name, amount != null ? Number(amount) : cur.amount,
         isMarket != null ? (isMarket ? 1 : 0) : cur.is_market, id);
  res.json({ ok: true });
});

router.delete("/accounts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!ownsRow("accounts", id, req.userId)) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  res.json({ ok: true });
});

// ════════════════ SETTINGS ════════════════
router.patch("/settings", (req, res) => {
  const { currency, savingsGoal } = req.body || {};
  const cur = db.prepare("SELECT currency, savings_goal FROM settings WHERE user_id = ?").get(req.userId)
    || { currency: "USD", savings_goal: 1500 };
  db.prepare(
    "INSERT INTO settings (user_id, currency, savings_goal) VALUES (?,?,?) " +
    "ON CONFLICT(user_id) DO UPDATE SET currency=excluded.currency, savings_goal=excluded.savings_goal"
  ).run(req.userId, currency ?? cur.currency, savingsGoal != null ? Number(savingsGoal) : cur.savings_goal);
  res.json({ ok: true });
});

export default router;
