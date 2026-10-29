import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Snackbar, Alert, AlertTitle, Slide, Box, Typography } from "@mui/material";

const ToastContext = createContext();

export const extractErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const status = err?.response?.status;
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
  const lower = str.toLowerCase();

  // 1. Internal / EF Core / Server unhandled errors (500+)
  if (
    (status && status >= 500) ||
    str.includes("Microsoft.EntityFrameworkCore") ||
    str.includes("could not be translated") ||
    str.includes("InvalidOperationException") ||
    str.includes("System.Data.") ||
    lower.includes("network error")
  ) {
    return rawMsg || "Something went wrong. Please try again.";
  }

  // 2. Record deleted conflict (404 or record not found / deleted)
  if (
    status === 404 ||
    lower.includes("no longer exists") ||
    lower.includes("recorddeleted") ||
    lower.includes("user not found") ||
    lower.includes("username not found") ||
    lower.includes("isdeleted") ||
    lower.includes("does not exist")
  ) {
    return rawMsg || "Record not found.";
  }

  // 2. Already processed / completed (409 or duplicate submission / completed)
  if (
    lower.includes("already been completed") ||
    lower.includes("already processed") ||
    lower.includes("already completed") ||
    lower.includes("already verified") ||
    lower.includes("already rejected") ||
    lower.includes("already exists") ||
    lower.includes("duplicate")
  ) {
    return "This action has already been completed.";
  }

  // 3. Record modified conflict (409 or modified by another user)
  if (
    status === 409 ||
    lower.includes("updated by another user") ||
    lower.includes("modified by another") ||
    lower.includes("dbupdateconcurrencyexception") ||
    lower.includes("recordmodified") ||
    lower.includes("concurrency") ||
    lower.includes("database operation was expected to affect") ||
    lower.includes("optimistic concurrency")
  ) {
    return "This record was updated by another user. Please refresh and try again.";
  }

  // 4. Foreign key constraint
  if (
    str.includes("23503") ||
    lower.includes("foreign key") ||
    lower.includes("reference constraint") ||
    lower.includes("cannot be deleted because it is currently in use")
  ) {
    return "This record cannot be deleted because it is currently in use.";
  }

  return str || fallback;
};

/**
 * Global helper to trigger toast from anywhere (e.g. outside React components)
 */
export const showAppToast = (msg, type = "error") => {
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { msg, type } }));
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
  return useMemo(() => ({
    success: (msg) => context.showToast(msg, "success"),
    error: (msg, fallback) => context.showToast(extractErrorMessage(msg, fallback), "error"),
    warning: (msg) => context.showToast(msg, "warning"),
    warn: (msg) => context.showToast(msg, "warning"),
    info: (msg) => context.showToast(msg, "info")
  }), [context]);
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

  useEffect(() => {
    const handleAppToast = (e) => {
      if (e.detail?.msg) {
        showToast(e.detail.msg, e.detail.type || "info");
      }
    };
    window.addEventListener("app:toast", handleAppToast);

    // Global handler: Catch any unhandled promise rejections and directly show toast message
    const handleUnhandledRejection = (event) => {
      if (event.reason) {
        const errorMsg = extractErrorMessage(event.reason);
        if (errorMsg) {
          showToast(errorMsg, "error");
        }
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("app:toast", handleAppToast);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const shadowColor = severity === "success" ? "rgba(22, 163, 74, 0.2)" :
    severity === "error" ? "rgba(220, 38, 38, 0.2)" :
      "rgba(74, 63, 107, 0.15)";

  const bgColor = severity === "success" ? "#16a34a" : // Sightly deeper green
    severity === "error" ? "#dc2626" :
      severity === "warning" ? "#ca8a04" : "#2563a6";

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
