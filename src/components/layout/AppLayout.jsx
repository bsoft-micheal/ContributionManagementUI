import React, { useState, useRef } from "react";
import {
  Avatar,
  Box,
  ClickAwayListener,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Tooltip,
  Typography,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SaveIcon from "@mui/icons-material/Save";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../contexts/AuthContext";
import { navigationItems } from "../../config/menuConfig";
import { getRightsForPath } from "../../utils/rightsHelper";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppButton from "../common/AppButton";
import AppImageUpload from "../common/AppImageUpload";
import { useAppToast } from "../common/AppToast";
import { validateForm } from "../../utils/validation";
import { getImageUrl } from "../../services/apiClient";
import { GetProfileAsync } from "../../services/userService";
import { useThemeMode } from "../../contexts/ThemeModeContext";
import dayjs from "dayjs";
import logo from "../../assets/logo.png";

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
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flyoutAnchorEl, setFlyoutAnchorEl] = useState(null);
  const [activeFlyoutItem, setActiveFlyoutItem] = useState(null);
  const { authState, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();
  const { isDark, toggleMode } = useThemeMode();

  const SIDEBAR = React.useMemo(() => {
    if (theme.palette.mode === "dark") {
      return {
        bg: "#121628",
        active: "#ffffff",
        activeBg: "rgba(141, 150, 184, 0.14)",
        hover: "rgba(255, 255, 255, 0.04)",
        text: "#d6dbef",
        activeText: "#e7ebf7",
        icon: "#ffffff",
        activeIcon: "#ffffff",
        divider: "rgba(255,255,255,0.08)",
        logoutHover: "rgba(239, 68, 68, 0.14)",
      };
    }

    return {
      bg: "#1e1a2e",
      active: "#4a3f6b",
      activeBg: "rgba(74, 63, 107, 0.25)",
      hover: "rgba(255, 255, 255, 0.05)",
      text: "#c4bde0",
      activeText: "#ffffff",
      icon: "#7b72a8",
      activeIcon: "#c4bde0",
      divider: "rgba(255,255,255,0.08)",
      logoutHover: "rgba(220,38,38,0.15)",
    };
  }, [theme.palette.mode]);

  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
  ];

  const memberTypeOptions = [
    { label: "Office", value: "Office" },
    { label: "WFH", value: "WFH" },
  ];

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    profileImage: "",
    phone: "",
    gender: "",
    memberType: "Office",
    dateOfBirth: null,
    joiningDate: null,
    roleName: "",
    password: "",
    confirmPassword: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  const hoverTimeoutRef = useRef(null);

  const handleCloseFlyout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setFlyoutAnchorEl(null);
    setActiveFlyoutItem(null);
  };

  const handleParentMouseEnter = (item, event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setFlyoutAnchorEl(event.currentTarget);
    setActiveFlyoutItem(item);
  };

  const handleParentMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      handleCloseFlyout();
    }, 250);
  };

  const handleFlyoutMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleFlyoutMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      handleCloseFlyout();
    }, 250);
  };

  const handleItemMouseEnter = () => {
    handleCloseFlyout();
  };

  const handleParentClick = (item, event) => {
    if (activeFlyoutItem?.id === item.id) {
      handleCloseFlyout();
    } else {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setFlyoutAnchorEl(event.currentTarget);
      setActiveFlyoutItem(item);
    }
  };

  // Close flyout on path change or component unmount
  React.useEffect(() => {
    handleCloseFlyout();
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  // Sync profileForm with backend profile (or authState fallback) when dialog opens
  React.useEffect(() => {
    if (profileDialogOpen) {
      let isMounted = true;
      const loadProfile = async () => {
        try {
          const res = await GetProfileAsync();
          const profile = res?.data || res;
          if (profile && isMounted) {
            setProfileForm({
              fullName: profile.fullName || authState?.fullName || "",
              email: profile.email || authState?.email || "",
              profileImage: profile.profileImage || authState?.profileImage || "",
              phone: profile.phone || "",
              gender: profile.gender || "",
              memberType: profile.memberType || "Office",
              dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
              joiningDate: profile.joiningDate ? dayjs(profile.joiningDate) : null,
              roleName: profile.roleName || authState?.role || "Member",
              password: "",
              confirmPassword: "",
            });
            setProfileErrors({});
            return;
          }
        } catch (e) {
          console.error("Failed to load latest profile:", e);
        }

        if (isMounted && authState) {
          setProfileForm({
            fullName: authState.fullName || "",
            email: authState.email || "",
            profileImage: authState.profileImage || "",
            phone: authState.phone || "",
            gender: authState.gender || "",
            memberType: authState.memberType || "Office",
            dateOfBirth: authState.dateOfBirth ? dayjs(authState.dateOfBirth) : null,
            joiningDate: authState.joiningDate ? dayjs(authState.joiningDate) : null,
            roleName: authState.role || "Member",
            password: "",
            confirmPassword: "",
          });
          setProfileErrors({});
        }
      };

      loadProfile();
      return () => {
        isMounted = false;
      };
    }
  }, [profileDialogOpen]);

  const handleSaveProfile = async () => {
    const requiredMsg = "This field is required";
    const schema = {
      fullName: { required: true, type: "letteronly", min: 2, max: 100, label: requiredMsg },
      email: { required: true, email: true, label: requiredMsg },
      phone: { required: true, type: "numberonly", min: 10, max: 10, label: requiredMsg },
      gender: { required: true, label: requiredMsg },
    };
    const errors = validateForm(profileForm, schema);

    if (profileForm.phone && profileForm.phone.length !== 10) {
      errors.phone = "Phone number must be 10 digits";
    }

    if (!profileForm.dateOfBirth || !dayjs(profileForm.dateOfBirth).isValid()) {
      errors.dateOfBirth = requiredMsg;
    }

    if (!profileForm.joiningDate || !dayjs(profileForm.joiningDate).isValid()) {
      errors.joiningDate = requiredMsg;
    }

    if (profileForm.password) {
      if (profileForm.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
      if (profileForm.password !== profileForm.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error("Please fill all the required fields correctly");
      return;
    }

    try {
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        profileImage: profileForm.profileImage,
        phone: profileForm.phone.trim(),
        gender: profileForm.gender,
        memberType: profileForm.memberType,
        dateOfBirth: profileForm.dateOfBirth ? dayjs(profileForm.dateOfBirth).toISOString() : undefined,
        joiningDate: profileForm.joiningDate ? dayjs(profileForm.joiningDate).toISOString() : undefined,
        roleName: profileForm.roleName,
        password: profileForm.password || undefined,
      });

      toast.success("Profile updated successfully!");
      setProfileDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to update profile");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isChildActive = (item) => {
    return item.children?.some(
      (child) =>
        location.pathname === child.path ||
        (child.path !== "/" && location.pathname.startsWith(child.path + "/"))
    );
  };

  const isItemActive = (item) => {
    if (item.children) {
      return isChildActive(item);
    }
    if (item.path === "/") {
      return location.pathname === "/";
    }
    if (item.path === "/reports") {
      return location.pathname.startsWith("/reports");
    }
    return (
      location.pathname === item.path ||
      (item.path !== "/" && location.pathname.startsWith(item.path + "/"))
    );
  };

  const renderNavItem = (item) => {
    if (item.adminOnly && authState?.role !== "Admin") return null;

    if (item.path) {
      const rights = getRightsForPath(item.path, authState?.role);
      if (rights.deny) return null;
    }

    if (item.children) {
      const visibleChildren = item.children.filter((child) => {
        if (child.adminOnly && authState?.role !== "Admin") return false;
        const rights = getRightsForPath(child.path, authState?.role);
        return !rights.deny;
      });
      if (visibleChildren.length === 0) return null;

      const isFlyoutOpen = Boolean(flyoutAnchorEl && activeFlyoutItem?.id === item.id);
      const active = isChildActive(item);

      return (
        <ListItemButton
          key={item.id}
          onClick={(e) => handleParentClick(item, e)}
          onMouseEnter={(e) => handleParentMouseEnter(item, e)}
          onMouseLeave={handleParentMouseLeave}
          selected={active || isFlyoutOpen}
          sx={{
            borderRadius: "8px",
            mb: 0.5,
            py: 0.9,
            px: 1.5,
            transition: "all 0.15s ease",
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
              color: SIDEBAR.text,
              "& .MuiListItemIcon-root": { color: SIDEBAR.icon },
              "& .MuiListItemText-primary": { color: SIDEBAR.text, fontWeight: 600 },
            },
            "&:hover": { bgcolor: SIDEBAR.hover },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: active || isFlyoutOpen ? SIDEBAR.activeIcon : SIDEBAR.icon }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: active || isFlyoutOpen ? 700 : 600 }}
          />
          <ChevronRightRoundedIcon
            sx={{
              fontSize: "1.15rem",
              color: active || isFlyoutOpen ? SIDEBAR.activeIcon : SIDEBAR.icon,
              transform: isFlyoutOpen ? "translateX(2px)" : "none",
              transition: "transform 0.2s ease, color 0.2s ease",
            }}
          />
        </ListItemButton>
      );
    }

    const active = isItemActive(item);
    return (
      <ListItemButton
        key={item.path}
        onMouseEnter={handleItemMouseEnter}
        onClick={() => {
          handleCloseFlyout();
          navigate(item.path);
          setMobileOpen(false);
        }}
        selected={active}
        sx={{
          borderRadius: "8px",
          mb: 0.5,
          py: 0.9,
          px: 1.5,
          transition: "all 0.15s ease",
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
        <ListItemIcon sx={{ minWidth: 36, color: active ? SIDEBAR.activeIcon : SIDEBAR.icon }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: "0.85rem",
            fontWeight: active ? 700 : 600,
          }}
        />
      </ListItemButton>
    );
  };

  const drawer = (
    <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column", bgcolor: SIDEBAR.bg }}>

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <Box onMouseEnter={handleItemMouseEnter} sx={{ px: 2.5, py: 3, display: "flex", alignItems: "center", gap: { xs: 1.2, md: 1.8 } }}>
        {/* Mobile menu toggle close button */}
        <Box sx={{ display: { xs: "block", md: "none" }, mr: 0.5 }}>
          <IconButton
            onClick={() => setMobileOpen(false)}
            sx={{
              color: SIDEBAR.text,
              p: 0.8,
              borderRadius: "8px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: theme.palette.mode === "dark" ? "#e7ebf7" : "#ffffff" }
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>

        <Box sx={{
          width: 40, height: 40, borderRadius: "10px",
          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#ffffff", display: "flex",
          alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(74,63,107,0.1)",
          p: 0.5
        }}>
          <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 900, color: SIDEBAR.activeText, lineHeight: 1, fontSize: "0.95rem", letterSpacing: "0.02em" }}>
            Contribution
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.mode === "dark" ? SIDEBAR.text : "#a78bfa", lineHeight: 1.3, fontSize: "0.88rem", letterSpacing: "0.01em" }}>
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
          onMouseEnter={handleItemMouseEnter}
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
            <Typography variant="body2" fontWeight={800} sx={{ color: theme.palette.mode === "dark" ? "#e7ebf7" : "#ffffff", fontSize: "0.82rem" }} noWrap>
              {authState?.fullName?.split(" ")[0] ?? "User"}
            </Typography>
            <Typography variant="caption" sx={{ color: SIDEBAR.text, fontSize: "0.68rem", fontWeight: 600 }} noWrap>
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
          <Tooltip title={isDark ? "Switch to Day Theme" : "Switch to Night Theme"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleMode();
              }}
              sx={{
                color: SIDEBAR.text,
                p: 0.8,
                borderRadius: "6px",
                "&:hover": { bgcolor: SIDEBAR.hover, color: theme.palette.mode === "dark" ? "#e7ebf7" : "#ffffff" },
                transition: "all 0.2s ease",
              }}
            >
              {isDark ? <LightModeOutlinedIcon sx={{ fontSize: "1.05rem" }} /> : <DarkModeOutlinedIcon sx={{ fontSize: "1.05rem" }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Mobile hamburger */}
      <Box sx={{ display: { xs: "flex", md: "none" }, position: "fixed", top: 12, left: 12, zIndex: 1300 }}>
        {!mobileOpen && (
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ bgcolor: SIDEBAR.bg, color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#fff", borderRadius: "8px", "&:hover": { bgcolor: SIDEBAR.active } }}
          >
            <MenuRoundedIcon />
          </IconButton>
        )}
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
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", border: "none", bgcolor: SIDEBAR.bg },
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
              bgcolor: SIDEBAR.bg,
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
          bgcolor: "background.default",
        }}
      >
        <Outlet />
      </Box>

      {/* ── Profile Dialog ────────────────────────────────────────────────── */}
      <AppDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        title="My Profile"
        maxWidth="sm"
        showCloseIcon={false}
        actions={
          <>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
            >
              Save
            </AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setProfileDialogOpen(false)}>
              Cancel
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1, pb: 1 }}>
          <AppImageUpload
            value={getImageUrl(profileForm.profileImage)}
            onChange={(base64) => setProfileForm((prev) => ({ ...prev, profileImage: base64 }))}
            nameInitials={(profileForm.fullName || authState?.fullName || "U")[0].toUpperCase()}
            size={110}
            helperText="Click or hover to change profile picture"
          />

          {/* Row 1: Name & Email */}
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="Name"
                value={profileForm.fullName}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, fullName: e.target.value }));
                  if (profileErrors.fullName) setProfileErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                restrictType="letteronly"
                maxLength={100}
                error={!!profileErrors.fullName}
                helperText={profileErrors.fullName}
                required
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, email: e.target.value }));
                  if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: "" }));
                }}
                maxLength={100}
                error={!!profileErrors.email}
                helperText={profileErrors.email}
                required
              />
            </Box>
          </Box>

          {/* Row 2: Phone & Gender */}
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="Phone Number"
                value={profileForm.phone}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, phone: e.target.value }));
                  if (profileErrors.phone) setProfileErrors((prev) => ({ ...prev, phone: "" }));
                }}
                restrictType="numberonly"
                maxLength={10}
                placeholder="10-digit number"
                error={!!profileErrors.phone}
                helperText={profileErrors.phone}
                required
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppSelect
                label="Gender"
                value={profileForm.gender}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, gender: e.target.value }));
                  if (profileErrors.gender) setProfileErrors((prev) => ({ ...prev, gender: "" }));
                }}
                options={genderOptions}
                placeholder="Select gender"
                error={!!profileErrors.gender}
                helperText={profileErrors.gender}
                required
              />
            </Box>
          </Box>

          {/* Row 3: Date of Birth & Joining Date */}
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <Box sx={{ flex: 1 }}>
              <AppDateInput
                label="Date of Birth"
                value={profileForm.dateOfBirth}
                onChange={(newValue) => {
                  setProfileForm((prev) => ({ ...prev, dateOfBirth: newValue }));
                  if (profileErrors.dateOfBirth) setProfileErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                }}
                error={!!profileErrors.dateOfBirth}
                helperText={profileErrors.dateOfBirth}
                required
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppDateInput
                label="Joining Date"
                value={profileForm.joiningDate}
                onChange={(newValue) => {
                  setProfileForm((prev) => ({ ...prev, joiningDate: newValue }));
                  if (profileErrors.joiningDate) setProfileErrors((prev) => ({ ...prev, joiningDate: "" }));
                }}
                error={!!profileErrors.joiningDate}
                helperText={profileErrors.joiningDate}
                required
              />
            </Box>
          </Box>

          {/* Row 4: Role & Member Type */}
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="Role"
                value={profileForm.roleName || authState?.role || "Member"}
                disabled
                helperText="System role is managed by administrator"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppSelect
                label="Member Type"
                value={profileForm.memberType || "Office"}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, memberType: e.target.value }));
                  if (profileErrors.memberType) setProfileErrors((prev) => ({ ...prev, memberType: "" }));
                }}
                options={memberTypeOptions}
                placeholder="Select member type"
                error={!!profileErrors.memberType}
                helperText={profileErrors.memberType}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 0.5, borderColor: "rgba(74, 63, 107, 0.08)" }} />

          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "0.05em", mt: -1 }}>
            Change Password (Optional)
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="New Password"
                type="password"
                value={profileForm.password}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, password: e.target.value }));
                  if (profileErrors.password) setProfileErrors((prev) => ({ ...prev, password: "" }));
                }}
                maxLength={50}
                error={!!profileErrors.password}
                helperText={profileErrors.password}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="Confirm Password"
                type="password"
                value={profileForm.confirmPassword}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  if (profileErrors.confirmPassword) setProfileErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                maxLength={50}
                error={!!profileErrors.confirmPassword}
                helperText={profileErrors.confirmPassword}
              />
            </Box>
          </Box>
        </Box>
      </AppDialog>

      {/* ── Submodule Flyout Popper (Right Side) ─────────────────────────── */}
      <Popper
        open={Boolean(flyoutAnchorEl && activeFlyoutItem)}
        anchorEl={flyoutAnchorEl}
        placement="right-start"
        style={{ zIndex: 1400 }}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleCloseFlyout}>
          <Paper
            onMouseEnter={handleFlyoutMouseEnter}
            onMouseLeave={handleFlyoutMouseLeave}
            elevation={8}
            sx={{
              bgcolor: SIDEBAR.bg,
              color: SIDEBAR.text,
              borderRadius: "12px",
              boxShadow: theme.palette.mode === "dark"
                ? "0 14px 40px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.15)"
                : "0 14px 40px rgba(18, 14, 34, 0.45), 0 0 1px rgba(255,255,255,0.1)",
              border: `1px solid ${SIDEBAR.divider}`,
              minWidth: 190,
              p: 0.5,
              backgroundImage: "none",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: -8,
                bottom: -8,
                left: -14,
                width: 16,
              },
            }}
          >
            {activeFlyoutItem && (
              <List component="div" disablePadding>
                {activeFlyoutItem.children
                  ?.filter((child) => {
                    if (child.adminOnly && authState?.role !== "Admin") return false;
                    const rights = getRightsForPath(child.path, authState?.role);
                    return !rights.deny;
                  })
                  .map((child) => {
                    const childActive = location.pathname === child.path;
                    return (
                      <ListItemButton
                        key={child.path}
                        onClick={() => {
                          navigate(child.path);
                          handleCloseFlyout();
                          setMobileOpen(false);
                        }}
                        selected={childActive}
                        sx={{
                          borderRadius: "8px",
                          mb: 0.3,
                          py: 0.7,
                          px: 1.4,
                          transition: "all 0.15s ease",
                          "&.Mui-selected": {
                            bgcolor: SIDEBAR.activeBg,
                            borderLeft: `3px solid ${SIDEBAR.active}`,
                            pl: "calc(11.2px - 3px)",
                            "& .MuiListItemIcon-root": { color: SIDEBAR.activeIcon },
                            "& .MuiListItemText-primary": { color: SIDEBAR.activeText, fontWeight: 700 },
                            "&:hover": { bgcolor: SIDEBAR.activeBg },
                          },
                          "&:not(.Mui-selected)": {
                            borderLeft: "3px solid transparent",
                            color: SIDEBAR.text,
                            "& .MuiListItemIcon-root": { color: SIDEBAR.icon },
                            "& .MuiListItemText-primary": { color: SIDEBAR.text, fontWeight: 500 },
                          },
                          "&:hover": {
                            bgcolor: SIDEBAR.hover,
                            "& .MuiListItemText-primary": { color: SIDEBAR.activeText },
                            "& .MuiListItemIcon-root": { color: SIDEBAR.activeIcon },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: childActive ? SIDEBAR.activeIcon : SIDEBAR.icon }}>
                          {child.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{
                            fontSize: "0.83rem",
                            fontWeight: childActive ? 700 : 500,
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
              </List>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box >
  );
}
