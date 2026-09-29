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
import AppSelect from "../common/AppSelect";
import dayjs from "dayjs";
import apiClient from "../../services/apiClient";
import { getContributionsAsync } from "../../services/contributionService";
import { getMembersAsync } from "../../services/memberService";
import { useAppToast } from "../common/AppToast";

export default function MemberPaymentQuickAccess({
  events = [],
  appliedFilters = {},
  initialStatus = "all", // "all" | "pending" | "paid"
  onClose = null,
  isDrawer = false,
  isMember = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toast = useAppToast();

  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState([]);
  const [reportPendingDues, setReportPendingDues] = useState([]);
  const [reportEvents, setReportEvents] = useState([]);
  const [membersMap, setMembersMap] = useState(new Map());
  const [statusFilter, setStatusFilter] = useState(initialStatus); // "all" | "pending" | "paid"
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const targetMonth = appliedFilters?.month ? Number(appliedFilters.month) : 0;
  const targetYear = appliedFilters?.year ? Number(appliedFilters.year) : 0;
  const eventTypeFilter = appliedFilters?.eventType || "ALL";

  // Readable period label (e.g. "September 2026")
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
        const reportParams = {
          month: targetMonth > 0 ? targetMonth : null,
          year: targetYear > 0 ? targetYear : null,
        };

        const [reportRes, contribRes, membersRes] = await Promise.all([
          apiClient.get("/reports/getSummaryReportAsync", { params: reportParams }).catch(() => ({ data: null })),
          getContributionsAsync().catch(() => []),
          getMembersAsync().catch(() => []),
        ]);

        if (cancelled) return;

        const reportData = (reportRes?.data && reportRes.data.data !== undefined)
          ? reportRes.data.data
          : reportRes?.data;

        const rawReportPending = Array.isArray(reportData?.pendingDues) ? reportData.pendingDues : [];
        const rawReportEvents = Array.isArray(reportData?.eventCollections) ? reportData.eventCollections : [];

        const rawContribs = Array.isArray(contribRes) ? contribRes : (contribRes?.data ?? []);
        const rawMembers = Array.isArray(membersRes) ? membersRes : (membersRes?.data ?? []);

        setReportPendingDues(rawReportPending);
        setReportEvents(rawReportEvents);
        setContributions(rawContribs);

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
          toast.error("Failed to load member payment records for selected month");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    setSelectedEventId("ALL");
    setPage(0);

    return () => {
      cancelled = true;
    };
  }, [targetMonth, targetYear, eventTypeFilter]);

  // Combined list of events for the selected month/year
  const combinedEvents = useMemo(() => {
    const list = [...(events || [])];
    const seen = new Set(
      list.map((e) => String(e.eventId || e.EventId || "").toLowerCase()).filter(Boolean)
    );
    (reportEvents || []).forEach((re) => {
      const id = String(re.eventId || re.EventId || "").toLowerCase();
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push(re);
      }
    });
    return list;
  }, [events, reportEvents]);

  // Combined and scoped contributions
  const scopedItems = useMemo(() => {
    const monthEventIdSet = new Set(
      combinedEvents.map((e) => String(e.eventId || e.EventId || "").toLowerCase()).filter(Boolean)
    );
    const monthEventNameSet = new Set(
      combinedEvents.map((e) => String(e.eventName || e.EventName || "").trim().toLowerCase()).filter(Boolean)
    );

    // Event info lookup by ID or name
    const eventInfoMap = new Map();
    combinedEvents.forEach((e) => {
      const id = String(e.eventId || e.EventId || "").toLowerCase();
      const name = String(e.eventName || e.EventName || "").trim().toLowerCase();
      const info = {
        eventId: e.eventId || e.EventId,
        eventName: e.eventName || e.EventName,
        categoryName: e.eventTypeName || e.CategoryName || e.categoryName || "--",
      };
      if (id) eventInfoMap.set(id, info);
      if (name) eventInfoMap.set(name, info);
    });

    const isMonthScoped = targetMonth > 0 || targetYear > 0;
    const itemMap = new Map();

    // 1. Process contributions from getContributionsAsync
    contributions.forEach((c) => {
      const cEventId = String(c.eventId || c.EventId || "").toLowerCase();
      const cEventName = String(c.eventName || c.EventName || "").trim().toLowerCase();

      // If scoped by month and month events exist, only include matching events
      if (isMonthScoped && combinedEvents.length > 0) {
        const matchesId = cEventId && monthEventIdSet.has(cEventId);
        const matchesName = cEventName && monthEventNameSet.has(cEventName);
        if (!matchesId && !matchesName) {
          return;
        }
      }

      const mId = String(c.MemberId || c.memberId || "").toLowerCase();
      const memberInfo = membersMap.get(mId);
      const isPaid = c.paymentStatus === 2 || String(c.paymentStatus).toLowerCase() === "paid";
      const matchedEvt = eventInfoMap.get(cEventId) || eventInfoMap.get(cEventName);

      const id = String(c.contributionId || c.ContributionId || `${mId}-${cEventId || cEventName}`);
      itemMap.set(id, {
        ...c,
        id,
        contributionId: c.contributionId || c.ContributionId,
        eventId: c.eventId || c.EventId || matchedEvt?.eventId,
        memberId: c.memberId || c.MemberId,
        memberName: c.memberName || c.MemberName || memberInfo?.name || "Unknown Member",
        memberPhone: memberInfo?.phone || memberInfo?.phoneNumber || c.phone || "--",
        memberEmail: memberInfo?.email || c.email || "--",
        eventName: c.eventName || c.EventName || matchedEvt?.eventName || "--",
        categoryName: c.categoryName || c.CategoryName || matchedEvt?.categoryName || "--",
        amount: Number(c.amount || c.Amount) || 0,
        isPaid,
        paymentDate: c.paymentDate || c.PaymentDate,
        paymentMode: c.paymentMode ?? c.PaymentMode,
      });
    });

    // 2. Ensure every pendingDue from getSummaryReportAsync for this month is included
    (reportPendingDues || []).forEach((p) => {
      const pId = String(p.contributionId || p.ContributionId || `${p.memberId}-${p.eventName}`);
      const existing = itemMap.get(pId);
      if (!existing) {
        const mId = String(p.memberId || p.MemberId || "").toLowerCase();
        const memberInfo = membersMap.get(mId);
        const pEventName = String(p.eventName || p.EventName || "").trim().toLowerCase();
        const matchedEvt = eventInfoMap.get(pEventName);

        itemMap.set(pId, {
          id: pId,
          contributionId: p.contributionId || p.ContributionId,
          eventId: matchedEvt?.eventId || null,
          memberId: p.memberId || p.MemberId,
          memberName: p.memberName || p.MemberName || memberInfo?.name || "Unknown Member",
          memberPhone: memberInfo?.phone || memberInfo?.phoneNumber || p.phone || "--",
          memberEmail: memberInfo?.email || "--",
          eventName: p.eventName || p.EventName || matchedEvt?.eventName || "--",
          categoryName: matchedEvt?.categoryName || "--",
          amount: Number(p.amount || p.Amount) || 0,
          isPaid: false,
          paymentDate: null,
          paymentMode: null,
        });
      }
    });

    let items = Array.from(itemMap.values());

    // Event Type category filter if specified
    if (eventTypeFilter && eventTypeFilter !== "ALL") {
      items = items.filter(
        (i) => (i.categoryName || "").toLowerCase() === eventTypeFilter.toLowerCase()
      );
    }

    return items;
  }, [contributions, reportPendingDues, combinedEvents, membersMap, targetMonth, targetYear, eventTypeFilter]);

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

  // Event dropdown options
  const eventOptions = useMemo(() => {
    const opts = [{ label: "All Events", value: "ALL" }];
    const seen = new Set();
    combinedEvents.forEach((e) => {
      const id = String(e.eventId || e.EventId || "");
      if (id && !seen.has(id.toLowerCase())) {
        seen.add(id.toLowerCase());
        const dateStr = (e.eventDate || e.EventDate) ? ` (${dayjs(e.eventDate || e.EventDate).format("DD MMM")})` : "";
        opts.push({ label: `${e.eventName || e.EventName}${dateStr}`, value: id });
      }
    });
    return opts;
  }, [combinedEvents]);

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

  // Handlers
  const handleExportCsv = () => {
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
              <Typography variant="h6" fontWeight={900} sx={{ fontFamily: '"Outfit", sans-serif' }}>
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
                label={`${filteredItems.length} records`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Quick access breakdown for {periodLabel} — showing who has paid and who is pending.
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
          {/* All */}
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
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                All Members
              </Typography>
              <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="h6" fontWeight={900}>
                  {stats.totalCount}
                </Typography>
                <Typography variant="body2" fontWeight={800} color="text.secondary">
                  ₹{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Stack>
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
                <Typography variant="caption" color="error.main" fontWeight={700} textTransform="uppercase">
                  Pending / Unpaid
                </Typography>
                <HourglassEmptyIcon sx={{ fontSize: 16, color: "error.main" }} />
              </Stack>
              <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="h6" fontWeight={900} color="error.main">
                  {stats.pendingCount}
                </Typography>
                <Typography variant="body2" fontWeight={800} color="error.main">
                  ₹{stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Stack>
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
                <Typography variant="caption" color="success.main" fontWeight={700} textTransform="uppercase">
                  Paid Members
                </Typography>
                <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
              </Stack>
              <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="h6" fontWeight={900} color="success.main">
                  {stats.paidCount}
                </Typography>
                <Typography variant="body2" fontWeight={800} color="success.main">
                  ₹{stats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Search and Filters Bar */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search member, phone, or event…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: 1 }}
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

          {eventOptions.length > 2 && (
            <Box sx={{ minWidth: 200 }}>
              <AppSelect
                size="small"
                value={selectedEventId}
                onChange={(e) => { setSelectedEventId(e.target.value); setPage(0); }}
                options={eventOptions}
              />
            </Box>
          )}
        </Stack>

        {/* Content Table / Loading State */}
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Loading member statuses…
            </Typography>
          </Stack>
        ) : filteredItems.length === 0 ? (
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
              No members found matching the selected criteria.
            </Typography>
          </Box>
        ) : (
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
                              variant="subtitle2"
                              fontWeight={800}
                              sx={{
                                fontFamily: '"Outfit", sans-serif',
                                color: item.isPaid ? "success.main" : "error.main",
                              }}
                            >
                              ₹{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
