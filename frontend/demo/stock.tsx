import { useState } from "react";

const MOCK_STOCKS = [
  {
    id: 1, ticker: "AAPL", companyName: "Apple Inc.",
    summary: "Consumer electronics and software ecosystem leader",
    themes: ["AI", "Consumer Tech"], categories: ["Technology"],
    catalyst: "Vision Pro spatial computing adoption",
    risk: "Consumer spending slowdown", isArchived: false,
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: 2, ticker: "NVDA", companyName: "NVIDIA Corp.",
    summary: "Dominant GPU & AI accelerator platform",
    themes: ["AI Infrastructure"], categories: ["Semiconductors"],
    catalyst: "Blackwell ramp, data center build-out",
    risk: "Export restrictions, custom ASIC competition",
    isArchived: false, updatedAt: "2026-02-28T14:30:00Z",
  },
  {
    id: 3, ticker: "MSFT", companyName: "Microsoft Corp.",
    summary: "Enterprise cloud + AI productivity suite",
    themes: ["AI", "Cloud"], categories: ["Technology"],
    catalyst: "Copilot monetization in Office 365",
    risk: "Azure growth deceleration", isArchived: false,
    updatedAt: "2026-02-25T09:00:00Z",
  },
  {
    id: 4, ticker: "XOM", companyName: "ExxonMobil Corp.",
    summary: "Integrated oil & gas major with strong FCF",
    themes: ["Energy Transition"], categories: ["Energy"],
    catalyst: "Pioneer acquisition synergies",
    risk: "Oil price decline", isArchived: false,
    updatedAt: "2026-02-20T11:00:00Z",
  },
  {
    id: 5, ticker: "GS", companyName: "Goldman Sachs Group",
    summary: "Premier investment banking and trading franchise",
    themes: ["Rate Cycle"], categories: ["Financials"],
    catalyst: "IPO market recovery, M&A rebound",
    risk: "Trading revenue volatility", isArchived: true,
    updatedAt: "2026-02-10T16:00:00Z",
  },
];

const THEME_COLOR = (t: string) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    "AI":                { bg: "#eaf4ff", text: "#245d9b", border: "#c9dff5" },
    "Consumer Tech":     { bg: "#eaf4ff", text: "#245d9b", border: "#c9dff5" },
    "AI Infrastructure": { bg: "#eaf4ff", text: "#245d9b", border: "#c9dff5" },
    "Cloud":             { bg: "#eaf4ff", text: "#245d9b", border: "#c9dff5" },
    "Energy Transition": { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
    "Rate Cycle":        { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  };
  return map[t] ?? { bg: "#eaf4ff", text: "#245d9b", border: "#c9dff5" };
};

const JSON_PLACEHOLDER = `{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "summary": "Consumer electronics and software ecosystem...",
  "themes": ["AI", "Consumer Tech"],
  "categories": ["Technology"],
  "catalyst": "Vision Pro adoption",
  "risk": "Consumer slowdown"
}`;

const MD_PLACEHOLDER = `# AAPL — Apple Inc.

## Summary

Consumer electronics and software ecosystem leader...

## Catalyst

- Vision Pro spatial computing ramp
- Services revenue growth

## Risk

Consumer spending slowdown, macro headwinds`;

