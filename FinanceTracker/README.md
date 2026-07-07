# Ledger — Personal Finance Tracker

A private, account-based personal finance app. Each user signs in and sees only
their own data: spending and income, a transaction calendar with holidays, category
budgets, a monthly savings goal, analytics, and a net-worth view.

Built as two clearly separated parts:

```
ledger/
├── backend/    Node + Express + SQLite API (auth + per-user data)
└── frontend/   React + Vite single-page app
```

The **Investments** and **Overview** tabs are intentional placeholders — the stock
tracker and unified snapshot come in a later phase.

---

## What's included

- **Username + password accounts.** Passwords are hashed with bcrypt; they are never
  stored in plain text. Sign-up also collects first/last name for the personalized
  "Hello Stella 👋" greeting.
- **"Remember me" for 30 days.** A returning user lands logged in and goes straight
  to their dashboard until the token expires.
- **Strict per-user data isolation.** Every row is keyed to a user; the API refuses
  any attempt to read or modify another user's data. This is what makes it safe to put
  the *code* on public GitHub.
- **Open registration.** Anyone with the URL can create an account. They only ever see
  their own finances.
- **Basic abuse protection.** Login/registration is rate-limited to slow brute-force
  attempts. Input is validated server-side.

---

## Quick start (local development)

You need **Node.js 18+** installed.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then open .env and set a JWT_SECRET (see below)
npm start
```

Generate a strong secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The API runs at `http://localhost:4000`. The SQLite database is created automatically
at `backend/data/ledger.db` on first run.

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
cp .env.example .env        # default points at the local backend; no change needed
npm run dev
```

Open the printed URL (default `http://localhost:5173`). Create an account and you're in.

---

## How the pieces connect

- The frontend talks to the backend at the URL in `frontend/.env` (`VITE_API_URL`).
- On login or sign-up, the backend returns a token. The frontend stores it in the
  browser and sends it on every request. On app load, the saved token is checked
  against `/api/auth/me`; if still valid, the user skips the login screen.
- All data calls (`/api/transactions`, `/api/categories`, etc.) require that token and
  are automatically scoped to the signed-in user.

---

## Deploying to production (one always-on host)

The goal: your friends use a real URL anytime, without running any commands.

You'll deploy **two things** — the backend API and the frontend site. They can live on
the same host or two different ones. The code is host-agnostic; any host that runs a
Node process for the backend and serves static files for the frontend works.

### Backend — set these environment variables on the host

| Variable | What to set it to |
|---|---|
| `JWT_SECRET` | A long random string (generate as shown above). **Required.** Never commit it. |
| `JWT_EXPIRES_IN` | `30d` (the remember-me window). |
| `DB_PATH` | A path on a **persistent disk** the host won't wipe between deploys. |
| `CORS_ORIGINS` | The exact URL where your frontend is hosted, e.g. `https://ledger.example.com`. |
| `PORT` | Often provided by the host automatically; otherwise `4000`. |
| `NODE_ENV` | `production` (this makes the server refuse to start without a real `JWT_SECRET`). |

> **Persistence matters:** SQLite is a single file. If the host gives you only
> ephemeral storage, the database resets on each redeploy. Point `DB_PATH` at a
> persistent volume, or move to a hosted Postgres later (the schema ports over).

### Frontend — build and serve

```bash
cd frontend
# set VITE_API_URL in .env to your deployed backend URL, e.g. https://api.ledger.example.com/api
npm run build
```

This produces a static `dist/` folder. Upload it to any static host, or have your
Node host serve it.

### Deploy checklist

- [ ] `JWT_SECRET` set on the host (not in the repo).
- [ ] `DB_PATH` points at persistent storage.
- [ ] `CORS_ORIGINS` matches the real frontend URL.
- [ ] `frontend/.env` `VITE_API_URL` points at the real backend URL **before** `npm run build`.
- [ ] Confirm `.env` and `data/` are **not** in your git history (`git status` should never show them).

---

## Security — honest scope

This is a solid small app for a handful of people you know. It includes the sensible
baseline: password hashing, per-user isolation, signed sessions, login rate-limiting,
and server-side validation.

It is **not** a hardened banking platform. There's no email verification, password
reset, or two-factor auth yet, and open registration means strangers *can* create
accounts (they still can't see anyone else's data). Keeping the audience to people you
trust is the right call. Re-evaluate if you ever want this widely public.

---

## Project layout

```
backend/
  src/
    server.js        Express app + route wiring
    db.js            SQLite connection, schema, new-user seeding
    auth.js          JWT signing + requireAuth middleware
    routes.auth.js   register / login / me
    routes.data.js   per-user CRUD: categories, transactions, accounts, settings
    initDb.js        one-off schema initializer
  .env.example
  data/              database lives here at runtime (gitignored)

frontend/
  src/
    main.jsx           React entry
    App.jsx            auth gating + dashboard (Spending, Goals)
    AuthScreen.jsx     login + sign-up
    api.js             API client + token persistence
    theme.js           shared tokens, helpers, global CSS
    dashboardStyles.js dashboard style objects
  index.html
  .env.example
```
