import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Avatar,
  Button,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AppSelect from "../common/AppSelect";
import dayjs from "dayjs";
import { getContributionsAsync } from "../../services/contributionService";
import { getMembersAsync } from "../../services/memberService";
import { getExpensesAsync } from "../../services/expenseService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getDashboardSummaryAsync } from "../../services/dashboardService";
import { useAuth } from "../../contexts/AuthContext";
import { useAppToast } from "../common/AppToast";

export default function MemberPaymentQuickAccess({
  events = [],
  allEvents = [],
  eventTypes: propEventTypes = [],
  appliedFilters = {},
  initialStatus = "all", // "all" | "pending" | "paid"
  onClose = null,
  isDrawer = false,
  isMember = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toast = useAppToast();
  const { authState } = useAuth();

  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fallbackEvents, setFallbackEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState(propEventTypes || []);
  const [membersMap, setMembersMap] = useState(new Map());
  const [statusFilter, setStatusFilter] = useState(initialStatus); // "all" | "pending" | "paid" | "expense"
  const [search, setSearch] = useState("");
  const [selectedEventType, setSelectedEventType] = useState(appliedFilters?.eventType || "ALL");
  const [selectedEventId, setSelectedEventId] = useState(appliedFilters?.eventId || "ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const targetMonth = appliedFilters?.month ? Number(appliedFilters.month) : 0;
  const targetYear = appliedFilters?.year ? Number(appliedFilters.year) : 0;

  // Sync eventTypes prop if provided
  useEffect(() => {
    if (propEventTypes && propEventTypes.length > 0) {
      setEventTypes(propEventTypes);
    }
  }, [propEventTypes]);

  // Sync filters if appliedFilters changes
  useEffect(() => {
    setSelectedEventType(appliedFilters?.eventType || "ALL");
    setSelectedEventId(appliedFilters?.eventId || "ALL");
  }, [appliedFilters?.eventType, appliedFilters?.eventId]);

  // Format amount cleanly without forced .00 trailing decimals
  const formatAmount = (val) =>
    Number(val || 0).toLocaleString(undefined, {
      maximumFractionDigits: Number(val || 0) % 1 === 0 ? 0 : 2,
    });

  // Readable period label (e.g. "October 2026")
  const periodLabel = useMemo(() => {
    if (targetMonth > 0 && targetYear > 0) {
      return `${dayjs().month(targetMonth - 1).format("MMMM")} ${targetYear}`;
    }
    if (targetMonth > 0) {
      return dayjs().month(targetMonth - 1).format("MMMM");
    }
    if (targetYear > 0) {
      return `${targetYear}`;
    }
    return "All Time";
  }, [targetMonth, targetYear]);

  // Sync statusFilter if initialStatus changes
  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus);
      setPage(0);
    }
  }, [initialStatus]);

  // Load records based on selected month & year
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const promises = [
          getContributionsAsync().catch(() => []),
          getMembersAsync().catch(() => []),
          getExpensesAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
        ];

        // If events prop is empty and we have a target month/year, fetch dashboard summary to get the month events
        if ((!events || events.length === 0) && (!allEvents || allEvents.length === 0) && (targetMonth > 0 || targetYear > 0)) {
          promises.push(
            getDashboardSummaryAsync({
              month: targetMonth > 0 ? targetMonth : null,
              year: targetYear > 0 ? targetYear : null,
            }).catch(() => null)
          );
        }

        const [contribRes, membersRes, expensesRes, typesRes, dashRes] = await Promise.all(promises);

        if (cancelled) return;

        const rawContribs = Array.isArray(contribRes) ? contribRes : (contribRes?.data ?? []);
        const rawMembers = Array.isArray(membersRes) ? membersRes : (membersRes?.data ?? []);
        const rawExpenses = Array.isArray(expensesRes) ? expensesRes : (expensesRes?.data ?? []);
        const rawTypes = Array.isArray(typesRes) ? typesRes : (typesRes?.data ?? []);

        setContributions(rawContribs);
        setExpenses(rawExpenses);
        if (rawTypes.length > 0) {
          setEventTypes(rawTypes);
        }

        if (dashRes) {
          const dashData = dashRes?.data || dashRes;
          const uEvents = Array.isArray(dashData?.upcomingEvents) ? dashData.upcomingEvents : [];
          setFallbackEvents(uEvents);
        }

        const map = new Map();
        rawMembers.forEach((m) => {
          const id = String(m.memberId || m.MemberId || "").toLowerCase();
          if (id) {
            map.set(id, m);
          }
        });
        setMembersMap(map);
      } catch (err) {
        if (!cancelled) {
          toast.error("Failed to load member payment and expense records");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    setPage(0);

    return () => {
      cancelled = true;
    };
  }, [targetMonth, targetYear]);

  // Events for the selected month/year
  const monthEvents = useMemo(() => {
    if (Array.isArray(allEvents) && allEvents.length > 0) {
      return allEvents;
    }
    if (Array.isArray(events) && events.length > 0) {
      return events;
    }
    return fallbackEvents;
  }, [allEvents, events, fallbackEvents]);

  // Set of event IDs for the selected month/year
  const monthEventIdSet = useMemo(() => {
    return new Set(
      monthEvents.map((e) => String(e.eventId || e.EventId || "").toLowerCase()).filter(Boolean)
    );
  }, [monthEvents]);

  // Event info lookup by strictly event ID
  const eventInfoMap = useMemo(() => {
    const map = new Map();
    monthEvents.forEach((e) => {
      const id = String(e.eventId || e.EventId || "").toLowerCase();
      if (id) {
        map.set(id, {
          eventId: e.eventId || e.EventId,
          eventName: e.eventName || e.EventName || "--",
          categoryName: e.eventTypeName || e.CategoryName || e.categoryName || "--",
          eventDate: e.eventDate || e.EventDate,
        });
      }
    });
    return map;
  }, [monthEvents]);

  // Combined and scoped contributions
  const scopedItems = useMemo(() => {
    const isMonthScoped = targetMonth > 0 || targetYear > 0;
    const isFilteredByType = Boolean(selectedEventType && selectedEventType !== "ALL");
    const isMemberRole = isMember || String(authState?.role || "").toLowerCase() === "member";
    const userEmail = String(authState?.email || "").toLowerCase().trim();
    const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;

    const list = [];
    const seenContributionIds = new Set();

    contributions.forEach((c) => {
      const cId = String(c.contributionId || c.ContributionId || "");
      if (cId) {
        const lowerCId = cId.toLowerCase();
        if (seenContributionIds.has(lowerCId)) return;
        seenContributionIds.add(lowerCId);
      }

      const cEventId = String(c.eventId || c.EventId || "").toLowerCase();

      // If month/year is selected, strictly match event ID belonging to that month
      if (isMonthScoped) {
        if (!cEventId || !monthEventIdSet.has(cEventId)) {
          return;
        }
      }

      const eventInfo = eventInfoMap.get(cEventId);
      const categoryName = c.categoryName || c.CategoryName || eventInfo?.categoryName || "--";

      // Event Type category filter if specified
      if (isFilteredByType) {
        if (categoryName.toLowerCase() !== selectedEventType.toLowerCase()) {
          return;
        }
      }

      const mId = String(c.memberId || c.MemberId || "").toLowerCase();
      const memberInfo = membersMap.get(mId);

      // If Member role, only show own contributions
      if (isMemberRole) {
        const matchesMemberId = currentMemberId && mId === currentMemberId;
        const matchesEmail = userEmail && (
          String(memberInfo?.email || c.email || "").toLowerCase().trim() === userEmail
        );
        const matchesName = authState?.user?.fullName && (
          String(c.memberName || memberInfo?.name || "").toLowerCase().trim() === String(authState.user.fullName).toLowerCase().trim()
        );
        if (!matchesMemberId && !matchesEmail && !matchesName) {
          return;
        }
      }

      const isPaid = c.paymentStatus === 2 || String(c.paymentStatus).toLowerCase() === "paid" || String(c.paymentStatus).toLowerCase() === "completed";
      const amount = Number(c.amount || c.Amount) || 0;

      list.push({
        id: cId || `${mId}-${cEventId}`,
        contributionId: c.contributionId || c.ContributionId,
        eventId: c.eventId || c.EventId || eventInfo?.eventId,
        memberId: c.memberId || c.MemberId,
        memberName: c.memberName || c.MemberName || memberInfo?.name || "Unknown Member",
        memberPhone: memberInfo?.phone || memberInfo?.phoneNumber || c.phone || "--",
        memberEmail: memberInfo?.email || c.email || "--",
        eventName: c.eventName || c.EventName || eventInfo?.eventName || "--",
        categoryName,
        amount,
        isPaid,
        paymentDate: c.paymentDate || c.PaymentDate,
        paymentMode: c.paymentMode ?? c.PaymentMode,
      });
    });

    return list;
  }, [
    contributions,
    monthEventIdSet,
    eventInfoMap,
    membersMap,
    targetMonth,
    targetYear,
    selectedEventType,
    isMember,
    authState,
  ]);

  // Items scoped to selected event (if an event is chosen)
  const eventScopedItems = useMemo(() => {
    if (selectedEventId === "ALL") return scopedItems;
    const targetId = String(selectedEventId).toLowerCase();
    return scopedItems.filter((item) => {
      const itemEvtId = String(item.eventId || item.EventId || "").toLowerCase();
      return itemEvtId === targetId;
    });
  }, [scopedItems, selectedEventId]);

  // Aggregate stats (dynamically reflects the chosen event's paid vs unpaid totals)
  const stats = useMemo(() => {
    const totalCount = eventScopedItems.length;
    const paidItems = eventScopedItems.filter((i) => i.isPaid);
    const pendingItems = eventScopedItems.filter((i) => !i.isPaid);

    const totalAmount = eventScopedItems.reduce((s, i) => s + i.amount, 0);
    const paidAmount = paidItems.reduce((s, i) => s + i.amount, 0);
    const pendingAmount = pendingItems.reduce((s, i) => s + i.amount, 0);

    return {
      totalCount,
      paidCount: paidItems.length,
      pendingCount: pendingItems.length,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [eventScopedItems]);

  // Event Type dropdown options
  const eventTypeOptions = useMemo(() => {
    const opts = [{ label: "All Event Types", value: "ALL" }];
    const seen = new Set();

    (eventTypes || []).forEach((t) => {
      const name = t.eventTypeName || t.name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        opts.push({ label: name, value: name });
      }
    });

    monthEvents.forEach((e) => {
      const tName = e.eventTypeName || e.CategoryName || e.categoryName;
      if (tName && !seen.has(tName.toLowerCase())) {
        seen.add(tName.toLowerCase());
        opts.push({ label: tName, value: tName });
      }
    });

    return opts;
  }, [eventTypes, monthEvents]);

  // Event dropdown options (cascading from selectedEventType)
  const eventOptions = useMemo(() => {
    const opts = [{ label: "All Events", value: "ALL" }];
    const seen = new Set();
    const isFilteredByType = Boolean(selectedEventType && selectedEventType !== "ALL");
    const matchingEvents = isFilteredByType
      ? monthEvents.filter((e) => {
          const tName = e.eventTypeName || e.CategoryName || e.categoryName || "";
          return tName.toLowerCase() === selectedEventType.toLowerCase();
        })
      : monthEvents;

    matchingEvents.forEach((e) => {
      const id = String(e.eventId || e.EventId || "");
      if (id && !seen.has(id.toLowerCase())) {
        seen.add(id.toLowerCase());
        const dateStr = (e.eventDate || e.EventDate) ? ` (${dayjs(e.eventDate || e.EventDate).format("DD MMM")})` : "";
        opts.push({ label: `${e.eventName || e.EventName}${dateStr}`, value: id });
      }
    });
    return opts;
  }, [monthEvents, selectedEventType]);

  // Filter expenses strictly against the selected event (or month's events / event type) - ONLY include verified expenses
  const eventScopedExpenses = useMemo(() => {
    const verifiedExpenses = (expenses || []).filter((exp) => {
      const s = (exp?.status || "").trim().toLowerCase();
      return s.includes("verif") || s.includes("approv") || s.includes("paid");
    });

    // If a specific event is selected, filter strictly against that event's name
    if (selectedEventId !== "ALL") {
      const selectedEvent = monthEvents.find(
        (e) => String(e.eventId || e.EventId || "").toLowerCase() === String(selectedEventId).toLowerCase()
      );
      const selectedName = (selectedEvent?.eventName || selectedEvent?.EventName || "").trim().toLowerCase();
      if (!selectedName) return [];
      return verifiedExpenses.filter(
        (exp) => (exp.eventName || "").trim().toLowerCase() === selectedName
      );
    }

    // Filter by Event Type if selected
    const isFilteredByType = Boolean(selectedEventType && selectedEventType !== "ALL");
    const matchingMonthEvents = isFilteredByType
      ? monthEvents.filter((e) => (e.eventTypeName || e.CategoryName || e.categoryName || "").toLowerCase() === selectedEventType.toLowerCase())
      : monthEvents;

    const matchingEventNames = new Set(
      matchingMonthEvents.map((e) => (e.eventName || e.EventName || "").trim().toLowerCase()).filter(Boolean)
    );
    const isMonthScoped = targetMonth > 0 || targetYear > 0;

    return verifiedExpenses.filter((exp) => {
      const expEvtName = (exp.eventName || "").trim().toLowerCase();
      if (matchingEventNames.has(expEvtName)) return true;
      if (isFilteredByType) return false;

      if (isMonthScoped && exp.expenseDate) {
        const d = dayjs(exp.expenseDate);
        if (targetMonth > 0 && d.month() + 1 !== targetMonth) return false;
        if (targetYear > 0 && d.year() !== targetYear) return false;
        return true;
      }

      return !isMonthScoped;
    });
  }, [expenses, selectedEventId, selectedEventType, monthEvents, targetMonth, targetYear]);

  const expenseTotal = useMemo(() => {
    return eventScopedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [eventScopedExpenses]);

  // Filtered expenses by Search within the selected event
  const filteredExpenses = useMemo(() => {
    return eventScopedExpenses.filter((item) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const cat = (item.category || "").toLowerCase();
        const evt = (item.eventName || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const sub = (item.submittedBy || "").toLowerCase();
        if (!cat.includes(q) && !evt.includes(q) && !desc.includes(q) && !sub.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [eventScopedExpenses, search]);

  // Filtered by Status and Search within the selected event
  const filteredItems = useMemo(() => {
    return eventScopedItems.filter((item) => {
      // Status filter
      if (statusFilter === "paid" && !item.isPaid) return false;
      if (statusFilter === "pending" && item.isPaid) return false;

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const mName = (item.memberName || "").toLowerCase();
        const eName = (item.eventName || "").toLowerCase();
        const phone = (item.memberPhone || "").toLowerCase();
        const cat = (item.categoryName || "").toLowerCase();
        if (!mName.includes(q) && !eName.includes(q) && !phone.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [eventScopedItems, statusFilter, search]);

  const activeCount = statusFilter === "expense" ? filteredExpenses.length : filteredItems.length;

  // Handlers
  const handleExportCsv = () => {
    if (statusFilter === "expense") {
      if (filteredExpenses.length === 0) {
        toast.info("No expense records to export");
        return;
      }
      const headers = ["Category", "Event", "Amount", "Expense Date", "Submitted By", "Description"];
      const rows = filteredExpenses.map((i) => [
        `"${(i.category || "").replace(/"/g, '""')}"`,
        `"${(i.eventName || "").replace(/"/g, '""')}"`,
        Number(i.amount) || 0,
        i.expenseDate ? dayjs(i.expenseDate).format("YYYY-MM-DD") : "",
        `"${(i.submittedBy || "").replace(/"/g, '""')}"`,
        `"${(i.description || "").replace(/"/g, '""')}"`,
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `event_expenses_${periodLabel.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Expense CSV export downloaded");
      return;
    }

    if (filteredItems.length === 0) {
      toast.info("No records to export");
      return;
    }
    const headers = ["Member Name", "Phone", "Email", "Event", "Category", "Amount", "Status", "Payment Date"];
    const rows = filteredItems.map((i) => [
      `"${i.memberName.replace(/"/g, '""')}"`,
      `"${i.memberPhone}"`,
      `"${i.memberEmail}"`,
      `"${i.eventName.replace(/"/g, '""')}"`,
      `"${i.categoryName}"`,
      i.amount,
      i.isPaid ? "Paid" : "Pending",
      i.paymentDate ? new Date(i.paymentDate).toLocaleDateString() : "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `member_payment_status_${statusFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded");
  };

  // Avatar colors helper
  const getAvatarBg = (name = "") => {
    const colors = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Card
      sx={{
        borderRadius: isDrawer ? 0 : 2.5,
        border: isDrawer ? "none" : `1px solid ${theme.palette.divider}`,
        bgcolor: isDark ? "background.paper" : "#ffffff",
        boxShadow: isDrawer ? "none" : isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.04)",
        height: isDrawer ? "100%" : "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 }, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header Bar */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          gap={1.5}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.1875rem", letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                Member Payment Status
              </Typography>
              <Chip
                label={periodLabel}
                size="small"
                color="primary"
                variant="outlined"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  borderRadius: 1.5,
                }}
              />
              <Chip
                label={`${activeCount} records`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Quick access breakdown for {periodLabel} — showing who has paid and pending dues.
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
              onClick={handleExportCsv}
              sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem", borderRadius: 2 }}
            >
              Export CSV
            </Button>
            {onClose && (
              <IconButton size="small" onClick={onClose} sx={{ ml: 0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* Status Filter Pills Banner */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {/* Total Expected Amount */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              onClick={() => { setStatusFilter("all"); setPage(0); }}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border: "1.5px solid",
                borderColor: statusFilter === "all" ? "primary.main" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                bgcolor: statusFilter === "all"
                  ? isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.08)
                  : isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" sx={{ fontSize: "0.78125rem", letterSpacing: "0.04em" }}>
                Total Expected Amount
              </Typography>
              <Box sx={{ mt: 0.75 }}>
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", sm: "1.375rem" }, letterSpacing: "-0.02em", color: isDark ? "#ffffff" : "#0f172a", lineHeight: 1.2 }}>
                  ₹{formatAmount(stats.totalAmount)}
                </Typography>
                <Typography variant="caption" fontWeight={400} color="text.secondary" sx={{ display: "block", mt: 0.35, fontSize: "0.75rem", lineHeight: 1.4 }}>
                  {stats.totalCount} Members
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Pending / Unpaid */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              onClick={() => { setStatusFilter("pending"); setPage(0); }}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border: "1.5px solid",
                borderColor: statusFilter === "pending" ? "#ef4444" : isDark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)",
                bgcolor: statusFilter === "pending"
                  ? isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.08)"
                  : isDark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.03)",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#ef4444" },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="error.main" fontWeight={600} textTransform="uppercase" sx={{ fontSize: "0.78125rem", letterSpacing: "0.04em" }}>
                  Pending / Unpaid
                </Typography>
                <HourglassEmptyIcon sx={{ fontSize: 16, color: "error.main" }} />
              </Stack>
              <Box sx={{ mt: 0.75 }}>
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", sm: "1.375rem" }, letterSpacing: "-0.02em", color: isDark ? "#ffffff" : "#0f172a", lineHeight: 1.2 }}>
                  ₹{formatAmount(stats.pendingAmount)}
                </Typography>
                <Typography variant="caption" fontWeight={400} color="error.main" sx={{ display: "block", mt: 0.35, fontSize: "0.75rem", lineHeight: 1.4 }}>
                  {stats.pendingCount} Members
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Paid */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              onClick={() => { setStatusFilter("paid"); setPage(0); }}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border: "1.5px solid",
                borderColor: statusFilter === "paid" ? "#10b981" : isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.2)",
                bgcolor: statusFilter === "paid"
                  ? isDark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.08)"
                  : isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.03)",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#10b981" },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="success.main" fontWeight={600} textTransform="uppercase" sx={{ fontSize: "0.78125rem", letterSpacing: "0.04em" }}>
                  Paid Members
                </Typography>
                <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
              </Stack>
              <Box sx={{ mt: 0.75 }}>
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", sm: "1.375rem" }, letterSpacing: "-0.02em", color: isDark ? "#ffffff" : "#0f172a", lineHeight: 1.2 }}>
                  ₹{formatAmount(stats.paidAmount)}
                </Typography>
                <Typography variant="caption" fontWeight={400} color="success.main" sx={{ display: "block", mt: 0.35, fontSize: "0.75rem", lineHeight: 1.4 }}>
                  {stats.paidCount} Members
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Search and Filters Bar */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ sm: "center" }}
          sx={{ mb: 2 }}
        >
          <TextField
            size="small"
            placeholder={statusFilter === "expense" ? "Search expense category, event, or description…" : "Search member, phone, or event…"}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: 1, minWidth: { xs: "100%", sm: 200 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box sx={{ minWidth: { xs: "100%", sm: 165 } }}>
            <AppSelect
              size="small"
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setSelectedEventId("ALL");
                setPage(0);
              }}
              options={eventTypeOptions}
            />
          </Box>

          <Box sx={{ minWidth: { xs: "100%", sm: 195 } }}>
            <AppSelect
              size="small"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setPage(0);
              }}
              options={eventOptions}
            />
          </Box>
        </Stack>

        {/* Content Table / Loading State */}
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Loading records…
            </Typography>
          </Stack>
        ) : activeCount === 0 ? (
          <Box
            sx={{
              py: 8,
              textAlign: "center",
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 2,
              color: "text.secondary",
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {statusFilter === "expense"
                ? "No expenses found matching the selected criteria."
                : "No members found matching the selected criteria."}
            </Typography>
          </Box>
        ) : statusFilter === "expense" ? (
          /* Expense Table */
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                flex: 1,
                maxHeight: isDrawer ? "calc(100vh - 360px)" : 460,
                overflowY: "auto",
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Expense / Category</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Event</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Expense Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExpenses
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item, idx) => {
                      const avatarBg = getAvatarBg(item.category || item.eventName || "Expense");
                      const initial = (item.category || "E").charAt(0).toUpperCase();

                      return (
                        <TableRow
                          key={item.expenseId || idx}
                          hover
                          sx={{
                            "&:hover": {
                              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(245,158,11,0.03)",
                            },
                          }}
                        >
                          {/* Expense / Category */}
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: "0.8rem",
                                  fontWeight: 800,
                                  bgcolor: avatarBg,
                                  color: "#ffffff",
                                }}
                              >
                                {initial}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={700} color="text.primary">
                                  {item.category || "General Expense"}
                                </Typography>
                                {item.description && (
                                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: "block" }}>
                                    {item.description}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* Event */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="text.primary" noWrap sx={{ maxWidth: 220 }}>
                              {item.eventName || "--"}
                            </Typography>
                          </TableCell>

                          {/* Amount */}
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{
                                color: "text.primary",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              ₹{formatAmount(item.amount)}
                            </Typography>
                          </TableCell>

                          {/* Details */}
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {item.expenseDate ? dayjs(item.expenseDate).format("DD MMM YYYY") : "--"}
                              {item.submittedBy ? ` • ${item.submittedBy}` : ""}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={filteredExpenses.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ borderTop: `1px solid ${theme.palette.divider}`, mt: 1 }}
            />
          </>
        ) : (
          /* Member Payments Table */
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                flex: 1,
                maxHeight: isDrawer ? "calc(100vh - 360px)" : 460,
                overflowY: "auto",
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Member</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Event</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Amount</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem" }}>Payment Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item, idx) => {
                      const avatarBg = getAvatarBg(item.memberName);
                      const initial = (item.memberName || "U").charAt(0).toUpperCase();

                      return (
                        <TableRow
                          key={item.id || idx}
                          hover
                          sx={{
                            "&:hover": {
                              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(124,58,237,0.03)",
                            },
                          }}
                        >
                          {/* Member */}
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: "0.8rem",
                                  fontWeight: 800,
                                  bgcolor: avatarBg,
                                  color: "#ffffff",
                                }}
                              >
                                {initial}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={700} color="text.primary">
                                  {item.memberName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                                >
                                  {item.memberPhone !== "--" && (
                                    <span>{item.memberPhone}</span>
                                  )}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* Event */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="text.primary" noWrap sx={{ maxWidth: 220 }}>
                              {item.eventName}
                            </Typography>
                            {item.categoryName && item.categoryName !== "--" && (
                              <Chip
                                label={item.categoryName}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  mt: 0.25,
                                  bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                }}
                              />
                            )}
                          </TableCell>

                          {/* Amount */}
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{
                                color: "text.primary",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              ₹{formatAmount(item.amount)}
                            </Typography>
                          </TableCell>

                          {/* Status */}
                          <TableCell align="center">
                            {item.isPaid ? (
                              <Chip
                                icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                                label="Paid"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  bgcolor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)",
                                  color: "#10b981",
                                  border: "1px solid rgba(16,185,129,0.35)",
                                }}
                              />
                            ) : (
                              <Chip
                                icon={<HourglassEmptyIcon sx={{ fontSize: "14px !important" }} />}
                                label="Pending"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  bgcolor: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)",
                                  color: "#ef4444",
                                  border: "1px solid rgba(239,68,68,0.35)",
                                }}
                              />
                            )}
                          </TableCell>

                          {/* Payment Details */}
                          <TableCell>
                            {item.isPaid ? (
                              <Typography variant="caption" color="text.secondary">
                                {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : "Completed"}
                                {item.paymentMode ? ` • ${item.paymentMode}` : ""}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Outstanding
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={filteredItems.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ borderTop: `1px solid ${theme.palette.divider}`, mt: 1 }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
