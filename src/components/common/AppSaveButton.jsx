import React from "react";
import AppButton from "./AppButton";
import SaveIcon from "@mui/icons-material/Save";

/**
 * Reusable Save Button component matching the reference design:
 * - Purple contained button (#2563a6, hover #1d5083)
 * - White text (#ffffff)
 * - SaveIcon (floppy disk) start icon
 * - Height: 34px, border radius: 8px, px: 2.5
 * - Consistent font size (0.84375rem), weight (600), and styling across the entire app
 */
export default function AppSaveButton({
  children = "Save",
  startIcon,
  sx = {},
  variant = "contained",
  ...props
}) {
  return (
    <AppButton
      variant={variant}
      startIcon={startIcon !== undefined ? startIcon : <SaveIcon sx={{ fontSize: 18 }} />}
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
      {children}
    </AppButton>
  );
}

export { AppSaveButton as SaveButton };
