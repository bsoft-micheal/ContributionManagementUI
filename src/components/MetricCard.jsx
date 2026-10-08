import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { toPascalCase } from "../utils/textHelper";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BalanceRoundedIcon from "@mui/icons-material/BalanceRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

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
  icon,
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

  // Resolve icon automatically if not passed
  const resolvedIcon = React.useMemo(() => {
    if (icon) return icon;
    const l = (label || "").toLowerCase();
    if (l.includes("expected")) return <GroupsRoundedIcon sx={{ fontSize: 16 }} />;
    if (l.includes("collect") || l.includes("paid")) return <SavingsRoundedIcon sx={{ fontSize: 16 }} />;
    if (l.includes("pending") || l.includes("unpaid") || l.includes("due")) return <CreditCardRoundedIcon sx={{ fontSize: 16 }} />;
    if (l.includes("expense")) return <AccountBalanceWalletRoundedIcon sx={{ fontSize: 16 }} />;
    if (l.includes("balance") || l.includes("remaining")) return <BalanceRoundedIcon sx={{ fontSize: 16 }} />;
    if (l.includes("event")) return <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />;
    if (l.includes("member") || l.includes("defaulter")) return <GroupsRoundedIcon sx={{ fontSize: 16 }} />;
    return <TrendingUpRoundedIcon sx={{ fontSize: 16 }} />;
  }, [icon, label]);

  return (
    <Card
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      sx={{
        height: "100%",
        minHeight: { xs: 104, sm: 112 },
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
        cursor: isInteractive ? "pointer" : "default",
        userSelect: isInteractive ? "none" : "auto",
        border: `1px solid ${isDark ? alpha(resolvedAccent, 0.28) : alpha(resolvedAccent, 0.2)}`,
        background: isDark
          ? `linear-gradient(145deg, ${alpha(resolvedAccent, 0.12)} 0%, rgba(20, 24, 40, 0.95) 100%)`
          : `linear-gradient(180deg, ${alpha(resolvedAccent, 0.05)} 0%, #ffffff 100%)`,
        boxShadow: isDark
          ? "0 4px 16px rgba(0, 0, 0, 0.25)"
          : `0 2px 8px ${alpha(resolvedAccent, 0.05)}`,
        "&:hover": {
          transform: isInteractive ? "translateY(-2px)" : "none",
          boxShadow: isDark
            ? `0 8px 20px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px ${alpha(resolvedAccent, 0.35)}`
            : `0 8px 20px -4px ${alpha(resolvedAccent, 0.14)}, 0 0 0 1px ${alpha(resolvedAccent, 0.25)}`,
          ...(isInteractive && {
            "& .metric-action-text": {
              opacity: 1,
              transform: "translateX(2px)",
            },
          }),
        },
        "&:active": isInteractive ? {
          transform: "translateY(-1px)",
        } : {},
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.2, sm: 1.35 },
          "&:last-child": { pb: { xs: 1.2, sm: 1.35 } },
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top Header: Circular Icon Badge + Label */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isDark ? alpha(resolvedAccent, 0.24) : alpha(resolvedAccent, 0.14),
              color: resolvedAccent,
              flexShrink: 0,
            }}
          >
            {resolvedIcon}
          </Box>
          <Typography
            component="div"
            sx={{
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 600,
              fontSize: { xs: "0.72rem", sm: "0.76rem" },
              lineHeight: 1.2,
              color: isDark ? "rgba(255, 255, 255, 0.76)" : "#475569",
              wordBreak: "break-word",
            }}
          >
            {toPascalCase(label)}
          </Typography>
        </Box>

        {/* Middle Value */}
        <Typography
          component="div"
          sx={{
            color: valueColor || (isDark ? "#ffffff" : "#0f172a"),
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: 800,
            fontSize: { xs: "1.32rem", sm: "1.44rem" },
            letterSpacing: "-0.02em",
            my: { xs: 0.5, sm: 0.65 },
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </Typography>

        {/* Bottom Action Link */}
        {Boolean(actionText) ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              mt: "auto",
              pt: 0.25,
            }}
          >
            <Typography
              className={isInteractive ? "metric-action-text" : undefined}
              component="span"
              sx={{
                color: resolvedAccent,
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: { xs: "0.68rem", sm: "0.72rem" },
                fontWeight: 600,
                opacity: isInteractive ? { xs: 0.95, sm: 0.9 } : 0.85,
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
        ) : (
          <Box sx={{ minHeight: 14 }} />
        )}
      </CardContent>
    </Card>
  );
}
