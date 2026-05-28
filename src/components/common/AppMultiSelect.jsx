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
    } else {
      onChange(event);
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
            fontWeight: 700,
            color: "#5b5280",
            textTransform: "uppercase",
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
          renderValue: (selected) => {
            if (!selected || selected.length === 0) {
              return <em style={{ color: "#9ca3af", fontSize: "0.85rem", fontStyle: "normal" }}>{placeholder}</em>;
            }
            return selected
              .filter((val) => val !== "select-all")
              .map((val) => {
                const opt = options.find((o) => o.value === val);
                return opt ? opt.label : val;
              })
              .join(", ");
          },
          displayEmpty: true,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "#ffffff",
            borderRadius: "6px",
            minHeight: size === "small" ? 34 : 40,
            "& .MuiSelect-select": {
              py: size === "small" ? 0.7 : 1,
              pr: 4,
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
