import React from "react";
import { Button, Tooltip } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import AppAddButton, { AddButton } from "./AppAddButton";
import AppSaveButton, { SaveButton } from "./AppSaveButton";
import AppCancelButton, { CancelButton } from "./AppCancelButton";
import AppClearFilterButton, { ClearFilterButton } from "./AppClearFilterButton";
import { hasActiveFilters } from "../../utils/filterHelper";

export {
  AppAddButton,
  AddButton,
  AppSaveButton,
  SaveButton,
  AppCancelButton,
  CancelButton,
  AppClearFilterButton,
  ClearFilterButton,
};

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
  filters,
  defaultFilterValues,
  ...props
}) {
  let resolvedStartIcon = startIcon;

  const textStr = (typeof children === "string" || Array.isArray(children))
    ? String(Array.isArray(children) ? children.join("") : children).trim()
    : "";

  const isSaveBtn = /^(save|saving|update)/i.test(textStr);
  const isAddBtn = /^(add|add\s.*)$/i.test(textStr) && variant === "contained";
  const isCancelBtn = /^cancel$/i.test(textStr) && variant === "outlined";
  const isFilterBtn = /^filter$/i.test(textStr) || /^apply filter/i.test(textStr);
  const isClearFilterBtn = /^(clear filter|clear filters)$/i.test(textStr);

  let calculatedDisabled = disabled;
  if (calculatedDisabled === undefined && filters !== undefined && isClearFilterBtn) {
    calculatedDisabled = !hasActiveFilters(filters, defaultFilterValues);
  }

  const isBtnDisabled = Boolean(calculatedDisabled || props.disabled);

  // Automatically attach SaveIcon if button text is/contains "Save", "Saving...", "Update" and no startIcon is provided
  if (resolvedStartIcon === undefined && isSaveBtn) {
    resolvedStartIcon = <SaveIcon sx={{ fontSize: 18 }} />;
  }

  // Automatically attach AddIcon if button text is/starts with "Add" and no startIcon is provided
  if (resolvedStartIcon === undefined && isAddBtn) {
    resolvedStartIcon = <AddIcon sx={{ fontSize: 18 }} />;
  }

  // Automatically attach FilterListIcon if button text is "Filter" and no startIcon is provided
  if (resolvedStartIcon === undefined && isFilterBtn) {
    resolvedStartIcon = <FilterListIcon sx={{ fontSize: 17 }} />;
  }

  // Clear Filter & Cancel buttons in reference design have no start icon
  if (isClearFilterBtn || (isCancelBtn && startIcon === undefined)) {
    resolvedStartIcon = null;
  }

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
        ...(isFilterBtn && {
          height: 34,
          minHeight: 34,
          fontWeight: 700,
          fontSize: "0.75rem",
          px: 2,
          borderRadius: "8px",
          whiteSpace: "nowrap",
          bgcolor: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12) !important" : "rgba(74, 63, 107, 0.3) !important")
            : (theme) => (theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important"),
          color: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.7) !important" : "#ffffff !important")
            : "#ffffff !important",
          border: (theme) => (theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none"),
          "&:hover": {
            bgcolor: isBtnDisabled ? undefined : (theme) => (theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important"),
          },
        }),
        ...(isClearFilterBtn && {
          height: 34,
          minHeight: 34,
          fontWeight: 700,
          fontSize: "0.75rem",
          px: 2,
          borderRadius: "8px",
          whiteSpace: "nowrap",
          color: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3) !important" : "rgba(0, 0, 0, 0.28) !important")
            : "#ef4444 !important",
          border: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "1.5px solid rgba(255, 255, 255, 0.12) !important" : "1.5px solid rgba(0, 0, 0, 0.14) !important")
            : "1.5px solid rgba(239, 68, 68, 0.4) !important",
          bgcolor: "transparent !important",
          "&:hover": {
            border: isBtnDisabled ? undefined : "1.5px solid #ef4444 !important",
            bgcolor: isBtnDisabled ? undefined : (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.12) !important" : "rgba(239, 68, 68, 0.05) !important"),
            color: isBtnDisabled ? undefined : "#ef4444 !important",
          },
        }),
        ...(isCancelBtn && {
          height: 34,
          minHeight: 34,
          fontWeight: 600,
          fontSize: "0.84375rem",
          px: 2.5,
          borderRadius: "8px",
          whiteSpace: "nowrap",
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
        }),
        ...(isAddBtn && {
          height: 34,
          minHeight: 34,
          fontWeight: 600,
          fontSize: "0.8125rem",
          px: 2.2,
          borderRadius: "8px",
          whiteSpace: "nowrap",
        }),
        ...(isSaveBtn && {
          height: 34,
          minHeight: 34,
          fontWeight: 600,
          fontSize: "0.84375rem",
          px: 2.5,
          borderRadius: "8px",
          whiteSpace: "nowrap",
        }),
        ...(!isFilterBtn && variant === "contained" && {
          bgcolor: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12) !important" : "rgba(74, 63, 107, 0.3) !important")
            : (theme) => (theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important"),
          color: isBtnDisabled
            ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.7) !important" : "#ffffff !important")
            : "#ffffff !important",
          border: (theme) => (theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none"),
          "&:hover": {
            bgcolor: isBtnDisabled ? undefined : (theme) => (theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important"),
          },
        }),
        ...(!isClearFilterBtn && !isCancelBtn && variant === "outlined" && {
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
      : (disabledTooltip || (isClearFilterBtn ? "No active filters to clear" : tooltip) || null);
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
