import type { CategoryItem, JsonFieldDraft, ThemeItem } from "./settingsTypes";

// Local props-only module to keep App.tsx focused on orchestration.
type SettingsModuleProps = {
  themeEdits: ThemeItem[];
  categoryEdits: CategoryItem[];
  newThemeName: string;
  newThemeColor: string;
  newCategoryName: string;
  jsonFieldDrafts: JsonFieldDraft[];
  onNewThemeNameChange: (value: string) => void;
  onNewThemeColorChange: (value: string) => void;
  onCreateTheme: () => void;
  onThemeEditChange: (id: number, patch: Partial<ThemeItem>) => void;
  onSaveTheme: (id: number, name: string, color: string) => void;
  onDeleteTheme: (id: number) => void;
  onNewCategoryNameChange: (value: string) => void;
  onCreateCategory: () => void;
  onCategoryEditChange: (id: number, name: string) => void;
  onSaveCategory: (id: number, name: string) => void;
  onDeleteCategory: (id: number) => void;
  onJsonFieldVisibleChange: (index: number, visible: boolean) => void;
  onJsonFieldLabelChange: (index: number, label: string) => void;
  onSaveJsonFields: () => void;
};

export function SettingsModule(props: SettingsModuleProps) {
  const {
    themeEdits,
    categoryEdits,
    newThemeName,
    newThemeColor,
    newCategoryName,
    jsonFieldDrafts,
    onNewThemeNameChange,
    onNewThemeColorChange,
    onCreateTheme,
    onThemeEditChange,
    onSaveTheme,
    onDeleteTheme,
    onNewCategoryNameChange,
    onCreateCategory,
    onCategoryEditChange,
    onSaveCategory,
    onDeleteCategory,
    onJsonFieldVisibleChange,
    onJsonFieldLabelChange,
    onSaveJsonFields
  } = props;

  return (
    <section className="panel settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-grid">

        {/* ── Table Column Fields ── */}
        <section className="settings-card">
          <div className="settings-card-head">
            <h3>Table Column Fields</h3>
          </div>
          <div className="settings-card-body">
            <p className="muted-text">Configure which JSON keys appear as table columns and customize their labels.</p>
            <div className="json-config-list">
              {jsonFieldDrafts.map((item, index) => (
                <div className="settings-list-item" key={item.key}>
                  <label className="settings-checkbox-label">
                    <input type="checkbox" checked={item.isVisible} onChange={(e) => onJsonFieldVisibleChange(index, e.target.checked)} />
                    <span>{item.key}</span>
                  </label>
                  <input className="settings-item-input" value={item.label} onChange={(e) => onJsonFieldLabelChange(index, e.target.value)} placeholder="Column label" />
                </div>
              ))}
            </div>
            <div className="settings-card-footer">
              <button className="btn-primary" onClick={onSaveJsonFields}>Save Column Config</button>
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}
