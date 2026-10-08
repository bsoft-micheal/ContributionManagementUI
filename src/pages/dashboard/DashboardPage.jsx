import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  Grid,
  InputAdornment,
  Paper,
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
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import dayjs from "dayjs";
import { formatGridDate, parseMemberDob } from "../../utils/dateHelper";
import MetricCard from "../../components/MetricCard";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { COMMON_STRINGS } from "../../constants";
import { getDashboardSummaryAsync } from "../../services/dashboardService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { useAppToast } from "../../components/common/AppToast";
import AppDataTable from "../../components/common/AppDataTable";
import BirthdayCelebrationModal from "../../components/common/BirthdayCelebrationModal";
import MemberPaymentQuickAccess from "../../components/dashboard/MemberPaymentQuickAccess";
import FinancialBarChart from "../../components/dashboard/FinancialBarChart";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import CalendarPage from "../events/CalendarPage";

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
  return `₹${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  onHoverItem = () => { },
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

      {/* Center Details Hub (Amount-only display) */}
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
              fontSize: "0.78125rem",
              fontWeight: 600,
              color: isDark ? "#93c5fd" : "#6366f1",
              lineHeight: 1.25,
              letterSpacing: "0.01em",
              mb: 0.3,
            }}
          >
            {display?.label || display?.title || "Details"}
          </Typography>
        </Tooltip>

        {/* Amount */}
        <Typography
          sx={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: isDark ? "#ffffff" : "#0f172a",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          ₹{Number(display?.value ?? display?.amount ?? 0).toLocaleString()}
        </Typography>

        {/* Current Remaining Amount */}
        {display?.remaining !== undefined && (
          <Box
            sx={{
              mt: 0.5,
              px: 0.8,
              py: 0.2,
              borderRadius: 1,
              bgcolor: display.remaining >= 0 ? alpha("#10b981", 0.12) : alpha("#ef4444", 0.12),
              border: `1px solid ${display.remaining >= 0 ? alpha("#10b981", 0.3) : alpha("#ef4444", 0.3)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.70rem",
                fontWeight: 800,
                color: display.remaining >= 0 ? "#10b981" : "#ef4444",
                lineHeight: 1,
              }}
            >
              Bal: ₹{Math.abs(display.remaining).toLocaleString()}
            </Typography>
          </Box>
        )}
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
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.1875rem", letterSpacing: "-0.015em", lineHeight: 1.35, flex: 1 }}>
          {title}{" "}
          <Typography component="span" color="primary.main" fontWeight={700} sx={{ fontSize: "inherit" }}>
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

