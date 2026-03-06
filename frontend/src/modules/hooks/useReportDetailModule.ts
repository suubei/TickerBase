import { useCallback, useEffect, useState } from "react";
import { getReportContent, getReports } from "../../api";
import type { ReportMeta, Stock } from "../../types";

type ActiveReport = { id: number; content: string; version: number } | null;

type UseReportDetailModuleOptions = {
  onMessage: (message: string) => void;
};

export function useReportDetailModule({ onMessage }: UseReportDetailModuleOptions) {
  const [selected, setSelected] = useState<Stock | null>(null);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [activeReport, setActiveReport] = useState<ActiveReport>(null);

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
        onMessage(err instanceof Error ? err.message : "Failed to load detail");
      }
    })();
  }, [onMessage, selected]);

  const selectReport = useCallback(async (reportId: number) => {
    const content = await getReportContent(reportId);
    setActiveReport({ id: reportId, content: content.content, version: content.version });
  }, []);

  return {
    selected,
    setSelected,
    reports,
    activeReport,
    selectReport
  };
}
