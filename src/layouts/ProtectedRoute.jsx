import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingState from "../components/ui/LoadingState";

export default function ProtectedRoute({ role }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingState fullHeight label="Preparing your Sadhana space…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === "admin" ? "/admin/dashboard" : "/devotee/dashboard"} replace />;
  }

  return <Outlet />;
}
