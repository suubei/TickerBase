import type { MouseEvent } from "react";
import type { Stock } from "../types";
import type { ColumnConfig } from "./stockTableConfig";

type ArchivedFilter = "all" | "active" | "archived";

type StockRow = {
  stock: Stock;
  raw: Record<string, unknown>;
};

type StockModuleProps = {
  toast: string;
  stocks: Stock[];
  totalStocks: number;
  isSelectMode: boolean;
  selectedTickers: string[];
  search: string;
  categoryFilter: string;
  themeFilter: string;
  watchlistFilter: string;
  archivedFilter: ArchivedFilter;
  categories: string[];
  themes: string[];
  watchlistNames: string[];
  hasActiveFilters: boolean;
  message: string;
  error: string;
  loading: boolean;
  allDisplayedSelected: boolean;
  visibleColumns: ColumnConfig[];
  sortKey: string;
  sortOrder: "asc" | "desc";
  stockRows: StockRow[];
  currentPage: number;
  totalPages: number;
  paginationItems: Array<number | "...">;
  onToggleSelectMode: () => void;
  onOpenNewImport: () => void;
  onExportSelectedTickers: () => void;
  onOpenWatchlistModal: (mode: "selected" | "filtered") => void;
  onArchiveSelectedStocks: () => void;
  onUnarchiveSelectedStocks: () => void;
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onThemeFilterChange: (value: string) => void;
  onWatchlistFilterChange: (value: string) => void;
  onArchivedFilterChange: (value: ArchivedFilter) => void;
  onClearFilters: () => void;
  onToggleSelectAllDisplayed: (checked: boolean) => void;
  onSort: (key: string) => void;
  onRowClick: (stock: Stock) => void;
  onRowSelectChange: (ticker: string, checked: boolean) => void;
  onOpenTagDropdown: (stock: Stock, kind: "theme" | "category", event: MouseEvent<HTMLTableCellElement>) => void;
  getCoreValue: (stock: Stock, key: string) => unknown;
  formatCellValue: (key: string, value: unknown) => string;
  onEditStock: (stock: Stock) => void;
  onGoToFirstPage: () => void;
  onGoToPrevPage: () => void;
  onGoToPage: (page: number) => void;
  onGoToNextPage: () => void;
  onGoToLastPage: () => void;
};

