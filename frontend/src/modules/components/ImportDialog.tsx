import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";

type ImportDialogProps = {
  isOpen: boolean;
  isEditing: boolean;
  jsonPayload: string;
  markdownReport: string;
  onJsonPayloadChange: (value: string) => void;
  onMarkdownReportChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ImportDialog({
  isOpen,
  isEditing,
  jsonPayload,
  markdownReport,
  onJsonPayloadChange,
  onMarkdownReportChange,
  onClose,
  onSubmit
}: ImportDialogProps) {
  const [isPreview, setIsPreview] = useState(false);
  const markdownHtml = useMemo(() => marked.parse(markdownReport) as string, [markdownReport]);

  useEffect(() => {
    if (!isOpen || isEditing) {
      setIsPreview(false);
    }
  }, [isEditing, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className={`dialog-panel import-dialog ${isEditing ? "edit-mode" : "create-mode"}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <h2>{isEditing ? "Edit Stock" : "Create Stock"}</h2>
            <p className="import-dialog-subtitle">
              {isEditing ? "Update existing record fields" : "Paste JSON data and optionally a Markdown report"}
            </p>
          </div>
          <button className="btn-close import-close" aria-label="Close dialog" onClick={onClose}>✕</button>
        </div>

        {isEditing ? (
          <div className="import-edit-body">
            <div className="import-pane-head">
              <span className="import-pane-label">JSON</span>
              <span className="import-pane-desc">Update existing record fields</span>
            </div>
            <textarea
              className="import-textarea"
              value={jsonPayload}
              onChange={(e) => onJsonPayloadChange(e.target.value)}
              rows={16}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="import-panes">
            <div className="import-pane">
              <div className="import-pane-head">
                <span className="import-pane-label">JSON</span>
                <span className="import-pane-desc">Defines record fields</span>
              </div>
              <textarea
                className="import-textarea"
                value={jsonPayload}
                onChange={(e) => onJsonPayloadChange(e.target.value)}
                rows={16}
                spellCheck={false}
              />
            </div>
            <div className="import-pane">
              <div className="import-pane-head">
                <span className="import-pane-label">Markdown</span>
                <button
                  className={`import-preview-toggle ${isPreview ? "active" : ""}`}
                  onClick={() => setIsPreview((prev) => !prev)}
                >
                  {isPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {!isPreview ? (
                <textarea
                  className="import-textarea"
                  value={markdownReport}
                  onChange={(e) => onMarkdownReportChange(e.target.value)}
                  rows={16}
                  spellCheck={false}
                />
              ) : (
                <article className="import-markdown-preview" dangerouslySetInnerHTML={{ __html: markdownHtml }} />
              )}
            </div>
          </div>
        )}

        <div className="import-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit}>{isEditing ? "Update" : "Create"}</button>
        </div>
      </section>
    </div>
  );
}
