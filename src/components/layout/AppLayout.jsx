import React, { useState } from "react";
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { navigationItems } from "../../config/menuConfig";
import { getRightsForPath } from "../../utils/rightsHelper";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppButton from "../common/AppButton";
import AppImageUpload from "../common/AppImageUpload";
import { useAppToast } from "../common/AppToast";
import { getImageUrl } from "../../services/apiClient";

const drawerWidth = 240;

// ─── Sidebar colours (matches table header #4a3f6b family) ──────────────────
const SIDEBAR = {
  bg: "#1e1a2e",   // Very dark purple-navy
  active: "#4a3f6b",   // Mid purple — exact table header
  activeBg: "rgba(74, 63, 107, 0.25)",
  hover: "rgba(255, 255, 255, 0.05)",
  text: "#c4bde0",   // Muted lavender
  activeText: "#ffffff",
  icon: "#7b72a8",   // Faded purple icon
  activeIcon: "#c4bde0",
  divider: "rgba(255,255,255,0.08)",
  logoutHover: "rgba(220,38,38,0.15)",
};

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [masterOpen, setMasterOpen] = useState(false);
  const { authState, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    profileImage: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Sync profileForm with authState when dialog opens
  React.useEffect(() => {
    if (profileDialogOpen && authState) {
      setProfileForm({
        fullName: authState.fullName || "",
        email: authState.email || "",
        profileImage: authState.profileImage || "",
      });
      setProfileErrors({});
    }
  }, [profileDialogOpen, authState]);

  const handleSaveProfile = async () => {
    const errors = {};
    if (!profileForm.fullName?.trim()) {
      errors.fullName = "Full Name is required";
    }
    if (!profileForm.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      errors.email = "Invalid email address";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error("Please correct the errors before saving");
      return;
    }

    try {
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        profileImage: profileForm.profileImage,
      });

      toast.success("Profile updated successfully!");
      setProfileDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to update profile");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isChildActive = (item) => {
    return item.children?.some(child => location.pathname === child.path);
  };

  const renderNavItem = (item, isChild = false) => {
    if (item.adminOnly && authState?.role !== "Admin") return null;

    if (item.path) {
      const rights = getRightsForPath(item.path, authState?.role);
      if (rights.deny) return null;
    }

    if (item.children) {
      const allChildrenDenied = item.children.every(child => {
        const rights = getRightsForPath(child.path, authState?.role);
        return rights.deny;
      });
      if (allChildrenDenied) return null;

      const open = masterOpen;
      const active = isChildActive(item);

      return (
        <React.Fragment key={item.id}>
          <ListItemButton
            onClick={() => setMasterOpen(!open)}
            sx={{
              borderRadius: "8px",
              mb: 0.3,
              py: 0.9,
              px: 1.5,
              color: active ? SIDEBAR.activeText : SIDEBAR.text,
              bgcolor: active ? "rgba(255,255,255,0.02)" : "transparent",
              "& .MuiListItemIcon-root": { color: active ? SIDEBAR.activeIcon : SIDEBAR.icon },
              "&:hover": { bgcolor: SIDEBAR.hover },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: active ? 700 : 600 }}
            />
            {open ? <ExpandLess sx={{ fontSize: "1rem" }} /> : <ExpandMore sx={{ fontSize: "1rem" }} />}
          </ListItemButton>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2.5 }}>
              {item.children.map((child) => renderNavItem(child, true))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    const active = location.pathname === item.path;
    return (
      <ListItemButton
        key={item.path}
        onClick={() => { navigate(item.path); setMobileOpen(false); }}
        selected={active}
        sx={{
          borderRadius: "8px",
          mb: 0.3,
          py: isChild ? 0.6 : 0.9,
          px: 1.5,
          "&.Mui-selected": {
            bgcolor: SIDEBAR.activeBg,
            borderLeft: `3px solid ${SIDEBAR.active}`,
            pl: "calc(12px - 3px)",
            "& .MuiListItemIcon-root": { color: SIDEBAR.activeIcon },
            "& .MuiListItemText-primary": { color: SIDEBAR.activeText, fontWeight: 700 },
            "&:hover": { bgcolor: SIDEBAR.activeBg },
          },
          "&:not(.Mui-selected)": {
            borderLeft: "3px solid transparent",
            "& .MuiListItemIcon-root": { color: SIDEBAR.icon },
            "& .MuiListItemText-primary": { color: SIDEBAR.text },
          },
          "&:hover": { bgcolor: SIDEBAR.hover },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: isChild ? "0.82rem" : "0.85rem",
            fontWeight: isChild ? 500 : 600
          }}
        />
      </ListItemButton>
    );
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: SIDEBAR.bg }}>

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <Box sx={{ px: 2.5, py: 3, display: "flex", alignItems: "center", gap: 1.8 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: "10px",
          bgcolor: "#ffffff", display: "flex",
          alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(74,63,107,0.1)",
          p: 0.5
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 900, color: "#ffffff", lineHeight: 1, fontSize: "0.95rem", letterSpacing: "0.02em" }}>
            Contribution
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: "#a78bfa", lineHeight: 1.3, fontSize: "0.88rem", letterSpacing: "0.01em" }}>
            Management
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: SIDEBAR.divider, mx: 2, mb: 1 }} />

      {/* ── Nav Items ─────────────────────────────────────────────────────── */}
      <List sx={{ px: 1.5, flexGrow: 1, py: 0 }}>
        {navigationItems.map((item) => renderNavItem(item))}
      </List>

      <Divider sx={{ borderColor: SIDEBAR.divider, mx: 2, mt: 1 }} />

      {/* ── User Card + Logout ────────────────────────────────────────────── */}
      <Box sx={{ px: 1.5, py: 1.5 }}>
        {/* User info row */}
        <Box
          onClick={() => setProfileDialogOpen(true)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            px: 1,
            py: 0.8,
            mb: 0.5,
            borderRadius: "8px",
            cursor: "pointer",
            "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
            transition: "all 0.15s ease"
          }}
        >
          <Avatar src={getImageUrl(authState?.profileImage)} sx={{ width: 34, height: 34, bgcolor: SIDEBAR.active, fontSize: "0.85rem", fontWeight: 800 }}>
            {(authState?.fullName ?? "A")[0].toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden", flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={800} sx={{ color: "#ffffff", fontSize: "0.82rem" }} noWrap>
              {authState?.fullName?.split(" ")[0] ?? "User"}
            </Typography>
            <Typography variant="caption" sx={{ color: SIDEBAR.text, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase" }} noWrap>
              {authState?.role}
            </Typography>
          </Box>
          <Tooltip title="Log Out">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening profile modal!
                handleLogout();
              }}
              sx={{
                color: SIDEBAR.text,
                p: 0.8,
                borderRadius: "6px",
                "&:hover": { bgcolor: SIDEBAR.logoutHover, color: "#f87171" },
                transition: "all 0.2s ease",
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f4fb" }}>
      {/* Mobile hamburger */}
      <Box sx={{ display: { xs: "flex", md: "none" }, position: "fixed", top: 12, left: 12, zIndex: 1300 }}>
        <IconButton
          onClick={() => setMobileOpen(true)}
          sx={{ bgcolor: SIDEBAR.bg, color: "#fff", borderRadius: "8px", "&:hover": { bgcolor: SIDEBAR.active } }}
        >
          <MenuRoundedIcon />
        </IconButton>
      </Box>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, minWidth: { md: drawerWidth }, flexShrink: 0 }}>
        {/* Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", border: "none" },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              border: "none",
              boxShadow: "2px 0 16px rgba(0,0,0,0.12)",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0, // Prevent table from overflowing flexbox
          minHeight: "100vh",
          bgcolor: "#f5f4fb",
        }}
      >
        <Outlet />
      </Box>

      {/* ── Profile Dialog ────────────────────────────────────────────────── */}
      <AppDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        title="My Profile"
        maxWidth="xs"
        actions={
          <>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
            >
              Save Changes
            </AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setProfileDialogOpen(false)}>
              Cancel
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1, pb: 1 }}>
          <AppImageUpload
            value={getImageUrl(profileForm.profileImage)}
            onChange={(base64) => setProfileForm((prev) => ({ ...prev, profileImage: base64 }))}
            nameInitials={(profileForm.fullName || authState?.fullName || "U")[0].toUpperCase()}
            size={110}
            helperText="Click or hover to change profile picture"
          />

          <AppInput
            label="Name"
            value={profileForm.fullName}
            onChange={(e) => {
              setProfileForm((prev) => ({ ...prev, fullName: e.target.value }));
              if (profileErrors.fullName) setProfileErrors((prev) => ({ ...prev, fullName: "" }));
            }}
            error={!!profileErrors.fullName}
            helperText={profileErrors.fullName}
            required
          />

          <AppInput
            label="Email "
            type="email"
            value={profileForm.email}
            onChange={(e) => {
              setProfileForm((prev) => ({ ...prev, email: e.target.value }));
              if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: "" }));
            }}
            error={!!profileErrors.email}
            helperText={profileErrors.email}
            required
          />

          <AppInput
            label="Role"
            value={authState?.role || "Member"}
            disabled
            helperText="System role is managed by administrator"
          />
        </Box>
      </AppDialog>
    </Box>
  );
}
