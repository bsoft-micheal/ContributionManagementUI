import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import GridViewIcon from "@mui/icons-material/GridView";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import MetricCard from "../../components/MetricCard";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { GetDashboardSummaryAsync } from "../../services/dashboardService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import { useAppToast } from "../../components/common/AppToast";
import AppDataTable from "../../components/common/AppDataTable";

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  collected: "#10b981", // emerald green
  pending: "#f59e0b", // amber
  paid: "#3b82f6", // blue
  unpaid: "#ef4444", // red
};

// ─── Curated Vibrant Donut Palette (Matches Reference Mockup) ─────────────────
const DONUT_COLORS = [
  "#8B5CF6", // Purple (Image 1 top right)
  "#A78BFA", // Lavender
  "#38BDF8", // Cyan / Sky Blue
  "#F43F5E", // Rose / Coral
  "#F59E0B", // Amber / Warm Orange
  "#10B981", // Mint / Emerald
  "#3B82F6", // Royal Blue
  "#EC4899", // Pink
  "#06B6D4", // Teal Cyan
  "#6366F1", // Indigo
  "#E11D48", // Crimson
  "#84CC16", // Lime
];

// ─── Format Helpers ───────────────────────────────────────────────────────────
function fmtAmt(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

// ─── SVG Arc Path Generator ───────────────────────────────────────────────────
function getDonutArcPath(cx, cy, rInner, rOuter, startAngle, endAngle) {
  // If full circle (or 99.9%+)
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    const midAngle = startAngle + Math.PI;
    return `
      M ${cx + rOuter * Math.cos(startAngle)} ${cy + rOuter * Math.sin(startAngle)}
      A ${rOuter} ${rOuter} 0 0 1 ${cx + rOuter * Math.cos(midAngle)} ${cy + rOuter * Math.sin(midAngle)}
      A ${rOuter} ${rOuter} 0 0 1 ${cx + rOuter * Math.cos(endAngle)} ${cy + rOuter * Math.sin(endAngle)}
      L ${cx + rInner * Math.cos(endAngle)} ${cy + rInner * Math.sin(endAngle)}
      A ${rInner} ${rInner} 0 0 0 ${cx + rInner * Math.cos(midAngle)} ${cy + rInner * Math.sin(midAngle)}
      A ${rInner} ${rInner} 0 0 0 ${cx + rInner * Math.cos(startAngle)} ${cy + rInner * Math.sin(startAngle)}
      Z
    `;
  }
  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);
  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `
    M ${x1} ${y1}
    A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}
    Z
  `;
}

