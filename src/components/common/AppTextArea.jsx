import { TextField, Box, Typography } from "@mui/material";

export default function AppTextArea({
  label,
  value = "",
  onChange,
  fullWidth = true,
  placeholder,
  minRows,
  rows,
  error = false,
  helperText = "",
  required = false,
  maxLength,
  showCount,
  sx,
  ...props
}) {
  const effectivePlaceholder =
    placeholder !== undefined && placeholder !== ""
      ? placeholder
      : label
      ? `Enter ${label.replace(/[*:]/g, "").trim().toLowerCase()}...`
      : "Enter description...";

  const effectiveMinRows = rows ? undefined : (minRows ?? 3);
  const shouldShowCount = showCount || (maxLength !== undefined && maxLength !== null);
  const currentLength = typeof value === "string" ? value.length : (value ? String(value).length : 0);

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
      <Box sx={{ position: "relative", width: "100%" }}>
        <TextField
          value={value}
          onChange={onChange}
          multiline
          minRows={effectiveMinRows}
          rows={rows}
          fullWidth={fullWidth}
          placeholder={effectivePlaceholder}
          variant="outlined"
          error={error}
          helperText={helperText}
          inputProps={{
            ...(maxLength ? { maxLength } : {}),
            ...props.inputProps,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: "0.82rem",
              bgcolor: "background.paper",
              borderRadius: "6px",
              height: "auto",
              position: "relative",
              "& .MuiOutlinedInput-input": {
                py: 1.2,
                pb: shouldShowCount ? 2.5 : 1.2,
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
            ...sx,
          }}
          {...props}
        />
        {shouldShowCount && (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              bottom: helperText ? 28 : 6,
              right: 10,
              fontSize: "0.72rem",
              fontWeight: 500,
              color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.45)" : "#94a3b8",
              pointerEvents: "none",
              lineHeight: 1,
              zIndex: 1,
              userSelect: "none",
            }}
          >
            {maxLength ? `${currentLength}/${maxLength}` : currentLength}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
