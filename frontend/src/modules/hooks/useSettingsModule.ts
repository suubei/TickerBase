import { useCallback, useMemo, useState } from "react";
import {
  createCategory,
  createTheme,
  deleteCategory,
  deleteTheme,
  getSettings,
  saveTableFields,
  updateCategory,
  updateTheme
} from "../../api";
import type { CategoryItem, SettingsPayload, ThemeItem } from "../../types";
import type { JsonFieldDraft } from "../settingsTypes";

export function useSettingsModule(onMessage: (message: string) => void) {
  const [settings, setSettings] = useState<SettingsPayload>({ themes: [], categories: [], tableFields: [], jsonKeys: [] });
  const [themeEdits, setThemeEdits] = useState<ThemeItem[]>([]);
  const [categoryEdits, setCategoryEdits] = useState<CategoryItem[]>([]);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeColor, setNewThemeColor] = useState("#9CA3AF");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [jsonFieldDrafts, setJsonFieldDrafts] = useState<JsonFieldDraft[]>([]);

  const categories = useMemo(() => settings.categories.map((item) => item.name), [settings.categories]);
  const themes = useMemo(() => settings.themes.map((item) => item.name), [settings.themes]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setSettings(data);
      setThemeEdits(data.themes);
      setCategoryEdits(data.categories);
      const known = new Map(data.tableFields.map((item) => [item.key, item]));
      const merged = data.jsonKeys.map((key, idx) => {
        const existing = known.get(key);
        return {
          key,
          label: existing?.label ?? key,
          isVisible: existing?.isVisible ?? false,
          position: existing?.position ?? idx
        };
      });
      setJsonFieldDrafts(merged.sort((a, b) => a.position - b.position));
    } catch {
      setSettings({ themes: [], categories: [], tableFields: [], jsonKeys: [] });
      setThemeEdits([]);
      setCategoryEdits([]);
      setJsonFieldDrafts([]);
    }
  }, []);

  const saveJsonFieldSettings = useCallback(async () => {
    try {
      const payload = jsonFieldDrafts.map((item, index) => ({
        key: item.key,
        label: item.label.trim() || item.key,
        isVisible: item.isVisible,
        position: index
      }));
      const saved = await saveTableFields(payload);
      setSettings((prev) => ({ ...prev, tableFields: saved }));
      onMessage("Table fields saved");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to save table fields");
    }
  }, [jsonFieldDrafts, onMessage]);

  const createThemeFromSettings = useCallback(async () => {
    if (!newThemeName.trim()) return;
    await createTheme(newThemeName.trim(), newThemeColor);
    setNewThemeName("");
    await loadSettings();
  }, [loadSettings, newThemeColor, newThemeName]);

  const createCategoryFromSettings = useCallback(async () => {
    if (!newCategoryName.trim()) return;
    await createCategory(newCategoryName.trim());
    setNewCategoryName("");
    await loadSettings();
  }, [loadSettings, newCategoryName]);

  const saveTheme = useCallback((id: number, name: string, color: string) => {
    void updateTheme(id, name, color).then(loadSettings);
  }, [loadSettings]);

  const removeTheme = useCallback((id: number) => {
    void deleteTheme(id).then(loadSettings);
  }, [loadSettings]);

  const saveCategory = useCallback((id: number, name: string) => {
    void updateCategory(id, name).then(loadSettings);
  }, [loadSettings]);

  const removeCategory = useCallback((id: number) => {
    void deleteCategory(id).then(loadSettings);
  }, [loadSettings]);

  return {
    settings,
    categories,
    themes,
    themeEdits,
    setThemeEdits,
    categoryEdits,
    setCategoryEdits,
    newThemeName,
    setNewThemeName,
    newThemeColor,
    setNewThemeColor,
    newCategoryName,
    setNewCategoryName,
    jsonFieldDrafts,
    setJsonFieldDrafts,
    loadSettings,
    saveJsonFieldSettings,
    createThemeFromSettings,
    createCategoryFromSettings,
    saveTheme,
    removeTheme,
    saveCategory,
    removeCategory
  };
}
