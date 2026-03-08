import { useCallback, useState, type MouseEvent } from "react";
import { createCategory, createTheme, deleteCategory, deleteTheme, updateCategory, updateStockTags, updateTheme } from "../../api";
import type { SettingsPayload, Stock } from "../../types";

type TagKind = "theme" | "category";

type TagDropdownState = {
  stock: Stock;
  kind: TagKind;
  left: number;
  top: number;
  selectedValues: string[];
};

function toggleValue(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

type UseTagEditorModuleOptions = {
  onMessage: (message: string) => void;
  settings: SettingsPayload;
  reloadStocks: () => Promise<void>;
  reloadSettings: () => Promise<void>;
};

export function useTagEditorModule({ onMessage, settings, reloadStocks, reloadSettings }: UseTagEditorModuleOptions) {
  const [tagDropdown, setTagDropdown] = useState<TagDropdownState | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const openTagDropdown = useCallback((stock: Stock, kind: TagKind, event: MouseEvent<HTMLTableCellElement>) => {
    event.stopPropagation();
    const selectedValues = kind === "theme" ? stock.themes : stock.categories;
    setNewTagName("");
    setTagSearch("");
    setTagDropdown({
      stock,
      kind,
      selectedValues,
      left: Math.min(event.clientX + 8, window.innerWidth - 320),
      top: Math.min(event.clientY + 8, window.innerHeight - 360)
    });
  }, []);

  const persistTagDropdown = useCallback(async (nextValues: string[]) => {
    if (!tagDropdown) return;
    const payload =
      tagDropdown.kind === "theme"
        ? { themes: nextValues, categories: tagDropdown.stock.categories }
        : { themes: tagDropdown.stock.themes, categories: nextValues };

    await updateStockTags(tagDropdown.stock.ticker, payload);
    await reloadStocks();
  }, [reloadStocks, tagDropdown]);

  const toggleTagFromDropdown = useCallback(async (value: string) => {
    if (!tagDropdown) return;
    const nextValues = toggleValue(tagDropdown.selectedValues, value);
    setTagDropdown((prev) => (prev ? { ...prev, selectedValues: nextValues } : null));
    try {
      await persistTagDropdown(nextValues);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to update tags");
    }
  }, [onMessage, persistTagDropdown, tagDropdown]);

  const renameTagFromDropdown = useCallback(async (oldName: string, newName: string) => {
    if (!tagDropdown || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    try {
      if (tagDropdown.kind === "theme") {
        const item = settings.themes.find((t) => t.name === oldName);
        if (item) await updateTheme(item.id, trimmed, item.color);
      } else {
        const item = settings.categories.find((c) => c.name === oldName);
        if (item) await updateCategory(item.id, trimmed);
      }
      await reloadSettings();
      // Update selectedValues if the renamed tag was selected
      const nextValues = tagDropdown.selectedValues.map((v) => (v === oldName ? trimmed : v));
      setTagDropdown((prev) => (prev ? { ...prev, selectedValues: nextValues } : null));
      if (nextValues.join() !== tagDropdown.selectedValues.join()) {
        await persistTagDropdown(nextValues);
      }
      await reloadStocks();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to rename tag");
    }
  }, [onMessage, persistTagDropdown, reloadSettings, reloadStocks, settings, tagDropdown]);

  const deleteTagFromDropdown = useCallback(async (name: string) => {
    if (!tagDropdown) return;
    try {
      if (tagDropdown.kind === "theme") {
        const item = settings.themes.find((t) => t.name === name);
        if (item) await deleteTheme(item.id);
      } else {
        const item = settings.categories.find((c) => c.name === name);
        if (item) await deleteCategory(item.id);
      }
      await reloadSettings();
      // Remove from current stock's selected values if present
      const nextValues = tagDropdown.selectedValues.filter((v) => v !== name);
      if (nextValues.length !== tagDropdown.selectedValues.length) {
        setTagDropdown((prev) => (prev ? { ...prev, selectedValues: nextValues } : null));
        await persistTagDropdown(nextValues);
      }
      await reloadStocks();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to delete tag");
    }
  }, [onMessage, persistTagDropdown, reloadSettings, reloadStocks, settings, tagDropdown]);

  const createTagFromDropdown = useCallback(async () => {
    if (!tagDropdown || !newTagName.trim()) return;
    const name = newTagName.trim();
    try {
      if (tagDropdown.kind === "theme") {
        await createTheme(name, "#9CA3AF");
      } else {
        await createCategory(name);
      }
      await reloadSettings();
      const nextValues = tagDropdown.selectedValues.includes(name)
        ? tagDropdown.selectedValues
        : [...tagDropdown.selectedValues, name];
      setTagDropdown((prev) => (prev ? { ...prev, selectedValues: nextValues } : null));
      await persistTagDropdown(nextValues);
      setNewTagName("");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to create tag");
    }
  }, [newTagName, onMessage, persistTagDropdown, reloadSettings, tagDropdown]);

  return {
    tagDropdown,
    setTagDropdown,
    newTagName,
    setNewTagName,
    tagSearch,
    setTagSearch,
    openTagDropdown,
    toggleTagFromDropdown,
    renameTagFromDropdown,
    deleteTagFromDropdown,
    createTagFromDropdown,
    settings
  };
}
