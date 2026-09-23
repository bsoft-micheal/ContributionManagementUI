import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Popover,
  OutlinedInput,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs from "dayjs";

/**
 * Custom Material-styled calendar header:
 * < [Left Chevron]        Month Year [Centered]        [Right Chevron] >
 */
function CustomCalendarHeader({
  currentMonth,
  onMonthChange,
  onViewChange,
  view,
  disabled,
  minDate,
  maxDate,
  disableFuture,
  disablePast,
}) {
  const month = currentMonth
    ? dayjs.isDayjs(currentMonth)
      ? currentMonth
      : dayjs(currentMonth)
    : dayjs();

  const isPrevDisabled = Boolean(
    disabled ||
      (minDate &&
        (month.isBefore(dayjs(minDate), "month") ||
          month.isSame(dayjs(minDate), "month"))) ||
      (disablePast &&
        (month.isBefore(dayjs(), "month") || month.isSame(dayjs(), "month")))
  );

  const isNextDisabled = Boolean(
    disabled ||
      (maxDate &&
        (month.isAfter(dayjs(maxDate), "month") ||
          month.isSame(dayjs(maxDate), "month"))) ||
      (disableFuture &&
        (month.isAfter(dayjs(), "month") || month.isSame(dayjs(), "month")))
  );

  const handlePrev = () => {
    if (!onMonthChange) return;
    if (view === "year") {
      onMonthChange(month.subtract(1, "year"));
    } else {
      onMonthChange(month.subtract(1, "month"));
    }
  };

  const handleNext = () => {
    if (!onMonthChange) return;
    if (view === "year") {
      onMonthChange(month.add(1, "year"));
    } else {
      onMonthChange(month.add(1, "month"));
    }
  };

  const handleToggleView = () => {
    if (onViewChange) {
      onViewChange(view === "year" ? "day" : "year");
    }
  };

  const label = view === "year" ? month.format("YYYY") : month.format("MMMM YYYY");

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        pt: 1.5,
        pb: 1,
      }}
    >
      <IconButton
        onClick={handlePrev}
        disabled={isPrevDisabled}
        size="small"
        aria-label="Previous month"
        sx={{
          color: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.7)"
              : "rgba(0, 0, 0, 0.54)",
          p: "6px",
          "&:hover": {
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        <ChevronLeftIcon sx={{ fontSize: 20 }} />
      </IconButton>

      <Typography
        onClick={handleToggleView}
        sx={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: (theme) =>
            theme.palette.mode === "dark" ? "#ffffff" : "#2d3748",
          cursor: "pointer",
          userSelect: "none",
          transition: "color 0.15s ease",
          "&:hover": {
            color: "primary.main",
          },
        }}
      >
        {label}
      </Typography>

      <IconButton
        onClick={handleNext}
        disabled={isNextDisabled}
        size="small"
        aria-label="Next month"
        sx={{
          color: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.7)"
              : "rgba(0, 0, 0, 0.54)",
          p: "6px",
          "&:hover": {
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        <ChevronRightIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
}

/**
 * Helper to parse any incoming date representation into dayjs
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
    // Check DD/MM/YYYY
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
  clearable = true,
  minDate,
  maxDate,
  disableFuture,
  disablePast,
  sx: customSx = {},
  slotProps: customSlotProps = {},
  ...props
}) {
  const theme = useTheme();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Sync internal display text with prop value
  const dayjsVal = toDayjs(value);
  const formattedVal = dayjsVal ? dayjsVal.format(format) : "";
  const [inputText, setInputText] = useState(formattedVal);

  useEffect(() => {
    setInputText(formattedVal);
  }, [formattedVal]);

  // Popover state
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar"); // "calendar" | "manual"
  const [manualDraft, setManualDraft] = useState(formattedVal);

  // Open calendar popover
  const handleOpenCalendar = (e) => {
    e?.stopPropagation();
    setActiveTab("calendar");
    setAnchorEl(containerRef.current || e.currentTarget);
  };

  // Open manual entry action
  const handleOpenManual = (e) => {
    e?.stopPropagation();
    // Focus the direct text input on the page and select all text for instant overwrite/editing
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  // Popover manual modal
  const handleOpenManualPopover = (e) => {
    e?.stopPropagation();
    setManualDraft(inputText || "");
    setActiveTab("manual");
    setAnchorEl(containerRef.current || e.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  // Clear date
  const handleClear = (e) => {
    e?.stopPropagation();
    setInputText("");
    if (onChange) onChange(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Select date from calendar
  const handleSelectCalendarDate = (newDate) => {
    if (newDate && dayjs.isDayjs(newDate) && newDate.isValid()) {
      setInputText(newDate.format(format));
      if (onChange) onChange(newDate);
    }
    handleClosePopover();
  };

  // Apply date from popover manual tab
  const handleApplyManualDraft = () => {
    const trimmed = manualDraft.trim();
    if (!trimmed) {
      handleClear();
      handleClosePopover();
      return;
    }
    const parsed = toDayjs(trimmed);
    if (parsed && parsed.isValid()) {
      setInputText(parsed.format(format));
      if (onChange) onChange(parsed);
      handleClosePopover();
    } else {
      // Direct raw text if matches DD/MM/YYYY
      const parts = trimmed.split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        const p = dayjs(new Date(y, m - 1, d));
        if (p.isValid()) {
          setInputText(p.format(format));
          if (onChange) onChange(p);
          handleClosePopover();
          return;
        }
      }
    }
  };

  // Handle direct typing in the input box
  const handleInputChange = (e) => {
    let val = e.target.value;
    setInputText(val);

    // If completely erased (Backspace / Delete / Select All), clear immediately!
    if (!val.trim()) {
      if (onChange) onChange(null);
      return;
    }

    // Try parsing if complete date (e.g. DD/MM/YYYY)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim())) {
      const [d, m, y] = val.trim().split("/").map(Number);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
        const parsed = dayjs(new Date(y, m - 1, d));
        if (parsed.isValid() && onChange) {
          onChange(parsed);
        }
      }
    }
  };

  const handleInputBlur = () => {
    if (!inputText.trim()) {
      if (onChange) onChange(null);
      return;
    }
    const parsed = toDayjs(inputText);
    if (parsed && parsed.isValid()) {
      setInputText(parsed.format(format));
      if (onChange) onChange(parsed);
    } else if (value) {
      // Revert if invalid partial string left
      setInputText(formattedVal);
    }
  };

  const handleInputKeyDown = (e) => {
    // Select-all and Delete/Backspace
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "Backspace" || e.key === "Delete")
    ) {
      e.preventDefault();
      handleClear();
      return;
    }

    // Enter key submits/validates
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  // Calendar popover paper styles matching user Material specs
  const paperStyles = {
    borderRadius: "12px",
    bgcolor: "background.paper",
    boxShadow: (theme) =>
      theme.palette.mode === "dark"
        ? "0 12px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4)"
        : "0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)",
    border: (theme) =>
      `1px solid ${
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.08)"
      }`,
    overflow: "hidden",
    minWidth: 320,
    maxWidth: 340,
    pb: 1,
    // Weekday labels: Su, Mo, Tu, We, Th, Fr, Sa
    "& .MuiDayCalendar-header": {
      justifyContent: "space-between",
      px: 1.5,
      mb: 0.5,
    },
    "& .MuiDayCalendar-weekDayLabel": {
      width: 36,
      height: 36,
      fontSize: "0.82rem",
      fontWeight: 500,
      color: (theme) =>
        theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.5)" : "#757575",
      margin: "0 2px",
      textTransform: "capitalize",
    },
    // Calendar days grid
    "& .MuiDayCalendar-monthContainer": {
      px: 1,
    },
    "& .MuiDayCalendar-weekContainer": {
      justifyContent: "space-between",
      margin: "2px 0",
    },
    // Day cells
    "& .MuiPickerDay-root, & .MuiPickersDay-root": {
      width: 36,
      height: 36,
      fontSize: "0.85rem",
      fontWeight: 400,
      borderRadius: "50%",
      margin: "0 2px",
      color: (theme) =>
        theme.palette.mode === "dark" ? "#e2e8f0" : "#2d3748",
      transition: "all 0.15s ease",
      "&:hover": {
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.05)",
      },
      "&.Mui-selected": {
        bgcolor: "#3f51b5 !important",
        color: "#ffffff !important",
        fontWeight: 600,
        "&:hover": {
          bgcolor: "#303f9f !important",
        },
      },
      "&.MuiPickerDay-today:not(.Mui-selected), &.MuiPickersDay-today:not(.Mui-selected)": {
        border: "1px solid #3f51b5",
        fontWeight: 600,
      },
      "&.Mui-disabled": {
        color: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.25)"
            : "rgba(0, 0, 0, 0.25)",
      },
    },
    "& .MuiYearCalendar-root": {
      width: "100%",
    },
    "& .MuiPickersYear-yearButton": {
      fontSize: "0.86rem",
      borderRadius: "8px",
      "&.Mui-selected": {
        bgcolor: "#3f51b5 !important",
        color: "#ffffff !important",
        fontWeight: 600,
      },
    },
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        width: fullWidth ? "100%" : "auto",
        minWidth: 0,
        ...customSx,
      }}
    >
      {/* Top Label with the Two Explicit Action Badges */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.5,
          minHeight: 18,
        }}
      >
        {label ? (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: (theme) =>
                theme.palette.mode === "dark" ? "#ffffff" : "text.secondary",
              textTransform: "none",
              letterSpacing: "0.02em",
              fontSize: "0.75rem",
              lineHeight: 1.2,
            }}
          >
            {label}
            {required && (
              <Box
                component="span"
                sx={{
                  color: "#d32f2f",
                  ml: 0.5,
                  fontSize: "0.85rem",
                  lineHeight: 0,
                }}
              >
                *
              </Box>
            )}
          </Typography>
        ) : (
          <Box />
        )}

        {/* Two Actions: 1) Add Manually  2) Pick in Calendar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}>
          <Button
            size="small"
            onClick={handleOpenManual}
            title="Type or edit date manually"
            sx={{
              fontSize: "0.68rem",
              py: 0.1,
              px: 0.8,
              minWidth: 0,
              height: 20,
              borderRadius: "6px",
              fontWeight: 600,
              textTransform: "none",
              color: "text.secondary",
              "&:hover": {
                color: "#3f51b5",
                bgcolor: "rgba(63, 81, 181, 0.08)",
              },
            }}
            startIcon={
              <EditCalendarOutlinedIcon sx={{ fontSize: "0.85rem !important" }} />
            }
          >
            Manual
          </Button>

          <Button
            size="small"
            onClick={handleOpenCalendar}
            title="Pick date from visual calendar"
            sx={{
              fontSize: "0.68rem",
              py: 0.1,
              px: 0.8,
              minWidth: 0,
              height: 20,
              borderRadius: "6px",
              fontWeight: 600,
              textTransform: "none",
              color: "text.secondary",
              "&:hover": {
                color: "#3f51b5",
                bgcolor: "rgba(63, 81, 181, 0.08)",
              },
            }}
            startIcon={
              <CalendarTodayOutlinedIcon
                sx={{ fontSize: "0.85rem !important" }}
              />
            }
          >
            Calendar
          </Button>
        </Box>
      </Box>

      {/* Main Date Input with Freedom to Type, Select-All, Backspace & Actions */}
      <OutlinedInput
        inputRef={inputRef}
        value={inputText}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={format}
        size={size}
        fullWidth={fullWidth}
        error={error}
        sx={{
          fontSize: "0.84rem",
          bgcolor: "background.paper",
          borderRadius: "10px",
          height: size === "small" ? 36 : 40,
          color: (theme) =>
            theme.palette.mode === "dark" ? "#ffffff" : "inherit",
          boxSizing: "border-box",
          width: "100%",
          minWidth: 0,
          "& fieldset": {
            borderColor: theme.palette.divider,
          },
          "&:hover fieldset": {
            borderColor: "rgba(124, 58, 237, 0.45)",
          },
          "&.Mui-focused fieldset": {
            borderColor: "secondary.main",
            borderWidth: "1.5px",
          },
          "& .MuiInputBase-input": {
            py: size === "small" ? 0.7 : 1,
            px: 1.25,
            fontSize: "0.84rem !important",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            "&::placeholder": {
              color: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.45)"
                  : "#94a3b8",
              opacity: 1,
            },
          },
        }}
        endAdornment={
          <InputAdornment position="end" sx={{ gap: 0.25, mr: -0.5 }}>
            {/* Clear Button */}
            {clearable && inputText && (
              <Tooltip title="Clear date">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  sx={{
                    p: "3px",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(0, 0, 0, 0.45)",
                    "&:hover": {
                      bgcolor: "transparent",
                      color: "error.main",
                    },
                  }}
                >
                  <ClearRoundedIcon sx={{ fontSize: "1.05rem" }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Action 1: Add Manually */}
            <Tooltip title="Add manually (type date)">
              <IconButton
                size="small"
                onClick={handleOpenManual}
                sx={{
                  p: "3px",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.54)",
                  "&:hover": {
                    bgcolor: "rgba(63, 81, 181, 0.08)",
                    color: "#3f51b5",
                  },
                }}
              >
                <EditCalendarOutlinedIcon sx={{ fontSize: "1.15rem" }} />
              </IconButton>
            </Tooltip>

            {/* Action 2: Pick in Calendar */}
            <Tooltip title="Pick date in calendar">
              <IconButton
                size="small"
                onClick={handleOpenCalendar}
                sx={{
                  p: "3px",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.54)",
                  "&:hover": {
                    bgcolor: "rgba(63, 81, 181, 0.08)",
                    color: "#3f51b5",
                  },
                }}
              >
                <CalendarTodayOutlinedIcon sx={{ fontSize: "1.15rem" }} />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        }
      />

      {helperText && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.5,
            fontSize: "0.72rem",
            color: error ? "error.main" : "text.secondary",
          }}
        >
          {helperText}
        </Typography>
      )}

      {/* Popover with Tabs for 1) Calendar Picker and 2) Manual Entry */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: paperStyles,
          },
        }}
      >
        {/* Two Actions Mode Switcher in the Popup */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 1,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 0, 0, 0.02)",
            gap: 1,
          }}
        >
          <Button
            size="small"
            variant={activeTab === "calendar" ? "contained" : "text"}
            startIcon={
              <CalendarTodayOutlinedIcon
                sx={{ fontSize: "0.95rem !important" }}
              />
            }
            onClick={() => setActiveTab("calendar")}
            sx={{
              fontSize: "0.76rem",
              py: 0.4,
              px: 1.4,
              borderRadius: "8px",
              fontWeight: 600,
              textTransform: "none",
              bgcolor: activeTab === "calendar" ? "#3f51b5" : "transparent",
              color: activeTab === "calendar" ? "#ffffff" : "text.secondary",
              boxShadow: "none",
              "&:hover": {
                bgcolor:
                  activeTab === "calendar" ? "#303f9f" : "rgba(0, 0, 0, 0.04)",
                boxShadow: "none",
              },
            }}
          >
            Pick in Calendar
          </Button>

          <Button
            size="small"
            variant={activeTab === "manual" ? "contained" : "text"}
            startIcon={
              <EditCalendarOutlinedIcon
                sx={{ fontSize: "0.95rem !important" }}
              />
            }
            onClick={() => {
              setActiveTab("manual");
              setManualDraft(inputText || "");
            }}
            sx={{
              fontSize: "0.76rem",
              py: 0.4,
              px: 1.4,
              borderRadius: "8px",
              fontWeight: 600,
              textTransform: "none",
              bgcolor: activeTab === "manual" ? "#3f51b5" : "transparent",
              color: activeTab === "manual" ? "#ffffff" : "text.secondary",
              boxShadow: "none",
              "&:hover": {
                bgcolor:
                  activeTab === "manual" ? "#303f9f" : "rgba(0, 0, 0, 0.04)",
                boxShadow: "none",
              },
            }}
          >
            Add Manually
          </Button>
        </Box>

        {/* Action 1 View: Calendar Picker */}
        {activeTab === "calendar" && (
          <DateCalendar
            value={dayjsVal}
            onChange={handleSelectCalendarDate}
            minDate={minDate ? toDayjs(minDate) : undefined}
            maxDate={maxDate ? toDayjs(maxDate) : undefined}
            disableFuture={disableFuture}
            disablePast={disablePast}
            slots={{
              calendarHeader: CustomCalendarHeader,
            }}
            dayOfWeekFormatter={(date) =>
              date?.format ? date.format("dd") : dayjs(date).format("dd")
            }
          />
        )}

        {/* Action 2 View: Add Manually */}
        {activeTab === "manual" && (
          <Box sx={{ p: 2.5, width: 320, boxSizing: "border-box" }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 1,
                fontWeight: 700,
                color: "text.secondary",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Enter Date ({format})
            </Typography>

            <OutlinedInput
              value={manualDraft}
              onChange={(e) => setManualDraft(e.target.value)}
              placeholder={`e.g. ${dayjs().format(format)}`}
              size="small"
              fullWidth
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyManualDraft();
                }
              }}
              sx={{
                borderRadius: "10px",
                fontSize: "0.88rem",
                bgcolor: "background.paper",
                mb: 2,
              }}
            />

            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setManualDraft(dayjs().format(format));
                }}
                sx={{
                  fontSize: "0.75rem",
                  borderRadius: "8px",
                  flex: 1,
                  textTransform: "none",
                }}
              >
                Today
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setManualDraft("");
                }}
                sx={{
                  fontSize: "0.75rem",
                  borderRadius: "8px",
                  flex: 1,
                  textTransform: "none",
                }}
              >
                Clear
              </Button>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="small"
              onClick={handleApplyManualDraft}
              sx={{
                bgcolor: "#3f51b5",
                "&:hover": { bgcolor: "#303f9f" },
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Apply Date
            </Button>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
