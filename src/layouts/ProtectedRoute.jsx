import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingState from "../components/ui/LoadingState";

const DASHBOARD_BY_ROLE = {
  admin: "/admin/dashboard",
  mentor: "/mentor-dashboard",
  devotee: "/devotee/dashboard",
};

export default function ProtectedRoute({ role }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingState fullHeight label="Preparing your Sadhana space…" />;
  if (!isAuthenticated) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />;
  if (role && user?.role !== role) {
    return <Navigate to={DASHBOARD_BY_ROLE[user?.role] ?? "/devotee/dashboard"} replace />;
  }

  return <Outlet />;
}
