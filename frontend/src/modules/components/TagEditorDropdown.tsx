type TagKind = "theme" | "category";

type TagDropdownState = {
  kind: TagKind;
  left: number;
  top: number;
  selectedValues: string[];
};

type TagEditorDropdownProps = {
  tagDropdown: TagDropdownState | null;
  tagSearch: string;
  newTagName: string;
  tagNames: string[];
  onClose: () => void;
  onTagSearchChange: (value: string) => void;
  onToggleTag: (name: string) => void;
  onNewTagNameChange: (value: string) => void;
  onCreateTag: () => void;
};

export function TagEditorDropdown({
  tagDropdown,
  tagSearch,
  newTagName,
  tagNames,
  onClose,
  onTagSearchChange,
  onToggleTag,
  onNewTagNameChange,
  onCreateTag
}: TagEditorDropdownProps) {
  if (!tagDropdown) return null;

  const isTheme = tagDropdown.kind === "theme";
  const filtered = tagNames.filter((name) =>
    name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div className="tag-dropdown-backdrop" onClick={onClose}>
      <section className="tag-dropdown-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="tag-dropdown-head">
          <h4 className="tag-dropdown-title">
            {isTheme ? "Edit Themes" : "Edit Categories"}
          </h4>
          <button className="tag-dropdown-close" onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div className="tag-dropdown-search-wrap">
          <input
            className="tag-dropdown-search"
            placeholder={isTheme ? "Search themes…" : "Search categories…"}
            value={tagSearch}
            onChange={(e) => onTagSearchChange(e.target.value)}
          />
        </div>

        {/* Tag list */}
        <div className="tag-dropdown-list">
          {filtered.length === 0 && (
            <div className="tag-dropdown-empty">No results</div>
          )}
          {filtered.map((name) => {
            const checked = tagDropdown.selectedValues.includes(name);
            return (
              <label key={`dropdown-${tagDropdown.kind}-${name}`} className={`tag-dropdown-item ${checked ? "checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleTag(name)}
                />
                <span>{name}</span>
                {checked && (
                  <button
                    className="tag-dropdown-item-remove"
                    onClick={(e) => { e.preventDefault(); onToggleTag(name); }}
                    aria-label={`Remove ${name}`}
                  >
                    ✕
                  </button>
                )}
              </label>
            );
          })}
        </div>

        {/* Create new */}
        <div className="tag-dropdown-footer">
          <input
            className="tag-dropdown-new-input"
            placeholder={isTheme ? "New theme name…" : "New category name…"}
            value={newTagName}
            onChange={(e) => onNewTagNameChange(e.target.value)}
          />
          <button className="btn-primary tag-dropdown-create-btn" onClick={onCreateTag}>+ Add</button>
        </div>

      </section>
    </div>
  );
}
