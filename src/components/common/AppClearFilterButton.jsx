import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import AppButton from "./AppButton";
import { hasActiveFilters } from "../../utils/filterHelper";

/**
 * Reusable Clear Filter Button component for all filter bars in the application.
 *
 * Automatically handles enabled/disabled state:
 * - When all filters are empty, "ALL", or matching defaultValues -> disabled
 * - When any filter has a selected value -> enabled
 *
 * Can be used either by passing:
 * 1. `filters={{ year: filterYear, month: filterMonth, ... }}` (automatically calculates disabled)
 * 2. `disabled={!isFilterActive}` (explicit control)
 */
export default function AppClearFilterButton({
  startIcon = <CloseIcon sx={{ fontSize: 16 }} />,
  children = "Clear Filter",
  filters,
  defaultValues,
  disabled,
  disabledTooltip = "No active filters to clear",
  onClick,
  sx = {},
  variant = "outlined",
  size = "small",
  ...props
}) {
  const isAutoDisabled = filters !== undefined ? !hasActiveFilters(filters, defaultValues) : false;
  const isFinalDisabled = disabled !== undefined ? Boolean(disabled) : isAutoDisabled;

  return (
    <AppButton
      variant={variant}
      startIcon={startIcon}
      size={size}
      disabled={isFinalDisabled}
      disabledTooltip={disabledTooltip}
      onClick={onClick}
      sx={{
        height: 34,
        minHeight: 34,
        fontWeight: 700,
        fontSize: "0.75rem",
        px: 2,
        borderRadius: "8px",
        whiteSpace: "nowrap",
        ...sx,
      }}
      {...props}
    >
      {children}
    </AppButton>
  );
}

export { AppClearFilterButton as ClearFilterButton };
