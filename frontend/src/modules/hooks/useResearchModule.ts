import { useCallback, useState } from "react";
import { createResearch, deleteResearch, getResearchList, updateResearch } from "../../api";
import type { ResearchReport } from "../../types";

export function useResearchModule() {
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTickers, setEditTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [researchError, setResearchError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      const list = await getResearchList();
      setReports(list);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Failed to load research reports");
    }
  }, []);

  const selectReport = useCallback((report: ResearchReport) => {
    setActiveReport(report);
    setIsEditing(false);
    setIsCreating(false);
    setResearchError("");
  }, []);

  const startCreate = useCallback(() => {
    setActiveReport(null);
    setIsCreating(true);
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    setEditTickers([]);
    setTickerInput("");
    setResearchError("");
  }, []);

  const startEdit = useCallback((report: ResearchReport) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditTitle(report.title);
    setEditContent(report.content);
    setEditTickers([...report.tickers]);
    setTickerInput("");
    setResearchError("");
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setIsCreating(false);
    setResearchError("");
  }, []);

  const saveCreate = useCallback(async () => {
    if (!editTitle.trim()) { setResearchError("Title is required"); return; }
    setResearchError("");
    try {
      const created = await createResearch({
        title: editTitle.trim(),
        content: editContent,
        tickers: editTickers
      });
      await loadReports();
      setActiveReport(created);
      setIsCreating(false);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Failed to create report");
    }
  }, [editContent, editTickers, editTitle, loadReports]);

  const saveEdit = useCallback(async () => {
    if (!activeReport) return;
    if (!editTitle.trim()) { setResearchError("Title is required"); return; }
    setResearchError("");
    try {
      const updated = await updateResearch(activeReport.id, {
        title: editTitle.trim(),
        content: editContent,
        tickers: editTickers
      });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActiveReport(updated);
      setIsEditing(false);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Failed to save report");
    }
  }, [activeReport, editContent, editTickers, editTitle]);

  const removeReport = useCallback(async (id: number) => {
    try {
      await deleteResearch(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (activeReport?.id === id) setActiveReport(null);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Failed to delete report");
    }
  }, [activeReport]);

  const addTickerToEdit = useCallback(() => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !editTickers.includes(t)) {
      setEditTickers((prev) => [...prev, t]);
    }
    setTickerInput("");
  }, [editTickers, tickerInput]);

  const removeTickerFromEdit = useCallback((ticker: string) => {
    setEditTickers((prev) => prev.filter((t) => t !== ticker));
  }, []);

  return {
    reports,
    activeReport,
    isEditing,
    isCreating,
    editTitle,
    editContent,
    editTickers,
    tickerInput,
    researchError,
    setEditTitle,
    setEditContent,
    setTickerInput,
    loadReports,
    selectReport,
    startCreate,
    startEdit,
    cancelEdit,
    saveCreate,
    saveEdit,
    removeReport,
    addTickerToEdit,
    removeTickerFromEdit
  };
}
