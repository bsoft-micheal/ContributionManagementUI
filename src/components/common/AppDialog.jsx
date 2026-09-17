import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export default function AppDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
  fullWidth = true,
  showCloseIcon = true,
}) {
  const theme = useTheme();
  const handleClose = (event, reason) => {
    if (reason && reason === "backdropClick") return;
    onClose && onClose(event, reason);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: theme.palette.mode === "dark"
            ? "0 24px 60px rgba(0,0,0,0.35)"
            : "0 20px 40px rgba(74,63,107,0.2)",
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1d2338" : "#4a3f6b",
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 48,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#ffffff", fontSize: "0.9rem" }}
        >
          {title}
        </Typography>
        {showCloseIcon && (
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: theme.palette.mode === "dark" ? theme.palette.text.secondary : "rgba(255,255,255,0.7)",
              p: 0.5,
              borderRadius: "6px",
              "&:hover": {
                color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#ffffff",
                bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.12)"
              },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
        )}
      </Box>

      {/* ── Content ───────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 3, pt: 2.5, bgcolor: theme.palette.background.paper }}>
        {children}
      </DialogContent>

      {/* ── Actions ───────────────────────────────────────────────── */}
      {actions && (
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#faf9fd",
            borderTop: `1px solid ${theme.palette.divider}`,
            gap: 1,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
