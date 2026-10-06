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

  const hasEmptyOption = options.some((o) => o.value === "");
  const hasValueOption =
    value === "" ||
    value === undefined ||
    value === null ||
    options.some((o) => String(o.value) === String(value));

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
        select
        value={value ?? ""}
        onChange={onChange}
        fullWidth={fullWidth}
        variant="outlined"
        size={size}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            const found = options.find(
              (o) => String(o?.value ?? "").toLowerCase() === String(selected ?? "").toLowerCase()
            );
            if (found) return found.label;

            if (selected === "" || selected === undefined || selected === null) {
              return (
                <span
                  style={{
                    color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.75)" : "#475569",
                    fontWeight: 400,
                    fontSize: "0.875rem",
                  }}
                >
                  {effectivePlaceholder}
                </span>
              );
            }

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(selected));
            if (isUuid) {
              return (
                <span
                  style={{
                    color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.75)" : "#475569",
                    fontWeight: 400,
                    fontSize: "0.875rem",
                  }}
                >
                  {effectivePlaceholder}
                </span>
              );
            }

            return selected;
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.875rem",
            bgcolor: "background.paper",
            borderRadius: "12px",
            height: size === "small" ? 34 : 40,
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            "& .MuiSelect-select": {
              py: size === "small" ? 0.7 : 1,
              pr: "28px !important",
              color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "inherit",
            },
            "& .MuiSelect-nativeInput": {
              opacity: "0 !important",
              visibility: "hidden !important",
              position: "absolute !important",
              width: "0px !important",
              height: "0px !important",
              pointerEvents: "none !important",
              clip: "rect(0 0 0 0) !important",
            },
            "&.Mui-disabled": {
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              "& .MuiSelect-select": {
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                WebkitTextFillColor: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                fontWeight: "700 !important",
                opacity: "1 !important",
              },
              "& .MuiSelect-nativeInput": {
                opacity: "0 !important",
                visibility: "hidden !important",
                position: "absolute !important",
                width: "0px !important",
                height: "0px !important",
                pointerEvents: "none !important",
                clip: "rect(0 0 0 0) !important",
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
      >
        {!hasEmptyOption && (
          <MenuItem value="" sx={{ display: "none" }}>
            {effectivePlaceholder}
          </MenuItem>
        )}
        {!hasValueOption && (
          <MenuItem value={value} sx={{ display: "none" }}>
            {value}
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={Boolean(option.disabled)}
            sx={{ fontSize: "0.85rem", py: 1 }}
          >
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
