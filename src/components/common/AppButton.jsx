import { Button } from "@mui/material";

export default function AppButton({
  children,
  variant = "contained",
  color = "primary",
  sx = {},
  startIcon,
  endIcon,
  ...props
}) {
  return (
    <Button
      variant={variant}
      color={color}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{
        borderRadius: "12px",
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.85rem",
        px: 2.5,
        py: 0.75,
        boxShadow: "none",
        ...(variant === "outlined" && {
          border: (theme) => `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.28)" : "#cbd5e1"}`,
          color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#475569",
          "&:hover": {
            border: (theme) => `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.5)" : "#94a3b8"}`,
            backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
          }
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
