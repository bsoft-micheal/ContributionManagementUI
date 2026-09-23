import { MenuItem, TextField, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function AppSelect({
  label,
  value,
  onChange,
  options = [],
  fullWidth = true,
  placeholder,
  size = "small",
  error = false,
  helperText = "",
  required = false,
  ...props
}) {
  const theme = useTheme();

  const effectivePlaceholder =
    placeholder !== undefined && placeholder !== ""
      ? placeholder
      : label
      ? `Select ${label.replace(/[*:]/g, "").trim()}...`
      : "Select an option...";

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
        value={value ?? ""}
        onChange={onChange}
        fullWidth={fullWidth}
        variant="outlined"
        size={size}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (selected === "" || selected === undefined || selected === null) {
              return (
                <span
                  style={{
                    color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.45)" : "#94a3b8",
                    fontSize: "0.82rem",
                  }}
                >
                  {effectivePlaceholder}
                </span>
              );
            }
            const found = options.find((o) => o.value === selected);
            return found ? found.label : selected;
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "background.paper",
            borderRadius: "12px",
            height: size === "small" ? 34 : 40,
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            "& .MuiSelect-select": {
              py: size === "small" ? 0.7 : 1,
              pr: "28px !important",
              color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            },
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
          },
          transition: "all 0.2s ease",
        }}
        error={error}
        helperText={helperText}
        {...props}
      >
        <MenuItem value="" sx={{ display: "none" }}>
          {effectivePlaceholder}
        </MenuItem>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            sx={{ fontSize: "0.85rem", py: 1 }}
          >
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
