import { TextField, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { sanitizeInput } from "../../utils/validation";

export default function AppInput({
  label,
  value,
  onChange,
  type = "text",
  fullWidth = true,
  placeholder,
  size = "small",
  error = false,
  helperText = "",
  required = false,
  restrictType,
  maxLength,
  ...props
}) {
  const theme = useTheme();

  const handleInputChange = (e) => {
    let val = e.target.value;
    if (restrictType) {
      val = sanitizeInput(val, restrictType);
    }
    if (maxLength !== undefined && maxLength !== null) {
      val = val.slice(0, Number(maxLength));
    }
    e.target.value = val;
    if (onChange) {
      onChange(e);
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
        value={value}
        onChange={handleInputChange}
        type={type}
        fullWidth={fullWidth}
        placeholder={placeholder || `Enter ${label?.toLowerCase() || "value"}...`}
        variant="outlined"
        size={size}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "background.paper",
            borderRadius: "12px",
            height: size === "small" ? 34 : 40,
            "& input": {
              py: size === "small" ? 0.8 : 1.2,
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
        inputProps={{ maxLength, ...props.inputProps }}
        {...props}
      />
    </Box>
  );
}
