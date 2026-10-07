import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Paper, Stack, Chip } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useAuth } from "../contexts/AuthContext";
import { getRightsForPath, getFirstAccessiblePath } from "../utils/rightsHelper";

export default function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, authState, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const activeRole = authState?.role || authState?.roleName;

  // 1. Hardcoded role checks if specified
  if (roles.length > 0 && !roles.some(r => r.toLowerCase() === String(activeRole || "").toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  // 2. Dynamic rights mapping checks from configurator
  const rights = getRightsForPath(location.pathname, activeRole);
  if (rights.deny) {
    // If current route is denied, check if any other route is accessible for this user
    const firstAllowed = getFirstAccessiblePath(activeRole);
    if (firstAllowed && firstAllowed !== location.pathname) {
      return <Navigate to={firstAllowed} replace />;
    }

    // If completely locked out or current path has no accessible alternatives:
    // Render a modern, user-friendly Access Restricted UI with logout and recovery actions
    const roleLower = String(activeRole || "").toLowerCase();
    const isAdmin = roleLower === "admin";
    const userName = authState?.user?.name || authState?.name || "User";

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          p: 3,
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            width: "100%",
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            textAlign: "center"
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto"
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 32 }} />
          </Box>

          <Chip
            label={activeRole ? `Role: ${activeRole}` : "Access Restricted"}
            size="small"
            sx={{
              mb: 2,
              fontWeight: 600,
              backgroundColor: "#fee2e2",
              color: "#991b1b"
            }}
          />

          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 1 }}>
            Access Restricted
          </Typography>

          <Typography variant="body2" sx={{ color: "#64748b", mb: 3, lineHeight: 1.6 }}>
            Hello <strong>{userName}</strong>, you do not have permission to access this module.
            Your permissions have been set to <strong>Deny</strong> by an administrator.
          </Typography>

          <Stack spacing={1.5}>
            {isAdmin && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AdminPanelSettingsRoundedIcon />}
                onClick={() => navigate("/user-rights")}
                sx={{
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "none"
                }}
              >
                Open User Rights Manager
              </Button>
            )}

            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutRoundedIcon />}
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              sx={{
                py: 1.2,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600
              }}
            >
              Log Out & Sign In with Different Account
            </Button>

            <Button
              variant="text"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => window.location.reload()}
              sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: 500
              }}
            >
              Refresh Permissions
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return children;
}

