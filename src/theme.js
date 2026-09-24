import { alpha, createTheme } from "@mui/material/styles";

const lightTokens = {
  background: "#f5f4fb",
  surface: "#ffffff",
  surfaceAlt: "#faf9fd",
  text: "#1e1a2e",
  mutedText: "#5b5280",
  border: "rgba(74, 63, 107, 0.10)",
  borderStrong: "rgba(74, 63, 107, 0.18)",
  sidebarBg: "#1e1a2e",
  sidebarText: "#c4bde0",
  sidebarMuted: "#8b81b3",
  sidebarHover: "rgba(255, 255, 255, 0.05)",
};

const darkTokens = {
  background: "#0f1220",
  surface: "#171b2d",
  surfaceAlt: "#1d2338",
  text: "#e7ebf7",
  mutedText: "#a3acc7",
  border: "rgba(231, 235, 247, 0.10)",
  borderStrong: "rgba(231, 235, 247, 0.18)",
  sidebarBg: "#121628",
  sidebarText: "#d6dbef",
  sidebarMuted: "#8d96b8",
  sidebarHover: "rgba(255, 255, 255, 0.04)",
};

const baseTheme = {
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.03em" },
    h5: { fontWeight: 800, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 700 },
  },
};

export function createAppTheme(mode = "light") {
  const tokens = mode === "dark" ? darkTokens : lightTokens;

  return createTheme({
    ...baseTheme,
    palette: {
      mode,
      primary: {
        main: "#4a3f6b",
        light: "#7b6faa",
        dark: "#2d2550",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#6f5bd3",
        light: "#9d8ce6",
        dark: "#45358e",
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
        default: tokens.background,
        paper: tokens.surface,
      },
      text: {
        primary: tokens.text,
        secondary: tokens.mutedText,
      },
      divider: tokens.border,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            "--app-bg": tokens.background,
            "--app-surface": tokens.surface,
            "--app-surface-alt": tokens.surfaceAlt,
            "--app-text": tokens.text,
            "--app-muted": tokens.mutedText,
            "--app-border": tokens.border,
            "--app-border-strong": tokens.borderStrong,
            "--app-sidebar-bg": tokens.sidebarBg,
            "--app-sidebar-text": tokens.sidebarText,
            "--app-sidebar-muted": tokens.sidebarMuted,
            "--app-sidebar-hover": tokens.sidebarHover,
          },
          html: {
            colorScheme: mode,
          },
          body: {
            backgroundColor: "var(--app-bg)",
            color: "var(--app-text)",
            transition: "background-color 180ms ease, color 180ms ease",
          },
          "*::selection": {
            backgroundColor: alpha("#7c3aed", 0.2),
            color: "inherit",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: "none",
            padding: "8px 18px",
            fontSize: "0.85rem",
            transition: "all 0.2s ease",
          },
          containedPrimary: {
            background: mode === "dark"
              ? "linear-gradient(135deg, #5b6482 0%, #373d52 100%)"
              : "linear-gradient(135deg, #4a3f6b 0%, #2d2550 100%)",
            "&:hover": {
              background: mode === "dark"
                ? "linear-gradient(135deg, #66708d 0%, #40465d 100%)"
                : "linear-gradient(135deg, #5c4f82 0%, #3a3065 100%)",
              boxShadow: mode === "dark"
                ? "0 10px 24px rgba(0, 0, 0, 0.24)"
                : "0 10px 24px rgba(74, 63, 107, 0.25)",
            },
            "&.Mui-disabled": {
              color: "rgba(255, 255, 255, 0.85) !important",
              background: mode === "dark"
                ? "linear-gradient(135deg, rgba(91, 100, 130, 0.75) 0%, rgba(55, 61, 82, 0.75) 100%) !important"
                : "linear-gradient(135deg, rgba(74, 63, 107, 0.7) 0%, rgba(45, 37, 80, 0.7) 100%) !important",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            boxShadow: mode === "dark" ? "0 16px 36px rgba(0, 0, 0, 0.26)" : "0 2px 8px rgba(74,63,107,0.08)",
            border: `1px solid var(--app-border)`,
            background: "var(--app-surface)",
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
            borderRadius: 20,
            boxShadow: mode === "dark" ? "0 24px 60px rgba(0, 0, 0, 0.38)" : "0 20px 40px rgba(74,63,107,0.2)",
            border: `1px solid var(--app-border)`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            borderColor: "var(--app-border)",
            fontSize: "0.86rem",
          },
          head: {
            fontWeight: 800,
            fontSize: "0.78rem",
            letterSpacing: "0.04em",
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: "0.75rem",
            fontWeight: 600,
            marginTop: 4,
            color: mode === "dark" ? "#cbd5e1 !important" : "#334155 !important",
            "&.Mui-error": {
              color: "#dc2626 !important",
              fontWeight: 700,
            },
            "&.Mui-disabled": {
              color: mode === "dark" ? "#cbd5e1 !important" : "#334155 !important",
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              backgroundColor: "var(--app-surface)",
              "& fieldset": { borderColor: "var(--app-border-strong)" },
              "&:hover fieldset": { borderColor: mode === "dark" ? "rgba(214, 219, 239, 0.28)" : "rgba(74,63,107,0.4)" },
              "&.Mui-focused fieldset": { borderColor: mode === "dark" ? "#8d96b8" : "#4a3f6b", borderWidth: "2px" },
              "&.Mui-disabled": {
                backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                "& .MuiOutlinedInput-input, & input": {
                  color: mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                  WebkitTextFillColor: mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                  fontWeight: "700 !important",
                  opacity: "1 !important",
                },
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          outlined: {
            borderRadius: 12,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: "all 0.15s ease",
            borderRadius: 10,
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? "#ffffff" : "inherit",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: "0.75rem",
            backgroundColor: mode === "dark" ? "#111624" : "#1e1a2e",
          },
          arrow: {
            color: mode === "dark" ? "#111624" : "#1e1a2e",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
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
              color: mode === "dark" ? "#8d96b8" : "#4a3f6b",
              "& + .MuiSwitch-track": {
                backgroundColor: mode === "dark" ? "#5e6783" : "#4a3f6b",
              },
            },
          },
        },
      },
    },
  });
}
