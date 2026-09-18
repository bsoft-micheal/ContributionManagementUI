import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from "@mui/material";
import AppButton from "./AppButton";

export default function AppConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmation",
  content = "Are you sure you want to delete this item?",
  confirmText = "OK",
  cancelText = "Cancel"
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "8px",
          p: 2,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogContent sx={{ p: 4, pb: 2, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Box
            sx={{
              width: 85,
              height: 85,
              borderRadius: "50%",
              border: "4px solid #b2cad6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: "3rem", color: "#50778c", fontWeight: 500, lineHeight: 1 }}>
              ?
            </Typography>
          </Box>
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#545454", mb: 2, fontFamily: "'Inter', sans-serif" }}>
          {title}
        </Typography>

        <Typography sx={{ color: (theme) => theme.palette.mode === "dark" ? "#d1d5db" : "#666666", fontSize: "1.05rem" }}>
          {content}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", gap: 1.5, pb: 2 }}>
        <AppButton
          variant="contained"
          onClick={onConfirm}
          sx={{
            bgcolor: "#392f5a !important",
            color: "#ffffff !important",
            textTransform: "none",
            px: 3.5,
            fontSize: "0.95rem",
            fontWeight: 700,
            borderRadius: "8px",
            "&:hover": {
              bgcolor: "#2e244d !important",
            }
          }}
        >
          {confirmText}
        </AppButton>
        <AppButton
          variant="outlined"
          onClick={onClose}
          sx={{
            bgcolor: "transparent !important",
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#334155 !important",
            border: (theme) => theme.palette.mode === "dark" ? "1.5px solid rgba(255, 255, 255, 0.3) !important" : "1.5px solid #cbd5e1 !important",
            textTransform: "none",
            px: 3.5,
            fontSize: "0.95rem",
            fontWeight: 700,
            borderRadius: "8px",
            boxShadow: "none",
            "&:hover": { 
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08) !important" : "rgba(0, 0, 0, 0.04) !important", 
              border: (theme) => theme.palette.mode === "dark" ? "1.5px solid rgba(255, 255, 255, 0.5) !important" : "1.5px solid #94a3b8 !important", 
            },
          }}
        >
          {cancelText}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
