import { useCallback, useState } from "react";
import { getReportContent, importStock } from "../../api";
import type { Stock } from "../../types";

type UseImportModuleOptions = {
  onMessage: (message: string) => void;
  reloadAfterSubmit: () => Promise<void>;
};

export function useImportModule({ onMessage, reloadAfterSubmit }: UseImportModuleOptions) {
  const [jsonPayload, setJsonPayload] = useState("");
  const [markdownReport, setMarkdownReport] = useState("# Report\n");
  const [isImportOpen, setIsImportOpen] = useState(false);
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

  const closeImport = useCallback(() => {
    setIsImportOpen(false);
    setEditingTicker(null);
  }, []);

  const submitImport = useCallback(async () => {
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
      closeImport();
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
  }, [closeImport, editingTicker, extractTickerFromJson, isEditing, jsonPayload, markdownReport, onMessage, reloadAfterSubmit]);

  const openEditImport = useCallback(async (stock: Stock) => {
    onMessage("");
    setEditingTicker(stock.ticker);
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
      onMessage(err instanceof Error ? err.message : "Failed to load latest markdown report");
    }
  }, [onMessage]);

  const openNewImport = useCallback(() => {
    setEditingTicker(null);
    setJsonPayload("");
    setMarkdownReport("# Report\n");
    setIsImportOpen(true);
  }, []);

  return {
    jsonPayload,
    setJsonPayload,
    markdownReport,
    setMarkdownReport,
    isImportOpen,
    setIsImportOpen,
    editingTicker,
    isEditing,
    closeImport,
    submitImport,
    openEditImport,
    openNewImport
  };
}
