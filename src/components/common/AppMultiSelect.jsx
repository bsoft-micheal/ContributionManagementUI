import { useState, useMemo } from "react";
import {
  MenuItem,
  TextField,
  Box,
  Typography,
  Checkbox,
  ListItemText,
  ListSubheader,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
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
  ...props
}) {
  const theme = useTheme();
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

  const handleSelectChange = (event) => {
    const {
      target: { value: selectedValues },
    } = event;

    if (selectedValues.includes("select-all")) {
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
          onClose: () => {
            setOpen(false);
            setSearchTerm("");
          },
          MenuProps: {
            autoFocus: false,
            disableAutoFocusItem: true,
            PaperProps: {
              sx: {
                maxHeight: 380,
                "& .MuiList-root": {
                  pt: 0,
                },
              },
            },
          },
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
            fontSize: "0.84375rem",
            bgcolor: "background.paper",
            borderRadius: "8px",
            minHeight: size === "small" ? 36 : 42,
            maxHeight: `${maxHeight + 20}px !important`,
            boxSizing: "border-box",
            overflow: "hidden",
            "& .MuiSelect-select": {
              display: "flex",
              flexWrap: "wrap",
              gap: 0.6,
              py: size === "small" ? "4px !important" : "6px !important",
              pr: "38px !important",
              minHeight: size === "small" ? "26px" : "30px",
              maxHeight: `${maxHeight + 10}px !important`,
              overflowY: "auto !important",
              boxSizing: "border-box",
              alignItems: "center",
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
        {searchable && (
          <ListSubheader
            onClick={(e) => e.stopPropagation()}
            sx={{
              p: 1,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
              position: "sticky",
              top: 0,
              zIndex: 10,
              lineHeight: "normal",
            }}
          >
            <TextField
              size="small"
              placeholder="Search members..."
              fullWidth
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm("");
                      }}
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
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
                },
              }}
            />
          </ListSubheader>
        )}

        {selectableOptions.length > 0 && (
          <MenuItem
            key="select-all"
            value="select-all"
            sx={{ fontSize: "0.85rem", py: 0.5, fontWeight: "bold" }}
          >
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              size="small"
              sx={{
                pointerEvents: "none",
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

        {filteredOptions.length === 0 ? (
          <MenuItem disabled sx={{ fontSize: "0.85rem", fontStyle: "italic", justifyContent: "center", py: 1.5 }}>
            No matching members found
          </MenuItem>
        ) : (
          filteredOptions.map((option) => {
            const isChecked = (value || []).includes(option.value);
            return (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={Boolean(option.disabled)}
                sx={{ fontSize: "0.85rem", py: 0.5 }}
              >
                <Checkbox
                  checked={isChecked}
                  size="small"
                  sx={{
                    pointerEvents: "none",
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
          })
        )}
      </TextField>
    </Box>
  );
}
