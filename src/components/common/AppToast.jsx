import React, { createContext, useContext, useState } from "react";
import { Snackbar, Alert, AlertTitle, Slide, Box, Typography } from "@mui/material";

const ToastContext = createContext();

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
    error: (msg) => context.showToast(msg, "error"),
    warning: (msg) => context.showToast(msg, "warning"),
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
    setMessage(msg);
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
        autoHideDuration={3000}
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
            minWidth: "240px",
            borderRadius: "4px", // More rectangular like the image
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
              lineHeight: 1.2
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
                textTransform: "uppercase",
                color: "#ffffff"
              }}
            >
              {severity === "success" ? "SUCCESS" : 
               severity === "error" ? "ERROR" : 
               severity === "warning" ? "WARNING" : "INFORMATION"}
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
