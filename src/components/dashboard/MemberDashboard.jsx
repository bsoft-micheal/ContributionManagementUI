import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import ParkRoundedIcon from "@mui/icons-material/ParkRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAppToast } from "../common/AppToast";
import { formatWholeCurrency, formatWholeNumber } from "../../utils/roundingHelper";
import {
  getMemberDashboardSummaryAsync,
  getMemberContributionsAsync,
  getMemberRecentPaymentsAsync,
} from "../../services/dashboardService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import SubmitPaymentModal from "../payments/SubmitPaymentModal";
import BirthdayCelebrationModal from "../common/BirthdayCelebrationModal";
import MetricCard from "../common/MetricCard";
import AppDataTable from "../common/AppDataTable";
import AppOverflowTooltip from "../common/AppOverflowTooltip";

// Helper to resolve thematic colors and icons for event categories
function getCategoryVisuals(categoryName = "") {
  const lower = String(categoryName || "").toLowerCase().trim();
  if (lower.includes("marri") || lower.includes("wed")) {
    return {
      icon: PeopleAltRoundedIcon,
      bg: "#f3f0f9",
      color: "#4a3f6b",
      label: "Marriage",
    };
  }
  if (lower.includes("christ") || lower.includes("xmas")) {
    return {
      icon: ParkRoundedIcon,
      bg: "#ecfdf5",
      color: "#059669",
      label: "Christmas",
    };
  }
  if (lower.includes("birth")) {
    return {
      icon: CakeRoundedIcon,
      bg: "#fce7f3",
      color: "#db2777",
      label: "Birthday",
    };
  }
  if (lower.includes("lunch") || lower.includes("dinner") || lower.includes("food") || lower.includes("treat")) {
    return {
      icon: RestaurantRoundedIcon,
      bg: "#fef3c7",
      color: "#d97706",
      label: "Team Lunch",
    };
  }
  if (lower.includes("farewell") || lower.includes("sendoff")) {
    return {
      icon: FavoriteRoundedIcon,
      bg: "#ffe4e6",
      color: "#e11d48",
      label: "Farewell",
    };
  }
  if (lower.includes("new year") || lower.includes("gift")) {
    return {
      icon: CardGiftcardRoundedIcon,
      bg: "#e0e7ff",
      color: "#4338ca",
      label: "New Year",
    };
  }
  return {
    icon: EventRoundedIcon,
    bg: "#f3e8ff",
    color: "#7e22ce",
    label: categoryName || "Event",
  };
}

