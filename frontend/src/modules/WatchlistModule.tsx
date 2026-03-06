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
  onExportActiveWatchlist: () => void;
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
  onExportActiveWatchlist,
  onExportWatchlistCsv,
  onAddSymbol,
  onReorderWatchlists,
  onReorderStocks,
  onMoveStock,
  renderChart
}: WatchlistModuleProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; watchlistId: number } | null>(null);
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
      <div className="panel-head">
        <h2>模块4: watchlist module</h2>
      </div>
      <div className="watchlist-layout">
        <div className="watchlist-box watchlist-chart-box">
          <h3>{activeChartTicker ? `Chart: ${activeChartTicker}` : "Chart"}</h3>
          {renderChart(activeChartTicker)}
        </div>
        <div className="watchlist-box">
          <h3>Watchlist 列表</h3>
          <div className="watchlist-accordion">
            {watchlists.map((item) => {
              const expanded = expandedWatchlistId === item.id;
              return (
                <section
                  className="watchlist-accordion-item"
                  key={item.id}
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
                  <div className={`watchlist-accordion-trigger ${expanded ? "expanded" : ""}`} onContextMenu={(event) => openContextMenu(event, item.id)}>
                    <button className="watchlist-accordion-toggle" onClick={() => onToggleWatchlist(item.id)}>
                      <span>{item.name}</span>
                      <span>{expanded ? "−" : "+"}</span>
                    </button>
                    <button
                      className="icon-delete"
                      aria-label={`Delete watchlist ${item.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteWatchlist(item.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {expanded ? (
                    <div className="watchlist-tickers">
                      {item.tickers.map((tickerItem) => (
                        <div
                          className="watchlist-ticker-row"
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
                            className={`btn-ghost ${activeChartTicker === tickerItem ? "active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectTicker(tickerItem);
                            }}
                          >
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
          <div className="actions">
            <button className="btn-secondary" onClick={onExportActiveWatchlist}>导出 TradingView 文本</button>
          </div>
        </div>
      </div>
      {ctxMenu ? (
        <div className="watchlist-context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button
            onClick={() => {
              const input = window.prompt("Add Symbol (Ticker)");
              if (input?.trim()) {
                onAddSymbol(ctxMenu.watchlistId, input.trim());
              }
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
            Export CSV
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
    </section>
  );
}
