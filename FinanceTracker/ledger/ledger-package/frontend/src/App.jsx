import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api, tokenStore } from "./api.js";
import AuthScreen from "./AuthScreen.jsx";
import { GLOBAL_CSS, ink, parchment, brass, WARM, warmFor, fmt, fmt0, monthlyEquiv, fade } from "./theme.js";
import { S } from "./dashboardStyles.js";

const RECURRENCE = ["One-time", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Yearly"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const HOLIDAYS = {
  USD: {
    "2026-01-01":"New Year's Day","2026-01-19":"MLK Jr. Day","2026-02-16":"Presidents' Day",
    "2026-05-25":"Memorial Day","2026-06-19":"Juneteenth","2026-07-03":"Independence Day (obs.)",
    "2026-07-04":"Independence Day","2026-09-07":"Labor Day","2026-10-12":"Columbus Day",
    "2026-11-11":"Veterans Day","2026-11-26":"Thanksgiving","2026-12-25":"Christmas Day",
    "2027-01-01":"New Year's Day","2027-01-18":"MLK Jr. Day","2027-02-15":"Presidents' Day",
    "2027-05-31":"Memorial Day","2027-06-18":"Juneteenth (obs.)","2027-06-19":"Juneteenth",
    "2027-07-05":"Independence Day (obs.)","2027-07-04":"Independence Day","2027-09-06":"Labor Day",
    "2027-10-11":"Columbus Day","2027-11-11":"Veterans Day","2027-11-25":"Thanksgiving","2027-12-25":"Christmas Day",
  },
  CAD: {
    "2026-01-01":"New Year's Day","2026-02-16":"Family Day","2026-04-03":"Good Friday",
    "2026-05-18":"Victoria Day","2026-07-01":"Canada Day","2026-08-03":"Civic Holiday",
    "2026-09-07":"Labour Day","2026-10-12":"Thanksgiving","2026-11-11":"Remembrance Day",
    "2026-12-25":"Christmas Day","2026-12-26":"Boxing Day",
    "2027-01-01":"New Year's Day","2027-02-15":"Family Day","2027-03-26":"Good Friday",
    "2027-05-24":"Victoria Day","2027-07-01":"Canada Day","2027-08-02":"Civic Holiday",
    "2027-09-06":"Labour Day","2027-10-11":"Thanksgiving","2027-11-11":"Remembrance Day",
    "2027-12-25":"Christmas Day","2027-12-26":"Boxing Day",
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, if a saved token exists, confirm it's still valid (30-day window).
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setLoading(false); return; }
    api.me()
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
          fontFamily: "'Inter',sans-serif", color: "#8a93a3", background: "#f3eee4" }}>
          Loading your ledger…
        </div>
      </>
    );
  }

  if (!user) {
    return (<><style>{GLOBAL_CSS}</style><AuthScreen onAuthed={setUser} /></>);
  }

  return (<><style>{GLOBAL_CSS}</style><Dashboard user={user} onLogout={() => { tokenStore.clear(); setUser(null); }} /></>);
}

