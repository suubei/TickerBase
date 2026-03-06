import { useState, useRef, useEffect } from "react";

const INIT_WATCHLISTS = [
  {
    id: "wl1", name: "Tech Giants",
    stocks: [
      { id: "s1", symbol: "NASDAQ:AAPL", label: "AAPL", name: "Apple Inc." },
      { id: "s2", symbol: "NASDAQ:NVDA", label: "NVDA", name: "NVIDIA Corp." },
      { id: "s3", symbol: "NASDAQ:MSFT", label: "MSFT", name: "Microsoft" },
    ]
  },
  {
    id: "wl2", name: "Energy",
    stocks: [
      { id: "s4", symbol: "NYSE:XOM", label: "XOM", name: "ExxonMobil" },
      { id: "s5", symbol: "NYSE:CVX", label: "CVX", name: "Chevron" },
    ]
  },
  {
    id: "wl3", name: "Dividend Stars",
    stocks: [
      { id: "s6", symbol: "NYSE:JNJ", label: "JNJ", name: "Johnson & Johnson" },
      { id: "s7", symbol: "NYSE:KO",  label: "KO",  name: "Coca-Cola" },
      { id: "s8", symbol: "NYSE:PG",  label: "PG",  name: "Procter & Gamble" },
    ]
  },
];

const STOCK_DB = [
  { symbol: "NASDAQ:AAPL", label: "AAPL", name: "Apple Inc." },
  { symbol: "NASDAQ:NVDA", label: "NVDA", name: "NVIDIA Corp." },
  { symbol: "NASDAQ:MSFT", label: "MSFT", name: "Microsoft" },
  { symbol: "NASDAQ:GOOG", label: "GOOG", name: "Alphabet Inc." },
  { symbol: "NASDAQ:META", label: "META", name: "Meta Platforms" },
  { symbol: "NASDAQ:AMZN", label: "AMZN", name: "Amazon.com" },
  { symbol: "NASDAQ:TSLA", label: "TSLA", name: "Tesla Inc." },
  { symbol: "NASDAQ:NFLX", label: "NFLX", name: "Netflix Inc." },
  { symbol: "NASDAQ:INTC", label: "INTC", name: "Intel Corp." },
  { symbol: "NASDAQ:AMD",  label: "AMD",  name: "Advanced Micro Devices" },
  { symbol: "NYSE:XOM",    label: "XOM",  name: "ExxonMobil" },
  { symbol: "NYSE:CVX",    label: "CVX",  name: "Chevron" },
  { symbol: "NYSE:JNJ",    label: "JNJ",  name: "Johnson & Johnson" },
  { symbol: "NYSE:KO",     label: "KO",   name: "Coca-Cola" },
  { symbol: "NYSE:PG",     label: "PG",   name: "Procter & Gamble" },
  { symbol: "NYSE:GS",     label: "GS",   name: "Goldman Sachs" },
  { symbol: "NYSE:JPM",    label: "JPM",  name: "JPMorgan Chase" },
  { symbol: "NYSE:BAC",    label: "BAC",  name: "Bank of America" },
  { symbol: "NYSE:WMT",    label: "WMT",  name: "Walmart Inc." },
  { symbol: "NYSE:DIS",    label: "DIS",  name: "The Walt Disney Co." },
  { symbol: "NYSE:V",      label: "V",    name: "Visa Inc." },
  { symbol: "NYSE:MA",     label: "MA",   name: "Mastercard" },
];

