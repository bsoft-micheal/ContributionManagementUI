import React from "react";
import { Box, Grid, Typography, Chip } from "@mui/material";
import dayjs from "dayjs";
import { formatViewDate, formatViewDateTime } from "../../utils/dateHelper";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";

const ROLE_COLORS = {
  Admin: { bg: "rgba(239,68,68,0.10)", darkBg: "rgba(239,68,68,0.20)", color: "#dc2626", darkColor: "#fca5a5" },
  Organizer: { bg: "rgba(234,179,8,0.12)", darkBg: "rgba(234,179,8,0.22)", color: "#b45309", darkColor: "#fde047" },
  Member: { bg: "rgba(74,63,107,0.08)", darkBg: "rgba(124,58,237,0.15)", color: "#4a3f6b", darkColor: "#c4b5fd" },
};

const getRoleStyle = (roleName = "") =>
  ROLE_COLORS[roleName] ?? { bg: "rgba(74,63,107,0.08)", darkBg: "rgba(124,58,237,0.15)", color: "#4a3f6b", darkColor: "#c4b5fd" };

export default function UserDetailsDialog({ open, onClose, user }) {
  if (!user) return null;

  const roleStyle = getRoleStyle(user.roleName);
  const wt = user.workType || "Office";
  const isWfh = wt.toUpperCase() === "WFH";

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="User Details"
      maxWidth="sm"
      actions={
        <AppButton
          variant="outlined"
          color="inherit"
          onClick={onClose}
          sx={{
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "#ffffff" : "rgba(74, 63, 107, 0.4)",
            color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
            "&:hover": {
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(74, 63, 107, 0.04)",
            },
          }}
        >
          Close
        </AppButton>
      }
    >
      <Grid container spacing={2.5}>
        {/* Full Name */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Full Name
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                mt: 0.3,
              }}
            >
              {user.fullName || user.FullName || user.username || "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Username */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Username
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mt: 0.3 }}>
              {user.username || "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Role */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Role
            </Typography>
            <Box sx={{ mt: 0.4 }}>
              <Chip
                label={user.roleName || "--"}
                size="small"
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? roleStyle.darkBg : roleStyle.bg,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? roleStyle.darkColor : roleStyle.color,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderRadius: "4px",
                }}
              />
            </Box>
          </Box>
        </Grid>

        {/* Email */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Email
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3, wordBreak: "break-all" }}>
              {user.email || "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Phone */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Phone Number
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
              {user.phone || "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Gender */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Gender
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
              {user.gender || "Male"}
            </Typography>
          </Box>
        </Grid>

        {/* Work Type */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Work Type
            </Typography>
            <Box sx={{ mt: 0.4 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  bgcolor: isWfh ? "rgba(147, 51, 234, 0.1)" : "rgba(37, 99, 235, 0.1)",
                  color: isWfh ? "#9333ea" : "#2563eb",
                  border: isWfh
                    ? "1px solid rgba(147, 51, 234, 0.25)"
                    : "1px solid rgba(37, 99, 235, 0.25)",
                  px: 1.2,
                  py: 0.3,
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  display: "inline-block",
                }}
              >
                {wt}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Status */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Status
            </Typography>
            <Box sx={{ mt: 0.4 }}>
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{
                  color: user.isActive ? "#16a34a" : "#dc2626",
                  bgcolor: user.isActive ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                  px: 1.2,
                  py: 0.3,
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  letterSpacing: "0.04em",
                  display: "inline-block",
                }}
              >
                {user.isActive ? "Active" : "Inactive"}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Date of Birth */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Date of Birth
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
              {user.dateOfBirth ? formatViewDate(user.dateOfBirth) : "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Joining Date */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Joining Date
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
              {user.joiningDate ? formatViewDate(user.joiningDate) : "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Created On */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.7rem", display: "block" }}
            >
              Created On
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
              {user.createdOn || user.createdAt
                ? formatViewDate(user.createdOn || user.createdAt)
                : "--"}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </AppDialog>
  );
}