const simpleRenderMd = (text: string) =>
  text.split("\n").map((line, i) => {
    if (/^## (.+)/.test(line)) return <h2 key={i} style={{ fontSize: 14, fontWeight: 600, margin: "14px 0 5px", color: "#111827", borderBottom: "1px solid #f3f4f6", paddingBottom: 4 }}>{line.replace(/^## /, "")}</h2>;
    if (/^# (.+)/.test(line))  return <h1 key={i} style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "#111827" }}>{line.replace(/^# /, "")}</h1>;
    if (/^- (.+)/.test(line))  return <li key={i} style={{ marginLeft: 20, listStyle: "disc", marginBottom: 3, fontSize: 13, color: "#374151" }}>{line.replace(/^- /, "")}</li>;
    if (!line.trim())           return <div key={i} style={{ height: 8 }} />;
    return <p key={i} style={{ fontSize: 13, color: "#374151", margin: "0 0 6px", lineHeight: 1.6 }}>{line}</p>;
  });

// ── Colours ─────────────────────────────────────────────────────
const C = {
  bg:          "#f9fafb",
  panel:       "#ffffff",
  panelSoft:   "#f9fafb",
  text:        "#111827",
  subtle:      "#374151",
  soft:        "#6b7280",
  muted:       "#9ca3af",
  line:        "#e5e7eb",
  lineStrong:  "#d1d5db",
  hover:       "#f3f4f6",
  primary:     "#2563eb",
  primaryStrong: "#1d4ed8",
  info:        "#eff6ff",
  infoLine:    "#bfdbfe",
};

export default function App() {
  const [search, setSearch]           = useState("");
  const [archiveFilter, setArchiveFilter] = useState<"all" | "active" | "archived">("all");
  const [isSelectMode, setIsSelectMode]   = useState(false);
  const [selected, setSelected]           = useState<number[]>([]);
  const [sortCol, setSortCol]             = useState("ticker");
  const [sortAsc, setSortAsc]             = useState(true);
  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [isEditing, setIsEditing]         = useState(false);
  const [jsonPayload, setJsonPayload]     = useState(JSON_PLACEHOLDER);
  const [mdPayload, setMdPayload]         = useState(MD_PLACEHOLDER);
  const [isPreview, setIsPreview]         = useState(false);
  const [toast, setToast]                 = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const filtered = MOCK_STOCKS.filter(s => {
    if (archiveFilter === "active" && s.isArchived) return false;
    if (archiveFilter === "archived" && !s.isArchived) return false;
    const q = search.toLowerCase();
    return !q || s.ticker.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q);
  });

  const toggleSelect = (id: number) =>
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);

  const openCreate = () => { setIsEditing(false); setIsPreview(false); setIsDialogOpen(true); };
  const openEdit   = () => { setIsEditing(true);  setIsPreview(false); setIsDialogOpen(true); };

  const sortIcon = (col: string) => sortCol === col ? (sortAsc ? " ↑" : " ↓") : "";

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  };

  const btnBase: React.CSSProperties = { border: `1px solid ${C.lineStrong}`, borderRadius: 6, background: C.panel, color: C.subtle, fontSize: 13, fontWeight: 500, padding: "5px 11px", cursor: "pointer" };
  const btnPrimary: React.CSSProperties = { ...btnBase, border: `1px solid ${C.primary}`, background: C.primary, color: "#fff" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", fontSize: 13, padding: "8px 14px", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.14)", zIndex: 70 }}>
          {toast}
        </div>
      )}

      {/* ── Topbar ──────────────────────────────────── */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Stocks</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{MOCK_STOCKS.length} total stocks</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setIsSelectMode(m => !m); setSelected([]); }}
            style={{ ...btnBase, borderColor: isSelectMode ? C.text : C.lineStrong, background: isSelectMode ? C.text : C.panel, color: isSelectMode ? "#fff" : C.subtle }}
          >
            {isSelectMode ? "Exit Select" : "Select"}
          </button>
          <button onClick={openCreate} style={btnPrimary}>+ Create</button>
        </div>
      </div>

      {/* ── Bulk bar ──────────────────────────────────── */}
      {isSelectMode && (
        <div style={{ background: C.info, borderBottom: `1px solid ${C.infoLine}`, padding: "8px 24px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryStrong }}>{selected.length} selected</span>
          <div style={{ flex: 1 }} />
          {["Export", "★ New Watchlist", "Archive", "Unarchive"].map(lbl => (
            <button key={lbl} disabled={selected.length === 0}
              onClick={() => showToast(`${lbl} — done`)}
              style={{ ...btnBase, opacity: selected.length === 0 ? 0.45 : 1, cursor: selected.length === 0 ? "not-allowed" : "pointer" }}
            >{lbl}</button>
          ))}
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────── */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "10px 24px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Search with icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.panelSoft, border: `1px solid ${C.lineStrong}`, borderRadius: 6, padding: "0 10px", height: 34 }}>
          <span style={{ color: C.muted, fontSize: 14, userSelect: "none" }}>⌕</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search stocks…"
            style={{ border: "none", background: "none", outline: "none", fontSize: 13, color: C.subtle, width: 190 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
        {/* Dropdowns */}
        {["All categories", "All themes", "All watchlists"].map(ph => (
          <select key={ph} style={{ border: `1px solid ${C.lineStrong}`, borderRadius: 6, background: C.panel, color: C.soft, fontSize: 13, padding: "5px 10px", height: 34, cursor: "pointer" }}>
            <option>{ph}</option>
          </select>
        ))}
        {/* Segmented All/Active/Archived */}
        <div style={{ display: "inline-flex", border: `1px solid ${C.lineStrong}`, borderRadius: 6, overflow: "hidden" }}>
          {(["all", "active", "archived"] as const).map((val, i, arr) => (
            <button key={val} onClick={() => setArchiveFilter(val)}
              style={{ border: "none", borderRight: i < arr.length - 1 ? `1px solid ${C.line}` : "none", borderRadius: 0, background: archiveFilter === val ? C.text : "transparent", color: archiveFilter === val ? "#fff" : C.soft, fontSize: 13, fontWeight: 500, padding: "5px 12px", cursor: "pointer" }}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>
        {(search || archiveFilter !== "all") && (
          <button onClick={() => { setSearch(""); setArchiveFilter("all"); }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 13 }}
          >Clear ✕</button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: C.panel }}>
          <thead>
            <tr>
              {isSelectMode && (
                <th style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, background: C.panelSoft, width: 36 }}>
                  <input type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? filtered.map(s => s.id) : [])}
                  />
                </th>
              )}
              {[
                ["ticker",    "Ticker"],
                ["category",  "Category"],
                ["summary",   "Summary"],
                ["themes",    "Themes"],
                ["catalyst",  "Catalyst"],
                ["risk",      "Risk"],
                ["updatedAt", "Updated"],
              ].map(([key, label]) => (
                <th key={key} onClick={() => handleSort(key)}
                  style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, background: C.panelSoft, textAlign: "left", color: C.soft, fontWeight: 650, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", fontSize: 12 }}
                >
                  {label}{sortIcon(key)}
                </th>
              ))}
              <th style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, background: C.panelSoft, color: C.soft, fontWeight: 650, fontSize: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isSelectMode ? 9 : 8} style={{ textAlign: "center", padding: "48px 10px", color: C.muted }}>No stocks found</td>
              </tr>
            ) : filtered.map((stock, i) => {
              const isSel = selected.includes(stock.id);
              const rowBg = isSel ? "#eaf2ff" : i % 2 === 1 ? "#fcfcfb" : C.panel;
              return (
                <tr key={stock.id} style={{ background: rowBg, cursor: "pointer" }}
                  onMouseOver={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = C.hover; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                  onClick={() => showToast(`Opened ${stock.ticker}`)}
                >
                  {isSelectMode && (
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}` }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(stock.id)} />
                    </td>
                  )}
                  {/* Ticker: bold monospace + company name */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div>
                        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, fontWeight: 600, color: "#5a5750" }}>{stock.ticker}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1, whiteSpace: "nowrap" }}>{stock.companyName}</div>
                      </div>
                      {stock.isArchived && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#f3f3f3", color: "#767676", border: "1px solid #e0e0e0", flexShrink: 0 }}>Archived</span>
                      )}
                    </div>
                  </td>
                  {/* Category chips */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {stock.categories.map(c => (
                        <span key={c} style={{ background: "#f2efe7", color: "#6a4f2a", border: "1px solid #dfd5c3", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{c}</span>
                      ))}
                    </div>
                  </td>
                  {/* Summary */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.subtle, maxWidth: 220 }}>{stock.summary}</td>
                  {/* Theme chips */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {stock.themes.map(t => {
                        const col = THEME_COLOR(t);
                        return <span key={t} style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}`, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{t}</span>;
                      })}
                    </div>
                  </td>
                  {/* Catalyst */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.subtle, maxWidth: 180 }}>{stock.catalyst}</td>
                  {/* Risk */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.subtle, maxWidth: 160 }}>{stock.risk}</td>
                  {/* Updated */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                    {new Date(stock.updatedAt).toLocaleDateString()}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}` }} onClick={e => e.stopPropagation()}>
                    <button onClick={openEdit}
                      style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${C.line}`, background: C.panel, color: C.soft, fontSize: 13, cursor: "pointer", lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >✎</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ────────────────────────── */}
      <div style={{ background: C.panelSoft, borderTop: `1px solid ${C.line}`, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: C.soft }}>
        <span>Showing 1–{filtered.length} of {MOCK_STOCKS.length} stocks</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["«", "‹", 1, "›", "»"] as (string | number)[]).map((btn, i) => (
            <button key={i}
              style={{ minWidth: 30, height: 30, padding: "0 6px", border: `1px solid ${C.lineStrong}`, borderRadius: 6, background: btn === 1 ? C.primary : C.panel, color: btn === 1 ? "#fff" : C.subtle, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >{btn}</button>
          ))}
        </div>
      </div>

      {/* ── Import / Create Dialog ───────────────────── */}
      {isDialogOpen && (
        <div onClick={() => setIsDialogOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 16 }}
        >
          <section onClick={e => e.stopPropagation()}
            style={{ width: isEditing ? "min(620px, 100%)" : "min(820px, 100%)", maxHeight: "88vh", background: C.panel, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{isEditing ? "Edit Stock" : "Create Stock"}</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
                  {isEditing ? "Update existing record fields" : "Paste JSON data and optionally a Markdown report"}
                </p>
              </div>
              <button onClick={() => setIsDialogOpen(false)}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, color: C.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Body */}
            {isEditing ? (
              /* Edit mode: single JSON pane */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ padding: "7px 14px", background: C.panelSoft, borderBottom: `1px solid ${C.hover}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>JSON</span>
                  <span style={{ fontSize: 11, color: C.muted }}>Update existing record fields</span>
                </div>
                <textarea value={jsonPayload} onChange={e => setJsonPayload(e.target.value)}
                  style={{ flex: 1, border: "none", padding: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.6, color: C.text, background: C.panel, resize: "none", outline: "none", minHeight: 0 }}
                  spellCheck={false}
                />
              </div>
            ) : (
              /* Create mode: two-pane JSON + Markdown */
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden", borderBottom: `1px solid ${C.line}` }}>
                {/* JSON pane */}
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${C.line}` }}>
                  <div style={{ padding: "7px 14px", background: C.panelSoft, borderBottom: `1px solid ${C.hover}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>JSON</span>
                    <span style={{ fontSize: 11, color: C.muted }}>Defines record fields</span>
                  </div>
                  <textarea value={jsonPayload} onChange={e => setJsonPayload(e.target.value)}
                    style={{ flex: 1, border: "none", padding: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.6, color: C.text, background: C.panel, resize: "none", outline: "none", minHeight: 0 }}
                    spellCheck={false}
                  />
                </div>
                {/* Markdown pane */}
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "7px 14px", background: C.panelSoft, borderBottom: `1px solid ${C.hover}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Markdown</span>
                    <button onClick={() => setIsPreview(p => !p)}
                      style={{ border: `1px solid ${isPreview ? C.infoLine : C.line}`, background: isPreview ? C.info : C.panel, color: isPreview ? C.primaryStrong : C.muted, fontSize: 11, padding: "3px 8px", borderRadius: 5, cursor: "pointer" }}
                    >
                      {isPreview ? "Edit" : "Preview"}
                    </button>
                  </div>
                  {!isPreview ? (
                    <textarea value={mdPayload} onChange={e => setMdPayload(e.target.value)}
                      style={{ flex: 1, border: "none", padding: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.6, color: C.text, background: C.panel, resize: "none", outline: "none", minHeight: 0 }}
                      spellCheck={false}
                    />
                  ) : (
                    <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
                      {simpleRenderMd(mdPayload)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", background: C.panelSoft, flexShrink: 0 }}>
              <button onClick={() => setIsDialogOpen(false)} style={btnBase}>Cancel</button>
              <button onClick={() => { showToast(isEditing ? "Updated!" : "Created!"); setIsDialogOpen(false); }} style={btnPrimary}>
                {isEditing ? "Update" : "Create"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
