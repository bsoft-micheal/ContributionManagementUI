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

  const effectivePlaceholder =
    placeholder !== undefined && placeholder !== ""
      ? placeholder
      : label
      ? `Enter ${label.replace(/[*:]/g, "").trim().toLowerCase()}...`
      : "Enter value...";

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
        value={value}
        onChange={handleInputChange}
        type={type}
        fullWidth={fullWidth}
        placeholder={effectivePlaceholder}
        variant="outlined"
        size={size}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "background.paper",
            borderRadius: "12px",
            height: size === "small" ? 34 : 40,
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            "& input, & .MuiInputBase-input, & .MuiOutlinedInput-input": {
              py: size === "small" ? 0.8 : 1.2,
              color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
              "&::placeholder, &::-webkit-input-placeholder": {
                color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.75)" : "#475569",
                opacity: 1,
                fontWeight: 500,
              }
            },
            "& fieldset": {
              borderColor: theme.palette.divider,
            },
            "&:hover fieldset": {
              borderColor: "rgba(124, 58, 237, 0.45)",
            },
            "&.Mui-disabled": {
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              "& input, & .MuiInputBase-input, & .MuiOutlinedInput-input": {
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                WebkitTextFillColor: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                fontWeight: "700 !important",
                opacity: "1 !important",
              },
            },
          },
          "& .MuiFormHelperText-root": {
            fontSize: "0.75rem",
            fontWeight: 600,
            mt: 0.5,
            color: (theme) => error ? "#dc2626 !important" : (theme.palette.mode === "dark" ? "#cbd5e1 !important" : "#334155 !important"),
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
