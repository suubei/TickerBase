import { useCallback, useState } from "react";
import { createWatchlist, getStockTickers } from "../../api";

type WatchlistModalMode = "selected" | "filtered";
type ArchivedFilter = "all" | "active" | "archived";
type SortOrder = "asc" | "desc";

type UseWatchlistCreateModuleOptions = {
  selectedTickers: string[];
  filters: {
    search: string;
    categoryFilter: string;
    themeFilter: string;
    watchlistFilter: string;
    archivedFilter: ArchivedFilter;
    sortKey: string;
    sortOrder: SortOrder;
  };
  onMessage: (message: string) => void;
  onAfterCreated: (watchlistId: number) => Promise<void>;
  onClearSelectedTickers: () => void;
};

export function useWatchlistCreateModule({
  selectedTickers,
  filters,
  onMessage,
  onAfterCreated,
  onClearSelectedTickers
}: UseWatchlistCreateModuleOptions) {
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [watchlistModalMode, setWatchlistModalMode] = useState<WatchlistModalMode>("filtered");
  const [watchlistModalError, setWatchlistModalError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => {
      setToast("");
    }, 2400);
  }, []);

  const openWatchlistModal = useCallback((mode: WatchlistModalMode) => {
    setWatchlistModalMode(mode);
    setNewWatchlistName("");
    setWatchlistModalError("");
    setIsWatchlistModalOpen(true);
  }, []);

  const closeWatchlistModal = useCallback(() => {
    setIsWatchlistModalOpen(false);
    setWatchlistModalError("");
  }, []);

  const createWatchlistFromModal = useCallback(async () => {
    const name = newWatchlistName.trim();
    if (!name) {
      setWatchlistModalError("请输入 Watchlist 名称");
      return;
    }

    const tickers =
      watchlistModalMode === "selected"
        ? selectedTickers
        : (await getStockTickers({
          search: filters.search || undefined,
          category: filters.categoryFilter || undefined,
          theme: filters.themeFilter || undefined,
          watchlist: filters.watchlistFilter || undefined,
          archived: filters.archivedFilter,
          sortKey: filters.sortKey,
          sortOrder: filters.sortOrder
        })).tickers;

    if (tickers.length === 0) {
      setWatchlistModalError("当前没有可加入 Watchlist 的股票");
      return;
    }

    try {
      const created = await createWatchlist(name, tickers);
      await onAfterCreated(created.id);
      if (watchlistModalMode === "selected") {
        onClearSelectedTickers();
      }
      setIsWatchlistModalOpen(false);
      setNewWatchlistName("");
      setWatchlistModalError("");
      onMessage(`Watchlist created (${tickers.length} stocks)`);
      showToast(`Watchlist "${name}" created`);
    } catch (err) {
      setWatchlistModalError(err instanceof Error ? err.message : "Failed to create watchlist");
    }
  }, [filters.archivedFilter, filters.categoryFilter, filters.search, filters.sortKey, filters.sortOrder, filters.themeFilter, filters.watchlistFilter, newWatchlistName, onAfterCreated, onClearSelectedTickers, onMessage, selectedTickers, showToast, watchlistModalMode]);

  return {
    toast,
    newWatchlistName,
    setNewWatchlistName,
    isWatchlistModalOpen,
    watchlistModalMode,
    watchlistModalError,
    setWatchlistModalError,
    openWatchlistModal,
    closeWatchlistModal,
    createWatchlistFromModal
  };
}
