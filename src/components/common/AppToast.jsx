import React, { createContext, useContext, useState } from "react";
import { Snackbar, Alert, AlertTitle, Slide, Box, Typography } from "@mui/material";

const ToastContext = createContext();

export const extractErrorMessage = (err, fallback = "An unexpected error occurred.") => {
  let rawMsg = "";
  if (!err) rawMsg = fallback;
  else if (typeof err === "string") rawMsg = err;
  else if (typeof err === "object") {
    // Axios / Backend JSON responses
    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === "string") rawMsg = data;
      else if (data.message) rawMsg = data.message;
      else if (data.title) rawMsg = data.title;
      else if (data.detail) rawMsg = data.detail;
      else if (data.error) rawMsg = data.error;
      else if (data.errors && typeof data.errors === "object") {
        const errorList = Object.values(data.errors).flat();
        if (errorList.length > 0) rawMsg = errorList.join(", ");
      }
    }
    if (!rawMsg && err.message) rawMsg = err.message;
  }
  
  const str = String(rawMsg || fallback).trim();

  // Sanitize internal database / EF Core exceptions
  if (
    str.includes("database operation was expected to affect") ||
    str.includes("DbUpdateConcurrencyException") ||
    str.includes("optimistic concurrency") ||
    str.includes("go.microsoft.com/fwlink")
  ) {
    return "The record was modified or deleted by another operation. Please refresh and try again.";
  }

  if (
    str.includes("23503") ||
    str.toLowerCase().includes("foreign key") ||
    str.toLowerCase().includes("reference constraint")
  ) {
    return "Record cannot be modified or deleted because it is referenced in other records.";
  }

  if (
    str.includes("23505") ||
    str.toLowerCase().includes("unique constraint") ||
    str.toLowerCase().includes("duplicate key")
  ) {
    return "A record with this information already exists.";
  }

  if (str.includes("Microsoft.EntityFrameworkCore") || str.includes("Npgsql.") || str.includes("System.Data.")) {
    return "Unable to save changes to the database. Please try again.";
  }

  return str;
};

/**
 * Hook to trigger MUI-styled toast notifications
 * Provides methods: toast.success(), toast.error(), toast.warning(), toast.info()
 */
export const useAppToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useAppToast must be used within a ToastProvider");
  }
  return {
    success: (msg) => context.showToast(msg, "success"),
    error: (msg, fallback) => context.showToast(extractErrorMessage(msg, fallback), "error"),
    warning: (msg) => context.showToast(msg, "warning"),
    warn: (msg) => context.showToast(msg, "warning"),
    info: (msg) => context.showToast(msg, "info")
  };
};

function SlideTransition(props) {
  return <Slide {...props} direction="left" />;
}

export const ToastProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("success");

  const showToast = (msg, type = "success") => {
    const finalMsg = type === "error" ? extractErrorMessage(msg) : (typeof msg === "string" ? msg : String(msg ?? ""));
    setMessage(finalMsg);
    setSeverity(type);
    setOpen(true);
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const shadowColor = severity === "success" ? "rgba(22, 163, 74, 0.2)" : 
                    severity === "error" ? "rgba(220, 38, 38, 0.2)" : 
                    "rgba(74, 63, 107, 0.15)";

  const bgColor = severity === "success" ? "#16a34a" : // Sightly deeper green
                  severity === "error" ? "#dc2626" : 
                  severity === "warning" ? "#ca8a04" : "#4a3f6b";

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={severity === "error" ? 5000 : 3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        TransitionComponent={SlideTransition}
        sx={{ mt: 1, mr: 1 }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{
            minWidth: "260px",
            maxWidth: { xs: "90vw", sm: "480px" },
            wordBreak: "break-word",
            borderRadius: "6px",
            boxShadow: `0 8px 24px ${shadowColor}`,
            bgcolor: `${bgColor} !important`,
            color: "#ffffff",
            "& .MuiAlert-icon": { 
              color: "#ffffff",
              fontSize: "1.4rem",
              mr: 1.5,
              mt: 0.5
            },
            "& .MuiAlert-message": {
              p: 0,
              fontSize: "0.82rem",
              fontWeight: 500,
              lineHeight: 1.35
            },
            "& .MuiAlert-action": {
              alignItems: "flex-start",
              pt: 0.5,
              color: "#ffffff"
            }
          }}
        >
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                display: "block", 
                fontWeight: 900, 
                fontSize: "0.78rem", 
                letterSpacing: "0.05em",
                mb: 0.2,
                color: "#ffffff"
              }}
            >
              {severity === "success" ? "Success" : 
               severity === "error" ? "Error" : 
               severity === "warning" ? "Warning" : "Information"}
            </Typography>
            <Typography variant="inherit" sx={{ display: "block", color: "rgba(255,255,255,0.95)" }}>
              {message}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};
