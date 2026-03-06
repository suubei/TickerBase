import { useCallback, useEffect, useMemo, useState } from "react";
import { addTickerToWatchlist, deleteWatchlist, getWatchlists, removeTickerFromWatchlist } from "../../api";
import type { Watchlist } from "../../types";

export function useWatchlistModule(onMessage: (message: string) => void) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [expandedWatchlistId, setExpandedWatchlistId] = useState<number | null>(null);
  const [activeChartTicker, setActiveChartTicker] = useState<string>("");
  const [watchlistOrder, setWatchlistOrder] = useState<number[]>([]);
  const [stockOrderMap, setStockOrderMap] = useState<Record<number, string[]>>({});

  const orderedWatchlists = useMemo(() => {
    if (watchlistOrder.length === 0) return watchlists;
    const byId = new Map(watchlists.map((item) => [item.id, item]));
    const ordered = watchlistOrder
      .map((id) => byId.get(id))
      .filter((item): item is Watchlist => Boolean(item));
    const leftovers = watchlists.filter((item) => !watchlistOrder.includes(item.id));
    return [...ordered, ...leftovers];
  }, [watchlistOrder, watchlists]);

  const watchlistsWithStockOrder = useMemo(() => {
    return orderedWatchlists.map((item) => {
      const order = stockOrderMap[item.id];
      if (!order || order.length === 0) return item;
      const orderedTickers = order.filter((ticker) => item.tickers.includes(ticker));
      const leftovers = item.tickers.filter((ticker) => !order.includes(ticker));
      return { ...item, tickers: [...orderedTickers, ...leftovers] };
    });
  }, [orderedWatchlists, stockOrderMap]);

  const watchlistNames = useMemo(() => watchlistsWithStockOrder.map((item) => item.name), [watchlistsWithStockOrder]);
  const activeWatchlist = useMemo(
    () => watchlistsWithStockOrder.find((item) => item.id === expandedWatchlistId) ?? watchlistsWithStockOrder[0] ?? null,
    [watchlistsWithStockOrder, expandedWatchlistId]
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
    if (watchlistsWithStockOrder.length === 0) {
      setActiveChartTicker("");
      return;
    }
    const allTickers = watchlistsWithStockOrder.flatMap((item) => item.tickers);
    if (!allTickers.includes(activeChartTicker)) {
      setActiveChartTicker(allTickers[0] ?? "");
    }
  }, [watchlistsWithStockOrder, activeChartTicker]);

  useEffect(() => {
    const rawWatchlistOrder = window.localStorage.getItem("watchlist.order");
    const rawStockOrder = window.localStorage.getItem("watchlist.stockOrder");
    if (rawWatchlistOrder) {
      try {
        setWatchlistOrder(JSON.parse(rawWatchlistOrder) as number[]);
      } catch {
        setWatchlistOrder([]);
      }
    }
    if (rawStockOrder) {
      try {
        const parsed = JSON.parse(rawStockOrder) as Record<string, string[]>;
        const converted: Record<number, string[]> = {};
        for (const [key, value] of Object.entries(parsed)) {
          const numericKey = Number(key);
          if (Number.isInteger(numericKey)) converted[numericKey] = value;
        }
        setStockOrderMap(converted);
      } catch {
        setStockOrderMap({});
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("watchlist.order", JSON.stringify(watchlistOrder));
  }, [watchlistOrder]);

  useEffect(() => {
    window.localStorage.setItem("watchlist.stockOrder", JSON.stringify(stockOrderMap));
  }, [stockOrderMap]);

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

  const exportWatchlistCsv = useCallback((watchlistId: number) => {
    const target = watchlistsWithStockOrder.find((item) => item.id === watchlistId);
    if (!target) return;
    const rows = ["Ticker", ...target.tickers].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${target.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [watchlistsWithStockOrder]);

  const addSymbol = useCallback(async (watchlistId: number, ticker: string) => {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized) return;
    try {
      await addTickerToWatchlist(watchlistId, normalized);
      await loadWatchlists();
      setExpandedWatchlistId(watchlistId);
      setActiveChartTicker(normalized);
      setStockOrderMap((prev) => {
        const next = { ...prev };
        next[watchlistId] = [...(next[watchlistId] ?? []), normalized];
        return next;
      });
      onMessage(`Added ${normalized}`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to add symbol");
    }
  }, [loadWatchlists, onMessage]);

  const reorderWatchlists = useCallback((fromId: number, toId: number) => {
    setWatchlistOrder((prev) => {
      const base = prev.length ? prev.filter((id) => watchlists.some((w) => w.id === id)) : watchlists.map((w) => w.id);
      const fromIndex = base.indexOf(fromId);
      const toIndex = base.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return base;
      const next = [...base];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [watchlists]);

  const reorderStockWithinWatchlist = useCallback((watchlistId: number, fromTicker: string, toTicker: string) => {
    const watchlist = watchlistsWithStockOrder.find((item) => item.id === watchlistId);
    if (!watchlist) return;
    const base = [...watchlist.tickers];
    const fromIndex = base.indexOf(fromTicker);
    const toIndex = base.indexOf(toTicker);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const [moved] = base.splice(fromIndex, 1);
    base.splice(toIndex, 0, moved);
    setStockOrderMap((prev) => ({ ...prev, [watchlistId]: base }));
  }, [watchlistsWithStockOrder]);

  const moveStockBetweenWatchlists = useCallback(async (fromWatchlistId: number, toWatchlistId: number, ticker: string, toTicker: string) => {
    if (fromWatchlistId === toWatchlistId) return;
    const normalizedTicker = ticker.trim().toUpperCase();
    const normalizedToTicker = toTicker.trim().toUpperCase();
    if (!normalizedTicker || !normalizedToTicker) return;

    try {
      await addTickerToWatchlist(toWatchlistId, normalizedTicker);
      await removeTickerFromWatchlist(fromWatchlistId, normalizedTicker);
      await loadWatchlists();

      setExpandedWatchlistId(toWatchlistId);
      setActiveChartTicker(normalizedTicker);
      setStockOrderMap((prev) => {
        const next: Record<number, string[]> = { ...prev };

        const sourceCurrent = next[fromWatchlistId]
          ?? watchlistsWithStockOrder.find((item) => item.id === fromWatchlistId)?.tickers
          ?? [];
        next[fromWatchlistId] = sourceCurrent.filter((item) => item !== normalizedTicker);

        const targetCurrent = next[toWatchlistId]
          ?? watchlistsWithStockOrder.find((item) => item.id === toWatchlistId)?.tickers
          ?? [];
        const targetWithoutMoved = targetCurrent.filter((item) => item !== normalizedTicker);
        const insertIndex = targetWithoutMoved.indexOf(normalizedToTicker);
        if (insertIndex >= 0) {
          targetWithoutMoved.splice(insertIndex, 0, normalizedTicker);
        } else {
          targetWithoutMoved.push(normalizedTicker);
        }
        next[toWatchlistId] = targetWithoutMoved;
        return next;
      });

      onMessage(`Moved ${normalizedTicker}`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to move ticker");
    }
  }, [loadWatchlists, onMessage, watchlistsWithStockOrder]);

  return {
    watchlists: watchlistsWithStockOrder,
    watchlistNames,
    expandedWatchlistId,
    setExpandedWatchlistId,
    activeChartTicker,
    setActiveChartTicker,
    loadWatchlists,
    removeFromWatchlist,
    removeWatchlist,
    exportActiveWatchlist,
    exportWatchlistCsv,
    addSymbol,
    reorderWatchlists,
    reorderStockWithinWatchlist,
    moveStockBetweenWatchlists
  };
}
