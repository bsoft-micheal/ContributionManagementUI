import React from "react";
import AppButton from "./AppButton";

/**
 * Reusable Cancel Button component matching the reference design:
 * - Outlined button with soft border (#d8d8e5 in light mode, rgba(144, 202, 249, 0.4) in dark mode)
 * - Blue text (#1976d2 in light mode, #90caf9 in dark mode)
 * - Background: white/transparent, hover subtle blue tint
 * - Height: 34px, border radius: 8px, px: 2.5
 * - No start icon (clean text matching reference)
 * - Consistent font size (0.84375rem), weight (600), and styling across the entire app
 */
export default function AppCancelButton({
  children = "Cancel",
  startIcon = null,
  sx = {},
  variant = "outlined",
  ...props
}) {
  return (
    <AppButton
      variant={variant}
      startIcon={startIcon}
      sx={{
        borderRadius: "8px",
        height: 34,
        minHeight: 34,
        fontWeight: 600,
        fontSize: "0.84375rem",
        px: 2.5,
        whiteSpace: "nowrap",
        textTransform: "none",
        boxShadow: "none",
        color: (theme) => (theme.palette.mode === "dark" ? "#90caf9 !important" : "#1976d2 !important"),
        border: (theme) =>
          theme.palette.mode === "dark"
            ? "1.5px solid rgba(144, 202, 249, 0.4) !important"
            : "1.5px solid #d8d8e5 !important",
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff"),
        "&:hover": {
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1.5px solid #90caf9 !important"
              : "1.5px solid #1976d2 !important",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(144, 202, 249, 0.08) !important"
              : "rgba(25, 118, 210, 0.04) !important",
          color: (theme) => (theme.palette.mode === "dark" ? "#90caf9 !important" : "#1976d2 !important"),
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </AppButton>
  );
}

export { AppCancelButton as CancelButton };
