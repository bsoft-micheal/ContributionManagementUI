import { MenuItem, TextField, Box, Typography, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 0.5,
            fontWeight: 700,
            color: "text.secondary",
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
                color: theme.palette.text.secondary,
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
            bgcolor: "background.paper",
            borderRadius: "12px",
            height: size === "small" ? 34 : 40,
            "& .MuiSelect-select": {
              py: size === "small" ? 0.7 : 1,
              pr: value && onChange && !props.disabled ? "40px !important" : "24px !important",
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
        {placeholder && (
          <MenuItem value="" disabled>
            <em style={{ color: theme.palette.text.secondary, fontSize: "0.85rem" }}>{placeholder}</em>
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
