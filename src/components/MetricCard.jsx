import React from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { toPascalCase } from "../utils/textHelper";

export default function MetricCard({
  label,
  value,
  helper,
  accent = "primary.main",
  valueColor,
  fontWeight = 500,
  onClick,
  clickable = false,
  actionText,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isInteractive = Boolean(onClick || clickable);

  const resolvedAccent =
    accent === "primary.main" ? (isDark ? "#a78bfa" : "#6366f1") :
      accent === "#7c3aed" ? (isDark ? "#a78bfa" : "#6366f1") :
        accent === "success.main" ? "#10b981" :
          accent === "error.main" ? "#f43f5e" :
            accent === "warning.main" ? "#f59e0b" :
              accent === "info.main" ? "#3b82f6" : accent;

  return (
    <Card
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
        cursor: isInteractive ? "pointer" : "default",
        userSelect: isInteractive ? "none" : "auto",
        border: `1px solid ${isDark ? alpha(resolvedAccent, 0.2) : alpha(resolvedAccent, 0.12)}`,
        background: isDark
          ? `linear-gradient(145deg, ${alpha(resolvedAccent, 0.05)} 0%, rgba(23, 27, 45, 0.7) 100%)`
          : `linear-gradient(180deg, #ffffff 0%, ${alpha(resolvedAccent, 0.02)} 100%)`,
        boxShadow: isDark
          ? "0 4px 16px rgba(0, 0, 0, 0.25)"
          : "0 2px 10px rgba(0, 0, 0, 0.03)",
        "&:hover": {
          transform: isInteractive ? "translateY(-3px)" : "translateY(-2px)",
          boxShadow: isDark
            ? `0 10px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px ${alpha(resolvedAccent, 0.35)}`
            : `0 10px 24px -4px ${alpha(resolvedAccent, 0.12)}, 0 0 0 1px ${alpha(resolvedAccent, 0.25)}`,
          ...(isInteractive && {
            "& .metric-action-text": {
              opacity: 1,
              transform: "translateX(0)",
            },
          }),
        },
        "&:active": isInteractive ? {
          transform: "translateY(-1px)",
        } : {},
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2.5,
          background: `linear-gradient(90deg, ${resolvedAccent} 0%, ${alpha(resolvedAccent, 0.25)} 100%)`,
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          "&:last-child": { pb: { xs: 1.25, sm: 1.5 } },
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Stack spacing={0.35}>
          <Box>
            <Typography
              component="div"
              sx={{
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 700,
                letterSpacing: "0.01em",
                textTransform: "none",
                fontSize: "0.76rem",
                lineHeight: 1.3,
                display: "block",
                color: isDark ? "rgba(255, 255, 255, 0.88)" : "#1e293b",
              }}
            >
              {toPascalCase(label)}
            </Typography>
            <Typography
              component="div"
              sx={{
                color: valueColor || (isDark ? "#ffffff" : "#0f172a"),
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 700,
                fontSize: { xs: "1.05rem", sm: "1.125rem", md: "1.18rem" },
                letterSpacing: "-0.015em",
                mt: 0.35,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={typeof value === "string" ? value : undefined}
            >
              {value}
            </Typography>
          </Box>
        </Stack>

        {Boolean(actionText) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 0.75,
              mt: 0.85,
              pt: 0.75,
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
            }}
          >
            <Typography
              className={isInteractive ? "metric-action-text" : undefined}
              component="span"
              sx={{
                color: resolvedAccent,
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: "0.7rem",
                fontWeight: 600,
                opacity: isInteractive ? { xs: 0.95, sm: 0.85 } : 0.85,
                transform: isInteractive ? { xs: "none", sm: "translateX(2px)" } : "none",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
                whiteSpace: "nowrap",
                cursor: isInteractive ? "pointer" : "default",
              }}
            >
              {actionText}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
