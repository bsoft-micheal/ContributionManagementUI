import React from "react";
import { Button, Tooltip } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

export default function AppButton({
  children,
  variant = "contained",
  color = "primary",
  sx = {},
  startIcon,
  endIcon,
  disabled,
  disabledTooltip = null,
  tooltip,
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

  const isBtnDisabled = Boolean(disabled || props.disabled);

  const buttonElement = (
    <Button
      variant={variant}
      color={color}
      startIcon={resolvedStartIcon}
      endIcon={endIcon}
      disabled={isBtnDisabled}
      sx={{
        borderRadius: "8px",
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.84375rem",
        letterSpacing: "0.01em",
        px: 2.5,
        py: 0.75,
        boxShadow: "none",
        ...(variant === "contained" && {
          bgcolor: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12) !important" : "rgba(74, 63, 107, 0.3) !important")
            : "#4a3f6b !important",
          color: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.7) !important" : "#ffffff !important")
            : "#ffffff !important",
          "&:hover": {
            bgcolor: isBtnDisabled ? undefined : "#3b325c !important",
          },
        }),
        ...(variant === "outlined" && {
          border: (theme) =>
            isBtnDisabled
              ? `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.25)" : "rgba(74, 63, 107, 0.3)"} !important`
              : `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.28)" : "#cbd5e1"}`,
          color: (theme) =>
            isBtnDisabled
              ? theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.7) !important"
                : "#64748b !important"
              : theme.palette.mode === "dark"
              ? "#ffffff"
              : "#475569",
          "&:hover": {
            border: (theme) =>
              isBtnDisabled ? undefined : `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.5)" : "#94a3b8"}`,
            backgroundColor: (theme) =>
              isBtnDisabled ? undefined : theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
          },
        }),
        "&.Mui-disabled": {
          opacity: "0.7 !important",
          cursor: "not-allowed !important",
          pointerEvents: "none",
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );

  // If disabled, wrap in a container to show not-allowed cursor and optional tooltip
  if (isBtnDisabled) {
    const tipTitle = (disabledTooltip === false || disabledTooltip === "")
      ? null
      : (disabledTooltip || tooltip || "Disabled");
    const wrappedBtn = (
      <span
        style={{
          display: props.fullWidth ? "flex" : "inline-flex",
          width: props.fullWidth ? "100%" : "auto",
          cursor: "not-allowed",
          verticalAlign: "middle",
        }}
      >
        {buttonElement}
      </span>
    );

    if (tipTitle) {
      return (
        <Tooltip title={tipTitle} arrow placement="top">
          {wrappedBtn}
        </Tooltip>
      );
    }
    return wrappedBtn;
  }

  // If active with explicit tooltip
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow placement="top">
        {buttonElement}
      </Tooltip>
    );
  }

  return buttonElement;
}
