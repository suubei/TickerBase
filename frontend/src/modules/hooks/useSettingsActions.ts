import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CategoryItem, JsonFieldDraft, ThemeItem } from "../settingsTypes";

type UseSettingsActionsOptions = {
  setThemeEdits: Dispatch<SetStateAction<ThemeItem[]>>;
  setCategoryEdits: Dispatch<SetStateAction<CategoryItem[]>>;
  setJsonFieldDrafts: Dispatch<SetStateAction<JsonFieldDraft[]>>;
  createThemeFromSettings: () => Promise<void>;
  createCategoryFromSettings: () => Promise<void>;
  saveJsonFieldSettings: () => Promise<void>;
};

export function useSettingsActions({
  setThemeEdits,
  setCategoryEdits,
  setJsonFieldDrafts,
  createThemeFromSettings,
  createCategoryFromSettings,
  saveJsonFieldSettings
}: UseSettingsActionsOptions) {
  const onCreateTheme = useCallback(() => {
    void createThemeFromSettings();
  }, [createThemeFromSettings]);

  const onThemeEditChange = useCallback((id: number, patch: Partial<ThemeItem>) => {
    setThemeEdits((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, [setThemeEdits]);

  const onCreateCategory = useCallback(() => {
    void createCategoryFromSettings();
  }, [createCategoryFromSettings]);

  const onCategoryEditChange = useCallback((id: number, name: string) => {
    setCategoryEdits((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));
  }, [setCategoryEdits]);

  const onJsonFieldVisibleChange = useCallback((index: number, visible: boolean) => {
    setJsonFieldDrafts((prev) => prev.map((field, i) => (i === index ? { ...field, isVisible: visible } : field)));
  }, [setJsonFieldDrafts]);

  const onJsonFieldLabelChange = useCallback((index: number, label: string) => {
    setJsonFieldDrafts((prev) => prev.map((field, i) => (i === index ? { ...field, label } : field)));
  }, [setJsonFieldDrafts]);

  const onSaveJsonFields = useCallback(() => {
    void saveJsonFieldSettings();
  }, [saveJsonFieldSettings]);

  return {
    onCreateTheme,
    onThemeEditChange,
    onCreateCategory,
    onCategoryEditChange,
    onJsonFieldVisibleChange,
    onJsonFieldLabelChange,
    onSaveJsonFields
  };
}
