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
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export default function AppDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
  fullWidth = true,
}) {
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
          boxShadow: "0 20px 40px rgba(74,63,107,0.2)",
        },
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: "#4a3f6b",
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
          sx={{ color: "#ffffff", fontSize: "0.9rem" }}
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: "rgba(255,255,255,0.7)",
            p: 0.5,
            borderRadius: "6px",
            "&:hover": { color: "#ffffff", bgcolor: "rgba(255,255,255,0.12)" },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: "1.1rem" }} />
        </IconButton>
      </Box>

      {/* ── Content ───────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 3, pt: 2.5, bgcolor: "#ffffff" }}>
        {children}
      </DialogContent>

      {/* ── Actions ───────────────────────────────────────────────── */}
      {actions && (
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: "#faf9fd",
            borderTop: "1px solid rgba(74,63,107,0.1)",
            gap: 1,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
