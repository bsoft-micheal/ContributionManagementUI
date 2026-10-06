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
  text: "#ffffff",
  mutedText: "#a3acc7",
  border: "rgba(255, 255, 255, 0.12)",
  borderStrong: "rgba(255, 255, 255, 0.22)",
  sidebarBg: "#121628",
  sidebarText: "#d6dbef",
  sidebarMuted: "#8d96b8",
  sidebarHover: "rgba(255, 255, 255, 0.04)",
};

export const typographyTokens = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  pageHeading: {
    fontSize: "1.625rem", // 26px (24–28px range)
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
  },
  sectionHeading: {
    fontSize: "1.1875rem", // 19px (18–20px range)
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: "-0.015em",
  },
  cardTitle: {
    fontSize: "0.9375rem", // 15px (14–16px range)
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "-0.005em",
  },
  mainValue: {
    fontSize: "1.375rem", // 22px (20–24px range)
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  bodyText: {
    fontSize: "0.875rem", // 14px
    fontWeight: 400,
    lineHeight: 1.55,
    letterSpacing: "0em",
  },
  label: {
    fontSize: "0.78125rem", // 12.5px (12–13px range)
    fontWeight: 500,
    lineHeight: 1.35,
    letterSpacing: "0.01em",
  },
  helperText: {
    fontSize: "0.75rem", // 12px
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: "0.005em",
  },
  button: {
    fontSize: "0.84375rem", // 13.5px (13–14px range)
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0.01em",
    textTransform: "none",
  },
  sidebarItem: {
    fontSize: "0.875rem", // 14px
    fontWeight: 500,
    activeFontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0em",
  },
};

const baseTheme = {
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: typographyTokens.fontFamily,
    h1: {
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "1.75rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
    },
    h3: {
      fontSize: "1.625rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
    },
    h4: {
      // Page headings: 24–28px, font-weight 700
      fontSize: typographyTokens.pageHeading.fontSize,
      fontWeight: typographyTokens.pageHeading.fontWeight,
      letterSpacing: typographyTokens.pageHeading.letterSpacing,
      lineHeight: typographyTokens.pageHeading.lineHeight,
    },
    h5: {
      // Page headings / modal titles: 24px, font-weight 700
      fontSize: "1.5rem",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.3,
    },
    h6: {
      // Section headings: 18–20px, font-weight 600
      fontSize: typographyTokens.sectionHeading.fontSize,
      fontWeight: typographyTokens.sectionHeading.fontWeight,
      letterSpacing: typographyTokens.sectionHeading.letterSpacing,
      lineHeight: typographyTokens.sectionHeading.lineHeight,
    },
    subtitle1: {
      // Section headings / prominent subtitles: 18px, font-weight 600
      fontSize: "1.125rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    subtitle2: {
      // Card titles: 14–16px, font-weight 600
      fontSize: typographyTokens.cardTitle.fontSize,
      fontWeight: typographyTokens.cardTitle.fontWeight,
      letterSpacing: typographyTokens.cardTitle.letterSpacing,
      lineHeight: typographyTokens.cardTitle.lineHeight,
    },
    body1: {
      // Body text: 14px, font-weight 400
      fontSize: typographyTokens.bodyText.fontSize,
      fontWeight: typographyTokens.bodyText.fontWeight,
      letterSpacing: typographyTokens.bodyText.letterSpacing,
      lineHeight: typographyTokens.bodyText.lineHeight,
    },
    body2: {
      // Body text: 14px, font-weight 400
      fontSize: typographyTokens.bodyText.fontSize,
      fontWeight: typographyTokens.bodyText.fontWeight,
      letterSpacing: typographyTokens.bodyText.letterSpacing,
      lineHeight: 1.5,
    },
    button: {
      // Buttons: 13–14px, font-weight 600
      fontSize: typographyTokens.button.fontSize,
      fontWeight: typographyTokens.button.fontWeight,
      letterSpacing: typographyTokens.button.letterSpacing,
      lineHeight: typographyTokens.button.lineHeight,
      textTransform: "none",
    },
    caption: {
      // Secondary/helper text: 12px, font-weight 400
      fontSize: typographyTokens.helperText.fontSize,
      fontWeight: typographyTokens.helperText.fontWeight,
      letterSpacing: typographyTokens.helperText.letterSpacing,
      lineHeight: typographyTokens.helperText.lineHeight,
    },
    overline: {
      // Labels / category badges: 12px, font-weight 600
      fontSize: "0.75rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      lineHeight: 1.4,
      textTransform: "uppercase",
    },
  },
};

