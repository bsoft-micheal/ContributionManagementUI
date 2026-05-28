import { MenuItem, TextField, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

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
          endAdornment: value && onChange && !props.disabled ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ target: { value: "" } });
              }}
              sx={{
                position: "absolute",
                right: 28,
                top: "50%",
                transform: "translateY(-50%)",
                padding: "2px",
                color: "#9ca3af",
                "&:hover": { color: "#ef4444" },
                zIndex: 2,
              }}
            >
              <CloseIcon sx={{ fontSize: "0.95rem" }} />
            </IconButton>
          ) : null
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "#ffffff",
            borderRadius: "6px",
            height: size === "small" ? 34 : 40,
            "& .MuiSelect-select": {
              py: size === "small" ? 0.7 : 1,
              pr: value && onChange && !props.disabled ? "40px !important" : "24px !important",
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
        {placeholder && (
          <MenuItem value="" disabled>
            <em style={{ color: "#9ca3af", fontSize: "0.85rem" }}>{placeholder}</em>
          </MenuItem>
        )}
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
