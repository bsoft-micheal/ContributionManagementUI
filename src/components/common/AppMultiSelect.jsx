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
        onChange={onChange}
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
