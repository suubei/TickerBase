type WatchlistCreateModalProps = {
  isOpen: boolean;
  mode: "selected" | "filtered";
  selectedCount: number;
  filteredCount: number;
  name: string;
  error: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
};

export function WatchlistCreateModal({
  isOpen,
  mode,
  selectedCount,
  filteredCount,
  name,
  error,
  onNameChange,
  onClose,
  onCreate
}: WatchlistCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className="module2-watchlist-modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Watchlist</h2>
        <p className="muted-text">
          {(mode === "selected" ? selectedCount : filteredCount)} stock(s) will be added
        </p>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Watchlist name..."
        />
        {error ? <p className="module2-modal-error">{error}</p> : null}
        <div className="actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onCreate}>Create</button>
        </div>
      </section>
    </div>
  );
}
