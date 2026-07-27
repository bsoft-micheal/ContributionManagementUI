import { useState } from "react";
import { MenuItem, TextField, Box, Typography, Checkbox, ListItemText } from "@mui/material";

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
  ...props
}) {
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
    event.stopPropagation(); // Avoid triggering open dropdown list!
    const newValues = value.filter((v) => v !== valToRemove);
    onChange({ target: { value: newValues } });
  };

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 0.5,
            fontWeight: 700,
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "text.secondary",
            textTransform: "none",
            letterSpacing: "0.04em",
            fontSize: "0.7rem",
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: "#d32f2f", ml: 0.5, fontSize: "1rem", lineHeight: 0 }}>
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
              return <em style={{ color: "#9ca3af", fontSize: "0.85rem", fontStyle: "normal" }}>{placeholder}</em>;
            }
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
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
                          bgcolor: "#4a3f6b",
                          color: "#ffffff",
                          borderRadius: "50px",
                          px: 2.2,
                          py: 0.6,
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          lineHeight: 1.2,
                          cursor: "default",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: "#3b325c",
                          },
                        }}
                      >
                        {labelText}
                        <Box
                          component="span"
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
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "1.5px solid rgba(255, 255, 255, 0.8)",
                            color: "rgba(255, 255, 255, 0.9)",
                            fontSize: "8px",
                            fontWeight: "bold",
                            lineHeight: 1,
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: "rgba(255, 255, 255, 0.25)",
                              color: "#ffffff",
                              borderColor: "#ffffff",
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
            height: "auto !important",
            "& .MuiSelect-select": {
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              py: size === "small" ? "5px !important" : "7px !important",
              pr: "40px !important",
              minHeight: size === "small" ? "26px" : "32px",
              height: "auto !important",
              boxSizing: "border-box",
              alignItems: "center",
            },
            "& fieldset": {
              borderColor: "rgba(74, 63, 107, 0.2)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(74, 63, 107, 0.4)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#4a3f6b",
              borderWidth: "1.5px",
            },
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
                color: "rgba(74, 63, 107, 0.4)",
                "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                  color: "#4a3f6b",
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
                  color: "rgba(74, 63, 107, 0.4)",
                  "&.Mui-checked": {
                    color: "#4a3f6b",
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
