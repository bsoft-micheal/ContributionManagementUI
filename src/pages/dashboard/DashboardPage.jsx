import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
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
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import dayjs from "dayjs";
import { formatGridDate, parseMemberDob } from "../../utils/dateHelper";
import MetricCard from "../../components/MetricCard";
import AppSelect from "../../components/common/AppSelect";
import AppButton, { AppClearFilterButton } from "../../components/common/AppButton";
import { COMMON_STRINGS } from "../../constants";
import { getDashboardSummaryAsync } from "../../services/dashboardService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getEventsAsync } from "../../services/eventService";
import { formatWholeCurrency, formatWholeNumber } from "../../utils/roundingHelper";
import { getMembersAsync } from "../../services/memberService";
import { useAppToast } from "../../components/common/AppToast";
import AppDataTable from "../../components/common/AppDataTable";
import BirthdayCelebrationModal from "../../components/common/BirthdayCelebrationModal";
import AppOverflowTooltip from "../../components/common/AppOverflowTooltip";
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
  return formatWholeCurrency(v);
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
          transition: "all 0.22s ease",
        }}
      >
        {/* Item Title */}
        <AppOverflowTooltip
          text={display?.label || display?.title || "Details"}
          sx={{
            maxWidth: 114,
            fontSize: "0.78125rem",
            fontWeight: 600,
            color: isDark ? "#93c5fd" : "#6366f1",
            lineHeight: 1.25,
            letterSpacing: "0.01em",
            mb: 0.3,
            textAlign: "center",
          }}
        />

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
          {formatWholeCurrency(display?.value ?? display?.amount ?? 0)}
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
              Bal: {formatWholeCurrency(display.remaining)}
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
            <AppOverflowTooltip
              text={event.eventName}
              sx={{
                flex: 1,
                minWidth: 0,
                maxWidth: "calc(100% - 90px)",
                fontSize: "0.82rem",
                fontWeight: 800,
              }}
            />
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

/* ─── Modern Segmented Nav Tab (Matching Reports Model) ─── */
function SegmentedTab({ label, icon: Icon, isActive, onClick }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        px: 2,
        height: 34,
        borderRadius: "8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 0.8,
        fontSize: "0.82rem",
        fontWeight: isActive ? 700 : 600,
        color: isActive ? "#ffffff" : isDark ? "text.secondary" : "#334155",
        bgcolor: isActive
          ? "#31275d"
          : isDark ? "transparent" : "#ffffff",
        boxShadow: isActive
          ? "0 2px 8px rgba(49, 39, 93, 0.3)"
          : isDark ? "none" : "0 1px 3px rgba(0, 0, 0, 0.04)",
        border: isActive
          ? "1px solid #31275d"
          : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          color: isActive ? "#ffffff" : "text.primary",
          bgcolor: isActive
            ? "#31275d"
            : isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "#f8fafc",
        },
      }}
    >
      {Icon && <Icon sx={{ fontSize: 17 }} />}
      {label}
    </ButtonBase>
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

