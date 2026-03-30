import { useEffect, useRef, useState } from "react";
import { ResearchModule } from "./modules/ResearchModule";
import { SettingsModule } from "./modules/SettingsModule";
import { StockModule } from "./modules/StockModule";
import { WatchlistModule } from "./modules/WatchlistModule";
import { StockEditorDialog } from "./modules/components/StockEditorDialog";
import { ReportDetailPanel } from "./modules/components/ReportDetailPanel";
import { SideMenu } from "./modules/components/SideMenu";
import { TagEditorDropdown } from "./modules/components/TagEditorDropdown";
import { TradingViewAdvancedChart } from "./modules/components/TradingViewAdvancedChart";
import { WatchlistCreateModal } from "./modules/components/WatchlistCreateModal";
import { formatCellValue, getCoreValue } from "./modules/stockTableConfig";
import type { ActiveModule } from "./modules/types";
import { useSettingsModule } from "./modules/hooks/useSettingsModule";
import { useAppViewActions } from "./modules/hooks/useAppViewActions";
import { useAppBootstrap } from "./modules/hooks/useAppBootstrap";
import { useStockEditorModule } from "./modules/hooks/useStockEditorModule";
import { useReportDetailModule } from "./modules/hooks/useReportDetailModule";
import { useSettingsActions } from "./modules/hooks/useSettingsActions";
import { useStockTableModule } from "./modules/hooks/useStockTableModule";
import { useTagEditorModule } from "./modules/hooks/useTagEditorModule";
import { useWatchlistCreateModule } from "./modules/hooks/useWatchlistCreateModule";
import { useResearchModule } from "./modules/hooks/useResearchModule";
import { useWatchlistModule } from "./modules/hooks/useWatchlistModule";

const STOCK_PAGE_SIZE = 20;

