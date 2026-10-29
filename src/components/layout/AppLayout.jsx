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
  Collapse,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import SaveIcon from "@mui/icons-material/Save";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockResetIcon from "@mui/icons-material/LockReset";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import SwitchRoleDialog from "../members/SwitchRoleDialog";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../contexts/AuthContext";
import { navigationItems } from "../../config/menuConfig";
import { getRightsForPath, hasRoleAssignedRights } from "../../utils/rightsHelper";
import NoPermissionsBlankSheet from "../common/NoPermissionsBlankSheet";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppButton, { AppCancelButton, AppSaveButton } from "../common/AppButton";
import AppImageUpload from "../common/AppImageUpload";
import { useAppToast } from "../common/AppToast";
import { validateForm, validateEmail } from "../../utils/validation";
import { getImageUrl } from "../../services/apiClient";
import { getProfileAsync, changePasswordAsync } from "../../services/userService";
import { getWorkTypesAsync } from "../../services/workTypeService";
import { useThemeMode } from "../../contexts/ThemeModeContext";
import { useNavigationLoading } from "../../contexts/NavigationLoadingContext";
import AppPageLoader from "../common/AppPageLoader";
import dayjs from "dayjs";
import logo from "../../assets/logo_team_contribution.png";

export default function AppLayout() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { authState, logout, updateProfile, switchRole, isSwitchingRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();
  const { isDark, toggleMode } = useThemeMode();
  const { isLoading, loadingMessage, showLoader, hideLoader } = useNavigationLoading();

  const activeRole = authState?.role || authState?.roleName;
  const isUnassignedRole = !hasRoleAssignedRights(activeRole);

  // Top Navbar Colors (Preserves the signature Contribution Management dark purple theme)
  const NAVBAR = React.useMemo(() => {
    if (theme.palette.mode === "dark") {
      return {
        bg: "#0d1b2a",
        border: "rgba(255, 255, 255, 0.08)",
        active: "#2d6bb3",
        activeBg: "rgba(45, 107, 179, 0.35)",
        activeBorder: "rgba(91, 147, 211, 0.4)",
        hover: "rgba(255, 255, 255, 0.05)",
        text: "#b3bdd6",
        activeText: "#ffffff",
        icon: "#8a94b8",
        activeIcon: "#c4b5fd",
        dropdownBg: "#101426",
        dropdownBorder: "rgba(255, 255, 255, 0.08)",
        divider: "rgba(255, 255, 255, 0.08)",
        cardBg: "rgba(255, 255, 255, 0.04)",
        avatarBg: "#2d6bb3",
        avatarColor: "#ffffff",
      };
    }

    return {
      bg: "#193b5b", // Exact Deep Corporate Navy from the design image (#193B5B)
      border: "rgba(255, 255, 255, 0.10)",
      active: "#425e79", // Exact Active Menu pill color from the design image (#425E79)
      activeBg: "#425e79", // Active button/pill background matching "Savings" menu
      activeBorder: "rgba(255, 255, 255, 0.25)",
      hover: "rgba(255, 255, 255, 0.10)",
      text: "rgba(255, 255, 255, 0.88)",
      activeText: "#ffffff",
      icon: "rgba(255, 255, 255, 0.80)",
      activeIcon: "#ffffff",
      dropdownBg: "#193b5b",
      dropdownBorder: "rgba(255, 255, 255, 0.12)",
      divider: "rgba(255, 255, 255, 0.12)",
      cardBg: "rgba(255, 255, 255, 0.06)",
      avatarBg: "#2563a6",
      avatarColor: "#ffffff",
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

  // Live password validation against policy rules
  const newPassVal = changePasswordForm.newPassword || "";
  const confPassVal = changePasswordForm.confirmPassword || "";
  const passwordValidation = useMemo(() => {
    return {
      hasLowerAndUpper: /[a-z]/.test(newPassVal) && /[A-Z]/.test(newPassVal),
      hasNumber: /[0-9]/.test(newPassVal),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassVal),
      hasMinLength: newPassVal.length >= 8 && newPassVal.length <= 12,
      passwordsMatch: Boolean(newPassVal && confPassVal && newPassVal === confPassVal),
    };
  }, [newPassVal, confPassVal]);

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
      label: "8 to 12 Characters",
      met: passwordValidation.hasMinLength,
    },
    {
      id: "match",
      label: "Passwords Match",
      met: passwordValidation.passwordsMatch,
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

  const dropdownTimeoutRef = useRef(null);
  const [dropdownAnchorEl, setDropdownAnchorEl] = useState(null);
  const [activeDropdownItem, setActiveDropdownItem] = useState(null);
  const [isDropdownPinned, setIsDropdownPinned] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState({});

  const handleCloseDropdown = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setDropdownAnchorEl(null);
    setActiveDropdownItem(null);
    setIsDropdownPinned(false);
  };

  // Click on parent module (e.g. Events, Finance, Tools)
  const handleParentNavClick = (item, event) => {
    event.stopPropagation();
    event.preventDefault();
    if (activeDropdownItem?.id === item.id) {
      handleCloseDropdown();
    } else {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
        dropdownTimeoutRef.current = null;
      }
      setDropdownAnchorEl(event.currentTarget);
      setActiveDropdownItem(item);
      setIsDropdownPinned(true);
    }
  };

  const handleDropdownMouseEnter = (item, event) => {
    if (isDropdownPinned && activeDropdownItem?.id === item.id) return;
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setDropdownAnchorEl(event.currentTarget);
    setActiveDropdownItem(item);
  };

  const handleDropdownMouseLeave = () => {
    if (isDropdownPinned) return; // If opened by click, stay open until user clicks or clicks away!
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      handleCloseDropdown();
    }, 300);
  };

  const handleMenuMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (isDropdownPinned) return; // If opened by click, stay open until user clicks or clicks away!
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      handleCloseDropdown();
    }, 300);
  };

  const handleSubmoduleClick = (path) => {
    handleCloseDropdown();
    navigate(path);
  };

  const toggleMobileSubmenu = (id) => {
    setMobileSubmenuOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Close dropdown on path change or component unmount
  React.useEffect(() => {
    handleCloseDropdown();
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
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
    } else if (newPass.length < 8 || newPass.length > 12) {
      errs.newPassword = "Password must be between 8 and 12 characters";
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

  const renderTopNavItem = (item) => {
    const role = authState?.role || authState?.roleName;
    if (item.adminOnly && String(role || "").toLowerCase() !== "admin") return null;

    if (item.path) {
      const rights = getRightsForPath(item.path, role);
      if (rights.deny) return null;
    }

    if (item.children) {
      const visibleChildren = item.children.filter((child) => {
        if (child.adminOnly && String(role || "").toLowerCase() !== "admin") return false;
        const rights = getRightsForPath(child.path, role);
        return !rights.deny;
      });
      if (visibleChildren.length === 0) return null;

      const isOpen = Boolean(dropdownAnchorEl && activeDropdownItem?.id === item.id);
      const active = isChildActive(item);

      return (
        <Box
          key={item.id}
          onMouseEnter={(e) => handleDropdownMouseEnter(item, e)}
          onMouseLeave={handleDropdownMouseLeave}
          sx={{ display: "inline-block" }}
        >
          <Box
            component="button"
            type="button"
            onClick={(e) => handleParentNavClick(item, e)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.7,
              px: 1.3,
              py: 0.65,
              border: active || isOpen ? `1px solid ${NAVBAR.activeBorder}` : "1px solid transparent",
              bgcolor: active || isOpen ? NAVBAR.activeBg : "transparent",
              color: active || isOpen ? NAVBAR.activeText : NAVBAR.text,
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: active || isOpen ? 600 : 500,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              outline: "none",
              "& .nav-item-icon": {
                color: active || isOpen ? NAVBAR.activeIcon : NAVBAR.icon,
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s ease",
              },
              "&:hover": {
                bgcolor: active || isOpen ? NAVBAR.activeBg : NAVBAR.hover,
                color: NAVBAR.activeText,
                "& .nav-item-icon": { color: NAVBAR.activeIcon },
              },
            }}
          >
            <Box className="nav-item-icon">{item.icon}</Box>
            <span>{item.label}</span>
            <KeyboardArrowDownRoundedIcon
              sx={{
                fontSize: "1.05rem",
                transition: "transform 0.2s ease",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                color: active || isOpen ? NAVBAR.activeIcon : NAVBAR.icon,
                ml: -0.2,
              }}
            />
          </Box>
        </Box>
      );
    }

    const active = isItemActive(item);
    return (
      <Box
        key={item.path}
        component="button"
        onClick={() => {
          handleCloseDropdown();
          navigate(item.path);
        }}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.7,
          px: 1.3,
          py: 0.65,
          border: active ? `1px solid ${NAVBAR.activeBorder}` : "1px solid transparent",
          bgcolor: active ? NAVBAR.activeBg : "transparent",
          color: active ? NAVBAR.activeText : NAVBAR.text,
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: active ? 600 : 500,
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          transition: "all 0.15s ease",
          outline: "none",
          "& .nav-item-icon": {
            color: active ? NAVBAR.activeIcon : NAVBAR.icon,
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s ease",
          },
          "&:hover": {
            bgcolor: active ? NAVBAR.activeBg : NAVBAR.hover,
            color: NAVBAR.activeText,
            "& .nav-item-icon": { color: NAVBAR.activeIcon },
          },
        }}
      >
        <Box className="nav-item-icon">{item.icon}</Box>
        <span>{item.label}</span>
      </Box>
    );
  };

  const renderMobileNavItem = (item) => {
    const role = authState?.role || authState?.roleName;
    if (item.adminOnly && String(role || "").toLowerCase() !== "admin") return null;

    if (item.path) {
      const rights = getRightsForPath(item.path, role);
      if (rights.deny) return null;
    }

    if (item.children) {
      const visibleChildren = item.children.filter((child) => {
        if (child.adminOnly && String(role || "").toLowerCase() !== "admin") return false;
        const rights = getRightsForPath(child.path, role);
        return !rights.deny;
      });
      if (visibleChildren.length === 0) return null;

      const isSubOpen = Boolean(mobileSubmenuOpen[item.id]);
      const active = isChildActive(item);

      return (
        <Box key={item.id} sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => toggleMobileSubmenu(item.id)}
            sx={{
              borderRadius: "8px",
              py: 0.8,
              px: 1.5,
              color: active ? NAVBAR.activeText : NAVBAR.text,
              bgcolor: active ? NAVBAR.activeBg : "transparent",
              "& .MuiListItemIcon-root": { color: active ? NAVBAR.activeIcon : NAVBAR.icon },
              "&:hover": { bgcolor: NAVBAR.hover },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: active ? 600 : 500 }} />
            {isSubOpen ? <ExpandLessRoundedIcon sx={{ fontSize: "1.1rem" }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: "1.1rem" }} />}
          </ListItemButton>
          <Collapse in={isSubOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2, pt: 0.3 }}>
              {visibleChildren.map((child) => {
                const childActive = location.pathname === child.path;
                return (
                  <ListItemButton
                    key={child.path}
                    onClick={() => {
                      navigate(child.path);
                      setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: "6px",
                      py: 0.6,
                      px: 1.5,
                      my: 0.2,
                      color: childActive ? NAVBAR.activeText : NAVBAR.text,
                      bgcolor: childActive ? NAVBAR.activeBg : "transparent",
                      borderLeft: childActive ? `3px solid ${NAVBAR.active}` : "3px solid transparent",
                      "& .MuiListItemIcon-root": { color: childActive ? NAVBAR.activeIcon : NAVBAR.icon },
                      "&:hover": { bgcolor: NAVBAR.hover },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      {child.icon}
                    </ListItemIcon>
                    <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: childActive ? 600 : 500 }} />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>
      );
    }

    const active = isItemActive(item);
    return (
      <ListItemButton
        key={item.path}
        onClick={() => {
          navigate(item.path);
          setMobileOpen(false);
        }}
        sx={{
          borderRadius: "8px",
          mb: 0.5,
          py: 0.8,
          px: 1.5,
          color: active ? NAVBAR.activeText : NAVBAR.text,
          bgcolor: active ? NAVBAR.activeBg : "transparent",
          borderLeft: active ? `3px solid ${NAVBAR.active}` : "3px solid transparent",
          "& .MuiListItemIcon-root": { color: active ? NAVBAR.activeIcon : NAVBAR.icon },
          "&:hover": { bgcolor: NAVBAR.hover },
        }}
      >
        <ListItemIcon sx={{ minWidth: 34 }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: active ? 600 : 500 }} />
      </ListItemButton>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* Role Switching Fullscreen Transition Loader */}
      {isSwitchingRole && <AppPageLoader fullScreen opaque text="Switching role..." />}

      {/* ── Top Horizontal Navigation Bar (Static at Top) ────── */}
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          zIndex: 1100,
          width: "100%",
          bgcolor: NAVBAR.bg,
          borderBottom: `1px solid ${NAVBAR.border}`,
          boxShadow: theme.palette.mode === "dark"
            ? "0 4px 20px rgba(0,0,0,0.6)"
            : "0 2px 14px rgba(18, 14, 34, 0.25)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 1.5, sm: 2, md: 3 },
            height: 58,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Left: Mobile hamburger & Original Brand Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Hamburger button for mobile/tablet */}
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{
                display: { xs: "inline-flex", md: "none" },
                color: NAVBAR.text,
                p: 0.8,
                borderRadius: "8px",
                bgcolor: "rgba(255, 255, 255, 0.03)",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: "#ffffff" },
              }}
            >
              <MenuRoundedIcon sx={{ fontSize: "1.3rem" }} />
            </IconButton>

            {/* Original Brand Logo & Name */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.4,
                mr: { xs: 1, md: 2.5 },
                flexShrink: 0,
                userSelect: "none",
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  border: "1.5px solid #ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  p: 0,
                }}
              >
                <img
                  src={logo}
                  alt="Logo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 900,
                    color: "#ffffff",
                    lineHeight: 1,
                    fontSize: "0.92rem",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Contribution
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 800,
                    color: "#ffffff",
                    lineHeight: 1.3,
                    fontSize: "0.82rem",
                    letterSpacing: "0.01em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Management
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Center: Desktop Horizontal Modules with Icons */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 0.6,
              flexGrow: 1,
              overflowX: "auto",
              py: 0.5,
              "&::-webkit-scrollbar": { display: "none" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {isUnassignedRole ? (
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", fontStyle: "italic", px: 2 }}>
                No permissions assigned
              </Typography>
            ) : (
              navigationItems.map((item) => renderTopNavItem(item))
            )}
          </Box>

          {/* Right: Original User card info, avatar, role switch, theme toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.6, sm: 1 }, flexShrink: 0 }}>
            {/* Multi-role quick switch */}
            {hasMultipleRoles && (
              <Tooltip title={otherRoleName ? `Switch to ${otherRoleName}` : "Switch Role"}>
                <IconButton
                  size="small"
                  onClick={handleQuickSwitchRole}
                  sx={{
                    color: NAVBAR.text,
                    p: 0.7,
                    borderRadius: "6px",
                    "&:hover": { bgcolor: NAVBAR.hover, color: "#10b981" },
                    transition: "all 0.2s ease",
                  }}
                >
                  <SwapHorizRoundedIcon sx={{ fontSize: "1.15rem" }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Theme Toggle Button */}
            <Tooltip title={isDark ? "Switch to Day Theme" : "Switch to Night Theme"}>
              <IconButton
                size="small"
                onClick={toggleMode}
                sx={{
                  color: NAVBAR.text,
                  p: 0.7,
                  borderRadius: "6px",
                  "&:hover": { bgcolor: NAVBAR.hover, color: "#ffffff" },
                  transition: "all 0.2s ease",
                }}
              >
                {isDark ? <LightModeOutlinedIcon sx={{ fontSize: "1.1rem" }} /> : <DarkModeOutlinedIcon sx={{ fontSize: "1.1rem" }} />}
              </IconButton>
            </Tooltip>

            {/* User Profile Greeting & Avatar (Original Style & Colors) */}
            <Box
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                py: 0.4,
                px: 1,
                borderRadius: "8px",
                transition: "all 0.15s ease",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
              }}
            >
              <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {authState?.fullName || "User"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: NAVBAR.text,
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    display: "block",
                    lineHeight: 1,
                  }}
                >
                  {authState?.role || "Member"}
                </Typography>
              </Box>

              <Avatar
                src={getImageUrl(authState?.profileImage)}
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: NAVBAR.avatarBg,
                  color: NAVBAR.avatarColor,
                  fontSize: "0.85rem",
                  fontWeight: 800,
                }}
              >
                {(authState?.fullName ?? "U")[0].toUpperCase()}
              </Avatar>

              <KeyboardArrowDownRoundedIcon
                sx={{
                  color: NAVBAR.text,
                  fontSize: "1.1rem",
                  ml: -0.5,
                }}
              />
            </Box>

            {/* Profile Dropdown Menu */}
            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={() => setProfileMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  minWidth: 210,
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                  border: (theme) =>
                    `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(74, 63, 107, 0.15)"}`,
                  py: 0.8,
                  mt: 0.8,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {authState?.fullName || "User"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Role: {authState?.role || "Member"}
                </Typography>
              </Box>

              <Divider sx={{ my: 0.5 }} />

              <MenuItem
                onClick={() => {
                  setProfileMenuAnchor(null);
                  setProfileDialogOpen(true);
                }}
                sx={{ fontSize: "0.85rem", fontWeight: 600, py: 0.9, gap: 1.5 }}
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
                    py: 0.9,
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
                sx={{ fontSize: "0.85rem", fontWeight: 600, py: 0.9, gap: 1.5 }}
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
                sx={{ fontSize: "0.85rem", fontWeight: 600, py: 0.9, gap: 1.5, color: "#ef4444" }}
              >
                <LogoutRoundedIcon sx={{ fontSize: "1.15rem", color: "#ef4444" }} />
                <span>Logout</span>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* ── Submodule Dropdown Popper (Directly Below Top Nav Item) ──────── */}
      <Popper
        open={Boolean(dropdownAnchorEl && activeDropdownItem)}
        anchorEl={dropdownAnchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 6],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleCloseDropdown}>
          <Paper
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
            elevation={8}
            sx={{
              bgcolor: NAVBAR.dropdownBg,
              color: NAVBAR.text,
              borderRadius: "10px",
              boxShadow: theme.palette.mode === "dark"
                ? "0 14px 40px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.15)"
                : "0 14px 40px rgba(18, 14, 34, 0.45), 0 0 1px rgba(255,255,255,0.1)",
              border: `1px solid ${NAVBAR.dropdownBorder}`,
              p: 0.6,
              minWidth: 190,
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: -10,
                left: 0,
                right: 0,
                height: 12,
              },
            }}
          >
            <List component="div" disablePadding>
              {activeDropdownItem?.children
                ?.filter((child) => {
                  const role = authState?.role || authState?.roleName;
                  if (child.adminOnly && String(role || "").toLowerCase() !== "admin") return false;
                  const rights = getRightsForPath(child.path, role);
                  return !rights.deny;
                })
                .map((child) => {
                  const childActive =
                    location.pathname === child.path ||
                    (child.path !== "/" && location.pathname.startsWith(child.path + "/"));

                  return (
                    <ListItemButton
                      key={child.path}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmoduleClick(child.path);
                      }}
                      selected={childActive}
                      sx={{
                        borderRadius: "8px",
                        mb: 0.3,
                        py: 0.75,
                        px: 1.4,
                        transition: "all 0.15s ease",
                        "&.Mui-selected": {
                          bgcolor: NAVBAR.activeBg,
                          borderLeft: `3px solid ${NAVBAR.active}`,
                          pl: "calc(11.2px - 3px)",
                          "& .MuiListItemIcon-root": { color: NAVBAR.activeIcon },
                          "& .MuiListItemText-primary": { color: NAVBAR.activeText, fontWeight: 600 },
                          "&:hover": { bgcolor: NAVBAR.activeBg },
                        },
                        "&:not(.Mui-selected)": {
                          borderLeft: "3px solid transparent",
                          color: NAVBAR.text,
                          "& .MuiListItemIcon-root": { color: NAVBAR.icon },
                          "& .MuiListItemText-primary": { color: NAVBAR.text, fontWeight: 500 },
                        },
                        "&:hover": {
                          bgcolor: NAVBAR.hover,
                          "& .MuiListItemText-primary": { color: NAVBAR.activeText },
                          "& .MuiListItemIcon-root": { color: NAVBAR.activeIcon },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: childActive ? NAVBAR.activeIcon : NAVBAR.icon }}>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={child.label}
                        primaryTypographyProps={{
                          fontSize: "0.85rem",
                          fontWeight: childActive ? 600 : 500,
                        }}
                      />
                    </ListItemButton>
                  );
                })}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>

      {/* ── Mobile Navigation Drawer (For Small Screens) ─────────────────── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 280,
            boxSizing: "border-box",
            bgcolor: NAVBAR.bg,
            color: NAVBAR.text,
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <img src={logo} alt="Logo" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
              Contribution
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: "#ffffff" }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: NAVBAR.divider, mx: 2, mb: 1.5 }} />

        {/* User Card */}
        <Box sx={{ px: 2, py: 1, mx: 1.5, mb: 1.5, bgcolor: NAVBAR.cardBg, borderRadius: "10px", display: "flex", alignItems: "center", gap: 1.2 }}>
          <Avatar src={getImageUrl(authState?.profileImage)} sx={{ width: 36, height: 36, bgcolor: NAVBAR.avatarBg, color: NAVBAR.avatarColor, fontWeight: 800 }}>
            {(authState?.fullName ?? "U")[0].toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="body2" fontWeight={800} color="#ffffff" noWrap>
              {authState?.fullName || "User"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
              {authState?.role || "Member"}
            </Typography>
          </Box>
        </Box>

        {/* Mobile Navigation List */}
        <List sx={{ px: 1.5, flexGrow: 1 }}>
          {navigationItems.map((item) => renderMobileNavItem(item))}
        </List>

        <Divider sx={{ borderColor: NAVBAR.divider, mx: 2, mt: 1 }} />

        {/* Mobile Drawer Footer Actions */}
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box
            onClick={() => {
              setMobileOpen(false);
              setProfileDialogOpen(true);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: "8px",
              cursor: "pointer",
              "&:hover": { bgcolor: NAVBAR.hover },
            }}
          >
            <AccountCircleOutlinedIcon sx={{ fontSize: "1.2rem", color: "#a78bfa" }} />
            <Typography variant="body2" fontWeight={600} color="#ffffff">
              My Profile
            </Typography>
          </Box>

          <Box
            onClick={() => {
              setMobileOpen(false);
              handleLogout();
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: "8px",
              cursor: "pointer",
              color: "#ef4444",
              "&:hover": { bgcolor: "rgba(239, 68, 68, 0.15)" },
            }}
          >
            <LogoutRoundedIcon sx={{ fontSize: "1.2rem", color: "#ef4444" }} />
            <Typography variant="body2" fontWeight={600}>
              Logout
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* ── Main Content (Scrolls between Static Header & Footer) ──────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          flexShrink: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          width: "100%",
          minWidth: 0,
          p: { xs: 2, sm: 2.5, md: 3 },
          bgcolor: "background.default",
          position: "relative",
        }}
      >
        {isLoading && <AppPageLoader fullScreen={true} text={loadingMessage || "Loading..."} />}
        {isUnassignedRole && location.pathname !== "/user-rights" ? (
          <NoPermissionsBlankSheet
            roleName={activeRole}
            onSwitchRole={() => setSwitchRoleDialogOpen(true)}
          />
        ) : (
          <Outlet />
        )}
      </Box>

      {/* ── Industry Standard Footer (Static at Bottom) ─────────────────────── */}
      <Box
        component="footer"
        sx={{
          flexShrink: 0,
          zIndex: 100,
          py: 1.1,
          px: 2,
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#121526" : "#ffffff"),
          borderTop: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.9,
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 -2px 10px rgba(0, 0, 0, 0.25)"
              : "0 -1px 4px rgba(0, 0, 0, 0.02)",
        }}
      >
        <LayersRoundedIcon
          sx={{
            fontSize: "1.05rem",
            color: (theme) => (theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
            flexShrink: 0,
          }}
        />
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: "0.72rem", sm: "0.78rem", md: "0.8125rem" },
            fontWeight: 500,
            color: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.65)" : "#64748b",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 1,
            rowGap: 0.3,
            lineHeight: 1.4,
          }}
        >
          <span>{new Date().getFullYear()} © 1ATeamSync</span>
          <Box
            component="span"
            sx={{
              color: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.25)" : "#cbd5e1",
              fontWeight: 300,
              userSelect: "none",
            }}
          >
            |
          </Box>
          <span>Developed by Bosco Soft Technologies</span>
          <Box
            component="span"
            sx={{
              color: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.25)" : "#cbd5e1",
              fontWeight: 300,
              userSelect: "none",
            }}
          >
            |
          </Box>
          <span>All Rights Reserved.</span>
        </Typography>
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
            <AppCancelButton onClick={() => setProfileDialogOpen(false)} />
            <AppSaveButton onClick={handleSaveProfile} />
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
                  const val = e.target.value;
                  setProfileForm((prev) => ({ ...prev, email: val }));
                  if (profileErrors.email) {
                    setProfileErrors((prev) => ({
                      ...prev,
                      email: !val.trim() ? "This field is required" : validateEmail(val),
                    }));
                  }
                }}
                maxLength={254}
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
            <AppCancelButton onClick={() => setChangePasswordDialogOpen(false)} />
            <AppSaveButton
              onClick={handleChangePassword}
              loading={changePasswordLoading}
            >
              Update
            </AppSaveButton>
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
            sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}
          >
            <AppInput
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              value={changePasswordForm.newPassword}
              maxLength={12}
              placeholder="Enter 8 to 12 characters"
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
              helperText={changePasswordErrors.newPassword}
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

            <AppInput
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={changePasswordForm.confirmPassword}
              maxLength={12}
              placeholder="Re-enter password"
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
    </Box>
  );
}
