import React, { useState } from "react";
import { api, tokenStore } from "./api.js";
import { ink, parchment, brass } from "./theme.js";

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const payload = mode === "signup"
        ? { username, firstName, lastName, password }
        : { username, password };
      const res = mode === "signup" ? await api.register(payload) : await api.login(payload);
      tokenStore.set(res.token); // persists for the token's 30-day life → "remember me"
      onAuthed(res.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = mode === "signup"
    ? username && firstName && lastName && password.length >= 8
    : username && password;

  return (
    <div style={s.wrap}>
      <div style={s.glow} />
      <div style={s.card}>
        <div style={s.brandRow}>
          <div style={s.mark}>L</div>
          <div>
            <div style={s.brandName}>Ledger</div>
            <div style={s.brandSub}>Personal finance</div>
          </div>
        </div>

        <div style={s.kicker}>{mode === "login" ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}</div>
        <h1 style={s.title}>{mode === "login" ? "Sign in to your ledger" : "Start your ledger"}</h1>

        {mode === "signup" && (
          <div style={s.row}>
            <label style={s.field}>
              <span style={s.label}>First name</span>
              <input style={s.input} value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Stella" autoFocus />
            </label>
            <label style={s.field}>
              <span style={s.label}>Last name</span>
              <input style={s.input} value={lastName} onChange={(e) => setLastName(e.target.value)}
                placeholder="Kim" />
            </label>
          </div>
        )}

        <label style={s.field}>
          <span style={s.label}>Username</span>
          <input style={s.input} value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="stella" autoFocus={mode === "login"}
            onKeyDown={(e) => e.key === "Enter" && mode === "login" && document.getElementById("pw").focus()} />
        </label>

        <label style={s.field}>
          <span style={s.label}>Password</span>
          <input id="pw" style={s.input} type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "at least 8 characters" : "••••••••"}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()} />
        </label>

        {mode === "login" && (
          <div style={s.remember}>✓ You'll stay signed in on this device for 30 days.</div>
        )}

        {error && <div style={s.error}>{error}</div>}

        <button style={{ ...s.cta, opacity: canSubmit && !busy ? 1 : 0.5,
          cursor: canSubmit && !busy ? "pointer" : "not-allowed" }}
          disabled={!canSubmit || busy} onClick={submit} className="press">
          {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <div style={s.switchRow}>
          {mode === "login" ? "New here?" : "Already have an account?"}
          <button style={s.switchBtn}
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>
      <div style={s.footnote}>Your data is private to your account. Only you can see your finances.</div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24,
    background: `radial-gradient(1000px 500px at 70% -10%, #fdf6e9 0%, ${parchment} 45%, #f0ead d 100%)`,
    fontFamily: "'Inter',-apple-system,system-ui,sans-serif" },
  glow: { position: "absolute", top: -160, right: -100, width: 480, height: 480, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(212,175,106,0.22), transparent 65%)", pointerEvents: "none" },
  card: { position: "relative", zIndex: 1, width: "min(440px, 94vw)", background: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(12px)", border: "1px solid rgba(28,36,51,0.06)", borderRadius: 24,
    padding: "36px 38px", boxShadow: "0 24px 70px rgba(28,36,51,0.16)", animation: "popIn .5s cubic-bezier(.16,1,.3,1)" },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  mark: { width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center",
    background: `linear-gradient(135deg, ${ink}, #2d3a52)`, color: "#f0d9a8", fontFamily: "Georgia,serif",
    fontSize: 24, fontWeight: 700, boxShadow: "0 6px 18px rgba(28,36,51,0.22)" },
  brandName: { fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: ink },
  brandSub: { fontSize: 11, color: "#8a93a3", letterSpacing: "0.04em", textTransform: "uppercase" },
  kicker: { fontSize: 11, letterSpacing: "0.2em", color: brass, fontWeight: 700, marginBottom: 8 },
  title: { margin: "0 0 24px", fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700,
    letterSpacing: "-0.01em", color: ink, lineHeight: 1.15 },
  row: { display: "flex", gap: 12 },
  field: { display: "block", marginBottom: 16, flex: 1 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6b7585", marginBottom: 7 },
  input: { width: "100%", border: "1px solid rgba(28,36,51,0.12)", borderRadius: 11, padding: "11px 13px",
    fontSize: 14, fontFamily: "inherit", color: ink, background: "rgba(255,255,255,0.85)", outline: "none" },
  remember: { fontSize: 12, color: brass, fontWeight: 500, marginBottom: 6, marginTop: -4 },
  error: { background: "rgba(154,52,18,0.08)", color: "#9a3412", fontSize: 13, fontWeight: 500,
    padding: "10px 13px", borderRadius: 10, marginBottom: 14, marginTop: 8 },
  cta: { width: "100%", border: "none", borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 600,
    color: "#fbf3e2", background: `linear-gradient(135deg, ${ink}, #313f59)`, fontFamily: "inherit",
    boxShadow: "0 8px 22px rgba(28,36,51,0.25)", marginTop: 10, transition: "transform .15s ease" },
  switchRow: { textAlign: "center", marginTop: 22, fontSize: 13, color: "#6b7585" },
  switchBtn: { border: "none", background: "transparent", color: brass, fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", marginLeft: 6 },
  footnote: { position: "relative", zIndex: 1, marginTop: 22, fontSize: 12, color: "#9aa3b2", textAlign: "center" },
};
