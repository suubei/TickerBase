import { useState } from "react";
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
  onDeleteReport: (reportId: number) => void;
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
  onCreateNewReportVersion,
  onDeleteReport
}: ReportDetailPanelProps) {
  const [showPreview, setShowPreview] = useState(true);

  const sortedReports = [...reports].sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });

  const latestReportId = sortedReports[0]?.id ?? null;
  const activeReportMeta = sortedReports.find((r) => r.id === activeReport?.id) ?? null;

  return (
    <>
      {selected ? <div className="detail-backdrop" onClick={onClose} /> : null}
      <aside className={`detail-panel ${selected ? "open" : ""}`}>
        <div className="detail-inner">

          {/* ── Left sidebar: version list ── */}
          <div className="detail-vs">
            <div className="detail-vs-head">
              <p className="detail-vs-label">Report</p>
              <h3 className="detail-vs-title">
                {selected?.ticker ?? ""}
                {selected?.companyName ? ` — ${selected.companyName}` : ""}
              </h3>
            </div>
            <div className="detail-vs-list">
              {sortedReports.map((report) => {
                const isActive = activeReport?.id === report.id;
                const isLatest = report.id === latestReportId;
                return (
                  <div
                    key={report.id}
                    className={`detail-vbtn ${isActive ? "active" : ""}`}
                    onClick={() => onSelectReport(report.id)}
                  >
                    <div className="detail-vbtn-row">
                      <span className="detail-vbtn-name">Version {report.version}</span>
                      {isLatest && (
                        <span className="detail-badge detail-badge-latest">Latest</span>
                      )}
                      <button
                        className="detail-vbtn-delete"
                        aria-label={`Delete version ${report.version}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete Version ${report.version}? This cannot be undone.`)) {
                            onDeleteReport(report.id);
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="detail-vbtn-date">
                      {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                );
              })}
              {sortedReports.length === 0 && (
                <div style={{ padding: "24px 16px", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                  No reports
                </div>
              )}
            </div>
          </div>

          {/* ── Main area ── */}
          <div className="detail-main">

            {/* Toolbar */}
            <div className="detail-toolbar">
              <div className="detail-toolbar-left">
                <span className="detail-toolbar-ver">
                  {activeReport ? `Version ${activeReport.version}` : "No report selected"}
                </span>
                {activeReportMeta && (
                  <span className="detail-toolbar-date">
                    {new Date(activeReportMeta.generatedAt).toLocaleString()}
                  </span>
                )}
                {activeReport && activeReport.id === latestReportId && (
                  <span className="detail-badge detail-badge-latest">Latest</span>
                )}
                {isEditingReport && (
                  <span className="detail-badge detail-badge-editing">Editing</span>
                )}
              </div>

              <div className="detail-toolbar-right">
                {isEditingReport ? (
                  <>
                    <button
                      className={`detail-tbtn ${showPreview ? "active" : ""}`}
                      onClick={() => setShowPreview((p) => !p)}
                    >
                      {showPreview ? "Hide Preview" : "Show Preview"}
                    </button>
                    <button
                      className="detail-tbtn"
                      onClick={onCancelEditReport}
                      disabled={isSavingReport}
                    >
                      Cancel
                    </button>
                    <button
                      className="detail-tbtn-primary"
                      onClick={onSaveEditedReport}
                      disabled={isSavingReport}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="detail-tbtn"
                      onClick={onStartEditReport}
                      disabled={!activeReport || isSavingReport}
                    >
                      ✎ Edit
                    </button>
                    <button
                      className="detail-tbtn-primary"
                      onClick={onCreateNewReportVersion}
                      disabled={isSavingReport || !activeReport}
                    >
                      {isSavingReport ? "Processing…" : "+ New Version"}
                    </button>
                  </>
                )}
                <button className="btn-close" aria-label="Close panel" onClick={onClose}>×</button>
              </div>
            </div>

            {/* Content */}
            {isEditingReport ? (
              <div className="detail-editor-split">
                {/* Editor pane */}
                <div className={`detail-editor-pane ${showPreview ? "" : "full"}`}>
                  <div className="detail-pane-label">Editor</div>
                  <textarea
                    className="detail-editor-textarea"
                    value={reportDraft}
                    onChange={(e) => onReportDraftChange(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                {/* Preview pane */}
                {showPreview && (
                  <div className="detail-preview-pane">
                    <div className="detail-pane-label">Preview</div>
                    <div className="detail-preview-scroll">
                      <article
                        className="markdown"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(reportDraft) as string
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="detail-view-scroll">
                <div className="detail-view-content">
                  <article
                    className="markdown"
                    dangerouslySetInnerHTML={{
                      __html: activeReport
                        ? (marked.parse(activeReport.content) as string)
                        : "<p style='color:var(--text-muted)'>Select a report version to view.</p>"
                    }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}
