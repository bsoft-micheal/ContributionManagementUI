import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Radio,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import { useAppToast } from "../common/AppToast";
import { useNavigationLoading } from "../../contexts/NavigationLoadingContext";
import { updateUserAsync, getUserByIdAsync, getProfileAsync } from "../../services/userService";
import { getRolesAsync } from "../../services/roleService";

export default function SwitchRoleDialog({ open, onClose, targetUser, onSuccess }) {
  const theme = useTheme();
  const { authState, switchRole, fetchProfile } = useAuth();
  const { showLoader, hideLoader } = useNavigationLoading();
  const toast = useAppToast();
  const [selectedRole, setSelectedRole] = useState("");
  const [switching, setSwitching] = useState(false);
  const [fetchedUserData, setFetchedUserData] = useState(null);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [activeMasterRoles, setActiveMasterRoles] = useState([]);

  // Fetch latest user details and active master roles on modal open
  useEffect(() => {
    if (open) {
      let isMounted = true;
      const loadUserDetails = async () => {
        setLoadingUserRoles(true);
        try {
          const [masterRolesRes, userRes] = await Promise.allSettled([
            getRolesAsync(),
            targetUser && targetUser.userId && targetUser.userId !== authState?.userId
              ? getUserByIdAsync(targetUser.userId)
              : (fetchProfile ? fetchProfile() : getProfileAsync().then((r) => r?.data || r)),
          ]);

          if (isMounted && masterRolesRes.status === "fulfilled" && Array.isArray(masterRolesRes.value)) {
            setActiveMasterRoles(masterRolesRes.value);
          }

          if (isMounted && userRes.status === "fulfilled" && userRes.value) {
            const data = userRes.value?.data || userRes.value;
            setFetchedUserData(data);
          }
        } catch {
          // ignore background load error and fallback to effectiveUser
        } finally {
          if (isMounted) setLoadingUserRoles(false);
        }
      };
      loadUserDetails();
      return () => {
        isMounted = false;
      };
    } else {
      setFetchedUserData(null);
      setActiveMasterRoles([]);
    }
  }, [open, targetUser, authState?.userId]);

  // Determine effective user data (freshly fetched, or target user or current logged in authState)
  const effectiveUser = fetchedUserData || targetUser || authState;

  // Extract roles list, filtering against active master roles
  const rolesList = React.useMemo(() => {
    if (!effectiveUser) return [];

    const validMasterSet = new Set(
      (activeMasterRoles || []).map((r) => (r.roleName || r.name || "").trim().toLowerCase()).filter(Boolean)
    );

    const set = new Set();
    const addRole = (r) => {
      if (!r || typeof r !== "string") return;
      const clean = r.trim();
      if (!clean) return;
      if (validMasterSet.size > 0 && !validMasterSet.has(clean.toLowerCase())) {
        return; // Filter out deleted or inactive roles
      }
      for (const item of set) {
        if (item.toLowerCase() === clean.toLowerCase()) return;
      }
      set.add(clean);
    };

    if (Array.isArray(effectiveUser.roles)) effectiveUser.roles.forEach(addRole);
    if (Array.isArray(effectiveUser.Roles)) effectiveUser.Roles.forEach(addRole);
    if (Array.isArray(effectiveUser.primaryRoles)) effectiveUser.primaryRoles.forEach(addRole);
    if (Array.isArray(effectiveUser.PrimaryRoles)) effectiveUser.PrimaryRoles.forEach(addRole);
    if (Array.isArray(effectiveUser.secondaryRoles)) effectiveUser.secondaryRoles.forEach(addRole);
    if (Array.isArray(effectiveUser.SecondaryRoles)) effectiveUser.SecondaryRoles.forEach(addRole);
    if (effectiveUser.role) addRole(effectiveUser.role);
    if (effectiveUser.roleName) addRole(effectiveUser.roleName);

    return Array.from(set);
  }, [effectiveUser, activeMasterRoles]);

  // Determine currently active role
  const currentActiveRole = targetUser
    ? (targetUser.roleName || targetUser.role || "")
    : (authState?.role || authState?.roleName || "");

  // Determine primary roles list for badges
  const primaryRoles = React.useMemo(() => {
    const list = [];
    const addP = (r) => {
      if (!r || typeof r !== "string") return;
      const clean = r.trim();
      if (clean && !list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
        list.push(clean);
      }
    };
    if (effectiveUser?.primaryRoles && Array.isArray(effectiveUser.primaryRoles)) {
      effectiveUser.primaryRoles.forEach(addP);
    }
    if (effectiveUser?.PrimaryRoles && Array.isArray(effectiveUser.PrimaryRoles)) {
      effectiveUser.PrimaryRoles.forEach(addP);
    }
    const filteredList = list.filter((p) => rolesList.some((r) => r.toLowerCase() === p.toLowerCase()));
    if (filteredList.length === 0 && rolesList.length > 0) {
      filteredList.push(rolesList[0]);
    }
    return filteredList;
  }, [effectiveUser, rolesList]);

  useEffect(() => {
    if (open) {
      if (currentActiveRole && rolesList.some((r) => r.toLowerCase() === currentActiveRole.toLowerCase())) {
        const found = rolesList.find((r) => r.toLowerCase() === currentActiveRole.toLowerCase());
        setSelectedRole(found || currentActiveRole);
      } else if (rolesList.length > 0) {
        setSelectedRole(rolesList[0]);
      }
      setSwitching(false);
    }
  }, [open, currentActiveRole, rolesList]);

  const handleSwitch = async (roleToUse) => {
    const targetRoleName = roleToUse || selectedRole;
    if (!targetRoleName) return;
    if (targetRoleName.toLowerCase() === String(currentActiveRole).toLowerCase()) {
      onClose();
      return;
    }

    setSwitching(true);
    showLoader("Switching role...");
    try {
      if (targetUser && targetUser.userId && targetUser.userId !== authState?.userId) {
        // If an admin is switching role for another user in the table:
        await updateUserAsync(targetUser.userId, {
          fullName: targetUser.fullName || targetUser.FullName || targetUser.username,
          username: targetUser.username,
          email: targetUser.email,
          phone: targetUser.phone,
          gender: targetUser.gender,
          workType: targetUser.workType,
          dateOfBirth: targetUser.dateOfBirth,
          joiningDate: targetUser.joiningDate,
          isActive: targetUser.isActive,
          enableMultipleRoles: targetUser.enableMultipleRoles ?? (rolesList.length > 1),
          primaryRoles: primaryRoles.length > 0 ? primaryRoles : [targetRoleName],
          secondaryRoles: targetUser.secondaryRoles || [],
          roleName: targetRoleName,
        });
      } else {
        onClose();
        await switchRole(targetRoleName);
      }
      if (onSuccess) onSuccess(targetRoleName);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to switch role";
      toast.error(msg);
    } finally {
      setSwitching(false);
      setTimeout(() => {
        hideLoader();
      }, 300);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={switching ? undefined : onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SwapHorizRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.35rem" }} />
          <span>Switch Role</span>
        </Box>
      }
      maxWidth="xs"
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: "100%", justifyContent: "center" }}>
          <AppButton
            variant="outlined"
            onClick={onClose}
            disabled={switching}
            sx={{
              borderRadius: "8px",
              px: 3,
              py: 0.7,
              textTransform: "none",
              fontWeight: 600,
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(74,63,107,0.25)",
              color: "text.primary",
              "&:hover": {
                borderColor: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                bgcolor: "transparent",
              },
            }}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={() => handleSwitch(selectedRole)}
            disabled={switching || !selectedRole}
            sx={{
              borderRadius: "8px",
              px: 3.5,
              py: 0.7,
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#4a3f6b !important",
              "&:hover": { bgcolor: "#3b325c !important" },
            }}
          >
            {switching ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>Switching…</span>
              </Stack>
            ) : (
              "Switch"
            )}
          </AppButton>
        </Stack>
      }
    >
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "0.85rem" }}>
          Select the role you want to activate for your current session:
        </Typography>

        {loadingUserRoles && rolesList.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} sx={{ color: "#7c3aed" }} />
          </Box>
        ) : (
          <Stack spacing={1.2}>
            {rolesList.map((r) => {
              const isSelected = selectedRole.toLowerCase() === r.toLowerCase();
              const isActive = String(currentActiveRole).toLowerCase() === r.toLowerCase();
              const isPrimary = primaryRoles.some((p) => p.toLowerCase() === r.toLowerCase());

              return (
                <Box
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  onDoubleClick={() => handleSwitch(r)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.4,
                    px: 1.8,
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: "1.5px solid",
                    borderColor: isSelected
                      ? "#7c3aed"
                      : theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(74, 63, 107, 0.12)",
                    bgcolor: isSelected
                      ? theme.palette.mode === "dark"
                        ? "rgba(124, 58, 237, 0.16)"
                        : "rgba(124, 58, 237, 0.05)"
                      : theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.02)"
                      : "#faf9fd",
                    transition: "all 0.18s ease",
                    "&:hover": {
                      borderColor: isSelected ? "#7c3aed" : "rgba(124, 58, 237, 0.4)",
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(124, 58, 237, 0.12)"
                          : "rgba(124, 58, 237, 0.03)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Radio
                      checked={isSelected}
                      onChange={() => setSelectedRole(r)}
                      value={r}
                      size="small"
                      sx={{
                        p: 0.3,
                        color:
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(74,63,107,0.3)",
                        "&.Mui-checked": {
                          color: "#7c3aed",
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={isSelected ? 800 : 600}
                      sx={{
                        color:
                          isSelected
                            ? theme.palette.mode === "dark"
                              ? "#ffffff"
                              : "#1e1a2e"
                            : "text.primary",
                        fontSize: "0.92rem",
                      }}
                    >
                      {r}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={0.8} alignItems="center">
                    {isPrimary && (
                      <Chip
                        label="Primary"
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          bgcolor: "rgba(16, 185, 129, 0.12)",
                          color: "#10b981",
                          borderRadius: "4px",
                        }}
                      />
                    )}

                    {isActive && (
                      <Chip
                        label="Active"
                        size="small"
                        icon={<CheckCircleRoundedIcon sx={{ fontSize: "0.85rem !important", color: "#7c3aed !important" }} />}
                        sx={{
                          height: 22,
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          bgcolor: "rgba(124, 58, 237, 0.12)",
                          color: "#7c3aed",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </AppDialog>
  );
}
