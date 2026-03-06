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
      <div className="side-menu-brand">
        <span className="side-menu-brand-icon">📈</span>
        <span className="side-menu-brand-text">TickerBase</span>
      </div>

      <nav className="side-menu-nav">
        <button
          className={`menu-item ${activeModule === "stockModule" ? "active" : ""}`}
          onClick={() => onSelectModule("stockModule")}
          title="Stock"
        >
          <span className="menu-icon">≡</span>
          <span className="menu-label">Stock</span>
        </button>
        <button
          className={`menu-item ${activeModule === "watchlistModule" ? "active" : ""}`}
          onClick={() => onSelectModule("watchlistModule")}
          title="Watchlist"
        >
          <span className="menu-icon">★</span>
          <span className="menu-label">Watchlist</span>
        </button>
        <button
          className={`menu-item ${activeModule === "settingsModule" ? "active" : ""}`}
          onClick={() => onSelectModule("settingsModule")}
          title="Settings"
        >
          <span className="menu-icon">⚙</span>
          <span className="menu-label">Settings</span>
        </button>
      </nav>

      <div className="side-menu-footer">
        <button className="menu-toggle" onClick={onToggleCollapse} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? "»" : "«"}
        </button>
      </div>
    </aside>
  );
}
