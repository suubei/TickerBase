import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { marked } from "marked";
import {
  createCategory,
  createTheme,
  createWatchlist,
  deleteWatchlist,
  deleteCategory,
  deleteTheme,
  getReportContent,
  getReports,
  getSettings,
  getStockTickers,
  getStocks,
  getWatchlists,
  importStock,
  removeTickerFromWatchlist,
  saveTableFields,
  toggleArchive,
  updateStockTags,
  updateCategory,
  updateTheme
} from "./api";
import type {
  CategoryItem,
  ReportMeta,
  SettingsPayload,
  Stock,
  TableFieldConfig,
  ThemeItem,
  Watchlist
} from "./types";

marked.setOptions({ gfm: true, breaks: true });

type SortOrder = "asc" | "desc";
type TagKind = "theme" | "category";
type ArchivedFilter = "all" | "active" | "archived";
const MODULE2_PAGE_SIZE = 20;

type CoreColumnKey = "ticker" | "category" | "summary" | "theme" | "themeBenefit" | "themePhase" | "catalyst" | "risk" | "updatedAt";

type ColumnConfig = {
  key: string;
  label: string;
  source: "core" | "json";
};

type JsonFieldDraft = {
  key: string;
  label: string;
  isVisible: boolean;
  position: number;
};

type TagDropdownState = {
  stock: Stock;
  kind: TagKind;
  left: number;
  top: number;
  selectedValues: string[];
};

function TradingViewAdvancedChart({ symbol }: { symbol: string }) {
  useEffect(() => {
    const host = document.getElementById("tv-advanced-chart-container");
    if (!host) return;
    host.innerHTML = "";
    const normalizedSymbol = symbol.includes(":") ? symbol : (symbol ? `NASDAQ:${symbol}` : "NASDAQ:AAPL");

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "9",
      symbol: normalizedSymbol,
      theme: "light",
      timezone: "exchange",
      backgroundColor: "#ffffff",
      gridColor: "rgba(46, 46, 46, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      support_host: "https://www.tradingview.com"
    });
    host.appendChild(script);
  }, [symbol]);

  return (
    <div className="tv-widget-wrap">
      <div id="tv-advanced-chart-container" className="tv-widget-host" />
    </div>
  );
}

const defaultCoreColumns: ColumnConfig[] = [
  { key: "ticker", label: "股票代码", source: "core" },
  { key: "category", label: "板块", source: "core" },
  { key: "summary", label: "定位", source: "core" },
  { key: "theme", label: "主题", source: "core" },
  { key: "themePhase", label: "主题阶段", source: "core" },
  { key: "themeBenefit", label: "主题受益", source: "core" },
  { key: "catalyst", label: "核心催化剂", source: "core" },
  { key: "risk", label: "最大风险", source: "core" },
  { key: "updatedAt", label: "更新日期", source: "core" }
];

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

function getCoreValue(stock: Stock, key: string): unknown {
  const normalized = key as CoreColumnKey;
  switch (normalized) {
    case "ticker":
      return stock.ticker;
    case "summary":
      return stock.summary;
    case "category":
      return stock.categories.join(", ");
    case "theme":
      return stock.themes.join(", ");
    case "themeBenefit":
      return stock.themeBenefit;
    case "themePhase":
      return stock.themePhase;
    case "catalyst":
      return stock.catalyst;
    case "risk":
      return stock.risk;
    case "updatedAt":
      return stock.updatedAt;
    default:
      return "";
  }
}

function formatCellValue(key: string, value: unknown): string {
  if (key === "updatedAt") {
    return value ? new Date(String(value)).toLocaleString() : "-";
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined || value === "") return "-";
  return JSON.stringify(value);
}

