import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from "@mui/material";
import AppButton from "./AppButton";
import { COMMON_STRINGS } from "../../constants";

export default function AppConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = COMMON_STRINGS.DIALOGS?.CONFIRM_TITLE || "Confirm",
  content = COMMON_STRINGS.DIALOGS?.DELETE_CONFIRM_MSG || "Are you sure you want to delete?",
  confirmText = COMMON_STRINGS.ACTIONS?.CONFIRM || "Confirm",
  cancelText = COMMON_STRINGS.ACTIONS?.CANCEL || "Cancel",
  confirmColor = "primary",
}) {
  const displayTitle = title || COMMON_STRINGS.DIALOGS?.CONFIRM_TITLE || "Confirm";
  const displayContent = content || COMMON_STRINGS.DIALOGS?.DELETE_CONFIRM_MSG || "Are you sure you want to delete?";
  const displayConfirm = confirmText || COMMON_STRINGS.ACTIONS?.CONFIRM || "Confirm";
  const displayCancel = cancelText || COMMON_STRINGS.ACTIONS?.CANCEL || "Cancel";

  const isErrorColor = confirmColor === "error" || confirmColor === "danger";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          p: { xs: 1.5, sm: 2 },
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 20px 50px rgba(0,0,0,0.5)"
              : "0 16px 40px rgba(57, 47, 90, 0.15)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.04)",
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, pb: 1.5, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "3.5px solid #b2cad6",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(178, 202, 214, 0.08)"
                  : "#f4f8fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "2.75rem",
                color: "#50778c",
                fontWeight: 600,
                lineHeight: 1,
                userSelect: "none",
                transform: "translateY(-1px)",
              }}
            >
              ?
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#ffffff" : "#334155",
            mb: 1.5,
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.35rem",
          }}
        >
          {displayTitle}
        </Typography>

        <Typography
          sx={{
            color: (theme) =>
              theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b",
            fontSize: "1rem",
            lineHeight: 1.5,
            maxWidth: 340,
            mx: "auto",
          }}
        >
          {displayContent}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", gap: 2, pb: 2.5, pt: 1, px: 3 }}>
        <AppButton
          variant="outlined"
          onClick={onClose}
          sx={{
            minWidth: "115px",
            height: "42px",
            bgcolor: "transparent !important",
            color: (theme) =>
              theme.palette.mode === "dark"
                ? "#ffffff !important"
                : "#334155 !important",
            border: (theme) =>
              theme.palette.mode === "dark"
                ? "1.5px solid rgba(255, 255, 255, 0.3) !important"
                : "1.5px solid #cbd5e1 !important",
            textTransform: "none",
            px: 3.5,
            fontSize: "0.95rem",
            fontWeight: 700,
            borderRadius: "10px",
            boxShadow: "none",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08) !important"
                  : "rgba(0, 0, 0, 0.04) !important",
              border: (theme) =>
                theme.palette.mode === "dark"
                  ? "1.5px solid rgba(255, 255, 255, 0.5) !important"
                  : "1.5px solid #94a3b8 !important",
            },
          }}
        >
          {displayCancel}
        </AppButton>
        <AppButton
          variant="contained"
          onClick={onConfirm}
          sx={{
            minWidth: "115px",
            height: "42px",
            bgcolor: isErrorColor
              ? "#dc2626 !important"
              : "#392f5a !important",
            color: "#ffffff !important",
            textTransform: "none",
            px: 3.5,
            fontSize: "0.95rem",
            fontWeight: 700,
            borderRadius: "10px",
            boxShadow: isErrorColor
              ? "0 2px 8px rgba(220, 38, 38, 0.3)"
              : "0 2px 8px rgba(57, 47, 90, 0.25)",
            "&:hover": {
              bgcolor: isErrorColor
                ? "#b91c1c !important"
                : "#2e244d !important",
              boxShadow: isErrorColor
                ? "0 4px 12px rgba(220, 38, 38, 0.4)"
                : "0 4px 12px rgba(57, 47, 90, 0.35)",
            },
          }}
        >
          {displayConfirm}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
