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
    <section className="panel">
      <div className="panel-head">
        <h2>模块5: setting module</h2>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <h3>Themes 管理</h3>
          <div className="settings-inline">
            <input placeholder="Theme name" value={newThemeName} onChange={(e) => onNewThemeNameChange(e.target.value)} />
            <input type="color" value={newThemeColor} onChange={(e) => onNewThemeColorChange(e.target.value)} />
            <button className="btn-primary" onClick={onCreateTheme}>新增</button>
          </div>
          {themeEdits.map((item) => (
            <div className="settings-inline" key={item.id}>
              <input value={item.name} onChange={(e) => onThemeEditChange(item.id, { name: e.target.value })} />
              <input type="color" value={item.color} onChange={(e) => onThemeEditChange(item.id, { color: e.target.value })} />
              <button className="btn-secondary" onClick={() => onSaveTheme(item.id, item.name, item.color)}>保存</button>
              <button className="btn-ghost" onClick={() => onDeleteTheme(item.id)}>删除</button>
            </div>
          ))}
        </section>

        <section className="settings-card">
          <h3>Category 管理</h3>
          <div className="settings-inline">
            <input placeholder="Category name" value={newCategoryName} onChange={(e) => onNewCategoryNameChange(e.target.value)} />
            <button className="btn-primary" onClick={onCreateCategory}>新增</button>
          </div>
          {categoryEdits.map((item) => (
            <div className="settings-inline" key={item.id}>
              <input value={item.name} onChange={(e) => onCategoryEditChange(item.id, e.target.value)} />
              <button className="btn-secondary" onClick={() => onSaveCategory(item.id, item.name)}>保存</button>
              <button className="btn-ghost" onClick={() => onDeleteCategory(item.id)}>删除</button>
            </div>
          ))}
        </section>

        <section className="settings-card settings-card-wide">
          <h3>数据库字段管理（JSON 扩展字段）</h3>
          <p className="muted-text">配置 AI JSON 中哪些 key 显示为 Table 列，并可自定义列名。</p>
          <div className="json-config-list">
            {jsonFieldDrafts.map((item, index) => (
              <div className="settings-inline" key={item.key}>
                <label className="inline">
                  <input type="checkbox" checked={item.isVisible} onChange={(e) => onJsonFieldVisibleChange(index, e.target.checked)} />
                  {item.key}
                </label>
                <input value={item.label} onChange={(e) => onJsonFieldLabelChange(index, e.target.value)} placeholder="Column label" />
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={onSaveJsonFields}>保存字段配置</button>
          </div>
        </section>
      </div>
    </section>
  );
}
