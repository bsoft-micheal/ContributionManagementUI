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
  const effectivePlaceholder =
    placeholder !== undefined && placeholder !== ""
      ? placeholder
      : label
      ? `Enter ${label.replace(/[*:]/g, "").trim().toLowerCase()}...`
      : "Enter description...";

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
        onChange={onChange}
        multiline
        minRows={minRows}
        fullWidth={fullWidth}
        placeholder={effectivePlaceholder}
        variant="outlined"
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.82rem",
            bgcolor: "background.paper",
            borderRadius: "6px",
            height: "auto",
            "& .MuiOutlinedInput-input": {
              py: 1.2,
              overflowY: "auto !important",
              "&::placeholder": {
                color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.45)" : "#94a3b8",
                opacity: 1,
              },
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