export function StockModule(props: StockModuleProps) {
  const {
    toast,
    stocks,
    totalStocks,
    isSelectMode,
    selectedTickers,
    search,
    categoryFilter,
    themeFilter,
    watchlistFilter,
    archivedFilter,
    categories,
    themes,
    watchlistNames,
    hasActiveFilters,
    message,
    error,
    loading,
    allDisplayedSelected,
    visibleColumns,
    sortKey,
    sortOrder,
    stockRows,
    currentPage,
    totalPages,
    paginationItems,
    onToggleSelectMode,
    onOpenNewImport,
    onExportSelectedTickers,
    onOpenWatchlistModal,
    onArchiveSelectedStocks,
    onUnarchiveSelectedStocks,
    onSearchChange,
    onCategoryFilterChange,
    onThemeFilterChange,
    onWatchlistFilterChange,
    onArchivedFilterChange,
    onClearFilters,
    onToggleSelectAllDisplayed,
    onSort,
    onRowClick,
    onRowSelectChange,
    onOpenTagDropdown,
    getCoreValue,
    formatCellValue,
    onEditStock,
    onGoToFirstPage,
    onGoToPrevPage,
    onGoToPage,
    onGoToNextPage,
    onGoToLastPage
  } = props;

  return (
    <section className="panel module2-panel">
      {toast ? <div className="module2-toast">{toast}</div> : null}
      <div className="module2-topbar">
        <div>
          <h2>Stock</h2>
          <p>{stocks.length} total stocks</p>
        </div>
        <div className="actions">
          <button className={`btn-secondary ${isSelectMode ? "active" : ""}`} onClick={onToggleSelectMode}>
            {isSelectMode ? "Exit Select" : "Select"}
          </button>
          <button className="btn-primary" onClick={onOpenNewImport}>+ Create</button>
        </div>
      </div>

      {isSelectMode ? (
        <div className="module2-bulkbar">
          <span className="module2-bulkcount">{selectedTickers.length} selected</span>
          <div className="module2-bulk-spacer" />
          <button className="btn-secondary" onClick={onExportSelectedTickers} disabled={selectedTickers.length === 0}>Export</button>
          <button className="btn-secondary" onClick={() => onOpenWatchlistModal("selected")} disabled={selectedTickers.length === 0}>★ New Watchlist</button>
          <button className="btn-secondary" onClick={onArchiveSelectedStocks} disabled={selectedTickers.length === 0}>Archive</button>
          <button className="btn-secondary" onClick={onUnarchiveSelectedStocks} disabled={selectedTickers.length === 0}>Unarchive</button>
        </div>
      ) : null}

      <div className="toolbar toolbar-main module2-filters">
        <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search" />
        <select value={categoryFilter} onChange={(e) => onCategoryFilterChange(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={themeFilter} onChange={(e) => onThemeFilterChange(e.target.value)}>
          <option value="">All themes</option>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={watchlistFilter} onChange={(e) => onWatchlistFilterChange(e.target.value)}>
          <option value="">All watchlists</option>
          {watchlistNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className="module2-segmented">
          <button className={archivedFilter === "all" ? "active" : ""} onClick={() => onArchivedFilterChange("all")}>All</button>
          <button className={archivedFilter === "active" ? "active" : ""} onClick={() => onArchivedFilterChange("active")}>Active</button>
          <button className={archivedFilter === "archived" ? "active" : ""} onClick={() => onArchivedFilterChange("archived")}>Archived</button>
        </div>
        {hasActiveFilters ? <button className="btn-ghost" onClick={onClearFilters}>Clear ✕</button> : null}
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
                      onChange={(event) => onToggleSelectAllDisplayed(event.target.checked)}
                    />
                  </th>
                ) : null}
                {visibleColumns.map((column) => (
                  <th key={column.key} onClick={() => onSort(column.key)}>
                    {column.label} {sortKey === column.key ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.length === 0 ? (
                <tr>
                  <td colSpan={(isSelectMode ? 1 : 0) + visibleColumns.length + 1} className="table-empty">No stocks found</td>
                </tr>
              ) : stockRows.map(({ stock, raw }, index) => (
                <tr
                  key={stock.id}
                  onClick={() => onRowClick(stock)}
                  className={isSelectMode && selectedTickers.includes(stock.ticker) ? "row-selected" : (index % 2 === 1 ? "row-alt" : "")}
                >
                  {isSelectMode ? (
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTickers.includes(stock.ticker)}
                        onChange={(event) => onRowSelectChange(stock.ticker, event.target.checked)}
                      />
                    </td>
                  ) : null}
                  {visibleColumns.map((column) => {
                    const value = column.source === "core" ? getCoreValue(stock, column.key) : raw[column.key];
                    if (column.key === "theme") {
                      return (
                        <td key={column.key} onDoubleClick={(event) => onOpenTagDropdown(stock, "theme", event)} onClick={(event) => event.stopPropagation()}>
                          <div className="chip-list">
                            {stock.themes.length > 0
                              ? stock.themes.map((item) => <span key={`${stock.id}-theme-${item}`} className="chip chip-theme">{item}</span>)
                              : <span className="muted-text">-</span>}
                          </div>
                        </td>
                      );
                    }

                    if (column.key === "category") {
                      return (
                        <td key={column.key} onDoubleClick={(event) => onOpenTagDropdown(stock, "category", event)} onClick={(event) => event.stopPropagation()}>
                          <div className="chip-list">
                            {stock.categories.length > 0
                              ? stock.categories.map((item) => <span key={`${stock.id}-category-${item}`} className="chip chip-category">{item}</span>)
                              : <span className="muted-text">-</span>}
                          </div>
                        </td>
                      );
                    }

                    if (column.key === "ticker") {
                      return <td key={column.key} className="ticker-cell">{formatCellValue(column.key, value)}</td>;
                    }

                    return <td key={column.key}>{formatCellValue(column.key, value)}</td>;
                  })}
                  <td>
                    <button
                      className="icon-edit"
                      aria-label={`Edit ${stock.ticker}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditStock(stock);
                      }}
                    >
                      ✎
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <span>
              Showing {(totalStocks === 0 ? 0 : ((currentPage - 1) * 2) + 1)}-
              {Math.min(currentPage * 2, totalStocks)} of {totalStocks} stocks
            </span>
            <div className="table-pagination">
              <button className="pagination-btn" disabled={currentPage <= 1} onClick={onGoToFirstPage}>«</button>
              <button className="pagination-btn" disabled={currentPage <= 1} onClick={onGoToPrevPage}>‹</button>
              {paginationItems.map((item, index) => (
                item === "..."
                  ? <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>
                  : <button key={`page-${item}`} className={`pagination-btn ${currentPage === item ? "active" : ""}`} onClick={() => onGoToPage(item)}>{item}</button>
              ))}
              <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={onGoToNextPage}>›</button>
              <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={onGoToLastPage}>»</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
