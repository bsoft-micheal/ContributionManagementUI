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
        borderRadius: "6px",
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.85rem",
        px: 2.5,
        py: 0.75,
        boxShadow: "none",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