function toggleValue(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [settings, setSettings] = useState<SettingsPayload>({ themes: [], categories: [], tableFields: [], jsonKeys: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [ticker, setTicker] = useState("");
  const [jsonPayload, setJsonPayload] = useState("{\n\n}");
  const [markdownReport, setMarkdownReport] = useState("# Report\n");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [watchlistFilter, setWatchlistFilter] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("all");

  const [sortKey, setSortKey] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [coreColumns] = useState<ColumnConfig[]>(defaultCoreColumns);

  const [selected, setSelected] = useState<Stock | null>(null);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [activeReport, setActiveReport] = useState<{ id: number; content: string; version: number } | null>(null);

  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [watchlistModalMode, setWatchlistModalMode] = useState<"selected" | "filtered">("filtered");
  const [watchlistModalError, setWatchlistModalError] = useState("");
  const [toast, setToast] = useState("");
  const [message, setMessage] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);

  const [themeEdits, setThemeEdits] = useState<ThemeItem[]>([]);
  const [categoryEdits, setCategoryEdits] = useState<CategoryItem[]>([]);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeColor, setNewThemeColor] = useState("#9CA3AF");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [jsonFieldDrafts, setJsonFieldDrafts] = useState<JsonFieldDraft[]>([]);

  const [tagDropdown, setTagDropdown] = useState<TagDropdownState | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState<"stockModule" | "watchlistModule" | "settingModule">("stockModule");
  const [expandedWatchlistId, setExpandedWatchlistId] = useState<number | null>(null);
  const [activeChartTicker, setActiveChartTicker] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(
    () => settings.categories.map((item) => item.name),
    [settings.categories]
  );

  const themes = useMemo(
    () => settings.themes.map((item) => item.name),
    [settings.themes]
  );
  const watchlistNames = useMemo(
    () => watchlists.map((item) => item.name),
    [watchlists]
  );
  const activeWatchlist = useMemo(
    () => watchlists.find((item) => item.id === expandedWatchlistId) ?? watchlists[0] ?? null,
    [watchlists, expandedWatchlistId]
  );

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

  useEffect(() => {
    if (watchlistFilter && !watchlistNames.includes(watchlistFilter)) {
      setWatchlistFilter("");
    }
  }, [watchlistFilter, watchlistNames]);

  async function loadStocks() {
    setLoading(true);
    setError("");
    try {
      const data = await getStocks({
        page: currentPage,
        pageSize: MODULE2_PAGE_SIZE,
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
  }

  async function loadWatchlists() {
    try {
      setWatchlists(await getWatchlists());
    } catch {
      setWatchlists([]);
    }
  }

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
      setThemeEdits(data.themes);
      setCategoryEdits(data.categories);
      const known = new Map(data.tableFields.map((item) => [item.key, item]));
      const merged = data.jsonKeys.map((key, idx) => {
        const existing = known.get(key);
        return {
          key,
          label: existing?.label ?? key,
          isVisible: existing?.isVisible ?? false,
          position: existing?.position ?? idx
        };
      });
      setJsonFieldDrafts(merged.sort((a, b) => a.position - b.position));
    } catch {
      setSettings({ themes: [], categories: [], tableFields: [], jsonKeys: [] });
      setThemeEdits([]);
      setCategoryEdits([]);
      setJsonFieldDrafts([]);
    }
  }

  useEffect(() => {
    void loadWatchlists();
    void loadSettings();
  }, []);

  useEffect(() => {
    void loadStocks();
  }, [currentPage, search, categoryFilter, themeFilter, watchlistFilter, archivedFilter, sortKey, sortOrder]);

  useEffect(() => {
    if (!selected) {
      setReports([]);
      setActiveReport(null);
      return;
    }

    void (async () => {
      try {
        const r = await getReports(selected.ticker);
        setReports(r);
        if (r.length > 0) {
          const content = await getReportContent(r[0].id);
          setActiveReport({ id: r[0].id, content: content.content, version: content.version });
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to load detail");
      }
    })();
  }, [selected?.ticker]);

  const activeJsonColumns = useMemo<ColumnConfig[]>(
    () =>
      jsonFieldDrafts
        .filter((item) => item.isVisible)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ key: item.key, label: item.label, source: "json" })),
    [jsonFieldDrafts]
  );

  const visibleColumns = useMemo(
    () => [...coreColumns, ...activeJsonColumns],
    [coreColumns, activeJsonColumns]
  );

  const stockRows = useMemo(
    () =>
      stocks.map((stock) => ({
        stock,
        raw: parseRawJson(stock.rawJson)
      })),
    [stocks]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalStocks / MODULE2_PAGE_SIZE)),
    [totalStocks]
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

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => {
      setToast("");
    }, 2400);
  }

  function exportSelectedTickers() {
    if (selectedTickers.length === 0) {
      setMessage("请先勾选至少一个股票");
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
  }

  async function submitImport() {
    setMessage("");
    const submitTicker = ticker;
    try {
      const result = await importStock({
        ticker: submitTicker,
        originalTicker: editingTicker ?? undefined,
        jsonPayload,
        markdownReport
      });
      if ("skipped" in result) {
        setMessage(`Skipped ${result.ticker}`);
      } else {
        setMessage(`${result.updated ? "Updated" : "Imported"} ${result.ticker}, v${result.version}`);
      }
      setTicker("");
      setIsImportOpen(false);
      setEditingTicker(null);
      await loadStocks();
      await loadSettings();
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (editingTicker && status === 409) {
        setMessage(err instanceof Error ? err.message : "Ticker already exists");
        return;
      }
      if (status === 409) {
        const confirmed = window.confirm(`Ticker ${submitTicker.toUpperCase()} 已存在，是否更新？`);
        if (!confirmed) {
          await importStock({ ticker: submitTicker, jsonPayload, markdownReport, action: "skip" });
          setMessage(`Skipped ${submitTicker.toUpperCase()}`);
          return;
        }
        const updated = await importStock({ ticker: submitTicker, jsonPayload, markdownReport, action: "update" });
        if ("updated" in updated) {
          setMessage(`Updated ${updated.ticker}, v${updated.version}`);
        }
        await loadStocks();
        await loadSettings();
        return;
      }
      setMessage(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function openEditImport(stock: Stock) {
    setMessage("");
    setEditingTicker(stock.ticker);
    setTicker(stock.ticker);
    if (stock.rawJson?.trim()) {
      try {
        setJsonPayload(JSON.stringify(JSON.parse(stock.rawJson), null, 2));
      } catch {
        setJsonPayload(stock.rawJson);
      }
    } else {
      setJsonPayload("{\n\n}");
    }
    setMarkdownReport("# Report\n");
    setIsImportOpen(true);

    if (!stock.latestReport) return;
    try {
      const content = await getReportContent(stock.latestReport.id);
      setMarkdownReport(content.content);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load latest markdown report");
    }
  }

  function openNewImport() {
    setEditingTicker(null);
    setTicker("");
    setJsonPayload("{\n\n}");
    setMarkdownReport("# Report\n");
    setIsImportOpen(true);
  }

  function openWatchlistModal(mode: "selected" | "filtered") {
    setWatchlistModalMode(mode);
    setNewWatchlistName("");
    setWatchlistModalError("");
    setIsWatchlistModalOpen(true);
  }

  async function createWatchlistFromModal() {
    const name = newWatchlistName.trim();
    if (!name) {
      setWatchlistModalError("请输入 Watchlist 名称");
      return;
    }
    const tickers =
      watchlistModalMode === "selected"
        ? selectedTickers
        : (await getStockTickers({
          search: search || undefined,
          category: categoryFilter || undefined,
          theme: themeFilter || undefined,
          watchlist: watchlistFilter || undefined,
          archived: archivedFilter,
          sortKey,
          sortOrder
        })).tickers;
    if (tickers.length === 0) {
      setWatchlistModalError("当前没有可加入 Watchlist 的股票");
      return;
    }
    try {
      const created = await createWatchlist(name, tickers);
      await loadWatchlists();
      setExpandedWatchlistId(created.id);
      if (watchlistModalMode === "selected") {
        setSelectedTickers([]);
      }
      setIsWatchlistModalOpen(false);
      setNewWatchlistName("");
      setWatchlistModalError("");
      setMessage(`Watchlist created (${tickers.length} stocks)`);
      showToast(`Watchlist "${name}" created`);
    } catch (err) {
      setWatchlistModalError(err instanceof Error ? err.message : "Failed to create watchlist");
    }
  }

  async function archiveSelectedStocks() {
    if (selectedTickers.length === 0) {
      setMessage("请先勾选至少一个股票");
      return;
    }
    try {
      await Promise.all(selectedTickers.map((tickerItem) => toggleArchive(tickerItem, true)));
      const count = selectedTickers.length;
      setSelectedTickers([]);
      await loadStocks();
      setMessage(`Archived ${count} stocks`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to archive selected stocks");
    }
  }

  async function unarchiveSelectedStocks() {
    if (selectedTickers.length === 0) {
      setMessage("请先勾选至少一个股票");
      return;
    }
    try {
      await Promise.all(selectedTickers.map((tickerItem) => toggleArchive(tickerItem, false)));
      const count = selectedTickers.length;
      setSelectedTickers([]);
      await loadStocks();
      setMessage(`Unarchived ${count} stocks`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to unarchive selected stocks");
    }
  }

  async function selectReport(reportId: number) {
    const content = await getReportContent(reportId);
    setActiveReport({ id: reportId, content: content.content, version: content.version });
  }

  async function saveJsonFieldSettings() {
    try {
      const payload = jsonFieldDrafts.map((item, index) => ({
        key: item.key,
        label: item.label.trim() || item.key,
        isVisible: item.isVisible,
        position: index
      }));
      const saved = await saveTableFields(payload);
      setSettings((prev) => ({ ...prev, tableFields: saved }));
      setMessage("Table fields saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save table fields");
    }
  }

  function openTagDropdown(stock: Stock, kind: TagKind, event: MouseEvent<HTMLTableCellElement>) {
    event.stopPropagation();
    const selectedValues = kind === "theme" ? stock.themes : stock.categories;
    setNewTagName("");
    setTagSearch("");
    setTagDropdown({
      stock,
      kind,
      selectedValues,
      left: Math.min(event.clientX + 8, window.innerWidth - 320),
      top: Math.min(event.clientY + 8, window.innerHeight - 360)
    });
  }

  function exportActiveWatchlist() {
    if (!activeWatchlist) return;
    const content = activeWatchlist.tickers.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeWatchlist.name}_${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function persistTagDropdown(nextValues: string[]) {
    if (!tagDropdown) return;
    const payload =
      tagDropdown.kind === "theme"
        ? { themes: nextValues, categories: tagDropdown.stock.categories }
        : { themes: tagDropdown.stock.themes, categories: nextValues };

    await updateStockTags(tagDropdown.stock.ticker, payload);
    await loadStocks();
  }

  async function toggleTagFromDropdown(value: string) {
    if (!tagDropdown) return;
    const nextValues = toggleValue(tagDropdown.selectedValues, value);
    setTagDropdown((prev) => (prev ? { ...prev, selectedValues: nextValues } : null));
    try {
      await persistTagDropdown(nextValues);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update tags");
    }
  }

  async function createTagFromDropdown() {
    if (!tagDropdown || !newTagName.trim()) return;
    const name = newTagName.trim();
    try {
      if (tagDropdown.kind === "theme") {
        await createTheme(name, "#9CA3AF");
      } else {
        await createCategory(name);
      }
      await loadSettings();
      const nextValues = tagDropdown.selectedValues.includes(name)
        ? tagDropdown.selectedValues
        : [...tagDropdown.selectedValues, name];
      setTagDropdown((prev) => (prev ? { ...prev, selectedValues: nextValues } : null));
      await persistTagDropdown(nextValues);
      setNewTagName("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create tag");
    }
  }

  async function removeFromWatchlist(watchlistId: number, tickerToRemove: string) {
    try {
      await removeTickerFromWatchlist(watchlistId, tickerToRemove);
      await loadWatchlists();
      if (activeChartTicker === tickerToRemove) {
        setActiveChartTicker("");
      }
      setMessage(`Removed ${tickerToRemove} from watchlist`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to remove ticker");
    }
  }

  async function removeWatchlist(watchlistId: number) {
    try {
      await deleteWatchlist(watchlistId);
      const nextWatchlists = await getWatchlists();
      setWatchlists(nextWatchlists);
      setExpandedWatchlistId((prev) => (prev === watchlistId ? null : prev));

      const remainingTickers = nextWatchlists.flatMap((item) => item.tickers);
      if (!remainingTickers.includes(activeChartTicker)) {
        setActiveChartTicker(remainingTickers[0] ?? "");
      }
      setMessage("Watchlist deleted");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete watchlist");
    }
  }

  return (
    <div className="app-layout">
      <aside className={`side-menu ${isMenuCollapsed ? "collapsed" : ""}`}>
        <button className="menu-toggle" onClick={() => setIsMenuCollapsed((prev) => !prev)}>
          {isMenuCollapsed ? "»" : "«"}
        </button>
        <button
          className={`menu-item ${activeModule === "stockModule" ? "active" : ""}`}
          onClick={() => setActiveModule("stockModule")}
          title="Stock"
        >
          <span>Stock</span>
        </button>
        <button
          className={`menu-item ${activeModule === "watchlistModule" ? "active" : ""}`}
          onClick={() => setActiveModule("watchlistModule")}
          title="Watchlist"
        >
          <span>Watchlist</span>
        </button>
        <button
          className={`menu-item ${activeModule === "settingModule" ? "active" : ""}`}
          onClick={() => setActiveModule("settingModule")}
          title="Setting"
        >
          <span>Setting</span>
        </button>
      </aside>

      <div className="app-shell">
      {activeModule === "stockModule" ? (
      <section className="panel module2-panel">
        {toast ? <div className="module2-toast">{toast}</div> : null}
        <div className="module2-topbar">
          <div>
            <h2>Stock</h2>
            <p>{stocks.length} total stocks</p>
          </div>
          <div className="actions">
            <button
              className={`btn-secondary ${isSelectMode ? "active" : ""}`}
              onClick={() => {
                setIsSelectMode((prev) => !prev);
                setSelectedTickers([]);
              }}
            >
              {isSelectMode ? "Exit Select" : "Select"}
            </button>
            <button className="btn-primary" onClick={openNewImport}>+ Create</button>
          </div>
        </div>

        {isSelectMode ? (
          <div className="module2-bulkbar">
            <span className="module2-bulkcount">{selectedTickers.length} selected</span>
            <div className="module2-bulk-spacer" />
            <button
              className="btn-secondary"
              onClick={exportSelectedTickers}
              disabled={selectedTickers.length === 0}
            >
              Export
            </button>
            <button
              className="btn-secondary"
              onClick={() => openWatchlistModal("selected")}
              disabled={selectedTickers.length === 0}
            >
              ★ New Watchlist
            </button>
            <button
              className="btn-secondary"
              onClick={archiveSelectedStocks}
              disabled={selectedTickers.length === 0}
            >
              Archive
            </button>
            <button
              className="btn-secondary"
              onClick={unarchiveSelectedStocks}
              disabled={selectedTickers.length === 0}
            >
              Unarchive
            </button>
          </div>
        ) : null}

        <div className="toolbar toolbar-main module2-filters">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}>
            <option value="">All themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={watchlistFilter} onChange={(e) => setWatchlistFilter(e.target.value)}>
            <option value="">All watchlists</option>
            {watchlistNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="module2-segmented">
            <button
              className={archivedFilter === "all" ? "active" : ""}
              onClick={() => setArchivedFilter("all")}
            >
              All
            </button>
            <button
              className={archivedFilter === "active" ? "active" : ""}
              onClick={() => setArchivedFilter("active")}
            >
              Active
            </button>
            <button
              className={archivedFilter === "archived" ? "active" : ""}
              onClick={() => setArchivedFilter("archived")}
            >
              Archived
            </button>
          </div>
          {hasActiveFilters ? (
            <button
              className="btn-ghost"
              onClick={() => {
                setSearch("");
                setCategoryFilter("");
                setThemeFilter("");
                setWatchlistFilter("");
                setArchivedFilter("all");
              }}
            >
              Clear ✕
            </button>
          ) : null}
          <span className="status-text">{message}</span>
        </div>



        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="muted-text">Loading...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {isSelectMode ? (
                    <th>
                      <input
                        type="checkbox"
                        checked={allDisplayedSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedTickers((prev) => [...new Set([...prev, ...displayedTickers])]);
                            return;
                          }
                          setSelectedTickers((prev) => prev.filter((item) => !displayedTickers.includes(item)));
                        }}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => {
                        if (sortKey === column.key) {
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                          return;
                        }
                        setSortKey(column.key);
                        setSortOrder("asc");
                      }}
                    >
                      {column.label} {sortKey === column.key ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.length === 0 ? (
                  <tr>
                    <td colSpan={(isSelectMode ? 1 : 0) + visibleColumns.length + 1} className="table-empty">
                      No stocks found
                    </td>
                  </tr>
                ) : stockRows.map(({ stock, raw }, index) => (
                  <tr
                    key={stock.id}
                    onClick={() => {
                      if (isSelectMode) {
                        setSelectedTickers((prev) =>
                          prev.includes(stock.ticker)
                            ? prev.filter((item) => item !== stock.ticker)
                            : [...prev, stock.ticker]
                        );
                        return;
                      }
                      setSelected(stock);
                    }}
                    className={isSelectMode && selectedTickers.includes(stock.ticker) ? "row-selected" : (index % 2 === 1 ? "row-alt" : "")}
                  >
                    {isSelectMode ? (
                      <td onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTickers.includes(stock.ticker)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelectedTickers((prev) =>
                              checked ? [...new Set([...prev, stock.ticker])] : prev.filter((item) => item !== stock.ticker)
                            );
                          }}
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((column) => {
                      const value = column.source === "core" ? getCoreValue(stock, column.key) : raw[column.key];
                      if (column.key === "theme") {
                        return (
                          <td key={column.key} onDoubleClick={(event) => openTagDropdown(stock, "theme", event)} onClick={(event) => event.stopPropagation()}>
                            <div className="chip-list">
                              {stock.themes.length > 0 ? (
                                stock.themes.map((item) => (
                                  <span key={`${stock.id}-theme-${item}`} className="chip chip-theme">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="muted-text">-</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (column.key === "category") {
                        return (
                          <td key={column.key} onDoubleClick={(event) => openTagDropdown(stock, "category", event)} onClick={(event) => event.stopPropagation()}>
                            <div className="chip-list">
                              {stock.categories.length > 0 ? (
                                stock.categories.map((item) => (
                                  <span key={`${stock.id}-category-${item}`} className="chip chip-category">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="muted-text">-</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (column.key === "companyName") {
                        return <td key={column.key} className="name-cell">{formatCellValue(column.key, value)}</td>;
                      }

                      if (column.key === "ticker") {
                        return <td key={column.key} className="ticker-cell">{formatCellValue(column.key, value)}</td>;
                      }

                      return <td key={column.key}>{formatCellValue(column.key, value)}</td>;
                    })}
                    <td>
                      <button
                        className="btn-ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openEditImport(stock);
                        }}
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span>
                Showing {(totalStocks === 0 ? 0 : ((currentPage - 1) * MODULE2_PAGE_SIZE) + 1)}-
                {Math.min(currentPage * MODULE2_PAGE_SIZE, totalStocks)} of {totalStocks} stocks
              </span>
              <div className="table-pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                >
                  «
                </button>
                <button
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  ‹
                </button>
                {paginationItems.map((item, index) => (
                  item === "..." ? (
                    <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      className={`pagination-btn ${currentPage === item ? "active" : ""}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  )
                ))}
                <button
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  ›
                </button>
                <button
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      ) : null}

      {isWatchlistModalOpen ? (
        <div className="dialog-backdrop" onClick={() => {
          setIsWatchlistModalOpen(false);
          setWatchlistModalError("");
        }}>
          <section className="module2-watchlist-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Watchlist</h2>
            <p className="muted-text">
              {(watchlistModalMode === "selected" ? selectedTickers.length : totalStocks)} stock(s) will be added
            </p>
            <input
              value={newWatchlistName}
              onChange={(e) => {
                setNewWatchlistName(e.target.value);
                if (watchlistModalError) setWatchlistModalError("");
              }}
              placeholder="Watchlist name..."
            />
            {watchlistModalError ? <p className="module2-modal-error">{watchlistModalError}</p> : null}
            <div className="actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsWatchlistModalOpen(false);
                  setWatchlistModalError("");
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={createWatchlistFromModal}>Create</button>
            </div>
          </section>
        </div>
      ) : null}

      {activeModule === "watchlistModule" ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Watchlist</h2>
          </div>
          <div className="watchlist-layout">
            <div className="watchlist-box watchlist-chart-box">
              <h3>{activeChartTicker ? `Chart: ${activeChartTicker}` : "Chart"}</h3>
              <TradingViewAdvancedChart symbol={activeChartTicker} />
            </div>
            <div className="watchlist-box">
              <h3>Watchlist 列表</h3>
              <div className="watchlist-accordion">
                {watchlists.map((item) => {
                  const expanded = expandedWatchlistId === item.id;
                  return (
                    <section className="watchlist-accordion-item" key={item.id}>
                      <div className={`watchlist-accordion-trigger ${expanded ? "expanded" : ""}`}>
                        <button
                          className="watchlist-accordion-toggle"
                          onClick={() => setExpandedWatchlistId((prev) => (prev === item.id ? null : item.id))}
                        >
                          <span>{item.name}</span>
                          <span>{expanded ? "−" : "+"}</span>
                        </button>
                        <button
                          className="icon-delete"
                          aria-label={`Delete watchlist ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeWatchlist(item.id);
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
                                  setActiveChartTicker(tickerItem);
                                }}
                              >
                                {tickerItem}
                              </button>
                              <button
                                className="icon-delete"
                                aria-label={`Remove ${tickerItem}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void removeFromWatchlist(item.id, tickerItem);
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
                <button className="btn-secondary" onClick={exportActiveWatchlist}>导出 TradingView 文本</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeModule === "settingModule" ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Setting</h2>
          </div>

          <div className="settings-grid">
            <section className="settings-card">
              <h3>Themes 管理</h3>
              <div className="settings-inline">
                <input
                  placeholder="Theme name"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                />
                <input type="color" value={newThemeColor} onChange={(e) => setNewThemeColor(e.target.value)} />
                <button
                  className="btn-primary"
                  onClick={async () => {
                    if (!newThemeName.trim()) return;
                    await createTheme(newThemeName.trim(), newThemeColor);
                    setNewThemeName("");
                    await loadSettings();
                  }}
                >
                  新增
                </button>
              </div>
              {themeEdits.map((item) => (
                <div className="settings-inline" key={item.id}>
                  <input
                    value={item.name}
                    onChange={(e) =>
                      setThemeEdits((prev) =>
                        prev.map((theme) => (theme.id === item.id ? { ...theme, name: e.target.value } : theme))
                      )
                    }
                  />
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) =>
                      setThemeEdits((prev) =>
                        prev.map((theme) => (theme.id === item.id ? { ...theme, color: e.target.value } : theme))
                      )
                    }
                  />
                  <button className="btn-secondary" onClick={() => updateTheme(item.id, item.name, item.color).then(loadSettings)}>
                    保存
                  </button>
                  <button className="btn-ghost" onClick={() => deleteTheme(item.id).then(loadSettings)}>
                    删除
                  </button>
                </div>
              ))}
            </section>

            <section className="settings-card">
              <h3>Category 管理</h3>
              <div className="settings-inline">
                <input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    if (!newCategoryName.trim()) return;
                    await createCategory(newCategoryName.trim());
                    setNewCategoryName("");
                    await loadSettings();
                  }}
                >
                  新增
                </button>
              </div>
              {categoryEdits.map((item) => (
                <div className="settings-inline" key={item.id}>
                  <input
                    value={item.name}
                    onChange={(e) =>
                      setCategoryEdits((prev) =>
                        prev.map((category) => (category.id === item.id ? { ...category, name: e.target.value } : category))
                      )
                    }
                  />
                  <button className="btn-secondary" onClick={() => updateCategory(item.id, item.name).then(loadSettings)}>
                    保存
                  </button>
                  <button className="btn-ghost" onClick={() => deleteCategory(item.id).then(loadSettings)}>
                    删除
                  </button>
                </div>
              ))}
            </section>

            <section className="settings-card settings-card-wide">
              <h3>数据库字段管理（JSON 扩展字段）</h3>
              <p className="muted-text">配置 AI JSON 中哪些 key 显示为 Table 列，并可自定义列名。</p>
              <div className="json-config-list">
                {jsonFieldDrafts.map((item, index) => (
                  <div className="settings-inline" key={item.key}>
                    <label className="inline">
                      <input
                        type="checkbox"
                        checked={item.isVisible}
                        onChange={(e) =>
                          setJsonFieldDrafts((prev) =>
                            prev.map((field, i) => (i === index ? { ...field, isVisible: e.target.checked } : field))
                          )
                        }
                      />
                      {item.key}
                    </label>
                    <input
                      value={item.label}
                      onChange={(e) =>
                        setJsonFieldDrafts((prev) =>
                          prev.map((field, i) => (i === index ? { ...field, label: e.target.value } : field))
                        )
                      }
                      placeholder="Column label"
                    />
                  </div>
                ))}
              </div>
              <div className="actions">
                <button className="btn-primary" onClick={saveJsonFieldSettings}>保存字段配置</button>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {isImportOpen ? (
        <div className="dialog-backdrop" onClick={() => {
          setIsImportOpen(false);
          setEditingTicker(null);
        }}>
          <section className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>数据录入</h2>
              <button className="btn-ghost" onClick={() => {
                setIsImportOpen(false);
                setEditingTicker(null);
              }}>
                关闭
              </button>
            </div>
            <div className="grid-3">
              <label>
                Ticker
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="NVDA"
                />
              </label>
              <label>
                AI JSON
                <textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={10} />
              </label>
              <label>
                AI Markdown Report
                <textarea value={markdownReport} onChange={(e) => setMarkdownReport(e.target.value)} rows={10} />
              </label>
            </div>
            <div className="actions">
              <button className="btn-primary" onClick={submitImport}>保存/更新</button>
            </div>
          </section>
        </div>
      ) : null}

      {tagDropdown
        ? (
          <div className="tag-dropdown-backdrop" onClick={() => setTagDropdown(null)}>
            <section
              className="tag-dropdown-panel"
              style={{ left: `${tagDropdown.left}px`, top: `${tagDropdown.top}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4>{tagDropdown.kind === "theme" ? "编辑 Themes" : "编辑 Categories"}</h4>
              <input
                placeholder={tagDropdown.kind === "theme" ? "搜索 Theme..." : "搜索 Category..."}
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />
              <div className="tag-dropdown-list">
                {(tagDropdown.kind === "theme" ? settings.themes.map((item) => item.name) : settings.categories.map((item) => item.name))
                  .filter((name) => name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map((name) => (
                    <label key={`dropdown-${tagDropdown.kind}-${name}`} className="inline">
                      <input
                        type="checkbox"
                        checked={tagDropdown.selectedValues.includes(name)}
                        onChange={() => {
                          void toggleTagFromDropdown(name);
                        }}
                      />
                      {name}
                    </label>
                  ))}
              </div>
              <div className="settings-inline">
                <input
                  placeholder={tagDropdown.kind === "theme" ? "新建 Theme" : "新建 Category"}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <button className="btn-secondary" onClick={() => void createTagFromDropdown()}>新建并选中</button>
              </div>
            </section>
          </div>
        )
        : null}

      {selected ? <div className="detail-backdrop" onClick={() => setSelected(null)} /> : null}
      <aside className={`detail-panel ${selected ? "open" : ""}`}>
        <div className="detail-header">
          <h3>详细报告 - {selected?.ticker ?? ""}</h3>
          <button className="btn-close" aria-label="Close panel" onClick={() => setSelected(null)}>×</button>
        </div>

        <div className="detail-body">
          <h4>历史版本</h4>
          <div className="report-list">
            {reports.map((report) => (
              <button className="btn-ghost" key={report.id} onClick={() => selectReport(report.id)}>
                v{report.version} - {new Date(report.generatedAt).toLocaleString()}
              </button>
            ))}
          </div>

          <h4>Markdown 报告 {activeReport ? `(v${activeReport.version})` : ""}</h4>
          <article
            className="markdown"
            dangerouslySetInnerHTML={{
              __html: activeReport ? (marked.parse(activeReport.content) as string) : "No report"
            }}
          />
        </div>
      </aside>
      </div>
    </div>
  );
}

export default App;
