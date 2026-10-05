import React from "react";
import { Button } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

export default function AppButton({
  children,
  variant = "contained",
  color = "primary",
  sx = {},
  startIcon,
  endIcon,
  ...props
}) {
  let resolvedStartIcon = startIcon;

  // Automatically attach SaveIcon if button text is/contains "Save", "Saving...", "Update" and no startIcon is provided
  if (!resolvedStartIcon && (typeof children === "string" || Array.isArray(children))) {
    const textStr = String(Array.isArray(children) ? children.join("") : children).trim();
    if (/^(save|saving|update)/i.test(textStr)) {
      resolvedStartIcon = <SaveIcon />;
    }
  }

  return (
    <Button
      variant={variant}
      color={color}
      startIcon={resolvedStartIcon}
      endIcon={endIcon}
      sx={{
        borderRadius: "8px",
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.85rem",
        px: 2.5,
        py: 0.75,
        boxShadow: "none",
        ...(variant === "contained" && {
          bgcolor: (theme) => props.disabled ? undefined : "#4a3f6b !important",
          color: "#ffffff !important",
          "&:hover": {
            bgcolor: "#3b325c !important",
          },
        }),
        ...(variant === "outlined" && {
          border: (theme) => `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.28)" : "#cbd5e1"}`,
          color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#475569",
          "&:hover": {
            border: (theme) => `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.5)" : "#94a3b8"}`,
            backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
