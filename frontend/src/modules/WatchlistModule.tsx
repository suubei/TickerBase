import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Watchlist } from "../types";

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
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; watchlistId: number } | null>(null);
  const [addSymbolModal, setAddSymbolModal] = useState<{ watchlistId: number } | null>(null);
  const [newSymbol, setNewSymbol] = useState("");
  const dragState = useRef<{ type: "watchlist" | "stock"; watchlistId: number; ticker?: string } | null>(null);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function openContextMenu(event: MouseEvent, watchlistId: number) {
    event.preventDefault();
    event.stopPropagation();
    setCtxMenu({ x: event.clientX, y: event.clientY, watchlistId });
  }

  return (
    <section className="panel">
      <div className="watchlist-layout">
        <div className="watchlist-box watchlist-chart-box">
          {renderChart(activeChartTicker)}
        </div>
        <div className="watchlist-box watchlist-sidebox">
          <div className="watchlist-list-header">
            <span>Watchlists</span>
            <small>Right-click a watchlist to manage</small>
          </div>
          <div className="watchlist-accordion">
            {watchlists.map((item) => {
              const expanded = expandedWatchlistId === item.id;
              return (
                <section
                  className="watchlist-accordion-item"
                  key={item.id}
                  onContextMenu={(event) => openContextMenu(event, item.id)}
                  draggable
                  onDragStart={(event) => {
                    dragState.current = { type: "watchlist", watchlistId: item.id };
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => {
                    if (dragState.current?.type !== "watchlist") return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (dragState.current?.type !== "watchlist") return;
                    event.preventDefault();
                    if (dragState.current.watchlistId !== item.id) {
                      onReorderWatchlists(dragState.current.watchlistId, item.id);
                    }
                    dragState.current = null;
                  }}
                  onDragEnd={() => {
                    dragState.current = null;
                  }}
                >
                  <div className={`watchlist-accordion-trigger ${expanded ? "expanded" : ""}`}>
                    <button className="watchlist-accordion-toggle" onClick={() => onToggleWatchlist(item.id)}>
                      <span className="watchlist-drag-handle">⠿</span>
                      <span className={`watchlist-caret ${expanded ? "expanded" : ""}`}>▶</span>
                      <span>{item.name}</span>
                      <span className="watchlist-count">{item.tickers.length}</span>
                    </button>
                  </div>
                  {expanded ? (
                    <div className="watchlist-tickers">
                      {item.tickers.map((tickerItem) => (
                        <div
                          className={`watchlist-ticker-row ${activeChartTicker === tickerItem ? "active" : ""}`}
                          key={`w-ticker-${item.id}-${tickerItem}`}
                          draggable
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onDragStart={(event) => {
                            dragState.current = { type: "stock", watchlistId: item.id, ticker: tickerItem };
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(event) => {
                            if (dragState.current?.type !== "stock") return;
                            event.preventDefault();
                          }}
                          onDrop={(event) => {
                            if (dragState.current?.type !== "stock") return;
                            event.preventDefault();
                            const fromTicker = dragState.current.ticker;
                            if (!fromTicker) return;
                            if (dragState.current.watchlistId === item.id && fromTicker !== tickerItem) {
                              onReorderStocks(item.id, fromTicker, tickerItem);
                            }
                            if (dragState.current.watchlistId !== item.id) {
                              onMoveStock(dragState.current.watchlistId, item.id, fromTicker, tickerItem);
                            }
                            dragState.current = null;
                          }}
                          onDragEnd={() => {
                            dragState.current = null;
                          }}
                        >
                          <button
                            className={`watchlist-stock-btn ${activeChartTicker === tickerItem ? "active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectTicker(tickerItem);
                            }}
                          >
                            <span className="watchlist-drag-handle">⠿</span>
                            {tickerItem}
                          </button>
                          <button
                            className="icon-delete"
                            aria-label={`Remove ${tickerItem}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveTicker(item.id, tickerItem);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
      {ctxMenu ? (
        <div className="watchlist-context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button
            onClick={() => {
              setAddSymbolModal({ watchlistId: ctxMenu.watchlistId });
              setNewSymbol("");
              setCtxMenu(null);
            }}
          >
            Add Symbol
          </button>
          <button
            onClick={() => {
              onExportWatchlistCsv(ctxMenu.watchlistId);
              setCtxMenu(null);
            }}
          >
            Export
          </button>
          <button
            className="danger"
            onClick={() => {
              onDeleteWatchlist(ctxMenu.watchlistId);
              setCtxMenu(null);
            }}
          >
            Delete Watchlist
          </button>
        </div>
      ) : null}

      {addSymbolModal ? (
        <div className="dialog-backdrop" onClick={() => setAddSymbolModal(null)}>
          <section className="dialog-panel add-symbol-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <h2>Add Symbol</h2>
              <button className="btn-close import-close" aria-label="Close dialog" onClick={() => setAddSymbolModal(null)}>✕</button>
            </div>
            <div className="add-symbol-body">
              <label>
                Symbol
                <input
                  value={newSymbol}
                  onChange={(event) => setNewSymbol(event.target.value)}
                  placeholder="NVDA"
                />
              </label>
            </div>
            <div className="import-footer">
              <button className="btn-secondary" onClick={() => setAddSymbolModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!newSymbol.trim()) return;
                  onAddSymbol(addSymbolModal.watchlistId, newSymbol.trim());
                  setAddSymbolModal(null);
                  setNewSymbol("");
                }}
              >
                Add
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
