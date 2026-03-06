import { useEffect, useMemo } from "react";
import { defaultCoreColumns, type ColumnConfig } from "../stockTableConfig";
import type { JsonFieldDraft } from "../settingsTypes";

type UseAppBootstrapOptions = {
  jsonFieldDrafts: JsonFieldDraft[];
  watchlistFilter: string;
  watchlistNames: string[];
  setWatchlistFilter: (value: string) => void;
  loadWatchlists: () => Promise<void>;
  loadSettings: () => Promise<void>;
};

export function useAppBootstrap({
  jsonFieldDrafts,
  watchlistFilter,
  watchlistNames,
  setWatchlistFilter,
  loadWatchlists,
  loadSettings
}: UseAppBootstrapOptions) {
  useEffect(() => {
    if (watchlistFilter && !watchlistNames.includes(watchlistFilter)) {
      setWatchlistFilter("");
    }
  }, [setWatchlistFilter, watchlistFilter, watchlistNames]);

  useEffect(() => {
    void loadWatchlists();
    void loadSettings();
  }, [loadSettings, loadWatchlists]);

  const activeJsonColumns = useMemo<ColumnConfig[]>(
    () =>
      jsonFieldDrafts
        .filter((item) => item.isVisible)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ key: item.key, label: item.label, source: "json" })),
    [jsonFieldDrafts]
  );

  const visibleColumns = useMemo(
    () => [...defaultCoreColumns, ...activeJsonColumns],
    [activeJsonColumns]
  );

  return { visibleColumns };
}
