import { useEffect, useRef } from "react";

/**
 * Built-in study: either a compact id string (e.g. `"STD;SMA"`), or an object with
 * `id` plus optional `inputs` (parameter ids depend on each indicator — often `length`, etc.).
 * @see https://stackoverflow.com/questions/65940103/how-to-override-the-studies-of-the-tradingview-widget
 */
export type TradingViewStudyConfig =
  | string
  | {
      id: string;
      version?: number;
      inputs?: Record<string, string | number | boolean>;
    };

type TradingViewAdvancedChartProps = {
  symbol: string;
  /** Default: MA Ribbon + SMA. Pass `[]` for no preset studies. */
  studies?: TradingViewStudyConfig[];
  /** Style/value overrides. SMA line color: `"moving average.ma.color"` (first MA), `"moving average_1.ma.color"` (second), … */
  studiesOverrides?: Record<string, string | number>;
  /**
   * Shorthand for moving-average line colors in chart order (first study → `moving average`, next → `moving average_1`, …).
   * With MA Ribbon + SMA, indices may not match “only the last SMA” — prefer explicit `studies` + `studiesOverrides` if needed.
   */
  movingAverageColors?: string[];
};

const WIDGET_ID = "tickerbase-advanced-chart";

const DEFAULT_STUDIES: TradingViewStudyConfig[] = ["STD;MA%Ribbon", "STD;SMA"];

/** Maps to TradingView `studies_overrides` keys (Insert Study name lowercased: “Moving Average” → `moving average`). */
function movingAverageColorOverrides(colors: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  colors.forEach((color, i) => {
    const prefix = i === 0 ? "moving average" : `moving average_${i}`;
    out[`${prefix}.ma.color`] = color;
  });
  return out;
}

function normalizeSymbol(raw: string): string {
  return raw.includes(":") ? raw : raw || "AAPL";
}

export function TradingViewAdvancedChart({
  symbol,
  studies,
  studiesOverrides,
  movingAverageColors
}: TradingViewAdvancedChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  const studiesForWidget = studies !== undefined ? studies : DEFAULT_STUDIES;
  const maColorOverrides =
    movingAverageColors && movingAverageColors.length > 0
      ? movingAverageColorOverrides(movingAverageColors)
      : {};
  const studiesOverridesMerged = {
    ...maColorOverrides,
    ...(studiesOverrides ?? {})
  };
  const studiesConfigKey = JSON.stringify(studiesForWidget);
  const studiesOverridesKey = JSON.stringify(studiesOverridesMerged);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const getIframe = () => host.querySelector("iframe");

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.name !== "tv-widget-load") return;
      if (data.frameElementId && data.frameElementId !== WIDGET_ID) return;
      const iframe = getIframe();
      if (iframe?.contentWindow !== event.source) return;

      loadedRef.current = true;
      postSetSymbol(host, symbolRef.current);
    };

    window.addEventListener("message", onMessage);

    host.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetOptions: Record<string, unknown> = {
      id: WIDGET_ID,
      autosize: true,
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "9",
      symbol: normalizeSymbol(symbolRef.current),
      theme: "light",
      timezone: "exchange",
      backgroundColor: "#ffffff",
      gridColor: "rgba(46, 46, 46, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: studiesForWidget,
      support_host: "https://www.tradingview.com"
    };
    if (Object.keys(studiesOverridesMerged).length > 0) {
      widgetOptions.studies_overrides = studiesOverridesMerged;
    }

    script.innerHTML = JSON.stringify(widgetOptions);
    host.appendChild(script);

    return () => {
      window.removeEventListener("message", onMessage);
      loadedRef.current = false;
      host.innerHTML = "";
    };
  }, [studiesConfigKey, studiesOverridesKey]);

  useEffect(() => {
    if (!loadedRef.current) return;
    postSetSymbol(hostRef.current, symbol);
  }, [symbol]);

  return <div ref={hostRef} className="tv-widget-host" />;
}

function postSetSymbol(host: HTMLDivElement | null, sym: string) {
  const win = host?.querySelector("iframe")?.contentWindow;
  if (!win) return;
  win.postMessage({ name: "set-symbol", data: { symbol: normalizeSymbol(sym) } }, "*");
}
