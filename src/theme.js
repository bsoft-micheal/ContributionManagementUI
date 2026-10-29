import { alpha, createTheme } from "@mui/material/styles";

const lightTokens = {
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  text: "#1e293b",
  mutedText: "#475569",
  border: "rgba(25, 59, 91, 0.12)",
  borderStrong: "rgba(25, 59, 91, 0.22)",
  sidebarBg: "#193b5b",
  sidebarText: "#dbeafe",
  sidebarMuted: "#94a3b8",
  sidebarHover: "rgba(255, 255, 255, 0.08)",
};

const darkTokens = {
  background: "#0b131e",
  surface: "#111c2a",
  surfaceAlt: "#162538",
  text: "#ffffff",
  mutedText: "#94a3b8",
  border: "rgba(255, 255, 255, 0.14)",
  borderStrong: "rgba(255, 255, 255, 0.24)",
  sidebarBg: "#0d1724",
  sidebarText: "#dbeafe",
  sidebarMuted: "#8da2ba",
  sidebarHover: "rgba(255, 255, 255, 0.06)",
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
    fontSize: "1.1875rem", // 19px (medium level)
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-0.015em",
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
    borderRadius: 8,
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
      fontSize: typographyTokens.pageHeading.fontSize,
      fontWeight: typographyTokens.pageHeading.fontWeight,
      letterSpacing: typographyTokens.pageHeading.letterSpacing,
      lineHeight: typographyTokens.pageHeading.lineHeight,
    },
    h5: {
      fontSize: "1.5rem",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.3,
    },
    h6: {
      fontSize: typographyTokens.sectionHeading.fontSize,
      fontWeight: typographyTokens.sectionHeading.fontWeight,
      letterSpacing: typographyTokens.sectionHeading.letterSpacing,
      lineHeight: typographyTokens.sectionHeading.lineHeight,
    },
    subtitle1: {
      fontSize: "1.125rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    subtitle2: {
      fontSize: typographyTokens.cardTitle.fontSize,
      fontWeight: typographyTokens.cardTitle.fontWeight,
      letterSpacing: typographyTokens.cardTitle.letterSpacing,
      lineHeight: typographyTokens.cardTitle.lineHeight,
    },
    body1: {
      fontSize: typographyTokens.bodyText.fontSize,
      fontWeight: typographyTokens.bodyText.fontWeight,
      letterSpacing: typographyTokens.bodyText.letterSpacing,
      lineHeight: typographyTokens.bodyText.lineHeight,
    },
    body2: {
      fontSize: typographyTokens.bodyText.fontSize,
      fontWeight: typographyTokens.bodyText.fontWeight,
      letterSpacing: typographyTokens.bodyText.letterSpacing,
      lineHeight: 1.5,
    },
    button: {
      fontSize: typographyTokens.button.fontSize,
      fontWeight: typographyTokens.button.fontWeight,
      letterSpacing: typographyTokens.button.letterSpacing,
      lineHeight: typographyTokens.button.lineHeight,
      textTransform: "none",
    },
    caption: {
      fontSize: typographyTokens.helperText.fontSize,
      fontWeight: typographyTokens.helperText.fontWeight,
      letterSpacing: typographyTokens.helperText.letterSpacing,
      lineHeight: typographyTokens.helperText.lineHeight,
    },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      lineHeight: 1.4,
      textTransform: "none",
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
        main: mode === "dark" ? "#5b93d3" : "#2563a6",
        light: mode === "dark" ? "#8bb8ec" : "#3b82f6",
        dark: mode === "dark" ? "#3874b5" : "#1d5083",
        contrastText: "#ffffff",
      },
      secondary: {
        main: mode === "dark" ? "#528ec8" : "#1e5183",
        light: mode === "dark" ? "#74aadc" : "#2968a2",
        dark: mode === "dark" ? "#2868a2" : "#143d63",
        contrastText: "#ffffff",
      },
      success: {
        main: "#16a34a",
        light: "#22c55e",
        dark: "#15803d",
      },
      error: {
        main: "#ef4444",
        light: "#f87171",
        dark: "#dc2626",
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
      action: {
        disabled: mode === "dark" ? "rgba(255, 255, 255, 0.45)" : "#94a3b8",
        disabledBackground: mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
        disabledOpacity: 0.7,
      },
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
            backgroundColor: alpha("#2563a6", 0.2),
            color: "inherit",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            borderRadius: 8,
            boxShadow: "none",
            padding: "8px 18px",
            fontSize: typographyTokens.button.fontSize,
            fontWeight: typographyTokens.button.fontWeight,
            letterSpacing: typographyTokens.button.letterSpacing,
            lineHeight: typographyTokens.button.lineHeight,
            textTransform: "none",
            transition: "all 0.2s ease",
            "&.Mui-disabled": {
              opacity: "0.7 !important",
              cursor: "not-allowed !important",
              pointerEvents: "none",
            },
          },
          containedPrimary: {
            background: mode === "dark"
              ? "linear-gradient(135deg, #2563a6 0%, #1d5083 100%)"
              : "#2563a6",
            color: "#ffffff !important",
            border: "none",
            "&:hover": {
              background: mode === "dark"
                ? "linear-gradient(135deg, #3b82f6 0%, #2563a6 100%)"
                : "#1d5083",
              boxShadow: "0 4px 12px rgba(37, 99, 166, 0.25)",
            },
            "&:active": {
              background: "#193b5b",
            },
            "&.Mui-disabled": {
              color: "rgba(255, 255, 255, 0.75) !important",
              background: mode === "dark"
                ? "rgba(37, 99, 166, 0.5) !important"
                : "rgba(37, 99, 166, 0.6) !important",
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            backgroundColor: "#1c4772",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#153657",
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? "#8bb8ec" : "#2563a6",
            "&:hover": {
              backgroundColor: mode === "dark" ? "rgba(91, 147, 211, 0.12)" : "rgba(37, 99, 166, 0.08)",
            },
            transition: "all 0.15s ease",
            borderRadius: 8,
            "&.Mui-disabled": {
              opacity: "0.65 !important",
              cursor: "not-allowed !important",
              pointerEvents: "none",
              color: mode === "dark" ? "rgba(255, 255, 255, 0.45) !important" : "#94a3b8 !important",
              "& .MuiSvgIcon-root": {
                color: mode === "dark" ? "rgba(255, 255, 255, 0.45) !important" : "#94a3b8 !important",
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === "dark" ? "0 16px 36px rgba(0, 0, 0, 0.26)" : "0 2px 8px rgba(25, 59, 91, 0.08)",
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
            borderRadius: 14,
            boxShadow: mode === "dark" ? "0 24px 60px rgba(0, 0, 0, 0.38)" : "0 20px 40px rgba(25, 59, 91, 0.2)",
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
            color: mode === "dark" ? "#ffffff" : "inherit",
          },
          head: {
            fontFamily: typographyTokens.fontFamily,
            fontWeight: 600,
            fontSize: typographyTokens.label.fontSize,
            letterSpacing: "0.04em",
            textTransform: "none",
            backgroundColor: mode === "dark" ? "#162538" : "#f1f5f9",
            color: mode === "dark" ? "#ffffff" : "#1e293b",
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.label.fontSize,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: mode === "dark" ? "#f1f5f9 !important" : "#1e293b !important",
            "&.Mui-focused": {
              color: mode === "dark" ? "#ffffff !important" : "#0f172a !important",
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily,
            fontSize: typographyTokens.label.fontSize,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: mode === "dark" ? "#f1f5f9 !important" : "#1e293b !important",
            "&.Mui-focused": {
              color: mode === "dark" ? "#ffffff !important" : "#0f172a !important",
            },
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
              color: mode === "dark" ? "#f87171 !important" : "#ef4444 !important",
              fontWeight: 500,
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
              borderRadius: 8,
              backgroundColor: "var(--app-surface)",
              "& fieldset": {
                borderColor: mode === "dark" ? "rgba(231, 235, 247, 0.25)" : "rgba(25, 59, 91, 0.25)",
                borderWidth: "1.5px",
              },
              "&:hover fieldset": {
                borderColor: mode === "dark" ? "rgba(91, 147, 211, 0.75)" : "#2563a6",
                borderWidth: "1.5px",
              },
              "&.Mui-focused fieldset": {
                borderColor: mode === "dark" ? "#5b93d3" : "#2563a6",
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
            borderRadius: 8,
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
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: "var(--app-surface)",
            "& fieldset": {
              borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.22)" : "rgba(25, 59, 91, 0.25)",
              borderWidth: "1.5px",
            },
            "&:hover fieldset": {
              borderColor: mode === "dark" ? "#5b93d3" : "#2563a6",
            },
            "&.Mui-focused fieldset": {
              borderColor: mode === "dark" ? "#5b93d3" : "#2563a6",
            },
            "& .MuiOutlinedInput-input": {
              color: mode === "dark" ? "#ffffff" : "#1e293b",
            },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(37, 99, 166, 0.6)",
            "&.Mui-checked": {
              color: mode === "dark" ? "#5b93d3" : "#2563a6",
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(37, 99, 166, 0.6)",
            "&.Mui-checked": {
              color: mode === "dark" ? "#5b93d3" : "#2563a6",
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontFamily: typographyTokens.fontFamily,
            borderRadius: 6,
            fontSize: "0.75rem",
            fontWeight: 500,
            backgroundColor: mode === "dark" ? "#334155" : "#475569",
            color: "#ffffff",
            boxShadow: mode === "dark"
              ? "0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)"
              : "0 4px 14px rgba(15, 23, 42, 0.15)",
            padding: "5px 10px",
            "& .MuiTypography-root": {
              color: "inherit",
            },
          },
          arrow: {
            color: mode === "dark" ? "#334155" : "#475569",
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
            "&.Mui-selected": {
              color: mode === "dark" ? "#5b93d3 !important" : "#2563a6 !important",
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: mode === "dark" ? "#5b93d3" : "#2563a6",
            height: 3,
            borderRadius: "3px 3px 0 0",
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
              color: mode === "dark" ? "#5b93d3" : "#2563a6",
              "& + .MuiSwitch-track": {
                backgroundColor: mode === "dark" ? "#3b73b5" : "#2563a6",
              },
            },
          },
        },
      },
    },
  });
}
