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
import MetricCard from "../../components/MetricCard";
import AppSelect from "../../components/common/AppSelect";
import { GetDashboardSummaryAsync } from "../../services/dashboardService";
import AppDataTable from "../../components/common/AppDataTable";

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  collected: "#10b981", // emerald green
  pending:   "#f59e0b", // amber
  paid:      "#3b82f6", // blue
  unpaid:    "#ef4444", // red
};

// ─── Format Helpers ───────────────────────────────────────────────────────────
function fmtAmt(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

// ─── Multi-Ring Donut (SVG stroke-dasharray technique) ────────────────────────
//
//  Ring layout (300×300 SVG):
//   Outer ring  →  mid-radius 120, thickness 30  (inner edge at 105)
//   Inner ring  →  mid-radius  80, thickness 30  (outer edge at  95)
//   Decorative gap = 10 px between rings
//   Center area  →  radius ≈ 63 px  (diameter ≈ 126 px for text)

const MR_SIZE        = 300;
const MR_THICKNESS   = 30;
const MR_MID_RADII   = [120, 80]; // outer → inner
const MR_SEGMENT_GAP = 3;         // px gap between adjacent segments

function buildRingArcs(segments, midR) {
  const circ  = 2 * Math.PI * midR;
  const total = segments.reduce((s, d) => s + Math.max(Number(d.value) || 0, 0), 0);
  let cum = 0;
  return {
    circ,
    total,
    arcs: segments.map((seg) => {
      const val  = Math.max(Number(seg.value) || 0, 0);
      const frac = total > 0 ? val / total : 0;
      const len  = frac * circ;
      const dash = Math.max(0, len - MR_SEGMENT_GAP);
      const offset = circ - cum;
      cum += len;
      return { ...seg, frac, dash, offset };
    }),
  };
}

function MultiRingDonut({ rings, centerPct, centerLabel, centerSub }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const cx     = MR_SIZE / 2;
  const cy     = MR_SIZE / 2;

  const trackColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const rimColor   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const processed = rings.map((ring, ri) => ({
    ...ring,
    midR: MR_MID_RADII[ri],
    ...buildRingArcs(ring.segments, MR_MID_RADII[ri]),
  }));

  const outerR = MR_MID_RADII[0] + MR_THICKNESS / 2 + 5;
  const innerR = MR_MID_RADII[MR_MID_RADII.length - 1] - MR_THICKNESS / 2 - 5;

  return (
    <Box sx={{ position: "relative", width: MR_SIZE, height: MR_SIZE, flexShrink: 0 }}>
      <svg
        width={MR_SIZE}
        height={MR_SIZE}
        viewBox={`0 0 ${MR_SIZE} ${MR_SIZE}`}
        style={{ transform: "rotate(-90deg)", overflow: "visible" }}
      >
        <defs>
          {/* Subtle drop-shadow for segments */}
          <filter id="mrShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodOpacity="0.2" />
          </filter>

          {/* Glow filters per colour */}
          {Object.entries(C).map(([key, hex]) => (
            <filter key={key} id={`glow-${key}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* ── Outer decorative border ── */}
        <circle cx={cx} cy={cy} r={outerR}
          fill="none" stroke={rimColor} strokeWidth={1} />

        {/* ── Inner decorative border (center circle outline) ── */}
        <circle cx={cx} cy={cy} r={innerR}
          fill="none" stroke={rimColor} strokeWidth={1} />

        {/* ── Background tracks ── */}
        {processed.map((ring, ri) => (
          <circle key={`track-${ri}`}
            cx={cx} cy={cy} r={ring.midR}
            fill="none"
            stroke={trackColor}
            strokeWidth={MR_THICKNESS}
          />
        ))}

        {/* ── Coloured segments ── */}
        {processed.map((ring, ri) =>
          ring.arcs.map((arc, ai) => (
            <circle key={`seg-${ri}-${ai}`}
              cx={cx} cy={cy} r={ring.midR}
              fill="none"
              stroke={arc.color}
              strokeWidth={MR_THICKNESS - 5}
              strokeLinecap="butt"
              strokeDasharray={`${arc.dash} ${ring.circ}`}
              strokeDashoffset={arc.offset}
              filter="url(#mrShadow)"
            />
          ))
        )}

        {/* ── Ring-index dots at 12 o'clock (shows which ring is which) ── */}
        {processed.map((ring, ri) => {
          // 12 o'clock in the rotated SVG = (cx, cy - midR) in SVG coords
          const dotX = cx;
          const dotY = cy - ring.midR;
          return (
            <circle key={`dot-${ri}`}
              cx={dotX} cy={dotY} r={6}
              fill={theme.palette.background.paper}
              stroke={ring.arcs[0]?.color ?? rimColor}
              strokeWidth={2.5}
            />
          );
        })}
      </svg>

      {/* ── Center overlay (counters SVG rotation) ── */}
      <Box sx={{
        position: "absolute", inset: 0,
        display: "grid", placeItems: "center",
        textAlign: "center", pointerEvents: "none",
      }}>
        <Box>
          <Typography
            sx={{
              fontSize: "2rem",
              fontWeight: 900,
              lineHeight: 1,
              background: `linear-gradient(135deg, ${C.collected} 0%, #059669 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {centerPct}%
          </Typography>
          <Typography
            variant="caption"
            fontWeight={800}
            color="text.secondary"
            display="block"
            sx={{ mt: 0.4, fontSize: "0.72rem", letterSpacing: "0.04em" }}
          >
            {centerLabel}
          </Typography>
          {centerSub && (
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              sx={{ fontSize: "0.6rem", mt: 0.3 }}
            >
              {centerSub}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Ring Legend Group ────────────────────────────────────────────────────────

function RingLegendGroup({ index, label, color, segments, total }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box>
      {/* Group header with coloured accent bar */}
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: "50%",
          display: "grid", placeItems: "center", flexShrink: 0,
          background: `linear-gradient(135deg, ${alpha(color, 0.25)} 0%, ${alpha(color, 0.12)} 100%)`,
          border: `2px solid ${alpha(color, 0.4)}`,
        }}>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 900, color }}>
            {index}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={800}
            sx={{ textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.72rem", color }}>
            {label}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.25}>
        {segments.map((seg, i) => {
          const frac = total > 0 ? Math.max(Number(seg.value) || 0, 0) / total : 0;
          const pct  = Math.round(frac * 100);
          return (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: 0.5,
                    bgcolor: seg.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${alpha(seg.color, 0.55)}`,
                  }} />
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
                    {seg.label}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.82rem" }}>
                    {seg.displayValue ?? seg.value}
                  </Typography>
                  <Box sx={{
                    px: 0.7, py: 0.05, borderRadius: 99,
                    bgcolor: alpha(seg.color, 0.14),
                    border: `1px solid ${alpha(seg.color, 0.3)}`,
                  }}>
                    <Typography variant="caption" fontWeight={900}
                      sx={{ color: seg.color, fontSize: "0.66rem" }}>
                      {pct}%
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
              {/* Coloured progress bar */}
              <Box sx={{
                height: 5, borderRadius: 99,
                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}>
                <Box sx={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${seg.color} 0%, ${alpha(seg.color, 0.7)} 100%)`,
                  borderRadius: 99,
                  transition: "width 0.8s cubic-bezier(.16,1,.3,1)",
                }} />
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
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const expected  = Number(event.expectedAmount)  || 0;
  const collected = Number(event.collectedAmount) || 0;
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const allPaid = event.pendingContributionsCount === 0 && (event.totalContributionsCount ?? 0) > 0;

  return (
    <Box sx={{
      p: 1.5, borderRadius: 1.5,
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
      transition: "border-color 0.2s",
      "&:hover": { borderColor: alpha(C.collected, 0.4) },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box sx={{
          width: 28, height: 28, borderRadius: 1,
          bgcolor: alpha(C.paid, 0.12),
          border: `1px solid ${alpha(C.paid, 0.2)}`,
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 900, color: C.paid }}>
            {String(index + 1).padStart(2, "0")}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" fontWeight={700} noWrap
              sx={{ maxWidth: 160, fontSize: "0.78rem" }}>
              {event.eventName}
            </Typography>
            <Chip
              label={allPaid ? "✓ Settled" : `${event.pendingContributionsCount} pending`}
              size="small"
              sx={{
                height: 18, fontSize: "0.65rem", fontWeight: 800, ml: 1,
                bgcolor: allPaid ? alpha(C.collected, 0.14) : alpha(C.unpaid, 0.12),
                color: allPaid ? "#059669" : "#dc2626",
                border: `1px solid ${allPaid ? alpha(C.collected, 0.28) : alpha(C.unpaid, 0.28)}`,
              }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.6 }}>
            <Box sx={{
              flex: 1, mr: 1, height: 5, borderRadius: 99,
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}>
              <Box sx={{
                height: "100%", width: `${pct}%`,
                background: `linear-gradient(90deg, ${C.collected} 0%, ${alpha(C.collected, 0.7)} 100%)`,
                borderRadius: 99,
                transition: "width 0.7s cubic-bezier(.16,1,.3,1)",
              }} />
            </Box>
            <Typography variant="caption" fontWeight={700}
              sx={{ whiteSpace: "nowrap", fontSize: "0.7rem", color: C.collected }}>
              {fmtAmt(collected)}
              <Typography component="span" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                {" /"} {fmtAmt(expected)}
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

function FilterBar({ pending, onChange, onGo, loading }) {
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
      <Button
        variant="contained" onClick={onGo} disabled={loading}
        startIcon={<PlayArrowIcon />}
        sx={{
          height: 40, px: 3.5, fontWeight: 800, letterSpacing: "0.03em",
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
          transition: "all 0.25s ease",
          "&:hover": {
            background: "linear-gradient(135deg, #6d28d9 0%, #4338ca 100%)",
            boxShadow: "0 6px 20px rgba(124,58,237,0.45)",
            transform: "translateY(-1px)",
          },
          "&:active": { transform: "translateY(0)" },
        }}
      >
        Go
      </Button>
    </Box>
  );
}

// ─── Summary Stat Pill ────────────────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <Box sx={{
      px: 2, py: 1.25, borderRadius: 2,
      border: `1px solid ${alpha(color, 0.25)}`,
      bgcolor: alpha(color, 0.08),
      flex: 1, textAlign: "center",
    }}>
      <Typography sx={{ fontSize: "1.15rem", fontWeight: 900, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={600}
        sx={{ fontSize: "0.67rem", letterSpacing: "0.04em", mt: 0.25, display: "block" }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [activeTab, setActiveTab] = useState(0);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");

  const [pendingFilters, setPendingFilters] = useState({
    month: dayjs().month() + 1, year: dayjs().year(),
  });
  const [appliedFilters, setAppliedFilters] = useState({
    month: dayjs().month() + 1, year: dayjs().year(),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await GetDashboardSummaryAsync(appliedFilters);
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [appliedFilters]);

  function handleFilterChange(key, value) {
    setPendingFilters((p) => ({ ...p, [key]: value }));
  }
  function handleGo() {
    setAppliedFilters({ ...pendingFilters });
    setSearch("");
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const events       = summary?.upcomingEvents ?? [];
  const chartEvents  = events.slice(0, 6);

  const totalCollected = Number(summary?.totalContributions  ?? 0);
  const totalPending   = Number(summary?.totalPendingAmount  ?? 0);
  const pendingCount   = Number(summary?.pendingPayments     ?? 0);
  const paidCount      = events.reduce(
    (s, e) => s + ((e.totalContributionsCount ?? 0) - (e.pendingContributionsCount ?? 0)), 0
  );
  const totalExpected  = totalCollected + totalPending;
  const collectionRate = totalExpected > 0
    ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const paymentRate    = (paidCount + pendingCount) > 0
    ? Math.round((paidCount / (paidCount + pendingCount)) * 100) : 0;

  // Multi-ring chart ring definitions
  const amountRing = {
    label: "Amount",
    segments: [
      { label: "Collected", value: totalCollected, color: C.collected, displayValue: fmtAmt(totalCollected) },
      { label: "Pending",   value: totalPending,   color: C.pending,   displayValue: fmtAmt(totalPending)   },
    ],
  };
  const paymentsRing = {
    label: "Payments",
    segments: [
      { label: "Paid",    value: paidCount,    color: C.paid,   displayValue: String(paidCount)   },
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
    { label: "Date", key: "eventDate", render: (row) => dayjs(row.eventDate).format("DD MMM YYYY") },
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
        const paid  = (row.totalContributionsCount ?? 0) - (row.pendingContributionsCount ?? 0);
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
                background: "linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)",
                height: 3, borderRadius: "3px 3px 0 0",
              },
            }}
            sx={{ minHeight: 48 }}
          >
            <Tab id="tab-charts" icon={<DonutLargeIcon sx={{ fontSize: 18 }} />}
              iconPosition="start" label="Charts"
              sx={{ fontWeight: 700, minHeight: 48, textTransform: "none", fontSize: "0.88rem",
                "&.Mui-selected": { color: "primary.main" } }} />
            <Tab id="tab-dashboard" icon={<GridViewIcon sx={{ fontSize: 18 }} />}
              iconPosition="start" label="Dashboard"
              sx={{ fontWeight: 700, minHeight: 48, textTransform: "none", fontSize: "0.88rem",
                "&.Mui-selected": { color: "primary.main" } }} />
          </Tabs>
        </Box>

        {/* ── Filter Bar ──────────────────────────────────────────────────── */}
        <FilterBar
          pending={pendingFilters}
          onChange={handleFilterChange}
          onGo={handleGo}
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
                        value={summary?.monthlyEventsCount ?? 0}
                        helper="Scheduled for the selected period" />
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

                  {/* ② Multi-ring Donut Hero */}
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
                        <Stack spacing={3.5}>

                          {/* Card title */}
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
                                Multi-ring contribution analysis
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Donut + Stats side-by-side */}
                          <Grid container spacing={3} alignItems="center">

                            {/* Donut chart */}
                            <Grid size={{ xs: 12, md: 5 }}>
                              <Stack alignItems="center" spacing={2}>
                                <MultiRingDonut
                                  rings={[amountRing, paymentsRing]}
                                  centerPct={collectionRate}
                                  centerLabel="Collected"
                                  centerSub={`${fmtAmt(totalCollected)} of ${fmtAmt(totalExpected)}`}
                                />

                                {/* Ring-type legend pills below donut */}
                                <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
                                  {[
                                    { label: "① Amount Ring",   color: C.collected },
                                    { label: "② Payments Ring", color: C.paid      },
                                  ].map((item) => (
                                    <Box key={item.label} sx={{
                                      display: "flex", alignItems: "center", gap: 0.6,
                                      px: 1.25, py: 0.5, borderRadius: 99,
                                      border: `1px solid ${alpha(item.color, 0.3)}`,
                                      bgcolor: alpha(item.color, 0.08),
                                    }}>
                                      <Box sx={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        bgcolor: item.color,
                                        boxShadow: `0 0 5px ${alpha(item.color, 0.5)}`,
                                      }} />
                                      <Typography variant="caption" fontWeight={700}
                                        sx={{ color: item.color, fontSize: "0.67rem" }}>
                                        {item.label}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              </Stack>
                            </Grid>

                            {/* Stats panel */}
                            <Grid size={{ xs: 12, md: 7 }}>
                              <Stack spacing={3}>
                                {/* Quick stat pills */}
                                <Stack direction="row" spacing={1.5}>
                                  <StatPill label="Collection Rate" value={`${collectionRate}%`}  color={C.collected} />
                                  <StatPill label="Payment Rate"    value={`${paymentRate}%`}     color={C.paid}      />
                                  <StatPill label="Events"          value={summary?.monthlyEventsCount ?? 0} color="#7c3aed" />
                                </Stack>

                                {/* Ring legends */}
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
                      <Typography variant="body2">No events found for the selected period.</Typography>
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
