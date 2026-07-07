// Shared design tokens — the "private banking statement" identity.
export const ink = "#1c2433";
export const parchment = "#faf7f1";
export const brass = "#b8863b";

// Warm tonal palette for charts/categories — beige → espresso, no rainbow.
export const WARM = ["#d9c4a3", "#cbab7e", "#b8863b", "#9a6b34", "#7d5a3c", "#5c4632"];
export const warmFor = (i) => WARM[((i % WARM.length) + WARM.length) % WARM.length];

export const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3eee4; }
  .entry-row { transition: background .25s ease, transform .25s ease; }
  .entry-row:hover { background: rgba(28,36,51,0.025); transform: translateX(2px); }
  .entry-row .del-btn { opacity: 0; transition: opacity .2s ease; }
  .entry-row:hover .del-btn { opacity: 1; }
  .cal-day { transition: background .2s ease, transform .2s ease, box-shadow .2s ease; }
  .cal-day:hover { background: rgba(184,134,59,0.08) !important; transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(28,36,51,0.1); z-index: 2; }
  .cal-arrow:hover:not(:disabled) { background: #fff !important; box-shadow: 0 4px 12px rgba(28,36,51,0.12); }
  .cal-arrow:disabled { opacity: .3; cursor: not-allowed; }
  .bar-hover { transition: filter .2s ease; }
  .bar-hover:hover { filter: brightness(1.08); }
  .press:active { transform: scale(.97); }
  input[type=range]{ -webkit-appearance:none; appearance:none; height:4px; border-radius:99px;
    background: rgba(255,255,255,0.25); outline:none; width: 100%; }
  input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px; height:18px;
    border-radius:50%; background: linear-gradient(135deg,#f0d9a8,#c89b51); cursor:pointer;
    box-shadow:0 2px 8px rgba(0,0,0,.3); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popIn { from { opacity: 0; transform: translateY(20px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @media (max-width: 900px){ .grid-2 { grid-template-columns: 1fr !important; } }
`;

export const fmt = (n, cur) => {
  const sym = cur === "CAD" ? "$" : "$";
  return (n < 0 ? "-" : "") + sym + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const fmt0 = (n, cur) => {
  const sym = cur === "CAD" ? "$" : "$";
  return (n < 0 ? "-" : "") + sym + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
};

export const monthlyEquiv = (amount, recurrence) => {
  switch (recurrence) {
    case "Weekly": return amount * 4.345;
    case "Bi-weekly": return amount * 2.173;
    case "Monthly": return amount;
    case "Quarterly": return amount / 3;
    case "Yearly": return amount / 12;
    default: return amount;
  }
};

export const fade = (m, i) => ({
  opacity: m ? 1 : 0, transform: m ? "translateY(0)" : "translateY(16px)",
  transition: `opacity .7s ease ${i * 0.07}s, transform .7s cubic-bezier(.16,1,.3,1) ${i * 0.07}s`,
});
