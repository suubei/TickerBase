import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";

type StockEditorDialogProps = {
  isOpen: boolean;
  isEditing: boolean;
  jsonPayload: string;
  markdownReport: string;
  onJsonPayloadChange: (value: string) => void;
  onMarkdownReportChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function StockEditorDialog({
  isOpen,
  isEditing,
  jsonPayload,
  markdownReport,
  onJsonPayloadChange,
  onMarkdownReportChange,
  onClose,
  onSubmit
}: StockEditorDialogProps) {
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
      <section className={`dialog-panel stock-editor-dialog ${isEditing ? "edit-mode" : "create-mode"}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <h2>{isEditing ? "Edit Stock" : "Create Stock"}</h2>
          </div>
          <button className="btn-close stock-editor-close" aria-label="Close dialog" onClick={onClose}>✕</button>
        </div>

        {isEditing ? (
          <div className="stock-editor-body">
            <div className="stock-editor-pane-head">
              <span className="stock-editor-pane-label">JSON</span>
            </div>
            <textarea
              className="stock-editor-textarea"
              value={jsonPayload}
              onChange={(e) => onJsonPayloadChange(e.target.value)}
              rows={16}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="stock-editor-panes">
            <div className="stock-editor-pane">
              <div className="stock-editor-pane-head">
                <span className="stock-editor-pane-label">JSON</span>
              </div>
              <textarea
                className="stock-editor-textarea"
                value={jsonPayload}
                onChange={(e) => onJsonPayloadChange(e.target.value)}
                rows={16}
                spellCheck={false}
              />
            </div>
            <div className="stock-editor-pane">
              <div className="stock-editor-pane-head">
                <span className="stock-editor-pane-label">Markdown</span>
                <button
                  className={`stock-editor-preview-toggle ${isPreview ? "active" : ""}`}
                  onClick={() => setIsPreview((prev) => !prev)}
                >
                  {isPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {!isPreview ? (
                <textarea
                  className="stock-editor-textarea"
                  value={markdownReport}
                  onChange={(e) => onMarkdownReportChange(e.target.value)}
                  rows={16}
                  spellCheck={false}
                />
              ) : (
                <article className="stock-editor-markdown-preview" dangerouslySetInnerHTML={{ __html: markdownHtml }} />
              )}
            </div>
          </div>
        )}

        <div className="stock-editor-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit}>{isEditing ? "Update" : "Create"}</button>
        </div>
      </section>
    </div>
  );
}
