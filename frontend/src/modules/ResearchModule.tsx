import { useMemo, useState } from "react";
import { marked } from "marked";
import type { ResearchReport } from "../types";

type ResearchModuleProps = {
  reports: ResearchReport[];
  activeReport: ResearchReport | null;
  isEditing: boolean;
  isCreating: boolean;
  editTitle: string;
  editContent: string;
  editTickers: string[];
  tickerInput: string;
  onSelectReport: (report: ResearchReport) => void;
  onStartCreate: () => void;
  onStartEdit: (report: ResearchReport) => void;
  onCancelEdit: () => void;
  onSaveCreate: () => void;
  onSaveEdit: () => void;
  onDeleteReport: (id: number) => void;
  onEditTitleChange: (v: string) => void;
  onEditContentChange: (v: string) => void;
  onTickerInputChange: (v: string) => void;
  onAddTicker: () => void;
  onRemoveTicker: (ticker: string) => void;
};

export function ResearchModule({
  reports,
  activeReport,
  isEditing,
  isCreating,
  editTitle,
  editContent,
  editTickers,
  tickerInput,
  onSelectReport,
  onStartCreate,
  onStartEdit,
  onCancelEdit,
  onSaveCreate,
  onSaveEdit,
  onDeleteReport,
  onEditTitleChange,
  onEditContentChange,
  onTickerInputChange,
  onAddTicker,
  onRemoveTicker
}: ResearchModuleProps) {
  const [isPreview, setIsPreview] = useState(false);
  const contentHtml = useMemo(
    () => marked.parse((isEditing ? editContent : activeReport?.content) ?? "") as string,
    [isEditing, editContent, activeReport?.content]
  );

  const showEditor = isEditing || isCreating;

  return (
    <section className="panel research-panel">
      <div className="research-layout">

        {/* ── Left sidebar: report list ── */}
        <aside className="research-sidebar">
          <div className="research-sidebar-header">
            <span>Research</span>
            <button className="btn-primary research-new-btn" onClick={onStartCreate}>+ New</button>
          </div>

          <div className="research-list">
            {reports.length === 0 && (
              <div className="research-empty">No research reports yet</div>
            )}
            {reports.map((r) => (
              <div
                key={r.id}
                className={`research-list-item ${activeReport?.id === r.id ? "active" : ""}`}
                onClick={() => onSelectReport(r)}
              >
                <div className="research-item-title">{r.title}</div>
                <div className="research-item-meta">
                  {r.tickers.length > 0 && (
                    <span className="research-item-tickers">{r.tickers.join(", ")}</span>
                  )}
                  <span className="research-item-date">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="research-item-delete"
                  onClick={(e) => { e.stopPropagation(); onDeleteReport(r.id); }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Right: content area ── */}
        <div className="research-content">
          {!activeReport && !showEditor && (
            <div className="research-placeholder">
              <p>Select a report or create a new one</p>
            </div>
          )}

          {/* Editor (create or edit) */}
          {showEditor && (
            <div className="research-editor">
              <div className="research-editor-header">
                <input
                  className="research-title-input"
                  placeholder="Report title…"
                  value={editTitle}
                  onChange={(e) => onEditTitleChange(e.target.value)}
                />
                <div className="research-editor-actions">
                  <button className="btn-secondary" onClick={onCancelEdit}>Cancel</button>
                  <button className="btn-primary" onClick={isCreating ? onSaveCreate : onSaveEdit}>
                    {isCreating ? "Create" : "Save"}
                  </button>
                </div>
              </div>

              {/* Ticker tags */}
              <div className="research-tickers-row">
                <div className="research-ticker-tags">
                  {editTickers.map((t) => (
                    <span key={t} className="research-ticker-tag">
                      {t}
                      <button onClick={() => onRemoveTicker(t)}>✕</button>
                    </span>
                  ))}
                </div>
                <div className="research-ticker-input-wrap">
                  <input
                    className="research-ticker-input"
                    placeholder="Add ticker…"
                    value={tickerInput}
                    onChange={(e) => onTickerInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddTicker(); } }}
                  />
                  <button className="btn-secondary" onClick={onAddTicker}>Add</button>
                </div>
              </div>

              {/* Markdown editor / preview toggle */}
              <div className="research-editor-toolbar">
                <button
                  className={`research-preview-toggle ${isPreview ? "active" : ""}`}
                  onClick={() => setIsPreview((p) => !p)}
                >
                  {isPreview ? "Edit" : "Preview"}
                </button>
              </div>

              {isPreview ? (
                <article
                  className="research-markdown-preview"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              ) : (
                <textarea
                  className="research-textarea"
                  placeholder="Write your research in Markdown…"
                  value={editContent}
                  onChange={(e) => onEditContentChange(e.target.value)}
                  spellCheck={false}
                />
              )}
            </div>
          )}

          {/* View mode */}
          {activeReport && !showEditor && (
            <div className="research-viewer">
              <div className="research-viewer-header">
                <div>
                  <h2 className="research-viewer-title">{activeReport.title}</h2>
                  <div className="research-viewer-meta">
                    {activeReport.tickers.map((t) => (
                      <span key={t} className="research-ticker-tag">{t}</span>
                    ))}
                    <span className="research-viewer-date">
                      {new Date(activeReport.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => onStartEdit(activeReport)}>Edit</button>
              </div>
              {activeReport.content ? (
                <article
                  className="research-markdown-preview"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              ) : (
                <div className="research-placeholder"><p>No content yet. Click Edit to add.</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
