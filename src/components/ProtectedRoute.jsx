import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getRightsForPath } from "../utils/rightsHelper";

export default function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, authState } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 1. Hardcoded role checks if specified
  if (roles.length > 0 && !roles.includes(authState?.role)) {
    return <Navigate to="/" replace />;
  }

  // 2. Dynamic rights mapping checks from configurator
  const rights = getRightsForPath(location.pathname, authState?.role);
  if (rights.deny) {
    return <Navigate to="/" replace />;
  }

  return children;
}
