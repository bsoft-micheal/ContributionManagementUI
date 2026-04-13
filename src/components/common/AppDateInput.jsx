import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Box, Typography } from "@mui/material";

export default function AppDateInput({
  label,
  value,
  onChange,
  format = "DD/MM/YYYY",
  fullWidth = true,
  size = "small",
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
        </Typography>
      )}
      <DatePicker
        value={value}
        onChange={onChange}
        format={format}
        slotProps={{
          textField: {
            fullWidth: fullWidth,
            size: size,
            placeholder: `Select ${label?.toLowerCase() || "date"}...`,
            InputProps: {
              sx: {
                borderRadius: "6px",
                bgcolor: "#ffffff",
                fontSize: "0.82rem",
                height: size === "small" ? 34 : 40,
                "& .MuiOutlinedInput-input": { py: size === "small" ? 0.8 : 1.2 },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(74,63,107,0.2)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(74,63,107,0.4)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#4a3f6b",
                  borderWidth: "1.5px",
                },
                transition: "all 0.2s ease",
              },
            },
          },
        }}
        {...props}
      />
    </Box>
  );
}
