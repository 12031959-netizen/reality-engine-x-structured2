import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  children,
  routes,
  activeRoute,
  setActiveRoute
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("nav-open", sidebarOpen);

    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [sidebarOpen]);

  function handleRouteChange(routeKey) {
    setActiveRoute(routeKey);
    setSidebarOpen(false);
  }

  return (
    <div className={`app-shell${sidebarOpen ? " sidebar-active" : ""}`}>
      <Sidebar
        routes={routes}
        activeRoute={activeRoute}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setActiveRoute={handleRouteChange}
      />

      <main className="main-area">
        <Header
          routes={routes}
          activeRoute={activeRoute}
          setActiveRoute={handleRouteChange}
          setSidebarOpen={setSidebarOpen}
        />

        <section className="page-container">{children}</section>
      </main>
    </div>
  );
}