function TradingViewChart({ symbol }) {
  const src = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=D&theme=light&style=1&locale=en&toolbar_bg=%23f1f3f6&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`;
  return (
    <iframe key={symbol} src={src}
      style={{ width: "100%", height: "100%", border: "none" }}
      allowTransparency allowFullScreen />
  );
}

const genId = () => Math.random().toString(36).slice(2, 9);

const menuBtnStyle = (color) => ({
  display: "flex", alignItems: "center", gap: 8,
  width: "100%", padding: "9px 14px",
  border: "none", background: "none",
  cursor: "pointer", fontSize: 13,
  color: color || "#111827", textAlign: "left",
});

export default function App() {
  const [watchlists, setWatchlists] = useState(INIT_WATCHLISTS);
  const [expanded, setExpanded] = useState({ wl1: true });
  const [activeSymbol, setActiveSymbol] = useState("NASDAQ:AAPL");
  const [activeStock, setActiveStock] = useState("s1");
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, wlId } | { x, y, wlId, stockId, stock }
  const [addModal, setAddModal] = useState(null); // { wlId }
  const [searchQ, setSearchQ] = useState("");
  const searchRef = useRef(null);
  const drag = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (addModal) setTimeout(() => searchRef.current?.focus(), 50);
  }, [addModal]);

  const openCtxMenu = (e, wlId) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, wlId });
  };

  const openStockCtxMenu = (e, wlId, stock) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, wlId, stockId: stock.id, stock });
  };

  const exportWatchlist = (wlId) => {
    const wl = watchlists.find(w => w.id === wlId);
    if (!wl) return;
    const csv = ["Symbol,Name,Exchange",
      ...wl.stocks.map(s => `${s.label},${s.name},${s.symbol.split(":")[0]}`)
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${wl.name}.csv`;
    a.click();
    setCtxMenu(null);
  };

  const deleteWatchlist = (wlId) => {
    setWatchlists(ws => ws.filter(w => w.id !== wlId));
    setExpanded(e => { const n = { ...e }; delete n[wlId]; return n; });
    setCtxMenu(null);
  };

  const deleteStock = (wlId, stockId) => {
    setWatchlists(ws =>
      ws.map(w => w.id !== wlId ? w : { ...w, stocks: w.stocks.filter(s => s.id !== stockId) })
        .filter(w => w.stocks.length > 0)
    );
    if (activeStock === stockId) {
      const wl = watchlists.find(w => w.id === wlId);
      const rem = wl?.stocks.filter(s => s.id !== stockId);
      if (rem?.length) { setActiveStock(rem[0].id); setActiveSymbol(rem[0].symbol); }
    }
  };

  const toggleExpand = (wlId) => setExpanded(e => ({ ...e, [wlId]: !e[wlId] }));

  const openAddModal = (wlId) => { setCtxMenu(null); setSearchQ(""); setAddModal({ wlId }); };

  const addStock = (stock) => {
    const wl = watchlists.find(w => w.id === addModal.wlId);
    if (!wl || wl.stocks.find(s => s.symbol === stock.symbol)) { setAddModal(null); return; }
    setWatchlists(ws => ws.map(w =>
      w.id === addModal.wlId ? { ...w, stocks: [...w.stocks, { ...stock, id: genId() }] } : w
    ));
    setExpanded(e => ({ ...e, [addModal.wlId]: true }));
    setAddModal(null);
  };

  const searchResults = searchQ.trim().length === 0 ? [] :
    STOCK_DB.filter(s =>
      s.label.toLowerCase().includes(searchQ.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQ.toLowerCase())
    ).slice(0, 8);

  // drag watchlist
  const onDragStartWL = (e, wlId) => { drag.current = { type: "wl", id: wlId }; e.dataTransfer.effectAllowed = "move"; };
  const onDragOverWL  = (e, wlId) => { e.preventDefault(); if (drag.current?.type === "wl") setDragOver({ type: "wl", id: wlId }); };
  const onDropWL = (e, targetId) => {
    e.preventDefault();
    if (drag.current?.type !== "wl" || drag.current.id === targetId) { setDragOver(null); return; }
    setWatchlists(ws => {
      const arr = [...ws];
      const from = arr.findIndex(w => w.id === drag.current.id);
      const to   = arr.findIndex(w => w.id === targetId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setDragOver(null); drag.current = null;
  };

  // drag stock
  const onDragStartStock = (e, stockId, wlId) => { e.stopPropagation(); drag.current = { type: "stock", id: stockId, wlId }; e.dataTransfer.effectAllowed = "move"; };
  const onDragOverStock  = (e, stockId, wlId) => { e.preventDefault(); e.stopPropagation(); if (drag.current?.type === "stock") setDragOver({ type: "stock", id: stockId, wlId }); };
  const onDropStock = (e, targetId, targetWlId) => {
    e.preventDefault(); e.stopPropagation();
    if (drag.current?.type !== "stock" || drag.current.id === targetId) { setDragOver(null); return; }
    const { id: srcId, wlId: srcWlId } = drag.current;
    setWatchlists(ws => {
      const arr = ws.map(w => ({ ...w, stocks: [...w.stocks] }));
      const srcWL = arr.find(w => w.id === srcWlId);
      const tgtWL = arr.find(w => w.id === targetWlId);
      const [item] = srcWL.stocks.splice(srcWL.stocks.findIndex(s => s.id === srcId), 1);
      tgtWL.stocks.splice(tgtWL.stocks.findIndex(s => s.id === targetId), 0, item);
      return arr.filter(w => w.stocks.length > 0);
    });
    setDragOver(null); drag.current = null;
  };

  const onDragEnd = () => { drag.current = null; setDragOver(null); };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f9fafb" }}>

      {/* Chart */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{activeSymbol.split(":")[1]}</span>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{activeSymbol}</span>
        </div>
        <div style={{ flex: 1 }}><TradingViewChart symbol={activeSymbol} /></div>
      </div>

      {/* Watchlist panel */}
      <div style={{ width: 280, background: "#fff", borderLeft: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Watchlists</span>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Right-click watchlist or stock to manage</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {watchlists.map(wl => {
            const isWLDO = dragOver?.type === "wl" && dragOver.id === wl.id;
            return (
              <div key={wl.id} draggable
                onDragStart={e => onDragStartWL(e, wl.id)}
                onDragOver={e => onDragOverWL(e, wl.id)}
                onDrop={e => onDropWL(e, wl.id)}
                onDragEnd={onDragEnd}
                style={{ borderBottom: "1px solid #f3f4f6", outline: isWLDO ? "2px solid #3b82f6" : "none", outlineOffset: -2, borderRadius: 4, background: isWLDO ? "#eff6ff" : "transparent" }}
              >
                {/* WL header */}
                <div onClick={() => toggleExpand(wl.id)}
                  onContextMenu={e => { e.stopPropagation(); openCtxMenu(e, wl.id); }}
                  style={{ display: "flex", alignItems: "center", padding: "10px 12px", cursor: "pointer", userSelect: "none" }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginRight: 6, cursor: "grab" }}>⠿</span>
                  <span style={{ fontSize: 12, color: "#6b7280", marginRight: 6, display: "inline-block", transform: expanded[wl.id] ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}>▶</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>{wl.name}</span>
                  <span style={{ fontSize: 11, color: "#d1d5db" }}>{wl.stocks.length}</span>
                </div>

                {/* Stocks */}
                {expanded[wl.id] && (
                  <div style={{ paddingBottom: 4 }} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); openCtxMenu(e, wl.id); }}>
                    {wl.stocks.map(stock => {
                      const isActive = activeStock === stock.id;
                      const isSDO = dragOver?.type === "stock" && dragOver.id === stock.id;
                      return (
                        <div key={stock.id} draggable
                          onDragStart={e => onDragStartStock(e, stock.id, wl.id)}
                          onDragOver={e => onDragOverStock(e, stock.id, wl.id)}
                          onDrop={e => onDropStock(e, stock.id, wl.id)}
                          onDragEnd={onDragEnd}
                          onContextMenu={e => openStockCtxMenu(e, wl.id, stock)}
                          onClick={() => { setActiveStock(stock.id); setActiveSymbol(stock.symbol); }}
                          style={{
                            display: "flex", alignItems: "center",
                            padding: "7px 12px 7px 28px", cursor: "pointer", userSelect: "none",
                            background: isActive ? "#eff6ff" : isSDO ? "#f0fdf4" : "transparent",
                            borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                            outline: isSDO ? "1px solid #86efac" : "none",
                            transition: "background .1s",
                          }}
                        >
                          <span style={{ fontSize: 10, color: "#d1d5db", marginRight: 6, cursor: "grab" }}>⠿</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#2563eb" : "#111827" }}>{stock.label}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deleteStock(wl.id, stock.id); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#e5e7eb", fontSize: 13, padding: "2px 4px", borderRadius: 4, lineHeight: 1, flexShrink: 0 }}
                            onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseOut={e => e.currentTarget.style.color = "#e5e7eb"}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {watchlists.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No watchlists</div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 200, minWidth: 180, overflow: "hidden" }}>
          {ctxMenu.stockId ? (
            <>
              <button onClick={() => { setActiveStock(ctxMenu.stockId); setActiveSymbol(ctxMenu.stock.symbol); setCtxMenu(null); }}
                style={menuBtnStyle()}
                onMouseOver={e => e.currentTarget.style.background = "#f3f4f6"}
                onMouseOut={e => e.currentTarget.style.background = "none"}>
                <span>◉</span> View Chart
              </button>
              <div style={{ height: 1, background: "#f3f4f6" }} />
              <button onClick={() => deleteStock(ctxMenu.wlId, ctxMenu.stockId)}
                style={menuBtnStyle("#ef4444")}
                onMouseOver={e => e.currentTarget.style.background = "#fef2f2"}
                onMouseOut={e => e.currentTarget.style.background = "none"}>
                <span>✕</span> Remove from Watchlist
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openAddModal(ctxMenu.wlId)}
                style={menuBtnStyle()}
                onMouseOver={e => e.currentTarget.style.background = "#f3f4f6"}
                onMouseOut={e => e.currentTarget.style.background = "none"}>
                <span>＋</span> Add Symbol
              </button>
              <button onClick={() => exportWatchlist(ctxMenu.wlId)}
                style={menuBtnStyle()}
                onMouseOver={e => e.currentTarget.style.background = "#f3f4f6"}
                onMouseOut={e => e.currentTarget.style.background = "none"}>
                <span>↓</span> Export CSV
              </button>
              <div style={{ height: 1, background: "#f3f4f6" }} />
              <button onClick={() => deleteWatchlist(ctxMenu.wlId)}
                style={menuBtnStyle("#ef4444")}
                onMouseOver={e => e.currentTarget.style.background = "#fef2f2"}
                onMouseOut={e => e.currentTarget.style.background = "none"}>
                <span>✕</span> Delete Watchlist
              </button>
            </>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {addModal && (
        <div onClick={() => setAddModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.18)", width: 400, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                Add Symbol — {watchlists.find(w => w.id === addModal.wlId)?.name}
              </span>
              <button onClick={() => setAddModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ color: "#9ca3af", fontSize: 14 }}>🔍</span>
                <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search symbol or name..."
                  style={{ border: "none", background: "none", outline: "none", fontSize: 13, color: "#111827", flex: 1 }} />
                {searchQ && <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: 0 }}>✕</button>}
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {searchQ.trim() === "" ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Type to search symbols</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No results for "{searchQ}"</div>
              ) : searchResults.map(stock => {
                const wl = watchlists.find(w => w.id === addModal.wlId);
                const already = wl?.stocks.some(s => s.symbol === stock.symbol);
                return (
                  <div key={stock.symbol} onClick={() => !already && addStock(stock)}
                    style={{ display: "flex", alignItems: "center", padding: "10px 16px", cursor: already ? "default" : "pointer", opacity: already ? .45 : 1, borderBottom: "1px solid #f9fafb" }}
                    onMouseOver={e => { if (!already) e.currentTarget.style.background = "#f9fafb"; }}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{stock.label}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{stock.name} · {stock.symbol.split(":")[0]}</div>
                    </div>
                    {already
                      ? <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "2px 8px", borderRadius: 10 }}>Added</span>
                      : <span style={{ fontSize: 18, color: "#3b82f6", lineHeight: 1 }}>＋</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}