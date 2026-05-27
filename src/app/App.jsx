import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import routes from "./routes";
import NotFound from "../components/shared/NotFound";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import Login from "../features/auth/pages/Login";
import Onboarding from "../features/onboarding/pages/Onboarding";
import Signup from "../features/auth/pages/Signup";
import Welcome from "../features/auth/pages/Welcome";
import { useAuth } from "../hooks/useAuth";

export default function App() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() === "admin" ? "admin" : "user";
  const [activeRoute, setActiveRoute] = useState(userRole === "admin" ? "admin" : "dashboard");
  const [authRoute, setAuthRoute] = useState("welcome");
  const availableRoutes = useMemo(() => {
    return routes.filter((route) => !route.roles || route.roles.includes(userRole));
  }, [userRole]);

  const currentRoute = useMemo(() => {
    return (
      availableRoutes.find((route) => route.key === activeRoute) ||
      availableRoutes[0]
    );
  }, [availableRoutes, activeRoute]);

  const Page = currentRoute?.component || NotFound;

  useEffect(() => {
    if (!user) {
      setActiveRoute("dashboard");
      return;
    }

    const canAccessActiveRoute = availableRoutes.some(
      (route) => route.key === activeRoute
    );

    if (!canAccessActiveRoute) {
      setActiveRoute(userRole === "admin" ? "admin" : "dashboard");
    }
  }, [user, userRole, availableRoutes, activeRoute]);

  if (!user) {
    const AuthPage =
      authRoute === "signup"
        ? Signup
        : authRoute === "forgot"
          ? ForgotPassword
          : authRoute === "login"
            ? Login
            : Welcome;

    return <AuthPage setAuthRoute={setAuthRoute} />;
  }

  if (user.role?.toLowerCase() !== "admin" && !user.dietProfile?.completed) {
    return <Onboarding />;
  }

  return (
    <DashboardLayout
      routes={availableRoutes}
      activeRoute={activeRoute}
      setActiveRoute={setActiveRoute}
    >
      <Page setActiveRoute={setActiveRoute} />
    </DashboardLayout>
  );
}
