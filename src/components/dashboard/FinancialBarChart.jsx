import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Chip,
  Tooltip,
  Button,
  Divider,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SavingsIcon from "@mui/icons-material/Savings";

// Curated solid colors for Pie Chart (modeled directly on Google Charts reference image)
const PIE_COLORS = [
  "#2563eb", // Royal Blue
  "#9333ea", // Purple
  "#ea580c", // Orange
  "#16a34a", // Green
  "#dc2626", // Red
  "#0284c7", // Sky Blue
  "#ca8a04", // Amber
  "#db2777", // Pink
  "#0d9488", // Teal
];

// Helper: polar to cartesian coordinates
function polarToCartesian(cx, cy, r, angleInRadians) {
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

// Helper: SVG pie slice path
function describePieSlice(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 1, end.x, end.y,
    "Z",
  ].join(" ");
}

/**
 * FinancialBarChart
 * Dual Visualization Component:
 * - LEFT: Clean, compact 5-bar Column Chart (Expected, Collected, Pending, Expenses, Balance)
 * - RIGHT: Classic Google-style Pie Chart with solid slices, percentage markers, and vertical legend (Image 2)
 */
export default function FinancialBarChart({
  totalExpected = 0,
  totalCollected = 0,
  totalPending = 0,
  totalExpenses = 0,
  totalRemaining = 0,
  events = [],
  isMember = false,
  showPieChart = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [pieMode, setPieMode] = useState("events"); // "events" | "status"

  // ─── 1. The 5 Financial Overview Metric Items (Left Side Bar Chart) ────────
  const metricItems = useMemo(() => {
    const exp = Math.max(0, Number(totalExpected || 0));
    const col = Math.max(0, Number(totalCollected || 0));
    const pen = Math.max(0, Number(totalPending || 0));
    const expn = Math.max(0, Number(totalExpenses || 0));
    const bal = Number(totalRemaining || 0);

    return [
      {
        id: "expected",
        label: "Total Expected",
        value: exp,
        formattedValue: `₹${exp.toLocaleString("en-IN")}`,
        color: "#6366f1", // Indigo / Purple
        bgGradient: isDark
          ? "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)"
          : "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)",
        icon: <TrendingUpIcon sx={{ fontSize: 16 }} />,
        helper: "Target goal for selected period",
        statusText: "Baseline Goal",
      },
      {
        id: "collected",
        label: isMember ? "Total Paid" : "Total Collections",
        value: col,
        formattedValue: `₹${col.toLocaleString("en-IN")}`,
        color: "#10b981", // Emerald Green
        bgGradient: isDark
          ? "linear-gradient(180deg, #34d399 0%, #10b981 100%)"
          : "linear-gradient(180deg, #34d399 0%, #10b981 100%)",
        icon: <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />,
        helper: "Total funds collected into treasury",
        statusText: "Collections",
      },
      {
        id: "pending",
        label: "Total Pending",
        value: pen,
        formattedValue: `₹${pen.toLocaleString("en-IN")}`,
        color: "#f43f5e", // Rose Red
        bgGradient: isDark
          ? "linear-gradient(180deg, #fb7185 0%, #f43f5e 100%)"
          : "linear-gradient(180deg, #fb7185 0%, #f43f5e 100%)",
        icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
        helper: "Unpaid / outstanding contributions",
        statusText: "Outstanding",
      },
      {
        id: "expenses",
        label: "Total Expenses",
        value: expn,
        formattedValue: `₹${expn.toLocaleString("en-IN")}`,
        color: "#f59e0b", // Amber / Warm Orange
        bgGradient: isDark
          ? "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)"
          : "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)",
        icon: <ReceiptLongIcon sx={{ fontSize: 16 }} />,
        helper: "Actual expenses incurred",
        statusText: "Spent",
      },
      {
        id: "balance",
        label: "Balance Amount",
        value: bal,
        formattedValue: `₹${bal.toLocaleString("en-IN")}`,
        color: bal >= 0 ? "#06b6d4" : "#f43f5e", // Mild Cyan / Rose
        bgGradient: bal >= 0
          ? isDark
            ? "linear-gradient(180deg, #38bdf8 0%, #06b6d4 100%)"
            : "linear-gradient(180deg, #38bdf8 0%, #06b6d4 100%)"
          : isDark
            ? "linear-gradient(180deg, #fb7185 0%, #f43f5e 100%)"
            : "linear-gradient(180deg, #fb7185 0%, #f43f5e 100%)",
        icon: <SavingsIcon sx={{ fontSize: 16 }} />,
        helper: bal >= 0 ? "Net surplus remaining" : "Deficit budget warning",
        statusText: bal >= 0 ? "Surplus ✓" : "Deficit ⚠",
      },
    ];
  }, [totalExpected, totalCollected, totalPending, totalExpenses, totalRemaining, isMember, isDark]);

  // ─── 2. Scale & Y-Axis Ticks for Bar Chart ──────────────────────────────────
  const { maxVal, yTicks } = useMemo(() => {
    let highest = 0;
    metricItems.forEach((m) => {
      highest = Math.max(highest, Math.abs(m.value));
    });

    if (highest <= 0) highest = 1000;

    const rawStep = highest / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let niceStep;
    if (normalized <= 1.25) niceStep = 1 * magnitude;
    else if (normalized <= 2.5) niceStep = 2 * magnitude;
    else if (normalized <= 6) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    const topTick = Math.ceil(highest / niceStep) * niceStep;
    const ticks = [0];
    for (let i = 1; i <= 4; i++) {
      ticks.push(Math.round((topTick / 4) * i));
    }

    return { maxVal: topTick, yTicks: ticks };
  }, [metricItems]);

  const formatYTick = (val) => {
    if (val === 0) return "0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const chartHeight = 220; // Height of bar plot area in px

  // ─── 3. Pie Chart Slices & Geometry (Right Side Pie Chart) ──────────────────
  const pieData = useMemo(() => {
    let rawItems = [];

    if (pieMode === "events" && events.length > 0) {
      rawItems = events.map((e, idx) => {
        const val = Number(e.totalExpectedAmount || e.expectedAmount || e.expected || e.collectedAmount || e.collected || 0);
        return {
          id: e.eventId || e.id || `ev-${idx}`,
          label: e.eventName || e.label || `Event ${idx + 1}`,
          value: Math.max(0, val),
          formattedValue: `₹${val.toLocaleString("en-IN")}`,
          color: PIE_COLORS[idx % PIE_COLORS.length],
        };
      });
    } else {
      // Status breakdown mode: Expected, Collections, Pending, Expenses, Balance
      const exp = Math.max(0, Number(totalExpected || 0));
      const col = Math.max(0, Number(totalCollected || 0));
      const pen = Math.max(0, Number(totalPending || 0));
      const expn = Math.max(0, Number(totalExpenses || 0));
      const bal = Math.max(0, Number(totalRemaining || 0));

      rawItems = [
        { id: "p-expct", label: "Expected", value: exp, formattedValue: `₹${exp.toLocaleString("en-IN")}`, color: "#6366f1" },
        { id: "p-col", label: isMember ? "Paid" : "Collections", value: col, formattedValue: `₹${col.toLocaleString("en-IN")}`, color: "#10b981" },
        { id: "p-pen", label: "Pending", value: pen, formattedValue: `₹${pen.toLocaleString("en-IN")}`, color: "#f43f5e" },
        { id: "p-exp", label: "Expenses", value: expn, formattedValue: `₹${expn.toLocaleString("en-IN")}`, color: "#f59e0b" },
        { id: "p-bal", label: "Balance", value: bal, formattedValue: `₹${bal.toLocaleString("en-IN")}`, color: "#06b6d4" },
      ];
    }

    const totalVal = rawItems.reduce((acc, item) => acc + item.value, 0);

    let startAngle = -Math.PI / 2; // Start from 12 o'clock
    const slices = rawItems.map((item) => {
      const fraction = totalVal > 0 ? item.value / totalVal : 1 / Math.max(1, rawItems.length);
      const angleDelta = fraction * 2 * Math.PI;
      const sliceStart = startAngle;
      const sliceEnd = startAngle + angleDelta;
      startAngle = sliceEnd;

      const pctNum = fraction * 100;
      const pctFormatted = `${pctNum % 1 === 0 ? pctNum.toFixed(0) : pctNum.toFixed(1)}%`;
      const midAngle = sliceStart + angleDelta / 2;

      return {
        ...item,
        fraction,
        startAngle: sliceStart,
        endAngle: sliceEnd,
        midAngle,
        pct: pctFormatted,
        isSignificant: fraction >= 0.07, // Show text on slices with >=7%
      };
    });

    return { slices, totalVal };
  }, [pieMode, events, totalCollected, totalPending, totalExpenses, totalRemaining]);

  const activeBarDetail = hoveredBar
    ? metricItems.find((m) => m.id === hoveredBar) || metricItems[0]
    : metricItems[0];

  // Pie chart geometry
  const pieSize = 210;
  const pieRadius = 95;
  const pieCenter = pieSize / 2;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.35)"
          : "0 4px 20px rgba(0,0,0,0.05)",
        background: isDark
          ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)"
          : "#ffffff",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* ── Card Main Header ── */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
              }}
            >
              <BarChartRoundedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.1875rem", letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                Financial Overview
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.4, color: isDark ? "rgba(255, 255, 255, 0.7)" : "#475569" }}>
                Financial metrics comparison & contribution distribution
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* ── Dual Visualization Grid: Left = Bar Chart, Right = Pie Chart ── */}
        <Grid container spacing={3} alignItems="stretch">
          
          {/* ════════════════════════════════════════════════════════════════════
              LEFT SIDE: Compact 5-Bar Column Chart
             ════════════════════════════════════════════════════════════════════ */}
          <Grid size={{ xs: 12, lg: showPieChart ? 7.2 : 12 }}>
            <Box sx={{ pr: { lg: showPieChart ? 2 : 0 } }}>
              <Typography variant="caption" sx={{ mb: 1, display: "block", textTransform: "none", letterSpacing: "0.01em", fontSize: "0.78125rem", fontWeight: 700, color: isDark ? "rgba(255, 255, 255, 0.8)" : "#334155" }}>
              
              </Typography>

              {/* Bar Chart Plotting Area */}
              <Box sx={{ width: "100%", overflowX: "auto", pb: 1 }}>
                <Box sx={{ minWidth: 420, position: "relative", pt: 2 }}>
                  
                  {/* Horizontal Gridlines & Y-Axis Numbers */}
                  <Box sx={{ position: "relative", height: chartHeight, width: "100%", mb: 1 }}>
                    {yTicks.slice().reverse().map((tickVal, idx) => {
                      const tickTop = (idx / (yTicks.length - 1)) * 100;
                      return (
                        <Box
                          key={tickVal}
                          sx={{
                            position: "absolute",
                            top: `${tickTop}%`,
                            left: 0,
                            right: 0,
                            display: "flex",
                            alignItems: "center",
                            pointerEvents: "none",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              width: 55,
                              textAlign: "right",
                              pr: 1.2,
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "text.secondary",
                              userSelect: "none",
                            }}
                          >
                            {formatYTick(tickVal)}
                          </Typography>
                          <Box
                            sx={{
                              flex: 1,
                              height: "1px",
                              bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            }}
                          />
                        </Box>
                      );
                    })}

                    {/* The 5 Columns */}
                    <Box
                      sx={{
                        position: "absolute",
                        left: 60,
                        right: 10,
                        bottom: 0,
                        top: 0,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-around",
                        px: 1,
                      }}
                    >
                      {metricItems.map((item) => {
                        const rawHeightPct = maxVal > 0 ? (Math.abs(item.value) / maxVal) * 100 : 0;
                        const visualHeight = item.value > 0 ? Math.max(10, (rawHeightPct / 100) * chartHeight) : 4;
                        const isHovered = hoveredBar === item.id;

                        return (
                          <Stack
                            key={item.id}
                            alignItems="center"
                            onMouseEnter={() => setHoveredBar(item.id)}
                            onMouseLeave={() => setHoveredBar(null)}
                            sx={{
                              height: "100%",
                              justifyContent: "flex-end",
                              width: { xs: 55, sm: 68 },
                              cursor: "pointer",
                              transition: "transform 0.2s ease",
                              "&:hover": {
                                transform: "translateY(-4px)",
                              },
                            }}
                          >
                            {/* Value badge above column */}
                            <Box
                              sx={{
                                mb: 0.6,
                                px: 0.8,
                                py: 0.15,
                                borderRadius: 1,
                                bgcolor: isHovered
                                  ? item.color
                                  : isDark
                                  ? "rgba(255,255,255,0.08)"
                                  : "rgba(0,0,0,0.04)",
                                color: isHovered ? "#ffffff" : "text.primary",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                boxShadow: isHovered ? `0 4px 12px ${alpha(item.color, 0.4)}` : "none",
                                transition: "all 0.2s ease",
                              }}
                            >
                              {item.formattedValue}
                            </Box>

                            {/* The Bar */}
                            <Tooltip
                              title={
                                <Box sx={{ p: 0.5, minWidth: 160 }}>
                                  <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.4 }}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor: item.color,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight={800}
                                      sx={{
                                        color: isDark ? "#ffffff !important" : "#0f172a !important",
                                        fontSize: "0.82rem",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {item.label}
                                    </Typography>
                                  </Stack>
                                  <Typography
                                    variant="body1"
                                    fontWeight={800}
                                    sx={{
                                      color: `${item.color} !important`,
                                      fontSize: "1.05rem",
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {item.formattedValue}
                                  </Typography>
                                  {item.helper && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: isDark ? "rgba(255, 255, 255, 0.85) !important" : "#334155 !important",
                                        display: "block",
                                        mt: 0.5,
                                        fontSize: "0.74rem",
                                        lineHeight: 1.35,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {item.helper}
                                    </Typography>
                                  )}
                                </Box>
                              }
                              arrow
                              placement="top"
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    bgcolor: isDark ? "#1e293b" : "#ffffff",
                                    color: isDark ? "#ffffff" : "#0f172a",
                                    border: isDark
                                      ? "1px solid rgba(255, 255, 255, 0.15)"
                                      : "1px solid #cbd5e1",
                                    boxShadow: isDark
                                      ? "0 10px 25px -4px rgba(0, 0, 0, 0.5)"
                                      : "0 10px 25px -4px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)",
                                    p: 1.25,
                                    borderRadius: 2,
                                    "& .MuiTypography-root": {
                                      color: isDark ? "#ffffff" : "#0f172a",
                                    },
                                  },
                                },
                                arrow: {
                                  sx: {
                                    color: isDark ? "#1e293b" : "#ffffff",
                                    "&:before": {
                                      border: isDark
                                        ? "1px solid rgba(255, 255, 255, 0.15)"
                                        : "1px solid #cbd5e1",
                                    },
                                  },
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  width: { xs: 30, sm: 42 },
                                  height: `${visualHeight}px`,
                                  background: item.bgGradient,
                                  borderRadius: "6px 6px 0 0",
                                  boxShadow: isHovered
                                    ? `0 0 16px ${alpha(item.color, 0.6)}`
                                    : `0 2px 6px ${alpha(item.color, 0.25)}`,
                                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                  position: "relative",
                                  "&:after": {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    bgcolor: "rgba(255,255,255,0.4)",
                                    borderRadius: "6px 6px 0 0",
                                  },
                                }}
                              />
                            </Tooltip>
                          </Stack>
                        );
                      })}
                    </Box>
                  </Box>

                  {/* Baseline X-Axis Bar */}
                  <Box
                    sx={{
                      ml: "60px",
                      height: "2px",
                      bgcolor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
                      mb: 1.2,
                    }}
                  />

                  {/* X-Axis Category Titles */}
                  <Box
                    sx={{
                      ml: "60px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-around",
                      px: 1,
                    }}
                  >
                    {metricItems.map((item) => (
                      <Stack
                        key={item.id}
                        alignItems="center"
                        spacing={0.4}
                        sx={{ width: { xs: 60, sm: 76 }, textAlign: "center" }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Box
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              bgcolor: item.color,
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{
                              fontSize: "0.72rem",
                              color: hoveredBar === item.id ? item.color : "text.primary",
                              lineHeight: 1.15,
                            }}
                          >
                            {item.label}
                          </Typography>
                        </Stack>
                      </Stack>
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Bottom active detail micro-banner */}
              <Box
                sx={{
                  mt: 2,
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                  border: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.2}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: alpha(activeBarDetail.color, 0.15),
                      color: activeBarDetail.color,
                    }}
                  >
                    {activeBarDetail.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem", color: isDark ? "#ffffff" : "#0f172a" }}>
                    {activeBarDetail.label}:{" "}
                    <Box component="span" sx={{ color: activeBarDetail.color, fontWeight: 800 }}>
                      {activeBarDetail.formattedValue}
                    </Box>
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: isDark ? "rgba(255, 255, 255, 0.78)" : "#334155" }}>
                  {activeBarDetail.helper}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* ════════════════════════════════════════════════════════════════════
              RIGHT SIDE: Google-Style Pie Chart (Matching Image 2 Reference)
             ════════════════════════════════════════════════════════════════════ */}
          {showPieChart && (
            <Grid
              size={{ xs: 12, lg: 4.8 }}
              sx={{
                borderLeft: { lg: `1px solid ${theme.palette.divider}` },
                pl: { lg: 3 },
              }}
            >
              <Stack spacing={1.5} sx={{ height: "100%" }}>
                
                {/* Header with Switcher: By Event / Financial Status */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PieChartRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: "0.9375rem", letterSpacing: "-0.005em" }}>
                      {pieMode === "events" ? "Event Distribution" : "Financial Distribution"}
                    </Typography>
                  </Stack>

                  {events.length > 0 && (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                        p: 0.3,
                        borderRadius: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Button
                        size="small"
                        onClick={() => setPieMode("events")}
                        sx={{
                          py: 0.2,
                          px: 1,
                          fontSize: "0.78125rem",
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: 1,
                          bgcolor: pieMode === "events" ? "#6366f1" : "transparent",
                          color: pieMode === "events" ? "#ffffff" : "text.secondary",
                        }}
                      >
                        By Event
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setPieMode("status")}
                        sx={{
                          py: 0.2,
                          px: 1,
                          fontSize: "0.78125rem",
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: 1,
                          bgcolor: pieMode === "status" ? "#6366f1" : "transparent",
                          color: pieMode === "status" ? "#ffffff" : "text.secondary",
                        }}
                      >
                        Status
                      </Button>
                    </Stack>
                  )}
                </Stack>

                {/* The Pie + Vertical Legend Layout (Image 2 style) */}
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "center",
                    justifyContent: "center",
                    gap: { xs: 2, sm: 3 },
                    py: 1,
                  }}
                >
                  {/* SVG Pie Chart */}
                  <Box
                    sx={{
                      width: pieSize,
                      height: pieSize,
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width={pieSize}
                      height={pieSize}
                      viewBox={`0 0 ${pieSize} ${pieSize}`}
                      style={{ overflow: "visible" }}
                    >
                      {/* Empty state if 0 */}
                      {pieData.slices.length === 0 || pieData.totalVal === 0 ? (
                        <circle
                          cx={pieCenter}
                          cy={pieCenter}
                          r={pieRadius}
                          fill={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                        />
                      ) : pieData.slices.length === 1 ? (
                        // Single item = 100% circle
                        <Tooltip
                          title={
                            <Box sx={{ p: 0.5, minWidth: 140 }}>
                              <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.3 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: pieData.slices[0].color,
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={800}
                                  sx={{
                                    color: isDark ? "#ffffff !important" : "#0f172a !important",
                                    fontSize: "0.82rem",
                                  }}
                                >
                                  {pieData.slices[0].label}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="body1"
                                fontWeight={800}
                                sx={{
                                  color: `${pieData.slices[0].color} !important`,
                                  fontSize: "1rem",
                                }}
                              >
                                {pieData.slices[0].formattedValue}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                          slotProps={{
                            tooltip: {
                              sx: {
                                bgcolor: isDark ? "#1e293b" : "#ffffff",
                                color: isDark ? "#ffffff" : "#0f172a",
                                border: isDark
                                  ? "1px solid rgba(255, 255, 255, 0.15)"
                                  : "1px solid #cbd5e1",
                                boxShadow: isDark
                                  ? "0 10px 25px -4px rgba(0, 0, 0, 0.5)"
                                  : "0 10px 25px -4px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)",
                                p: 1.25,
                                borderRadius: 2,
                                "& .MuiTypography-root": {
                                  color: isDark ? "#ffffff" : "#0f172a",
                                },
                              },
                            },
                            arrow: {
                              sx: {
                                color: isDark ? "#1e293b" : "#ffffff",
                                "&:before": {
                                  border: isDark
                                    ? "1px solid rgba(255, 255, 255, 0.15)"
                                    : "1px solid #cbd5e1",
                                },
                              },
                            },
                          }}
                        >
                          <g style={{ cursor: "pointer" }}>
                            <circle
                              cx={pieCenter}
                              cy={pieCenter}
                              r={pieRadius}
                              fill={pieData.slices[0].color}
                              stroke={isDark ? "#1e293b" : "#ffffff"}
                              strokeWidth={2}
                            />
                            <text
                              x={pieCenter}
                              y={pieCenter}
                              fill="#ffffff"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="13px"
                              fontWeight={800}
                            >
                              100%
                            </text>
                          </g>
                        </Tooltip>
                      ) : (
                        // Multiple slices
                        pieData.slices.map((slice) => {
                          const pathD = describePieSlice(
                            pieCenter,
                            pieCenter,
                            pieRadius,
                            slice.startAngle,
                            slice.endAngle
                          );
                          const isHovered = hoveredSlice === slice.id;

                          // Percentage label position on slice
                          const textPos = polarToCartesian(
                            pieCenter,
                            pieCenter,
                            pieRadius * 0.65,
                            slice.midAngle
                          );

                          return (
                            <g
                              key={slice.id}
                              onMouseEnter={() => setHoveredSlice(slice.id)}
                              onMouseLeave={() => setHoveredSlice(null)}
                              style={{ cursor: "pointer" }}
                            >
                              <Tooltip
                                title={
                                  <Box sx={{ p: 0.5, minWidth: 140 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.3 }}>
                                      <Box
                                        sx={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: "50%",
                                          bgcolor: slice.color,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={800}
                                        sx={{
                                          color: isDark ? "#ffffff !important" : "#0f172a !important",
                                          fontSize: "0.82rem",
                                        }}
                                      >
                                        {slice.label}
                                      </Typography>
                                    </Stack>
                                    <Typography
                                      variant="body1"
                                      fontWeight={800}
                                      sx={{
                                        color: `${slice.color} !important`,
                                        fontSize: "1rem",
                                      }}
                                    >
                                      {slice.formattedValue}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                                slotProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: isDark ? "#1e293b" : "#ffffff",
                                      color: isDark ? "#ffffff" : "#0f172a",
                                      border: isDark
                                        ? "1px solid rgba(255, 255, 255, 0.15)"
                                        : "1px solid #cbd5e1",
                                      boxShadow: isDark
                                        ? "0 10px 25px -4px rgba(0, 0, 0, 0.5)"
                                        : "0 10px 25px -4px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)",
                                      p: 1.25,
                                      borderRadius: 2,
                                      "& .MuiTypography-root": {
                                        color: isDark ? "#ffffff" : "#0f172a",
                                      },
                                    },
                                  },
                                  arrow: {
                                    sx: {
                                      color: isDark ? "#1e293b" : "#ffffff",
                                      "&:before": {
                                        border: isDark
                                          ? "1px solid rgba(255, 255, 255, 0.15)"
                                          : "1px solid #cbd5e1",
                                      },
                                    },
                                  },
                                }}
                              >
                                <path
                                  d={pathD}
                                  fill={slice.color}
                                  stroke={isDark ? "#1e293b" : "#ffffff"}
                                  strokeWidth={2}
                                  style={{
                                    transition: "transform 0.2s ease, opacity 0.2s ease",
                                    opacity: hoveredSlice && !isHovered ? 0.65 : 1,
                                    transform: isHovered ? "scale(1.03)" : "scale(1)",
                                    transformOrigin: `${pieCenter}px ${pieCenter}px`,
                                  }}
                                />
                              </Tooltip>

                              {/* Percentage inside slice if large enough (matching Image 2) */}
                              {slice.isSignificant && (
                                <text
                                  x={textPos.x}
                                  y={textPos.y}
                                  fill="#ffffff"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize="11px"
                                  fontWeight={800}
                                  style={{ pointerEvents: "none" }}
                                >
                                  {slice.pct}
                                </text>
                              )}
                            </g>
                          );
                        })
                      )}
                    </svg>
                  </Box>

                  {/* Vertical Legend (Right of Pie, directly matching Image 2) */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.8,
                      maxHeight: 280,
                      overflowY: "auto",
                      pr: 0.5,
                      "&::-webkit-scrollbar": { width: 4 },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                        borderRadius: 4,
                      },
                    }}
                  >
                    {pieData.slices.map((slice) => {
                      const isHovered = hoveredSlice === slice.id;
                      return (
                        <Stack
                          key={slice.id}
                          direction="row"
                          alignItems="center"
                          spacing={1.2}
                          onMouseEnter={() => setHoveredSlice(slice.id)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          sx={{
                            cursor: "pointer",
                            p: 0.5,
                            px: 1,
                            borderRadius: 1.5,
                            bgcolor: isHovered
                              ? alpha(slice.color, 0.12)
                              : "transparent",
                            transition: "all 0.15s ease",
                            "&:hover": { bgcolor: alpha(slice.color, 0.12) },
                          }}
                        >
                          {/* Colored Circle Dot */}
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: slice.color,
                              flexShrink: 0,
                              boxShadow: `0 0 6px ${alpha(slice.color, 0.5)}`,
                            }}
                          />

                          {/* Label & Value */}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              noWrap
                              sx={{
                                fontSize: "0.78125rem",
                                maxWidth: 130,
                                color: isHovered ? slice.color : "text.primary",
                              }}
                              title={slice.label}
                            >
                              {slice.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.75rem", fontWeight: 400 }}
                            >
                              {slice.formattedValue}
                            </Typography>
                          </Box>
                        </Stack>
                      );
                    })}
                  </Box>
                </Box>
              </Stack>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}