function App() {
  const [message, setMessage] = useState("");
  const [visibleMessage, setVisibleMessage] = useState("");
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState<ActiveModule>("stockModule");
  const {
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
    selectedTickers,
    setSelectedTickers,
    currentPage,
    setCurrentPage,
    stockRows,
    totalPages,
    paginationItems,
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
  } = useStockTableModule({ pageSize: STOCK_PAGE_SIZE, onMessage: setMessage });

  const {
    settings,
    categories,
    themes,
    themeEdits,
    setThemeEdits,
    categoryEdits,
    setCategoryEdits,
    newThemeName,
    setNewThemeName,
    newThemeColor,
    setNewThemeColor,
    newCategoryName,
    setNewCategoryName,
    jsonFieldDrafts,
    setJsonFieldDrafts,
    loadSettings,
    saveJsonFieldSettings,
    createThemeFromSettings,
    createCategoryFromSettings,
    saveTheme,
    removeTheme,
    saveCategory,
    removeCategory
  } = useSettingsModule(setMessage);

  const {
    onCreateTheme,
    onThemeEditChange,
    onCreateCategory,
    onCategoryEditChange,
    onJsonFieldVisibleChange,
    onJsonFieldLabelChange,
    onSaveJsonFields
  } = useSettingsActions({
    setThemeEdits,
    setCategoryEdits,
    setJsonFieldDrafts,
    createThemeFromSettings,
    createCategoryFromSettings,
    saveJsonFieldSettings
  });

  const {
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
    exportWatchlist,
    addTicker,
    reorderWatchlists,
    reorderStockWithinWatchlist,
    moveStockBetweenWatchlists
  } = useWatchlistModule(setMessage);

  const {
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
  } = useWatchlistCreateModule({
    selectedTickers,
    filters: {
      search,
      categoryFilter,
      themeFilter,
      watchlistFilter,
      archivedFilter,
      sortKey,
      sortOrder
    },
    onMessage: setMessage,
    onAfterCreated: async (watchlistId) => {
      await loadWatchlists();
      setExpandedWatchlistId(watchlistId);
    },
    onClearSelectedTickers: () => {
      setSelectedTickers([]);
    }
  });

  const {
    selected,
    setSelected,
    reports,
    activeReport,
    selectReport,
    isEditingReport,
    reportDraft,
    setReportDraft,
    isSavingReport,
    startEditReport,
    cancelEditReport,
    saveEditedReport,
    createNewReportVersionFromDraft,
    deleteReportVersion
  } = useReportDetailModule({ onMessage: setMessage });

  const {
    jsonPayload,
    setJsonPayload,
    markdownReport,
    setMarkdownReport,
    isEditorOpen,
    isEditing,
    editorError,
    closeEditor,
    submitEditor,
    openEditStock,
    openCreateStock
  } = useStockEditorModule({
    onMessage: setMessage,
    reloadAfterSubmit: async () => {
      await loadStocks();
      await loadSettings();
    }
  });

  const {
    tagDropdown,
    setTagDropdown,
    newTagName,
    setNewTagName,
    tagSearch,
    setTagSearch,
    openTagDropdown,
    toggleTagFromDropdown,
    renameTagFromDropdown,
    deleteTagFromDropdown,
    createTagFromDropdown
  } = useTagEditorModule({
    onMessage: setMessage,
    settings,
    reloadStocks: loadStocks,
    reloadSettings: loadSettings
  });

  const {
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
    onRenameTag,
    onDeleteTag,
    onCreateTag,
    onSelectReport,
    onSubmitEditor,
    onCloseReport
  } = useAppViewActions({
    isSelectMode,
    totalPages,
    toggleRowSelected,
    setSelected,
    openEditStock,
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
    renameTagFromDropdown,
    deleteTagFromDropdown,
    createTagFromDropdown,
    selectReport,
    submitEditor
  });

  const {
    reports: researchReports,
    activeReport: activeResearch,
    isEditing: isResearchEditing,
    isCreating: isResearchCreating,
    editTitle: researchEditTitle,
    editContent: researchEditContent,
    editTickers: researchEditTickers,
    tickerInput: researchTickerInput,
    researchError,
    setEditTitle: setResearchEditTitle,
    setEditContent: setResearchEditContent,
    setTickerInput: setResearchTickerInput,
    loadReports: loadResearchReports,
    selectReport: selectResearch,
    startCreate: startResearchCreate,
    startEdit: startResearchEdit,
    cancelEdit: cancelResearchEdit,
    saveCreate: saveResearchCreate,
    saveEdit: saveResearchEdit,
    removeReport: removeResearch,
    addTickerToEdit: addResearchTicker,
    removeTickerFromEdit: removeResearchTicker
  } = useResearchModule();

  useEffect(() => {
    if (activeModule === "researchModule") {
      void loadResearchReports();
    }
  }, [activeModule, loadResearchReports]);

  const showToastText = message || toast || error;
  useEffect(() => {
    if (!showToastText) return;
    setVisibleMessage(showToastText);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => {
      setVisibleMessage("");
      setMessage("");
    }, 3000);
  }, [showToastText]); // eslint-disable-line react-hooks/exhaustive-deps

  const { visibleColumns } = useAppBootstrap({
    jsonFieldDrafts,
    watchlistFilter,
    watchlistNames,
    setWatchlistFilter,
    loadWatchlists,
    loadSettings
  });
  return (
    <div className="app-layout">
      {visibleMessage && <div className="app-toast">{visibleMessage}</div>}
      <SideMenu
        isCollapsed={isMenuCollapsed}
        activeModule={activeModule}
        onToggleCollapse={() => setIsMenuCollapsed((prev) => !prev)}
        onSelectModule={setActiveModule}
      />

      <div className="app-shell">
      {activeModule === "stockModule" ? (
        <StockModule
          pageSize={STOCK_PAGE_SIZE}
          stocks={stocks}
          totalStocks={totalStocks}
          isSelectMode={isSelectMode}
          selectedTickers={selectedTickers}
          search={search}
          categoryFilter={categoryFilter}
          themeFilter={themeFilter}
          watchlistFilter={watchlistFilter}
          archivedFilter={archivedFilter}
          categories={categories}
          themes={themes}
          watchlistNames={watchlistNames}
          hasActiveFilters={hasActiveFilters}
          loading={loading}
          allDisplayedSelected={allDisplayedSelected}
          visibleColumns={visibleColumns}
          sortKey={sortKey}
          sortOrder={sortOrder}
          stockRows={stockRows}
          currentPage={currentPage}
          totalPages={totalPages}
          paginationItems={paginationItems}
          onToggleSelectMode={toggleSelectMode}
          onOpenCreateStock={openCreateStock}
          onExportSelectedTickers={exportSelectedTickers}
          onOpenWatchlistModal={openWatchlistModal}
          onArchiveSelectedStocks={onArchiveSelectedStocks}
          onUnarchiveSelectedStocks={onUnarchiveSelectedStocks}
          onSearchChange={setSearch}
          onCategoryFilterChange={setCategoryFilter}
          onThemeFilterChange={setThemeFilter}
          onWatchlistFilterChange={setWatchlistFilter}
          onArchivedFilterChange={setArchivedFilter}
          onClearFilters={clearFilters}
          onToggleSelectAllDisplayed={toggleSelectAllDisplayed}
          onSort={sortBy}
          onRowClick={onStockRowClick}
          onRowSelectChange={setRowSelected}
          onOpenTagDropdown={openTagDropdown}
          getCoreValue={getCoreValue}
          formatCellValue={formatCellValue}
          onEditStock={onEditStock}
          onGoToFirstPage={onGoToFirstPage}
          onGoToPrevPage={onGoToPrevPage}
          onGoToPage={setCurrentPage}
          onGoToNextPage={onGoToNextPage}
          onGoToLastPage={onGoToLastPage}
        />
      ) : null}

      <WatchlistCreateModal
        isOpen={isWatchlistModalOpen}
        mode={watchlistModalMode}
        selectedCount={selectedTickers.length}
        filteredCount={totalStocks}
        name={newWatchlistName}
        error={watchlistModalError}
        onNameChange={onWatchlistNameChange}
        onClose={closeWatchlistModal}
        onCreate={onCreateWatchlist}
      />

      <div
        aria-hidden={activeModule !== "watchlistModule"}
        style={{ display: activeModule === "watchlistModule" ? "contents" : "none" }}
      >
        <WatchlistModule
          watchlists={watchlists}
          expandedWatchlistId={expandedWatchlistId}
          activeChartTicker={activeChartTicker}
          onToggleWatchlist={onToggleWatchlist}
          onDeleteWatchlist={onDeleteWatchlist}
          onRenameWatchlist={(id, name) => void renameWatchlist(id, name)}
          onSelectTicker={setActiveChartTicker}
          onRemoveTicker={onRemoveTicker}
          onExportWatchlist={exportWatchlist}
          onAddTicker={addTicker}
          onReorderWatchlists={reorderWatchlists}
          onReorderStocks={reorderStockWithinWatchlist}
          onMoveStock={moveStockBetweenWatchlists}
          renderChart={(ticker) => <TradingViewAdvancedChart symbol={ticker} />}
        />
      </div>

      {activeModule === "researchModule" ? (
        <ResearchModule
          reports={researchReports}
          activeReport={activeResearch}
          isEditing={isResearchEditing}
          isCreating={isResearchCreating}
          editTitle={researchEditTitle}
          editContent={researchEditContent}
          editTickers={researchEditTickers}
          tickerInput={researchTickerInput}
          error={researchError}
          onSelectReport={selectResearch}
          onStartCreate={startResearchCreate}
          onStartEdit={startResearchEdit}
          onCancelEdit={cancelResearchEdit}
          onSaveCreate={() => void saveResearchCreate()}
          onSaveEdit={() => void saveResearchEdit()}
          onDeleteReport={(id) => void removeResearch(id)}
          onEditTitleChange={setResearchEditTitle}
          onEditContentChange={setResearchEditContent}
          onTickerInputChange={setResearchTickerInput}
          onAddTicker={addResearchTicker}
          onRemoveTicker={removeResearchTicker}
        />
      ) : null}

      {activeModule === "settingsModule" ? (
        <SettingsModule
          themeEdits={themeEdits}
          categoryEdits={categoryEdits}
          newThemeName={newThemeName}
          newThemeColor={newThemeColor}
          newCategoryName={newCategoryName}
          jsonFieldDrafts={jsonFieldDrafts}
          onNewThemeNameChange={setNewThemeName}
          onNewThemeColorChange={setNewThemeColor}
          onCreateTheme={onCreateTheme}
          onThemeEditChange={onThemeEditChange}
          onSaveTheme={saveTheme}
          onDeleteTheme={removeTheme}
          onNewCategoryNameChange={setNewCategoryName}
          onCreateCategory={onCreateCategory}
          onCategoryEditChange={onCategoryEditChange}
          onSaveCategory={saveCategory}
          onDeleteCategory={removeCategory}
          onJsonFieldVisibleChange={onJsonFieldVisibleChange}
          onJsonFieldLabelChange={onJsonFieldLabelChange}
          onSaveJsonFields={onSaveJsonFields}
        />
      ) : null}

      <StockEditorDialog
        isOpen={isEditorOpen}
        isEditing={isEditing}
        jsonPayload={jsonPayload}
        markdownReport={markdownReport}
        error={editorError}
        onJsonPayloadChange={setJsonPayload}
        onMarkdownReportChange={setMarkdownReport}
        onClose={closeEditor}
        onSubmit={onSubmitEditor}
      />

      <TagEditorDropdown
        tagDropdown={tagDropdown}
        tagSearch={tagSearch}
        newTagName={newTagName}
        tagNames={(tagDropdown?.kind === "theme" ? settings.themes : settings.categories).map((item) => item.name)}
        onClose={() => setTagDropdown(null)}
        onTagSearchChange={setTagSearch}
        onToggleTag={onToggleTag}
        onRenameTag={onRenameTag}
        onDeleteTag={onDeleteTag}
        onNewTagNameChange={setNewTagName}
        onCreateTag={onCreateTag}
      />

      <ReportDetailPanel
        selected={selected}
        reports={reports}
        activeReport={activeReport}
        isEditingReport={isEditingReport}
        reportDraft={reportDraft}
        isSavingReport={isSavingReport}
        onClose={onCloseReport}
        onSelectReport={onSelectReport}
        onStartEditReport={startEditReport}
        onCancelEditReport={cancelEditReport}
        onReportDraftChange={setReportDraft}
        onSaveEditedReport={() => void saveEditedReport()}
        onCreateNewReportVersion={() => void createNewReportVersionFromDraft()}
        onDeleteReport={(id) => void deleteReportVersion(id)}
      />
      </div>
    </div>
  );
}

export default App;
