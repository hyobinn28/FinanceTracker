import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "ledger.db");

// Ensure the data directory exists (it's gitignored, so it won't be in the repo on first run)
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──────────────────────────────────────────────────────────────
// Every data table carries user_id and cascades on user delete, so a user's
// data is fully isolated and removable. No row is ever shared between users.
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
      first_name   TEXT NOT NULL,
      last_name    TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT NOT NULL,
      monthly_limit REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_income  INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      category_id INTEGER,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK (type IN ('in','out')),
      recurrence  TEXT NOT NULL DEFAULT 'One-time',
      date        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT NOT NULL,
      amount     REAL NOT NULL DEFAULT 0,
      is_market  INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id       INTEGER PRIMARY KEY,
      currency      TEXT NOT NULL DEFAULT 'USD',
      savings_goal  REAL NOT NULL DEFAULT 1500,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tx_user   ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_tx_date   ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_cat_user  ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_acct_user ON accounts(user_id);
  `);
}

// Seed a new user with sensible default categories, accounts, and settings,
// so their first login isn't an empty screen.
export function seedNewUser(userId) {
  const cats = [
    ["Groceries", 700, 0, 0], ["Restaurants", 350, 1, 0], ["Travel", 500, 2, 0],
    ["Utilities", 280, 3, 0], ["Income", 0, 4, 1], ["Miscellaneous", 200, 5, 0],
  ];
  const insCat = db.prepare(
    "INSERT INTO categories (user_id, name, monthly_limit, sort_order, is_income) VALUES (?,?,?,?,?)"
  );
  for (const [name, limit, order, isInc] of cats) insCat.run(userId, name, limit, order, isInc);

  const accts = [
    ["Checking", 0, 0, 0], ["Savings", 0, 0, 1], ["401(k)", 0, 1, 2],
    ["Roth IRA", 0, 1, 3], ["HYSA", 0, 0, 4], ["Investments", 0, 1, 5],
  ];
  const insAcct = db.prepare(
    "INSERT INTO accounts (user_id, name, amount, is_market, sort_order) VALUES (?,?,?,?,?)"
  );
  for (const [name, amount, market, order] of accts) insAcct.run(userId, name, amount, market, order);

  db.prepare("INSERT INTO settings (user_id, currency, savings_goal) VALUES (?, 'USD', 1500)").run(userId);
}

export default db;
