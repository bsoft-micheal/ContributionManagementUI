import { useState } from "react";
import { TextField, Box, Typography, InputAdornment, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
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
  startAdornment,
  endAdornment,
  InputProps = {},
  ...props
}) {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === "password";
  const effectiveType = isPasswordType ? (showPassword ? "text" : "password") : type;

  const defaultPasswordAdornment = isPasswordType && !endAdornment && !InputProps.endAdornment ? (
    <InputAdornment position="end" sx={{ ml: 0.5 }}>
      <IconButton
        size="small"
        onClick={() => setShowPassword((prev) => !prev)}
        onMouseDown={(e) => e.preventDefault()}
        edge="end"
        aria-label={showPassword ? "Hide password" : "Show password"}
        sx={{
          color: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.7)" : "#64748b"),
          p: 0.5,
        }}
      >
        {showPassword ? (
          <VisibilityOff sx={{ fontSize: "1.1rem" }} />
        ) : (
          <Visibility sx={{ fontSize: "1.1rem" }} />
        )}
      </IconButton>
    </InputAdornment>
  ) : undefined;

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
            fontWeight: 600,
            color: (theme) => theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
            textTransform: "none",
            letterSpacing: "0.01em",
            fontSize: "0.78125rem",
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
        type={effectiveType}
        fullWidth={fullWidth}
        placeholder={effectivePlaceholder}
        variant="outlined"
        size={size}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.875rem",
            bgcolor: "background.paper",
            borderRadius: "12px",
            height: props.multiline ? "auto" : (size === "small" ? 34 : 40),
            minHeight: size === "small" ? 34 : 40,
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            "& input, & textarea, & .MuiInputBase-input, & .MuiOutlinedInput-input": {
              py: size === "small" ? 0.8 : 1.2,
              color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
              "&[type=number]": {
                MozAppearance: "textfield",
              },
              "&[type=number]::-webkit-outer-spin-button, &[type=number]::-webkit-inner-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
              },
              "&::placeholder, &::-webkit-input-placeholder": {
                color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.75)" : "#475569",
                opacity: 1,
                fontWeight: 400,
              }
            },
            "& fieldset": {
              borderColor: (theme) => error
                ? theme.palette.error.main
                : theme.palette.mode === "dark"
                  ? "rgba(231, 235, 247, 0.25)"
                  : "rgba(74, 63, 107, 0.28)",
              borderWidth: "1.5px",
            },
            "&:hover fieldset": {
              borderColor: (theme) => error
                ? theme.palette.error.main
                : theme.palette.mode === "dark"
                  ? "rgba(157, 140, 230, 0.75)"
                  : "#6f5bd3",
              borderWidth: "1.5px",
            },
            "&.Mui-focused fieldset": {
              borderColor: (theme) => error
                ? theme.palette.error.main
                : theme.palette.mode === "dark"
                  ? "#9d8ce6"
                  : "#6f5bd3",
              borderWidth: "2px",
            },
            "&.Mui-disabled": {
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              "& input, & textarea, & .MuiInputBase-input, & .MuiOutlinedInput-input": {
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                WebkitTextFillColor: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                fontWeight: "700 !important",
                opacity: "1 !important",
              },
            },
          },
          "& .MuiFormHelperText-root": {
            fontSize: "0.75rem",
            fontWeight: 400,
            mt: 0.5,
            color: (theme) => error ? "#dc2626 !important" : (theme.palette.mode === "dark" ? "#cbd5e1 !important" : "#334155 !important"),
          },
          transition: "all 0.2s ease",
        }}
        error={error}
        helperText={helperText}
        inputProps={{ maxLength, ...props.inputProps }}
        InputProps={{
          startAdornment: startAdornment ? (
            <InputAdornment position="start" sx={{ mr: 0.5 }}>
              {startAdornment}
            </InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end" sx={{ ml: 0.5 }}>
              {endAdornment}
            </InputAdornment>
          ) : defaultPasswordAdornment,
          ...InputProps,
        }}
        {...props}
      />
    </Box>
  );
}

