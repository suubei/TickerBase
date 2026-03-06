import type { CategoryItem as CategoryItemBase, ThemeItem as ThemeItemBase } from "../types";

export type ThemeItem = ThemeItemBase;
export type CategoryItem = CategoryItemBase;

export type JsonFieldDraft = {
  key: string;
  label: string;
  isVisible: boolean;
  position: number;
};
