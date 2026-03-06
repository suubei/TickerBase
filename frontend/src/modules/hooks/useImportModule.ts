import { useCallback, useState } from "react";
import { getReportContent, importStock } from "../../api";
import type { Stock } from "../../types";

type UseImportModuleOptions = {
  onMessage: (message: string) => void;
  reloadAfterSubmit: () => Promise<void>;
};

export function useImportModule({ onMessage, reloadAfterSubmit }: UseImportModuleOptions) {
  const [ticker, setTicker] = useState("");
  const [jsonPayload, setJsonPayload] = useState("{\n\n}");
  const [markdownReport, setMarkdownReport] = useState("# Report\n");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);

  const closeImport = useCallback(() => {
    setIsImportOpen(false);
    setEditingTicker(null);
  }, []);

  const submitImport = useCallback(async () => {
    onMessage("");
    const submitTicker = ticker;
    try {
      const result = await importStock({
        ticker: submitTicker,
        originalTicker: editingTicker ?? undefined,
        jsonPayload,
        markdownReport
      });
      if ("skipped" in result) {
        onMessage(`Skipped ${result.ticker}`);
      } else {
        onMessage(`${result.updated ? "Updated" : "Imported"} ${result.ticker}, v${result.version}`);
      }
      setTicker("");
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
  }, [closeImport, editingTicker, jsonPayload, markdownReport, onMessage, reloadAfterSubmit, ticker]);

  const openEditImport = useCallback(async (stock: Stock) => {
    onMessage("");
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
      onMessage(err instanceof Error ? err.message : "Failed to load latest markdown report");
    }
  }, [onMessage]);

  const openNewImport = useCallback(() => {
    setEditingTicker(null);
    setTicker("");
    setJsonPayload("{\n\n}");
    setMarkdownReport("# Report\n");
    setIsImportOpen(true);
  }, []);

  return {
    ticker,
    setTicker,
    jsonPayload,
    setJsonPayload,
    markdownReport,
    setMarkdownReport,
    isImportOpen,
    setIsImportOpen,
    editingTicker,
    closeImport,
    submitImport,
    openEditImport,
    openNewImport
  };
}
