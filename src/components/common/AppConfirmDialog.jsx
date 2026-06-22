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
            color: "#fff !important",
            textTransform: "none",
            px: 3,
            fontSize: "0.95rem"
          }}
        >
          {confirmText}
        </AppButton>
        <AppButton
          variant="contained"
          onClick={onClose}
          sx={{
            backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12) !important" : "#dce2e6 !important",
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff !important" : "#545454 !important",
            border: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
            textTransform: "none",
            px: 3,
            fontSize: "0.95rem",
            boxShadow: "none",
            "&:hover": { 
              backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2) !important" : "#caced1 !important", 
              boxShadow: "none" 
            },
          }}
        >
          {cancelText}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
