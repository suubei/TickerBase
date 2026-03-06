import { useEffect } from "react";

type TradingViewAdvancedChartProps = {
  symbol: string;
};

export function TradingViewAdvancedChart({ symbol }: TradingViewAdvancedChartProps) {
  useEffect(() => {
    const host = document.getElementById("tv-advanced-chart-container");
    if (!host) return;
    host.innerHTML = "";
    const normalizedSymbol = symbol.includes(":") ? symbol : (symbol ? `NASDAQ:${symbol}` : "NASDAQ:AAPL");

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "9",
      symbol: normalizedSymbol,
      theme: "light",
      timezone: "exchange",
      backgroundColor: "#ffffff",
      gridColor: "rgba(46, 46, 46, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      support_host: "https://www.tradingview.com"
    });
    host.appendChild(script);
  }, [symbol]);

  return (
    <div id="tv-advanced-chart-container" className="tv-widget-host" />
  );
}
