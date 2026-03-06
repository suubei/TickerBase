import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteWatchlist, getWatchlists, removeTickerFromWatchlist } from "../../api";
import type { Watchlist } from "../../types";

export function useWatchlistModule(onMessage: (message: string) => void) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [expandedWatchlistId, setExpandedWatchlistId] = useState<number | null>(null);
  const [activeChartTicker, setActiveChartTicker] = useState<string>("");

  const watchlistNames = useMemo(() => watchlists.map((item) => item.name), [watchlists]);
  const activeWatchlist = useMemo(
    () => watchlists.find((item) => item.id === expandedWatchlistId) ?? watchlists[0] ?? null,
    [watchlists, expandedWatchlistId]
  );

  const loadWatchlists = useCallback(async () => {
    try {
      setWatchlists(await getWatchlists());
    } catch {
      setWatchlists([]);
    }
  }, []);

  useEffect(() => {
    if (watchlists.length === 0) {
      setActiveChartTicker("");
      return;
    }
    const allTickers = watchlists.flatMap((item) => item.tickers);
    if (!allTickers.includes(activeChartTicker)) {
      setActiveChartTicker(allTickers[0] ?? "");
    }
  }, [watchlists, activeChartTicker]);

  const removeFromWatchlist = useCallback(async (watchlistId: number, tickerToRemove: string) => {
    try {
      await removeTickerFromWatchlist(watchlistId, tickerToRemove);
      await loadWatchlists();
      if (activeChartTicker === tickerToRemove) {
        setActiveChartTicker("");
      }
      onMessage(`Removed ${tickerToRemove} from watchlist`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to remove ticker");
    }
  }, [activeChartTicker, loadWatchlists, onMessage]);

  const removeWatchlist = useCallback(async (watchlistId: number) => {
    try {
      await deleteWatchlist(watchlistId);
      const nextWatchlists = await getWatchlists();
      setWatchlists(nextWatchlists);
      setExpandedWatchlistId((prev) => (prev === watchlistId ? null : prev));

      const remainingTickers = nextWatchlists.flatMap((item) => item.tickers);
      if (!remainingTickers.includes(activeChartTicker)) {
        setActiveChartTicker(remainingTickers[0] ?? "");
      }
      onMessage("Watchlist deleted");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to delete watchlist");
    }
  }, [activeChartTicker, onMessage]);

  const exportActiveWatchlist = useCallback(() => {
    if (!activeWatchlist) return;
    const content = activeWatchlist.tickers.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeWatchlist.name}_${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [activeWatchlist]);

  return {
    watchlists,
    watchlistNames,
    expandedWatchlistId,
    setExpandedWatchlistId,
    activeChartTicker,
    setActiveChartTicker,
    loadWatchlists,
    removeFromWatchlist,
    removeWatchlist,
    exportActiveWatchlist
  };
}
