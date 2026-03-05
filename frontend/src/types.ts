export type ReportMeta = {
  id: number;
  stockId: number;
  filePath: string;
  generatedAt: string;
  version: number;
};

export type Stock = {
  id: number;
  ticker: string;
  companyName: string | null;
  summary: string | null;
  risk: string | null;
  catalyst: string | null;
  themes: string[];
  categories: string[];
  themeBenefit: string | null;
  themePhase: number | null;
  rawJson: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestReport: ReportMeta | null;
  watchlists: string[];
};

export type StocksQuery = {
  page: number;
  pageSize: number;
  search?: string;
  theme?: string;
  category?: string;
  watchlist?: string;
  archived?: "all" | "active" | "archived";
  sortKey?: string;
  sortOrder?: "asc" | "desc";
};

export type StocksPage = {
  items: Stock[];
  total: number;
  page: number;
  pageSize: number;
};

export type Watchlist = {
  id: number;
  name: string;
  createdAt: string;
  tickers: string[];
};

export type ThemeItem = {
  id: number;
  name: string;
  color: string;
};

export type CategoryItem = {
  id: number;
  name: string;
};

export type TableFieldConfig = {
  id: number;
  key: string;
  label: string;
  isVisible: boolean;
  position: number;
};

export type SettingsPayload = {
  themes: ThemeItem[];
  categories: CategoryItem[];
  tableFields: TableFieldConfig[];
  jsonKeys: string[];
};
