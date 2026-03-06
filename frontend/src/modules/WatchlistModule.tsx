import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Watchlist } from "../types";

type CtxMenu = {
  x: number;
  y: number;
  watchlistId: number;
  stockTicker?: string;
};

type DragOver = {
  type: "watchlist" | "stock";
  watchlistId: number;
  ticker?: string;
} | null;

type WatchlistModuleProps = {
  watchlists: Watchlist[];
  expandedWatchlistId: number | null;
  activeChartTicker: string;
  onToggleWatchlist: (id: number) => void;
  onDeleteWatchlist: (id: number) => void;
  onSelectTicker: (ticker: string) => void;
  onRemoveTicker: (watchlistId: number, ticker: string) => void;
  onExportWatchlistCsv: (watchlistId: number) => void;
  onAddSymbol: (watchlistId: number, ticker: string) => void;
  onReorderWatchlists: (fromId: number, toId: number) => void;
  onReorderStocks: (watchlistId: number, fromTicker: string, toTicker: string) => void;
  onMoveStock: (fromWatchlistId: number, toWatchlistId: number, ticker: string, toTicker: string) => void;
  renderChart: (symbol: string) => ReactNode;
};

export function WatchlistModule({
  watchlists,
  expandedWatchlistId,
  activeChartTicker,
  onToggleWatchlist,
  onDeleteWatchlist,
  onSelectTicker,
  onRemoveTicker,
  onExportWatchlistCsv,
  onAddSymbol,
  onReorderWatchlists,
  onReorderStocks,
  onMoveStock,
  renderChart
}: WatchlistModuleProps) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [addSymbolModal, setAddSymbolModal] = useState<{ watchlistId: number } | null>(null);
  const [newSymbol, setNewSymbol] = useState("");
  const [dragOver, setDragOver] = useState<DragOver>(null);
  const dragState = useRef<{ type: "watchlist" | "stock"; watchlistId: number; ticker?: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (addSymbolModal) {
      setNewSymbol("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [addSymbolModal]);

  function openWlContextMenu(event: MouseEvent, watchlistId: number) {
    event.preventDefault();
    event.stopPropagation();
    setCtxMenu({ x: event.clientX, y: event.clientY, watchlistId });
  }

  function openStockContextMenu(event: MouseEvent, watchlistId: number, ticker: string) {
    event.preventDefault();
    event.stopPropagation();
    setCtxMenu({ x: event.clientX, y: event.clientY, watchlistId, stockTicker: ticker });
  }

  const activeTicker = activeChartTicker.includes(":")
    ? activeChartTicker.split(":")[1]
    : activeChartTicker;

  return (
    <section className="panel module-watchlist">
      <div className="watchlist-layout">

        {/* ── Chart area ── */}
        <div className="watchlist-box watchlist-chart-box">
          <div style={{ flex: 1, minHeight: 0 }}>
            {renderChart(activeChartTicker)}
          </div>
        </div>

        {/* ── Watchlist sidebar ── */}
        <div className="watchlist-box watchlist-sidebox">
          <div className="watchlist-list-header">
            <span>Watchlists</span>
            <small>Right-click watchlist or stock to manage</small>
          </div>

          <div className="watchlist-accordion">
            {watchlists.map((item) => {
              const expanded = expandedWatchlistId === item.id;
              const isWLDO = dragOver?.type === "watchlist" && dragOver.watchlistId === item.id;

              return (
                <section
                  className={`watchlist-accordion-item${isWLDO ? " wl-dragover" : ""}`}
                  key={item.id}
                  onContextMenu={(event) => openWlContextMenu(event, item.id)}
                  draggable
                  onDragStart={(event) => {
                    dragState.current = { type: "watchlist", watchlistId: item.id };
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => {
                    if (dragState.current?.type !== "watchlist") return;
                    event.preventDefault();
                    setDragOver({ type: "watchlist", watchlistId: item.id });
                  }}
                  onDrop={(event) => {
                    if (dragState.current?.type !== "watchlist") return;
                    event.preventDefault();
                    if (dragState.current.watchlistId !== item.id) {
                      onReorderWatchlists(dragState.current.watchlistId, item.id);
                    }
                    dragState.current = null;
                    setDragOver(null);
                  }}
                  onDragEnd={() => {
                    dragState.current = null;
                    setDragOver(null);
                  }}
                >
                  <div className={`watchlist-accordion-trigger${expanded ? " expanded" : ""}`}>
                    <button
                      className="watchlist-accordion-toggle"
                      onClick={() => onToggleWatchlist(item.id)}
                    >
                      <span className="watchlist-drag-handle">⠿</span>
                      <span className={`watchlist-caret${expanded ? " expanded" : ""}`}>▶</span>
                      <span>{item.name}</span>
                      <span className="watchlist-count">{item.tickers.length}</span>
                    </button>
                  </div>

                  {expanded && (
                    <div
                      className="watchlist-tickers"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openWlContextMenu(event, item.id);
                      }}
                    >
                      {item.tickers.map((tickerItem) => {
                        const isActive = activeChartTicker === tickerItem;
                        const isSDO =
                          dragOver?.type === "stock" &&
                          dragOver.watchlistId === item.id &&
                          dragOver.ticker === tickerItem;

                        return (
                          <div
                            className={`watchlist-ticker-row${isActive ? " active" : ""}${isSDO ? " wl-stock-dragover" : ""}`}
                            key={`w-ticker-${item.id}-${tickerItem}`}
                            draggable
                            onContextMenu={(event) =>
                              openStockContextMenu(event, item.id, tickerItem)
                            }
                            onDragStart={(event) => {
                              event.stopPropagation();
                              dragState.current = { type: "stock", watchlistId: item.id, ticker: tickerItem };
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(event) => {
                              if (dragState.current?.type !== "stock") return;
                              event.preventDefault();
                              event.stopPropagation();
                              setDragOver({ type: "stock", watchlistId: item.id, ticker: tickerItem });
                            }}
                            onDrop={(event) => {
                              if (dragState.current?.type !== "stock") return;
                              event.preventDefault();
                              event.stopPropagation();
                              const fromTicker = dragState.current.ticker;
                              if (!fromTicker) return;
                              if (dragState.current.watchlistId === item.id && fromTicker !== tickerItem) {
                                onReorderStocks(item.id, fromTicker, tickerItem);
                              }
                              if (dragState.current.watchlistId !== item.id) {
                                onMoveStock(dragState.current.watchlistId, item.id, fromTicker, tickerItem);
                              }
                              dragState.current = null;
                              setDragOver(null);
                            }}
                            onDragEnd={() => {
                              dragState.current = null;
                              setDragOver(null);
                            }}
                          >
                            <button
                              className="watchlist-stock-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectTicker(tickerItem);
                              }}
                            >
                              <span className="watchlist-drag-handle">⠿</span>
                              <div className="watchlist-stock-info">
                                <div className="watchlist-stock-label">{tickerItem}</div>
                              </div>
                            </button>
                            <button
                              className="watchlist-stock-delete"
                              aria-label={`Remove ${tickerItem}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onRemoveTicker(item.id, tickerItem);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {watchlists.length === 0 && (
              <div className="watchlist-empty">No watchlists</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <div
          className="watchlist-context-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {ctxMenu.stockTicker ? (
            /* Stock context */
            <>
              <button
                onClick={() => {
                  onSelectTicker(ctxMenu.stockTicker!);
                  setCtxMenu(null);
                }}
              >
                ◉ View Chart
              </button>
              <div className="watchlist-ctx-sep" />
              <button
                className="danger"
                onClick={() => {
                  onRemoveTicker(ctxMenu.watchlistId, ctxMenu.stockTicker!);
                  setCtxMenu(null);
                }}
              >
                ✕ Remove from Watchlist
              </button>
            </>
          ) : (
            /* Watchlist context */
            <>
              <button
                onClick={() => {
                  setAddSymbolModal({ watchlistId: ctxMenu.watchlistId });
                  setCtxMenu(null);
                }}
              >
                ＋ Add Ticker
              </button>
              <button
                onClick={() => {
                  onExportWatchlistCsv(ctxMenu.watchlistId);
                  setCtxMenu(null);
                }}
              >
                ↓ Export
              </button>
              <div className="watchlist-ctx-sep" />
              <button
                className="danger"
                onClick={() => {
                  onDeleteWatchlist(ctxMenu.watchlistId);
                  setCtxMenu(null);
                }}
              >
                ✕ Delete Watchlist
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Add Symbol modal ── */}
      {addSymbolModal && (
        <div className="dialog-backdrop" onClick={() => setAddSymbolModal(null)}>
          <section
            className="dialog-panel wl-add-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wl-add-header">
              <span className="wl-add-title">
                Add Ticker
                {watchlists.find((w) => w.id === addSymbolModal.watchlistId)?.name
                  ? ` — ${watchlists.find((w) => w.id === addSymbolModal.watchlistId)!.name}`
                  : ""}
              </span>
              <button
                className="wl-add-close"
                aria-label="Close"
                onClick={() => setAddSymbolModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="wl-add-body">
              <div className="wl-search-wrap">
                <span className="wl-search-icon">🔍</span>
                <input
                  ref={searchInputRef}
                  className="wl-search-input"
                  value={newSymbol}
                  onChange={(event) => setNewSymbol(event.target.value)}
                  placeholder="Enter ticker (e.g. NVDA)"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && newSymbol.trim()) {
                      onAddSymbol(addSymbolModal.watchlistId, newSymbol.trim().toUpperCase());
                      setAddSymbolModal(null);
                    }
                  }}
                />
                {newSymbol && (
                  <button className="wl-search-clear" onClick={() => setNewSymbol("")}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="wl-add-footer">
              <button className="btn-secondary" onClick={() => setAddSymbolModal(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!newSymbol.trim()}
                onClick={() => {
                  if (!newSymbol.trim()) return;
                  onAddSymbol(addSymbolModal.watchlistId, newSymbol.trim().toUpperCase());
                  setAddSymbolModal(null);
                }}
              >
                Add
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
