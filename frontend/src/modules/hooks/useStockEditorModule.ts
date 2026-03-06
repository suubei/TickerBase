import { useCallback, useState } from "react";
import { getReportContent, importStock } from "../../api";
import type { Stock } from "../../types";

type UseStockEditorModuleOptions = {
  onMessage: (message: string) => void;
  reloadAfterSubmit: () => Promise<void>;
};

export function useStockEditorModule({ onMessage, reloadAfterSubmit }: UseStockEditorModuleOptions) {
  const [jsonPayload, setJsonPayload] = useState("");
  const [markdownReport, setMarkdownReport] = useState("# Report\n");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);

  const isEditing = editingTicker !== null;

  const extractTickerFromJson = useCallback((payload: string) => {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (typeof parsed.ticker === "string" && parsed.ticker.trim()) {
        return parsed.ticker.trim().toUpperCase();
      }
      return "";
    } catch {
      return "";
    }
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingTicker(null);
  }, []);

  const submitEditor = useCallback(async () => {
    onMessage("");
    const submitTicker = extractTickerFromJson(jsonPayload);
    if (!submitTicker) {
      onMessage("jsonPayload 里必须包含 ticker 字段");
      return;
    }
    try {
      const result = await importStock({
        ticker: submitTicker,
        originalTicker: editingTicker ?? undefined,
        jsonPayload,
        markdownReport: isEditing ? undefined : markdownReport
      });
      if ("skipped" in result) {
        onMessage(`Skipped ${result.ticker}`);
      } else {
        if (result.updated && isEditing) {
          onMessage(`Updated ${result.ticker}`);
        } else {
          onMessage(`${result.updated ? "Updated" : "Imported"} ${result.ticker}, v${result.version}`);
        }
      }
      setJsonPayload("");
      closeEditor();
      await reloadAfterSubmit();
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (editingTicker && status === 409) {
        onMessage(err instanceof Error ? err.message : "Ticker already exists");
        return;
      }
      if (status === 409) {
        const confirmed = window.confirm(`Ticker ${submitTicker.toUpperCase()} 已存在，是否更新？`);
        if (!confirmed) {
          await importStock({ ticker: submitTicker, jsonPayload, markdownReport, action: "skip" });
          onMessage(`Skipped ${submitTicker.toUpperCase()}`);
          return;
        }
        const updated = await importStock({ ticker: submitTicker, jsonPayload, markdownReport, action: "update" });
        if ("updated" in updated) {
          onMessage(`Updated ${updated.ticker}, v${updated.version}`);
        }
        await reloadAfterSubmit();
        return;
      }
      onMessage(err instanceof Error ? err.message : "Import failed");
    }
  }, [closeEditor, editingTicker, extractTickerFromJson, isEditing, jsonPayload, markdownReport, onMessage, reloadAfterSubmit]);

  const openEditStock = useCallback(async (stock: Stock) => {
    onMessage("");
    setEditingTicker(stock.ticker);

    // Build JSON from current DB fields, merging rawJson extras so no data is lost
    let base: Record<string, unknown> = {};
    if (stock.rawJson?.trim()) {
      try {
        base = JSON.parse(stock.rawJson) as Record<string, unknown>;
      } catch {
        // ignore malformed rawJson
      }
    }
    const merged: Record<string, unknown> = {
      ...base,
      ticker: stock.ticker,
      ...(stock.companyName != null && { companyName: stock.companyName }),
      ...(stock.summary != null && { summary: stock.summary }),
      ...(stock.risk != null && { risk: stock.risk }),
      ...(stock.catalyst != null && { catalyst: stock.catalyst }),
      ...(stock.themeBenefit != null && { themeBenefit: stock.themeBenefit }),
      ...(stock.themePhase != null && { themePhase: stock.themePhase }),
      ...(stock.themes.length > 0 && { themes: stock.themes }),
      ...(stock.categories.length > 0 && { categories: stock.categories }),
    };
    setJsonPayload(JSON.stringify(merged, null, 2));
    setMarkdownReport("# Report\n");
    setIsEditorOpen(true);

    if (!stock.latestReport) return;
    try {
      const content = await getReportContent(stock.latestReport.id);
      setMarkdownReport(content.content);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to load latest markdown report");
    }
  }, [onMessage]);

  const openCreateStock = useCallback(() => {
    setEditingTicker(null);
    setJsonPayload("");
    setMarkdownReport("# Report\n");
    setIsEditorOpen(true);
  }, []);

  return {
    jsonPayload,
    setJsonPayload,
    markdownReport,
    setMarkdownReport,
    isEditorOpen,
    setIsEditorOpen,
    editingTicker,
    isEditing,
    closeEditor,
    submitEditor,
    openEditStock,
    openCreateStock
  };
}
