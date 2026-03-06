import type { Stock } from "../types";

export type CoreColumnKey =
  | "ticker"
  | "category"
  | "summary"
  | "theme"
  | "themeBenefit"
  | "themePhase"
  | "catalyst"
  | "risk"
  | "updatedAt";

export type ColumnConfig = {
  key: string;
  label: string;
  source: "core" | "json";
};

export const defaultCoreColumns: ColumnConfig[] = [
  { key: "ticker", label: "Ticker", source: "core" },
  { key: "category", label: "Category", source: "core" },
  { key: "theme", label: "Theme", source: "core" },
  { key: "themePhase", label: "Phase", source: "core" },
  { key: "summary", label: "Summary", source: "core" },
  { key: "themeBenefit", label: "Benefit", source: "core" },
  { key: "catalyst", label: "Catalyst", source: "core" },
  { key: "risk", label: "Risk", source: "core" },
  { key: "updatedAt", label: "Updated", source: "core" }
];

export function getCoreValue(stock: Stock, key: string): unknown {
  const normalized = key as CoreColumnKey;
  switch (normalized) {
    case "ticker":
      return stock.ticker;
    case "summary":
      return stock.summary;
    case "category":
      return stock.categories.join(", ");
    case "theme":
      return stock.themes.join(", ");
    case "themeBenefit":
      return stock.themeBenefit;
    case "themePhase":
      return stock.themePhase;
    case "catalyst":
      return stock.catalyst;
    case "risk":
      return stock.risk;
    case "updatedAt":
      return stock.updatedAt;
    default:
      return "";
  }
}

export function formatCellValue(key: string, value: unknown): string {
  if (key === "updatedAt") {
    return value ? new Date(String(value)).toLocaleDateString() : "-";
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined || value === "") return "-";
  return JSON.stringify(value);
}
