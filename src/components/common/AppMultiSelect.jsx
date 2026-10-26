import { useState, useMemo, useRef } from "react";
import {
  MenuItem,
  TextField,
  Box,
  Typography,
  Checkbox,
  ListItemText,
  InputAdornment,
  IconButton,
  Popper,
  Paper,
  ClickAwayListener,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useTheme } from "@mui/material/styles";

export default function AppMultiSelect({
  label,
  value = [], // Array of selected values
  onChange,
  options = [],
  fullWidth = true,
  placeholder = "Select options...",
  size = "small",
  error = false,
  helperText = "",
  required = false,
  maxHeight = 145, // Defaults to ~5 rows of chips
  searchable = true,
  showSelectAll = true,
  ...props
}) {
  const theme = useTheme();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((o) =>
      String(o.label || "").toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectableOptions = filteredOptions.filter((o) => !o.disabled);
  const allSelected =
    selectableOptions.length > 0 &&
    selectableOptions.every((o) => (value || []).includes(o.value));
  const someSelected =
    selectableOptions.some((o) => (value || []).includes(o.value)) && !allSelected;

  const handleSelectAll = (e) => {
    if (e) e.stopPropagation();
    if (allSelected) {
      // Deselect current selectable filtered options
      const selectableValsSet = new Set(selectableOptions.map((o) => o.value));
      const remaining = (value || []).filter((v) => !selectableValsSet.has(v));
      onChange({ target: { value: remaining } });
    } else {
      // Select all selectable filtered options
      const selectableVals = selectableOptions.map((o) => o.value);
      const merged = Array.from(new Set([...(value || []), ...selectableVals]));
      onChange({ target: { value: merged } });
    }
  };

  const handleToggleOption = (optVal) => {
    const isChecked = (value || []).includes(optVal);
    let nextValues;
    if (isChecked) {
      nextValues = (value || []).filter((v) => v !== optVal);
    } else {
      nextValues = [...(value || []), optVal];
    }
    if (onChange) {
      onChange({ target: { value: nextValues } });
    }
  };

  const handleRemoveValue = (valToRemove, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const newValues = (value || []).filter((v) => v !== valToRemove);
    if (onChange) {
      onChange({ target: { value: newValues } });
    }
  };

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 0.6,
            mt: 0.2,
            lineHeight: 1.4,
            fontWeight: 600,
            color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
            textTransform: "none",
            letterSpacing: "0.01em",
            fontSize: "0.78125rem",
          }}
        >
          {label}
          {required && (
            <Box
              component="span"
              sx={{
                color: (theme) => (theme.palette.mode === "dark" ? "#f87171" : "#ef4444"),
                ml: 0.5,
                fontSize: "0.95rem",
                lineHeight: 1,
              }}
            >
              *
            </Box>
          )}
        </Typography>
      )}

      {/* Clickable Select Field Box */}
      <Box
        ref={anchorRef}
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: size === "small" ? 36 : 42,
          maxHeight: `${maxHeight + 20}px`,
          width: "100%",
          p: size === "small" ? "4px 10px" : "6px 14px",
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRadius: "8px",
          border: (theme) =>
            error
              ? `1.5px solid ${theme.palette.mode === "dark" ? "#f87171" : "#ef4444"}`
              : open
              ? `2px solid ${theme.palette.mode === "dark" ? "#9d8ce6" : "#6f5bd3"}`
              : `1.5px solid ${theme.palette.mode === "dark" ? "rgba(231, 235, 247, 0.25)" : "rgba(74, 63, 107, 0.28)"}`,
          cursor: "pointer",
          transition: "all 0.15s ease",
          "&:hover": {
            borderColor: (theme) =>
              error
                ? theme.palette.mode === "dark" ? "#f87171" : "#ef4444"
                : theme.palette.mode === "dark" ? "rgba(157, 140, 230, 0.75)" : "#6f5bd3",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.6,
            alignItems: "center",
            flex: 1,
            maxHeight: `${maxHeight}px`,
            overflowY: "auto",
            mr: 1,
            py: 0.2,
            boxSizing: "border-box",
            "&::-webkit-scrollbar": {
              width: "5px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(167, 139, 250, 0.45)"
                  : "rgba(124, 58, 237, 0.4)",
              borderRadius: "4px",
            },
          }}
        >
          {(!value || value.length === 0) ? (
            <Typography
              variant="body2"
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.45)"
                    : "#94a3b8",
                fontSize: "0.85rem",
                userSelect: "none",
              }}
            >
              {placeholder}
            </Typography>
          ) : (
            value
              .filter((val) => val !== "select-all")
              .map((val) => {
                const opt = options.find((o) => o.value === val);
                const labelText = opt ? opt.label : val;
                return (
                  <Box
                    key={val}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(124, 58, 237, 0.35)"
                          : "#4a3f6b",
                      color: "#ffffff",
                      borderRadius: "50px",
                      px: 1.4,
                      py: 0.4,
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(124, 58, 237, 0.5)"
                            : "#3b325c",
                      },
                    }}
                  >
                    <span>{labelText}</span>
                    <Box
                      component="span"
                      role="button"
                      aria-label="Remove"
                      onClick={(e) => handleRemoveValue(val, e)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ml: 0.8,
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        border: "1.2px solid rgba(255, 255, 255, 0.8)",
                        color: "rgba(255, 255, 255, 0.95)",
                        fontSize: "8.5px",
                        fontWeight: "bold",
                        lineHeight: 1,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.12s ease",
                        "&:hover": {
                          bgcolor: "#ef4444",
                          borderColor: "#ef4444",
                          color: "#ffffff",
                          transform: "scale(1.15)",
                        },
                      }}
                    >
                      ✕
                    </Box>
                  </Box>
                );
              })
          )}
        </Box>

        <ArrowDropDownIcon
          sx={{
            color: "text.secondary",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "none",
            flexShrink: 0,
          }}
        />
      </Box>

      {helperText && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 400,
            mt: 0.5,
            color: (theme) =>
              error
                ? theme.palette.mode === "dark"
                  ? "#f87171 !important"
                  : "#ef4444 !important"
                : theme.palette.mode === "dark"
                ? "#cbd5e1 !important"
                : "#334155 !important",
          }}
        >
          {helperText}
        </Typography>
      )}

      {/* Popper Dropdown (always strictly positioned below the box without ever covering it) */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 5], // Exactly 5px gap below the input box
            },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["top-start"],
            },
          },
          {
            name: "preventOverflow",
            options: {
              altAxis: true,
              padding: 8,
            },
          },
        ]}
        style={{
          width: anchorRef.current ? `${anchorRef.current.offsetWidth}px` : "100%",
          zIndex: 1350,
        }}
      >
        <ClickAwayListener
          onClickAway={() => {
            setOpen(false);
            setSearchTerm("");
          }}
        >
          <Paper
            elevation={8}
            sx={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "8px",
              overflow: "hidden",
              bgcolor: "background.paper",
              border: (theme) =>
                theme.palette.mode === "dark"
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(74, 63, 107, 0.2)",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 10px 25px -5px rgba(0, 0, 0, 0.65)"
                  : "0 10px 25px -5px rgba(74, 63, 107, 0.22)",
            }}
          >
            {/* Search Bar Header */}
            {searchable && (
              <Box
                sx={{
                  p: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
                  borderBottom: (theme) =>
                    theme.palette.mode === "dark"
                      ? "1px solid rgba(255, 255, 255, 0.08)"
                      : "1px solid #f1f5f9",
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search members..."
                  fullWidth
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm("")}
                          sx={{ p: 0.2 }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontSize: "0.82rem",
                      borderRadius: "6px",
                      height: 34,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.05)"
                          : "#f8fafc",
                    },
                  }}
                />
              </Box>
            )}

            {/* Options List */}
            <Box
              sx={{
                maxHeight: 280,
                overflowY: "auto",
                py: 0.5,
                "&::-webkit-scrollbar": { width: "5px" },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(124, 58, 237, 0.35)",
                  borderRadius: "4px",
                },
              }}
            >
              {showSelectAll && selectableOptions.length > 0 && (
                <MenuItem
                  onClick={handleSelectAll}
                  sx={{
                    fontSize: "0.85rem",
                    py: 0.6,
                    fontWeight: "bold",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    size="small"
                    sx={{
                      p: 0.5,
                      mr: 1,
                      color: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.4)"
                          : "rgba(74, 63, 107, 0.4)",
                      "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                      },
                    }}
                  />
                  <ListItemText
                    primary="Select All"
                    primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: "bold" }}
                  />
                </MenuItem>
              )}

              {filteredOptions.length === 0 ? (
                <Box
                  sx={{
                    p: 2,
                    textAlign: "center",
                    color: "text.secondary",
                    fontSize: "0.85rem",
                    fontStyle: "italic",
                  }}
                >
                  No matching members found
                </Box>
              ) : (
                filteredOptions.map((option) => {
                  const isChecked = (value || []).includes(option.value);
                  const isDisabled = Boolean(option.disabled);
                  return (
                    <MenuItem
                      key={option.value}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleToggleOption(option.value)}
                      sx={{ fontSize: "0.85rem", py: 0.5 }}
                    >
                      <Checkbox
                        checked={isChecked}
                        size="small"
                        disabled={isDisabled}
                        sx={{
                          p: 0.5,
                          mr: 1,
                          color: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.4)"
                              : "rgba(74, 63, 107, 0.4)",
                          "&.Mui-checked": {
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                          },
                        }}
                      />
                      <ListItemText
                        primary={option.label}
                        primaryTypographyProps={{ fontSize: "0.85rem" }}
                      />
                    </MenuItem>
                  );
                })
              )}
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
