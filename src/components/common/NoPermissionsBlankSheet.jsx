import React from "react";
import { Box, Paper, Typography, Chip } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default function NoPermissionsBlankSheet({ roleName }) {
  const currentRole = roleName || "User";

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, md: 4 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 540,
          width: "100%",
          p: { xs: 4, sm: 6 },
          borderRadius: "16px",
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(74, 63, 107, 0.15)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(30, 34, 53, 0.7)" : "#ffffff",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 12px 36px rgba(0, 0, 0, 0.4)"
              : "0 12px 36px rgba(74, 63, 107, 0.08)",
          textAlign: "center",
        }}
      >
        {/* Lock Icon with Glowing Background */}
        <Box
          sx={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(245, 158, 11, 0.12)",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            boxShadow: "0 4px 18px rgba(245, 158, 11, 0.18)",
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 38 }} />
        </Box>

        {/* Role Badge */}
        <Chip
          label={`Role: ${currentRole}`}
          size="small"
          sx={{
            mb: 2.2,
            fontWeight: 700,
            fontSize: "0.78rem",
            bgcolor: "rgba(99, 102, 241, 0.1)",
            color: "#6366f1",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            px: 0.5,
          }}
        />

        {/* Primary Validation Message */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
            fontSize: { xs: "1.05rem", sm: "1.2rem" },
            lineHeight: 1.4,
          }}
        >
          No permissions assigned. Contact your administrator for access.
        </Typography>
      </Paper>
    </Box>
  );
}