// ════════════════════════ DASHBOARD ════════════════════════
function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("Spending");
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [addCtx, setAddCtx] = useState(null);
  const [showCatMgr, setShowCatMgr] = useState(false);

  const reload = useCallback(async () => {
    try { setData(await api.bootstrap()); }
    catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  if (err) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#9a3412" }}>Error: {err}</div>;
  if (!data) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#8a93a3", fontFamily: "sans-serif" }}>Loading…</div>;

  const currency = data.settings.currency;
  const setCurrency = async (c) => {
    setData((d) => ({ ...d, settings: { ...d.settings, currency: c } }));
    await api.updateSettings({ currency: c });
  };

  return (
    <div style={S.shell}>
      <header style={{ ...S.topbar, ...fade(mounted, 0) }}>
        <div style={S.brand}>
          <div style={S.mark}>L</div>
          <div>
            <div style={S.brandName}>Ledger</div>
            <div style={S.brandSub}>Hello {user.firstName} 👋</div>
          </div>
        </div>
        <nav style={S.nav}>
          {["Overview", "Spending", "Investments", "Goals"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...S.navItem, ...(tab === t ? S.navItemActive : {}) }}>{t}</button>
          ))}
        </nav>
        <div style={S.topRight}>
          <div style={S.curSwitch}>
            {["USD", "CAD"].map((c) => (
              <button key={c} onClick={() => setCurrency(c)}
                style={{ ...S.curBtn, ...(currency === c ? S.curBtnActive : {}) }}>
                {c === "USD" ? "🇺🇸" : "🇨🇦"} {c}
              </button>
            ))}
          </div>
          <button style={S.addCta} onClick={() => setAddCtx("open")}>＋ New entry</button>
          <button style={S.logout} onClick={onLogout} title="Sign out">⏻</button>
        </div>
      </header>

      {tab === "Spending" && (
        <SpendingTab {...{ mounted, currency, data, reload, setData, setAddCtx, setShowCatMgr }} />
      )}
      {tab === "Goals" && <GoalsTab {...{ mounted, currency, data, reload, setData }} />}
      {(tab === "Overview" || tab === "Investments") && <Placeholder tab={tab} firstName={user.firstName} />}

      {addCtx && (
        <AddModal categories={data.categories} currency={currency}
          presetDate={typeof addCtx === "object" ? addCtx.date : null}
          onClose={() => setAddCtx(null)}
          onAdded={async () => { setAddCtx(null); await reload(); }}
          onManageCats={() => { setAddCtx(null); setShowCatMgr(true); }} />
      )}
      {showCatMgr && (
        <CategoryManager categories={data.categories}
          onClose={() => setShowCatMgr(false)} onChanged={reload} />
      )}
    </div>
  );
}

