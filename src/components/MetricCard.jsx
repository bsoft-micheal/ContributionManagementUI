import React from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

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
          p: { xs: 1.5, sm: 1.75 },
          "&:last-child": { pb: { xs: 1.5, sm: 1.75 } },
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Stack spacing={0.5}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontSize: "0.78125rem",
                lineHeight: 1.3,
                display: "block",
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: valueColor || (isDark ? "#ffffff" : "#0f172a"),
                fontWeight: 700,
                fontSize: { xs: "1.25rem", sm: "1.375rem", md: "1.45rem", xl: "1.5rem" },
                letterSpacing: "-0.02em",
                mt: 0.35,
                lineHeight: 1.2,
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

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.75,
            mt: 1,
            pt: 0.75,
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              lineHeight: 1.4,
              fontWeight: 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
            title={typeof helper === "string" ? helper : undefined}
          >
            {helper}
          </Typography>
          {isInteractive && (
            <Typography
              className="metric-action-text"
              variant="caption"
              sx={{
                color: resolvedAccent,
                fontSize: "0.75rem",
                fontWeight: 600,
                opacity: { xs: 0.95, sm: 0.8 },
                transform: { xs: "none", sm: "translateX(2px)" },
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {actionText || "View →"}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
