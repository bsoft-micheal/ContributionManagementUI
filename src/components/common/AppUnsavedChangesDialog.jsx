import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import AppButton from "./AppButton";

/**
 * Common Reusable Unsaved Changes Confirmation Dialog
 * 
 * Prompts user when attempting to cancel/leave a form with unsaved changes.
 * Options: "Keep Editing" (cancel dismissal) or "Quit Changes" (confirm discarding).
 */
export default function AppUnsavedChangesDialog({
  open,
  onKeepEditing,
  onQuitChanges,
  title = "Unsaved Changes",
  content = "You have unsaved changes. Do you want to keep editing or quit and discard your changes?",
  keepEditingText = "Keep Editing",
  quitChangesText = "Quit Changes",
}) {
  return (
    <Dialog
      open={Boolean(open)}
      onClose={onKeepEditing}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          p: { xs: 1.5, sm: 2 },
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 20px 50px rgba(0,0,0,0.6)"
              : "0 16px 45px rgba(57, 47, 90, 0.18)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(74, 63, 107, 0.08)",
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, pb: 1.5, textAlign: "center" }}>
        {/* Visual Icon Badge */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(245, 158, 11, 0.12)",
              border: "2px solid",
              borderColor: "rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WarningAmberRoundedIcon
              sx={{
                fontSize: "2.4rem",
                color: "#f59e0b",
              }}
            />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: (theme) =>
              theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e",
            mb: 1.2,
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: "1.25rem",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </Typography>

        {/* Content Message */}
        <Typography
          sx={{
            color: (theme) =>
              theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b",
            fontSize: "0.92rem",
            lineHeight: 1.55,
            maxWidth: 320,
            mx: "auto",
          }}
        >
          {content}
        </Typography>
      </DialogContent>

      {/* Action Buttons */}
      <DialogActions
        sx={{
          justifyContent: "center",
          gap: 1.5,
          pb: 2.5,
          pt: 1.5,
          px: { xs: 2, sm: 3 },
          flexWrap: { xs: "wrap", sm: "nowrap" },
        }}
      >
        {/* Quit Changes (Discard option) */}
        <AppButton
          variant="outlined"
          onClick={onQuitChanges}
          sx={{
            minWidth: { xs: "100%", sm: "135px" },
            height: "40px",
            bgcolor: "transparent !important",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#fca5a5" : "#dc2626",
            border: (theme) =>
              theme.palette.mode === "dark"
                ? "1.5px solid rgba(239, 68, 68, 0.4) !important"
                : "1.5px solid rgba(220, 38, 38, 0.3) !important",
            textTransform: "none",
            px: 2.5,
            fontSize: "0.88rem",
            fontWeight: 700,
            borderRadius: "8px",
            "&:hover": {
              bgcolor: "rgba(220, 38, 38, 0.08) !important",
              borderColor: "#dc2626 !important",
            },
          }}
        >
          {quitChangesText}
        </AppButton>

        {/* Keep Editing (Primary/Safe option) */}
        <AppButton
          variant="contained"
          onClick={onKeepEditing}
          startIcon={<EditNoteRoundedIcon sx={{ fontSize: "1.1rem !important" }} />}
          sx={{
            minWidth: { xs: "100%", sm: "135px" },
            height: "40px",
            bgcolor: "#4a3f6b !important",
            color: "#ffffff !important",
            textTransform: "none",
            px: 2.5,
            fontSize: "0.88rem",
            fontWeight: 700,
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(74, 63, 107, 0.25)",
            "&:hover": {
              bgcolor: "#382e56 !important",
            },
          }}
        >
          {keepEditingText}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
