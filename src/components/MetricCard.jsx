import React from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export default function MetricCard({
  label,
  value,
  helper,
  accent = "primary.main",
  onClick,
  clickable = false,
  actionText,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isInteractive = Boolean(onClick || clickable);

  const resolvedAccent =
    accent === "primary.main" ? theme.palette.primary.main :
    accent === "success.main" ? "#10b981" :
    accent === "error.main" ? "#ef4444" :
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
        borderRadius: 2.5,
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
        cursor: isInteractive ? "pointer" : "default",
        userSelect: isInteractive ? "none" : "auto",
        border: `1px solid ${isDark ? alpha(resolvedAccent, 0.25) : alpha(resolvedAccent, 0.18)}`,
        background: isDark
          ? `linear-gradient(145deg, ${alpha(resolvedAccent, 0.08)} 0%, rgba(30, 26, 46, 0.7) 100%)`
          : `linear-gradient(145deg, #ffffff 0%, ${alpha(resolvedAccent, 0.04)} 100%)`,
        "&:hover": {
          transform: isInteractive ? "translateY(-4px)" : "translateY(-3px)",
          boxShadow: isDark
            ? `0 14px 28px -6px ${alpha(resolvedAccent, 0.28)}, 0 0 0 ${isInteractive ? "2px" : "1px"} ${alpha(resolvedAccent, 0.5)}`
            : `0 14px 28px -6px ${alpha(resolvedAccent, 0.22)}, 0 0 0 ${isInteractive ? "2px" : "1px"} ${alpha(resolvedAccent, 0.45)}`,
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
          height: 3.5,
          background: `linear-gradient(90deg, ${resolvedAccent} 0%, ${alpha(resolvedAccent, 0.4)} 100%)`,
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
        <Stack spacing={0.75}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontSize: { xs: "0.62rem", sm: "0.65rem", xl: "0.68rem" },
                display: "block",
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: resolvedAccent,
                fontWeight: 900,
                fontSize: { xs: "1.35rem", sm: "1.5rem", md: "1.55rem", xl: "1.75rem" },
                letterSpacing: "-0.02em",
                mt: 0.35,
                lineHeight: 1.15,
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
            gap: 0.5,
            mt: 1,
            pt: 0.5,
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: { xs: "0.68rem", sm: "0.71rem" },
              lineHeight: 1.2,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
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
                fontSize: { xs: "0.68rem", sm: "0.71rem" },
                fontWeight: 700,
                opacity: { xs: 0.9, sm: 0.75 },
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
