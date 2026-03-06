import { useCallback, useEffect, useState } from "react";
import { createReportVersion, deleteReport, getReportContent, getReports, updateReportContent } from "../../api";
import type { ReportMeta, Stock } from "../../types";

type ActiveReport = { id: number; content: string; version: number } | null;

type UseReportDetailModuleOptions = {
  onMessage: (message: string) => void;
};

export function useReportDetailModule({ onMessage }: UseReportDetailModuleOptions) {
  const [selected, setSelected] = useState<Stock | null>(null);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [activeReport, setActiveReport] = useState<ActiveReport>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportDraft, setReportDraft] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);

  const loadReportsForTicker = useCallback(async (ticker: string, targetReportId?: number) => {
    const r = await getReports(ticker);
    setReports(r);
    if (r.length === 0) {
      setActiveReport(null);
      setReportDraft("");
      return;
    }

    const reportId = targetReportId ?? r[0].id;
    const content = await getReportContent(reportId);
    setActiveReport({ id: reportId, content: content.content, version: content.version });
    setReportDraft(content.content);
  }, []);

  useEffect(() => {
    if (!selected) {
      setReports([]);
      setActiveReport(null);
      setIsEditingReport(false);
      setReportDraft("");
      return;
    }

    void (async () => {
      try {
        await loadReportsForTicker(selected.ticker);
      } catch (err) {
        onMessage(err instanceof Error ? err.message : "Failed to load detail");
      }
    })();
  }, [loadReportsForTicker, onMessage, selected]);

  const selectReport = useCallback(async (reportId: number) => {
    const content = await getReportContent(reportId);
    setActiveReport({ id: reportId, content: content.content, version: content.version });
    setReportDraft(content.content);
    setIsEditingReport(false);
  }, []);

  const startEditReport = useCallback(() => {
    if (!activeReport) return;
    setReportDraft(activeReport.content);
    setIsEditingReport(true);
  }, [activeReport]);

  const cancelEditReport = useCallback(() => {
    setReportDraft(activeReport?.content ?? "");
    setIsEditingReport(false);
  }, [activeReport]);

  const saveEditedReport = useCallback(async () => {
    if (!activeReport || !selected) return;
    const content = reportDraft.trim();
    if (!content) {
      onMessage("报告内容不能为空");
      return;
    }

    setIsSavingReport(true);
    try {
      const updated = await updateReportContent(activeReport.id, content);
      setActiveReport({ id: updated.id, content: updated.content, version: updated.version });
      setReportDraft(updated.content);
      setIsEditingReport(false);
      await loadReportsForTicker(selected.ticker, updated.id);
      onMessage(`Updated report v${updated.version}`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setIsSavingReport(false);
    }
  }, [activeReport, loadReportsForTicker, onMessage, reportDraft, selected]);

  const createNewReportVersionFromDraft = useCallback(async () => {
    if (!selected) return;
    const content = reportDraft.trim() || activeReport?.content?.trim() || "";
    if (!content) {
      onMessage("报告内容不能为空");
      return;
    }

    setIsSavingReport(true);
    try {
      const created = await createReportVersion(selected.ticker, content);
      await loadReportsForTicker(selected.ticker, created.id);
      setIsEditingReport(true);
      onMessage(`Created report v${created.version}`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to create report version");
    } finally {
      setIsSavingReport(false);
    }
  }, [activeReport?.content, loadReportsForTicker, onMessage, reportDraft, selected]);

  const deleteReportVersion = useCallback(async (reportId: number) => {
    if (!selected) return;
    setIsSavingReport(true);
    try {
      await deleteReport(reportId);
      const remaining = await getReports(selected.ticker);
      setReports(remaining);
      if (activeReport?.id === reportId) {
        if (remaining.length > 0) {
          const content = await getReportContent(remaining[0].id);
          setActiveReport({ id: remaining[0].id, content: content.content, version: content.version });
          setReportDraft(content.content);
        } else {
          setActiveReport(null);
          setReportDraft("");
        }
        setIsEditingReport(false);
      }
      onMessage("Report version deleted");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to delete report");
    } finally {
      setIsSavingReport(false);
    }
  }, [activeReport, onMessage, selected]);

  return {
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
  };
}
