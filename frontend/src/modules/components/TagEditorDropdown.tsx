type TagKind = "theme" | "category";

type TagDropdownState = {
  kind: TagKind;
  left: number;
  top: number;
  selectedValues: string[];
};

import { useState } from "react";

type TagEditorDropdownProps = {
  tagDropdown: TagDropdownState | null;
  tagSearch: string;
  newTagName: string;
  tagNames: string[];
  onClose: () => void;
  onTagSearchChange: (value: string) => void;
  onToggleTag: (name: string) => void;
  onRenameTag: (oldName: string, newName: string) => void;
  onDeleteTag: (name: string) => void;
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
  onRenameTag,
  onDeleteTag,
  onNewTagNameChange,
  onCreateTag
}: TagEditorDropdownProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!tagDropdown) return null;

  const isTheme = tagDropdown.kind === "theme";
  const filtered = tagNames.filter((name) =>
    name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  function startEdit(name: string) {
    setEditingName(name);
    setEditValue(name);
  }

  function commitEdit(name: string) {
    if (editValue.trim() && editValue.trim() !== name) {
      onRenameTag(name, editValue.trim());
    }
    setEditingName(null);
  }

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
            const isEditing = editingName === name;
            return (
              <div key={`dropdown-${tagDropdown.kind}-${name}`} className={`tag-dropdown-item ${checked ? "checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleTag(name)}
                />
                {isEditing ? (
                  <input
                    className="tag-dropdown-item-edit-input"
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(name);
                      if (e.key === "Escape") setEditingName(null);
                    }}
                    onBlur={() => commitEdit(name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{name}</span>
                )}
                <button
                  className="tag-dropdown-item-action"
                  onClick={(e) => { e.preventDefault(); startEdit(name); }}
                  aria-label={`Rename ${name}`}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  className="tag-dropdown-item-remove"
                  onClick={(e) => { e.preventDefault(); onDeleteTag(name); }}
                  aria-label={`Delete ${name}`}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
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
