import React from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { usePickerContext } from "@mui/x-date-pickers/hooks";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import dayjs from "dayjs";

/**
 * Custom action bar with "Today" button (with icon) on left, Cancel & OK on right
 */
function CustomActionBar({ onSetToday, onCancel, onAccept, onSelectToday, className }) {
  const {
    setValueToToday,
    acceptValueChanges,
    cancelValueChanges,
  } = usePickerContext();

  const handleTodayClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (setValueToToday) {
      setValueToToday();
    }
    if (onSelectToday) {
      onSelectToday();
    }
    if (onSetToday) {
      onSetToday();
    }
    if (acceptValueChanges) {
      acceptValueChanges();
    } else if (onAccept) {
      onAccept();
    }
  };

  const handleCancelClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (cancelValueChanges) {
      cancelValueChanges();
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleOkClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (acceptValueChanges) {
      acceptValueChanges();
    } else if (onAccept) {
      onAccept();
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        pb: 1.5,
        pt: 0.8,
        borderTop: (theme) =>
          theme.palette.mode === "dark"
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(74, 63, 107, 0.08)",
      }}
    >
      {/* Today button with Today icon */}
      <Button
        size="small"
        startIcon={<TodayRoundedIcon sx={{ fontSize: "1.05rem" }} />}
        onClick={handleTodayClick}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.82rem",
          color: (theme) =>
            theme.palette.mode === "dark" ? "#a78bfa" : "#6355a4",
          borderRadius: "8px",
          px: 1.2,
          py: 0.4,
          "&:hover": {
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(167, 139, 250, 0.12)"
                : "rgba(99, 85, 164, 0.08)",
          },
        }}
      >
        Today
      </Button>

      {/* Right side: Cancel & OK buttons */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
        <Button
          size="small"
          onClick={handleCancelClick}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.82rem",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#94a3b8" : "#64748b",
            borderRadius: "8px",
            px: 1.2,
            py: 0.4,
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          size="small"
          onClick={handleOkClick}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.82rem",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(74, 63, 107, 0.08)",
            borderRadius: "8px",
            px: 1.4,
            py: 0.4,
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(74, 63, 107, 0.15)",
            },
          }}
        >
          OK
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Custom Material calendar header matching the user's design:
 * Left:  <  Month ▾  >
 * Right: <   Year ▾  >
 */
function CustomCalendarHeader({
  currentMonth,
  onMonthChange,
  view,
  onViewChange,
  disabled,
}) {
  const month = currentMonth
    ? dayjs.isDayjs(currentMonth)
      ? currentMonth
      : dayjs(currentMonth)
    : dayjs();

  const handlePrevMonth = () => {
    if (!onMonthChange) return;
    onMonthChange(month.subtract(1, "month"), "left");
  };

  const handleNextMonth = () => {
    if (!onMonthChange) return;
    onMonthChange(month.add(1, "month"), "right");
  };

  const handlePrevYear = () => {
    if (!onMonthChange) return;
    onMonthChange(month.subtract(1, "year"), "left");
  };

  const handleNextYear = () => {
    if (!onMonthChange) return;
    onMonthChange(month.add(1, "year"), "right");
  };

  const handleToggleMonth = () => {
    if (onViewChange) {
      onViewChange(view === "month" ? "day" : "month");
    }
  };

  const handleToggleYear = () => {
    if (onViewChange) {
      onViewChange(view === "year" ? "day" : "year");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        pt: 1.5,
        pb: 1,
      }}
    >
      {/* Left: < Month ▾ > */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
        <IconButton
          size="small"
          onClick={handlePrevMonth}
          disabled={disabled}
          sx={{
            p: 0.4,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: "1.15rem" }} />
        </IconButton>

        <Button
          size="small"
          onClick={handleToggleMonth}
          endIcon={
            <ArrowDropDownRoundedIcon sx={{ ml: -0.5, fontSize: "1.2rem" }} />
          }
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
            minWidth: 0,
            px: 0.8,
            py: 0.2,
            borderRadius: "6px",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          {month.format("MMM")}
        </Button>

        <IconButton
          size="small"
          onClick={handleNextMonth}
          disabled={disabled}
          sx={{
            p: 0.4,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: "1.15rem" }} />
        </IconButton>
      </Box>

      {/* Right: < Year ▾ > */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
        <IconButton
          size="small"
          onClick={handlePrevYear}
          disabled={disabled}
          sx={{
            p: 0.4,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: "1.15rem" }} />
        </IconButton>

        <Button
          size="small"
          onClick={handleToggleYear}
          endIcon={
            <ArrowDropDownRoundedIcon sx={{ ml: -0.5, fontSize: "1.2rem" }} />
          }
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
            minWidth: 0,
            px: 0.8,
            py: 0.2,
            borderRadius: "6px",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          {month.format("YYYY")}
        </Button>

        <IconButton
          size="small"
          onClick={handleNextYear}
          disabled={disabled}
          sx={{
            p: 0.4,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: "1.15rem" }} />
        </IconButton>
      </Box>
    </Box>
  );
}

/**
 * Safely parse any date representation to a valid dayjs object
 */
function toDayjs(val) {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
  if (val instanceof Date) {
    const d = dayjs(val);
    return d.isValid() ? d : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split("/").map(Number);
      const parsed = dayjs(new Date(y, m - 1, d));
      if (parsed.isValid()) return parsed;
    }
    const parsed = dayjs(trimmed);
    if (parsed.isValid()) return parsed;
  }
  return null;
}

