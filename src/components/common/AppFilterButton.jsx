import React from "react";
import AppButton from "./AppButton";
import FilterListIcon from "@mui/icons-material/FilterList";

/**
 * Reusable Filter Button component matching the reference design:
 * - Theme primary contained button (#2563a6, hover #1d5083, active #193b5b)
 * - White text (#ffffff)
 * - FilterListIcon start icon
 * - Height: 34px, border radius: 8px, px: 2
 * - Consistent font size (0.75rem / 12px), weight 700, and styling across the entire app
 */
export default function AppFilterButton({
  children = "Filter",
  startIcon,
  sx = {},
  variant = "contained",
  disabled,
  ...props
}) {
  return (
    <AppButton
      variant={variant}
      startIcon={startIcon !== undefined ? startIcon : <FilterListIcon sx={{ fontSize: 17 }} />}
      disabled={disabled}
      sx={{
        borderRadius: "8px",
        height: 34,
        minHeight: 34,
        fontWeight: 700,
        fontSize: "0.75rem",
        px: 2,
        whiteSpace: "nowrap",
        textTransform: "none",
        boxShadow: "none",
        bgcolor: disabled
          ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12) !important" : "rgba(37, 99, 166, 0.3) !important")
          : (theme) => (theme.palette.mode === "dark" ? "#2d6bb3 !important" : "#2563a6 !important"),
        color: disabled
          ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.7) !important" : "#ffffff !important")
          : "#ffffff !important",
        border: (theme) => (theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none"),
        "&:hover": {
          bgcolor: disabled ? undefined : (theme) => (theme.palette.mode === "dark" ? "#3b7fc7 !important" : "#1d5083 !important"),
          boxShadow: "none",
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </AppButton>
  );
}

export { AppFilterButton as FilterButton };

