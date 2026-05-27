import { Bell, LogOut, Menu, Moon, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

const searchHints = {
  admin: "admin users dashboards accounts overview all users",
  dashboard: "overview score calories protein sleep water risk",
  checkin: "daily check in mood food calories protein water sleep stress cravings notes",
  meals: "meal log food daily calories protein carbs fat macros calculator",
  wearable: "wearable phone apple watch health bluetooth heart rate steps active minutes",
  history: "daily history records saved check in mobile data every day calendar",
  analytics: "analytics chart progress trend score calories sleep mood",
  predictions: "predictions ai future risk recovery nutrition",
  assistant: "ai assistant diet food calories protein bmr meal health chat calculator",
  failure: "failure risk diet fail stress cravings sleep action plan",
  account: "user password account profile saved information diet person",
  feedback: "feedback bug feature message rating",
  notifications: "notifications reminders hourly mood food water email app",
  about: "about us mission app system",
  settings: "settings theme reminders privacy email notifications"
};

export default function Header({
  routes,
  activeRoute,
  setActiveRoute,
  setSidebarOpen
}) {
  const { account, logout, user } = useAuth();
  const { toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const notificationSource = (user?.role === "admin" ? user : account) || {};
  const notificationCount =
    notificationSource.notificationLog?.findIndex(
      (item) => item.id === notificationSource.lastSeenNotificationId
    ) ?? -1;
  const unreadNotificationCount =
    notificationCount === -1
      ? notificationSource.notificationLog?.length || 0
      : notificationCount;

  const currentRoute = routes.find((route) => route.key === activeRoute);
  const hasNotificationsRoute = routes.some((route) => route.key === "notifications");
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    return routes
      .filter((route) => !route.hideInSidebar)
      .map((route) => ({
        ...route,
        searchable: `${route.label} ${route.key} ${searchHints[route.key] || ""}`.toLowerCase()
      }))
      .filter((route) => route.searchable.includes(query))
      .slice(0, 5);
  }, [routes, searchQuery]);

  function openSearchResult(routeKey) {
    setActiveRoute(routeKey);
    setSearchQuery("");
  }

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>

        <div>
          <p className="eyebrow">Today&apos;s overview</p>
          <h2>{currentRoute?.label || "Dashboard"}</h2>
        </div>
      </div>

      <div className="header-actions">
        <div className="search-wrap desktop-only">
          <div className="search-box">
            <Search size={16} />
            <input
              value={searchQuery}
              placeholder="Search pages or insights..."
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  openSearchResult(searchResults[0].key);
                }
              }}
            />
          </div>

          {searchQuery && (
            <div className="search-results">
              {searchResults.length === 0 ? (
                <div className="search-empty">No matching page found.</div>
              ) : (
                searchResults.map((route) => {
                  const Icon = route.icon;

                  return (
                    <button
                      key={route.key}
                      type="button"
                      onClick={() => openSearchResult(route.key)}
                    >
                      <Icon size={17} />
                      <span>{route.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">
          <Moon size={19} />
        </button>

        {hasNotificationsRoute && (
          <button
            className="icon-button notification-button"
            onClick={() => setActiveRoute("notifications")}
            aria-label={`Notifications (${unreadNotificationCount})`}
          >
            <Bell size={19} />
            {unreadNotificationCount > 0 && (
              <span className="notification-badge">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            )}
          </button>
        )}

        <button
          className="user-pill"
          type="button"
          onClick={() => setActiveRoute(user?.role === "admin" ? "admin" : "account")}
          aria-label="Open user dashboard"
        >
          <div className="avatar">{user?.name?.charAt(0) || "U"}</div>
          <div className="desktop-only">
            <strong>{user?.name}</strong>
            <span>{user?.username || user?.email}</span>
          </div>
        </button>

        <button className="icon-button" onClick={logout} aria-label="Logout">
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
