import { Navigate, Outlet, useLocation } from "react-router-dom";
import { is2FAPending, isAuthenticated } from "../../services/auth";

export default function ProtectedRoute() {
  const location = useLocation();

  if (is2FAPending()) {
    if (location.pathname === "/verify-2fa") return <Outlet />;
    return <Navigate to="/verify-2fa" replace />;
  }

  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}
