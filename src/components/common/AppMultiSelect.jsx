import { useState } from "react";
import { MenuItem, TextField, Box, Typography, Checkbox, ListItemText } from "@mui/material";
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
  ...props
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const allSelected = options.length > 0 && value.length === options.length;

  const handleSelectChange = (event) => {
    const {
      target: { value: selectedValues },
    } = event;

    if (selectedValues.includes("select-all")) {
      if (allSelected) {
        // Deselect all
        onChange({ target: { value: [] } });
      } else {
        // Select all
        onChange({ target: { value: options.map((o) => o.value) } });
      }
      // Auto close when selecting/deselecting all
      setOpen(false);
    } else {
      onChange(event);
    }
  };

  const handleRemoveValue = (valToRemove, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
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
            mb: 0.5,
            fontWeight: 600,
            color: (theme) => theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
            textTransform: "none",
            letterSpacing: "0.01em",
            fontSize: "0.78125rem",
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: (theme) => theme.palette.mode === "dark" ? "#f87171" : "#ef4444", ml: 0.5, fontSize: "1rem", lineHeight: 0 }}>
              *
            </Box>
          )}
        </Typography>
      )}
      <TextField
        select
        value={value}
        onChange={handleSelectChange}
        fullWidth={fullWidth}
        variant="outlined"
        size={size}
        SelectProps={{
          multiple: true,
          open: open,
          onOpen: () => setOpen(true),
          onClose: () => setOpen(false),
          renderValue: (selected) => {
            if (!selected || selected.length === 0) {
              return (
                <em
                  style={{
                    color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.45)" : "#94a3b8",
                    fontSize: "0.85rem",
                    fontStyle: "normal",
                  }}
                >
                  {placeholder}
                </em>
              );
            }
            return (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.6,
                  alignItems: "center",
                  width: "100%",
                  maxHeight: `${maxHeight}px`,
                  overflowY: "auto",
                  pr: 0.5,
                  py: 0.2,
                  boxSizing: "border-box",
                  cursor: "pointer",
                  "&::-webkit-scrollbar": {
                    width: "5px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(167, 139, 250, 0.45)"
                        : "rgba(124, 58, 237, 0.4)",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(167, 139, 250, 0.7)"
                        : "rgba(124, 58, 237, 0.65)",
                  },
                }}
              >
                {selected
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
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.35)" : "#4a3f6b",
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
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.5)" : "#3b325c",
                          },
                        }}
                      >
                        <span>{labelText}</span>
                        <Box
                          component="span"
                          role="button"
                          aria-label="Remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveValue(val, e);
                          }}
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
                  })}
              </Box>
            );
          },
          displayEmpty: true,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "background.paper",
            borderRadius: "8px",
            minHeight: size === "small" ? 36 : 42,
            maxHeight: `${maxHeight + 20}px !important`,
            overflow: "hidden",
            "& .MuiSelect-select": {
              display: "flex",
              flexWrap: "wrap",
              gap: 0.6,
              py: size === "small" ? "6px !important" : "8px !important",
              pr: "38px !important",
              minHeight: size === "small" ? "26px" : "32px",
              maxHeight: `${maxHeight + 10}px !important`,
              overflowY: "auto !important",
              boxSizing: "border-box",
              alignItems: "flex-start",
              "&::-webkit-scrollbar": {
                width: "5px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(124, 58, 237, 0.35)",
                borderRadius: "4px",
              },
            },
            "& fieldset": {
              borderColor: (theme) => error
                ? (theme.palette.mode === "dark" ? "#f87171" : "#ef4444")
                : theme.palette.mode === "dark"
                  ? "rgba(231, 235, 247, 0.25)"
                  : "rgba(74, 63, 107, 0.28)",
              borderWidth: "1.5px",
            },
            "&:hover fieldset": {
              borderColor: (theme) => error
                ? (theme.palette.mode === "dark" ? "#f87171" : "#ef4444")
                : theme.palette.mode === "dark"
                  ? "rgba(157, 140, 230, 0.75)"
                  : "#6f5bd3",
              borderWidth: "1.5px",
            },
            "&.Mui-focused fieldset": {
              borderColor: (theme) => error
                ? (theme.palette.mode === "dark" ? "#f87171" : "#ef4444")
                : theme.palette.mode === "dark"
                  ? "#9d8ce6"
                  : "#6f5bd3",
              borderWidth: "2px",
            },
          },
          "& .MuiFormHelperText-root": {
            fontSize: "0.75rem",
            fontWeight: 400,
            mt: 0.5,
            color: (theme) => error ? (theme.palette.mode === "dark" ? "#f87171 !important" : "#ef4444 !important") : (theme.palette.mode === "dark" ? "#cbd5e1 !important" : "#334155 !important"),
          },
          transition: "all 0.2s ease",
        }}
        error={error}
        helperText={helperText}
        {...props}
      >
        {options.length > 0 && (
          <MenuItem
            key="select-all"
            value="select-all"
            sx={{ fontSize: "0.85rem", py: 0.5, fontWeight: "bold" }}
          >
            <Checkbox
              checked={allSelected}
              indeterminate={value.length > 0 && value.length < options.length}
              size="small"
              sx={{
                color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(74, 63, 107, 0.4)",
                "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                  color: (theme) => theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                },
              }}
            />
            <ListItemText
              primary="Select All"
              primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: "bold" }}
            />
          </MenuItem>
        )}
        {options.map((option) => {
          const isChecked = value.includes(option.value);
          return (
            <MenuItem
              key={option.value}
              value={option.value}
              sx={{ fontSize: "0.85rem", py: 0.5 }}
            >
              <Checkbox
                checked={isChecked}
                size="small"
                sx={{
                  color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(74, 63, 107, 0.4)",
                  "&.Mui-checked": {
                    color: (theme) => theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                  },
                }}
              />
              <ListItemText
                primary={option.label}
                primaryTypographyProps={{ fontSize: "0.85rem" }}
              />
            </MenuItem>
          );
        })}
      </TextField>
    </Box>
  );
}
