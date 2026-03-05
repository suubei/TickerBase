import type {
  CategoryItem,
  ReportMeta,
  SettingsPayload,
  Stock,
  StocksPage,
  StocksQuery,
  TableFieldConfig,
  ThemeItem,
  Watchlist
} from "./types";

const BASE_URL = "http://localhost:3000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body?.message || body?.error || "Request failed");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function importStock(payload: {
  ticker: string;
  originalTicker?: string;
  jsonPayload: string;
  markdownReport: string;
  action?: "update" | "skip";
}) {
  return request<{ ticker: string; updated: boolean; version: number } | { skipped: true; ticker: string }>(
    "/stocks/import",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function getStocks(query: StocksQuery) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.theme) params.set("theme", query.theme);
  if (query.category) params.set("category", query.category);
  if (query.watchlist) params.set("watchlist", query.watchlist);
  if (query.archived) params.set("archived", query.archived);
  if (query.sortKey) params.set("sortKey", query.sortKey);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  return request<StocksPage>(`/stocks?${params.toString()}`);
}

export async function getStockTickers(query: Omit<StocksQuery, "page" | "pageSize">) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.theme) params.set("theme", query.theme);
  if (query.category) params.set("category", query.category);
  if (query.watchlist) params.set("watchlist", query.watchlist);
  if (query.archived) params.set("archived", query.archived);
  if (query.sortKey) params.set("sortKey", query.sortKey);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  return request<{ tickers: string[]; total: number }>(`/stocks/tickers?${params.toString()}`);
}

export async function toggleArchive(ticker: string, archived: boolean) {
  return request<Stock>(`/stocks/${ticker}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived })
  });
}

export async function updateStockTags(ticker: string, payload: { themes: string[]; categories: string[] }) {
  return request<{ ticker: string; themes: string[]; categories: string[] }>(`/stocks/${ticker}/tags`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function getReports(ticker: string) {
  return request<ReportMeta[]>(`/stocks/${ticker}/reports`);
}

export async function getReportContent(reportId: number) {
  return request<{ content: string; generatedAt: string; version: number }>(`/reports/${reportId}/content`);
}

export async function createWatchlist(name: string, tickers: string[]) {
  return request<Watchlist>("/watchlists", {
    method: "POST",
    body: JSON.stringify({ name, tickers })
  });
}

export async function getWatchlists() {
  return request<Watchlist[]>("/watchlists");
}

export async function removeTickerFromWatchlist(watchlistId: number, ticker: string) {
  return request<void>(`/watchlists/${watchlistId}/stocks/${ticker}`, {
    method: "DELETE"
  });
}

export async function deleteWatchlist(watchlistId: number) {
  return request<void>(`/watchlists/${watchlistId}`, {
    method: "DELETE"
  });
}

export async function getSettings() {
  return request<SettingsPayload>("/settings");
}

export async function createTheme(name: string, color: string) {
  return request<ThemeItem>("/settings/themes", {
    method: "POST",
    body: JSON.stringify({ name, color })
  });
}

export async function updateTheme(id: number, name: string, color: string) {
  return request<ThemeItem>(`/settings/themes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, color })
  });
}

export async function deleteTheme(id: number) {
  return request<void>(`/settings/themes/${id}`, {
    method: "DELETE"
  });
}

export async function createCategory(name: string) {
  return request<CategoryItem>("/settings/categories", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export async function updateCategory(id: number, name: string) {
  return request<CategoryItem>(`/settings/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name })
  });
}

export async function deleteCategory(id: number) {
  return request<void>(`/settings/categories/${id}`, {
    method: "DELETE"
  });
}

export async function saveTableFields(fields: Array<Omit<TableFieldConfig, "id">>) {
  return request<TableFieldConfig[]>("/settings/table-fields", {
    method: "PUT",
    body: JSON.stringify({ fields })
  });
}
