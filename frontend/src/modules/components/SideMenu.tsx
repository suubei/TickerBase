import type { ActiveModule } from "../types";

type SideMenuProps = {
  isCollapsed: boolean;
  activeModule: ActiveModule;
  onToggleCollapse: () => void;
  onSelectModule: (module: ActiveModule) => void;
};

export function SideMenu({ isCollapsed, activeModule, onToggleCollapse, onSelectModule }: SideMenuProps) {
  return (
    <aside className={`side-menu ${isCollapsed ? "collapsed" : ""}`}>
      <button className="menu-toggle" onClick={onToggleCollapse}>
        {isCollapsed ? "»" : "«"}
      </button>
      <button
        className={`menu-item ${activeModule === "stockModule" ? "active" : ""}`}
        onClick={() => onSelectModule("stockModule")}
        title="Stock"
      >
        <span>Stock</span>
      </button>
      <button
        className={`menu-item ${activeModule === "watchlistModule" ? "active" : ""}`}
        onClick={() => onSelectModule("watchlistModule")}
        title="Watchlist"
      >
        <span>Watchlist</span>
      </button>
      <button
        className={`menu-item ${activeModule === "settingModule" ? "active" : ""}`}
        onClick={() => onSelectModule("settingModule")}
        title="Setting"
      >
        <span>Setting</span>
      </button>
    </aside>
  );
}