export function createAppTheme(mode = "light") {
  const tokens = mode === "dark" ? darkTokens : lightTokens;

  return createTheme({
    ...baseTheme,
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? "#c4b5fd" : "#4a3f6b",
        light: mode === "dark" ? "#e9d5ff" : "#7b6faa",
        dark: mode === "dark" ? "#a78bfa" : "#2d2550",
        contrastText: "#ffffff",
      },
      secondary: {
        main: mode === "dark" ? "#ddd6fe" : "#6f5bd3",
        light: mode === "dark" ? "#f5f3ff" : "#9d8ce6",
        dark: mode === "dark" ? "#8b5cf6" : "#45358e",
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
            "--font-family-primary": typographyTokens.fontFamily,
            "--text-page-heading-size": typographyTokens.pageHeading.fontSize,
            "--text-section-heading-size": typographyTokens.sectionHeading.fontSize,
            "--text-card-title-size": typographyTokens.cardTitle.fontSize,
            "--text-main-value-size": typographyTokens.mainValue.fontSize,
            "--text-body-size": typographyTokens.bodyText.fontSize,
            "--text-label-size": typographyTokens.label.fontSize,
            "--text-helper-size": typographyTokens.helperText.fontSize,
            "--text-button-size": typographyTokens.button.fontSize,
            "--text-sidebar-size": typographyTokens.sidebarItem.fontSize,
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
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.bodyText.fontSize,
            fontWeight: typographyTokens.bodyText.fontWeight,
            lineHeight: typographyTokens.bodyText.lineHeight,
            letterSpacing: typographyTokens.bodyText.letterSpacing,
            transition: "background-color 180ms ease, color 180ms ease",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
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
            fontFamily: typographyTokens.fontFamily,
            borderRadius: 12,
            boxShadow: "none",
            padding: "8px 18px",
            fontSize: typographyTokens.button.fontSize,
            fontWeight: typographyTokens.button.fontWeight,
            letterSpacing: typographyTokens.button.letterSpacing,
            lineHeight: typographyTokens.button.lineHeight,
            textTransform: "none",
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
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.3,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            padding: "12px 16px",
            borderColor: "var(--app-border)",
            fontSize: typographyTokens.bodyText.fontSize,
            fontWeight: 400,
            lineHeight: 1.5,
          },
          head: {
            fontFamily: typographyTokens.fontFamily,
            fontWeight: 600,
            fontSize: typographyTokens.label.fontSize,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.label.fontSize,
            fontWeight: 500,
            letterSpacing: "0.01em",
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.helperText.fontSize,
            fontWeight: 400,
            marginTop: 4,
            lineHeight: 1.35,
            letterSpacing: "0.005em",
            color: mode === "dark" ? "#cbd5e1 !important" : "#334155 !important",
            "&.Mui-error": {
              color: "#dc2626 !important",
              fontWeight: 600,
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
              "& fieldset": {
                borderColor: mode === "dark" ? "rgba(231, 235, 247, 0.25)" : "rgba(74, 63, 107, 0.28)",
                borderWidth: "1.5px",
              },
              "&:hover fieldset": {
                borderColor: mode === "dark" ? "rgba(157, 140, 230, 0.75)" : "#6f5bd3",
                borderWidth: "1.5px",
              },
              "&.Mui-focused fieldset": {
                borderColor: mode === "dark" ? "#9d8ce6" : "#6f5bd3",
                borderWidth: "2px",
              },
              "&.Mui-disabled": {
                backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                "& .MuiOutlinedInput-input:not(.MuiSelect-nativeInput), & input:not(.MuiSelect-nativeInput)": {
                  color: mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                  WebkitTextFillColor: mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                  fontWeight: "700 !important",
                  opacity: "1 !important",
                },
                "& .MuiSelect-nativeInput": {
                  opacity: "0 !important",
                  visibility: "hidden !important",
                  position: "absolute !important",
                  width: "0px !important",
                  height: "0px !important",
                  pointerEvents: "none !important",
                  clip: "rect(0 0 0 0) !important",
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
          nativeInput: {
            opacity: "0 !important",
            visibility: "hidden !important",
            position: "absolute !important",
            width: "0px !important",
            height: "0px !important",
            pointerEvents: "none !important",
            clip: "rect(0 0 0 0) !important",
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
            fontFamily: typographyTokens.fontFamily,
            borderRadius: 8,
            fontSize: typographyTokens.helperText.fontSize,
            fontWeight: 400,
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
            fontFamily: typographyTokens.fontFamily,
            borderRadius: 999,
            fontWeight: 600,
            fontSize: "0.75rem",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.bodyText.fontSize,
            fontWeight: 600,
            textTransform: "none",
            letterSpacing: "0.01em",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.bodyText.fontSize,
            fontWeight: 400,
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.helperText.fontSize,
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
