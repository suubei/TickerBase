import { marked } from "marked";
import type { ReportMeta, Stock } from "../../types";

marked.setOptions({ gfm: true, breaks: true });

type ActiveReport = { id: number; content: string; version: number } | null;

type ReportDetailPanelProps = {
  selected: Stock | null;
  reports: ReportMeta[];
  activeReport: ActiveReport;
  onClose: () => void;
  onSelectReport: (reportId: number) => void;
};

export function ReportDetailPanel({ selected, reports, activeReport, onClose, onSelectReport }: ReportDetailPanelProps) {
  return (
    <>
      {selected ? <div className="detail-backdrop" onClick={onClose} /> : null}
      <aside className={`detail-panel ${selected ? "open" : ""}`}>
        <div className="detail-header">
          <h3>详细报告 - {selected?.ticker ?? ""}</h3>
          <button className="btn-close" aria-label="Close panel" onClick={onClose}>×</button>
        </div>

        <div className="detail-body">
          <h4>历史版本</h4>
          <div className="report-list">
            {reports.map((report) => (
              <button className="btn-ghost" key={report.id} onClick={() => onSelectReport(report.id)}>
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
    </>
  );
}
