import { Activity, ShieldCheck, X } from "lucide-react";

export default function Sidebar({
  routes,
  activeRoute,
  sidebarOpen,
  setSidebarOpen,
  setActiveRoute
}) {
  return (
    <>
      {sidebarOpen ? (
        <button
          className="mobile-overlay mobile-only"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <Activity size={23} />
            </div>
            <div>
              <h1>Reality Engine X</h1>
              <p>Diet intelligence</p>
            </div>
          </div>

          <button
            className="icon-button mobile-only"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {routes
            .filter((route) => !route.hideInSidebar)
            .map((route) => {
              const Icon = route.icon;
              const isActive = route.key === activeRoute;

              return (
                <button
                  key={route.key}
                  className={`nav-item${isActive ? " active" : ""}`}
                  onClick={() => setActiveRoute(route.key)}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={19} />
                  <span>{route.label}</span>
                </button>
              );
            })}
        </nav>

        <article className="sidebar-card">
          <ShieldCheck size={24} />
          <h3>Failure prevention</h3>
          <p>
            The engine watches stress, sleep, cravings, activity, and adherence
            together so risk signals are visible before they become setbacks.
          </p>
        </article>
      </aside>
    </>
  );
}
