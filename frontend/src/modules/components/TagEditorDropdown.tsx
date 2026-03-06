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

  return (
    <div className="tag-dropdown-backdrop" onClick={onClose}>
      <section
        className="tag-dropdown-panel"
        style={{ left: `${tagDropdown.left}px`, top: `${tagDropdown.top}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4>{tagDropdown.kind === "theme" ? "编辑 Themes" : "编辑 Categories"}</h4>
        <input
          placeholder={tagDropdown.kind === "theme" ? "搜索 Theme..." : "搜索 Category..."}
          value={tagSearch}
          onChange={(e) => onTagSearchChange(e.target.value)}
        />
        <div className="tag-dropdown-list">
          {tagNames
            .filter((name) => name.toLowerCase().includes(tagSearch.toLowerCase()))
            .map((name) => (
              <label key={`dropdown-${tagDropdown.kind}-${name}`} className="inline">
                <input
                  type="checkbox"
                  checked={tagDropdown.selectedValues.includes(name)}
                  onChange={() => onToggleTag(name)}
                />
                {name}
              </label>
            ))}
        </div>
        <div className="settings-inline">
          <input
            placeholder={tagDropdown.kind === "theme" ? "新建 Theme" : "新建 Category"}
            value={newTagName}
            onChange={(e) => onNewTagNameChange(e.target.value)}
          />
          <button className="btn-secondary" onClick={onCreateTag}>新建并选中</button>
        </div>
      </section>
    </div>
  );
}
