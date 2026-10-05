import React, { useEffect, useMemo, useState } from "react";
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
import { getEventsAsync } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";

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
            <Typography variant="body2" fontWeight={800} sx={{ textAlign: "right", fontFamily: '"Outfit", sans-serif', fontSize: "0.85rem", fontVariantNumeric: "tabular-nums" }}>
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
      accent: "#7c3aed",
      gradient: "linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(99, 102, 241, 0.04) 100%)",
      glow: "rgba(124, 58, 237, 0.25)",
      badgeBg: isDark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.1)",
      text: isDark ? "#c4b5fd" : "#6d28d9",
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
      gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)",
      glow: "rgba(16, 185, 129, 0.25)",
      badgeBg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
      text: isDark ? "#6ee7b7" : "#047857",
    },
    error: {
      accent: "#ef4444",
      gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)",
      glow: "rgba(239, 68, 68, 0.25)",
      badgeBg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
      text: isDark ? "#fca5a5" : "#b91c1c",
    },
    warning: {
      accent: "#f59e0b",
      gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 100%)",
      glow: "rgba(245, 158, 11, 0.25)",
      badgeBg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.1)",
      text: isDark ? "#fcd34d" : "#b45309",
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
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              color: c.text,
              fontSize: { xs: "1.15rem", sm: "1.22rem", md: "1.28rem", lg: "1.22rem", xl: "1.34rem" },
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
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
        color: isActive ? "#ffffff" : "text.secondary",
        bgcolor: isActive
          ? theme.palette.primary.main
          : "transparent",
        boxShadow: isActive
          ? "0 2px 8px rgba(124, 58, 237, 0.35)"
          : "none",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          color: isActive ? "#ffffff" : "text.primary",
          bgcolor: isActive
            ? theme.palette.primary.main
            : isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(124, 58, 237, 0.08)",
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
  const canExport = hasActionPermission("Export Reports", 60, authState?.role).canView !== false;
  const toast = useAppToast();

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
  const [chartType, setChartType] = useState("pie");
  const [metric, setMetric] = useState("paid");

  /* Modal state for member event breakdown */
  const [selectedMember, setSelectedMember] = useState(null);
  const [dialogFilter, setDialogFilter] = useState("all");
  const [dialogSearch, setDialogSearch] = useState("");
  const [memberContributions, setMemberContributions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

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
        const [eventsRes, typesRes] = await Promise.all([
          getEventsAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
        ]);
        if (Array.isArray(eventsRes)) setEventsList(eventsRes);
        if (Array.isArray(typesRes)) setEventTypesList(typesRes);
      } catch {
        // silent fallback
      }
    }
    fetchLookups();
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
  }, [report?.memberContributionHistory, filters.eventType, filters.event]);

  /* Rupee formatter */
  const INR = (n) => "\u20B9" + Number(n || 0).toLocaleString();

  /* ── Column Definitions ── */
  const eventColumns = [
    { label: "Event", key: "eventName", render: (r) => <Typography variant="body2" fontWeight={700}>{r.eventName}</Typography> },
    { label: "Type", key: "eventTypeName", render: (r) => <Typography variant="body2" color="text.secondary">{r.eventTypeName || "General"}</Typography> },
    { label: "Date", key: "eventDate", render: (r) => formatGridDate(r.eventDate) },
    { label: "Expected", key: "expectedAmount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700}>{INR(r.expectedAmount)}</Typography> },
    { label: "Paid", key: "paidAmount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700} color="success.main">{INR(r.paidAmount)}</Typography> },
    { label: "Pending", key: "pendingAmount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700} color="error.main">{INR(r.pendingAmount)}</Typography> },
    { label: "Expense ₹", key: "expenseAmount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700} color="warning.main">{INR(r.expenseAmount || 0)}</Typography> },
    {
      label: "Remaining ₹", key: "remainingAmount", align: "right",
      render: (r) => {
        const exp = Number(r.expectedAmount || 0);
        const expAmt = Number(r.expenseAmount || 0);
        const rem = exp - expAmt;
        const isDeficit = rem < 0;
        return (
          <Chip
            size="small"
            label={INR(rem)}
            sx={{
              fontWeight: 800,
              fontSize: "0.76rem",
              bgcolor: isDeficit ? alpha("#ef4444", 0.12) : alpha("#10b981", 0.12),
              color: isDeficit ? "error.main" : "success.main",
              border: `1px solid ${isDeficit ? alpha("#ef4444", 0.3) : alpha("#10b981", 0.3)}`,
            }}
          />
        );
      },
    },
  ];

  const memberColumns = [
    {
      label: "Member",
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
    { label: "Expected", key: "totalExpectedAmount", align: "right", render: (r) => INR(r.totalExpectedAmount) },
    { label: "Paid", key: "totalPaidAmount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700} color="success.main">{INR(r.totalPaidAmount)}</Typography> },
    { label: "Pending", key: "totalPendingAmount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700} color="error.main">{INR((r.totalExpectedAmount || 0) - (r.totalPaidAmount || 0))}</Typography> },
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
    {
      label: "Action",
      key: "action",
      align: "center",
      render: (r) => (
        <AppButton
          size="small"
          variant="outlined"
          startIcon={<ReceiptLongIcon sx={{ fontSize: 16 }} />}
          onClick={() => openBreakdownModal(r, "all")}
          sx={{ fontSize: "0.72rem", py: 0.3, px: 1.2, height: 28, textTransform: "none", fontWeight: 700 }}
        >
          View Events
        </AppButton>
      ),
    },
  ];

  const pendingColumns = [
    { label: "Member", key: "memberName", render: (r) => <Typography variant="body2" fontWeight={700}>{r.memberName}</Typography> },
    { label: "Phone", key: "phone", render: (r) => <Typography variant="body2" color="text.secondary">{r.phone || "\u2014"}</Typography> },
    { label: "Event", key: "eventName", render: (r) => <Typography variant="body2" fontWeight={600}>{r.eventName}</Typography> },
    { label: "Event Date", key: "eventDate", render: (r) => formatGridDate(r.eventDate) },
    { label: "Due Amount", key: "amount", align: "right", render: (r) => <Typography variant="body2" fontWeight={700} color="error.main">{INR(r.amount)}</Typography> },
    {
      label: "Aging", key: "agingCategory", align: "center",
      render: (r) => {
        const cat = r.agingCategory || (r.daysOverdue > 30 ? "Critical" : r.daysOverdue >= 15 ? "Moderate" : "Recent");
        return <Chip size="small" label={cat} color={cat === "Critical" ? "error" : cat === "Moderate" ? "warning" : "info"} sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }} />;
      },
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
              ? (Number(item.expectedAmount) || 0) - (Number(item.expenseAmount) || 0)
              : Number(item.expectedAmount) || 0;
      return { label: item.eventName, value: val };
    }).filter((i) => i.value > 0);
  }, [mode, filteredEventCollections, filteredMemberContributions, report?.pendingDues, metric]);

  const kpiCards = useMemo(() => {
    if (mode === "event") {
      const ev = filteredEventCollections ?? [];
      const exp = ev.reduce((s, e) => s + Number(e.expectedAmount || 0), 0);
      const paid = ev.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const pend = ev.reduce((s, e) => s + Number(e.pendingAmount || 0), 0);
      const totalExp = ev.reduce((s, e) => s + Number(e.expenseAmount || 0), 0);
      const remaining = exp - totalExp;
      const rate = exp > 0 ? Math.min(100, Math.round((paid / exp) * 100)) : 0;
      return [
        { label: "Total Events", value: ev.length, icon: EventIcon, color: "primary", helper: `${ev.length} active collection events` },
        { label: "Total Expected", value: INR(exp), icon: AccountBalanceWallet, color: "info", helper: "Projected target collections" },
        { label: "Total Collected", value: INR(paid), icon: CheckCircle, color: "success", helper: `${rate}% completion rate` },
        { label: "Total Pending", value: INR(pend), icon: HourglassEmpty, color: "error", helper: `${Math.max(0, 100 - rate)}% outstanding dues` },
        { label: "Total Expenses", value: INR(totalExp), icon: ReceiptLongIcon, color: "warning", helper: "Total expenses for events" },
        { label: "Remaining Amount", value: INR(remaining), icon: AccountBalanceWallet, color: remaining >= 0 ? "success" : "error", helper: remaining >= 0 ? "Budget Surplus (Expected − Expenses)" : "Budget Deficit (Expected − Expenses)" },
      ];
    }
    if (mode === "member") {
      const mb = filteredMemberContributions ?? [];
      const exp = mb.reduce((s, m) => s + Number(m.totalExpectedAmount || 0), 0);
      const paid = mb.reduce((s, m) => s + Number(m.totalPaidAmount || 0), 0);
      const pend = exp - paid;
      const rate = exp > 0 ? Math.min(100, Math.round((paid / exp) * 100)) : 0;
      const ev = filteredEventCollections ?? [];
      const totalExp = ev.reduce((s, e) => s + Number(e.expenseAmount || 0), 0);
      const remaining = exp - totalExp;
      return [
        { label: "Total Members", value: mb.length, icon: People, color: "primary", helper: `${mb.length} contributing members` },
        { label: "Total Expected", value: INR(exp), icon: AccountBalanceWallet, color: "info", helper: "Total expected member dues" },
        { label: "Total Collected", value: INR(paid), icon: CheckCircle, color: "success", helper: `${rate}% dues cleared` },
        { label: "Total Pending", value: INR(pend), icon: HourglassEmpty, color: "error", helper: `${Math.max(0, 100 - rate)}% remaining dues` },
        { label: "Total Expenses", value: INR(totalExp), icon: ReceiptLongIcon, color: "warning", helper: "Total expenses for events" },
        { label: "Remaining Amount", value: INR(remaining), icon: AccountBalanceWallet, color: remaining >= 0 ? "success" : "error", helper: remaining >= 0 ? "Budget Surplus (Expected − Expenses)" : "Budget Deficit (Expected − Expenses)" },
      ];
    }
    if (mode === "pending") {
      const du = report?.pendingDues ?? [];
      const total = du.reduce((s, d) => s + Number(d.amount || 0), 0);
      const uniq = new Set(du.map((d) => d.memberId)).size;
      const crit = du.filter((d) => d.daysOverdue > 30).length;
      const mod = du.filter((d) => d.daysOverdue >= 15 && d.daysOverdue <= 30).length;
      return [
        { label: "Total Pending Dues", value: INR(total), icon: AccountBalanceWallet, color: "error", helper: "Total uncollected amount" },
        { label: "Pending Records", value: du.length, icon: Warning, color: "warning", helper: "Unpaid line items" },
        { label: "Unique Defaulters", value: uniq, icon: People, color: "error", helper: "Members with overdue payments" },
        { label: "Critical (>30 days)", value: crit, icon: HourglassEmpty, color: "error", helper: "Over 30 days overdue" },
        { label: "Moderate (15-30 days)", value: mod, icon: TrendingUp, color: "warning", helper: "15 to 30 days overdue" },
      ];
    }
    return [];
  }, [mode, filteredEventCollections, filteredMemberContributions, report]);

  const pageTitle = { event: "Event Collections", member: "Member Contributions", pending: "Pending Dues" }[mode] || "Event Collections";

  const metricOptions = mode === "pending"
    ? [{ label: "By Event", key: "event" }, { label: "By Member", key: "member" }]
    : [
      { label: "Paid", key: "paid" },
      { label: "Expected", key: "expected" },
      { label: "Pending", key: "pending" },
      { label: "Expense", key: "expense" },
      { label: "Remaining", key: "remaining" },
    ];

  const navTabs = [
    { label: "Event Collections", path: "/reports/event-collection-audit", modeKey: "event", icon: EventIcon },
    { label: "Member Contributions", path: "/reports/member-velocity", modeKey: "member", icon: People },
  ];

  const handleExport = () => {
    if (!canExport) return;
    try {
      const eventCollectionsExport = (filteredEventCollections ?? []).map((e) => ({
        "Event Name": e.eventName,
        "Event Type": e.eventTypeName || "General",
        "Event Date": formatGridDate(e.eventDate),
        "Expected Amount": Number(e.expectedAmount || 0),
        "Paid Amount": Number(e.paidAmount || 0),
        "Pending Amount": Number(e.pendingAmount || 0),
        "Expense Amount": Number(e.expenseAmount || 0),
        "Remaining Amount": (Number(e.expectedAmount || 0) - Number(e.expenseAmount || 0)),
        "Collection Rate (%)": e.collectionRate ?? 0,
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
              : "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(248, 250, 252, 0.95) 100%)",
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
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      color: "text.primary",
                      lineHeight: 1.2,
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

          {/* Bottom Row: Unified Glass Toolbar (Navigation Tabs + Inline Filters) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 2,
              p: 1.25,
              borderRadius: "12px",
              bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.85)",
              border: "1px solid",
              borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Left: Navigation Segmented Track */}
            <Box
              sx={{
                display: "inline-flex",
                p: "3px",
                borderRadius: "10px",
                bgcolor: isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(124, 58, 237, 0.05)",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(124, 58, 237, 0.1)",
                gap: 0.5,
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
              <Box sx={{ width: { xs: "100%", sm: 110 } }}>
                <AppSelect
                  label="Year"
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  options={yearOptions}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 140 } }}>
                <AppSelect
                  label="Month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  options={monthOptions}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 165 } }}>
                <AppSelect
                  label="Event Type"
                  value={filterEventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  options={eventTypeOptions}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 185 } }}>
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
            <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }}>
              <CircularProgress size={42} thickness={4} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 600 }}>
                Loading report analytics...
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3}>

              {/* KPI Cards Grid */}
              <Grid container spacing={2}>
                {kpiCards.map((card) => (
                  <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4, lg: kpiCards.length === 6 ? 2 : Math.max(3, Math.floor(12 / kpiCards.length)) }}>
                    <StatCard {...card} />
                  </Grid>
                ))}
              </Grid>

              {/* Chart + Summary Widgets Grid */}
              <Grid container spacing={2.5}>

                {/* Visual Breakdown Panel */}
                <Grid size={{ xs: 12 }}>
                  <Card
                    sx={{
                      height: "100%",
                      borderRadius: "14px",
                      bgcolor: isDark ? "background.default" : "var(--app-surface-alt)",
                      border: "1px solid",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "var(--app-border)",
                      boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.02)",
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Stack spacing={2}>
                        {/* Header: Title + Metric Pills + Chart View Switcher */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <PieChartIcon sx={{ fontSize: 20, color: "primary.main" }} />
                            <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', fontSize: "1rem" }}>
                              Visual Breakdown
                            </Typography>
                            <Chip
                              size="small"
                              label={`${chartData.length} ${chartData.length === 1 ? "entry" : "entries"}`}
                              sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(124,58,237,0.08)", color: "text.secondary" }}
                            />
                          </Box>

                          <Box sx={{ display: "flex", gap: 1.2, alignItems: "center", flexWrap: "wrap" }}>
                            {/* Metric Selector Pills */}
                            <Box
                              sx={{
                                display: "inline-flex",
                                p: 0.3,
                                borderRadius: "8px",
                                bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(124, 58, 237, 0.06)",
                                gap: 0.3,
                              }}
                            >
                              {metricOptions.map((m) => {
                                const isSel = metric === m.key;
                                return (
                                  <ButtonBase
                                    key={m.key}
                                    onClick={() => setMetric(m.key)}
                                    sx={{
                                      px: 1.2,
                                      py: 0.4,
                                      borderRadius: "6px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      color: isSel ? "#fff" : "text.secondary",
                                      bgcolor: isSel ? "primary.main" : "transparent",
                                      transition: "all 0.18s ease",
                                      "&:hover": { color: isSel ? "#fff" : "text.primary" },
                                    }}
                                  >
                                    {m.label}
                                  </ButtonBase>
                                );
                              })}
                            </Box>

                            {/* Chart View Toggle (Pie vs Bar) */}
                            <Box
                              sx={{
                                display: "inline-flex",
                                p: 0.3,
                                borderRadius: "8px",
                                bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(124, 58, 237, 0.06)",
                                gap: 0.3,
                              }}
                            >
                              {[
                                { key: "pie", label: "Donut", Ic: PieChartIcon },
                                { key: "bar", label: "Bar", Ic: BarChartIcon },
                              ].map(({ key, label, Ic }) => {
                                const isSel = chartType === key;
                                return (
                                  <ButtonBase
                                    key={key}
                                    onClick={() => setChartType(key)}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      px: 1,
                                      py: 0.4,
                                      borderRadius: "6px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      color: isSel ? "#fff" : "text.secondary",
                                      bgcolor: isSel ? "primary.main" : "transparent",
                                      transition: "all 0.18s ease",
                                    }}
                                  >
                                    <Ic sx={{ fontSize: 14 }} />
                                    {label}
                                  </ButtonBase>
                                );
                              })}
                            </Box>
                          </Box>
                        </Box>

                        <Divider sx={{ borderColor: theme.palette.divider }} />

                        {/* Chart Render Canvas */}
                        <Box sx={{ minHeight: 310, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          {chartData.length === 0 ? (
                            <Box sx={{ py: 8, textAlign: "center" }}>
                              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                No contribution records found for the selected filter.
                              </Typography>
                            </Box>
                          ) : chartType === "pie" ? (
                            <AppPieChart items={chartData} />
                          ) : (
                            <SimpleBarChart items={chartData} />
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Data Tables Section */}
              <Box sx={{ mt: 1 }}>
                {(mode === "event" || !mode) && (
                  <AppDataTable title="Event Collections" columns={eventColumns} data={filteredEventCollections} loading={false} />
                )}
                {mode === "member" && (
                  <AppDataTable title="Member Contributions" columns={memberColumns} data={filteredMemberContributions} loading={false} />
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
                    <Typography variant="h6" fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', lineHeight: 1.2 }}>
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