export default function MemberDashboard({
  propMonth,
  propYear,
  propEventType,
  propEventId,
  onFilterChange,
  hideTopHeader = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { authState } = useAuth();
  const toast = useAppToast();
  const navigate = useNavigate();

  // Filters: Default to current month and year or props
  const [selectedMonth, setSelectedMonth] = useState(propMonth !== undefined ? propMonth : dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(propYear !== undefined ? propYear : dayjs().year());
  const [selectedEventType, setSelectedEventType] = useState(propEventType || "ALL");
  const [selectedEventId, setSelectedEventId] = useState(propEventId || "ALL");

  useEffect(() => {
    if (propMonth !== undefined) setSelectedMonth(propMonth);
  }, [propMonth]);

  useEffect(() => {
    if (propYear !== undefined) setSelectedYear(propYear);
  }, [propYear]);

  useEffect(() => {
    if (propEventType !== undefined) setSelectedEventType(propEventType);
  }, [propEventType]);

  useEffect(() => {
    if (propEventId !== undefined) setSelectedEventId(propEventId);
  }, [propEventId]);

  // Filter Dropdown Menus Anchor States
  const [periodMenuAnchor, setPeriodMenuAnchor] = useState(null);
  const [eventTypeMenuAnchor, setEventTypeMenuAnchor] = useState(null);

  // Data states
  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalEvents: 0,
    paidEventsCount: 0,
    pendingEventsCount: 0,
    memberName: "",
  });
  const [contributions, setContributions] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentRow, setActivePaymentRow] = useState(null);

  // Birthday Celebration Modal States
  const [todayCelebrants, setTodayCelebrants] = useState([]);
  const [bdayModalOpen, setBdayModalOpen] = useState(false);

  // Load event types on mount
  useEffect(() => {
    let active = true;
    getEventTypesAsync()
      .then((res) => {
        if (active && Array.isArray(res)) {
          setEventTypes(res);
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, []);

  // Fetch Member Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth > 0 ? selectedMonth : undefined,
        year: selectedYear > 0 ? selectedYear : undefined,
      };

      // Resolve eventTypeId (if selectedEventType is a name or GUID)
      let resolvedEventTypeId = undefined;
      if (selectedEventType && selectedEventType !== "ALL") {
        const found = eventTypes.find(
          (t) =>
            String(t.eventTypeId || t.id || "").toLowerCase() === String(selectedEventType).toLowerCase() ||
            String(t.eventTypeName || t.name || "").toLowerCase() === String(selectedEventType).toLowerCase()
        );
        resolvedEventTypeId = found ? (found.eventTypeId || found.id || selectedEventType) : selectedEventType;
      }

      const [summaryRes, contribRes, recentRes] = await Promise.all([
        getMemberDashboardSummaryAsync(params),
        getMemberContributionsAsync({
          ...params,
          eventTypeId: resolvedEventTypeId,
        }),
        getMemberRecentPaymentsAsync(5),
      ]);

      if (summaryRes) {
        setSummary(summaryRes);
      }
      if (Array.isArray(contribRes)) {
        setContributions(contribRes);
      }
      if (Array.isArray(recentRes)) {
        setRecentPayments(recentRes);
      }
    } catch (err) {
      console.error("Failed to load member dashboard data:", err);
      toast.error("Failed to load member dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedEventType]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Pay Now / Pay Remaining Click
  const handleOpenPayment = (row) => {
    if (!row) return;

    if (!row.paymentEligibility) {
      if (row.paymentStatus === "Paid") {
        toast.info("This contribution has already been fully paid and verified.");
        return;
      }
      if (row.paymentStatus === "Pending Verification") {
        toast.info("Your payment has been submitted and is awaiting administrator verification.");
        return;
      }
    }

    setActivePaymentRow(row);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setActivePaymentRow(null);
    toast.success("Payment details submitted successfully!");
    loadDashboardData();
  };

  // Status filter state triggered by clicking on MetricCards (e.g. View Paid -> / View Unpaid ->)
  const [statusFilter, setStatusFilter] = useState("ALL");

  const displayedContributions = useMemo(() => {
    let list = Array.isArray(contributions) ? [...contributions] : [];

    // Filter by Event Type if specified (case-insensitive)
    if (selectedEventType && selectedEventType !== "ALL") {
      const targetType = String(selectedEventType).trim().toLowerCase();
      list = list.filter(
        (c) =>
          String(c.eventTypeName || c.category || "").trim().toLowerCase() === targetType ||
          String(c.eventTypeId || "").trim().toLowerCase() === targetType
      );
    }

    // Filter by Event Name/Id if specifically selected by user
    if (selectedEventId && selectedEventId !== "ALL") {
      const targetEv = String(selectedEventId).trim().toLowerCase();
      list = list.filter(
        (c) =>
          String(c.eventId || "").trim().toLowerCase() === targetEv ||
          String(c.eventName || "").trim().toLowerCase() === targetEv
      );
    }

    // Status card click filters
    if (statusFilter === "PAID") {
      list = list.filter((c) => {
        const st = String(c.paymentStatus || c.paymentVerificationStatus || "").toLowerCase();
        return st === "paid" || st === "approved" || st === "verified";
      });
    } else if (statusFilter === "UNPAID") {
      list = list.filter((c) => {
        const st = String(c.paymentStatus || c.paymentVerificationStatus || "").toLowerCase();
        return st !== "paid" && st !== "approved" && st !== "verified";
      });
    }

    // Dynamic Record Priority Sorting (Section 2 Specifications):
    // 1. Unpaid
    // 2. Partially Paid
    // 3. Pending Verification
    // 4. Paid (including Approved)
    // Within each status group: sort by Event Date descending, with Event ID as deterministic tie-breaker.
    const getStatusPriority = (item) => {
      const st = String(item.paymentStatus || item.paymentVerificationStatus || "").toLowerCase();
      if (st === "unpaid") return 1;
      if (st === "partially paid" || st === "partial") return 2;
      if (st === "pending verification" || st === "pending") return 3;
      if (st === "payment rejected" || st === "rejected") return 4;
      if (st === "paid" || st === "approved" || st === "verified") return 5;
      return 6;
    };

    return list.sort((a, b) => {
      const pA = getStatusPriority(a);
      const pB = getStatusPriority(b);
      if (pA !== pB) {
        return pA - pB;
      }
      // Before approval (and within each status group): display in descending order with latest record first
      const createdA = dayjs(a.createdAt || a.createdOn || a.eventDate).valueOf();
      const createdB = dayjs(b.createdAt || b.createdOn || b.eventDate).valueOf();
      if (createdB !== createdA) {
        return createdB - createdA;
      }
      const dateDiff = dayjs(b.eventDate).valueOf() - dayjs(a.eventDate).valueOf();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return String(b.eventId || "").localeCompare(String(a.eventId || ""));
    });
  }, [contributions, statusFilter, selectedEventType, selectedEventId]);

  // Period label string (e.g. "October 2026" or "All Periods")
  const periodLabel = useMemo(() => {
    if (selectedMonth > 0 && selectedYear > 0) {
      return dayjs().year(selectedYear).month(selectedMonth - 1).format("MMMM YYYY");
    }
    if (selectedYear > 0) {
      return `All Months, ${selectedYear}`;
    }
    return "All Time";
  }, [selectedMonth, selectedYear]);

  // Event Type label
  const eventTypeLabel = useMemo(() => {
    if (selectedEventType === "ALL") return "All Event Types";
    const found = eventTypes.find((t) => String(t.eventTypeId || t.id) === String(selectedEventType));
    return found ? (found.eventTypeName || found.name) : "All Event Types";
  }, [selectedEventType, eventTypes]);

  // Display member name
  const displayName = summary?.memberName || authState?.fullName || authState?.username || "Member";

  // Month list for dropdown
  const monthOptions = useMemo(() => {
    const list = [{ label: "All Months", value: 0 }];
    for (let m = 0; m < 12; m++) {
      list.push({
        label: dayjs().month(m).format("MMMM"),
        value: m + 1,
      });
    }
    return list;
  }, []);

  // Year list for dropdown
  const currentYear = dayjs().year();
  const yearOptions = useMemo(() => {
    const list = [{ label: "All Years", value: 0 }];
    for (let y = currentYear - 3; y <= currentYear + 2; y++) {
      list.push({ label: String(y), value: y });
    }
    return list;
  }, [currentYear]);

  // Only records with Completed, Verified, or Approved status should appear in Recent Payments
  const completedRecentPayments = useMemo(() => {
    return (recentPayments || []).filter((item) => {
      const rawSt = String(item.verificationStatus || item.status || "").trim().toLowerCase();
      return rawSt === "completed" || rawSt === "verified" || rawSt === "approved";
    });
  }, [recentPayments]);

  // Columns definition for AppDataTable standard grid
  const contributionColumns = useMemo(
    () => [
      {
        label: "Event Type",
        key: "eventTypeName",
        render: (row) => {
          const visuals = getCategoryVisuals(row.eventTypeName);
          const CategoryIcon = visuals.icon;
          return (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.8,
                px: 1.25,
                py: 0.55,
                borderRadius: "8px",
                bgcolor: isDark
                  ? alpha(theme.palette.primary.main, 0.18)
                  : alpha(theme.palette.primary.main, 0.10),
                color: theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                fontWeight: 700,
                fontSize: "0.825rem",
              }}
            >
              <CategoryIcon sx={{ fontSize: 16, color: "inherit" }} />
              {row.eventTypeName || visuals.label}
            </Box>
          );
        },
      },
      {
        label: "Event Name",
        key: "eventName",
        render: (row) => (
          <AppOverflowTooltip
            text={row.eventName || "--"}
            sx={{
              fontWeight: 600,
              fontSize: "0.925rem",
              color: isDark ? "#ffffff" : "#1e293b",
              maxWidth: { xs: 160, sm: 220, md: 280 },
            }}
          />
        ),
      },
      {
        label: "Event Date",
        key: "eventDate",
        render: (row) => (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8, color: isDark ? "text.secondary" : "#64748b", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
            <CalendarTodayRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
            {dayjs(row.eventDate).format("DD MMM YYYY")}
          </Box>
        ),
      },
      {
        label: "Contribution Amount",
        key: "contributionAmount",
        align: "right",
        render: (row) => (
          <Typography
            component="span"
            sx={{
              fontWeight: 800,
              fontSize: "0.975rem",
              color: isDark ? "#ffffff" : "#0f172a",
            }}
          >
            {formatWholeCurrency(row.contributionAmount || 0)}
          </Typography>
        ),
      },
      {
        label: "Status",
        key: "paymentStatus",
        align: "center",
        render: (row) => {
          const st = String(row.paymentStatus || row.paymentVerificationStatus || "").toLowerCase();
          const isApproved = st === "approved" || st === "verified";
          const isPaid = st === "paid" || st === "pending verification" || st === "pending";
          const isPendingVerif = (st === "pending verification" || st === "pending") && !isApproved;
          const isUnpaid = st === "unpaid";
          const isPartial = st === "partially paid" || st === "partial";
          const isRejected = st === "payment rejected" || st === "rejected";

          // 1. Approved / Verified
          if (isApproved) {
            return (
              <Chip
                icon={<CheckCircleRoundedIcon sx={{ fontSize: "15px !important", color: "#16a34a !important" }} />}
                label="Approved"
                size="small"
                sx={{
                  bgcolor: "#ecfdf5",
                  color: "#059669",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.8rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #a7f3d0",
                }}
              />
            );
          }

          // 2. Pending Verification (Paid by member, waiting for admin approval)
          if (isPendingVerif) {
            return (
              <Chip
                icon={<HourglassEmptyRoundedIcon sx={{ fontSize: "15px !important", color: "#7c3aed !important" }} />}
                label="Pending Verification"
                size="small"
                sx={{
                  bgcolor: "#f5f3ff",
                  color: "#7c3aed",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.785rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #ddd6fe",
                }}
              />
            );
          }

          // 3. Paid (Fully settled / confirmed)
          if (isPaid) {
            return (
              <Chip
                icon={<CheckCircleRoundedIcon sx={{ fontSize: "15px !important", color: "#16a34a !important" }} />}
                label="Paid"
                size="small"
                sx={{
                  bgcolor: "#ecfdf5",
                  color: "#059669",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.8rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #a7f3d0",
                }}
              />
            );
          }
          if (isPartial) {
            return (
              <Chip
                icon={<ErrorRoundedIcon sx={{ fontSize: "15px !important", color: "#d97706 !important" }} />}
                label="Partially Paid"
                size="small"
                sx={{
                  bgcolor: "#fffbeb",
                  color: "#d97706",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.8rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #fde68a",
                }}
              />
            );
          }
          if (isRejected) {
            return (
              <Chip
                icon={<CancelRoundedIcon sx={{ fontSize: "15px !important", color: "#dc2626 !important" }} />}
                label="Payment Rejected"
                size="small"
                sx={{
                  bgcolor: "#fef2f2",
                  color: "#dc2626",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.785rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #fecaca",
                }}
              />
            );
          }
          if (isUnpaid) {
            return (
              <Chip
                icon={<ErrorRoundedIcon sx={{ fontSize: "15px !important", color: "#ef4444 !important" }} />}
                label="Unpaid"
                size="small"
                sx={{
                  bgcolor: "#fef2f2",
                  color: "#dc2626",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.8rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #fee2e2",
                }}
              />
            );
          }
          return <Chip label={row.paymentStatus || "--"} size="small" />;
        },
      },
      {
        label: "Action",
        key: "action",
        align: "center",
        render: (row) => {
          const st = String(row.paymentStatus || row.paymentVerificationStatus || "").toLowerCase();
          const isApproved = st === "approved" || st === "verified";
          const isPaid = st === "paid" || isApproved;
          const isUnpaid = st === "unpaid";
          const isPartial = st === "partially paid" || st === "partial";
          const isPendingVerif = st === "pending verification" || st === "pending";
          const isRejected = st === "payment rejected" || st === "rejected";

          if (isUnpaid) {
            return (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleOpenPayment(row)}
                startIcon={<PaymentRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  background: isDark
                    ? "linear-gradient(90deg, #5a4c82 0%, #6f5ea0 100%)"
                    : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
                  color: "#ffffff",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 2.25,
                  py: 0.65,
                  fontSize: "0.85rem",
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0, 0, 0, 0.35)"
                    : "0 4px 12px rgba(74, 63, 107, 0.25)",
                  "&:hover": {
                    background: isDark
                      ? "linear-gradient(90deg, #4a3f6b 0%, #5a4c82 100%)"
                      : "linear-gradient(90deg, #372e54 0%, #4a3f6b 100%)",
                    boxShadow: isDark
                      ? "0 6px 16px rgba(0, 0, 0, 0.45)"
                      : "0 6px 16px rgba(74, 63, 107, 0.35)",
                  },
                }}
              >
                Pay Now
              </Button>
            );
          }

          if (isPartial) {
            return (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleOpenPayment(row)}
                startIcon={<PaymentRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  background: isDark
                    ? "linear-gradient(90deg, #5a4c82 0%, #6f5ea0 100%)"
                    : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
                  color: "#ffffff",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.85,
                  py: 0.65,
                  fontSize: "0.85rem",
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0, 0, 0, 0.35)"
                    : "0 4px 12px rgba(74, 63, 107, 0.25)",
                  "&:hover": {
                    background: isDark
                      ? "linear-gradient(90deg, #4a3f6b 0%, #5a4c82 100%)"
                      : "linear-gradient(90deg, #372e54 0%, #4a3f6b 100%)",
                  },
                }}
              >
                Pay Remaining
              </Button>
            );
          }

          if (isPendingVerif) {
            return (
              <Button
                variant="outlined"
                size="small"
                onClick={() => toast.info("Your payment is currently being reviewed by organizers/admin.")}
                sx={{
                  borderColor: "#c4b5fd",
                  color: "#7c3aed",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.75,
                  py: 0.6,
                  fontSize: "0.825rem",
                  "&:hover": {
                    borderColor: "#7c3aed",
                    bgcolor: "rgba(124, 58, 237, 0.04)",
                  },
                }}
              >
                View Status
              </Button>
            );
          }

          if (isPaid || isApproved) {
            return (
              <Button
                variant="contained"
                disabled
                size="small"
                sx={{
                  bgcolor: isDark ? "rgba(255,255,255,0.06) !important" : "#f1f5f9 !important",
                  color: isDark ? "rgba(255,255,255,0.4) !important" : "#94a3b8 !important",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 2.5,
                  py: 0.65,
                  fontSize: "0.85rem",
                }}
              >
                Paid
              </Button>
            );
          }

          if (isRejected) {
            return (
              <Button
                variant="contained"
                size="small"
                color="error"
                onClick={() => handleOpenPayment(row)}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.85,
                  py: 0.65,
                }}
              >
                Retry Pay
              </Button>
            );
          }

          return null;
        },
      },
    ],
    [isDark, toast]
  );

  return (
    <Box sx={{ width: "100%", pb: 6 }}>
      {/* ── Two Column Layout (Matching Exact Reference Screenshot) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1fr) 375px",
          },
          gap: 2.5,
          alignItems: "start",
          width: "100%",
        }}
      >
        {/* ── Left Column: 3 KPI Cards + My Contributions Grid ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, minWidth: 0, width: "100%" }}>
          {/* Top Row of Left Column: Metric Cards (Matching Admin Dashboard Standard) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, minmax(0, 1fr))",
              },
              gap: { xs: 1.5, sm: 2 },
              width: "100%",
            }}
          >
            {/* Card 1: Total Paid */}
            <MetricCard
              label="Total Paid"
              value={formatWholeCurrency(summary.totalPaid || 0)}
              accent="#10b981"
              actionText={summary.totalPaid > 0 ? "View Paid →" : undefined}
              onClick={summary.totalPaid > 0 ? () => setStatusFilter((p) => (p === "PAID" ? "ALL" : "PAID")) : undefined}
            />

            {/* Card 2: Total Pending */}
            <MetricCard
              label="Total Pending"
              value={formatWholeCurrency(summary.totalPending || 0)}
              accent="#f43f5e"
              actionText={summary.totalPending > 0 ? "View Unpaid →" : undefined}
              onClick={summary.totalPending > 0 ? () => setStatusFilter((p) => (p === "UNPAID" ? "ALL" : "UNPAID")) : undefined}
            />

            {/* Card 3: Total Events */}
            <MetricCard
              label="Total Events"
              value={summary.totalEvents || 0}
              accent="#8b5cf6"
              actionText={summary.totalEvents > 0 ? "View Events →" : undefined}
              onClick={summary.totalEvents > 0 ? () => setStatusFilter("ALL") : undefined}
            />
          </Box>

          {/* Contributions Standard Table Component */}
          <Box sx={{ width: "100%" }}>
            <AppDataTable
              title="My Contributions"
              columns={contributionColumns}
              data={displayedContributions}
              loading={loading}
              emptyMessage="No contributions found for this period."
              allowPagination={true}
              initialRowsPerPage={15}
              allowExport={true}
              searchPlaceholder="Search contributions..."
            />
          </Box>
        </Box>

        {/* ── Right Column: Recent Payments (Matching Screenshot Design) ── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 2.75 },
            borderRadius: "16px",
            bgcolor: isDark ? "background.paper" : "#ffffff",
            border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
            boxShadow: isDark
              ? "0 4px 20px rgba(0,0,0,0.3)"
              : "0 4px 24px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: isDark
                    ? "linear-gradient(135deg, #5a4c82 0%, #6f5ea0 100%)"
                    : "linear-gradient(135deg, #4a3f6b 0%, #5d528b 100%)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0, 0, 0, 0.35)"
                    : "0 4px 12px rgba(74, 63, 107, 0.25)",
                }}
              >
                <HistoryRoundedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  color: isDark ? "#ffffff" : "#1e1b4b",
                }}
              >
                Recent Payments
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: isDark ? "text.secondary" : "#64748b",
                fontSize: "0.85rem",
                mt: 0.5,
              }}
            >
              Your last 5 payment transactions.
            </Typography>
          </Box>

          {/* Table View of 5 transactions */}
          <TableContainer sx={{ flex: 1, borderRadius: "10px", overflow: "hidden" }}>
            <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: isDark
                      ? alpha(theme.palette.primary.main, 0.16)
                      : alpha(theme.palette.primary.main, 0.08),
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      color: isDark ? "#c4b5fd" : "#4a3f6b",
                      py: 1,
                      pl: 1.5,
                      width: "44%",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                    }}
                  >
                    Event
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      color: isDark ? "#c4b5fd" : "#4a3f6b",
                      py: 1,
                      width: "24%",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                    }}
                  >
                    Amount
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      color: isDark ? "#c4b5fd" : "#4a3f6b",
                      py: 1,
                      pr: 1.5,
                      width: "32%",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completedRecentPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      align="center"
                      sx={{ py: 4, color: "text.secondary", fontSize: "0.85rem", borderBottom: "none" }}
                    >
                      No completed payment transactions recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  completedRecentPayments.slice(0, 5).map((item, idx) => {
                    const rawSt = String(item.verificationStatus || item.status || "").trim();
                    const st = rawSt.toLowerCase();
                    const displayLabel = st === "completed" ? "Completed" : (st === "approved" ? "Approved" : "Completed");

                    return (
                      <TableRow
                        key={item.paymentId || idx}
                        hover
                        sx={{
                          "&:last-child td": { borderBottom: "none" },
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {/* Event Name & Date */}
                        <TableCell sx={{ py: 1.15, pl: 1.5 }}>
                          <AppOverflowTooltip
                            text={item.eventName || "Event Payment"}
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.825rem",
                              color: isDark ? "#ffffff" : "#1e293b",
                              display: "block",
                              lineHeight: 1.3,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              color: isDark ? "text.secondary" : "#64748b",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              display: "block",
                              mt: 0.25,
                            }}
                          >
                            {dayjs(item.paymentDate).format("DD MMM YYYY")}
                          </Typography>
                        </TableCell>

                        {/* Amount */}
                        <TableCell align="right" sx={{ py: 1.15, whiteSpace: "nowrap" }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.875rem",
                              color: isDark ? "#ffffff" : "#0f172a",
                            }}
                          >
                            {formatWholeCurrency(item.paymentAmount || 0)}
                          </Typography>
                        </TableCell>

                        {/* Status Chip */}
                        <TableCell align="center" sx={{ py: 1.15, pr: 1.5, whiteSpace: "nowrap" }}>
                          <Chip
                            label={displayLabel}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              height: 22,
                              px: 0.75,
                              borderRadius: "12px",
                              bgcolor: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #d1fae5",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* ── Period Filter Menu ── */}
      <Menu
        anchorEl={periodMenuAnchor}
        open={Boolean(periodMenuAnchor)}
        onClose={() => setPeriodMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            maxHeight: 380,
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            SELECT YEAR
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
            {yearOptions.map((y) => (
              <Chip
                key={y.value}
                label={y.label}
                size="small"
                clickable
                color={selectedYear === y.value ? "primary" : "default"}
                variant={selectedYear === y.value ? "filled" : "outlined"}
                onClick={() => setSelectedYear(y.value)}
              />
            ))}
          </Box>
        </Box>
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            SELECT MONTH
          </Typography>
        </Box>
        {monthOptions.map((m) => (
          <MenuItem
            key={m.value}
            selected={selectedMonth === m.value}
            onClick={() => {
              setSelectedMonth(m.value);
              setPeriodMenuAnchor(null);
            }}
            sx={{ fontWeight: selectedMonth === m.value ? 700 : 500, fontSize: "0.875rem" }}
          >
            {m.label}
          </MenuItem>
        ))}
      </Menu>

      {/* ── Event Type Filter Menu ── */}
      <Menu
        anchorEl={eventTypeMenuAnchor}
        open={Boolean(eventTypeMenuAnchor)}
        onClose={() => setEventTypeMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            maxHeight: 320,
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          },
        }}
      >
        <MenuItem
          selected={selectedEventType === "ALL"}
          onClick={() => {
            setSelectedEventType("ALL");
            setEventTypeMenuAnchor(null);
          }}
          sx={{ fontWeight: selectedEventType === "ALL" ? 700 : 500, fontSize: "0.875rem" }}
        >
          All Event Types
        </MenuItem>
        {eventTypes.map((type) => {
          const typeId = type.eventTypeId || type.id;
          const typeName = type.eventTypeName || type.name;
          return (
            <MenuItem
              key={typeId}
              selected={selectedEventType === typeId}
              onClick={() => {
                setSelectedEventType(typeId);
                setEventTypeMenuAnchor(null);
              }}
              sx={{ fontWeight: selectedEventType === typeId ? 700 : 500, fontSize: "0.875rem" }}
            >
              {typeName}
            </MenuItem>
          );
        })}
      </Menu>

      {/* ── Reusable Submit Payment Details Modal ── */}
      {paymentModalOpen && activePaymentRow && (
        <SubmitPaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setActivePaymentRow(null);
          }}
          onSuccess={handlePaymentSuccess}
          initialEventId={activePaymentRow.eventId}
          initialEventName={activePaymentRow.eventName}
          initialEventCategory={activePaymentRow.eventTypeName}
          initialMemberId={activePaymentRow.memberId}
          initialMemberName={activePaymentRow.memberName || displayName}
          initialAmount={activePaymentRow.outstandingAmount || activePaymentRow.contributionAmount}
          initialCurrentDue={activePaymentRow.outstandingAmount || activePaymentRow.contributionAmount}
          initialPreviousArrears={activePaymentRow.previousArrears || 0}
          initialTotalDue={activePaymentRow.totalDue || (activePaymentRow.outstandingAmount + (activePaymentRow.previousArrears || 0))}
          initialStatus={activePaymentRow.paymentStatus}
        />
      )}

      {/* Birthday Celebration Modal */}
      <BirthdayCelebrationModal
        open={bdayModalOpen}
        onClose={() => {
          sessionStorage.setItem("birthdayModalShownSession", "true");
          setBdayModalOpen(false);
        }}
        celebrants={todayCelebrants}
        autoCloseSeconds={0}
      />
    </Box>
  );
}