function FilterBar({ pending, onChange, onFilter, onClear, yearOptions = YEAR_OPTIONS, eventTypeOptions, eventOptions, loading }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.25,
        alignItems: "flex-end",
        width: "100%",
      }}
    >
      <Box sx={{ width: { xs: "100%", sm: 125, md: 135 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.YEAR_LABEL || "Year"}
          value={pending.year}
          onChange={(e) => {
            const val = e.target.value;
            onChange("year", val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
          }}
          onClear={() => onChange("year", 0)}
          options={yearOptions}
          size="small"
        />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 145, md: 155 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.MONTH_LABEL || "Month"}
          value={pending.month}
          onChange={(e) => {
            const val = e.target.value;
            onChange("month", val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
          }}
          onClear={() => onChange("month", 0)}
          options={MONTH_OPTIONS}
          size="small"
        />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 180, md: 200 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.EVENT_TYPE_LABEL || "Event Type"}
          value={pending.eventType || "ALL"}
          onChange={(e) => onChange("eventType", e.target.value || "ALL")}
          onClear={() => onChange("eventType", "ALL")}
          options={eventTypeOptions}
          size="small"
        />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 220, md: 250 } }}>
        <AppSelect
          label={COMMON_STRINGS.DASHBOARD?.EVENT_LABEL || "Event Name"}
          value={pending.eventId || "ALL"}
          onChange={(e) => onChange("eventId", e.target.value || "ALL")}
          onClear={() => onChange("eventId", "ALL")}
          options={eventOptions}
          size="small"
        />
      </Box>

      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
        <AppButton
          variant="contained"
          size="small"
          onClick={onFilter}
          startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
          sx={{
            height: 34,
            minHeight: 34,
            px: 2,
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
            bgcolor: (theme) => theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
            border: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
            "&:hover": {
              bgcolor: (theme) => theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important",
            },
          }}
        >
          {COMMON_STRINGS.DASHBOARD?.FILTER_BUTTON || "Filter"}
        </AppButton>

        <AppClearFilterButton
          filters={pending}
          onClick={onClear}
        >
          {COMMON_STRINGS.DASHBOARD?.CLEAR_FILTER_BUTTON || "Clear Filter"}
        </AppClearFilterButton>
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
  const [loading, setLoading] = useState(false);
  const [hasAppliedFilter, setHasAppliedFilter] = useState(true);
  const [filterEventsList, setFilterEventsList] = useState([]);
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

  // Automatically fetch events available in selected month and year for cascading dropdowns
  useEffect(() => {
    let cancelled = false;
    async function loadPeriodEvents() {
      try {
        const m = Number(pendingFilters.month);
        const y = Number(pendingFilters.year);
        const data = await getEventsAsync({
          month: m > 0 ? m : undefined,
          year: y > 0 ? y : undefined,
        });
        if (!cancelled && Array.isArray(data)) {
          setFilterEventsList(data.filter((e) => !e.isDeleted));
        }
      } catch {
        if (!cancelled) setFilterEventsList([]);
      }
    }
    loadPeriodEvents();
    return () => {
      cancelled = true;
    };
  }, [pendingFilters.month, pendingFilters.year]);

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

  // Initial load: Load dashboard automatically with default month & year on mount
  useEffect(() => {
    loadDashboard(pendingFilters.month, pendingFilters.year);
  }, [loadDashboard]);

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

  // Build Event Type options strictly from events available in selected month & year
  const eventTypeOptions = useMemo(() => {
    const options = [
      { label: COMMON_STRINGS.DASHBOARD?.ALL_EVENT_TYPES || "All Event Types", value: "ALL" },
    ];
    const set = new Set();
    filterEventsList.forEach((e) => {
      const name = (e.eventTypeName || e.category || "").trim();
      if (name && !set.has(name.toLowerCase())) {
        set.add(name.toLowerCase());
        options.push({ label: name, value: name });
      }
    });
    return options;
  }, [filterEventsList]);

  // Reset invalid dependent Event Type and Event Name when options change
  useEffect(() => {
    if (pendingFilters.eventType && pendingFilters.eventType !== "ALL") {
      const isValid = eventTypeOptions.some(
        (opt) => opt.value.toLowerCase() === pendingFilters.eventType.toLowerCase()
      );
      if (!isValid) {
        setPendingFilters((prev) => ({
          ...prev,
          eventType: "ALL",
          eventId: "ALL",
        }));
      }
    }
  }, [eventTypeOptions, pendingFilters.eventType]);

  // Dynamic Year Options calculated from current year window + any event years in the database
  const dynamicYearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    const yearsSet = new Set();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      yearsSet.add(i);
    }
    filterEventsList.forEach((e) => {
      const d = e.eventDate || e.createdOn || e.date;
      if (d) {
        const y = dayjs(d).year();
        if (y && !isNaN(y)) {
          yearsSet.add(y);
        }
      }
    });
    const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
    return [
      { label: "All", value: 0 },
      ...sortedYears.map((y) => ({ label: String(y), value: y })),
    ];
  }, [filterEventsList]);

  // Build Event options cascading from month, year, and pendingFilters.eventType
  const eventOptions = useMemo(() => {
    const options = [
      { label: COMMON_STRINGS.DASHBOARD?.ALL_EVENTS || "All Events", value: "ALL" },
    ];
    const selectedType = pendingFilters.eventType;
    const matchingEvents =
      !selectedType || selectedType === "ALL"
        ? filterEventsList
        : filterEventsList.filter(
          (e) => (e.eventTypeName || e.category || "").toLowerCase() === selectedType.toLowerCase()
        );

    const seen = new Set();
    matchingEvents.forEach((e) => {
      const name = e.eventName || e.name;
      if (name) {
        const val = e.eventId ? String(e.eventId) : name;
        if (!seen.has(val)) {
          seen.add(val);
          options.push({
            label: name,
            value: val,
          });
        }
      }
    });

    return options;
  }, [filterEventsList, pendingFilters.eventType]);

  // Reset invalid dependent Event Name when eventOptions change
  useEffect(() => {
    if (pendingFilters.eventId && pendingFilters.eventId !== "ALL") {
      const isValid = eventOptions.some(
        (opt) => String(opt.value) === String(pendingFilters.eventId)
      );
      if (!isValid) {
        setPendingFilters((prev) => ({
          ...prev,
          eventId: "ALL",
        }));
      }
    }
  }, [eventOptions, pendingFilters.eventId]);

  function handleFilterChange(key, value) {
    let normalizedVal = value;
    if (key === "year" || key === "month") {
      normalizedVal = value === "" || value === null || isNaN(Number(value)) ? 0 : Number(value);
    } else if (key === "eventType" || key === "eventId") {
      normalizedVal = !value ? "ALL" : value;
    }

    if (key === "eventType") {
      let autoEventId = "ALL";
      if (normalizedVal && normalizedVal !== "ALL") {
        const matchingEvents = filterEventsList.filter(
          (e) => (e.eventTypeName || e.category || "").toLowerCase() === normalizedVal.toLowerCase()
        );
        const uniqueEvents = [];
        const seen = new Set();
        matchingEvents.forEach((e) => {
          const val = e.eventId ? String(e.eventId) : e.eventName;
          if (val && !seen.has(val)) {
            seen.add(val);
            uniqueEvents.push(e);
          }
        });
        if (uniqueEvents.length === 1) {
          autoEventId = uniqueEvents[0].eventId ? String(uniqueEvents[0].eventId) : uniqueEvents[0].eventName;
        }
      }

      setPendingFilters((prev) => ({
        ...prev,
        eventType: normalizedVal,
        eventId: autoEventId,
      }));
    } else {
      setPendingFilters((prev) => ({ ...prev, [key]: normalizedVal }));
    }
  }

  function handleFilter() {
    setAppliedFilters({ ...pendingFilters });
    setHasAppliedFilter(true);
    loadDashboard(pendingFilters.month, pendingFilters.year);
  }

  function handleClear() {
    const defaultValues = {
      month: 0,
      year: 0,
      eventType: "ALL",
      eventId: "ALL",
    };
    setPendingFilters(defaultValues);
    setAppliedFilters(defaultValues);
    setHasAppliedFilter(true);
    loadDashboard(0, 0);
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
  const totalAllocated = events.reduce(
    (sum, e) => sum + (e.useAvailableBalance ? (Number(e.allocatedAmount) || 0) : 0),
    0
  );
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

  // Current Remaining / Balance Amount (Amount in Hand):
  // - Single Event View: Event cash balance = Total Collection - Total Expense
  // - All Events View: Kitty Balance = Total Collection - Total Expense - Total Allocated from Kitty
  const totalRecoveredDeficit = useMemo(() => {
    return (allEvents || []).reduce((sum, e) => {
      const isDeficit = Boolean(e.usePreviousEventBalance ?? e.UsePreviousEventBalance) &&
        (e.previousEventAdjustmentType === "DeficitRecovery" || e.PreviousEventAdjustmentType === "DeficitRecovery");
      const adj = Number(e.previousEventAdjustment ?? e.PreviousEventAdjustment ?? 0);
      return sum + (isDeficit ? adj : 0);
    }, 0);
  }, [allEvents]);

  const totalRemaining = useMemo(() => {
    const raw = isFilteredByEvent
      ? totalCollected - totalExpenses
      : totalCollected - totalExpenses - totalAllocated;

    // Amount In Hand = raw + recoveredDeficits. Do NOT clamp to zero.
    // A negative value is a real shortfall that must be visible to the user.
    // Example: raw = -2600, recovered = 100 → totalRemaining = -2500 ✓
    // Dynamically reduces as pending payments are collected (totalCollected increases).
    if (raw < 0 && totalRecoveredDeficit > 0) {
      return raw + totalRecoveredDeficit;
    }
    return raw;
  }, [isFilteredByEvent, totalCollected, totalExpenses, totalAllocated, totalRecoveredDeficit]);

  // ── All Events that were funded from Amount In Hand (Kitty Beneficiaries) ──
  const allFundedEvents = useMemo(() => {
    const map = new Map();
    (allEvents || []).forEach((e) => {
      const isFunded = Boolean(e.useAvailableBalance ?? e.UseAvailableBalance);
      const amt = Number(e.allocatedAmount ?? e.AllocatedAmount ?? 0);
      if (isFunded && amt > 0) {
        const key = String(e.eventId || e.id || e.eventName);
        if (!map.has(key)) map.set(key, e);
      }
    });
    return Array.from(map.values());
  }, [allEvents]);

  const totalKittyAllocated = useMemo(() => {
    return allFundedEvents.reduce(
      (sum, e) => sum + Number(e.allocatedAmount ?? e.AllocatedAmount ?? 0),
      0
    );
  }, [allFundedEvents]);

  // ── Source events that generated the surplus / Amount In Hand kitty ──
  const contributingEvents = useMemo(() => {
    return (allEvents || [])
      .filter((e) => {
        const isFunded = Boolean(e.useAvailableBalance ?? e.UseAvailableBalance);
        const col = Number(e.collectedAmount || 0);
        const exp = Number(e.expenseAmount || 0);
        const surplus = col - exp;
        return !isFunded && surplus > 0;
      })
      .map((e) => ({
        id: e.eventId || e.id || e.eventName,
        name: e.eventName,
        amount: Number(e.collectedAmount || 0) - Number(e.expenseAmount || 0),
      }));
  }, [allEvents]);

  // Badge for Amount In Hand Card:
  // ONLY show on the specific event that actually used Amount In Hand,
  // or on All Events view if Amount In Hand was used.
  // Hover reveals WHICH events contributed the funds!
  const usedInHandBadge = useMemo(() => {
    // 1. Single Event view: Only show if THIS event used Amount In Hand
    if (isFilteredByEvent) {
      const currentEvt = events[0];
      const isCurrentFunded = Boolean(currentEvt?.useAvailableBalance ?? currentEvt?.UseAvailableBalance);
      const currentAllocated = Number(currentEvt?.allocatedAmount ?? currentEvt?.AllocatedAmount ?? 0);

      if (!isCurrentFunded || currentAllocated <= 0) {
        return null;
      }

      return (
        <Tooltip
          arrow
          placement="top"
          enterTouchDelay={0}
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: isDark ? "#1e293b" : "#0f172a",
                color: "#ffffff",
                p: 1.2,
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.15)",
                maxWidth: 320,
              },
            },
            arrow: { sx: { color: isDark ? "#1e293b" : "#0f172a" } },
          }}
          title={
            <Box sx={{ p: 0.3 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#67e8f9", display: "block", mb: 0.4, fontSize: "0.76rem" }}>
                Funded from Earlier Events:
              </Typography>
              {contributingEvents.length > 0 ? (
                contributingEvents.map((src, idx) => (
                  <Box key={src.id || idx} sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, py: 0.2 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.72rem" }}>
                      • {src.name}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#a5f3fc", fontSize: "0.72rem" }}>
                      {formatWholeCurrency(src.amount)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem" }}>
                  Reserve Amount In Hand
                </Typography>
              )}
              <Divider sx={{ borderColor: "rgba(255,255,255,0.15)", my: 0.4 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#ffffff", fontSize: "0.72rem" }}>
                  Total Used for {currentEvt.eventName}:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#67e8f9", fontSize: "0.72rem" }}>
                  {formatWholeCurrency(currentAllocated)}
                </Typography>
              </Box>
            </Box>
          }
        >
          <Chip
            label={`Used: ${formatWholeCurrency(currentAllocated)}`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.68rem",
              fontWeight: 700,
              bgcolor: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.12)",
              color: isDark ? "#67e8f9" : "#0891b2",
              border: "1px solid",
              borderColor: isDark ? "rgba(6, 182, 212, 0.35)" : "rgba(6, 182, 212, 0.3)",
              cursor: "pointer",
            }}
          />
        </Tooltip>
      );
    }

    // 2. All Events view: show total used if any event used Amount In Hand
    if (allFundedEvents.length === 0 || totalKittyAllocated <= 0) {
      return null;
    }

    return (
      <Tooltip
        arrow
        placement="top"
        enterTouchDelay={0}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: isDark ? "#1e293b" : "#0f172a",
              color: "#ffffff",
              p: 1.2,
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.15)",
              maxWidth: 320,
            },
          },
          arrow: { sx: { color: isDark ? "#1e293b" : "#0f172a" } },
        }}
        title={
          <Box sx={{ p: 0.3 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#67e8f9", display: "block", mb: 0.3, fontSize: "0.76rem" }}>
              Amount In Hand Used:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#ffffff", display: "block", fontSize: "0.72rem", mb: 0.2 }}>
              Used for:
            </Typography>
            {allFundedEvents.map((e, idx) => (
              <Box key={e.eventId || idx} sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, py: 0.15 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.72rem" }}>
                  • {e.eventName}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#67e8f9", fontSize: "0.72rem" }}>
                  {formatWholeCurrency(Number(e.allocatedAmount || 0))}
                </Typography>
              </Box>
            ))}
            {contributingEvents.length > 0 && (
              <>
                <Divider sx={{ borderColor: "rgba(255,255,255,0.15)", my: 0.4 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#ffffff", display: "block", fontSize: "0.72rem", mb: 0.2 }}>
                  Taken from:
                </Typography>
                {contributingEvents.map((src, idx) => (
                  <Box key={src.id || idx} sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, py: 0.15 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.72rem" }}>
                      • {src.name}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#a5f3fc", fontSize: "0.72rem" }}>
                      {formatWholeCurrency(src.amount)}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </Box>
        }
      >
        <Chip
          label={`Used: ${formatWholeCurrency(totalKittyAllocated)}`}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.68rem",
            fontWeight: 700,
            bgcolor: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.12)",
            color: isDark ? "#67e8f9" : "#0891b2",
            border: "1px solid",
            borderColor: isDark ? "rgba(6, 182, 212, 0.35)" : "rgba(6, 182, 212, 0.3)",
            cursor: "pointer",
          }}
        />
      </Tooltip>
    );
  }, [isFilteredByEvent, events, allFundedEvents, totalKittyAllocated, contributingEvents, isDark]);

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
      const allocated = e.useAvailableBalance ? (Number(e.allocatedAmount) || 0) : 0;
      const remaining = e.remainingAmount !== undefined ? Number(e.remainingAmount) : (col - expense - allocated);
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
      title = isMember ? "Paid Amount" : "Expected Amount";
    }
    return {
      title,
      amount: isMember ? totalCollected : totalExpected,
      expenses: totalExpenses,
      remaining: isMember ? undefined : totalRemaining,
    };
  }, [donutView, isFilteredByType, isFilteredByEvent, appliedFilters.eventType, appliedFilters.eventId, allEvents, totalExpected, totalCollected, totalExpenses, totalRemaining, isMember]);

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
      render: (row) => (
        <AppOverflowTooltip
          text={row.eventName || "--"}
          sx={{
            maxWidth: { xs: 160, sm: 240, md: 320, lg: 420 },
            fontWeight: 600,
            fontSize: "inherit",
          }}
        />
      ),
    },
    { label: "Event Date", key: "eventDate", render: (row) => formatGridDate(row.eventDate) },
    ...(isMember ? [
      {
        label: "Paid Amount", key: "collectedAmount", align: "right",
        render: (row) => formatWholeCurrency(row.collectedAmount || 0),
      },
      {
        label: "Unpaid Amount", key: "pendingAmount", align: "right",
        render: (row) => formatWholeCurrency(row.pendingAmount || 0),
      },
      {
        label: "Expense Amount", key: "expenseAmount", align: "right",
        render: (row) => formatWholeCurrency(row.expenseAmount || 0),
      },
    ] : [
      {
        label: "Expected Amount", key: "expectedAmount", align: "right",
        render: (row) => formatWholeCurrency(row.expectedAmount ?? (Number(row.collectedAmount || 0) + Number(row.pendingAmount || 0))),
      },
      {
        label: "Collection Amount", key: "collectedAmount", align: "right",
        render: (row) => formatWholeCurrency(row.collectedAmount || 0),
      },
      {
        label: "Pending Amount", key: "pendingAmount", align: "right",
        render: (row) => formatWholeCurrency(row.pendingAmount || 0),
      },
      {
        label: "Expense Amount", key: "expenseAmount", align: "right",
        render: (row) => formatWholeCurrency(row.expenseAmount || 0),
      },
      {
        label: "Amount in Hand", key: "remainingAmount", align: "right",
        render: (row) => {
          const expected = Number(row.expectedAmount ?? (Number(row.collectedAmount || 0) + Number(row.pendingAmount || 0)));
          const expense = Number(row.expenseAmount || 0);
          const rem = row.remainingAmount !== undefined ? Number(row.remainingAmount) : (expected - expense);
          return formatWholeCurrency(rem);
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
    ]),
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => (
        <AppOverflowTooltip
          text={row.createdBy || row.CreatedBy || "--"}
          sx={{
            maxWidth: { xs: 120, sm: 160, md: 220 },
            fontSize: "inherit",
          }}
        />
      ),
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
      {/* ── Top Header Bar Card (Matching Reports / AppDataTable Model) ── */}
      <Card
        sx={{
          overflow: "hidden",
          borderRadius: "12px",
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1.5px solid rgba(124, 58, 237, 0.5)"
              : "1.5px solid rgba(74, 63, 107, 0.35)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(0, 0, 0, 0.4)"
              : "0 4px 20px rgba(74, 63, 107, 0.1)",
          mb: 3,
        }}
      >
        {/* ── Top Purple Header Bar ──── */}
        <Box
          sx={{
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(90deg, #372e54 0%, #4a3f6b 100%)"
                : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
            borderBottom: (theme) =>
              theme.palette.mode === "dark"
                ? "1px solid rgba(255, 255, 255, 0.15)"
                : "none",
            color: "#ffffff",
            px: { xs: 2.5, sm: 3 },
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 46,
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ fontSize: "0.9375rem", letterSpacing: "-0.005em", color: "#ffffff" }}
          >
            {activeTab === "calendar" ? "Event Calendar" : "Dashboard"}
          </Typography>
        </Box>

        {/* ── Filter / Navigation Panel (Matching Reports Model) ──── */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.25 },
            px: { xs: 2, sm: 3 },
            bgcolor: isDark ? "background.paper" : "#fcfcff",
          }}
        >
          <Stack spacing={2} sx={{ width: "100%" }}>
            {/* Navigation Segmented Track */}
            <Box
              sx={{
                display: "inline-flex",
                p: "4px",
                borderRadius: "8px",
                bgcolor: isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(74, 63, 107, 0.05)",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(74, 63, 107, 0.12)",
                gap: 0.6,
                width: "fit-content",
                flexWrap: "wrap",
              }}
            >
              <SegmentedTab
                label="Dashboard"
                icon={DashboardRoundedIcon}
                isActive={activeTab === "dashboard"}
                onClick={() => handleTabChange("dashboard")}
              />
              <SegmentedTab
                label="Calendar"
                icon={CalendarMonthRoundedIcon}
                isActive={activeTab === "calendar"}
                onClick={() => handleTabChange("calendar")}
              />
            </Box>

            {/* Filter Bar (Visible in Dashboard Tab) */}
            {activeTab === "dashboard" && (
              <FilterBar
                pending={pendingFilters}
                onChange={handleFilterChange}
                onFilter={handleFilter}
                onClear={handleClear}
                yearOptions={dynamicYearOptions}
                eventTypeOptions={eventTypeOptions}
                eventOptions={eventOptions}
                loading={loading}
              />
            )}
          </Stack>
        </Box>
      </Card>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      {activeTab === "calendar" ? (
        <CalendarPage isEmbedded />
      ) : !hasAppliedFilter ? (
        <Box
          sx={{
            py: 8,
            px: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 1.5,
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
          }}
        >
          <FilterListIcon sx={{ fontSize: 44, color: "text.disabled" }} />
          <Typography variant="h6" fontWeight={600} color="text.primary">
            No Data Displayed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450 }}>
            Please select your filter criteria above and click <strong>Filter</strong> to view the dashboard summary, metrics, and events.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>

          {/* ① Top Summary Metric Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: isMember ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                lg: isMember ? "repeat(4, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))",
              },
              gap: { xs: 1, sm: 1.25 },
            }}
          >
            {isMember ? (
              <>
                {/* Member Card 1: Paid Amount */}
                <MetricCard
                  label="Paid Amount"
                  value={formatWholeCurrency(totalCollected)}
                  accent="#10b981"
                  onClick={totalCollected > 0 && events.length > 0 ? () => { setQuickAccessStatus("paid"); setQuickAccessDrawerOpen(true); } : undefined}
                  actionText={totalCollected > 0 && events.length > 0 ? "My Payments →" : undefined}
                />
                {/* Member Card 2: Unpaid Amount */}
                <MetricCard
                  label="Unpaid Amount"
                  value={formatWholeCurrency(totalPending)}
                  accent="#f43f5e"
                  onClick={totalPending > 0 && events.length > 0 ? () => { setQuickAccessStatus("pending"); setQuickAccessDrawerOpen(true); } : undefined}
                  actionText={totalPending > 0 && events.length > 0 ? "View Unpaid →" : undefined}
                />
                {/* Member Card 3: Total Expenses */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_EXPENSES || "Total Expenses"}
                  value={formatWholeCurrency(totalExpenses)}
                  accent="#f59e0b"
                  onClick={totalExpenses > 0 ? () => navigate("/expense") : undefined}
                  actionText={totalExpenses > 0 ? "Expenses →" : undefined}
                />
                {/* Member Card 4: Total Events */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_EVENTS || "Total Events"}
                  value={events.length}
                  accent="#8b5cf6"
                  onClick={events.length > 0 ? () => navigate("/events") : undefined}
                  actionText={events.length > 0 ? "View Events →" : undefined}
                />
              </>
            ) : (
              <>
                {/* Other Roles: Card 1: Expected Amount */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_EXPECTED || "Expected Amount"}
                  value={formatWholeCurrency(totalExpected)}
                  accent="#6366f1"
                  onClick={totalExpected > 0 && events.length > 0 ? () => { setQuickAccessStatus("all"); setQuickAccessDrawerOpen(true); } : undefined}
                  actionText={totalExpected > 0 && events.length > 0 ? "All Members →" : undefined}
                />
                {/* Other Roles: Card 2: Collection Amount */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_COLLECTIONS || "Collection Amount"}
                  value={formatWholeCurrency(totalCollected)}
                  accent="#10b981"
                  onClick={totalCollected > 0 && events.length > 0 ? () => { setQuickAccessStatus("paid"); setQuickAccessDrawerOpen(true); } : undefined}
                  actionText={totalCollected > 0 && events.length > 0 ? "View Paid →" : undefined}
                />
                {/* Other Roles: Card 3: Pending Amount */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_PENDING || "Pending Amount"}
                  value={formatWholeCurrency(totalPending)}
                  accent="#f43f5e"
                  onClick={totalPending > 0 && events.length > 0 ? () => { setQuickAccessStatus("pending"); setQuickAccessDrawerOpen(true); } : undefined}
                  actionText={totalPending > 0 && events.length > 0 ? "View Unpaid →" : undefined}
                />
                {/* Other Roles: Card 4: Total Expenses */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_EXPENSES || "Total Expenses"}
                  value={formatWholeCurrency(totalExpenses)}
                  accent="#f59e0b"
                  onClick={totalExpenses > 0 ? () => navigate("/expense") : undefined}
                  actionText={totalExpenses > 0 ? "Expenses →" : undefined}
                />
                {/* Other Roles: Card 5: Amount in Hand */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.BALANCE_AMOUNT || COMMON_STRINGS.DASHBOARD?.REMAINING_AMOUNT || "Amount in Hand"}
                  value={formatWholeCurrency(totalRemaining)}
                  accent={totalRemaining >= 0 ? "#06b6d4" : "#f43f5e"}
                  badge={usedInHandBadge}
                  actionText={totalRemaining !== 0 ? "Amount In Hand →" : undefined}
                />
                {/* Other Roles: Card 6: Total Events */}
                <MetricCard
                  label={COMMON_STRINGS.DASHBOARD?.TOTAL_EVENTS || "Total Events"}
                  value={events.length}
                  accent="#8b5cf6"
                  onClick={events.length > 0 ? () => navigate("/events") : undefined}
                  actionText={events.length > 0 ? "View Events →" : undefined}
                />
              </>
            )}
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
                  : "No records found."}
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
      )}

      {/* Quick Access Slide-Over Drawer */}
      <Drawer
        anchor="right"
        open={quickAccessDrawerOpen && events.length > 0}
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
