type ImportDialogProps = {
  isOpen: boolean;
  ticker: string;
  jsonPayload: string;
  markdownReport: string;
  onTickerChange: (value: string) => void;
  onJsonPayloadChange: (value: string) => void;
  onMarkdownReportChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ImportDialog({
  isOpen,
  ticker,
  jsonPayload,
  markdownReport,
  onTickerChange,
  onJsonPayloadChange,
  onMarkdownReportChange,
  onClose,
  onSubmit
}: ImportDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>数据录入</h2>
          <button className="btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="grid-3">
          <label>
            Ticker
            <input
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value)}
              placeholder="NVDA"
            />
          </label>
          <label>
            AI JSON
            <textarea value={jsonPayload} onChange={(e) => onJsonPayloadChange(e.target.value)} rows={10} />
          </label>
          <label>
            AI Markdown Report
            <textarea value={markdownReport} onChange={(e) => onMarkdownReportChange(e.target.value)} rows={10} />
          </label>
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={onSubmit}>保存/更新</button>
        </div>
      </section>
    </div>
  );
}
