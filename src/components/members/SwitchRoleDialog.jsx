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
import { updateUserAsync } from "../../services/userService";

export default function SwitchRoleDialog({ open, onClose, targetUser, onSuccess }) {
  const theme = useTheme();
  const { authState, switchRole } = useAuth();
  const toast = useAppToast();
  const [selectedRole, setSelectedRole] = useState("");
  const [switching, setSwitching] = useState(false);

  // Determine effective user data (either target user or current logged in authState)
  const effectiveUser = targetUser || authState;

  // Extract roles list
  const rolesList = React.useMemo(() => {
    if (!effectiveUser) return [];
    const set = new Set();
    if (Array.isArray(effectiveUser.roles) && effectiveUser.roles.length > 0) {
      effectiveUser.roles.forEach((r) => r && set.add(r));
    }
    if (Array.isArray(effectiveUser.primaryRoles)) {
      effectiveUser.primaryRoles.forEach((r) => r && set.add(r));
    }
    if (Array.isArray(effectiveUser.secondaryRoles)) {
      effectiveUser.secondaryRoles.forEach((r) => r && set.add(r));
    }
    if (effectiveUser.role) set.add(effectiveUser.role);
    if (effectiveUser.roleName) set.add(effectiveUser.roleName);
    return Array.from(set);
  }, [effectiveUser]);

  // Determine currently active role
  const currentActiveRole = targetUser ? (targetUser.roleName || targetUser.role || "") : (authState?.role || "");

  // Determine primary roles list for badges
  const primaryRoles = React.useMemo(() => {
    if (effectiveUser?.primaryRoles && Array.isArray(effectiveUser.primaryRoles) && effectiveUser.primaryRoles.length > 0) {
      return effectiveUser.primaryRoles;
    }
    // Fallback: first role is primary
    return rolesList.length > 0 ? [rolesList[0]] : [];
  }, [effectiveUser, rolesList]);

  useEffect(() => {
    if (open) {
      setSelectedRole(currentActiveRole || (rolesList[0] || ""));
      setSwitching(false);
    }
  }, [open, currentActiveRole, rolesList]);

  const handleSwitch = async () => {
    if (!selectedRole) return;
    if (selectedRole === currentActiveRole) {
      onClose();
      return;
    }

    setSwitching(true);
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
          primaryRoles: primaryRoles.length > 0 ? primaryRoles : [selectedRole],
          secondaryRoles: targetUser.secondaryRoles || [],
          roleName: selectedRole,
        });
        toast.success(`Active role for ${targetUser.fullName || targetUser.username} switched to ${selectedRole}`);
      } else {
        await switchRole(selectedRole);
        toast.success(`Active role switched to ${selectedRole}`);
      }
      if (onSuccess) onSuccess(selectedRole);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to switch role";
      toast.error(msg);
    } finally {
      setSwitching(false);
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
        <Stack direction="row" spacing={1.5} sx={{ width: "100%", justifyContent: "flex-end" }}>
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
            onClick={handleSwitch}
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

        <Stack spacing={1.2}>
          {rolesList.map((r) => {
            const isSelected = selectedRole === r;
            const isActive = currentActiveRole === r;
            const isPrimary = primaryRoles.includes(r);

            return (
              <Box
                key={r}
                onClick={() => setSelectedRole(r)}
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
      </Box>
    </AppDialog>
  );
}