// ════════════════════════ SPENDING TAB ════════════════════════
function SpendingTab({ mounted, currency, data, reload, setData, setAddCtx, setShowCatMgr }) {
  const { categories, transactions, settings } = data;
  const [filter, setFilter] = useState("all");
  const [goalInput, setGoalInput] = useState(String(settings.savingsGoal));
  const [catScope, setCatScope] = useState("month");
  const [flowScope, setFlowScope] = useState("month");
  const [calY, setCalY] = useState(2026);
  const [calM, setCalM] = useState(5);
  useEffect(() => setGoalInput(String(settings.savingsGoal)), [settings.savingsGoal]);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const spendCats = categories.filter((c) => !c.isIncome);
  const holidaySet = HOLIDAYS[currency];

  const perCat = useMemo(() => {
    const m = Object.fromEntries(categories.map((c) => [c.id, 0]));
    transactions.filter((t) => t.type === "out").forEach((t) => {
      if (t.categoryId != null) m[t.categoryId] = (m[t.categoryId] || 0) + monthlyEquiv(t.amount, t.recurrence);
    });
    return m;
  }, [transactions, categories]);

  const totalOut = useMemo(() => transactions.filter((t) => t.type === "out")
    .reduce((a, t) => a + monthlyEquiv(t.amount, t.recurrence), 0), [transactions]);
  const totalIn = useMemo(() => transactions.filter((t) => t.type === "in")
    .reduce((a, t) => a + monthlyEquiv(t.amount, t.recurrence), 0), [transactions]);
  const projectedSavings = totalIn - totalOut;
  const goalPct = Math.max(0, Math.min(100, (projectedSavings / (settings.savingsGoal || 1)) * 100));

  const visible = filter === "all" ? transactions : transactions.filter((t) => t.categoryId === filter);

  const byDay = useMemo(() => {
    const m = {};
    transactions.forEach((t) => { (m[t.date] = m[t.date] || []).push(t); });
    return m;
  }, [transactions]);

  const startDow = new Date(calY, calM, 1).getDay();
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const moveMonth = (dir) => {
    let m = calM + dir, y = calY;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    if (y < 2026) { y = 2026; m = 0; } if (y > 2027) { y = 2027; m = 11; }
    setCalY(y); setCalM(m);
  };

  const commitGoal = async (val) => {
    const v = Math.max(100, Number(val) || 0);
    setData((d) => ({ ...d, settings: { ...d.settings, savingsGoal: v } }));
    await api.updateSettings({ savingsGoal: v });
  };

  const updateLimit = async (id, limit) => {
    setData((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, monthlyLimit: Number(limit) || 0 } : c) }));
    await api.updateCategory(id, { monthlyLimit: Number(limit) || 0 });
  };

  const removeTx = async (id) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
    await api.deleteTransaction(id);
  };

  return (
    <>
      {/* Savings goal hero */}
      <section style={{ ...S.hero, ...fade(mounted, 1) }}>
        <div style={S.heroGlow} />
        <div style={S.heroLeft}>
          <div style={S.heroKicker}>MONTHLY SAVINGS GOAL</div>
          <div style={S.heroBig}>{fmt(projectedSavings, currency)}</div>
          <div style={S.heroOf}>projected toward your {fmt(settings.savingsGoal, currency)} target</div>
          <div style={S.goalControl}>
            <div style={S.goalControlTop}>
              <span style={S.goalControlLabel}>Adjust target</span>
              <div style={S.goalInputWrap}>
                <span style={S.goalInputSym}>$</span>
                <input style={S.goalInput} value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => commitGoal(goalInput)}
                  onKeyDown={(e) => e.key === "Enter" && commitGoal(goalInput)} />
              </div>
            </div>
            <input type="range" min="100" max="6000" step="50" value={settings.savingsGoal}
              onChange={(e) => setData((d) => ({ ...d, settings: { ...d.settings, savingsGoal: Number(e.target.value) } }))}
              onMouseUp={(e) => commitGoal(e.target.value)} style={S.range} />
            <div style={S.rangeTicks}><span>{fmt0(100, currency)}</span><span>{fmt0(6000, currency)}</span></div>
          </div>
        </div>
        <div style={S.ring}>
          <Ring pct={goalPct} />
          <div style={S.ringCenter}><div style={S.ringPct}>{Math.round(goalPct)}%</div><div style={S.ringLabel}>of goal</div></div>
        </div>
      </section>

      {/* Calendar */}
      <section style={{ ...S.card, ...fade(mounted, 2), marginBottom: 22 }}>
        <div style={S.calHeader}>
          <button style={S.calArrow} className="cal-arrow" onClick={() => moveMonth(-1)}
            disabled={calY === 2026 && calM === 0}>‹</button>
          <div style={S.calHeaderCenter}>
            <h2 style={S.calMonthTitle}>{MONTHS[calM]} <span style={S.calYear}>{calY}</span></h2>
            <span style={S.cardHint}>click any day to add a transaction · holidays in red</span>
          </div>
          <button style={S.calArrow} className="cal-arrow" onClick={() => moveMonth(1)}
            disabled={calY === 2027 && calM === 11}>›</button>
        </div>
        <div style={S.dowRow}>{DOW.map((d) => <div key={d} style={S.dowCell}>{d}</div>)}</div>
        <div style={S.calGrid}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} style={S.calEmpty} />;
            const key = `${calY}-${String(calM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayEntries = byDay[key] || [];
            const holiday = holidaySet[key];
            const dayIn = dayEntries.filter((e) => e.type === "in").reduce((a, e) => a + e.amount, 0);
            const dayOut = dayEntries.filter((e) => e.type === "out").reduce((a, e) => a + e.amount, 0);
            return (
              <button key={i} className="cal-day" style={S.calDay} onClick={() => setAddCtx({ date: key })}>
                <div style={S.calDayTop}>
                  <span style={{ ...S.calDayNum, ...(holiday ? S.calDayNumHol : {}) }}>{d}</span>
                  {holiday && <span style={S.holDot} title={holiday} />}
                </div>
                {holiday && <div style={S.holName}>{holiday}</div>}
                <div style={S.calFlows}>
                  {dayIn > 0 && <span style={S.flowIn}>+{fmt0(dayIn, currency)}</span>}
                  {dayOut > 0 && <span style={S.flowOut}>−{fmt0(dayOut, currency)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Budgets + Entries */}
      <div style={S.grid} className="grid-2">
        <section style={{ ...S.card, ...fade(mounted, 3) }}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Category budgets</h2>
            <button style={S.linkBtn} onClick={() => setShowCatMgr(true)}>Manage categories →</button>
          </div>
          <div style={S.catList}>
            {spendCats.map((c, idx) => {
              const spent = perCat[c.id] || 0;
              const pct = c.monthlyLimit ? Math.min(100, (spent / c.monthlyLimit) * 100) : 0;
              const over = c.monthlyLimit > 0 && spent > c.monthlyLimit;
              return (
                <div key={c.id} style={S.catRow} onClick={() => setFilter(filter === c.id ? "all" : c.id)}>
                  <div style={S.catTop}>
                    <span style={{ ...S.catDot, background: warmFor(idx) }} />
                    <span style={S.catName}>{c.name}</span>
                    <span style={{ ...S.catSpent, color: over ? "#9a3412" : "#1c2433" }}>{fmt(spent, currency)}</span>
                    <span style={S.catOf}>/</span>
                    <input style={S.limitInput} defaultValue={c.monthlyLimit}
                      onClick={(ev) => ev.stopPropagation()}
                      onBlur={(ev) => updateLimit(c.id, ev.target.value)}
                      onKeyDown={(ev) => ev.key === "Enter" && ev.target.blur()} />
                  </div>
                  <div style={S.track}>
                    <div style={{ ...S.fill, width: `${pct}%`,
                      background: over ? "linear-gradient(90deg,#c9954a,#9a3412)"
                        : `linear-gradient(90deg, ${warmFor(idx)}, ${WARM[Math.min(idx + 2, WARM.length - 1)]})` }} />
                  </div>
                  {over && <div style={S.overTag}>Over by {fmt(spent - c.monthlyLimit, currency)}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ ...S.card, ...fade(mounted, 4) }}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Entries</h2>
            <div style={S.filterPills}>
              <button onClick={() => setFilter("all")} style={{ ...S.pill, ...(filter === "all" ? S.pillActive : {}) }}>All</button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => setFilter(c.id)}
                  style={{ ...S.pill, ...(filter === c.id ? S.pillActive : {}) }}>{c.name}</button>
              ))}
            </div>
          </div>
          <div style={S.entryList}>
            {visible.map((t) => {
              const c = catById[t.categoryId];
              const idx = categories.findIndex((x) => x.id === t.categoryId);
              return (
                <div key={t.id} style={S.entry} className="entry-row">
                  <span style={{ ...S.catDot, background: warmFor(idx < 0 ? 0 : idx) }} />
                  <div style={S.entryMain}>
                    <div style={S.entryDesc}>{t.description}</div>
                    <div style={S.entryMeta}>
                      {c?.name || "Uncategorized"} · {t.date.slice(5)}
                      {t.recurrence !== "One-time" && <span style={S.recurBadge}>↻ {t.recurrence}</span>}
                    </div>
                  </div>
                  <div style={{ ...S.entryAmt, color: t.type === "in" ? "#5c7a3c" : "#1c2433" }}>
                    {t.type === "in" ? "+" : "−"}{fmt(t.amount, currency)}
                  </div>
                  <button style={S.del} className="del-btn" onClick={() => removeTx(t.id)}>✕</button>
                </div>
              );
            })}
            {visible.length === 0 && <div style={S.empty}>No entries here yet. Click a calendar day or “New entry”.</div>}
          </div>
        </section>
      </div>

      {/* Spending by category — full width */}
      <section style={{ ...S.card, ...fade(mounted, 5), marginTop: 22 }}>
        <div style={S.cardHead}>
          <div><h2 style={S.cardTitle}>Spending by category</h2>
            <span style={S.cardHint}>{catScope === "month" ? "across the months of 2026" : "yearly total"}</span></div>
          <ScopeToggle scope={catScope} setScope={setCatScope} />
        </div>
        <CategoryChart currency={currency} cats={spendCats} perCat={perCat} scope={catScope} />
      </section>

      {/* Cash flow — full width */}
      <section style={{ ...S.card, ...fade(mounted, 6), marginTop: 22 }}>
        <div style={S.cardHead}>
          <div><h2 style={S.cardTitle}>Cash flow</h2>
            <span style={S.cardHint}>{flowScope === "month" ? "income vs spending, monthly" : "income vs spending, yearly"}</span></div>
          <ScopeToggle scope={flowScope} setScope={setFlowScope} />
        </div>
        <FlowChart currency={currency} scope={flowScope} totalIn={totalIn} totalOut={totalOut} />
        <div style={S.legendRow}>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: "#7d8a4f" }} />Income</span>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: "#9a6b34" }} />Spending</span>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: "#b8863b" }} />Net</span>
        </div>
      </section>
    </>
  );
}

// ════════════════════════ GOALS TAB ════════════════════════
function GoalsTab({ mounted, currency, data, reload, setData }) {
  const { accounts } = data;
  const [showAdd, setShowAdd] = useState(false);
  const [drift, setDrift] = useState(0);

  const net = accounts.reduce((a, x) => a + x.amount * (x.isMarket ? (1 + drift / 100) : 1), 0);
  const marketPortion = accounts.filter((x) => x.isMarket).reduce((a, x) => a + x.amount * (1 + drift / 100), 0);

  const updateAmount = async (id, amount) => {
    const v = Number(amount) || 0;
    setData((d) => ({ ...d, accounts: d.accounts.map((a) => a.id === id ? { ...a, amount: v } : a) }));
    await api.updateAccount(id, { amount: v });
  };
  const remove = async (id) => {
    setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id) }));
    await api.deleteAccount(id);
  };

  return (
    <>
      <section style={{ ...S.hero, ...fade(mounted, 1) }}>
        <div style={S.heroGlow} />
        <div style={S.heroLeft}>
          <div style={S.heroKicker}>NET WORTH</div>
          <div style={S.heroBig}>{fmt(net, currency)}</div>
          <div style={S.heroOf}>{fmt(marketPortion, currency)} market-linked · updates with the market</div>
          <div style={S.goalControl}>
            <span style={S.goalControlLabel}>Simulate market move ({drift > 0 ? "+" : ""}{drift}%)</span>
            <input type="range" min="-20" max="20" step="1" value={drift}
              onChange={(e) => setDrift(Number(e.target.value))} style={S.range} />
            <div style={S.rangeTicks}><span>−20%</span><span>+20%</span></div>
          </div>
        </div>
        <div style={S.ring}>
          <Ring pct={Math.min(100, (net / 150000) * 100)} />
          <div style={S.ringCenter}><div style={S.ringPctSm}>{fmt0(net, currency)}</div><div style={S.ringLabel}>toward {fmt0(150000, currency)}</div></div>
        </div>
      </section>

      <section style={{ ...S.card, ...fade(mounted, 2) }}>
        <div style={S.cardHead}>
          <div><h2 style={S.cardTitle}>Accounts</h2>
            <span style={S.cardHint}>market-linked accounts move with your investments</span></div>
          <button style={S.linkBtn} onClick={() => setShowAdd(true)}>＋ Add account</button>
        </div>
        <div style={S.acctList}>
          {accounts.map((a) => {
            const val = a.amount * (a.isMarket ? (1 + drift / 100) : 1);
            return (
              <div key={a.id} style={S.acctRow} className="entry-row">
                <div style={S.acctMain}>
                  <div style={S.acctName}>{a.name}{a.isMarket ? <span style={S.marketBadge}>market</span> : null}</div>
                  <div style={S.acctBar}><div style={{ ...S.acctBarFill, width: `${net ? Math.min(100, (val / net) * 100) : 0}%` }} /></div>
                </div>
                <div style={S.acctInputWrap}>
                  <span style={S.acctSym}>$</span>
                  <input style={S.acctInput} defaultValue={a.amount}
                    onBlur={(e) => updateAmount(a.id, e.target.value.replace(/[^0-9.]/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
                </div>
                <div style={S.acctVal}>{a.isMarket && drift !== 0 ? fmt0(val, currency) : ""}</div>
                <button style={S.del} className="del-btn" onClick={() => remove(a.id)}>✕</button>
              </div>
            );
          })}
        </div>
      </section>

      {showAdd && <AddAccountModal currency={currency} onClose={() => setShowAdd(false)}
        onAdded={async () => { setShowAdd(false); await reload(); }} />}
    </>
  );
}

// ════════════════════════ MODALS ════════════════════════
function AddModal({ categories, currency, presetDate, onClose, onAdded, onManageCats }) {
  const [type, setType] = useState("out");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState(categories[0]?.id);
  const [recurrence, setRecurrence] = useState("One-time");
  const [date, setDate] = useState(presetDate || "2026-06-23");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = desc.trim() && Number(amount) > 0;

  const submit = async () => {
    setBusy(true); setError("");
    try {
      await api.addTransaction({ description: desc.trim(), amount: Number(amount), type, recurrence, date, categoryId: cat });
      await onAdded();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalGlow} />
        <div style={S.modalKicker}>{presetDate ? `NEW · ${presetDate}` : "NEW ENTRY"}</div>
        <h3 style={S.modalTitle}>Add a transaction</h3>
        <div style={S.typeToggle}>
          <button onClick={() => setType("out")} style={{ ...S.typeBtn, ...(type === "out" ? S.typeBtnOut : {}) }}>− Money out</button>
          <button onClick={() => setType("in")} style={{ ...S.typeBtn, ...(type === "in" ? S.typeBtnIn : {}) }}>+ Money in</button>
        </div>
        <label style={S.field}><span style={S.fieldLabel}>Description</span>
          <input style={S.input} value={desc} autoFocus onChange={(e) => setDesc(e.target.value)}
            placeholder={type === "in" ? "e.g. Paycheck" : "e.g. Grocery run"} /></label>
        <div style={S.fieldRow}>
          <label style={{ ...S.field, flex: 1 }}><span style={S.fieldLabel}>Amount ({currency})</span>
            <input style={S.input} value={amount} type="number" onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>
          <label style={{ ...S.field, flex: 1 }}><span style={S.fieldLabel}>Date</span>
            <input style={S.input} type="date" value={date} min="2026-01-01" max="2027-12-31"
              onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label style={S.field}>
          <div style={S.fieldLabelRow}><span style={S.fieldLabel}>Category</span>
            <button style={S.miniLink} onClick={onManageCats}>＋ manage</button></div>
          <div style={S.catPicker}>
            {categories.map((c, idx) => (
              <button key={c.id} onClick={() => setCat(c.id)}
                style={{ ...S.catPick, ...(cat === c.id ? S.catPickActive : {}) }}>
                <span style={{ ...S.catDot, background: warmFor(idx) }} />{c.name}</button>
            ))}
          </div>
        </label>
        <label style={S.field}><span style={S.fieldLabel}>Recurrence</span>
          <div style={S.recurPicker}>
            {RECURRENCE.map((r) => (
              <button key={r} onClick={() => setRecurrence(r)}
                style={{ ...S.recurPick, ...(recurrence === r ? S.recurPickActive : {}) }}>{r}</button>
            ))}
          </div>
          {recurrence !== "One-time" && <div style={S.recurNote}>↻ Recurs {recurrence.toLowerCase()}.</div>}
        </label>
        {error && <div style={S.modalError}>{error}</div>}
        <div style={S.modalActions}>
          <button style={S.ghostBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...S.primaryBtn, opacity: valid && !busy ? 1 : 0.45, cursor: valid && !busy ? "pointer" : "not-allowed" }}
            disabled={!valid || busy} onClick={submit}>{busy ? "Saving…" : "Add transaction"}</button>
        </div>
      </div>
    </div>
  );
}

function CategoryManager({ categories, onClose, onChanged }) {
  const [name, setName] = useState("");
  const [local, setLocal] = useState(categories);
  useEffect(() => setLocal(categories), [categories]);

  const add = async () => {
    if (!name.trim()) return;
    await api.addCategory({ name: name.trim(), monthlyLimit: 200 });
    setName(""); await onChanged();
  };
  const rename = async (id, n) => { await api.updateCategory(id, { name: n }); await onChanged(); };
  const remove = async (id) => { await api.deleteCategory(id); await onChanged(); };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalGlow} />
        <div style={S.modalKicker}>CATEGORIES</div>
        <h3 style={S.modalTitle}>Manage categories</h3>
        <div style={S.catMgrList}>
          {local.map((c, idx) => (
            <div key={c.id} style={S.catMgrRow}>
              <span style={{ ...S.catDot, background: warmFor(idx), width: 12, height: 12 }} />
              <input style={S.catMgrName} defaultValue={c.name}
                onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
              <button style={S.del} onClick={() => remove(c.id)}>✕</button>
            </div>
          ))}
        </div>
        <div style={S.catMgrAdd}>
          <input style={S.input} value={name} placeholder="New category name"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button style={S.primaryBtn} onClick={add}>Add</button>
        </div>
        <div style={S.modalActions}><button style={S.ghostBtn} onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function AddAccountModal({ currency, onClose, onAdded }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [market, setMarket] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && Number(amount) >= 0;
  const submit = async () => {
    setBusy(true);
    try { await api.addAccount({ name: name.trim(), amount: Number(amount), isMarket: market }); await onAdded(); }
    catch { setBusy(false); }
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalGlow} />
        <div style={S.modalKicker}>NET WORTH</div>
        <h3 style={S.modalTitle}>Add account</h3>
        <label style={S.field}><span style={S.fieldLabel}>Account name</span>
          <input style={S.input} value={name} autoFocus placeholder="e.g. Crypto wallet"
            onChange={(e) => setName(e.target.value)} /></label>
        <label style={S.field}><span style={S.fieldLabel}>Balance ({currency})</span>
          <input style={S.input} type="number" value={amount} placeholder="0"
            onChange={(e) => setAmount(e.target.value)} /></label>
        <label style={S.checkRow} onClick={() => setMarket(!market)}>
          <span style={{ ...S.checkbox, ...(market ? S.checkboxOn : {}) }}>{market ? "✓" : ""}</span>
          <span>Market-linked (moves with investments)</span>
        </label>
        <div style={S.modalActions}>
          <button style={S.ghostBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...S.primaryBtn, opacity: valid && !busy ? 1 : 0.45 }} disabled={!valid || busy}
            onClick={submit}>{busy ? "Saving…" : "Add account"}</button>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ tab, firstName }) {
  return (
    <div style={S.placeholder}>
      <div style={S.placeholderMark}>{tab === "Investments" ? "↗" : "◷"}</div>
      <h2 style={S.placeholderTitle}>{tab}</h2>
      <p style={S.placeholderText}>
        {tab === "Investments"
          ? `Coming soon, ${firstName} — your stock & money tracker will live here, with holdings, cost basis, live prices, and news insights.`
          : `Coming soon, ${firstName} — a unified monthly snapshot across spending, income, and net worth.`}
      </p>
    </div>
  );
}

function ScopeToggle({ scope, setScope }) {
  return (
    <div style={S.scopeToggle}>
      <button onClick={() => setScope("month")} style={{ ...S.scopeBtn, ...(scope === "month" ? S.scopeBtnOn : {}) }}>Monthly</button>
      <button onClick={() => setScope("year")} style={{ ...S.scopeBtn, ...(scope === "year" ? S.scopeBtnOn : {}) }}>Yearly</button>
    </div>
  );
}

function CategoryChart({ currency, cats, perCat, scope }) {
  const factors = [0.7, 0.85, 1.05, 0.9, 0.95, 1.0];
  const data = scope === "month"
    ? MON3.slice(0, 6).map((m, mi) => ({ label: m, vals: cats.map((c) => Math.round((perCat[c.id] || 0) * factors[mi])) }))
    : [{ label: "2026", vals: cats.map((c) => Math.round((perCat[c.id] || 0) * 11.4)) }];
  const max = Math.max(1, ...data.flatMap((d) => d.vals));
  const H = 240;
  return (
    <div>
      <div style={{ ...S.catChartArea, height: H }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <div key={g} style={{ ...S.gridLine, bottom: 24 + g * (H - 40) }}>
            <span style={S.gridLabel}>{fmt0(max * g, currency)}</span></div>
        ))}
        <div style={S.catGroups}>
          {data.map((grp) => (
            <div key={grp.label} style={S.catGroup}>
              <div style={S.catGroupBars}>
                {grp.vals.map((v, ci) => (
                  <div key={ci} className="bar-hover" style={{ ...S.catBar, height: `${(v / max) * (H - 40)}px`,
                    background: warmFor(ci), animationDelay: `${ci * 0.05}s` }}
                    title={`${cats[ci]?.name}: ${fmt0(v, currency)}`} />
                ))}
              </div>
              <div style={S.catGroupLabel}>{grp.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.catChartLegend}>
        {cats.map((c, ci) => (
          <span key={c.id} style={S.legendItem}><span style={{ ...S.legendDot, background: warmFor(ci) }} />{c.name}</span>
        ))}
      </div>
    </div>
  );
}

function FlowChart({ currency, scope, totalIn, totalOut }) {
  const labels = scope === "month" ? MON3.slice(0, 6) : ["2022", "2023", "2024", "2025", "2026"];
  const inc = scope === "month" ? [5800, 6100, 6800, 6800, 6800, Math.round(totalIn)] : [58000, 64000, 71000, 78000, Math.round(totalIn * 12)];
  const out = scope === "month" ? [4200, 5100, 3900, 4600, 4100, Math.round(totalOut)] : [44000, 49000, 52000, 55000, Math.round(totalOut * 12)];
  const max = Math.max(...inc, ...out, 1) * 1.1;
  const W = 1000, H = 280, padL = 56, padR = 20, padT = 16, padB = 32, n = labels.length;
  const x = (i) => padL + (i * (W - padL - padR)) / (n - 1);
  const y = (v) => H - padB - (v / max) * (H - padT - padB);
  const lineP = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const areaP = (arr) => `${lineP(arr)} L${x(n - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  const net = inc.map((v, i) => v - out[i]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 280 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="incFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(125,138,79,0.28)" /><stop offset="100%" stopColor="rgba(125,138,79,0)" /></linearGradient>
        <linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(154,107,52,0.22)" /><stop offset="100%" stopColor="rgba(154,107,52,0)" /></linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => {
        const yy = H - padB - g * (H - padT - padB);
        return (<g key={g}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="rgba(28,36,51,0.07)" strokeWidth="1" />
          <text x={padL - 10} y={yy + 3} fontSize="11" fill="#9aa3b2" textAnchor="end">{fmt0(max * g, currency)}</text></g>);
      })}
      <path d={areaP(inc)} fill="url(#incFill)" /><path d={areaP(out)} fill="url(#outFill)" />
      <path d={lineP(inc)} fill="none" stroke="#7d8a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: "draw 1.5s ease forwards" }} />
      <path d={lineP(out)} fill="none" stroke="#9a6b34" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: "draw 1.5s ease .25s forwards" }} />
      <path d={lineP(net)} fill="none" stroke="#b8863b" strokeWidth="2" strokeDasharray="5 5" />
      {inc.map((v, i) => <circle key={"i" + i} cx={x(i)} cy={y(v)} r="3.5" fill="#7d8a4f" />)}
      {out.map((v, i) => <circle key={"o" + i} cx={x(i)} cy={y(v)} r="3.5" fill="#9a6b34" />)}
      {labels.map((m, i) => <text key={m} x={x(i)} y={H - 8} fontSize="12" fill="#8a93a3" textAnchor="middle">{m}</text>)}
    </svg>
  );
}

function Ring({ pct }) {
  const r = 78, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" style={{ transform: "rotate(-90deg)" }}>
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d4af6a" /><stop offset="100%" stopColor="#b8863b" /></linearGradient></defs>
      <circle cx="95" cy="95" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
      <circle cx="95" cy="95" r={r} fill="none" stroke="url(#rg)" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)" }} />
    </svg>
  );
}
