import { useCallback, useEffect, useMemo, useState } from "react";
import { getStocks, toggleArchive } from "../../api";
import type { Stock } from "../../types";

export type ArchivedFilter = "all" | "active" | "archived";
export type SortOrder = "asc" | "desc";

function parseRawJson(rawJson: string | null): Record<string, unknown> {
  if (!rawJson) return {};
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

type UseStockTableModuleOptions = {
  pageSize: number;
  onMessage: (message: string) => void;
};

export function useStockTableModule({ pageSize, onMessage }: UseStockTableModuleOptions) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [watchlistFilter, setWatchlistFilter] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("all");

  const [sortKey, setSortKey] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStocks({
        page: currentPage,
        pageSize,
        search: search || undefined,
        category: categoryFilter || undefined,
        theme: themeFilter || undefined,
        watchlist: watchlistFilter || undefined,
        archived: archivedFilter,
        sortKey,
        sortOrder
      });
      setStocks(data.items);
      setTotalStocks(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stocks");
      setStocks([]);
      setTotalStocks(0);
    } finally {
      setLoading(false);
    }
  }, [archivedFilter, categoryFilter, currentPage, pageSize, search, sortKey, sortOrder, themeFilter, watchlistFilter]);

  useEffect(() => {
    void loadStocks();
  }, [loadStocks]);

  const stockRows = useMemo(
    () =>
      stocks.map((stock) => ({
        stock,
        raw: parseRawJson(stock.rawJson)
      })),
    [stocks]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalStocks / pageSize)),
    [pageSize, totalStocks]
  );

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages] as Array<number | "...">;
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as Array<number | "...">;
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages] as Array<number | "...">;
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, themeFilter, watchlistFilter, archivedFilter, sortKey, sortOrder]);

  const displayedTickers = useMemo(
    () => stockRows.map((row) => row.stock.ticker),
    [stockRows]
  );

  const allDisplayedSelected = useMemo(
    () => displayedTickers.length > 0 && displayedTickers.every((tickerItem) => selectedTickers.includes(tickerItem)),
    [displayedTickers, selectedTickers]
  );

  const hasActiveFilters = Boolean(search || categoryFilter || themeFilter || watchlistFilter || archivedFilter !== "all");

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("");
    setThemeFilter("");
    setWatchlistFilter("");
    setArchivedFilter("all");
  }, []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedTickers([]);
  }, []);

  const toggleSelectAllDisplayed = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedTickers((prev) => [...new Set([...prev, ...displayedTickers])]);
      return;
    }
    setSelectedTickers((prev) => prev.filter((item) => !displayedTickers.includes(item)));
  }, [displayedTickers]);

  const setRowSelected = useCallback((ticker: string, checked: boolean) => {
    setSelectedTickers((prev) =>
      checked ? [...new Set([...prev, ticker])] : prev.filter((item) => item !== ticker)
    );
  }, []);

  const toggleRowSelected = useCallback((ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker)
        ? prev.filter((item) => item !== ticker)
        : [...prev, ticker]
    );
  }, []);

  const sortBy = useCallback((columnKey: string) => {
    if (sortKey === columnKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(columnKey);
    setSortOrder("asc");
  }, [sortKey]);

  const exportSelectedTickers = useCallback(() => {
    if (selectedTickers.length === 0) {
      onMessage("请先勾选至少一个股票");
      return;
    }
    const content = selectedTickers.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `watchlist_${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [onMessage, selectedTickers]);

  const archiveSelectedStocks = useCallback(async () => {
    if (selectedTickers.length === 0) {
      onMessage("请先勾选至少一个股票");
      return;
    }
    try {
      await Promise.all(selectedTickers.map((tickerItem) => toggleArchive(tickerItem, true)));
      const count = selectedTickers.length;
      setSelectedTickers([]);
      await loadStocks();
      onMessage(`Archived ${count} stocks`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to archive selected stocks");
    }
  }, [loadStocks, onMessage, selectedTickers]);

  const unarchiveSelectedStocks = useCallback(async () => {
    if (selectedTickers.length === 0) {
      onMessage("请先勾选至少一个股票");
      return;
    }
    try {
      await Promise.all(selectedTickers.map((tickerItem) => toggleArchive(tickerItem, false)));
      const count = selectedTickers.length;
      setSelectedTickers([]);
      await loadStocks();
      onMessage(`Unarchived ${count} stocks`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to unarchive selected stocks");
    }
  }, [loadStocks, onMessage, selectedTickers]);

  return {
    stocks,
    totalStocks,
    loading,
    error,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    themeFilter,
    setThemeFilter,
    watchlistFilter,
    setWatchlistFilter,
    archivedFilter,
    setArchivedFilter,
    sortKey,
    sortOrder,
    isSelectMode,
    setIsSelectMode,
    selectedTickers,
    setSelectedTickers,
    currentPage,
    setCurrentPage,
    stockRows,
    totalPages,
    paginationItems,
    displayedTickers,
    allDisplayedSelected,
    hasActiveFilters,
    loadStocks,
    clearFilters,
    toggleSelectMode,
    toggleSelectAllDisplayed,
    setRowSelected,
    toggleRowSelected,
    sortBy,
    exportSelectedTickers,
    archiveSelectedStocks,
    unarchiveSelectedStocks
  };
}
