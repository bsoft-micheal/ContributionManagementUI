import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, TextField, InputAdornment, Avatar, LinearProgress,
  Tooltip, ButtonBase, Divider,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import apiClient from "../../services/apiClient";
import { exportSheets } from "../../utils/exportToExcel";
import AppDataTable from "../../components/common/AppDataTable";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppPieChart from "../../components/common/AppPieChart";
import ExecutiveFinancialBarChart from "../../components/dashboard/ExecutiveFinancialBarChart";
import FinancialBarChart from "../../components/dashboard/FinancialBarChart";
import MetricCard from "../../components/MetricCard";
import { useAppToast } from "../../components/common/AppToast";
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  FilterList as FilterListIcon,
  TrendingUp,
  AccountBalanceWallet,
  HourglassEmpty,
  CheckCircle,
  People,
  Event as EventIcon,
  Warning,
  Close as CloseIcon,
  ReceiptLong as ReceiptLongIcon,
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  RestartAlt as RestartAltIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { hasActionPermission } from "../../utils/rightsHelper";
import { useNavigationLoading } from "../../contexts/NavigationLoadingContext";
import { getEventsAsync } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getPaymentTransactionsAsync } from "../../services/paymentService";

/* ─── Horizontal Bar Chart ─── */
function SimpleBarChart({ items, valueKey = "value", labelKey = "label" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);
  return (
    <Stack spacing={1.5} sx={{ py: 1 }}>
      {items.map((item, idx) => {
        const value = Number(item[valueKey]) || 0;
        const pct = Math.max(4, Math.min(100, (value / maxValue) * 100));
        return (
          <Box
            key={item[labelKey] + idx}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "110px 1fr 90px", sm: "160px 1fr 100px" },
              alignItems: "center",
              gap: 2,
              p: 0.75,
              borderRadius: "8px",
              transition: "background 0.2s",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(124,58,237,0.04)",
                "& .bar-fill": { filter: "brightness(1.15)" },
              },
            }}
          >
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem", color: "text.primary" }} noWrap>
              {item[labelKey]}
            </Typography>
            <Box sx={{ height: 10, borderRadius: 999, bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(124,58,237,0.08)", overflow: "hidden" }}>
              <Box
                className="bar-fill"
                sx={{
                  height: "100%",
                  width: `${pct}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #7c3aed 0%, #3b82f6 100%)",
                  transition: "width 0.6s cubic-bezier(0.4,0,0.2,1), filter 0.2s",
                }}
              />
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: "right", fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>
              {"\u20B9"}{value.toLocaleString()}
            </Typography>
          </Box>
        );
      })}
      {items.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">No chart data available for this metric.</Typography>
        </Box>
      )}
    </Stack>
  );
}

/* ─── Premium KPI Stat Card ─── */
function StatCard({ label, value, icon: Icon, color = "primary", subLabel, helper }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colorMap = {
    primary: {
      accent: "#6366f1",
      gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(129, 140, 248, 0.04) 100%)",
      glow: "rgba(99, 102, 241, 0.25)",
      badgeBg: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
      text: isDark ? "#c4b5fd" : "#6366f1",
    },
    info: {
      accent: "#3b82f6",
      gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(14, 165, 233, 0.04) 100%)",
      glow: "rgba(59, 130, 246, 0.25)",
      badgeBg: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
      text: isDark ? "#93c5fd" : "#1d4ed8",
    },
    success: {
      accent: "#10b981",
      gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(52, 211, 153, 0.04) 100%)",
      glow: "rgba(16, 185, 129, 0.25)",
      badgeBg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
      text: isDark ? "#6ee7b7" : "#10b981",
    },
    error: {
      accent: "#f43f5e",
      gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(251, 113, 133, 0.04) 100%)",
      glow: "rgba(244, 63, 94, 0.25)",
      badgeBg: isDark ? "rgba(244, 63, 94, 0.2)" : "rgba(244, 63, 94, 0.1)",
      text: isDark ? "#fca5a5" : "#f43f5e",
    },
    warning: {
      accent: "#f59e0b",
      gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(251, 191, 36, 0.04) 100%)",
      glow: "rgba(245, 158, 11, 0.25)",
      badgeBg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.1)",
      text: isDark ? "#fcd34d" : "#f59e0b",
    },
    cyan: {
      accent: "#06b6d4",
      gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(56, 189, 248, 0.04) 100%)",
      glow: "rgba(6, 182, 212, 0.25)",
      badgeBg: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.1)",
      text: isDark ? "#67e8f9" : "#06b6d4",
    },
    neutral: {
      accent: "#64748b",
      gradient: "linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, rgba(148, 163, 184, 0.04) 100%)",
      glow: "rgba(100, 116, 139, 0.25)",
      badgeBg: isDark ? "rgba(100, 116, 139, 0.2)" : "rgba(100, 116, 139, 0.1)",
      text: isDark ? "#cbd5e1" : "#475569",
    },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: "14px",
        bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff",
        background: isDark ? undefined : c.gradient,
        border: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
        boxShadow: isDark
          ? "0 4px 20px -2px rgba(0,0,0,0.4)"
          : "0 4px 16px -2px rgba(0,0,0,0.04)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: isDark
            ? `0 12px 28px -4px rgba(0,0,0,0.6), 0 0 0 1px ${c.glow}`
            : `0 12px 24px -4px ${c.glow}, 0 0 0 1px ${c.accent}`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${c.accent} 0%, transparent 100%)`,
        },
      }}
    >
      <CardContent
        sx={{
          p: "14px 14px !important",
          "&:last-child": { pb: "14px !important" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 0.75,
              mb: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                fontSize: { xs: "0.62rem", sm: "0.66rem", xl: "0.68rem" },
                lineHeight: 1.25,
                minHeight: { xs: "auto", sm: "2.5em" },
                display: "flex",
                alignItems: "center",
                flex: 1,
              }}
            >
              {label}
            </Typography>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "7px",
                bgcolor: c.badgeBg,
                color: c.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 2px 6px ${c.glow}`,
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
            </Box>
          </Box>

          <Typography
            variant="h4"
            title={typeof value === "string" ? value : undefined}
            sx={{
              fontWeight: 700,
              color: isDark ? "#ffffff" : "#0f172a",
              fontSize: { xs: "1.25rem", sm: "1.375rem" },
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {value}
          </Typography>
        </Box>

        {(subLabel || helper) && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "text.secondary",
              fontSize: "0.68rem",
              lineHeight: 1.25,
              mt: 0.6,
              fontWeight: 500,
              minHeight: { xs: "auto", sm: "2.4em" },
            }}
          >
            {subLabel || helper}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Modern Segmented Nav Tab ─── */
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

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function ReportsPage({ mode = "event" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { authState } = useAuth();
  const isMember = String(authState?.role || authState?.user?.role || "").toLowerCase() === "member";
  const currentUserId = authState?.userId || authState?.user?.userId || authState?.id;
  const currentUserName = String(authState?.fullName || authState?.user?.fullName || authState?.name || "").trim().toLowerCase();

  const isCurrentMember = useCallback((m) => {
    const mId = m.memberId || m.MemberId || m.userId || m.UserId;
    if (currentUserId && String(mId) === String(currentUserId)) return true;
    const mName = String(m.memberName || m.MemberName || "").trim().toLowerCase();
    if (currentUserName && (mName === currentUserName || mName.includes(currentUserName) || currentUserName.includes(mName))) return true;
    return false;
  }, [currentUserId, currentUserName]);

  // If Member role navigates to event collection report, auto redirect to their contribution report
  useEffect(() => {
    if (isMember && (mode === "event" || !mode)) {
      navigate("/reports/member-velocity", { replace: true });
    }
  }, [isMember, mode, navigate]);

  const canExport = hasActionPermission("Export Reports", 60, authState?.role).canView !== false;
  const toast = useAppToast();
  const { isLoading: globalLoading } = useNavigationLoading();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filters, setFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    eventType: "ALL",
    event: "ALL",
  });
  const [eventsList, setEventsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [paymentTransactions, setPaymentTransactions] = useState([]);
  const [chartType, setChartType] = useState("pie");
  const [metric, setMetric] = useState("paid");

  /* Modal state for member event breakdown */
  const [selectedMember, setSelectedMember] = useState(null);
  const [dialogFilter, setDialogFilter] = useState("all");
  const [dialogSearch, setDialogSearch] = useState("");
  const [memberContributions, setMemberContributions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedReportMemberId, setSelectedReportMemberId] = useState(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  const openBreakdownModal = async (member, filter = "all") => {
    setSelectedMember(member);
    setDialogFilter(filter);
    setDialogSearch("");

    // If member already has events from backend reports summary:
    if (member.events && member.events.length > 0) {
      setMemberContributions(member.events);
      return;
    }

    // Fallback: Fetch all contributions and filter by member
    setModalLoading(true);
    try {
      const { data: res } = await apiClient.get("/contributions/getAllContributionAsync");
      const allContribs = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const memberEventsList = allContribs
        .filter((c) => {
          const cMemberId = c.memberId || c.userId || c.MemberId || c.UserId;
          const cMemberName = c.memberName || c.MemberName;
          return cMemberId === member.memberId || (cMemberName && cMemberName.trim().toLowerCase() === member.memberName?.trim().toLowerCase());
        })
        .map((c) => {
          const isPaid = c.paymentStatus === 1 || c.paymentStatus === "Paid" || Boolean(c.paymentDate);
          return {
            contributionId: c.contributionId || c.ContributionId,
            eventId: c.eventId || c.EventId,
            eventName: c.eventName || c.EventName || "Event",
            categoryName: c.categoryName || c.CategoryName || "General",
            eventDate: c.paymentDate || c.createdAt || c.createdOn || c.CreatedOn,
            expectedAmount: c.amount || c.Amount || 0,
            paidAmount: isPaid ? (c.amount || c.Amount || 0) : 0,
            pendingAmount: isPaid ? 0 : (c.amount || c.Amount || 0),
            paymentStatus: isPaid ? "Paid" : "Pending",
            paymentDate: c.paymentDate || c.PaymentDate,
            paymentMode: c.paymentMode === 1 ? "Cash" : (c.paymentMode === 2 ? "UPI" : (c.paymentMode === 3 ? "Split" : (c.paymentMode || "—"))),
          };
        });
      setMemberContributions(memberEventsList);
    } catch {
      const pDues = (report?.pendingDues || [])
        .filter((d) => (d.memberId || d.MemberId) === member.memberId)
        .map((d) => ({
          contributionId: d.contributionId || d.ContributionId,
          eventName: d.eventName || d.EventName,
          categoryName: "Contribution",
          eventDate: d.eventDate || d.EventDate,
          expectedAmount: d.amount || d.Amount,
          paidAmount: 0,
          pendingAmount: d.amount || d.Amount,
          paymentStatus: "Pending",
          paymentMode: null,
          paymentDate: null,
        }));
      setMemberContributions(pDues);
    } finally {
      setModalLoading(false);
    }
  };

  const memberEvents = useMemo(() => {
    let list = memberContributions || [];
    if (dialogFilter === "paid") {
      list = list.filter((e) => (e.paymentStatus || "").toLowerCase() === "paid");
    } else if (dialogFilter === "pending") {
      list = list.filter((e) => (e.paymentStatus || "").toLowerCase() !== "paid");
    }
    if (dialogSearch.trim()) {
      const q = dialogSearch.toLowerCase();
      list = list.filter((e) =>
        (e.eventName || "").toLowerCase().includes(q) ||
        (e.categoryName || "").toLowerCase().includes(q) ||
        (e.paymentMode || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [memberContributions, dialogFilter, dialogSearch]);

  const handleExportMemberEvents = () => {
    if (!selectedMember) return;
    try {
      const sheetData = memberEvents.map((e) => ({
        "Member": selectedMember.memberName,
        "Event Name": e.eventName,
        "Category": e.categoryName || "General",
        "Event Date": formatGridDate(e.eventDate || e.EventDate),
        "Expected Amount": e.expectedAmount ?? e.amount,
        "Paid Amount": e.paidAmount ?? 0,
        "Pending Amount": e.pendingAmount ?? 0,
        "Status": e.paymentStatus,
        "Payment Mode": e.paymentMode || "—",
        "Payment Date": e.paymentDate ? formatGridDate(e.paymentDate) : "—",
      }));
      exportSheets(`${selectedMember.memberName.replace(/\s+/g, "_")}_events.xlsx`, [
        { name: "Events", data: sheetData },
      ]);
      toast.success("Member events exported successfully!");
    } catch {
      toast.error("Failed to export events.");
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = { month: filters.month === 0 ? null : filters.month, year: filters.year === 0 ? null : filters.year };
        const { data: res } = await apiClient.get("/reports/getSummaryReportAsync", { params });
        setReport(res?.data !== undefined ? res.data : res);
      } catch {
        toast.error("Failed to load reports. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  /* Options */
  const monthOptions = [
    { label: "All Months", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ label: dayjs().month(i).format("MMMM"), value: i + 1 })),
  ];
  const yr = dayjs().year();
  const yearOptions = [
    { label: "All Years", value: 0 },
    ...Array.from({ length: 11 }, (_, i) => { const y = yr - 5 + i; return { label: String(y), value: y }; }),
  ];

  useEffect(() => {
    async function fetchLookups() {
      try {
        const [eventsRes, typesRes, paymentsRes] = await Promise.all([
          getEventsAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
          getPaymentTransactionsAsync().catch(() => []),
        ]);
        if (Array.isArray(eventsRes)) setEventsList(eventsRes);
        if (Array.isArray(typesRes)) setEventTypesList(typesRes);
        if (Array.isArray(paymentsRes)) setPaymentTransactions(paymentsRes);
      } catch {
        // silent fallback
      }
    }
    fetchLookups();

    const handleUpdate = () => {
      fetchLookups();
    };
    window.addEventListener("contribution_updated", handleUpdate);
    return () => window.removeEventListener("contribution_updated", handleUpdate);
  }, []);

  // Dynamic Event Type options
  const eventTypeOptions = useMemo(() => {
    const set = new Set();
    (eventTypesList || []).forEach((et) => {
      if (et.eventTypeName) set.add(et.eventTypeName.trim());
    });
    (report?.eventCollections || []).forEach((ec) => {
      if (ec.eventTypeName) set.add(ec.eventTypeName.trim());
    });
    const list = [{ label: "All Event Types", value: "ALL" }];
    Array.from(set).sort().forEach((name) => {
      list.push({ label: name, value: name });
    });
    return list;
  }, [eventTypesList, report?.eventCollections]);

  // Cascading Event options based on selected filterEventType
  const eventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const unique = new Set();

    const combined = [];
    (eventsList || []).forEach((e) => {
      const typeName = e.eventTypeName || e.category || eventTypesList.find((t) => t.eventTypeId === e.eventTypeId)?.eventTypeName || "General";
      combined.push({
        name: e.name || e.eventName || "",
        typeName: typeName.trim(),
      });
    });

    (report?.eventCollections || []).forEach((ec) => {
      if (ec.eventName && !combined.some((c) => c.name.toLowerCase() === ec.eventName.toLowerCase())) {
        combined.push({
          name: ec.eventName,
          typeName: (ec.eventTypeName || "General").trim(),
        });
      }
    });

    combined.forEach((e) => {
      if (!e.name || unique.has(e.name.toLowerCase())) return;
      if (
        filterEventType !== "ALL" &&
        e.typeName.toLowerCase() !== filterEventType.toLowerCase()
      ) {
        return;
      }
      unique.add(e.name.toLowerCase());
      list.push({ label: e.name, value: e.name });
    });

    return list;
  }, [eventsList, eventTypesList, report?.eventCollections, filterEventType]);

  const handleEventTypeChange = (newType) => {
    setFilterEventType(newType);
    if (newType !== "ALL" && filterEvent !== "ALL") {
      const isStillValid = (eventsList || []).some((e) => {
        const typeName = e.eventTypeName || e.category || eventTypesList.find((t) => t.eventTypeId === e.eventTypeId)?.eventTypeName || "General";
        return (e.name || e.eventName) === filterEvent && typeName.toLowerCase() === newType.toLowerCase();
      });
      if (!isStillValid) {
        setFilterEvent("ALL");
      }
    }
  };

  /* Filtered Collections */
  const filteredEventCollections = useMemo(() => {
    let list = report?.eventCollections ?? [];
    if (filters.eventType && filters.eventType !== "ALL") {
      list = list.filter((e) => (e.eventTypeName || "General").trim().toLowerCase() === filters.eventType.trim().toLowerCase());
    }
    if (filters.event && filters.event !== "ALL") {
      list = list.filter((e) => (e.eventName || "").trim().toLowerCase() === filters.event.trim().toLowerCase());
    }
    return list;
  }, [report?.eventCollections, filters.eventType, filters.event]);

  const filteredMemberContributions = useMemo(() => {
    let list = report?.memberContributionHistory ?? [];

    if (isMember) {
      list = list.filter((m) => isCurrentMember(m));
    }

    if ((filters.eventType && filters.eventType !== "ALL") || (filters.event && filters.event !== "ALL")) {
      list = list.filter((m) => {
        const events = m.events || [];
        return events.some((ev) => {
          const matchType = !filters.eventType || filters.eventType === "ALL" || (ev.categoryName || "General").trim().toLowerCase() === filters.eventType.trim().toLowerCase();
          const matchEv = !filters.event || filters.event === "ALL" || (ev.eventName || "").trim().toLowerCase() === filters.event.trim().toLowerCase();
          return matchType && matchEv;
        });
      });
    }
    return list;
  }, [report?.memberContributionHistory, filters.eventType, filters.event, isMember, isCurrentMember]);

  /* Filtered Payment History (Event Type & Event against) */
  const filteredPaymentHistory = useMemo(() => {
    let list = paymentTransactions || [];

    // If Member role, filter by the current logged-in member
    if (isMember) {
      list = list.filter((t) => {
        const tId = t.userId || t.UserId || t.memberId || t.MemberId;
        if (currentUserId && String(tId) === String(currentUserId)) return true;
        const tName = String(t.memberName || t.MemberName || "").trim().toLowerCase();
        if (currentUserName && (tName === currentUserName || tName.includes(currentUserName) || currentUserName.includes(tName))) return true;
        return false;
      });
    }

    // Year & Month filter
    if (filters.year && filters.year !== 0) {
      list = list.filter((t) => {
        const d = t.paymentDate || t.PaymentDate || t.createdOn || t.CreatedOn || t.createdAt;
        return d ? dayjs(d).year() === Number(filters.year) : true;
      });
    }
    if (filters.month && filters.month !== 0) {
      list = list.filter((t) => {
        const d = t.paymentDate || t.PaymentDate || t.createdOn || t.CreatedOn || t.createdAt;
        return d ? dayjs(d).month() + 1 === Number(filters.month) : true;
      });
    }

    // Event Type & Event filter
    return list.filter((t) => {
      const tEventName = String(t.eventName || t.EventName || "").trim().toLowerCase();
      const evMatch = (eventsList || []).find((e) => (e.name || e.eventName || "").trim().toLowerCase() === tEventName);
      const tEventType = String(t.eventTypeName || t.categoryName || evMatch?.eventTypeName || evMatch?.category || "General").trim().toLowerCase();

      const matchType = !filters.eventType || filters.eventType === "ALL" || tEventType === filters.eventType.trim().toLowerCase();
      const matchEv = !filters.event || filters.event === "ALL" || tEventName === filters.event.trim().toLowerCase();
      return matchType && matchEv;
    });
  }, [paymentTransactions, isMember, currentUserId, currentUserName, filters, eventsList]);

  /* Rupee formatter */
  const INR = (n) => "\u20B9" + Number(n || 0).toLocaleString();

  /* ── Column Definitions ── */
  const eventColumns = [
    { label: "Event Type", key: "eventTypeName", render: (r) => r.eventTypeName || "General" },
    { label: "Event Name", key: "eventName", render: (r) => r.eventName || "--" },
    { label: "Event Date", key: "eventDate", render: (r) => formatGridDate(r.eventDate) },
    { label: "Expected Amount", key: "expectedAmount", align: "right", render: (r) => INR(r.expectedAmount) },
    { label: "Paid Amount", key: "paidAmount", align: "right", render: (r) => INR(r.paidAmount) },
    { label: "Pending Amount", key: "pendingAmount", align: "right", render: (r) => INR(r.pendingAmount) },
    { label: "Expense Amount", key: "expenseAmount", align: "right", render: (r) => INR(r.expenseAmount || 0) },
    {
      label: "Balance Amount", key: "remainingAmount", align: "right",
      render: (r) => {
        const exp = Number(r.expectedAmount || 0);
        const expAmt = Number(r.expenseAmount || 0);
        const rem = exp - expAmt;
        return INR(rem);
      },
    },
  ];

  const getMemberEventType = (r) => {
    if (filters.eventType && filters.eventType !== "ALL") {
      return filters.eventType;
    }
    if (Array.isArray(r.events) && r.events.length > 0) {
      const types = Array.from(
        new Set(
          r.events
            .map((e) => e.categoryName || e.eventTypeName || e.eventType || e.category)
            .filter(Boolean)
        )
      );
      if (types.length > 0) return types.join(", ");
    }
    return r.eventTypeName || r.categoryName || r.eventType || "All Event Types";
  };

  const getMemberEventName = (r) => {
    if (filters.event && filters.event !== "ALL") {
      return filters.event;
    }
    if (Array.isArray(r.events) && r.events.length > 0) {
      let filteredEvs = r.events;
      if (filters.eventType && filters.eventType !== "ALL") {
        filteredEvs = filteredEvs.filter(
          (e) => (e.categoryName || e.eventTypeName || e.eventType || "General").trim().toLowerCase() === filters.eventType.trim().toLowerCase()
        );
      }
      const names = Array.from(
        new Set(
          filteredEvs
            .map((e) => e.eventName || e.name || e.title)
            .filter(Boolean)
        )
      );
      if (names.length > 0) return names.join(", ");
    }
    return r.eventName || r.relatedEvent || r.name || "All Events";
  };

  const memberColumns = [
    {
      label: "Member Name",
      key: "memberName",
      render: (r) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ cursor: "pointer", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
          onClick={() => openBreakdownModal(r, "all")}
        >
          {r.memberName}
        </Typography>
      ),
    },
    {
      label: "Event Type",
      key: "eventType",
      render: (r) => (
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {getMemberEventType(r)}
        </Typography>
      ),
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (r) => (
        <Typography variant="body2" fontWeight={600}>
          {getMemberEventName(r)}
        </Typography>
      ),
    },
    { label: "Expected Amount", key: "totalExpectedAmount", align: "right", render: (r) => INR(r.totalExpectedAmount) },
    { label: "Paid Amount", key: "totalPaidAmount", align: "right", render: (r) => INR(r.totalPaidAmount) },
    { label: "Pending Amount", key: "totalPendingAmount", align: "right", render: (r) => INR((r.totalExpectedAmount || 0) - (r.totalPaidAmount || 0)) },
    {
      label: "Paid Events",
      key: "paidEventsCount",
      align: "center",
      render: (r) => (
        <Chip
          size="small"
          label={r.paidEventsCount}
          color={r.paidEventsCount > 0 ? "success" : "default"}
          variant={r.paidEventsCount > 0 ? "filled" : "outlined"}
          onClick={() => openBreakdownModal(r, "paid")}
          sx={{ fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", minWidth: 36, height: 24 }}
        />
      ),
    },
    {
      label: "Pending Events",
      key: "pendingEventsCount",
      align: "center",
      render: (r) => (
        <Chip
          size="small"
          label={r.pendingEventsCount}
          color={r.pendingEventsCount > 0 ? "error" : "default"}
          variant={r.pendingEventsCount > 0 ? "filled" : "outlined"}
          onClick={() => openBreakdownModal(r, "pending")}
          sx={{ fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", minWidth: 36, height: 24 }}
        />
      ),
    },
  ];

  const pendingColumns = [
    { label: "Member Name", key: "memberName", render: (r) => <Typography variant="body2" fontWeight={700}>{r.memberName}</Typography> },
    { label: "Phone Number", key: "phone", render: (r) => r.phone || "—" },
    { label: "Event Name", key: "eventName", render: (r) => <Typography variant="body2" fontWeight={600}>{r.eventName}</Typography> },
    { label: "Event Date", key: "eventDate", render: (r) => formatGridDate(r.eventDate) },
    { label: "Due Amount", key: "amount", align: "right", render: (r) => INR(r.amount) },
    {
      label: "Aging Status", key: "agingCategory", align: "center",
      render: (r) => {
        const cat = r.agingCategory || (r.daysOverdue > 30 ? "Critical" : r.daysOverdue >= 15 ? "Moderate" : "Recent");
        return <Chip size="small" label={cat} color={cat === "Critical" ? "error" : cat === "Moderate" ? "warning" : "info"} sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }} />;
      },
    },
  ];

  const renderPaymentModeBadge = (mode) => {
    const m = String(mode || "Cash").toLowerCase();
    let bg = "rgba(16, 185, 129, 0.1)";
    let color = "#10b981";
    let border = "rgba(16, 185, 129, 0.25)";

    if (m === "upi") {
      bg = "rgba(124, 58, 237, 0.1)";
      color = "#7c3aed";
      border = "rgba(124, 58, 237, 0.25)";
    } else if (m === "split") {
      bg = "rgba(2, 132, 199, 0.1)";
      color = "#0284c7";
      border = "rgba(2, 132, 199, 0.25)";
    }

    return (
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          bgcolor: bg,
          color,
          border: `1px solid ${border}`,
          px: 1.2,
          py: 0.3,
          borderRadius: "6px",
          fontSize: "0.74rem",
          display: "inline-block",
        }}
      >
        {mode || "Cash"}
      </Typography>
    );
  };

  const renderUtrReferenceBadges = (rawUtr) => {
    if (!rawUtr || rawUtr === "-" || rawUtr === "--") {
      return (
        <Typography variant="body2" sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          —
        </Typography>
      );
    }

    const str = String(rawUtr).trim();
    const parts = str.includes(";")
      ? str.split(";").map((p) => p.trim()).filter(Boolean)
      : [str];

    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, alignItems: "center" }}>
        {parts.map((part, idx) => {
          const colonIdx = part.indexOf(":");
          let modeName = "";
          let refVal = part;

          if (colonIdx > 0) {
            modeName = part.substring(0, colonIdx).trim();
            refVal = part.substring(colonIdx + 1).trim();
          }

          const lowerMode = modeName.toLowerCase();
          let color = "#4a3f6b";
          let bg = "rgba(74, 63, 107, 0.08)";
          let border = "rgba(74, 63, 107, 0.22)";

          if (lowerMode.includes("gpay") || lowerMode.includes("google")) {
            color = "#2563eb";
            bg = "rgba(37, 99, 235, 0.08)";
            border = "rgba(37, 99, 235, 0.28)";
          } else if (lowerMode.includes("phonepe") || lowerMode.includes("phone")) {
            color = "#7c3aed";
            bg = "rgba(124, 58, 237, 0.08)";
            border = "rgba(124, 58, 237, 0.28)";
          } else if (lowerMode.includes("paytm")) {
            color = "#0284c7";
            bg = "rgba(2, 132, 199, 0.08)";
            border = "rgba(2, 132, 199, 0.28)";
          } else if (lowerMode.includes("upi") || lowerMode.includes("bhim")) {
            color = "#ea580c";
            bg = "rgba(234, 88, 12, 0.08)";
            border = "rgba(234, 88, 12, 0.28)";
          } else if (lowerMode.includes("cash")) {
            color = "#16a34a";
            bg = "rgba(22, 163, 74, 0.08)";
            border = "rgba(22, 163, 74, 0.28)";
          }

          return (
            <Box
              key={idx}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.9,
                py: 0.25,
                borderRadius: "6px",
                bgcolor: bg,
                border: `1px solid ${border}`,
                whiteSpace: "nowrap",
              }}
            >
              {modeName ? (
                <>
                  <Typography component="span" sx={{ fontWeight: 700, fontSize: "0.72rem", color }}>
                    {modeName}:
                  </Typography>
                  <Typography component="span" sx={{ fontSize: "0.72rem", fontWeight: 600, color: "text.primary" }}>
                    {refVal}
                  </Typography>
                </>
              ) : (
                <Typography component="span" sx={{ fontSize: "0.72rem", fontWeight: 600, color: "text.primary" }}>
                  {refVal}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderStatusBadge = (status) => {
    const st = String(status || "Pending").toLowerCase().trim();
    let bg = "rgba(234, 179, 8, 0.12)";
    let color = "#b45309";
    let border = "rgba(234, 179, 8, 0.3)";

    if (st === "verified" || st === "closed") {
      bg = "rgba(22, 163, 74, 0.1)";
      color = "#16a34a";
      border = "rgba(22, 163, 74, 0.25)";
    } else if (st === "failed" || st === "rejected") {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#dc2626";
      border = "rgba(239, 68, 68, 0.25)";
    }

    return (
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          bgcolor: bg,
          color,
          border: `1px solid ${border}`,
          px: 1.2,
          py: 0.3,
          borderRadius: "12px",
          fontSize: "0.72rem",
          display: "inline-block",
        }}
      >
        {status || "Pending"}
      </Typography>
    );
  };

  const paymentHistoryColumns = [
    {
      label: "Event & Type",
      key: "eventName",
      render: (row) => {
        const evMatch = (eventsList || []).find((e) => (e.name || e.eventName || "").trim().toLowerCase() === (row.eventName || "").trim().toLowerCase());
        const evType = row.eventTypeName || row.categoryName || evMatch?.eventTypeName || evMatch?.category || "General";
        return (
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {row.eventName || "—"}
            </Typography>
            <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ fontSize: "0.7rem" }}>
              {evType}
            </Typography>
          </Box>
        );
      },
    },
    {
      label: "Member Name",
      key: "memberName",
      render: (row) => (
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
          {row.memberName || "—"}
        </Typography>
      ),
    },
    {
      label: "Amount Paid",
      key: "amount",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="success.main">
          {INR(row.amount)}
        </Typography>
      ),
    },
    {
      label: "Payment Date",
      key: "paymentDate",
      render: (row) => formatGridDate(row.paymentDate || row.PaymentDate || row.createdOn || row.CreatedOn),
    },
    {
      label: "Payment Mode",
      key: "paymentMode",
      render: (row) => renderPaymentModeBadge(row.paymentMode || row.PaymentMode),
    },
    {
      label: "UTR / Reference No",
      key: "utr",
      render: (row) => renderUtrReferenceBadges(row.utr || row.Utr),
    },
    {
      label: "Verification Status",
      key: "status",
      align: "center",
      render: (row) => renderStatusBadge(row.status || row.Status),
    },
    {
      label: "Verified By",
      key: "verifiedBy",
      render: (row) => row.verifiedBy || row.VerifiedBy || "—",
    },
  ];

  /* ── Chart Data ── */
  const chartData = useMemo(() => {
    if (mode === "member") {
      return (filteredMemberContributions ?? []).map((item) => {
        const val = metric === "paid"
          ? Number(item.totalPaidAmount) || 0
          : metric === "pending"
            ? Math.max(0, (Number(item.totalExpectedAmount) || 0) - (Number(item.totalPaidAmount) || 0))
            : Number(item.totalExpectedAmount) || 0;
        return { label: item.memberName, value: val };
      }).filter((i) => i.value > 0);
    }
    if (mode === "pending") {
      const map = {};
      (report?.pendingDues ?? []).forEach((d) => {
        const key = metric === "member" ? d.memberName : d.eventName;
        map[key] = (map[key] || 0) + Number(d.amount);
      });
      return Object.entries(map).map(([k, v]) => ({ label: k, value: v }));
    }
    return (filteredEventCollections ?? []).map((item) => {
      const val = metric === "paid"
        ? Number(item.paidAmount) || 0
        : metric === "pending"
          ? Number(item.pendingAmount) || 0
          : metric === "expense"
            ? Number(item.expenseAmount) || 0
            : metric === "remaining"
              ? (Number(item.paidAmount) || 0) - (Number(item.expenseAmount) || 0)
              : Number(item.expectedAmount) || 0;
      return { label: item.eventName, value: val };
    }).filter((i) => i.value > 0);
  }, [mode, filteredEventCollections, filteredMemberContributions, report?.pendingDues, metric]);

  /* ── Dynamic Event Data for ExecutiveFinancialBarChart ── */
  const reportBarEvents = useMemo(() => {
    if (mode === "member") {
      if (isMember) {
        const myData = (filteredMemberContributions ?? [])[0] || {};
        const events = myData.events || [];
        if (events.length > 0) {
          return events.map((ev, idx) => {
            const exp = Number(ev.expectedAmount || ev.amount || 0);
            const col = Number(ev.paidAmount || 0);
            const pen = Math.max(0, exp - col);
            return {
              id: ev.eventId || ev.contributionId || `my-ev-${idx}`,
              label: ev.eventName || `Event ${idx + 1}`,
              totalExpectedAmount: exp,
              expectedAmount: exp,
              collectedAmount: col,
              expected: exp,
              collected: col,
              pending: pen,
              expense: 0,
              remaining: exp - col,
              eventTypeName: ev.categoryName || ev.eventTypeName || "General",
              date: ev.eventDate || ev.paymentDate || null,
            };
          });
        }
      }
      return (filteredMemberContributions ?? []).map((m, idx) => {
        const exp = Number(m.totalExpectedAmount || 0);
        const col = Number(m.totalPaidAmount || 0);
        const pen = Math.max(0, exp - col);
        return {
          id: m.memberId || `mem-${idx}`,
          label: m.memberName,
          expected: exp,
          collected: col,
          pending: pen,
          expense: 0,
          remaining: exp - col,
          eventTypeName: m.department || "Member",
          date: null,
        };
      });
    }

    if (mode === "payment-history") {
      const map = {};
      (filteredPaymentHistory ?? []).forEach((t, idx) => {
        const evName = t.eventName || t.EventName || "Event";
        if (!map[evName]) {
          const evMatch = (eventsList || []).find((e) => (e.name || e.eventName || "").trim().toLowerCase() === evName.trim().toLowerCase());
          map[evName] = {
            id: evName || `ev-pay-${idx}`,
            label: evName,
            expected: 0,
            collected: 0,
            pending: 0,
            expense: 0,
            remaining: 0,
            eventTypeName: t.eventTypeName || t.categoryName || evMatch?.eventTypeName || evMatch?.category || "General",
            date: t.paymentDate,
          };
        }
        const amt = Number(t.amount || 0);
        const isVer = String(t.status || "").toLowerCase() === "verified";
        map[evName].expected += amt;
        if (isVer) {
          map[evName].collected += amt;
        } else {
          map[evName].pending += amt;
        }
      });
      return Object.values(map);
    }

    if (mode === "pending") {
      const map = {};
      (report?.pendingDues ?? []).forEach((d) => {
        const name = d.eventName || "Event";
        if (!map[name]) {
          map[name] = {
            id: name,
            label: name,
            expected: 0,
            collected: 0,
            pending: 0,
            expense: 0,
            remaining: 0,
            eventTypeName: "Pending Due",
            date: d.eventDate,
          };
        }
        map[name].pending += Number(d.amount || 0);
        map[name].expected += Number(d.amount || 0);
      });
      return Object.values(map);
    }

    return (filteredEventCollections ?? []).map((e, idx) => {
      const exp = Number(e.expectedAmount || 0);
      const col = Number(e.paidAmount || 0);
      const pen = e.pendingAmount !== undefined ? Number(e.pendingAmount) : Math.max(0, exp - col);
      const expense = Number(e.expenseAmount || 0);
      const remaining = exp - expense;
      return {
        id: e.eventId || `event-${idx}`,
        label: e.eventName,
        expected: exp,
        collected: col,
        pending: pen,
        expense: expense,
        remaining: remaining,
        eventTypeName: e.eventTypeName || "General",
        date: e.eventDate,
      };
    });
  }, [mode, filteredEventCollections, filteredMemberContributions, filteredPaymentHistory, report?.pendingDues, eventsList]);

  const searchedMembers = useMemo(() => {
    const list = filteredMemberContributions ?? [];
    if (!memberSearchTerm.trim()) return list;
    const q = memberSearchTerm.toLowerCase();
    return list.filter((m) =>
      (m.memberName || "").toLowerCase().includes(q) ||
      (m.department || "").toLowerCase().includes(q)
    );
  }, [filteredMemberContributions, memberSearchTerm]);

  const activeSelectedMember = useMemo(() => {
    if (!filteredMemberContributions || filteredMemberContributions.length === 0) return null;
    if (selectedReportMemberId) {
      const found = filteredMemberContributions.find(
        (m, idx) => String(m.memberId || m.MemberId || idx) === String(selectedReportMemberId)
      );
      if (found) return found;
    }
    return filteredMemberContributions[0];
  }, [filteredMemberContributions, selectedReportMemberId]);

  const selectedMemberBarEvents = useMemo(() => {
    if (!activeSelectedMember) return [];
    const exp = Number(activeSelectedMember.totalExpectedAmount || 0);
    const col = Number(activeSelectedMember.totalPaidAmount || 0);
    const pen = Math.max(0, exp - col);
    const expense = 0;
    const rem = exp - col;
    return [
      {
        id: activeSelectedMember.memberId || "selected-mem",
        label: activeSelectedMember.memberName,
        expected: exp,
        collected: col,
        pending: pen,
        expense: expense,
        remaining: rem,
        eventTypeName: activeSelectedMember.department || "Member",
        date: null,
      },
    ];
  }, [activeSelectedMember]);

  const reportTotals = useMemo(() => {
    if (mode === "payment-history") {
      const list = filteredPaymentHistory ?? [];
      const totalAmt = list.reduce((s, t) => s + Number(t.amount || 0), 0);
      const verifiedAmt = list.filter((t) => String(t.status || "").toLowerCase() === "verified").reduce((s, t) => s + Number(t.amount || 0), 0);
      const pendingAmt = list.filter((t) => String(t.status || "").toLowerCase() !== "verified").reduce((s, t) => s + Number(t.amount || 0), 0);
      return {
        totalExpected: totalAmt,
        totalCollected: verifiedAmt,
        totalPending: pendingAmt,
        totalExpenses: 0,
        totalRemaining: verifiedAmt,
      };
    }
    if (mode === "member") {
      const mb = filteredMemberContributions ?? [];
      const exp = mb.reduce((s, m) => s + Number(m.totalExpectedAmount || 0), 0);
      const paid = mb.reduce((s, m) => s + Number(m.totalPaidAmount || 0), 0);
      const pend = Math.max(0, exp - paid);
      const ev = filteredEventCollections ?? [];
      const totalExp = ev.reduce((s, e) => s + Number(e.expenseAmount || 0), 0);
      const remaining = exp - totalExp;
      return {
        totalExpected: exp,
        totalCollected: paid,
        totalPending: pend,
        totalExpenses: totalExp,
        totalRemaining: remaining,
      };
    }
    const ev = filteredEventCollections ?? [];
    const exp = ev.reduce((s, e) => s + Number(e.expectedAmount || 0), 0);
    const paid = ev.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const pend = ev.reduce((s, e) => s + Number(e.pendingAmount || 0), 0);
    const totalExp = ev.reduce((s, e) => s + Number(e.expenseAmount || 0), 0);
    const remaining = exp - totalExp;
    return {
      totalExpected: exp,
      totalCollected: paid,
      totalPending: pend,
      totalExpenses: totalExp,
      totalRemaining: remaining,
    };
  }, [mode, filteredEventCollections, filteredMemberContributions, filteredPaymentHistory]);

  const kpiCards = useMemo(() => {
    if (mode === "payment-history") {
      return [];
    }
    if (mode === "event") {
      const ev = filteredEventCollections ?? [];
      const exp = ev.reduce((s, e) => s + Number(e.expectedAmount || 0), 0);
      const paid = ev.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const pend = ev.reduce((s, e) => s + Number(e.pendingAmount || 0), 0);
      const totalExp = ev.reduce((s, e) => s + Number(e.expenseAmount || 0), 0);
      const remaining = exp - totalExp;
      return [
        { label: "Total Expected", value: INR(exp), accent: "#6366f1", actionText: "All Events →" },
        { label: "Total Collected", value: INR(paid), accent: "#10b981", actionText: "Total Collected →" },
        { label: "Total Pending", value: INR(pend), accent: "#f43f5e", actionText: "View Unpaid →" },
        { label: "Total Expenses", value: INR(totalExp), accent: "#f59e0b", actionText: "Expenses →" },
        { label: "Balance Amount", value: INR(remaining), accent: remaining >= 0 ? "#06b6d4" : "#f43f5e", actionText: "Net Balance →" },
        { label: "Total Events", value: ev.length, accent: "#8b5cf6", actionText: "View Events →" },
      ];
    }
    if (mode === "member") {
      const mb = filteredMemberContributions ?? [];
      const exp = mb.reduce((s, m) => s + Number(m.totalExpectedAmount || 0), 0);
      const paid = mb.reduce((s, m) => s + Number(m.totalPaidAmount || 0), 0);
      const pend = exp - paid;

      if (isMember) {
        const myData = mb[0] || {};
        const totalEvents = (myData.events || []).length || (Number(myData.paidEventsCount || 0) + Number(myData.pendingEventsCount || 0));
        return [
          { label: "My Expected", value: INR(exp), accent: "#6366f1", actionText: "My Expected →" },
          { label: "My Paid", value: INR(paid), accent: "#10b981", actionText: "My Payments →" },
          { label: "My Pending", value: INR(pend), accent: "#f43f5e", actionText: "View Unpaid →" },
          { label: "Total Events", value: totalEvents, accent: "#8b5cf6", actionText: "View Events →" },
        ];
      }

      const ev = filteredEventCollections ?? [];
      const totalExp = ev.reduce((s, e) => s + Number(e.expenseAmount || 0), 0);
      const remaining = exp - totalExp;
      return [
        { label: "Total Expected", value: INR(exp), accent: "#6366f1", actionText: "All Members →" },
        { label: "Total Collected", value: INR(paid), accent: "#10b981", actionText: "Total Collected →" },
        { label: "Total Pending", value: INR(pend), accent: "#f43f5e", actionText: "View Unpaid →" },
        { label: "Total Expenses", value: INR(totalExp), accent: "#f59e0b", actionText: "Expenses →" },
        { label: "Balance Amount", value: INR(remaining), accent: remaining >= 0 ? "#06b6d4" : "#f43f5e", actionText: "Net Balance →" },
        { label: "Total Members", value: mb.length, accent: "#8b5cf6", actionText: "All Members →" },
      ];
    }
    if (mode === "pending") {
      const du = report?.pendingDues ?? [];
      const total = du.reduce((s, d) => s + Number(d.amount || 0), 0);
      const uniq = new Set(du.map((d) => d.memberId)).size;
      const crit = du.filter((d) => d.daysOverdue > 30).length;
      const mod = du.filter((d) => d.daysOverdue >= 15 && d.daysOverdue <= 30).length;
      return [
        { label: "Total Pending Dues", value: INR(total), accent: "#f43f5e", actionText: "Pending Dues →" },
        { label: "Pending Records", value: du.length, accent: "#f59e0b", actionText: "Records →" },
        { label: "Unique Defaulters", value: uniq, accent: "#f43f5e", actionText: "Defaulters →" },
        { label: "Critical (>30 Days)", value: crit, accent: "#f43f5e", actionText: "Critical →" },
        { label: "Moderate (15-30 Days)", value: mod, accent: "#f59e0b", actionText: "Moderate →" },
      ];
    }
    return [];
  }, [mode, filteredEventCollections, filteredMemberContributions, filteredPaymentHistory, report, isMember]);

  const pageTitle = mode === "payment-history"
    ? (isMember ? "My Payment History" : "Event Payment Audit")
    : (isMember
        ? "My Contributions"
        : ({ event: "Event Collections", member: "Member Contributions", pending: "Pending Dues" }[mode] || "Event Collections"));

  const metricOptions = mode === "pending"
    ? [{ label: "By Event", key: "event" }, { label: "By Member", key: "member" }]
    : [
      { label: "Paid", key: "paid" },
      { label: "Expected", key: "expected" },
      { label: "Pending", key: "pending" },
      { label: "Expense", key: "expense" },
      { label: "Balance", key: "remaining" },
    ];

  const navTabs = isMember
    ? [
        { label: "My Contributions", path: "/reports/member-velocity", modeKey: "member", icon: People },
        { label: "Payment History", path: "/reports/payment-history", modeKey: "payment-history", icon: ReceiptLongIcon },
      ]
    : [
        { label: "Event Collections", path: "/reports/event-collection-audit", modeKey: "event", icon: EventIcon },
        { label: "Member Contributions", path: "/reports/member-velocity", modeKey: "member", icon: People },
        { label: "Payment History", path: "/reports/payment-history", modeKey: "payment-history", icon: ReceiptLongIcon },
      ];

  const handleExport = () => {
    if (!canExport) return;
    try {
      if (mode === "payment-history") {
        const paymentExport = (filteredPaymentHistory ?? []).map((t) => {
          const evMatch = (eventsList || []).find((e) => (e.name || e.eventName || "").trim().toLowerCase() === (t.eventName || "").trim().toLowerCase());
          const evType = t.eventTypeName || t.categoryName || evMatch?.eventTypeName || evMatch?.category || "General";
          return {
            "Transaction ID": t.id || t.transactionId || "—",
            "Event Name": t.eventName || "—",
            "Event Type": evType,
            "Member Name": t.memberName || "—",
            "Amount Paid": Number(t.amount || 0),
            "Payment Date": formatGridDate(t.paymentDate || t.createdOn),
            "Payment Mode": t.paymentMode || "—",
            "UTR / Reference": t.utr || "—",
            "Verification Status": t.status || "Pending",
            "Verified By": t.verifiedBy || "—",
            "Verified On": t.verifiedOn ? formatGridDate(t.verifiedOn) : "—",
            "Created By": t.createdBy || "—",
          };
        });

        exportSheets("payment-history-audit.xlsx", [
          { name: "Payment History", data: paymentExport },
        ]);
        toast.success("Payment history exported successfully!");
        return;
      }

      if (isMember) {
        const myData = filteredMemberContributions[0];
        const myEventsExport = (myData?.events || []).map((e) => ({
          "Event Name": e.eventName,
          "Category": e.categoryName || "General",
          "Event Date": formatGridDate(e.eventDate),
          "Expected Amount": Number(e.expectedAmount ?? e.amount ?? 0),
          "Paid Amount": Number(e.paidAmount ?? ((e.paymentStatus || "").toLowerCase() === "paid" ? e.amount : 0)),
          "Pending Amount": Number(e.pendingAmount ?? (Math.max(0, Number(e.expectedAmount || 0) - Number(e.paidAmount || 0)))),
          "Status": e.paymentStatus || (Number(e.paidAmount) >= Number(e.expectedAmount) ? "Paid" : "Pending"),
          "Payment Mode": e.paymentMode || "—",
          "Payment Date": e.paymentDate ? formatGridDate(e.paymentDate) : "—",
        }));

        exportSheets("my-contributions-report.xlsx", [
          { name: "My Contributions", data: myEventsExport },
        ]);
        toast.success("My contribution report exported successfully!");
        return;
      }

      const eventCollectionsExport = (filteredEventCollections ?? []).map((e) => ({
        "Event Name": e.eventName,
        "Event Type": e.eventTypeName || "General",
        "Event Date": formatGridDate(e.eventDate),
        "Expected Amount": Number(e.expectedAmount || 0),
        "Paid Amount": Number(e.paidAmount || 0),
        "Pending Amount": Number(e.pendingAmount || 0),
        "Expense Amount": Number(e.expenseAmount || 0),
        "Balance Amount": (Number(e.expectedAmount || 0) - Number(e.expenseAmount || 0)),
      }));

      exportSheets("team-contribution-reports.xlsx", [
        { name: "Event Collections", data: eventCollectionsExport },
        { name: "Member Contributions", data: filteredMemberContributions ?? [] },
      ]);
      toast.success("Reports exported successfully!");
    } catch {
      toast.error("Failed to export reports.");
    }
  };

  const periodLabel = useMemo(() => {
    let text = filters.month === 0
      ? `All Months, ${filters.year}`
      : `${dayjs().month(filters.month - 1).format("MMMM")} ${filters.year}`;
    if (filters.event && filters.event !== "ALL") {
      text += ` • ${filters.event}`;
    } else if (filters.eventType && filters.eventType !== "ALL") {
      text += ` • ${filters.eventType}`;
    }
    return text;
  }, [filters]);

  return (
    <div className="page-shell">
      <Card
        sx={{
          overflow: "hidden",
          borderRadius: "16px",
          border: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          boxShadow: isDark
            ? "0 4px 24px -2px rgba(0, 0, 0, 0.5)"
            : "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
        }}
      >

        {/* ── Executive Header Banner ── */}
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            pb: { xs: 2, md: 2.5 },
            background: isDark
              ? "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(30, 26, 46, 0.6) 100%)"
              : "#ffffff",
            borderBottom: "1px solid " + theme.palette.divider,
          }}
        >
          {/* Top Row: Title, Period Badge & Export Action */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(124, 58, 237, 0.35)",
                  flexShrink: 0,
                }}
              >
                <AssessmentIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{
                      fontSize: { xs: "1.5rem", sm: "1.625rem" },
                      letterSpacing: "-0.02em",
                      color: "text.primary",
                      lineHeight: 1.25,
                    }}
                  >
                    {pageTitle}
                  </Typography>
                  <Chip
                    size="small"
                    label={periodLabel}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)",
                      color: "primary.main",
                      borderRadius: "6px",
                      height: 22,
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
                  Financial overview, velocity audit & collection analytics
                </Typography>
              </Box>
            </Box>

            <AppButton
              size="small"
              variant="contained"
              disabled={!canExport}
              onClick={handleExport}
              startIcon={<FileDownloadIcon sx={{ fontSize: 18 }} />}
              sx={{
                fontWeight: 700,
                px: 2,
                py: 0.8,
                borderRadius: "8px",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.25)",
                whiteSpace: "nowrap",
              }}
            >
              Export Excel
            </AppButton>
          </Box>

          {/* Bottom Row: Unified Toolbar (Navigation Tabs + Inline Filters) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 2,
              p: 1.25,
              borderRadius: "12px",
              bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
              border: "1px solid",
              borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
              boxShadow: isDark ? "none" : "0 1px 4px rgba(0, 0, 0, 0.03)",
            }}
          >
            {/* Left: Navigation Segmented Track */}
            <Box
              sx={{
                display: "inline-flex",
                p: "4px",
                borderRadius: "10px",
                bgcolor: isDark ? "rgba(0, 0, 0, 0.25)" : "#ffffff",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#e2e8f0",
                gap: 0.6,
              }}
            >
              {navTabs.map((tab) => (
                <SegmentedTab
                  key={tab.path}
                  label={tab.label}
                  icon={tab.icon}
                  isActive={mode === tab.modeKey || (!mode && tab.modeKey === "event")}
                  onClick={() => navigate(tab.path)}
                />
              ))}
            </Box>

            {/* Right: Inline Filter Controls */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: 1.2,
              }}
            >
              <Box sx={{ width: { xs: "100%", sm: 125, md: 135 } }}>
                <AppSelect
                  label="Year"
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  options={yearOptions}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 165, md: 175 } }}>
                <AppSelect
                  label="Month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  options={monthOptions}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 190, md: 210 } }}>
                <AppSelect
                  label="Event Type"
                  value={filterEventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  options={eventTypeOptions}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 190, md: 210 } }}>
                <AppSelect
                  label="Event"
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value)}
                  options={eventOptions}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
                  onClick={() => setFilters({ month: filterMonth, year: filterYear, eventType: filterEventType, event: filterEvent })}
                  sx={{
                    height: 34,
                    minHeight: 34,
                    fontWeight: 700,
                    px: 2,
                    borderRadius: "8px",
                  }}
                >
                  Filter
                </AppButton>
                <Tooltip title="Clear filters and reset">
                  <AppButton
                    variant="outlined"
                    size="small"
                    startIcon={<RestartAltIcon sx={{ fontSize: 18 }} />}
                    onClick={() => {
                      const m = dayjs().month() + 1;
                      const y = dayjs().year();
                      setFilterMonth(m);
                      setFilterYear(y);
                      setFilterEventType("ALL");
                      setFilterEvent("ALL");
                      setFilters({ month: m, year: y, eventType: "ALL", event: "ALL" });
                    }}
                    sx={{
                      height: 34,
                      minHeight: 34,
                      fontWeight: 700,
                      px: 1.8,
                      borderRadius: "8px",
                      color: "#ef4444",
                      borderColor: "rgba(239, 68, 68, 0.4)",
                      "&:hover": {
                        borderColor: "#ef4444",
                        color: "#ef4444",
                        bgcolor: "rgba(239, 68, 68, 0.06)",
                      },
                    }}
                  >
                    Clear
                  </AppButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Main Content Area ── */}
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {loading ? (
            !globalLoading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }}>
                <CircularProgress size={42} thickness={4} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 600 }}>
                  Loading report analytics...
                </Typography>
              </Stack>
            ) : (
              <Box sx={{ minHeight: 300 }} />
            )
          ) : (
            <Stack spacing={3}>

              {/* KPI Cards Grid */}
              {mode !== "payment-history" && kpiCards.length > 0 && (
                <Grid container spacing={1.25}>
                  {kpiCards.map((card) => (
                    <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4, lg: kpiCards.length === 6 ? 2 : Math.max(3, Math.floor(12 / kpiCards.length)) }}>
                      <MetricCard {...card} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Chart + Summary Widgets Grid */}
              {mode !== "payment-history" && (
                <Grid container spacing={2.5}>
                  {/* Financial Overview Bar Chart + Pie Chart */}
                  <Grid size={{ xs: 12 }}>
                    {mode === "member" && isMember ? (
                      <FinancialBarChart
                        totalExpected={reportTotals.totalExpected}
                        totalCollected={reportTotals.totalCollected}
                        totalPending={reportTotals.totalPending}
                        totalExpenses={0}
                        totalRemaining={reportTotals.totalRemaining}
                        events={reportBarEvents}
                        isMember={true}
                        isReportsPage={true}
                        showPieChart={true}
                      />
                    ) : mode === "member" ? (
                      <Card
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: isDark
                            ? "0 8px 32px rgba(0,0,0,0.35)"
                            : "0 8px 32px rgba(0,0,0,0.06)",
                          background: isDark
                            ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)"
                            : "linear-gradient(145deg, #f8faff 0%, #ffffff 100%)",
                          borderRadius: "16px",
                        }}
                      >
                        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                          <Grid container spacing={2.5}>
                            {/* Left Column: Member Directory & Selector */}
                            <Grid size={{ xs: 12, md: 4.5, lg: 4 }}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: "14px",
                                  border: `1px solid ${theme.palette.divider}`,
                                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#fcfcfd",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                {/* Member Search & Count */}
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: "0.9375rem" }}>
                                    Select Member
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={`${searchedMembers.length} ${searchedMembers.length === 1 ? "member" : "members"}`}
                                    sx={{
                                      height: 20,
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      bgcolor: isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)",
                                      color: "primary.main",
                                    }}
                                  />
                                </Stack>

                                <TextField
                                  size="small"
                                  placeholder="Search member..."
                                  value={memberSearchTerm}
                                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                                  slotProps={{
                                    input: {
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                        </InputAdornment>
                                      ),
                                    },
                                  }}
                                  sx={{
                                    mb: 1.5,
                                    "& .MuiOutlinedInput-root": {
                                      height: 36,
                                      fontSize: "0.82rem",
                                      borderRadius: "8px",
                                    },
                                  }}
                                />

                                {/* Scrollable Member List */}
                                <Box
                                  sx={{
                                    maxHeight: 380,
                                    overflowY: "auto",
                                    pr: 0.5,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                    "&::-webkit-scrollbar": { width: 5 },
                                    "&::-webkit-scrollbar-thumb": {
                                      bgcolor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                                      borderRadius: 3,
                                    },
                                  }}
                                >
                                  {searchedMembers.length === 0 ? (
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                      <Typography variant="caption" color="text.secondary">
                                        No members found matching &quot;{memberSearchTerm}&quot;
                                      </Typography>
                                    </Box>
                                  ) : (
                                    searchedMembers.map((m, idx) => {
                                      const mId = m.memberId || m.MemberId || idx;
                                      const isSelected = String(activeSelectedMember?.memberId || activeSelectedMember?.MemberId || 0) === String(mId);
                                      const exp = Number(m.totalExpectedAmount || 0);
                                      const paid = Number(m.totalPaidAmount || 0);
                                      const pen = Math.max(0, exp - paid);

                                      return (
                                        <Box
                                          key={mId}
                                          onClick={() => setSelectedReportMemberId(mId)}
                                          sx={{
                                            p: 1.25,
                                            px: 1.5,
                                            borderRadius: "10px",
                                            cursor: "pointer",
                                            border: "1.5px solid",
                                            borderColor: isSelected
                                              ? "#7c3aed"
                                              : isDark
                                                ? "rgba(255,255,255,0.06)"
                                                : "rgba(0,0,0,0.06)",
                                            bgcolor: isSelected
                                              ? isDark
                                                ? "rgba(124,58,237,0.16)"
                                                : "rgba(124,58,237,0.08)"
                                              : isDark
                                                ? "rgba(255,255,255,0.015)"
                                                : "#ffffff",
                                            boxShadow: isSelected
                                              ? "0 4px 14px rgba(124,58,237,0.2)"
                                              : "none",
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                              borderColor: isSelected ? "#7c3aed" : theme.palette.primary.light,
                                              bgcolor: isSelected
                                                ? isDark
                                                  ? "rgba(124,58,237,0.2)"
                                                  : "rgba(124,58,237,0.12)"
                                                : isDark
                                                  ? "rgba(255,255,255,0.04)"
                                                  : "rgba(0,0,0,0.02)",
                                            },
                                          }}
                                        >
                                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                              <Typography
                                                variant="body2"
                                                fontWeight={isSelected ? 800 : 700}
                                                noWrap
                                                sx={{
                                                  fontSize: "0.84rem",
                                                  color: isSelected ? "primary.main" : "text.primary",
                                                }}
                                              >
                                                {m.memberName}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                                                {m.department || "Member"} • Paid ₹{paid.toLocaleString()}
                                              </Typography>
                                            </Box>
                                            <Chip
                                              size="small"
                                              label={pen === 0 ? "Paid ✓" : `₹${pen.toLocaleString()} Due`}
                                              sx={{
                                                height: 20,
                                                fontSize: "0.66rem",
                                                fontWeight: 800,
                                                bgcolor: pen === 0 ? alpha("#10b981", 0.12) : alpha("#ef4444", 0.12),
                                                color: pen === 0 ? "#10b981" : "#ef4444",
                                                border: `1px solid ${pen === 0 ? alpha("#10b981", 0.3) : alpha("#ef4444", 0.3)}`,
                                              }}
                                            />
                                          </Stack>
                                        </Box>
                                      );
                                    })
                                  )}
                                </Box>
                              </Box>
                            </Grid>

                            {/* Right Column: Financial Bar Chart for the Selected Member */}
                            <Grid size={{ xs: 12, md: 7.5, lg: 8 }}>
                              <FinancialBarChart
                                totalExpected={selectedMemberBarEvents[0]?.expected || reportTotals.totalExpected}
                                totalCollected={selectedMemberBarEvents[0]?.collected || reportTotals.totalCollected}
                                totalPending={selectedMemberBarEvents[0]?.pending || reportTotals.totalPending}
                                totalExpenses={0}
                                totalRemaining={selectedMemberBarEvents[0]?.remaining || reportTotals.totalRemaining}
                                events={reportBarEvents}
                                isMember={isMember}
                                showPieChart={false}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ) : (
                      <FinancialBarChart
                        totalExpected={reportTotals.totalExpected}
                        totalCollected={reportTotals.totalCollected}
                        totalPending={reportTotals.totalPending}
                        totalExpenses={reportTotals.totalExpenses}
                        totalRemaining={reportTotals.totalRemaining}
                        events={reportBarEvents}
                        isMember={isMember}
                      />
                    )}
                  </Grid>
                </Grid>
              )}

              {/* Data Tables Section */}
              <Box sx={{ mt: 1 }}>
                {(mode === "event" || !mode) && (
                  <AppDataTable title="Event Collections" columns={eventColumns} data={filteredEventCollections} loading={false} />
                )}
                {mode === "member" && (
                  <AppDataTable title={isMember ? "My Contribution History" : "Member Contributions"} columns={memberColumns} data={filteredMemberContributions} loading={false} />
                )}
                {mode === "payment-history" && (
                  <AppDataTable
                    title={isMember ? "My Payment Transactions" : "Event Payment Audit"}
                    columns={paymentHistoryColumns}
                    data={filteredPaymentHistory}
                    loading={false}
                  />
                )}
                {mode === "pending" && (
                  <AppDataTable title="Pending Dues & Defaulters" columns={pendingColumns} data={report?.pendingDues ?? []} loading={false} />
                )}
              </Box>

            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ── Member Event Breakdown Modal ── */}
      <Dialog
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            bgcolor: isDark ? "background.paper" : "#ffffff",
            backgroundImage: "none",
            boxShadow: 24,
          },
        }}
      >
        {selectedMember && (
          <>
            <DialogTitle sx={{ p: 2.5, pb: 1.5, borderBottom: "1px solid " + theme.palette.divider }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      color: "#fff",
                      fontWeight: 800,
                      width: 44,
                      height: 44,
                      fontSize: "1.1rem",
                    }}
                  >
                    {selectedMember.memberName?.charAt(0)?.toUpperCase() || "M"}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.1875rem", lineHeight: 1.35, letterSpacing: "-0.015em" }}>
                      {selectedMember.memberName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Event contribution breakdown & payment audit
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => setSelectedMember(null)} sx={{ color: "text.secondary" }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* KPI Strip */}
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 2 }}>
                <Chip
                  icon={<AccountBalanceWallet sx={{ fontSize: "16px !important" }} />}
                  label={`Expected: ${INR(selectedMember.totalExpectedAmount)}`}
                  sx={{ fontWeight: 700, fontSize: "0.8rem", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(79,70,229,0.08)", color: "text.primary" }}
                />
                <Chip
                  icon={<CheckCircle sx={{ fontSize: "16px !important", color: "success.main" }} />}
                  label={`Paid: ${INR(selectedMember.totalPaidAmount)} (${selectedMember.paidEventsCount} events)`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                />
                <Chip
                  icon={<HourglassEmpty sx={{ fontSize: "16px !important", color: "error.main" }} />}
                  label={`Pending: ${INR((selectedMember.totalExpectedAmount || 0) - (selectedMember.totalPaidAmount || 0))} (${selectedMember.pendingEventsCount} events)`}
                  color="error"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5 }}>
              {/* Toolbar: Filter Pills + Search + Export */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {[
                    { key: "all", label: `All Events (${memberContributions.length})` },
                    { key: "paid", label: `Paid (${memberContributions.filter(e => (e.paymentStatus || "").toLowerCase() === "paid").length || selectedMember.paidEventsCount || 0})` },
                    { key: "pending", label: `Pending (${memberContributions.filter(e => (e.paymentStatus || "").toLowerCase() !== "paid").length || selectedMember.pendingEventsCount || 0})` },
                  ].map((tab) => (
                    <Chip
                      key={tab.key}
                      label={tab.label}
                      clickable
                      color={dialogFilter === tab.key ? "primary" : "default"}
                      variant={dialogFilter === tab.key ? "filled" : "outlined"}
                      onClick={() => setDialogFilter(tab.key)}
                      sx={{ fontWeight: 700, fontSize: "0.75rem", height: 28 }}
                    />
                  ))}
                </Box>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Search event..."
                    value={dialogSearch}
                    onChange={(e) => setDialogSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      sx: { height: 32, fontSize: "0.8rem", borderRadius: "8px" },
                    }}
                  />
                  <AppButton
                    size="small"
                    variant="outlined"
                    startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={handleExportMemberEvents}
                    sx={{ height: 32, fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    Export
                  </AppButton>
                </Box>
              </Box>

              {/* Events Table or Loading */}
              {modalLoading ? (
                <Box sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                  <CircularProgress size={30} />
                  <Typography variant="caption" color="text.secondary">Loading event payment history...</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "10px", maxHeight: 420, overflow: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.95)" }}>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Event Name</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Event Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Expected</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Paid</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Payment Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                            No events found matching current criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        memberEvents.map((evt, idx) => {
                          const isPaid = (evt.paymentStatus || "").toLowerCase() === "paid";
                          return (
                            <TableRow key={evt.contributionId || evt.eventId || idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>
                                  {evt.eventName}
                                </Typography>
                                {evt.categoryName && (
                                  <Typography variant="caption" color="text.secondary">
                                    {evt.categoryName}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary", whiteSpace: "nowrap" }}>
                                {formatGridDate(evt.eventDate || evt.EventDate)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                {INR(evt.expectedAmount ?? evt.amount)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.85rem", color: isPaid ? "success.main" : "text.secondary" }}>
                                {INR(evt.paidAmount ?? (isPaid ? evt.amount : 0))}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  size="small"
                                  icon={isPaid ? <CheckCircle sx={{ fontSize: "14px !important" }} /> : <HourglassEmpty sx={{ fontSize: "14px !important" }} />}
                                  label={isPaid ? "Paid" : "Pending"}
                                  color={isPaid ? "success" : "error"}
                                  variant={isPaid ? "filled" : "outlined"}
                                  sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.8rem" }}>
                                {isPaid ? (
                                  <Stack direction="row" spacing={0.8} alignItems="center">
                                    <Typography variant="caption" fontWeight={700} sx={{ px: 0.8, py: 0.2, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(16,185,129,0.1)", color: "success.main", borderRadius: "4px" }}>
                                      {evt.paymentMode || "Paid"}
                                    </Typography>
                                    {evt.paymentDate && (
                                      <Typography variant="caption" color="text.secondary">
                                        on {formatGridDate(evt.paymentDate)}
                                      </Typography>
                                    )}
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">
                                    Awaiting payment
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, px: 2.5, borderTop: "1px solid " + theme.palette.divider, justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                Showing {memberEvents.length} of {memberContributions.length} events
              </Typography>
              <AppButton size="small" variant="contained" onClick={() => setSelectedMember(null)}>
                Close
              </AppButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}
