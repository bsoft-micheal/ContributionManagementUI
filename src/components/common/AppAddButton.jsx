import React from "react";
import AppButton from "./AppButton";
import AddIcon from "@mui/icons-material/Add";

/**
 * Reusable Add Button component matching the reference design:
 * - Purple contained button (#2563a6, hover #1d5083)
 * - White text (#ffffff)
 * - AddIcon (+) start icon
 * - Height: 34px, border radius: 8px, px: 2.2
 * - Consistent font size, weight, and styling across the entire app
 */
export default function AppAddButton({
  children,
  startIcon,
  sx = {},
  variant = "contained",
  ...props
}) {
  // Enforce button label to strictly be just "Add"
  const buttonLabel = "Add";

  return (
    <AppButton
      variant={variant}
      startIcon={startIcon !== undefined ? startIcon : <AddIcon sx={{ fontSize: 18 }} />}
      sx={{
        borderRadius: "8px",
        height: 34,
        minHeight: 34,
        fontWeight: 600,
        fontSize: "0.8125rem",
        px: 2.2,
        whiteSpace: "nowrap",
        textTransform: "none",
        boxShadow: "none",
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#2d6bb3 !important" : "#2563a6 !important"),
        color: "#ffffff !important",
        border: (theme) => (theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none"),
        "&:hover": {
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#3b7fc7 !important" : "#1d5083 !important"),
          boxShadow: "none",
        },
        ...sx,
      }}
      {...props}
    >
      {buttonLabel}
    </AppButton>
  );
}

export { AppAddButton as AddButton };
