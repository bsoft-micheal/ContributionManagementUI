import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Chip,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Tooltip,
  TableFooter,
  ButtonBase,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  RestartAlt as RestartAltIcon,
  FileDownload as FileDownloadIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HelpOutline as HelpOutlineIcon,
  OpenInNew as OpenInNewIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import AppSelect from "../common/AppSelect";
import AppButton from "../common/AppButton";
import { exportSheets } from "../../utils/exportToExcel";
import { formatGridDate } from "../../utils/dateHelper";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ─── Rupee formatter ─── */
const INR = (n) => "\u20B9" + Number(n || 0).toLocaleString();

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function AnnualMemberMatrix({
  report,
  usersList = [],
  eventsList = [],
  eventTypesList = [],
  isMember = false,
  currentUserId,
  currentUserName,
  onOpenMemberDetails,
  onExportTrigger,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  /* ── Filter States ── */
  const currentYear = dayjs().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [filterWorkType, setFilterWorkType] = useState("ALL");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("ALL");
  const [viewMetric, setViewMetric] = useState("paid"); // "paid" | "pending" | "expected"

  /* ── Collect Available Years Dynamically ── */
  const availableYears = useMemo(() => {
    const yrSet = new Set([currentYear, currentYear - 1, currentYear - 2]);

    (report?.memberContributionHistory || []).forEach((m) => {
      (m.events || []).forEach((ev) => {
        const d = ev.eventDate || ev.paymentDate || ev.createdAt;
        if (d && dayjs(d).isValid()) {
          yrSet.add(dayjs(d).year());
        }
      });
    });

    (eventsList || []).forEach((ev) => {
      const d = ev.eventDate || ev.startDate || ev.createdAt;
      if (d && dayjs(d).isValid()) {
        yrSet.add(dayjs(d).year());
      }
    });

    return Array.from(yrSet)
      .sort((a, b) => b - a)
      .map((y) => ({ label: String(y), value: y }));
  }, [report, eventsList, currentYear]);

  /* ── Event Type Options ── */
  const eventTypeOptions = useMemo(() => {
    const set = new Set();
    (eventTypesList || []).forEach((et) => {
      if (et.eventTypeName) set.add(et.eventTypeName.trim());
    });
    (report?.eventCollections || []).forEach((ec) => {
      if (ec.eventTypeName) set.add(ec.eventTypeName.trim());
    });
    const list = [{ label: "All Event Types", value: "ALL" }];
    Array.from(set).sort().forEach((name) => list.push({ label: name, value: name }));
    return list;
  }, [eventTypesList, report?.eventCollections]);

  /* ── Work Type Options ── */
  const workTypeOptions = [
    { label: "All Work Types", value: "ALL" },
    { label: "Office", value: "Office" },
    { label: "WFH", value: "WFH" },
    { label: "Hybrid", value: "Hybrid" },
  ];

  /* ── Payment Status Options ── */
  const paymentStatusOptions = [
    { label: "All Statuses", value: "ALL" },
    { label: "Fully Settled (Paid)", value: "PAID" },
    { label: "Has Pending Dues", value: "PENDING" },
    { label: "Zero / No Events", value: "NO_EVENTS" },
  ];

  /* ── View Metric Options ── */
  const viewMetricOptions = [
    { label: "Paid (₹)", value: "paid" },
    { label: "Pending (₹)", value: "pending" },
    { label: "Expected (₹)", value: "expected" },
  ];

  /* ── Helpers to Resolve Event Metadata ── */
  const resolveCategory = useCallback((ev) => {
    if (!ev) return "General";
    if (ev.categoryName && ev.categoryName.trim()) return ev.categoryName.trim();
    if (ev.eventTypeName && ev.eventTypeName.trim()) return ev.eventTypeName.trim();
    if (ev.eventType && ev.eventType.trim()) return ev.eventType.trim();
    const match = (eventsList || []).find(
      (el) => (el.eventId && ev.eventId && String(el.eventId) === String(ev.eventId)) ||
              ((el.eventName || el.name || "").trim().toLowerCase() === (ev.eventName || "").trim().toLowerCase())
    );
    return match?.eventTypeName || match?.category || match?.categoryName || "General";
  }, [eventsList]);

  const resolveEvName = useCallback((ev) => {
    if (!ev) return "Event";
    if (ev.eventName && ev.eventName.trim()) return ev.eventName.trim();
    if (ev.name && ev.name.trim()) return ev.name.trim();
    return "Event";
  }, []);

  /* ── Build Matrix Dataset (All Members x 12 Months) ── */
  const matrixData = useMemo(() => {
    const memberHistory = report?.memberContributionHistory || [];

    // Map existing member history for quick lookup by ID or normalized Name
    const historyMap = new Map();
    memberHistory.forEach((m) => {
      if (m.memberId) historyMap.set(String(m.memberId).toLowerCase(), m);
      if (m.memberName) historyMap.set(m.memberName.trim().toLowerCase(), m);
    });

    // Create a unified master list of all members
    const memberPool = [];
    const processedIds = new Set();
    const processedNames = new Set();

    // 1. Add all active registered users from usersList
    (usersList || []).forEach((u) => {
      const uId = String(u.userId || u.id || "").toLowerCase();
      const uName = String(u.fullName || u.username || "").trim();
      const uNameKey = uName.toLowerCase();

      if (!uName) return;
      processedIds.add(uId);
      processedNames.add(uNameKey);

      const hist = historyMap.get(uId) || historyMap.get(uNameKey) || null;

      memberPool.push({
        memberId: u.userId || u.id || hist?.memberId,
        memberName: u.fullName || hist?.memberName || u.username,
        username: u.username || "",
        email: u.email || "",
        workType: u.workType || "Office",
        roleName: u.roleName || "Member",
        isActive: u.isActive !== false,
        rawEvents: hist?.events || [],
      });
    });

    // 2. Add any members present in contribution history not in usersList
    memberHistory.forEach((m) => {
      const mId = String(m.memberId || "").toLowerCase();
      const mName = String(m.memberName || "").trim().toLowerCase();

      if ((!mId || !processedIds.has(mId)) && (!mName || !processedNames.has(mName))) {
        memberPool.push({
          memberId: m.memberId,
          memberName: m.memberName || "Unknown Member",
          username: "",
          email: "",
          workType: m.department || "Office",
          roleName: "Member",
          isActive: true,
          rawEvents: m.events || [],
        });
        if (mId) processedIds.add(mId);
        if (mName) processedNames.add(mName);
      }
    });

    // 3. If logged-in user is 'Member', only show their record
    let targetPool = memberPool;
    if (isMember) {
      targetPool = memberPool.filter((m) => {
        if (currentUserId && String(m.memberId).toLowerCase() === String(currentUserId).toLowerCase()) return true;
        if (currentUserName && m.memberName.toLowerCase().includes(currentUserName.toLowerCase())) return true;
        return false;
      });
    }

    // 4. Process each member against the 12 calendar months for selectedYear & filters
    const yearNum = Number(selectedYear);

    const rows = targetPool.map((m) => {
      // Initialize 12 monthly slots (month 1 = index 0 .. month 12 = index 11)
      const months = Array.from({ length: 12 }, (_, i) => ({
        monthNumber: i + 1,
        monthName: MONTH_NAMES[i],
        monthShort: MONTH_SHORT[i],
        events: [],
        totalExpected: 0,
        totalPaid: 0,
        totalPending: 0,
        status: "none", // "none" | "paid" | "pending" | "partial"
      }));

      let totalAnnualExpected = 0;
      let totalAnnualPaid = 0;
      let totalAnnualPending = 0;
      let annualEventsCount = 0;

      (m.rawEvents || []).forEach((ev) => {
        const evDate = ev.eventDate || ev.paymentDate || ev.createdAt;
        if (!evDate || !dayjs(evDate).isValid()) return;

        const d = dayjs(evDate);
        if (d.year() !== yearNum) return;

        // Event Type filter
        const evType = resolveCategory(ev);
        if (filterEventType !== "ALL" && evType.toLowerCase() !== filterEventType.toLowerCase()) {
          return;
        }

        const mIdx = d.month(); // 0-indexed
        if (mIdx < 0 || mIdx > 11) return;

        const exp = Number(ev.expectedAmount ?? ev.amount ?? 0);
        const paid = Number(ev.paidAmount ?? ((ev.paymentStatus || "").toLowerCase() === "paid" ? exp : 0));
        const pend = Math.max(0, exp - paid);

        const eventDetail = {
          ...ev,
          eventName: resolveEvName(ev),
          categoryName: evType,
          formattedDate: formatGridDate(evDate),
          expectedAmount: exp,
          paidAmount: paid,
          pendingAmount: pend,
          isPaid: (ev.paymentStatus || "").toLowerCase() === "paid" || (paid >= exp && exp > 0),
        };

        months[mIdx].events.push(eventDetail);
        months[mIdx].totalExpected += exp;
        months[mIdx].totalPaid += paid;
        months[mIdx].totalPending += pend;

        totalAnnualExpected += exp;
        totalAnnualPaid += paid;
        totalAnnualPending += pend;
        annualEventsCount += 1;
      });

      // Compute monthly statuses
      months.forEach((mo) => {
        if (mo.totalExpected === 0) {
          mo.status = "none";
        } else if (mo.totalPaid >= mo.totalExpected) {
          mo.status = "paid";
        } else if (mo.totalPaid === 0) {
          mo.status = "pending";
        } else {
          mo.status = "partial";
        }
      });

      const complianceRate = totalAnnualExpected > 0
        ? Math.min(100, Math.round((totalAnnualPaid / totalAnnualExpected) * 100))
        : 100;

      let annualStatus = "none";
      if (totalAnnualExpected === 0) {
        annualStatus = "NO_EVENTS";
      } else if (totalAnnualPending === 0) {
        annualStatus = "PAID";
      } else {
        annualStatus = "PENDING";
      }

      return {
        ...m,
        months,
        totalAnnualExpected,
        totalAnnualPaid,
        totalAnnualPending,
        annualEventsCount,
        complianceRate,
        annualStatus,
      };
    });

    // 5. Apply Fine-Tuning Filters (Search, WorkType, ComplianceStatus)
    return rows.filter((r) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = r.memberName.toLowerCase().includes(q);
        const matchEmail = (r.email || "").toLowerCase().includes(q);
        const matchUser = (r.username || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUser) return false;
      }

      // Work type
      if (filterWorkType !== "ALL") {
        if ((r.workType || "").toLowerCase() !== filterWorkType.toLowerCase()) return false;
      }

      // Payment status
      if (filterPaymentStatus !== "ALL") {
        if (filterPaymentStatus === "PAID" && (r.annualStatus !== "PAID" || r.totalAnnualExpected === 0)) return false;
        if (filterPaymentStatus === "PENDING" && r.annualStatus !== "PENDING") return false;
        if (filterPaymentStatus === "NO_EVENTS" && r.annualStatus !== "NO_EVENTS") return false;
      }

      return true;
    }).sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [
    report,
    usersList,
    selectedYear,
    filterEventType,
    filterWorkType,
    filterPaymentStatus,
    searchTerm,
    isMember,
    currentUserId,
    currentUserName,
    resolveCategory,
    resolveEvName,
  ]);

  /* ── Grand Monthly & Annual Totals ── */
  const summaryTotals = useMemo(() => {
    const monthly = Array.from({ length: 12 }, () => ({
      expected: 0,
      paid: 0,
      pending: 0,
      count: 0,
    }));

    let grandExpected = 0;
    let grandPaid = 0;
    let grandPending = 0;

    matrixData.forEach((row) => {
      row.months.forEach((mo, idx) => {
        monthly[idx].expected += mo.totalExpected;
        monthly[idx].paid += mo.totalPaid;
        monthly[idx].pending += mo.totalPending;
        if (mo.totalExpected > 0) monthly[idx].count += 1;
      });
      grandExpected += row.totalAnnualExpected;
      grandPaid += row.totalPaidAmount || row.totalAnnualPaid;
      grandPending += row.totalAnnualPending;
    });

    return {
      monthly,
      grandExpected,
      grandPaid,
      grandPending,
      totalMembers: matrixData.length,
    };
  }, [matrixData]);

  /* ── Export to Excel ── */
  const handleExportMatrix = () => {
    if (!matrixData || matrixData.length === 0) return;

    // Sheet 1: Matrix Overview
    const matrixSheet = matrixData.map((r) => {
      const row = {
        "Member Name": r.memberName,
        "Email": r.email || "—",
        "Work Type": r.workType || "Office",
      };

      r.months.forEach((m) => {
        row[m.monthShort] = viewMetric === "pending"
          ? m.totalPending
          : viewMetric === "expected"
            ? m.totalExpected
            : m.totalPaid;
      });

      row["Total Paid"] = r.totalAnnualPaid;
      row["Total Pending"] = r.totalAnnualPending;
      row["Status"] = r.annualStatus === "PAID" ? "Fully Settled" : (r.annualStatus === "PENDING" ? "Has Pending Dues" : "No Events");

      return row;
    });

    // Summary row
    const totalsRow = {
      "Member Name": "MONTHLY TOTALS",
      "Email": "—",
      "Work Type": "—",
    };
    summaryTotals.monthly.forEach((m, idx) => {
      totalsRow[MONTH_SHORT[idx]] = viewMetric === "pending"
        ? m.pending
        : viewMetric === "expected"
          ? m.expected
          : m.paid;
    });
    totalsRow["Total Paid"] = summaryTotals.grandPaid;
    totalsRow["Total Pending"] = summaryTotals.grandPending;
    totalsRow["Status"] = "OVERALL";
    matrixSheet.push(totalsRow);

    exportSheets(`annual-member-matrix-${selectedYear}.xlsx`, [
      { name: `Matrix ${selectedYear}`, data: matrixSheet },
    ]);
  };

  /* ── Reset Filters ── */
  const handleResetFilters = () => {
    setSelectedYear(currentYear);
    setSearchTerm("");
    setFilterEventType("ALL");
    setFilterWorkType("ALL");
    setFilterPaymentStatus("ALL");
    setViewMetric("paid");
  };

  /* ── Render Cell Content for a Month ── */
  const renderMonthCell = (monthData) => {
    if (monthData.status === "none" || monthData.totalExpected === 0) {
      return (
        <Typography
          variant="body2"
          sx={{
            color: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1",
            fontWeight: 500,
            textAlign: "center",
            userSelect: "none",
          }}
        >
          —
        </Typography>
      );
    }

    const valueToDisplay = viewMetric === "pending"
      ? monthData.totalPending
      : viewMetric === "expected"
        ? monthData.totalExpected
        : monthData.totalPaid;

    let badgeBg = isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)";
    let badgeColor = isDark ? "#34d399" : "#059669";
    let badgeBorder = isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.25)";

    if (monthData.status === "pending") {
      badgeBg = isDark ? "rgba(244, 63, 94, 0.15)" : "rgba(244, 63, 94, 0.1)";
      badgeColor = isDark ? "#fb7185" : "#e11d48";
      badgeBorder = isDark ? "rgba(244, 63, 94, 0.3)" : "rgba(244, 63, 94, 0.25)";
    } else if (monthData.status === "partial") {
      badgeBg = isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)";
      badgeColor = isDark ? "#fbbf24" : "#d97706";
      badgeBorder = isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)";
    }

    // Rich Tooltip content
    const tooltipContent = (
      <Box sx={{ p: 1, maxWidth: 300 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.15)", pb: 0.5, mb: 1 }}>
          {monthData.monthName} {selectedYear}
        </Typography>
        <Stack spacing={1}>
          {monthData.events.map((ev, i) => (
            <Box key={i} sx={{ fontSize: "0.75rem", lineHeight: 1.4 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#fff", fontSize: "0.8rem" }}>
                {ev.eventName}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)", mt: 0.25 }}>
                <span>Type: {ev.categoryName}</span>
                <span>{ev.formattedDate}</span>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                <span style={{ color: "rgba(255,255,255,0.8)" }}>Expected: {INR(ev.expectedAmount)}</span>
                <span style={{ color: ev.isPaid ? "#34d399" : "#fb7185", fontWeight: 700 }}>
                  {ev.isPaid ? `Paid: ${INR(ev.paidAmount)}` : `Due: ${INR(ev.pendingAmount)}`}
                </span>
              </Box>
              {ev.paymentMode && (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                  Mode: {ev.paymentMode} {ev.paymentDate ? `(${formatGridDate(ev.paymentDate)})` : ""}
                </Typography>
              )}
              {i < monthData.events.length - 1 && <Divider sx={{ my: 0.5, borderColor: "rgba(255,255,255,0.1)" }} />}
            </Box>
          ))}
        </Stack>
      </Box>
    );

    return (
      <Tooltip title={tooltipContent} arrow placement="top" enterDelay={150}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            px: 1,
            py: 0.35,
            borderRadius: "6px",
            bgcolor: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            fontSize: "0.76rem",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            transition: "all 0.15s ease-in-out",
            "&:hover": {
              transform: "scale(1.08)",
              boxShadow: `0 2px 8px ${badgeBorder}`,
            },
          }}
        >
          {INR(valueToDisplay)}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* ── Matrix Controls / Fine-Tuning Bar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: "14px",
          bgcolor: isDark ? "rgba(30, 26, 46, 0.4)" : "#ffffff",
          border: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.07)" : "#e2e8f0",
          boxShadow: isDark ? "none" : "0 2px 8px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* Top Header: Title, Badges & Display Mode Selector */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            mb: 2,
            pb: 1.5,
            borderBottom: "1px solid",
            borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                bgcolor: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1.05rem", color: "text.primary" }}>
              Annual Contribution Matrix
            </Typography>
            <Chip
              size="small"
              label={selectedYear}
              sx={{
                fontWeight: 800,
                fontSize: "0.72rem",
                bgcolor: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                color: "primary.main",
                borderRadius: "6px",
                height: 22,
              }}
            />
            <Chip
              size="small"
              label={`${matrixData.length} Members`}
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                borderRadius: "6px",
                height: 22,
                bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                color: "text.secondary",
              }}
            />
          </Box>

          {/* Metric View Mode Toggle (Paid vs Pending vs Expected) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", fontSize: "0.68rem" }}>
              Display Mode:
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                p: "3px",
                borderRadius: "8px",
                bgcolor: isDark ? "rgba(0, 0, 0, 0.3)" : "#f1f5f9",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#e2e8f0",
              }}
            >
              {viewMetricOptions.map((opt) => (
                <ButtonBase
                  key={opt.value}
                  onClick={() => setViewMetric(opt.value)}
                  sx={{
                    px: 1.5,
                    py: 0.45,
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: viewMetric === opt.value ? 700 : 600,
                    color: viewMetric === opt.value
                      ? "#ffffff"
                      : isDark ? "text.secondary" : "#64748b",
                    bgcolor: viewMetric === opt.value
                      ? "#6366f1"
                      : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.label}
                </ButtonBase>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Filter Controls Row: Unified, perfectly aligned */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          {/* 1. Member Search Input */}
          <Box sx={{ width: { xs: "100%", sm: 220, md: 240 } }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 0.5,
                fontWeight: 600,
                color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                textTransform: "none",
                letterSpacing: "0.01em",
                fontSize: "0.78125rem",
              }}
            >
              Search Member
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  height: 34,
                  fontSize: "0.82rem",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "background.paper"),
                  "& fieldset": {
                    borderColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(231, 235, 247, 0.25)"
                        : "rgba(74, 63, 107, 0.28)",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(157, 140, 230, 0.75)"
                        : "#6f5bd3",
                    borderWidth: "1.5px",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "#9d8ce6" : "#6f5bd3",
                    borderWidth: "2px",
                  },
                },
              }}
            />
          </Box>

          {/* 2. Year Selector */}
          <Box sx={{ width: { xs: "100%", sm: 110, md: 120 } }}>
            <AppSelect
              label="Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={availableYears}
              allowClear={false}
              clearable={false}
            />
          </Box>

          {/* 3. Event Type Filter */}
          <Box sx={{ width: { xs: "100%", sm: 170, md: 190 } }}>
            <AppSelect
              label="Event Type"
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              options={eventTypeOptions}
            />
          </Box>

          {/* 4. Work Type Filter */}
          <Box sx={{ width: { xs: "100%", sm: 130, md: 140 } }}>
            <AppSelect
              label="Work Type"
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              options={workTypeOptions}
            />
          </Box>

          {/* 5. Payment Status Filter */}
          <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
            <AppSelect
              label="Payment Status"
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              options={paymentStatusOptions}
            />
          </Box>

          {/* 6. Action Buttons: Reset & Export */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: { md: "auto" },
              width: { xs: "100%", md: "auto" },
              justifyContent: { xs: "flex-end", md: "flex-end" },
              height: 34,
            }}
          >
            <Tooltip title="Reset all fine-tuning filters to default">
              <AppButton
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon sx={{ fontSize: 17 }} />}
                onClick={handleResetFilters}
                sx={{
                  height: 34,
                  minHeight: 34,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  px: 1.6,
                  borderRadius: "10px",
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.35)",
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.06)",
                  },
                }}
              >
                Reset
              </AppButton>
            </Tooltip>

            <AppButton
              size="small"
              variant="contained"
              startIcon={<FileDownloadIcon sx={{ fontSize: 17 }} />}
              onClick={handleExportMatrix}
              sx={{
                height: 34,
                minHeight: 34,
                fontSize: "0.78rem",
                fontWeight: 700,
                px: 2,
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
                whiteSpace: "nowrap",
              }}
            >
              Export Matrix (.xlsx)
            </AppButton>
          </Box>
        </Box>
      </Paper>

      {/* ── Annual Matrix Table (Fully Scrollable Format) ── */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: "14px",
          border: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
          bgcolor: isDark ? "#171422" : "#ffffff",
          maxHeight: "72vh",
          overflow: "auto",
          boxShadow: isDark
            ? "0 4px 20px rgba(0, 0, 0, 0.4)"
            : "0 2px 12px rgba(0, 0, 0, 0.03)",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.2)",
            borderRadius: "4px",
            "&:hover": {
              bgcolor: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.35)",
            },
          },
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1250 }}>
          <TableHead>
            <TableRow>
              {/* Sticky Column: Member Details */}
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 12,
                  bgcolor: isDark ? "#1f1b2e" : "#f8fafc",
                  fontWeight: 800,
                  fontSize: "0.76rem",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  minWidth: 220,
                  boxShadow: isDark ? "2px 2px 6px rgba(0,0,0,0.4)" : "2px 2px 6px rgba(0,0,0,0.04)",
                  borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`,
                  py: 1.5,
                }}
              >
                Member Details
              </TableCell>

              {/* 12 Monthly Columns (January to December) */}
              {MONTH_SHORT.map((m, idx) => (
                <TableCell
                  key={m}
                  align="center"
                  sx={{
                    bgcolor: isDark ? "#1f1b2e" : "#f8fafc",
                    fontWeight: 800,
                    fontSize: "0.74rem",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                    minWidth: 80,
                    borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`,
                    py: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span>{m}</span>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.62rem",
                        color: "text.disabled",
                        lineHeight: 1,
                        mt: 0.25,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </Typography>
                  </Box>
                </TableCell>
              ))}

              {/* Summary Columns */}
              <TableCell
                align="right"
                sx={{
                  bgcolor: isDark ? "#1f1b2e" : "#f8fafc",
                  fontWeight: 800,
                  fontSize: "0.74rem",
                  textTransform: "uppercase",
                  color: "#10b981",
                  minWidth: 105,
                  borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`,
                  py: 1.5,
                }}
              >
                Total Paid
              </TableCell>

              <TableCell
                align="right"
                sx={{
                  bgcolor: isDark ? "#1f1b2e" : "#f8fafc",
                  fontWeight: 800,
                  fontSize: "0.74rem",
                  textTransform: "uppercase",
                  color: "#f43f5e",
                  minWidth: 105,
                  borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`,
                  py: 1.5,
                }}
              >
                Total Pending
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  bgcolor: isDark ? "#1f1b2e" : "#f8fafc",
                  fontWeight: 800,
                  fontSize: "0.74rem",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  minWidth: 70,
                  borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`,
                  py: 1.5,
                }}
              >
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {matrixData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} sx={{ py: 8, textAlign: "center" }}>
                  <Typography variant="body1" fontWeight={700} color="text.secondary">
                    No members match the selected criteria for {selectedYear}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                    Try adjusting the Year, Search, or Event Type filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              matrixData.map((row, rIdx) => {
                const isEven = rIdx % 2 === 0;
                const rowBg = isEven
                  ? (isDark ? "rgba(255,255,255,0.015)" : "#ffffff")
                  : (isDark ? "rgba(255,255,255,0.03)" : "#f8fafc");

                return (
                  <TableRow
                    key={row.memberId || row.memberName + rIdx}
                    sx={{
                      bgcolor: rowBg,
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        bgcolor: isDark ? "rgba(124, 58, 237, 0.08)" : "rgba(99, 102, 241, 0.04)",
                        "& .sticky-col": {
                          bgcolor: isDark ? "#231e36" : "#f1f5f9",
                        },
                      },
                    }}
                  >
                    {/* Sticky Member Details */}
                    <TableCell
                      className="sticky-col"
                      sx={{
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        bgcolor: isEven ? (isDark ? "#1b172a" : "#ffffff") : (isDark ? "#1e1a2e" : "#f8fafc"),
                        boxShadow: isDark ? "2px 0 6px rgba(0,0,0,0.3)" : "2px 0 6px rgba(0,0,0,0.03)",
                        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`,
                        py: 1.2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                            color: "#ffffff",
                          }}
                        >
                          {row.memberName?.charAt(0)?.toUpperCase() || "M"}
                        </Avatar>
                        <Box sx={{ overflow: "hidden" }}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            sx={{
                              fontSize: "0.82rem",
                              color: "primary.main",
                              cursor: "pointer",
                              "&:hover": { textDecoration: "underline" },
                            }}
                            onClick={() => onOpenMemberDetails && onOpenMemberDetails(row)}
                          >
                            {row.memberName}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                            {row.workType && (
                              <Chip
                                size="small"
                                label={row.workType}
                                sx={{
                                  fontSize: "0.62rem",
                                  height: 18,
                                  fontWeight: 600,
                                  bgcolor: row.workType.toLowerCase() === "wfh"
                                    ? (isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(59, 130, 246, 0.1)")
                                    : (isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.1)"),
                                  color: row.workType.toLowerCase() === "wfh" ? "#3b82f6" : "#10b981",
                                }}
                              />
                            )}
                            {row.email && (
                              <Typography variant="caption" noWrap sx={{ fontSize: "0.68rem", color: "text.disabled", maxWidth: 110 }}>
                                {row.email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Months (Jan to Dec) */}
                    {row.months.map((m) => (
                      <TableCell key={m.monthNumber} align="center" sx={{ py: 1, px: 0.5 }}>
                        {renderMonthCell(m)}
                      </TableCell>
                    ))}

                    {/* Total Paid */}
                    <TableCell align="right" sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight={800} sx={{ color: "#10b981", fontSize: "0.82rem" }}>
                        {INR(row.totalAnnualPaid)}
                      </Typography>
                    </TableCell>

                    {/* Total Pending */}
                    <TableCell align="right" sx={{ py: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{
                          color: row.totalAnnualPending > 0 ? "#f43f5e" : "text.secondary",
                          fontSize: "0.82rem",
                        }}
                      >
                        {INR(row.totalAnnualPending)}
                      </Typography>
                    </TableCell>

                    {/* Action */}
                    <TableCell align="center" sx={{ py: 1 }}>
                      <Tooltip title="View member events breakdown">
                        <IconButton
                          size="small"
                          onClick={() => onOpenMemberDetails && onOpenMemberDetails(row)}
                          sx={{
                            color: "primary.main",
                            bgcolor: isDark ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.06)",
                            "&:hover": {
                              bgcolor: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.14)",
                            },
                          }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>

          {/* ── Sticky Summary Footer Row (Grand Monthly Totals) ── */}
          {matrixData.length > 0 && (
            <TableFooter
              sx={{
                position: "sticky",
                bottom: 0,
                zIndex: 11,
              }}
            >
              <TableRow
                sx={{
                  bgcolor: isDark ? "#241f36" : "#f1f5f9",
                  boxShadow: isDark ? "0 -3px 10px rgba(0,0,0,0.5)" : "0 -2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {/* Sticky Label */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    bottom: 0,
                    zIndex: 13,
                    bgcolor: isDark ? "#241f36" : "#f1f5f9",
                    fontWeight: 900,
                    fontSize: "0.78rem",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "text.primary",
                    boxShadow: isDark ? "2px -2px 6px rgba(0,0,0,0.4)" : "2px -2px 6px rgba(0,0,0,0.05)",
                    borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
                    py: 1.5,
                  }}
                >
                  Monthly Totals
                </TableCell>

                {/* Monthly Totals for Jan - Dec */}
                {summaryTotals.monthly.map((m, idx) => {
                  const val = viewMetric === "pending"
                    ? m.pending
                    : viewMetric === "expected"
                      ? m.expected
                      : m.paid;

                  return (
                    <TableCell
                      key={idx}
                      align="center"
                      sx={{
                        position: "sticky",
                        bottom: 0,
                        bgcolor: isDark ? "#241f36" : "#f1f5f9",
                        borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
                        py: 1.5,
                        px: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        sx={{
                          fontSize: "0.74rem",
                          color: val > 0
                            ? (viewMetric === "pending" ? "#f43f5e" : "#10b981")
                            : "text.disabled",
                          display: "block",
                        }}
                      >
                        {val > 0 ? INR(val) : "—"}
                      </Typography>
                    </TableCell>
                  );
                })}

                {/* Grand Paid */}
                <TableCell
                  align="right"
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    bgcolor: isDark ? "#241f36" : "#f1f5f9",
                    borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
                    py: 1.5,
                  }}
                >
                  <Typography variant="body2" fontWeight={900} sx={{ color: "#10b981", fontSize: "0.85rem" }}>
                    {INR(summaryTotals.grandPaid)}
                  </Typography>
                </TableCell>

                {/* Grand Pending */}
                <TableCell
                  align="right"
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    bgcolor: isDark ? "#241f36" : "#f1f5f9",
                    borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
                    py: 1.5,
                  }}
                >
                  <Typography variant="body2" fontWeight={900} sx={{ color: "#f43f5e", fontSize: "0.85rem" }}>
                    {INR(summaryTotals.grandPending)}
                  </Typography>
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    bgcolor: isDark ? "#241f36" : "#f1f5f9",
                    borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
                    py: 1.5,
                  }}
                >
                  —
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>

      {/* ── Bottom Status Bar (Scrollable indicator) ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 1.2,
          mt: 1,
          borderRadius: "8px",
          bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
          border: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#e2e8f0",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
          Showing all <strong>{matrixData.length}</strong> active members • Scroll vertically and horizontally to view all months
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.72rem" }}>
          January — December {selectedYear}
        </Typography>
      </Box>
    </Box>
  );
}
