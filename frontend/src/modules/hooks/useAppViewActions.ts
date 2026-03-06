import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Stock } from "../../types";

type UseAppViewActionsOptions = {
  isSelectMode: boolean;
  totalPages: number;
  toggleRowSelected: (ticker: string) => void;
  setSelected: Dispatch<SetStateAction<Stock | null>>;
  openEditImport: (stock: Stock) => Promise<void>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  archiveSelectedStocks: () => Promise<void>;
  unarchiveSelectedStocks: () => Promise<void>;
  setNewWatchlistName: (value: string) => void;
  watchlistModalError: string;
  setWatchlistModalError: (value: string) => void;
  createWatchlistFromModal: () => Promise<void>;
  setExpandedWatchlistId: Dispatch<SetStateAction<number | null>>;
  removeWatchlist: (id: number) => Promise<void>;
  removeFromWatchlist: (watchlistId: number, ticker: string) => Promise<void>;
  toggleTagFromDropdown: (name: string) => Promise<void>;
  createTagFromDropdown: () => Promise<void>;
  selectReport: (reportId: number) => Promise<void>;
  submitImport: () => Promise<void>;
};

export function useAppViewActions({
  isSelectMode,
  totalPages,
  toggleRowSelected,
  setSelected,
  openEditImport,
  setCurrentPage,
  archiveSelectedStocks,
  unarchiveSelectedStocks,
  setNewWatchlistName,
  watchlistModalError,
  setWatchlistModalError,
  createWatchlistFromModal,
  setExpandedWatchlistId,
  removeWatchlist,
  removeFromWatchlist,
  toggleTagFromDropdown,
  createTagFromDropdown,
  selectReport,
  submitImport
}: UseAppViewActionsOptions) {
  const onStockRowClick = useCallback((stock: Stock) => {
    if (isSelectMode) {
      toggleRowSelected(stock.ticker);
      return;
    }
    setSelected(stock);
  }, [isSelectMode, setSelected, toggleRowSelected]);

  const onEditStock = useCallback((stock: Stock) => {
    void openEditImport(stock);
  }, [openEditImport]);

  const onArchiveSelectedStocks = useCallback(() => {
    void archiveSelectedStocks();
  }, [archiveSelectedStocks]);

  const onUnarchiveSelectedStocks = useCallback(() => {
    void unarchiveSelectedStocks();
  }, [unarchiveSelectedStocks]);

  const onGoToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  const onGoToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, [setCurrentPage]);

  const onGoToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [setCurrentPage, totalPages]);

  const onGoToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [setCurrentPage, totalPages]);

  const onWatchlistNameChange = useCallback((value: string) => {
    setNewWatchlistName(value);
    if (watchlistModalError) setWatchlistModalError("");
  }, [setNewWatchlistName, setWatchlistModalError, watchlistModalError]);

  const onCreateWatchlist = useCallback(() => {
    void createWatchlistFromModal();
  }, [createWatchlistFromModal]);

  const onToggleWatchlist = useCallback((id: number) => {
    setExpandedWatchlistId((prev) => (prev === id ? null : id));
  }, [setExpandedWatchlistId]);

  const onDeleteWatchlist = useCallback((id: number) => {
    void removeWatchlist(id);
  }, [removeWatchlist]);

  const onRemoveTicker = useCallback((watchlistId: number, ticker: string) => {
    void removeFromWatchlist(watchlistId, ticker);
  }, [removeFromWatchlist]);

  const onToggleTag = useCallback((name: string) => {
    void toggleTagFromDropdown(name);
  }, [toggleTagFromDropdown]);

  const onCreateTag = useCallback(() => {
    void createTagFromDropdown();
  }, [createTagFromDropdown]);

  const onSelectReport = useCallback((reportId: number) => {
    void selectReport(reportId);
  }, [selectReport]);

  const onSubmitImport = useCallback(() => {
    void submitImport();
  }, [submitImport]);

  const onCloseReport = useCallback(() => {
    setSelected(null);
  }, [setSelected]);

  return {
    onStockRowClick,
    onEditStock,
    onArchiveSelectedStocks,
    onUnarchiveSelectedStocks,
    onGoToFirstPage,
    onGoToPrevPage,
    onGoToNextPage,
    onGoToLastPage,
    onWatchlistNameChange,
    onCreateWatchlist,
    onToggleWatchlist,
    onDeleteWatchlist,
    onRemoveTicker,
    onToggleTag,
    onCreateTag,
    onSelectReport,
    onSubmitImport,
    onCloseReport
  };
}
