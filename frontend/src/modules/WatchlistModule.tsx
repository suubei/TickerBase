import type { ReactNode } from "react";
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
  renderChart
}: WatchlistModuleProps) {
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
                <section className="watchlist-accordion-item" key={item.id}>
                  <div className={`watchlist-accordion-trigger ${expanded ? "expanded" : ""}`}>
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
                        <div className="watchlist-ticker-row" key={`w-ticker-${item.id}-${tickerItem}`}>
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
    </section>
  );
}
