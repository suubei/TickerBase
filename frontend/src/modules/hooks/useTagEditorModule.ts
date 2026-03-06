import { useCallback, useState, type MouseEvent } from "react";
import { createCategory, createTheme, updateStockTags } from "../../api";
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
    createTagFromDropdown,
    settings
  };
}
