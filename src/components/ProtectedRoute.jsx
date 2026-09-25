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
    // If root route "/" itself is denied, redirecting to "/" causes an infinite redirect loop (blank screen).
    // In that scenario, fallback to a safe path or login.
    if (location.pathname === "/") {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>
          <h2>Access Denied: You do not have permission to access the Dashboard.</h2>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