export default function AppDateInput({
  label,
  value,
  onChange,
  format = "DD/MM/YYYY",
  fullWidth = true,
  size = "small",
  error = false,
  helperText = "",
  required = false,
  disabled = false,
  readOnly = false,
  minDate,
  maxDate,
  disableFuture,
  disablePast,
  clearable = false,
  startAdornment,
  sx: customSx = {},
  slotProps: customSlotProps = {},
  InputProps,
  inputProps,
  InputLabelProps,
  FormHelperTextProps,
  ...props
}) {
  const theme = useTheme();
  const dayjsVal = toDayjs(value);

  const handleChange = (newValue) => {
    if (onChange) {
      onChange(newValue && newValue.isValid() ? newValue : null);
    }
  };

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto", ...customSx }}>
      {/* Label placed above the input field (matching AppSelect / Select Status exactly) */}
      {label && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 0.5,
            fontWeight: 600,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
            textTransform: "none",
            letterSpacing: "0.01em",
            fontSize: "0.78125rem",
          }}
        >
          {label}
          {required && (
            <Box
              component="span"
              sx={{ color: "#d32f2f", ml: 0.5, fontSize: "1rem", lineHeight: 0 }}
            >
              *
            </Box>
          )}
        </Typography>
      )}

      <DatePicker
        value={dayjsVal}
        onChange={handleChange}
        format={format}
        disabled={disabled}
        readOnly={readOnly}
        minDate={minDate ? toDayjs(minDate) : undefined}
        maxDate={maxDate ? toDayjs(maxDate) : undefined}
        disableFuture={disableFuture}
        disablePast={disablePast}
        closeOnSelect={false}
        showDaysOutsideCurrentMonth
        dayOfWeekFormatter={(date) =>
          date ? (date.format ? date.format("dd")[0] : dayjs(date).format("dd")[0]) : ""
        }
        slots={{
          calendarHeader: CustomCalendarHeader,
          actionBar: CustomActionBar,
          openPickerIcon: CalendarMonthRoundedIcon,
          ...props.slots,
        }}
        slotProps={{
          field: {
            clearable: clearable,
            ...customSlotProps.field,
          },
          textField: {
            size: size,
            error: error,
            helperText: helperText,
            ...(InputProps ? { InputProps } : {}),
            ...(inputProps ? { inputProps } : {}),
            ...(InputLabelProps ? { InputLabelProps } : {}),
            ...(FormHelperTextProps ? { FormHelperTextProps } : {}),
            ...customSlotProps.textField,
          },
          openPickerButton: {
            size: "small",
            sx: {
              width: 24,
              height: 24,
              minWidth: 24,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "#e8e5ef",
              borderRadius: "6px",
              p: "2px",
              mr: 0,
              color: (theme) =>
                theme.palette.mode === "dark" ? "#e7ebf7" : "#373145",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.14)"
                    : "#ddd8e6",
                color: "secondary.main",
              },
              "& .MuiSvgIcon-root": {
                fontSize: "0.95rem",
              },
            },
            ...customSlotProps.openPickerButton,
          },
          actionBar: {
            actions: ["today", "cancel", "accept"],
            onSelectToday: () => {
              handleChange(dayjs());
            },
            ...customSlotProps.actionBar,
          },
          textField: {
            size: size,
            fullWidth: fullWidth,
            error: Boolean(error),
            helperText: helperText,
            placeholder: format,
            variant: "outlined",
            InputProps: {
              startAdornment: startAdornment ? (
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    mr: 0.5,
                    ml: 0.2,
                    pointerEvents: "none",
                  }}
                >
                  {startAdornment}
                </Box>
              ) : undefined,
              ...customSlotProps.textField?.InputProps,
            },
            sx: {
              "& .MuiOutlinedInput-root": {
                fontSize: size === "small" ? "0.68rem" : "0.74rem",
                bgcolor: "background.paper",
                borderRadius: "12px",
                height: size === "small" ? 34 : 40,
                pr: "4px !important",
                pl: "2px",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#ffffff" : "inherit",
                "& input, & .MuiInputBase-input, & .MuiOutlinedInput-input": {
                  py: size === "small" ? 0.5 : 0.8,
                  pl: size === "small" ? 1 : 1.2,
                  pr: 0.2,
                  fontSize: size === "small" ? "0.68rem" : "0.74rem",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#ffffff" : "inherit",
                  "&::placeholder": {
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.45)"
                        : "#94a3b8",
                    opacity: 1,
                    fontSize: size === "small" ? "0.68rem" : "0.74rem",
                  },
                },
                "& .MuiInputAdornment-root": {
                  ml: 0.2,
                  mr: 0,
                  "& .MuiIconButton-root:not(.MuiPickersOpenPickerButton-root)": {
                    display: "none !important",
                  },
                },
                "& fieldset": {
                  borderColor: (theme) =>
                    error
                      ? theme.palette.error.main
                      : theme.palette.mode === "dark"
                        ? "rgba(231, 235, 247, 0.25)"
                        : "rgba(74, 63, 107, 0.28)",
                  borderWidth: "1.5px",
                },
                "&:hover fieldset": {
                  borderColor: (theme) =>
                    error
                      ? theme.palette.error.main
                      : theme.palette.mode === "dark"
                        ? "rgba(157, 140, 230, 0.75)"
                        : "#6f5bd3",
                  borderWidth: "1.5px",
                },
                "&.Mui-focused fieldset": {
                  borderColor: (theme) =>
                    error
                      ? theme.palette.error.main
                      : theme.palette.mode === "dark"
                        ? "#9d8ce6"
                        : "#6f5bd3",
                  borderWidth: "2px",
                },
              },
              ...customSlotProps.textField?.sx,
            },
            ...customSlotProps.textField,
          },
          popper: {
            sx: {
              zIndex: 1500,
              "& .MuiPaper-root": {
                borderRadius: "24px",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "#211c30" : "#f3edf7",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 16px 48px rgba(0, 0, 0, 0.7)"
                    : "0 12px 36px rgba(45, 25, 75, 0.18)",
                border: (theme) =>
                  `1px solid ${
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(92, 75, 130, 0.12)"
                  }`,
                overflow: "hidden",
                p: 0.8,
                minWidth: 320,
              },
              "& .MuiDayCalendar-header": {
                justifyContent: "space-between",
                px: 1.5,
                mb: 0.5,
              },
              "& .MuiDayCalendar-weekDayLabel": {
                width: 38,
                height: 38,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.6)"
                    : "#49454f",
              },
              "& .MuiDayCalendar-monthContainer": {
                px: 1,
              },
              "& .MuiDayCalendar-weekContainer": {
                justifyContent: "space-between",
                my: 0.25,
              },
              "& .MuiPickersDay-root": {
                width: 38,
                height: 38,
                fontSize: "0.88rem",
                fontWeight: 500,
                borderRadius: "50%",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(92, 75, 130, 0.1)",
                },
                "&.Mui-selected": {
                  bgcolor: "#5c4b82 !important",
                  color: "#ffffff !important",
                  fontWeight: 700,
                  "&:hover": {
                    bgcolor: "#4a3b6b !important",
                  },
                },
                "&.MuiPickersDay-dayOutsideMonth": {
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(0, 0, 0, 0.35)",
                },
                "&.MuiPickersDay-today": {
                  borderColor: "#5c4b82",
                },
              },
              "& .MuiYearCalendar-root": {
                width: "100%",
                maxHeight: 260,
                "& .MuiPickersYear-root": {
                  my: 0.2,
                },
                "& .MuiPickersYear-yearButton": {
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  height: 28,
                  minHeight: 28,
                  py: 0.2,
                  px: 0.8,
                  borderRadius: "14px",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(92, 75, 130, 0.1)",
                  },
                  "&.Mui-selected": {
                    bgcolor: "#5c4b82 !important",
                    color: "#ffffff !important",
                    fontWeight: 700,
                    "&:hover": {
                      bgcolor: "#4a3b6b !important",
                    },
                  },
                },
              },
              "& .MuiMonthCalendar-root": {
                width: "100%",
                "& .MuiPickersMonth-root": {
                  my: 0.3,
                },
                "& .MuiPickersMonth-monthButton": {
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  height: 32,
                  borderRadius: "16px",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#e7ebf7" : "#1d1b20",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(92, 75, 130, 0.1)",
                  },
                  "&.Mui-selected": {
                    bgcolor: "#5c4b82 !important",
                    color: "#ffffff !important",
                    fontWeight: 700,
                    "&:hover": {
                      bgcolor: "#4a3b6b !important",
                    },
                  },
                },
              },
              ...customSlotProps.popper?.sx,
            },
            ...customSlotProps.popper,
          },
          ...customSlotProps,
        }}
        {...props}
      />
    </Box>
  );
}
