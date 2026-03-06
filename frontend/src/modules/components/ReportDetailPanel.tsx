import { marked } from "marked";
import type { ReportMeta, Stock } from "../../types";

marked.setOptions({ gfm: true, breaks: true });

type ActiveReport = { id: number; content: string; version: number } | null;

type ReportDetailPanelProps = {
  selected: Stock | null;
  reports: ReportMeta[];
  activeReport: ActiveReport;
  isEditingReport: boolean;
  reportDraft: string;
  isSavingReport: boolean;
  onClose: () => void;
  onSelectReport: (reportId: number) => void;
  onStartEditReport: () => void;
  onCancelEditReport: () => void;
  onReportDraftChange: (value: string) => void;
  onSaveEditedReport: () => void;
  onCreateNewReportVersion: () => void;
};

export function ReportDetailPanel({
  selected,
  reports,
  activeReport,
  isEditingReport,
  reportDraft,
  isSavingReport,
  onClose,
  onSelectReport,
  onStartEditReport,
  onCancelEditReport,
  onReportDraftChange,
  onSaveEditedReport,
  onCreateNewReportVersion
}: ReportDetailPanelProps) {
  const sortedReports = [...reports].sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });

  return (
    <>
      {selected ? <div className="detail-backdrop" onClick={onClose} /> : null}
      <aside className={`detail-panel ${selected ? "open" : ""}`}>
        <div className="detail-header">
          <h3>详细报告 - {selected?.ticker ?? ""}</h3>
          <button className="btn-close" aria-label="Close panel" onClick={onClose}>×</button>
        </div>

        <div className="detail-body detail-split">
          <section className="detail-sidebar">
            <h4>历史版本</h4>
            <div className="report-list">
              {sortedReports.map((report) => (
                <button className={`report-version-btn ${activeReport?.id === report.id ? "active" : ""}`} key={report.id} onClick={() => onSelectReport(report.id)}>
                  v{report.version} - {new Date(report.generatedAt).toLocaleString()}
                </button>
              ))}
            </div>
          </section>

          <section className="detail-content">
            <div className="actions report-actions">
              {!isEditingReport ? (
                <button className="btn-secondary" onClick={onStartEditReport} disabled={!activeReport || isSavingReport}>编辑当前版本</button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={onCancelEditReport} disabled={isSavingReport}>取消编辑</button>
                  <button className="btn-primary" onClick={onSaveEditedReport} disabled={isSavingReport}>保存当前版本</button>
                </>
              )}
              <button className="btn-primary" onClick={onCreateNewReportVersion} disabled={isSavingReport || !activeReport}>
                {isSavingReport ? "处理中..." : "创建新版本"}
              </button>
            </div>

            <h4>Markdown 报告 {activeReport ? `(v${activeReport.version})` : ""}</h4>
            {isEditingReport ? (
              <textarea
                className="report-editor"
                value={reportDraft}
                onChange={(e) => onReportDraftChange(e.target.value)}
                rows={16}
              />
            ) : (
              <article
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: activeReport ? (marked.parse(activeReport.content) as string) : "No report"
                }}
              />
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
