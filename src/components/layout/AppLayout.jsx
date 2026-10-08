import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Avatar,
  Box,
  ClickAwayListener,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Stack,
  Tooltip,
  Typography,
  Alert,
  Menu,
  MenuItem,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SaveIcon from "@mui/icons-material/Save";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockResetIcon from "@mui/icons-material/LockReset";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SwitchRoleDialog from "../members/SwitchRoleDialog";
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
import { getProfileAsync, changePasswordAsync } from "../../services/userService";
import { getWorkTypesAsync } from "../../services/workTypeService";
import { useThemeMode } from "../../contexts/ThemeModeContext";
import { useNavigationLoading } from "../../contexts/NavigationLoadingContext";
import AppPageLoader from "../common/AppPageLoader";
import dayjs from "dayjs";
import logo from "../../assets/logo_image.png";

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
  const { authState, logout, updateProfile, switchRole, isSwitchingRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();
  const { isDark, toggleMode } = useThemeMode();
  const { isLoading, loadingMessage, showLoader, hideLoader } = useNavigationLoading();

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

  const [workTypeOptions, setWorkTypeOptions] = useState([
    { label: "Office", value: "Office" },
    { label: "WFH", value: "WFH" },
  ]);

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [switchRoleDialogOpen, setSwitchRoleDialogOpen] = useState(false);

  const userAssignedRoles = React.useMemo(() => {
    const set = new Set();
    const addRole = (r) => {
      if (!r || typeof r !== "string") return;
      const clean = r.trim();
      if (!clean) return;
      for (const item of set) {
        if (item.toLowerCase() === clean.toLowerCase()) return;
      }
      set.add(clean);
    };

    if (Array.isArray(authState?.roles)) authState.roles.forEach(addRole);
    if (Array.isArray(authState?.Roles)) authState.Roles.forEach(addRole);
    if (Array.isArray(authState?.primaryRoles)) authState.primaryRoles.forEach(addRole);
    if (Array.isArray(authState?.PrimaryRoles)) authState.PrimaryRoles.forEach(addRole);
    if (Array.isArray(authState?.secondaryRoles)) authState.secondaryRoles.forEach(addRole);
    if (Array.isArray(authState?.SecondaryRoles)) authState.SecondaryRoles.forEach(addRole);
    if (authState?.role) addRole(authState.role);
    if (authState?.roleName) addRole(authState.roleName);

    return Array.from(set);
  }, [authState]);

  const hasMultipleRoles = Boolean(
    Boolean(authState?.enableMultipleRoles) && userAssignedRoles.length > 1
  );

  const otherRoleName = React.useMemo(() => {
    if (userAssignedRoles.length === 2) {
      const currentRole = String(authState?.role || authState?.roleName || "").trim().toLowerCase();
      return userAssignedRoles.find(
        (r) => r.trim().toLowerCase() !== currentRole
      ) || userAssignedRoles[0];
    }
    return null;
  }, [userAssignedRoles, authState]);

  const handleQuickSwitchRole = async (e) => {
    if (e) e.stopPropagation();
    if (!hasMultipleRoles || userAssignedRoles.length === 0) return;

    if (userAssignedRoles.length === 2) {
      const currentRole = String(authState?.role || authState?.roleName || "").trim().toLowerCase();
      const targetRole = otherRoleName || userAssignedRoles.find(
        (r) => r.trim().toLowerCase() !== currentRole
      ) || userAssignedRoles[0];

      if (targetRole && targetRole.trim().toLowerCase() !== currentRole) {
        showLoader("Switching role...");
        try {
          await switchRole(targetRole);
          toast.success(`Switched to ${targetRole} role`);
        } catch (err) {
          const msg = err?.response?.data?.message || err?.message || "Failed to switch role";
          toast.error(msg);
        } finally {
          setTimeout(() => {
            hideLoader();
          }, 300);
        }
      }
      return;
    }

    // More than 2 roles: open dialog to let user select
    setSwitchRoleDialogOpen(true);
  };
  const [, setRightsVersion] = useState(0);

  useEffect(() => {
    const handleRightsUpdate = () => {
      setRightsVersion((prev) => prev + 1);
    };
    window.addEventListener("rightsUpdated", handleRightsUpdate);
    return () => {
      window.removeEventListener("rightsUpdated", handleRightsUpdate);
    };
  }, []);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    profileImage: "",
    phone: "",
    gender: "",
    workType: "Office",
    memberType: "Office",
    dateOfBirth: null,
    joiningDate: null,
    roleName: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Change Password Dialog States
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changePasswordErrors, setChangePasswordErrors] = useState({});
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordAnchorEl, setNewPasswordAnchorEl] = useState(null);

  // Live password validation against the 4 policy rules
  const newPassVal = changePasswordForm.newPassword || "";
  const passwordValidation = useMemo(() => {
    return {
      hasLowerAndUpper: /[a-z]/.test(newPassVal) && /[A-Z]/.test(newPassVal),
      hasNumber: /[0-9]/.test(newPassVal),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassVal),
      hasMinLength: newPassVal.length >= 8,
    };
  }, [newPassVal]);

  const passwordRules = useMemo(() => [
    {
      id: "case",
      label: "Lowercase & Uppercase",
      met: passwordValidation.hasLowerAndUpper,
    },
    {
      id: "number",
      label: "Number (0-9)",
      met: passwordValidation.hasNumber,
    },
    {
      id: "special",
      label: "Special Character (!@#$%^&*)",
      met: passwordValidation.hasSpecial,
    },
    {
      id: "length",
      label: "Atleast 8 Character",
      met: passwordValidation.hasMinLength,
    },
  ], [passwordValidation]);

  // Clear and prevent browser password manager autofill on Change Password dialog open
  useEffect(() => {
    if (changePasswordDialogOpen) {
      setNewPasswordAnchorEl(null);
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setChangePasswordErrors({});
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      const t1 = setTimeout(() => {
        setChangePasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }, 50);

      const t2 = setTimeout(() => {
        setChangePasswordForm((prev) => ({
          ...prev,
          currentPassword: "",
        }));
      }, 150);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [changePasswordDialogOpen]);

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

  // Sync profileForm with backend profile and fetch dynamic work types when dialog opens
  React.useEffect(() => {
    if (profileDialogOpen) {
      let isMounted = true;
      const loadProfile = async () => {
        try {
          const [profileRes, workTypesRes] = await Promise.all([
            getProfileAsync().catch(() => null),
            getWorkTypesAsync(true).catch(() => []),
          ]);

          let activeOptions = [];
          if (Array.isArray(workTypesRes) && workTypesRes.length > 0) {
            activeOptions = workTypesRes
              .map((wt) => ({
                label: wt.workTypeName || wt.name || "",
                value: wt.workTypeName || wt.name || "",
              }))
              .filter((opt) => opt.value);

            if (isMounted && activeOptions.length > 0) {
              setWorkTypeOptions(activeOptions);
            }
          }

          const profile = profileRes?.data || profileRes;
          const defaultWorkType = activeOptions[0]?.value || workTypeOptions[0]?.value || "Office";

          if (profile && isMounted) {
            const currentWorkType = profile.workType || profile.memberType || defaultWorkType;
            setProfileForm({
              fullName: profile.fullName || authState?.fullName || "",
              email: profile.email || authState?.email || "",
              profileImage: profile.profileImage || authState?.profileImage || "",
              phone: profile.phone || "",
              gender: profile.gender || "",
              workType: currentWorkType,
              memberType: currentWorkType,
              dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
              joiningDate: profile.joiningDate ? dayjs(profile.joiningDate) : null,
              roleName: profile.roleName || authState?.role || "",
            });
            setProfileErrors({});
            return;
          }
        } catch (e) {
          // Profile fetch error handled silently
        }

        if (isMounted && authState) {
          const fallbackWorkType = workTypeOptions[0]?.value || "Office";
          const currentWorkType = authState.workType || authState.memberType || fallbackWorkType;
          setProfileForm({
            fullName: authState.fullName || "",
            email: authState.email || "",
            profileImage: authState.profileImage || "",
            phone: authState.phone || "",
            gender: authState.gender || "",
            workType: currentWorkType,
            memberType: currentWorkType,
            dateOfBirth: authState.dateOfBirth ? dayjs(authState.dateOfBirth) : null,
            joiningDate: authState.joiningDate ? dayjs(authState.joiningDate) : null,
            roleName: authState.role || "",
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
      if (profileForm.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
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
      const selectedWorkType = profileForm.workType || profileForm.memberType || workTypeOptions[0]?.value || "Office";
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        profileImage: profileForm.profileImage,
        phone: profileForm.phone.trim(),
        gender: profileForm.gender,
        workType: selectedWorkType,
        memberType: selectedWorkType,
        dateOfBirth: profileForm.dateOfBirth ? dayjs(profileForm.dateOfBirth).toISOString() : undefined,
        joiningDate: profileForm.joiningDate ? dayjs(profileForm.joiningDate).toISOString() : undefined,
      });

      toast.success("Profile updated successfully!");
      setProfileDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    const errs = {};
    const curPass = changePasswordForm.currentPassword?.trim();
    const newPass = changePasswordForm.newPassword?.trim();
    const confPass = changePasswordForm.confirmPassword?.trim();

    const requiredMsg = "This field is required";

    if (!curPass) {
      errs.currentPassword = requiredMsg;
    }

    if (!newPass) {
      errs.newPassword = requiredMsg;
    } else if (newPass.length < 8) {
      errs.newPassword = "Password must be at least 8 characters";
    } else if (!passwordValidation.hasLowerAndUpper) {
      errs.newPassword = "Password must contain lowercase and uppercase letters";
    } else if (!passwordValidation.hasNumber) {
      errs.newPassword = "Password must contain at least one number (0-9)";
    } else if (!passwordValidation.hasSpecial) {
      errs.newPassword = "Password must contain at least one special character (!@#$%^&*)";
    } else if (newPass === curPass) {
      errs.newPassword = "New password must be different from current password";
    }

    if (!confPass) {
      errs.confirmPassword = requiredMsg;
    } else if (newPass !== confPass) {
      errs.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errs).length > 0) {
      setChangePasswordErrors(errs);
      if (!curPass || !newPass || !confPass) {
        toast.error("This field is required");
      } else if (errs.newPassword) {
        toast.error(errs.newPassword);
      } else if (errs.confirmPassword) {
        toast.error(errs.confirmPassword);
      } else {
        toast.error("This field is required");
      }
      return;
    }

    setChangePasswordLoading(true);
    try {
      await changePasswordAsync({
        currentPassword: changePasswordForm.currentPassword,
        newPassword: changePasswordForm.newPassword,
        confirmPassword: changePasswordForm.confirmPassword,
      });
      toast.success("Password changed successfully!");
      setChangePasswordDialogOpen(false);
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangePasswordErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to change password";
      toast.error(msg);
      if (msg.toLowerCase().includes("current password") || msg.toLowerCase().includes("incorrect")) {
        setChangePasswordErrors((prev) => ({ ...prev, currentPassword: msg }));
      } else if (msg.toLowerCase().includes("new password")) {
        setChangePasswordErrors((prev) => ({ ...prev, newPassword: msg }));
      }
    } finally {
      setChangePasswordLoading(false);
    }
  };


  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true, state: null });
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
    const activeRole = authState?.role || authState?.roleName;
    if (item.adminOnly && String(activeRole || "").toLowerCase() !== "admin") return null;

    if (item.path) {
      const rights = getRightsForPath(item.path, activeRole);
      if (rights.deny) return null;
    }

    if (item.children) {
      const visibleChildren = item.children.filter((child) => {
        if (child.adminOnly && String(activeRole || "").toLowerCase() !== "admin") return false;
        const rights = getRightsForPath(child.path, activeRole);
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
              "& .MuiListItemText-primary": { color: SIDEBAR.activeText, fontWeight: 600 },
              "&:hover": { bgcolor: SIDEBAR.activeBg },
            },
            "&:not(.Mui-selected)": {
              borderLeft: "3px solid transparent",
              color: SIDEBAR.text,
              "& .MuiListItemIcon-root": { color: SIDEBAR.icon },
              "& .MuiListItemText-primary": { color: SIDEBAR.text, fontWeight: 500 },
            },
            "&:hover": { bgcolor: SIDEBAR.hover },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: active || isFlyoutOpen ? SIDEBAR.activeIcon : SIDEBAR.icon }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: active || isFlyoutOpen ? 600 : 500 }}
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
            "& .MuiListItemText-primary": { color: SIDEBAR.activeText, fontWeight: 600 },
            "&:hover": { bgcolor: SIDEBAR.activeBg },
          },
          "&:not(.Mui-selected)": {
            borderLeft: "3px solid transparent",
            "& .MuiListItemIcon-root": { color: SIDEBAR.icon },
            "& .MuiListItemText-primary": { color: SIDEBAR.text, fontWeight: 500 },
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
            fontSize: "0.875rem",
            fontWeight: active ? 600 : 500,
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
          width: 46, height: 46, borderRadius: "10px",
          border: "1.5px solid #ffffff",
          display: "flex",
          alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
          p: 0
        }}>
          <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
          onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
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
          <Box sx={{ overflow: "hidden", flexGrow: 1, minWidth: 0, mr: 0.5 }}>
            <Typography variant="body2" fontWeight={800} sx={{ color: theme.palette.mode === "dark" ? "#e7ebf7" : "#ffffff", fontSize: "0.82rem" }} noWrap>
              {authState?.fullName?.split(" ")[0] ?? "User"}
            </Typography>
            <Typography variant="caption" sx={{ color: SIDEBAR.text, fontSize: "0.68rem", fontWeight: 600 }} noWrap>
              {authState?.role}
            </Typography>
          </Box>
          {hasMultipleRoles && (
            <Tooltip title={otherRoleName ? `Switch to ${otherRoleName}` : "Switch Role"}>
              <IconButton
                size="small"
                onClick={handleQuickSwitchRole}
                sx={{
                  color: SIDEBAR.text,
                  p: 0.6,
                  borderRadius: "6px",
                  "&:hover": { bgcolor: SIDEBAR.hover, color: "#10b981" },
                  transition: "all 0.2s ease",
                }}
              >
                <SwapHorizRoundedIcon sx={{ fontSize: "1.15rem" }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Log Out">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening profile menu!
                handleLogout();
              }}
              sx={{
                color: SIDEBAR.text,
                p: 0.6,
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
                p: 0.6,
                borderRadius: "6px",
                "&:hover": { bgcolor: SIDEBAR.hover, color: theme.palette.mode === "dark" ? "#e7ebf7" : "#ffffff" },
                transition: "all 0.2s ease",
              }}
            >
              {isDark ? <LightModeOutlinedIcon sx={{ fontSize: "1.05rem" }} /> : <DarkModeOutlinedIcon sx={{ fontSize: "1.05rem" }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Menu Popup */}
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={() => setProfileMenuAnchor(null)}
          anchorOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          PaperProps={{
            sx: {
              minWidth: 200,
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              border: (theme) =>
                `1px solid ${theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(74, 63, 107, 0.12)"
                }`,
              py: 0.8,
            },
          }}
        >
          <MenuItem
            onClick={() => {
              setProfileMenuAnchor(null);
              setProfileDialogOpen(true);
            }}
            sx={{ fontSize: "0.85rem", fontWeight: 600, py: 1, gap: 1.5 }}
          >
            <AccountCircleOutlinedIcon sx={{ fontSize: "1.15rem", color: "#7c3aed" }} />
            <span>My Profile</span>
          </MenuItem>

          {hasMultipleRoles && (
            <MenuItem
              onClick={(e) => {
                setProfileMenuAnchor(null);
                handleQuickSwitchRole(e);
              }}
              sx={{
                fontSize: "0.85rem",
                fontWeight: 600,
                py: 1,
                gap: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <SwapHorizRoundedIcon sx={{ fontSize: "1.15rem", color: "#10b981" }} />
                <span>Switch Role</span>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, ml: 1 }}>
                ↔
              </Typography>
            </MenuItem>
          )}

          <MenuItem
            onClick={() => {
              setProfileMenuAnchor(null);
              setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              setChangePasswordErrors({});
              setShowCurrentPassword(false);
              setShowNewPassword(false);
              setShowConfirmPassword(false);
              setChangePasswordDialogOpen(true);
            }}
            sx={{ fontSize: "0.85rem", fontWeight: 600, py: 1, gap: 1.5 }}
          >
            <LockResetIcon sx={{ fontSize: "1.15rem", color: "#3b82f6" }} />
            <span>Change Password</span>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              setProfileMenuAnchor(null);
              handleLogout();
            }}
            sx={{ fontSize: "0.85rem", fontWeight: 600, py: 1, gap: 1.5, color: "#ef4444" }}
          >
            <LogoutRoundedIcon sx={{ fontSize: "1.15rem", color: "#ef4444" }} />
            <span>Logout</span>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Role Switching Fullscreen Transition Loader */}
      {isSwitchingRole && <AppPageLoader fullScreen opaque text="Switching role..." />}

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
          position: "relative",
        }}
      >
        {isLoading && <AppPageLoader fullScreen={true} text={loadingMessage || "Loading..."} />}
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
            <AppButton variant="outlined" onClick={() => setProfileDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
            >
              Save
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
                maxLength={250}
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

          {/* Row 3: Date of Birth & Role */}
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
              <AppInput
                label="Role"
                value={profileForm.roleName || authState?.role || "Member"}
                disabled
                helperText="System role is managed by administrator"
              />
            </Box>
          </Box>
        </Box>
      </AppDialog>

      {/* ── Change Password Dialog ────────────────────────────────────────── */}
      <AppDialog
        open={changePasswordDialogOpen}
        onClose={() => setChangePasswordDialogOpen(false)}
        title="Change Password"
        maxWidth="xs"
        showCloseIcon={true}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setChangePasswordDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              onClick={handleChangePassword}
              loading={changePasswordLoading}
              sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
            >
              Update
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2, pt: 1, pb: 1, position: "relative" }}>
          {/* Browser autofill decoy to prevent password manager from auto-loading credentials */}
          <div style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
            <input type="text" name="decoy_username" tabIndex={-1} autoComplete="username" />
            <input type="password" name="decoy_password" tabIndex={-1} autoComplete="current-password" />
          </div>

          <AppInput
            label="Current Password"
            type={showCurrentPassword ? "text" : "password"}
            value={changePasswordForm.currentPassword}
            maxLength={20}
            placeholder="Enter current password"
            name="current_password_unautofill"
            autoComplete="new-password"
            onChange={(e) => {
              const val = e.target.value;
              setChangePasswordForm((prev) => ({ ...prev, currentPassword: val }));
              if (changePasswordErrors.currentPassword) {
                setChangePasswordErrors((prev) => ({ ...prev, currentPassword: "" }));
              }
            }}
            error={!!changePasswordErrors.currentPassword}
            helperText={changePasswordErrors.currentPassword}
            required
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  aria-label="toggle current password visibility"
                >
                  {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            }
          />

          <Box
            ref={(node) => {
              if (node && node !== newPasswordAnchorEl) {
                setNewPasswordAnchorEl(node);
              }
            }}
          >
            <AppInput
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              value={changePasswordForm.newPassword}
              maxLength={8}
              placeholder="Enter 8 characters"
              name="new_password_unautofill"
              autoComplete="new-password"
              onChange={(e) => {
                const val = e.target.value;
                setChangePasswordForm((prev) => ({ ...prev, newPassword: val }));
                if (changePasswordErrors.newPassword) {
                  setChangePasswordErrors((prev) => ({ ...prev, newPassword: "" }));
                }
              }}
              error={!!changePasswordErrors.newPassword}
              helperText={changePasswordErrors.newPassword || "8 characters"}
              required
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    aria-label="toggle new password visibility"
                  >
                    {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </Box>

          <AppInput
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={changePasswordForm.confirmPassword}
            maxLength={8}
            placeholder="Re-enter 8 characters"
            name="confirm_password_unautofill"
            autoComplete="new-password"
            onChange={(e) => {
              const val = e.target.value;
              setChangePasswordForm((prev) => ({ ...prev, confirmPassword: val }));
              if (changePasswordErrors.confirmPassword) {
                setChangePasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }
            }}
            error={!!changePasswordErrors.confirmPassword}
            helperText={changePasswordErrors.confirmPassword}
            required
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  aria-label="toggle confirm password visibility"
                >
                  {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            }
          />
        </Box>
      </AppDialog>

      {/* ── Password Validation Requirements Speech Bubble Popper ────────── */}
      <Popper
        open={Boolean(changePasswordDialogOpen && newPasswordAnchorEl)}
        anchorEl={newPasswordAnchorEl}
        placement="right"
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 16],
            },
          },
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
              padding: 12,
            },
          },
        ]}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 10,
          pointerEvents: "none",
        }}
      >
        <Paper
          elevation={4}
          sx={{
            position: "relative",
            bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e2235" : "#ffffff",
            borderRadius: "14px",
            py: 2,
            px: 2.5,
            border: "1px solid",
            borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
            boxShadow: (theme) => theme.palette.mode === "dark"
              ? "0 10px 30px rgba(0, 0, 0, 0.6)"
              : "0 10px 30px rgba(0, 0, 0, 0.10)",
            minWidth: 235,
            ml: 1.5,
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "-7px",
              transform: "translateY(-50%) rotate(45deg)",
              width: 14,
              height: 14,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e2235" : "#ffffff",
              borderLeft: "1px solid",
              borderBottom: "1px solid",
              borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
            },
          }}
        >
          <Stack spacing={1.35}>
            {passwordRules.map((rule) => (
              <Box key={rule.id} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                {rule.met ? (
                  <CheckCircleOutlineRoundedIcon
                    sx={{
                      fontSize: 19,
                      color: "#10b981",
                      flexShrink: 0,
                      transition: "all 0.25s ease",
                    }}
                  />
                ) : (
                  <ErrorOutlineRoundedIcon
                    sx={{
                      fontSize: 19,
                      color: "#ef4444",
                      flexShrink: 0,
                      transition: "all 0.25s ease",
                    }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: (theme) => theme.palette.mode === "dark" ? "#f1f5f9" : "#334155",
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    transition: "color 0.25s ease",
                  }}
                >
                  {rule.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Popper>

      <SwitchRoleDialog
        open={switchRoleDialogOpen}
        onClose={() => setSwitchRoleDialogOpen(false)}
      />



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
                            "& .MuiListItemText-primary": { color: SIDEBAR.activeText, fontWeight: 600 },
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
                            fontSize: "0.875rem",
                            fontWeight: childActive ? 600 : 500,
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