function FilterBar({ pending, onChange, onFilter, onClear, eventTypeOptions, eventOptions, loading }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        alignItems: "flex-end",
      }}
    >
      <Box sx={{ width: { xs: "100%", sm: 120 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.YEAR_LABEL || "Year"}
          value={pending.year}
          onChange={(e) => onChange("year", Number(e.target.value))}
          options={YEAR_OPTIONS}
          size="small"
        />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 150 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.MONTH_LABEL || "Month"}
          value={pending.month}
          onChange={(e) => onChange("month", Number(e.target.value))}
          options={MONTH_OPTIONS}
          size="small"
        />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 180 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.EVENT_TYPE_LABEL || "Event Type"}
          value={pending.eventType || "ALL"}
          onChange={(e) => onChange("eventType", e.target.value)}
          options={eventTypeOptions}
          size="small"
        />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 200 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.EVENT_LABEL || "Event"}
          value={pending.eventId || "ALL"}
          onChange={(e) => onChange("eventId", e.target.value)}
          options={eventOptions}
          size="small"
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <AppButton
          variant="contained"
          size="small"
          onClick={onFilter}
          disabled={loading}
          startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
          sx={{
            height: 36,
            minHeight: 36,
            px: 2.5,
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.84375rem",
            letterSpacing: "0.01em",
            bgcolor: "#4a3f6b !important",
            "&:hover": {
              bgcolor: "#3b325c !important",
            },
          }}
        >
          {COMMON_STRINGS.DASHBOARD?.FILTER_BUTTON || "Filter"}
        </AppButton>

        <AppButton
          variant="outlined"
          size="small"
          onClick={onClear}
          disabled={loading}
          startIcon={<RestartAltIcon sx={{ fontSize: 18 }} />}
          sx={{
            height: 36,
            minHeight: 36,
            px: 2,
            borderRadius: "8px",
            color: "#ef4444",
            border: `1.5px solid ${isDark ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.35)"}`,
            fontWeight: 600,
            fontSize: "0.84375rem",
            letterSpacing: "0.01em",
            "&:hover": {
              border: "1.5px solid #ef4444",
              bgcolor: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.05)",
              color: "#dc2626",
            },
          }}
        >
          {COMMON_STRINGS.DASHBOARD?.CLEAR_FILTER_BUTTON || "Clear Filter"}
        </AppButton>
      </Box>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toast = useAppToast();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMember = authState?.role?.toLowerCase() === "member";

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "calendar" ? "calendar" : "dashboard"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "calendar" || tab === "dashboard") {
      setActiveTab(tab);
    } else {
      setActiveTab("dashboard");
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === "calendar") {
      setSearchParams({ tab: "calendar" });
    } else {
      setSearchParams({});
    }
  };

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState([]);
  const [quickAccessDrawerOpen, setQuickAccessDrawerOpen] = useState(false);
  const [quickAccessStatus, setQuickAccessStatus] = useState("all");

  // Birthday Celebration Modal States (Only opens once upon login per session)
  const [todayCelebrants, setTodayCelebrants] = useState([]);
  const [bdayModalOpen, setBdayModalOpen] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(() => {
    return sessionStorage.getItem("birthdayModalShownSession") === "true";
  });

  const [pendingFilters, setPendingFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    eventType: "ALL",
    eventId: "ALL",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    eventType: "ALL",
    eventId: "ALL",
  });

  // Fetch event types for filter dropdown
  useEffect(() => {
    async function fetchEventTypes() {
      try {
        const types = await getEventTypesAsync();
        if (Array.isArray(types)) {
          setEventTypes(types);
        }
      } catch {
        // Event types fetch error ignored
      }
    }
    fetchEventTypes();
  }, []);

  const loadDashboard = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const data = await getDashboardSummaryAsync({ month, year });
      setSummary(data);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadDashboard(appliedFilters.month, appliedFilters.year);
  }, []);

  // Detect today's birthdays on login & trigger celebratory pop up message only once per login session
  useEffect(() => {
    // If already shown in this login session, do not trigger again
    if (sessionStorage.getItem("birthdayModalShownSession") === "true") {
      return;
    }

    let cancelled = false;
    async function checkTodayBirthdays() {
      try {
        if (sessionStorage.getItem("birthdayModalShownSession") === "true") return;

        const membersData = await getMembersAsync().catch(() => []);
        if (cancelled || !Array.isArray(membersData)) return;

        const today = dayjs();
        const todayMonth = today.month();
        const todayDate = today.date();

        const celebrants = [];
        const seen = new Set();

        for (const m of membersData) {
          const dob = parseMemberDob(m.dateOfBirth);
          if (dob && dob.month() === todayMonth && dob.date() === todayDate) {
            const name = m.name || m.memberName || "Unknown";
            const key = `${name.toLowerCase()}|${dob.format("MM-DD")}`;
            if (!seen.has(key)) {
              seen.add(key);
              celebrants.push({
                memberId: m.memberId,
                name,
                type: "Birthday",
                dateOfBirth: m.dateOfBirth,
              });
            }
          }
        }

        if (celebrants.length > 0 && sessionStorage.getItem("birthdayModalShownSession") !== "true") {
          sessionStorage.setItem("birthdayModalShownSession", "true");
          setTodayCelebrants(celebrants);
          setBdayModalOpen(true);
          setHasCelebrated(true);
        }
      } catch {
        // Birthday check error ignored
      }
    }

    checkTodayBirthdays();
    return () => {
      cancelled = true;
    };
  }, [hasCelebrated, summary]);

  // Build Event Type options combining API categories and any upcoming events
  const eventTypeOptions = useMemo(() => {
    const options = [
      { label: COMMON_STRINGS.DASHBOARD?.ALL_EVENT_TYPES || "All Event Types", value: "ALL" },
    ];
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

  // Build Event options cascading from pendingFilters.eventType
  const eventOptions = useMemo(() => {
    const options = [
      { label: COMMON_STRINGS.DASHBOARD?.ALL_EVENTS || "All Events", value: "ALL" },
    ];
    const allEventsList = summary?.upcomingEvents ?? [];
    const selectedType = pendingFilters.eventType;

    const matchingEvents =
      !selectedType || selectedType === "ALL"
        ? allEventsList
        : allEventsList.filter(
          (e) => (e.eventTypeName || "").toLowerCase() === selectedType.toLowerCase()
        );

    matchingEvents.forEach((e) => {
      if (e.eventName) {
        options.push({
          label: e.eventName,
          value: e.eventId ? String(e.eventId) : e.eventName,
        });
      }
    });

    return options;
  }, [summary?.upcomingEvents, pendingFilters.eventType]);

  function handleFilterChange(key, value) {
    if (key === "eventType") {
      setPendingFilters((prev) => ({
        ...prev,
        eventType: value,
        eventId: "ALL", // Automatically reset selected event when event type changes
      }));
    } else {
      setPendingFilters((prev) => ({ ...prev, [key]: value }));
    }
  }

  function handleFilter() {
    setAppliedFilters({ ...pendingFilters });
    loadDashboard(pendingFilters.month, pendingFilters.year);
  }

  function handleClear() {
    const defaultValues = {
      month: dayjs().month() + 1,
      year: dayjs().year(),
      eventType: "ALL",
      eventId: "ALL",
    };
    setPendingFilters(defaultValues);
    setAppliedFilters(defaultValues);
    loadDashboard(defaultValues.month, defaultValues.year);
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const isFilteredByType = Boolean(appliedFilters.eventType && appliedFilters.eventType !== "ALL");
  const isFilteredByEvent = Boolean(appliedFilters.eventId && appliedFilters.eventId !== "ALL");
  const allEvents = summary?.upcomingEvents ?? [];
  const events = useMemo(() => {
    let list = allEvents;
    if (isFilteredByType) {
      list = list.filter(
        (e) => (e.eventTypeName || "").toLowerCase() === appliedFilters.eventType.toLowerCase()
      );
    }
    if (isFilteredByEvent) {
      list = list.filter(
        (e) =>
          String(e.eventId) === String(appliedFilters.eventId) ||
          e.eventName === appliedFilters.eventId
      );
    }
    return list;
  }, [allEvents, isFilteredByType, isFilteredByEvent, appliedFilters.eventType, appliedFilters.eventId]);

  const chartEvents = events.slice(0, 6);

  const totalCollected = events.reduce((sum, e) => sum + (Number(e.collectedAmount) || 0), 0);
  const totalPending = events.reduce((sum, e) => sum + (Number(e.pendingAmount) || 0), 0);
  const totalExpected = events.reduce((sum, e) => {
    const exp = Number(e.expectedAmount);
    return sum + (!isNaN(exp) && exp > 0 ? exp : (Number(e.collectedAmount || 0) + Number(e.pendingAmount || 0)));
  }, 0) || (totalCollected + totalPending);

  const totalExpenses = useMemo(() => {
    const eventExpensesSum = events.reduce((sum, e) => sum + (Number(e.expenseAmount) || 0), 0);
    if (isFilteredByEvent || isFilteredByType) {
      return eventExpensesSum;
    }
    return eventExpensesSum > 0 ? eventExpensesSum : Number(summary?.totalExpenses ?? 0);
  }, [events, isFilteredByEvent, isFilteredByType, summary?.totalExpenses]);

  // Current Remaining / Balance Amount:
  // Formula: Total Collection − Total Expense (for both Admin and Member's assigned events)
  const totalRemaining = useMemo(() => {
    return totalCollected - totalExpenses;
  }, [totalCollected, totalExpenses]);

  const pendingCount = events.reduce((sum, e) => sum + (Number(e.pendingContributionsCount) || 0), 0);
  const totalContributionsCount = events.reduce((sum, e) => sum + (Number(e.totalContributionsCount) || 0), 0);
  const paidCount = Math.max(0, totalContributionsCount - pendingCount);
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
      const exp = Number(e.expectedAmount) || (Number(e.collectedAmount || 0) + Number(e.pendingAmount || 0));
      const col = Number(e.collectedAmount) || 0;
      const expense = Number(e.expenseAmount) || 0;
      const remaining = e.remainingAmount !== undefined ? Number(e.remainingAmount) : (col - expense);
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
        expected: exp,
        collected: col,
        expense: expense,
        remaining: remaining,
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
        label: isMember ? "Paid" : "Collected",
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
  }, [totalCollected, totalPending, totalExpected, isMember]);

  const defaultSummary = useMemo(() => {
    let title = "All Events";
    if (donutView === "events") {
      if (isFilteredByEvent) {
        const found = allEvents.find(
          (e) =>
            String(e.eventId) === String(appliedFilters.eventId) ||
            e.eventName === appliedFilters.eventId
        );
        title = found?.eventName || "Event Details";
      } else if (isFilteredByType) {
        title = appliedFilters.eventType;
      }
    } else {
      title = "Total Expected";
    }
    return {
      title,
      amount: totalExpected,
      expenses: totalExpenses,
      remaining: totalRemaining,
    };
  }, [donutView, isFilteredByType, isFilteredByEvent, appliedFilters.eventType, appliedFilters.eventId, allEvents, totalExpected, totalExpenses, totalRemaining]);

  // Multi-ring chart ring definitions
  const amountRing = {
    label: "Amount",
    segments: [
      { label: isMember ? "Paid" : "Collected", value: totalCollected, color: C.collected, displayValue: fmtAmt(totalCollected) },
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



  // Table columns (Dashboard tab)
  const columns = [
    {
      label: "Event Type", key: "eventTypeName",
      render: (row) => (
        <Chip label={row.eventTypeName} size="small" sx={{
          bgcolor: isDark ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.primary.main, 0.10),
          color: "primary.main", fontWeight: 700,
        }} />
      ),
    },
    {
      label: "Event Name", key: "eventName",
      render: (row) => row.eventName || "--",
    },
    { label: "Event Date", key: "eventDate", render: (row) => formatGridDate(row.eventDate) },
    {
      label: "Expected Amount", key: "expectedAmount", align: "right",
      render: (row) => `₹${Number(row.expectedAmount ?? (Number(row.collectedAmount || 0) + Number(row.pendingAmount || 0))).toLocaleString()}`,
    },
    {
      label: isMember ? "Paid Amount" : "Collected Amount", key: "collectedAmount", align: "right",
      render: (row) => `₹${Number(row.collectedAmount || 0).toLocaleString()}`,
    },
    {
      label: "Pending Amount", key: "pendingAmount", align: "right",
      render: (row) => `₹${Number(row.pendingAmount || 0).toLocaleString()}`,
    },
    {
      label: "Expense Amount", key: "expenseAmount", align: "right",
      render: (row) => `₹${Number(row.expenseAmount || 0).toLocaleString()}`,
    },
    {
      label: "Balance Amount", key: "remainingAmount", align: "right",
      render: (row) => {
        const expected = Number(row.expectedAmount ?? (Number(row.collectedAmount || 0) + Number(row.pendingAmount || 0)));
        const expense = Number(row.expenseAmount || 0);
        const rem = row.remainingAmount !== undefined ? Number(row.remainingAmount) : (expected - expense);
        return `₹${rem.toLocaleString(undefined, { minimumFractionDigits: (rem % 1 === 0 ? 0 : 2), maximumFractionDigits: 2 })}`;
      },
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
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      {/* ── Top Dashboard / Calendar Navigation Tabs ────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          borderBottom: (theme) =>
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.12)"
              : "1px solid rgba(74, 63, 107, 0.15)",
          mb: 0.5,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => handleTabChange(val)}
          sx={{
            minHeight: 46,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)"
                  : "linear-gradient(90deg, #4a3f6b 0%, #6f5bd3 100%)",
            },
            "& .MuiTab-root": {
              minHeight: 46,
              textTransform: "none",
              fontSize: "0.95rem",
              fontWeight: 600,
              px: { xs: 2.5, sm: 3.5 },
              py: 1,
              borderRadius: "8px 8px 0 0",
              color: "text.secondary",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                fontWeight: 700,
              },
              "&:hover": {
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(74, 63, 107, 0.04)",
              },
            },
          }}
        >
          <Tab
            value="dashboard"
            icon={<DashboardRoundedIcon sx={{ fontSize: "1.15rem" }} />}
            iconPosition="start"
            label="Dashboard"
          />
          <Tab
            value="calendar"
            icon={<CalendarMonthRoundedIcon sx={{ fontSize: "1.15rem" }} />}
            iconPosition="start"
            label="Calendar"
          />
        </Tabs>
      </Box>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      {activeTab === "calendar" ? (
        <CalendarPage isEmbedded />
      ) : (
        <>
          {/* ── Top Filter Bar ────────────────────────────────────────────────── */}
          <Card
        sx={{
          p: { xs: 2, sm: 2.25 },
          px: { xs: 2, sm: 3 },
          borderRadius: 3,
          overflow: "visible",
          bgcolor: isDark ? "background.paper" : "#ffffff",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: isDark
            ? "0 4px 20px rgba(0,0,0,0.25)"
            : "0 2px 12px rgba(0,0,0,0.03)",
        }}
      >
        <FilterBar
          pending={pendingFilters}
          onChange={handleFilterChange}
          onFilter={handleFilter}
          onClear={handleClear}
          eventTypeOptions={eventTypeOptions}
          eventOptions={eventOptions}
          loading={loading}
        />
      </Card>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <Stack spacing={3}>

        {/* ① Top Summary Metric Cards (6 Cards Grid: Expected, Collections, Pending, Expenses, Remaining, Events) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(6, minmax(0, 1fr))",
            },
            gap: { xs: 1, sm: 1.25 },
          }}
        >
          <MetricCard
            label={COMMON_STRINGS.DASHBOARD?.TOTAL_EXPECTED || "Total Expected"}
            value={`₹${totalExpected.toLocaleString()}`}
            accent="#6366f1"
            onClick={() => { setQuickAccessStatus("all"); setQuickAccessDrawerOpen(true); }}
            actionText="All Members →"
          />
          <MetricCard
            label={COMMON_STRINGS.DASHBOARD?.TOTAL_COLLECTIONS || "Total Collections"}
            value={`₹${totalCollected.toLocaleString()}`}
            accent="#10b981"
            onClick={() => { setQuickAccessStatus("paid"); setQuickAccessDrawerOpen(true); }}
            actionText={isMember ? "My Payments →" : "View Paid →"}
          />
          <MetricCard
            label={COMMON_STRINGS.DASHBOARD?.TOTAL_PENDING || "Total Pending"}
            value={`₹${totalPending.toLocaleString()}`}
            accent="#f43f5e"
            onClick={() => { setQuickAccessStatus("pending"); setQuickAccessDrawerOpen(true); }}
            actionText="View Unpaid →"
          />
          <MetricCard
            label={COMMON_STRINGS.DASHBOARD?.TOTAL_EXPENSES || "Total Expenses"}
            value={`₹${Number(totalExpenses || 0).toLocaleString(undefined, { maximumFractionDigits: (totalExpenses % 1 === 0 ? 0 : 2) })}`}
            accent="#f59e0b"
            onClick={() => navigate("/expense")}
            actionText="Expenses →"
          />
          <MetricCard
            label={COMMON_STRINGS.DASHBOARD?.BALANCE_AMOUNT || COMMON_STRINGS.DASHBOARD?.REMAINING_AMOUNT || "Balance Amount"}
            value={`₹${Number(totalRemaining || 0).toLocaleString(undefined, { minimumFractionDigits: (totalRemaining % 1 === 0 ? 0 : 2), maximumFractionDigits: 2 })}`}
            accent={totalRemaining >= 0 ? "#06b6d4" : "#f43f5e"}
            actionText="Net Balance →"
          />
          <MetricCard
            label={COMMON_STRINGS.DASHBOARD?.TOTAL_EVENTS || "Total Events"}
            value={events.length}
            accent="#8b5cf6"
            onClick={() => navigate("/events")}
            actionText="View Events →"
          />
        </Box>

        {/* ② Financial Overview Column / Bar Chart */}
        {events.length > 0 ? (
          <FinancialBarChart
            totalExpected={totalExpected}
            totalCollected={totalCollected}
            totalPending={totalPending}
            totalExpenses={totalExpenses}
            totalRemaining={totalRemaining}
            events={events}
            isMember={isMember}
          />
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
        <CollapsibleSection
          title="Events for Selected Period"
          count={events.length}
          defaultOpen
        >
          <AppDataTable columns={columns} data={events} loading={false} />
        </CollapsibleSection>
      </Stack>
        </>
      )}

      {/* Quick Access Slide-Over Drawer */}
      <Drawer
        anchor="right"
        open={quickAccessDrawerOpen}
        onClose={() => setQuickAccessDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 640, md: 780, lg: 900 },
            boxShadow: isDark ? "-8px 0 32px rgba(0,0,0,0.5)" : "-8px 0 32px rgba(0,0,0,0.12)",
            bgcolor: isDark ? "background.default" : "#ffffff",
          },
        }}
      >
        <MemberPaymentQuickAccess
          events={events}
          allEvents={allEvents}
          eventTypes={eventTypes}
          appliedFilters={appliedFilters}
          isMember={isMember}
          initialStatus={quickAccessStatus}
          isDrawer
          onClose={() => setQuickAccessDrawerOpen(false)}
        />
      </Drawer>

      {/* Big Celebratory Birthday Pop-up Modal with Paper Blast Confetti (Static) */}
      <BirthdayCelebrationModal
        open={bdayModalOpen}
        onClose={() => {
          sessionStorage.setItem("birthdayModalShownSession", "true");
          setBdayModalOpen(false);
        }}
        celebrants={todayCelebrants}
        autoCloseSeconds={0}
      />
    </div>
  );
}
