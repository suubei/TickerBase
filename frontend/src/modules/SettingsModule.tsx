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
    </section>
  );
}
