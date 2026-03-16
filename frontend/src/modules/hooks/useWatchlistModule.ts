import { useCallback, useEffect, useMemo, useState } from "react";
import { addTickerToWatchlist, deleteWatchlist, getWatchlists, removeTickerFromWatchlist, renameWatchlist as renameWatchlistApi, reorderWatchlists as reorderWatchlistsApi, reorderWatchlistStocks as reorderWatchlistStocksApi } from "../../api";
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
      const next = await getWatchlists();
      setWatchlists(next);
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
      if (activeChartTicker === tickerToRemove) setActiveChartTicker("");
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

  const exportWatchlist = useCallback((watchlistId: number) => {
    const target = watchlists.find((item) => item.id === watchlistId);
    if (!target) return;
    const rows = target.tickers.join("\n");
    const blob = new Blob([rows], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${target.name}_${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [watchlists]);

  const addTicker = useCallback(async (watchlistId: number, ticker: string) => {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized) return;
    try {
      await addTickerToWatchlist(watchlistId, normalized);
      await loadWatchlists();
      setExpandedWatchlistId(watchlistId);
      setActiveChartTicker(normalized);
      onMessage(`Added ${normalized}`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to add ticker");
    }
  }, [loadWatchlists, onMessage]);

  const renameWatchlist = useCallback(async (watchlistId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await renameWatchlistApi(watchlistId, trimmed);
      setWatchlists((prev) =>
        prev.map((w) => w.id === watchlistId ? { ...w, name: trimmed } : w)
      );
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to rename watchlist");
    }
  }, [onMessage]);

  const reorderWatchlists = useCallback(async (fromId: number, toId: number) => {
    const base = watchlists.map((w) => w.id);
    const fromIndex = base.indexOf(fromId);
    const toIndex = base.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const newOrder = [...base];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    // Optimistic update
    setWatchlists((prev) => {
      const byId = new Map(prev.map((w) => [w.id, w]));
      return newOrder.map((id) => byId.get(id)!).filter(Boolean);
    });
    try {
      await reorderWatchlistsApi(newOrder);
    } catch {
      onMessage("Failed to save watchlist order");
      await loadWatchlists();
    }
  }, [watchlists, loadWatchlists, onMessage]);

  const reorderStockWithinWatchlist = useCallback(async (watchlistId: number, fromTicker: string, toTicker: string) => {
    const watchlist = watchlists.find((item) => item.id === watchlistId);
    if (!watchlist) return;
    const base = [...watchlist.tickers];
    const fromIndex = base.indexOf(fromTicker);
    const toIndex = base.indexOf(toTicker);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const [moved] = base.splice(fromIndex, 1);
    base.splice(toIndex, 0, moved);
    // Optimistic update
    setWatchlists((prev) =>
      prev.map((w) => w.id === watchlistId ? { ...w, tickers: base } : w)
    );
    try {
      await reorderWatchlistStocksApi(watchlistId, base);
    } catch {
      onMessage("Failed to save stock order");
      await loadWatchlists();
    }
  }, [watchlists, loadWatchlists, onMessage]);

  const moveStockBetweenWatchlists = useCallback(async (fromWatchlistId: number, toWatchlistId: number, ticker: string, toTicker: string) => {
    if (fromWatchlistId === toWatchlistId) return;
    const normalizedTicker = ticker.trim().toUpperCase();
    const normalizedToTicker = toTicker.trim().toUpperCase();
    if (!normalizedTicker || !normalizedToTicker) return;

    try {
      await addTickerToWatchlist(toWatchlistId, normalizedTicker);
      await removeTickerFromWatchlist(fromWatchlistId, normalizedTicker);
      const updated = await getWatchlists();
      setWatchlists(updated);

      // Persist new ticker order in target watchlist
      const targetList = updated.find((w) => w.id === toWatchlistId);
      if (targetList) {
        const withoutMoved = targetList.tickers.filter((t) => t !== normalizedTicker);
        const insertIndex = withoutMoved.indexOf(normalizedToTicker);
        const newOrder = [...withoutMoved];
        if (insertIndex >= 0) {
          newOrder.splice(insertIndex, 0, normalizedTicker);
        } else {
          newOrder.push(normalizedTicker);
        }
        await reorderWatchlistStocksApi(toWatchlistId, newOrder);
        setWatchlists((prev) =>
          prev.map((w) => w.id === toWatchlistId ? { ...w, tickers: newOrder } : w)
        );
      }

      setExpandedWatchlistId(toWatchlistId);
      setActiveChartTicker(normalizedTicker);
      onMessage(`Moved ${normalizedTicker}`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to move ticker");
    }
  }, [loadWatchlists, onMessage, watchlists]);

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
    renameWatchlist,
    addTicker,
    exportWatchlist,
    reorderWatchlists,
    reorderStockWithinWatchlist,
    moveStockBetweenWatchlists
  };
}
