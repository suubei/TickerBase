import { useState } from "react";
import { marked } from "marked";
import type { ResearchReport } from "../types";

marked.setOptions({ gfm: true, breaks: true });

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
  const [showPreview, setShowPreview] = useState(false);
  const showEditor = isEditing || isCreating;

  return (
    <section className="panel research-panel">
      <div className="research-layout">

        {/* ── Left sidebar ── */}
        <aside className="research-sidebar">
          <div className="research-sidebar-header">
            <div>
              <p className="detail-vs-label">Research</p>
              <h3 className="detail-vs-title">{reports.length} reports</h3>
            </div>
            <button className="detail-tbtn-primary" onClick={onStartCreate}>+ New</button>
          </div>

          <div className="detail-vs-list">
            {reports.length === 0 && (
              <div className="research-empty">No research reports yet</div>
            )}
            {reports.map((r) => (
              <div
                key={r.id}
                className={`detail-vbtn ${activeReport?.id === r.id ? "active" : ""}`}
                onClick={() => onSelectReport(r)}
              >
                <div className="detail-vbtn-row">
                  <span className="detail-vbtn-name">{r.title}</span>
                  <button
                    className="detail-vbtn-delete"
                    aria-label="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport(r.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <p className="detail-vbtn-date">
                  {r.tickers.length > 0 && (
                    <span className="research-item-tickers">{r.tickers.join(", ")} · </span>
                  )}
                  {new Date(r.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Right content ── */}
        <div className="detail-main">

          {/* Placeholder */}
          {!activeReport && !showEditor && (
            <div className="research-placeholder">
              <p>Select a report or create a new one</p>
            </div>
          )}

          {/* Editor / Create */}
          {showEditor && (
            <>
              {/* Toolbar */}
              <div className="detail-toolbar">
                <div className="detail-toolbar-left">
                  <input
                    className="research-title-input"
                    placeholder="Report title…"
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                  />
                  {editTickers.map((t) => (
                    <span key={t} className="research-ticker-tag">
                      {t}
                      <button onClick={() => onRemoveTicker(t)}>✕</button>
                    </span>
                  ))}
                  <input
                    className="research-ticker-input"
                    placeholder="Add ticker…"
                    value={tickerInput}
                    onChange={(e) => onTickerInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddTicker(); } }}
                  />
                  <button className="detail-tbtn" onClick={onAddTicker}>Add</button>
                </div>
                <div className="detail-toolbar-right">
                  <button
                    className={`detail-tbtn ${showPreview ? "active" : ""}`}
                    onClick={() => setShowPreview((p) => !p)}
                  >
                    {showPreview ? "Hide Preview" : "Preview"}
                  </button>
                  <button className="detail-tbtn" onClick={onCancelEdit}>Cancel</button>
                  <button className="detail-tbtn-primary" onClick={isCreating ? onSaveCreate : onSaveEdit}>
                    {isCreating ? "Create" : "Save"}
                  </button>
                </div>
              </div>

              {/* Editor split */}
              <div className="detail-editor-split">
                <div className={`detail-editor-pane ${showPreview ? "" : "full"}`}>
                  <textarea
                    className="detail-editor-textarea"
                    placeholder="Write your research in Markdown…"
                    value={editContent}
                    onChange={(e) => onEditContentChange(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                {showPreview && (
                  <div className="detail-preview-pane">
                    <div className="detail-pane-label">Preview</div>
                    <div className="detail-preview-scroll">
                      <article
                        className="markdown"
                        dangerouslySetInnerHTML={{ __html: marked.parse(editContent) as string }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* View mode */}
          {activeReport && !showEditor && (
            <>
              <div className="detail-toolbar">
                <div className="detail-toolbar-left">
                  <span className="detail-toolbar-ver">{activeReport.title}</span>
                  <span className="detail-toolbar-date">
                    {new Date(activeReport.updatedAt).toLocaleDateString()}
                  </span>
                  {activeReport.tickers.map((t) => (
                    <span key={t} className="research-ticker-tag">{t}</span>
                  ))}
                </div>
                <div className="detail-toolbar-right">
                  <button className="detail-tbtn" onClick={() => onStartEdit(activeReport)}>
                    ✎ Edit
                  </button>
                </div>
              </div>

              <div className="detail-view-scroll">
                <div className="detail-view-content">
                  <article
                    className="markdown"
                    dangerouslySetInnerHTML={{
                      __html: activeReport.content
                        ? (marked.parse(activeReport.content) as string)
                        : "<p style='color:var(--text-muted)'>No content yet. Click Edit to add.</p>"
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