// ─── Interactive Segmented Donut Chart Component ──────────────────────────────
function InteractiveDonutChart({
  items = [],
  activeItem = null,
  onHoverItem = () => {},
  defaultSummary = {},
  size = 300,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const cx = size / 2;
  const cy = size / 2;
  const rInner = 86;
  const rOuter = 136;
  const rInnerHover = 84;
  const rOuterHover = 144;

  const validItems = items.filter((d) => (Number(d.value) || 0) > 0);
  const total = validItems.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

  // Compute angles
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock
  const slices = (validItems.length > 0 ? validItems : items).map((item, idx) => {
    const val = Number(item.value) || 0;
    const fraction = total > 0 ? val / total : items.length > 0 ? 1 / items.length : 1;
    const angleDelta = fraction * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleDelta;
    currentAngle = endAngle;

    const pctNum = fraction * 100;
    const pct = pctNum % 1 === 0 ? pctNum.toFixed(0) : pctNum.toFixed(1);

    return {
      ...item,
      fraction,
      startAngle,
      endAngle,
      percent: item.percent ?? pct,
      color: item.color || DONUT_COLORS[idx % DONUT_COLORS.length],
    };
  });

  // Current display in center
  const display = activeItem || defaultSummary;

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="donutHoverShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity={isDark ? "0.6" : "0.22"} />
          </filter>
        </defs>

        {/* Empty state ring if total is 0 */}
        {slices.length === 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={(rOuter + rInner) / 2}
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
            strokeWidth={rOuter - rInner}
          />
        )}

        {/* Slices */}
        {slices.map((slice, idx) => {
          const isHovered =
            activeItem && (activeItem.id === slice.id || activeItem.label === slice.label);
          const currentRInner = isHovered ? rInnerHover : rInner;
          const currentROuter = isHovered ? rOuterHover : rOuter;
          const pathD = getDonutArcPath(
            cx,
            cy,
            currentRInner,
            currentROuter,
            slice.startAngle,
            slice.endAngle
          );

          return (
            <path
              key={slice.id || idx}
              d={pathD}
              fill={slice.color}
              stroke={isDark ? "#171a2e" : "#ffffff"}
              strokeWidth={slices.length > 1 ? 3 : 0}
              strokeLinejoin="round"
              filter={isHovered ? "url(#donutHoverShadow)" : "none"}
              style={{
                cursor: "pointer",
                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: activeItem && !isHovered ? 0.75 : 1,
              }}
              onMouseEnter={() => onHoverItem(slice)}
              onMouseLeave={() => onHoverItem(null)}
            />
          );
        })}
      </svg>

      {/* Center Details Hub (Exact Match to Reference Mockup) */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 138,
          height: 138,
          borderRadius: "50%",
          bgcolor: isDark ? "#171a2f" : "#ffffff",
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)"
            : "0 6px 24px rgba(30, 26, 46, 0.08), 0 1px 3px rgba(0,0,0,0.04)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 1.5,
          textAlign: "center",
          pointerEvents: "none",
          transition: "all 0.22s ease",
        }}
      >
        {/* Item Title */}
        <Tooltip title={display?.label || display?.title || ""}>
          <Typography
            noWrap
            sx={{
              maxWidth: 114,
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#2563eb",
              lineHeight: 1.2,
              letterSpacing: "0.01em",
            }}
          >
            {display?.label || display?.title || "Details"}
          </Typography>
        </Tooltip>

        {/* Amount */}
        <Typography
          sx={{
            fontSize: "1.32rem",
            fontWeight: 900,
            color: isDark ? "#ffffff" : "#0f172a",
            lineHeight: 1.15,
            my: 0.35,
            letterSpacing: "-0.02em",
          }}
        >
          ₹{Number(display?.value ?? display?.amount ?? 0).toLocaleString()}
        </Typography>

        {/* Percentage Badge */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            px: 1.2,
            py: 0.2,
            borderRadius: 99,
            bgcolor: isDark ? alpha("#3b82f6", 0.2) : "#eff6ff",
            border: `1px solid ${alpha("#3b82f6", 0.28)}`,
          }}
        >
          <Typography
            sx={{
              color: "#2563eb",
              fontWeight: 800,
              fontSize: "0.72rem",
              lineHeight: 1.3,
            }}
          >
            {display?.percent != null ? `${display.percent}%` : `${display?.badge || "0%"}`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Ring Legend Group ────────────────────────────────────────────────────────

function RingLegendGroup({ index, label, color, segments, total }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box>
      {/* Group header */}
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            background: `linear-gradient(135deg, ${alpha(color, 0.25)} 0%, ${alpha(color, 0.12)} 100%)`,
            border: `1.5px solid ${alpha(color, 0.45)}`,
          }}
        >
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 900, color }}>
            {index}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          fontWeight={800}
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem", color }}
        >
          {label}
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        {segments.map((seg, i) => {
          const frac = total > 0 ? Math.max(Number(seg.value) || 0, 0) / total : 0;
          const pct = Math.round(frac * 100);
          return (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: seg.color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${alpha(seg.color, 0.55)}`,
                    }}
                  />
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.84rem" }}>
                    {seg.label}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
                    {seg.displayValue ?? seg.value}
                  </Typography>
                  <Chip
                    label={`${pct}%`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 900,
                      bgcolor: alpha(seg.color, 0.12),
                      color: seg.color,
                      border: `1px solid ${alpha(seg.color, 0.3)}`,
                    }}
                  />
                </Stack>
              </Stack>
              {/* Progress bar */}
              <Box
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${seg.color} 0%, ${alpha(seg.color, 0.7)} 100%)`,
                    borderRadius: 3,
                    transition: "width 0.8s cubic-bezier(.16,1,.3,1)",
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

// ─── Per-Event Mini Card ──────────────────────────────────────────────────────

function EventMiniCard({ event, index }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const expected = Number(event.expectedAmount) || 0;
  const collected = Number(event.collectedAmount) || 0;
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const allPaid = event.pendingContributionsCount === 0 && (event.totalContributionsCount ?? 0) > 0;

  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: alpha(C.collected, 0.4),
          transform: "translateY(-2px)",
          boxShadow: isDark ? "0 6px 16px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.05)",
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            bgcolor: alpha(C.paid, 0.12),
            border: `1px solid ${alpha(C.paid, 0.25)}`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 900, color: C.paid }}>
            {String(index + 1).padStart(2, "0")}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight={800} noWrap sx={{ maxWidth: 170, fontSize: "0.82rem" }}>
              {event.eventName}
            </Typography>
            <Chip
              label={allPaid ? "✓ Settled" : `${event.pendingContributionsCount} pending`}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.66rem",
                fontWeight: 800,
                ml: 1,
                bgcolor: allPaid ? alpha(C.collected, 0.14) : alpha(C.unpaid, 0.12),
                color: allPaid ? "#059669" : "#dc2626",
                border: `1px solid ${allPaid ? alpha(C.collected, 0.28) : alpha(C.unpaid, 0.28)}`,
              }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.8 }}>
            <Box
              sx={{
                flex: 1,
                mr: 1.5,
                height: 6,
                borderRadius: 3,
                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${C.collected} 0%, ${alpha(C.collected, 0.7)} 100%)`,
                  borderRadius: 3,
                  transition: "width 0.7s cubic-bezier(.16,1,.3,1)",
                }}
              />
            </Box>
            <Typography variant="caption" fontWeight={800} sx={{ whiteSpace: "nowrap", fontSize: "0.74rem", color: C.collected }}>
              {fmtAmt(collected)}
              <Typography component="span" color="text.disabled" sx={{ fontSize: "0.68rem", fontWeight: 600 }}>
                {" / "} {fmtAmt(expected)}
              </Typography>
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, count, children, defaultOpen = true }) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex", alignItems: "center", gap: 1,
          cursor: "pointer", px: 2, py: 1.5, borderRadius: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === "dark"
            ? alpha(theme.palette.primary.main, 0.07)
            : alpha(theme.palette.primary.main, 0.04),
          transition: "background 0.2s ease", userSelect: "none",
          "&:hover": {
            bgcolor: theme.palette.mode === "dark"
              ? alpha(theme.palette.primary.main, 0.13)
              : alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        {open
          ? <ExpandLessIcon fontSize="small" color="primary" />
          : <ExpandMoreIcon fontSize="small" color="primary" />}
        <Typography variant="body1" fontWeight={700} sx={{ flex: 1 }}>
          {title}{" "}
          <Typography component="span" color="primary.main" fontWeight={900} sx={{ fontSize: "inherit" }}>
            ({count})
          </Typography>
        </Typography>
      </Box>
      <Collapse in={open} timeout="auto">
        <Box sx={{ pt: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { label: "All", value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({
    label: dayjs().month(i).format("MMMM"), value: i + 1,
  })),
];
const CURRENT_YEAR = dayjs().year();
const YEAR_OPTIONS = [
  { label: "All", value: 0 },
  ...Array.from({ length: 11 }, (_, i) => {
    const y = CURRENT_YEAR - 5 + i;
    return { label: String(y), value: y };
  }),
];

function FilterBar({ pending, onChange, onGo, onClear, eventTypeOptions, loading }) {
  const theme = useTheme();
  return (
    <Box sx={{
      px: { xs: 2, md: 3 }, py: 2,
      display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end",
      borderBottom: `1px solid ${theme.palette.divider}`,
      background: theme.palette.mode === "dark"
        ? alpha(theme.palette.primary.main, 0.04)
        : alpha(theme.palette.primary.main, 0.025),
    }}>
      <Box sx={{ minWidth: 170 }}>
        <AppSelect label="Month" value={pending.month}
          onChange={(e) => onChange("month", Number(e.target.value))}
          options={MONTH_OPTIONS} />
      </Box>
      <Box sx={{ minWidth: 145 }}>
        <AppSelect label="Year" value={pending.year}
          onChange={(e) => onChange("year", Number(e.target.value))}
          options={YEAR_OPTIONS} />
      </Box>
      <Box sx={{ minWidth: 190 }}>
        <AppSelect label="Event Type" value={pending.eventType || "ALL"}
          onChange={(e) => onChange("eventType", e.target.value)}
          options={eventTypeOptions} />
      </Box>
      <AppButton
        variant="contained"
        onClick={onGo}
        disabled={loading}
        startIcon={<PlayArrowIcon />}
        sx={{
          height: 40,
          px: 3.5,
          fontWeight: 800,
          letterSpacing: "0.03em",
        }}
      >
        Go
      </AppButton>
      <AppButton
        variant="outlined"
        onClick={onClear}
        disabled={loading}
        sx={{
          color: "#ef4444",
          borderColor: "rgba(239, 68, 68, 0.4)",
          height: 40,
          px: 2.5,
          fontWeight: 700,
          fontSize: "0.75rem",
          "&:hover": {
            borderColor: "#ef4444",
            bgcolor: "rgba(239, 68, 68, 0.05)",
          },
        }}
      >
        Clear Filter
      </AppButton>
    </Box>
  );
}

// ─── Summary Stat Pill ────────────────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <Box sx={{
      px: 2, py: 1.5, borderRadius: 2.5,
      border: `1px solid ${alpha(color, 0.28)}`,
      bgcolor: alpha(color, 0.08),
      flex: 1, textAlign: "center",
      transition: "all 0.2s ease",
      "&:hover": {
        bgcolor: alpha(color, 0.13),
        transform: "translateY(-1px)",
      },
    }}>
      <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color, lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={700}
        sx={{ fontSize: "0.68rem", letterSpacing: "0.04em", mt: 0.4, display: "block" }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toast = useAppToast();

  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventTypes, setEventTypes] = useState([]);

  const [pendingFilters, setPendingFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    eventType: "ALL",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    eventType: "ALL",
  });

  // Fetch event types for filter dropdown
  useEffect(() => {
    async function fetchEventTypes() {
      try {
        const types = await GetEventTypesAsync();
        if (Array.isArray(types)) {
          setEventTypes(types);
        }
      } catch (err) {
        console.error("Failed to load event types:", err);
      }
    }
    fetchEventTypes();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await GetDashboardSummaryAsync({
        month: appliedFilters.month,
        year: appliedFilters.year,
      });
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [appliedFilters.month, appliedFilters.year]);

  // Build Event Type options combining API categories and any upcoming events
  const eventTypeOptions = useMemo(() => {
    const options = [{ label: "All Event Types", value: "ALL" }];
    const set = new Set();
    eventTypes.forEach((t) => {
      const name = t.eventTypeName || t.name;
      if (name && !set.has(name.toLowerCase())) {
        set.add(name.toLowerCase());
        options.push({ label: name, value: name });
      }
    });
    (summary?.upcomingEvents ?? []).forEach((e) => {
      if (e.eventTypeName && !set.has(e.eventTypeName.toLowerCase())) {
        set.add(e.eventTypeName.toLowerCase());
        options.push({ label: e.eventTypeName, value: e.eventTypeName });
      }
    });
    return options;
  }, [eventTypes, summary?.upcomingEvents]);

  function handleFilterChange(key, value) {
    setPendingFilters((p) => ({ ...p, [key]: value }));
  }
  function handleGo() {
    setAppliedFilters({ ...pendingFilters });
    setSearch("");
  }
  function handleClear() {
    const resetValues = {
      month: dayjs().month() + 1,
      year: dayjs().year(),
      eventType: "ALL",
    };
    setPendingFilters(resetValues);
    setAppliedFilters(resetValues);
    setSearch("");
    toast.info("Dashboard filters reset to defaults");
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const isFilteredByType = Boolean(appliedFilters.eventType && appliedFilters.eventType !== "ALL");
  const allEvents = summary?.upcomingEvents ?? [];
  const events = useMemo(() => {
    if (!isFilteredByType) return allEvents;
    return allEvents.filter(
      (e) => e.eventTypeName?.toLowerCase() === appliedFilters.eventType.toLowerCase()
    );
  }, [allEvents, isFilteredByType, appliedFilters.eventType]);

  const chartEvents = events.slice(0, 6);

  const totalCollected = isFilteredByType
    ? events.reduce((sum, e) => sum + (Number(e.collectedAmount) || 0), 0)
    : Number(summary?.totalContributions ?? 0);

  const totalPending = isFilteredByType
    ? events.reduce((sum, e) => sum + (Number(e.pendingAmount) || 0), 0)
    : Number(summary?.totalPendingAmount ?? 0);

  const pendingCount = isFilteredByType
    ? events.reduce((sum, e) => sum + (Number(e.pendingContributionsCount) || 0), 0)
    : Number(summary?.pendingPayments ?? 0);

  const paidCount = events.reduce(
    (s, e) => s + ((e.totalContributionsCount ?? 0) - (e.pendingContributionsCount ?? 0)), 0
  );
  const totalExpected = totalCollected + totalPending;
  const collectionRate = totalExpected > 0
    ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const paymentRate = (paidCount + pendingCount) > 0
    ? Math.round((paidCount / (paidCount + pendingCount)) * 100) : 0;

  // ── Donut Chart View & Hover State ───────────────────────────────────────
  const [donutView, setDonutView] = useState("events"); // "events" | "status"
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Slices for By Event mode (matches reference mockup)
  const eventSlices = useMemo(() => {
    return events.map((e, idx) => {
      const exp = Number(e.expectedAmount) || 0;
      const col = Number(e.collectedAmount) || 0;
      const pctNum =
        totalExpected > 0
          ? (exp / totalExpected) * 100
          : events.length > 0
          ? 100 / events.length
          : 0;
      const pctStr = pctNum % 1 === 0 ? pctNum.toFixed(0) : pctNum.toFixed(1);
      const colPct = exp > 0 ? Math.min(100, Math.round((col / exp) * 100)) : 0;

      return {
        id: e.eventId || `event-${idx}`,
        label: e.eventName,
        value: exp,
        collected: col,
        collectedPct: colPct,
        percent: pctStr,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
        eventTypeName: e.eventTypeName,
        date: e.eventDate,
      };
    });
  }, [events, totalExpected]);

  // Slices for Status mode (Collected vs Pending)
  const statusSlices = useMemo(() => {
    const colPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    const penPct = totalExpected > 0 ? (totalPending / totalExpected) * 100 : 0;
    return [
      {
        id: "status-collected",
        label: "Collected",
        value: totalCollected,
        percent: colPct % 1 === 0 ? colPct.toFixed(0) : colPct.toFixed(1),
        color: C.collected,
      },
      {
        id: "status-pending",
        label: "Pending",
        value: totalPending,
        percent: penPct % 1 === 0 ? penPct.toFixed(0) : penPct.toFixed(1),
        color: C.pending,
      },
    ];
  }, [totalCollected, totalPending, totalExpected]);

  const defaultSummary = useMemo(() => {
    const title = donutView === "events"
      ? (isFilteredByType ? appliedFilters.eventType : "All Events")
      : "Total Expected";
    return {
      title,
      amount: totalExpected,
      percent: collectionRate,
      badge: `${collectionRate}%`,
    };
  }, [donutView, isFilteredByType, appliedFilters.eventType, totalExpected, collectionRate]);

  // Multi-ring chart ring definitions
  const amountRing = {
    label: "Amount",
    segments: [
      { label: "Collected", value: totalCollected, color: C.collected, displayValue: fmtAmt(totalCollected) },
      { label: "Pending", value: totalPending, color: C.pending, displayValue: fmtAmt(totalPending) },
    ],
  };
  const paymentsRing = {
    label: "Payments",
    segments: [
      { label: "Paid", value: paidCount, color: C.paid, displayValue: String(paidCount) },
      { label: "Pending", value: pendingCount, color: C.unpaid, displayValue: String(pendingCount) },
    ],
  };

  // Dashboard tab search
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? events.filter((e) =>
        e.eventName.toLowerCase().includes(q) ||
        e.eventTypeName.toLowerCase().includes(q)
      )
      : events;
  }, [events, search]);

  // Table columns (Dashboard tab)
  const columns = [
    {
      label: "Event", key: "eventName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">{row.eventName}</Typography>
      ),
    },
    {
      label: "Category", key: "eventTypeName",
      render: (row) => (
        <Chip label={row.eventTypeName} size="small" sx={{
          bgcolor: isDark ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.primary.main, 0.10),
          color: "primary.main", fontWeight: 700,
        }} />
      ),
    },
    { label: "Date", key: "eventDate", render: (row) => formatGridDate(row.eventDate) },
    {
      label: "Expected", key: "expectedAmount", align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>₹{Number(row.expectedAmount).toLocaleString()}</Typography>
      ),
    },
    {
      label: "Collected", key: "collectedAmount", align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="success.main">
          ₹{Number(row.collectedAmount).toLocaleString()}
        </Typography>
      ),
    },
    {
      label: "Pending ₹", key: "pendingAmount", align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}
          color={row.pendingAmount > 0 ? "error.main" : "text.secondary"}>
          ₹{Number(row.pendingAmount).toLocaleString()}
        </Typography>
      ),
    },
    {
      label: "Paid / Total", key: "totalContributionsCount", align: "center",
      render: (row) => {
        const paid = (row.totalContributionsCount ?? 0) - (row.pendingContributionsCount ?? 0);
        const total = row.totalContributionsCount ?? 0;
        return (
          <Chip label={`${paid} / ${total}`} size="small"
            color={row.pendingContributionsCount === 0 ? "success" : "warning"}
            variant="outlined" sx={{ fontWeight: 700, minWidth: 64 }} />
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      <Card sx={{ overflow: "hidden" }}>

        {/* ── Tab Header ──────────────────────────────────────────────────── */}
        <Box sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: { xs: 2, md: 3 }, pt: 0.5,
          background: isDark
            ? alpha(theme.palette.primary.main, 0.05)
            : alpha(theme.palette.primary.main, 0.03),
        }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            TabIndicatorProps={{
              style: {
                background: theme.palette.mode === "dark"
                  ? "linear-gradient(90deg, #7b6faa 0%, #a78bfa 100%)"
                  : "linear-gradient(90deg, #4a3f6b 0%, #2d2550 100%)",
                height: 3, borderRadius: "3px 3px 0 0",
              },
            }}
            sx={{ minHeight: 48 }}
          >
            <Tab id="tab-charts" icon={<DonutLargeIcon sx={{ fontSize: 18 }} />}
              iconPosition="start" label="Charts"
              sx={{
                fontWeight: 700, minHeight: 48, textTransform: "none", fontSize: "0.88rem",
                "&.Mui-selected": { color: "primary.main" }
              }} />
            <Tab id="tab-dashboard" icon={<GridViewIcon sx={{ fontSize: 18 }} />}
              iconPosition="start" label="Dashboard"
              sx={{
                fontWeight: 700, minHeight: 48, textTransform: "none", fontSize: "0.88rem",
                "&.Mui-selected": { color: "primary.main" }
              }} />
          </Tabs>
        </Box>

        {/* ── Filter Bar ──────────────────────────────────────────────────── */}
        <FilterBar
          pending={pendingFilters}
          onChange={handleFilterChange}
          onGo={handleGo}
          onClear={handleClear}
          eventTypeOptions={eventTypeOptions}
          loading={loading}
        />

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 14 }}>
            <CircularProgress size={46} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading dashboard…
            </Typography>
          </Stack>
        ) : (
          <>
            {/* ════════════════════ CHARTS TAB ════════════════════ */}
            {activeTab === 0 && (
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={3}>

                  {/* ① 4 Metric Cards */}
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <MetricCard label="TOTAL EVENTS"
                        value={events.length}
                        helper={isFilteredByType ? `Scheduled for ${appliedFilters.eventType}` : "Scheduled for the selected period"} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <MetricCard label="TOTAL COLLECTIONS"
                        value={`₹${totalCollected.toLocaleString()}`}
                        helper="Amount collected (paid)" accent="success.main" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <MetricCard label="TOTAL PENDING"
                        value={`₹${totalPending.toLocaleString()}`}
                        helper="Outstanding amount" accent="error.main" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <MetricCard label="PENDING PAYMENTS"
                        value={pendingCount}
                        helper="Unpaid contributions" accent="warning.main" />
                    </Grid>
                  </Grid>

                  {/* ② Segmented Interactive Donut Hero */}
                  {events.length > 0 ? (
                    <Card sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: isDark
                        ? "0 8px 32px rgba(0,0,0,0.35)"
                        : "0 8px 32px rgba(0,0,0,0.08)",
                      background: isDark
                        ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)"
                        : "linear-gradient(145deg, #f8faff 0%, #ffffff 100%)",
                    }}>
                      <CardContent sx={{ p: { xs: 2, md: 3.5 } }}>
                        <Stack spacing={3}>

                          {/* Card title & View Switcher */}
                          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                              <Box sx={{
                                width: 36, height: 36, borderRadius: 1.5,
                                display: "grid", placeItems: "center",
                                background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(79,70,229,0.12) 100%)",
                                border: "1px solid rgba(124,58,237,0.2)",
                              }}>
                                <DonutLargeIcon sx={{ fontSize: 20, color: "primary.main" }} />
                              </Box>
                              <Box>
                                <Typography variant="h6" fontWeight={900}>
                                  Financial Overview
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {donutView === "events" ? "Event contribution breakdown" : "Multi-ring contribution analysis"}
                                </Typography>
                              </Box>
                            </Stack>

                            {/* View Switcher: By Event / Financial Status */}
                            <Stack direction="row" spacing={0.5} sx={{
                              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                              p: 0.5, borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                            }}>
                              <Button
                                size="small"
                                onClick={() => { setDonutView("events"); setHoveredSlice(null); }}
                                sx={{
                                  borderRadius: 1.5,
                                  px: 1.5, py: 0.4,
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  textTransform: "none",
                                  bgcolor: donutView === "events" ? "primary.main" : "transparent",
                                  color: donutView === "events" ? "#ffffff" : "text.secondary",
                                  boxShadow: donutView === "events" ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none",
                                  "&:hover": {
                                    bgcolor: donutView === "events" ? "primary.dark" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                                  },
                                }}
                              >
                                By Event
                              </Button>
                              <Button
                                size="small"
                                onClick={() => { setDonutView("status"); setHoveredSlice(null); }}
                                sx={{
                                  borderRadius: 1.5,
                                  px: 1.5, py: 0.4,
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  textTransform: "none",
                                  bgcolor: donutView === "status" ? "primary.main" : "transparent",
                                  color: donutView === "status" ? "#ffffff" : "text.secondary",
                                  boxShadow: donutView === "status" ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none",
                                  "&:hover": {
                                    bgcolor: donutView === "status" ? "primary.dark" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                                  },
                                }}
                              >
                                Financial Status
                              </Button>
                            </Stack>
                          </Stack>

                          {/* Donut + Stats side-by-side */}
                          <Grid container spacing={3} alignItems="center">

                            {/* Donut chart */}
                            <Grid size={{ xs: 12, md: 5 }}>
                              <Stack alignItems="center" spacing={1.5}>
                                <InteractiveDonutChart
                                  items={donutView === "events" ? eventSlices : statusSlices}
                                  activeItem={hoveredSlice}
                                  onHoverItem={setHoveredSlice}
                                  defaultSummary={defaultSummary}
                                  size={300}
                                />

                                {/* Interactive hint below donut */}
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.72rem" }}>
                                  Hover any slice to view details in center
                                </Typography>
                              </Stack>
                            </Grid>

                            {/* Stats panel */}
                            <Grid size={{ xs: 12, md: 7 }}>
                              <Stack spacing={2.5}>
                                {/* Quick stat pills */}
                                <Stack direction="row" spacing={1.5}>
                                  <StatPill label="Collection Rate" value={`${collectionRate}%`} color={C.collected} />
                                  <StatPill label="Payment Rate" value={`${paymentRate}%`} color={C.paid} />
                                  <StatPill label="Events" value={events.length} color="#7c3aed" />
                                </Stack>

                                {donutView === "events" ? (
                                  <>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                      <Typography
                                        variant="caption"
                                        fontWeight={800}
                                        sx={{
                                          textTransform: "uppercase",
                                          letterSpacing: "0.08em",
                                          fontSize: "0.72rem",
                                          color: "text.secondary",
                                        }}
                                      >
                                        Event Contribution Share
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.7rem" }}>
                                        Hover event to inspect
                                      </Typography>
                                    </Stack>

                                    {/* Scrollable Event List */}
                                    <Box
                                      sx={{
                                        maxHeight: 230,
                                        overflowY: "auto",
                                        pr: 0.5,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1.2,
                                        "&::-webkit-scrollbar": { width: 5 },
                                        "&::-webkit-scrollbar-thumb": {
                                          backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                                          borderRadius: 4,
                                        },
                                      }}
                                    >
                                      {eventSlices.map((item) => {
                                        const isSelected = hoveredSlice?.id === item.id;
                                        return (
                                          <Box
                                            key={item.id}
                                            onMouseEnter={() => setHoveredSlice(item)}
                                            onMouseLeave={() => setHoveredSlice(null)}
                                            sx={{
                                              p: 1.2,
                                              borderRadius: 2,
                                              border: `1px solid ${isSelected ? item.color : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                                              bgcolor: isSelected
                                                ? alpha(item.color, isDark ? 0.16 : 0.08)
                                                : isDark
                                                ? "rgba(255,255,255,0.02)"
                                                : "rgba(0,0,0,0.015)",
                                              cursor: "pointer",
                                              transition: "all 0.2s ease",
                                              "&:hover": {
                                                borderColor: item.color,
                                                transform: "translateX(2px)",
                                              },
                                            }}
                                          >
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                                              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                                <Box
                                                  sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    bgcolor: item.color,
                                                    flexShrink: 0,
                                                    boxShadow: `0 0 6px ${alpha(item.color, 0.55)}`,
                                                  }}
                                                />
                                                <Typography variant="body2" fontWeight={800} noWrap sx={{ fontSize: "0.82rem", maxWidth: 180 }}>
                                                  {item.label}
                                                </Typography>
                                              </Stack>

                                              <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="body2" fontWeight={900} sx={{ fontSize: "0.84rem" }}>
                                                  ₹{Number(item.value).toLocaleString()}
                                                </Typography>
                                                <Chip
                                                  label={`${item.percent}%`}
                                                  size="small"
                                                  sx={{
                                                    height: 20,
                                                    fontSize: "0.68rem",
                                                    fontWeight: 900,
                                                    bgcolor: alpha(item.color, 0.12),
                                                    color: item.color,
                                                    border: `1px solid ${alpha(item.color, 0.3)}`,
                                                  }}
                                                />
                                              </Stack>
                                            </Stack>

                                            {/* Mini collection progress for this event */}
                                            <Box
                                              sx={{
                                                height: 5,
                                                borderRadius: 3,
                                                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                                                overflow: "hidden",
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  height: "100%",
                                                  width: `${item.collectedPct}%`,
                                                  background: `linear-gradient(90deg, ${item.color} 0%, ${alpha(item.color, 0.7)} 100%)`,
                                                  borderRadius: 3,
                                                  transition: "width 0.6s ease",
                                                }}
                                              />
                                            </Box>
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </>
                                ) : (
                                  <>
                                    {/* Ring legends for Financial Status */}
                                    <RingLegendGroup
                                      index="①"
                                      label="Amount Ring"
                                      color={C.collected}
                                      segments={amountRing.segments}
                                      total={totalExpected}
                                    />
                                    <Divider />
                                    <RingLegendGroup
                                      index="②"
                                      label="Payments Ring"
                                      color={C.paid}
                                      segments={paymentsRing.segments}
                                      total={paidCount + pendingCount}
                                    />
                                  </>
                                )}
                              </Stack>
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : (
                    <Box sx={{
                      py: 10, display: "grid", placeItems: "center", color: "text.secondary",
                      border: `1px dashed ${theme.palette.divider}`, borderRadius: 2,
                    }}>
                      <Typography variant="body2">
                        {isFilteredByType
                          ? `No events found for event type "${appliedFilters.eventType}" in the selected period.`
                          : "No events found for the selected period."}
                      </Typography>
                    </Box>
                  )}

                  {/* ③ Per-event breakdown list */}
                  {chartEvents.length > 0 && (
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <TrendingUpIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={800} color="text.secondary"
                          sx={{ textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.72rem" }}>
                          Event Breakdown
                        </Typography>
                        <Chip label={`${chartEvents.length} events`} size="small"
                          sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                      </Stack>
                      <Grid container spacing={1.5}>
                        {chartEvents.map((event, i) => (
                          <Grid key={event.eventId ?? i} size={{ xs: 12, sm: 6, lg: 4 }}>
                            <EventMiniCard event={event} index={i} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            )}

            {/* ════════════════════ DASHBOARD TAB ════════════════════ */}
            {activeTab === 1 && (
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <CollapsibleSection
                  title="Events for Selected Period"
                  count={events.length}
                  defaultOpen
                >
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <TextField
                        size="small"
                        id="dashboard-event-search"
                        placeholder="Search by name or category…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          width: { xs: "100%", sm: 280 },
                          "& .MuiOutlinedInput-root": { borderRadius: 2 },
                        }}
                      />
                    </Box>
                    <AppDataTable columns={columns} data={filteredEvents} loading={false} />
                  </Stack>
                </CollapsibleSection>
              </CardContent>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
