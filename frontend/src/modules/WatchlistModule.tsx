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
  onRenameWatchlist: (id: number, name: string) => void;
  onSelectTicker: (ticker: string) => void;
  onRemoveTicker: (watchlistId: number, ticker: string) => void;
  onExportWatchlist: (watchlistId: number) => void;
  onAddTicker: (watchlistId: number, ticker: string) => void;
  onReorderWatchlists: (fromId: number, toId: number) => void;
  onReorderStocks: (watchlistId: number, fromTicker: string, toTicker: string) => void;
  onMoveStock: (fromWatchlistId: number, toWatchlistId: number, ticker: string, toTicker: string) => void;
  renderChart: (ticker: string) => ReactNode;
};

export function WatchlistModule({
  watchlists,
  expandedWatchlistId,
  activeChartTicker,
  onToggleWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
  onSelectTicker,
  onRemoveTicker,
  onExportWatchlist,
  onAddTicker,
  onReorderWatchlists,
  onReorderStocks,
  onMoveStock,
  renderChart
}: WatchlistModuleProps) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [addTickerModal, setAddTickerModal] = useState<{ watchlistId: number } | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [renameModal, setRenameModal] = useState<{ watchlistId: number; currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOver, setDragOver] = useState<DragOver>(null);
  const dragState = useRef<{ type: "watchlist" | "stock"; watchlistId: number; ticker?: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Keyboard navigation: Space / ArrowDown = next ticker, ArrowUp = previous ticker
  useEffect(() => {
    if (addTickerModal) return;

    // Collect all tickers across all expanded watchlists in order
    const allTickers: string[] = [];
    for (const wl of watchlists) {
      if (expandedWatchlistId === wl.id) {
        for (const t of wl.tickers) allTickers.push(t);
      }
    }
    if (allTickers.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key !== " " && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();

      const activeTicker = activeChartTicker.includes(":")
        ? activeChartTicker.split(":")[1]
        : activeChartTicker;
      const currentIndex = allTickers.indexOf(activeTicker);

      let nextIndex: number;
      if (e.key === "ArrowUp") {
        nextIndex = currentIndex <= 0 ? allTickers.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex >= allTickers.length - 1 ? 0 : currentIndex + 1;
      }
      onSelectTicker(allTickers[nextIndex]);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [watchlists, expandedWatchlistId, activeChartTicker, addTickerModal, onSelectTicker]);

  useEffect(() => {
    if (addTickerModal) {
      setNewTicker("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [addTickerModal]);

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
                            onContextMenu={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
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
                  setAddTickerModal({ watchlistId: ctxMenu.watchlistId });
                  setCtxMenu(null);
                }}
              >
                ＋ Add Ticker
              </button>
              <button
                onClick={() => {
                  const wl = watchlists.find((w) => w.id === ctxMenu.watchlistId);
                  setRenameValue(wl?.name ?? "");
                  setRenameModal({ watchlistId: ctxMenu.watchlistId, currentName: wl?.name ?? "" });
                  setCtxMenu(null);
                }}
              >
                ✎ Rename
              </button>
              <button
                onClick={() => {
                  onExportWatchlist(ctxMenu.watchlistId);
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

      {/* ── Rename Watchlist modal ── */}
      {renameModal && (
        <div className="dialog-backdrop" onClick={() => setRenameModal(null)}>
          <section
            className="dialog-panel wl-add-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wl-add-header">
              <span className="wl-add-title">Rename Watchlist</span>
              <button className="wl-add-close" aria-label="Close" onClick={() => setRenameModal(null)}>✕</button>
            </div>
            <div className="wl-add-body">
              <div className="wl-search-wrap">
                <input
                  className="wl-search-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Watchlist name…"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameValue.trim()) {
                      onRenameWatchlist(renameModal.watchlistId, renameValue.trim());
                      setRenameModal(null);
                    }
                    if (e.key === "Escape") setRenameModal(null);
                  }}
                />
              </div>
            </div>
            <div className="wl-add-footer">
              <button className="btn-secondary" onClick={() => setRenameModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!renameValue.trim() || renameValue.trim() === renameModal.currentName}
                onClick={() => {
                  onRenameWatchlist(renameModal.watchlistId, renameValue.trim());
                  setRenameModal(null);
                }}
              >
                Rename
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Add Ticker modal ── */}
      {addTickerModal && (
        <div className="dialog-backdrop" onClick={() => setAddTickerModal(null)}>
          <section
            className="dialog-panel wl-add-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wl-add-header">
              <span className="wl-add-title">
                Add Ticker
                {watchlists.find((w) => w.id === addTickerModal.watchlistId)?.name
                  ? ` — ${watchlists.find((w) => w.id === addTickerModal.watchlistId)!.name}`
                  : ""}
              </span>
              <button
                className="wl-add-close"
                aria-label="Close"
                onClick={() => setAddTickerModal(null)}
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
                  value={newTicker}
                  onChange={(event) => setNewTicker(event.target.value)}
                  placeholder="Enter ticker (e.g. NVDA)"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && newTicker.trim()) {
                      onAddTicker(addTickerModal.watchlistId, newTicker.trim().toUpperCase());
                      setAddTickerModal(null);
                    }
                  }}
                />
                {newTicker && (
                  <button className="wl-search-clear" onClick={() => setNewTicker("")}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="wl-add-footer">
              <button className="btn-secondary" onClick={() => setAddTickerModal(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!newTicker.trim()}
                onClick={() => {
                  if (!newTicker.trim()) return;
                  onAddTicker(addTickerModal.watchlistId, newTicker.trim().toUpperCase());
                  setAddTickerModal(null);
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
