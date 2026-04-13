import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: "#4a3f6b",       // Purple – matches table header & sidebar active
      light: "#7b6faa",
      dark: "#2d2550",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#7c3aed",
      light: "#a78bfa",
      dark: "#5b21b6",
      contrastText: "#ffffff",
    },
    success: {
      main: "#16a34a",
      light: "#22c55e",
      dark: "#15803d",
    },
    error: {
      main: "#dc2626",
      light: "#f87171",
      dark: "#b91c1c",
    },
    background: {
      default: "#f5f4fb",    // Light purple tint – page background
      paper: "#ffffff",
    },
    text: {
      primary: "#1e1a2e",
      secondary: "#5b5280",
    },
    divider: "rgba(74, 63, 107, 0.1)",
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          boxShadow: "none",
          padding: "6px 18px",
          fontSize: "0.85rem",
          transition: "all 0.2s ease",
          "&:hover": { boxShadow: "0 4px 12px rgba(74,63,107,0.25)" },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #4a3f6b 0%, #2d2550 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #5c4f82 0%, #3a3065 100%)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(74,63,107,0.08)",
          border: "1px solid rgba(74,63,107,0.08)",
          background: "#ffffff",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(74,63,107,0.2)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "10px 16px",
          borderColor: "rgba(74,63,107,0.08)",
          fontSize: "0.83rem",
        },
        head: {
          fontWeight: 800,
          fontSize: "0.78rem",
          letterSpacing: "0.02em",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            "& fieldset": { borderColor: "rgba(74,63,107,0.2)" },
            "&:hover fieldset": { borderColor: "rgba(74,63,107,0.4)" },
            "&.Mui-focused fieldset": { borderColor: "#4a3f6b", borderWidth: "2px" },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: "8px",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "all 0.15s ease",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: "6px",
          fontSize: "0.75rem",
          backgroundColor: "#1e1a2e",
        },
        arrow: {
          color: "#1e1a2e",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          fontWeight: 700,
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          fontSize: "0.78rem",
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: "#4a3f6b",
            "& + .MuiSwitch-track": {
              backgroundColor: "#4a3f6b",
            },
          },
        },
      },
    },
  },
});
