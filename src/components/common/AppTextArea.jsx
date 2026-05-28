import { TextField, Box, Typography } from "@mui/material";

export default function AppTextArea({
  label,
  value,
  onChange,
  fullWidth = true,
  placeholder,
  minRows = 3,
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
        value={value}
        onChange={onChange}
        multiline
        minRows={minRows}
        fullWidth={fullWidth}
        placeholder={placeholder || `Enter ${label?.toLowerCase() || "value"}...`}
        variant="outlined"
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "#ffffff",
            borderRadius: "6px",
            height: "auto",
            "& .MuiOutlinedInput-input": {
              py: 1.2,
              overflowY: "auto !important",
              "&::-webkit-scrollbar": {
                width: "5px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(74, 63, 107, 0.15)",
                borderRadius: "10px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "rgba(74, 63, 107, 0.3)",
              },
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
      />
    </Box>
  );
}
