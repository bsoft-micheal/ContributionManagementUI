import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
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
      icon: PersonRoundedIcon,
      bg: "#f3f0f9",
      color: "#4a3f6b",
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

/**
 * Utility to reliably classify contribution status across all edge cases:
 * - Fully Paid / Approved / Verified / Completed
 * - Partially Paid
 * - Pending Verification
 * - Payment Rejected
 * - Unpaid
 */
export const getContributionStatusInfo = (row) => {
  if (!row) {
    return {
      statusKey: "unpaid",
      isPaid: false,
      isPartial: false,
      isPendingVerif: false,
      isRejected: false,
      isUnpaid: true,
      displayStatus: "Unpaid",
    };
  }

  const payStatus = String(row.paymentStatus || row.statusName || row.status || "").trim().toLowerCase();
  const verifStatus = String(row.paymentVerificationStatus || row.verificationStatus || "").trim().toLowerCase();

  // 1. Rejected
  const isRejected =
    row.isRejected === true ||
    payStatus === "payment rejected" ||
    payStatus === "rejected" ||
    verifStatus === "rejected" ||
    payStatus.includes("reject") ||
    verifStatus.includes("reject");

  // 2. Pending Verification (submitted by member, awaiting admin approval)
  const isPendingVerif =
    !isRejected &&
    (row.isPendingVerification === true ||
      payStatus === "pending verification" ||
      payStatus === "pending" ||
      verifStatus === "pending" ||
      verifStatus === "pending verification" ||
      payStatus.includes("pending") ||
      verifStatus.includes("pending"));

  // 3. Partially Paid
  const isPartial =
    !isRejected &&
    !isPendingVerif &&
    (row.isPartial === true ||
      payStatus === "partially paid" ||
      payStatus === "partiallypaid" ||
      payStatus === "partially_paid" ||
      payStatus === "partial" ||
      payStatus.includes("partial") ||
      (Number(row.verifiedPaidAmount) > 0 && Number(row.outstandingAmount) > 0));

  // 4. Approved / Fully Paid
  const isApprovedOrVerified =
    verifStatus === "verified" ||
    verifStatus === "approved" ||
    verifStatus === "completed" ||
    payStatus === "approved" ||
    payStatus === "verified" ||
    payStatus === "completed" ||
    payStatus === "closed";

  const isExplicitlyPaid =
    row.isPaid === true ||
    payStatus === "paid" ||
    isApprovedOrVerified ||
    (row.outstandingAmount !== undefined && Number(row.outstandingAmount) === 0 && Number(row.verifiedPaidAmount) > 0);

  const isPaid = !isRejected && !isPendingVerif && !isPartial && isExplicitlyPaid;

  // 5. Unpaid
  const isUnpaid = !isPaid && !isPartial && !isPendingVerif && !isRejected;

  let statusKey = "unpaid";
  let displayStatus = "Unpaid";

  if (isPendingVerif) {
    statusKey = "pending";
    displayStatus = "Pending Verification";
  } else if (isPartial) {
    statusKey = "partial";
    displayStatus = "Partially Paid";
  } else if (isRejected) {
    statusKey = "rejected";
    displayStatus = "Payment Rejected";
  } else if (isPaid) {
    statusKey = "paid";
    displayStatus = isApprovedOrVerified ? "Approved" : "Paid";
  }

  return {
    statusKey,
    isPaid,
    isPartial,
    isPendingVerif,
    isRejected,
    isUnpaid,
    displayStatus,
  };
};

export default function MemberDashboard({
  propMonth,
  propYear,
  propEventType,
  propEventId,
  propStatusFilter,
  propStatus,
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

  // Status modal state for viewing Pending Verification details
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [activeStatusRow, setActiveStatusRow] = useState(null);

  const handleOpenStatusModal = (row) => {
    setActiveStatusRow(row);
    setStatusModalOpen(true);
  };

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
  }, [selectedMonth, selectedYear, selectedEventType, eventTypes]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Pay Now / Pay Remaining Click
  const handleOpenPayment = (row) => {
    if (!row) return;

    const info = getContributionStatusInfo(row);
    if (!row.paymentEligibility) {
      if (info.isPaid) {
        toast.info("This contribution has already been fully paid and verified.");
        return;
      }
      if (info.isPendingVerif) {
        handleOpenStatusModal(row);
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

  // Status filter state triggered by clicking on MetricCards (e.g. View Paid -> / View Unpaid ->) or props
  const [statusFilter, setStatusFilter] = useState(propStatusFilter || propStatus || "ALL");

  useEffect(() => {
    if (propStatusFilter !== undefined) {
      setStatusFilter(propStatusFilter || "ALL");
    } else if (propStatus !== undefined) {
      setStatusFilter(propStatus || "ALL");
    }
  }, [propStatusFilter, propStatus]);

  const displayedContributions = useMemo(() => {
    let list = Array.isArray(contributions)
      ? contributions.map((c, idx) => ({
          ...c,
          id: c.contributionId || (c.eventId && c.memberId ? `${c.memberId}_${c.eventId}` : c.eventId) || `contrib_${idx}`,
        }))
      : [];

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

    // Status card click filters (handles UNPAID, PAID, and specific statuses in all cases)
    const filterKey = String(statusFilter || "").trim().toUpperCase();

    if (filterKey === "UNPAID" || filterKey === "PENDING") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        // Includes unpaid, partially paid, pending verification, and rejected (all non-paid items contributing to Total Pending)
        return info.isUnpaid || info.isPartial || info.isPendingVerif || info.isRejected || !info.isPaid;
      });
    } else if (filterKey === "PAID" || filterKey === "APPROVED" || filterKey === "VERIFIED") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return info.isPaid;
      });
    } else if (filterKey === "PARTIAL" || filterKey === "PARTIALLY_PAID") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return info.isPartial;
      });
    } else if (filterKey === "PENDING_VERIFICATION") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return info.isPendingVerif;
      });
    } else if (filterKey === "REJECTED") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return info.isRejected;
      });
    } else if (filterKey === "UNPAID_ONLY" || filterKey === "STRICT_UNPAID") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return info.isUnpaid;
      });
    }
    else {
      return list
    }

    // Sort by status rank (unpaid & partially paid first so user can act), then by Event Date descending
    return list.sort((a, b) => {
      const getStatusRank = (item) => {
        const info = getContributionStatusInfo(item);
        if (info.isUnpaid) return 1;
        if (info.isPartial) return 2;
        if (info.isPendingVerif) return 3;
        if (info.isRejected) return 4;
        return 5; // paid, approved, verified
      };
      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      const dateDiff = dayjs(b.eventDate).valueOf() - dayjs(a.eventDate).valueOf();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      const createdA = dayjs(a.createdAt || a.createdOn || a.eventDate).valueOf();
      const createdB = dayjs(b.createdAt || b.createdOn || b.eventDate).valueOf();
      if (createdB !== createdA) {
        return createdB - createdA;
      }
      return String(b.eventId || "").localeCompare(String(a.eventId || ""));
    });
  }, [contributions, statusFilter, selectedEventType, selectedEventId]);


  console.log(displayedContributions);


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
    const list = [];
    const seenEvents = new Set();

    (recentPayments || []).forEach((item) => {
      const rawSt = String(item.verificationStatus || item.status || "").trim().toLowerCase();
      if (rawSt === "completed" || rawSt === "verified" || rawSt === "approved" || rawSt === "paid") {
        const evKey = String(item.eventId || item.eventName || "").trim().toLowerCase();
        if (evKey && !seenEvents.has(evKey)) {
          seenEvents.add(evKey);
        }
        list.push({
          paymentId: item.paymentId,
          eventId: item.eventId,
          eventName: item.eventName || "Event Payment",
          eventTypeName: item.eventTypeName || item.category || "Event",
          paymentDate: item.paymentDate,
          paymentAmount: item.paymentAmount,
          paymentMode: item.paymentMode || "Online",
          verificationStatus: "Approved",
        });
      }
    });

    // Also incorporate any approved/paid items from contributions list if not already present
    (contributions || []).forEach((c) => {
      const info = getContributionStatusInfo(c);
      if (info.isPaid) {
        const evKey = String(c.eventId || c.eventName || "").trim().toLowerCase();
        if (evKey && !seenEvents.has(evKey)) {
          seenEvents.add(evKey);
          list.push({
            paymentId: c.contributionId || c.eventId,
            eventId: c.eventId,
            eventName: c.eventName || "Event Payment",
            eventTypeName: c.eventTypeName || c.category || "Event",
            paymentDate: c.paymentDate || c.eventDate,
            paymentAmount: c.verifiedPaidAmount || c.contributionAmount,
            paymentMode: c.paymentMode || "Online",
            verificationStatus: "Approved",
          });
        }
      }
    });

    list.sort((a, b) => dayjs(b.paymentDate).valueOf() - dayjs(a.paymentDate).valueOf());
    return list.slice(0, 5);
  }, [recentPayments, contributions]);

  const totalRecentAmount = useMemo(() => {
    return (completedRecentPayments || []).reduce((acc, curr) => acc + (Number(curr.paymentAmount) || 0), 0);
  }, [completedRecentPayments]);

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
        render: (row) => {
          const info = getContributionStatusInfo(row);
          const displayAmount = info.isPartial && row.outstandingAmount !== undefined
            ? row.outstandingAmount
            : (row.contributionAmount || 0);
          return (
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                fontSize: "0.975rem",
                color: isDark ? "#ffffff" : "#0f172a",
              }}
            >
              {formatWholeCurrency(displayAmount)}
            </Typography>
          );
        },
      },
      {
        label: "Status",
        key: "paymentStatus",
        align: "center",
        render: (row) => {
          const info = getContributionStatusInfo(row);

          // 1. Pending Verification (Paid by member, waiting for admin approval)
          if (info.isPendingVerif) {
            return (
              <Chip
                icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#d97706", mr: "4px !important" }} />}
                label="Pending Verification"
                size="small"
                sx={{
                  bgcolor: "#fffbeb",
                  color: "#d97706",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.785rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #fde68a",
                }}
              />
            );
          }

          // 2. Partially Paid
          if (info.isPartial) {
            return (
              <Chip
                icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#2563eb", mr: "4px !important" }} />}
                label="Partially Paid"
                size="small"
                sx={{
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.785rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #bfdbfe",
                }}
              />
            );
          }

          // 3. Rejected
          if (info.isRejected) {
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

          // 4. Unpaid
          if (info.isUnpaid) {
            return (
              <Chip
                icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#dc2626", mr: "4px !important" }} />}
                label="Unpaid"
                size="small"
                sx={{
                  bgcolor: "#fef2f2",
                  color: "#dc2626",
                  fontWeight: 700,
                  borderRadius: "16px",
                  fontSize: "0.785rem",
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid #fee2e2",
                }}
              />
            );
          }

          // Fallback Approved/Paid
          if (info.isPaid) {
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

          return <Chip label={row.paymentStatus || "--"} size="small" />;
        },
      },
      {
        label: "Action",
        key: "action",
        align: "center",
        render: (row) => {
          const info = getContributionStatusInfo(row);

          if (info.isUnpaid) {
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

          if (info.isPartial) {
            return (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenPayment(row)}
                startIcon={<PaymentRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderColor: isDark ? "#7c3aed" : "#4a3f6b",
                  color: isDark ? "#c4b5fd" : "#4a3f6b",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.65,
                  fontSize: "0.825rem",
                  "&:hover": {
                    borderColor: isDark ? "#a78bfa" : "#372e54",
                    bgcolor: "rgba(74, 63, 107, 0.04)",
                  },
                }}
              >
                Pay Remaining
              </Button>
            );
          }

          if (info.isPendingVerif) {
            return (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenStatusModal(row)}
                startIcon={<VisibilityRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderColor: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1",
                  color: isDark ? "#c4b5fd" : "#4a3f6b",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.65,
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

          if (info.isPaid) {
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

          if (info.isRejected) {
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
    [isDark]
  );

  return (
    <Box sx={{ width: "100%", pb: 6 }}>
      {/* ── Two Column Responsive Layout ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.25fr) minmax(420px, 480px)",
            xl: "minmax(0, 1.35fr) minmax(480px, 540px)",
          },
          gap: { xs: 2.5, lg: 3 },
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
              actionText={summary.totalPaid > 0 ? (statusFilter === "PAID" ? "Show All →" : "View Paid →") : undefined}
              onClick={summary.totalPaid > 0 ? () => setStatusFilter((p) => (p === "PAID" ? "ALL" : "PAID")) : undefined}
            />

            {/* Card 2: Total Pending */}
            <MetricCard
              label="Total Pending"
              value={formatWholeCurrency(summary.totalPending || 0)}
              accent="#f43f5e"
              actionText={summary.totalPending > 0 ? (statusFilter === "UNPAID" ? "Show All →" : "View Unpaid →") : undefined}
              onClick={summary.totalPending > 0 ? () => setStatusFilter((p) => (p === "UNPAID" ? "ALL" : "UNPAID")) : undefined}
            />

            {/* Card 3: Total Events */}
            <MetricCard
              label="Total Events"
              value={summary.totalEvents || 0}
              accent="#8b5cf6"
              actionText={summary.totalEvents > 0 ? "View Events →" : undefined}
              onClick={summary.totalEvents > 0 ? () => navigate("/events") : undefined}
            />
          </Box>

          {/* Contributions Standard Table Component */}
          <Box sx={{ width: "100%" }}>
            <AppDataTable
              title="My Contributions"
              columns={contributionColumns}
              data={displayedContributions}
              rowKey={(row, idx) => row.id || row.contributionId || (row.eventId && row.memberId ? `${row.memberId}_${row.eventId}` : row.eventId) || `row_${idx}`}
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
        {/* ── Right Column: Recent Payments (Matching Modern Fintech / SaaS Best Practices) ── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 2.75, md: 3 },
            borderRadius: "16px",
            bgcolor: isDark ? "background.paper" : "#ffffff",
            border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
            boxShadow: isDark
              ? "0 4px 20px rgba(0,0,0,0.3)"
              : "0 4px 24px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            transition: "box-shadow 0.25s ease",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              mb: 2.5,
              pb: 2,
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  background: isDark
                    ? "linear-gradient(135deg, #5a4c82 0%, #6f5ea0 100%)"
                    : "linear-gradient(135deg, #4a3f6b 0%, #5d528b 100%)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: isDark
                    ? "0 4px 14px rgba(0, 0, 0, 0.4)"
                    : "0 4px 14px rgba(74, 63, 107, 0.25)",
                }}
              >
                <HistoryRoundedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      fontSize: "1.125rem",
                      color: isDark ? "#ffffff" : "#1e1b4b",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Recent Payments
                  </Typography>
                  {completedRecentPayments.length > 0 && (
                    <Chip
                      label={`${completedRecentPayments.length} Approved`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        bgcolor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
                        color: "#059669",
                        border: "1px solid",
                        borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? "text.secondary" : "#64748b",
                    fontSize: "0.825rem",
                    mt: 0.25,
                  }}
                >
                  Latest verified payment transactions
                </Typography>
              </Box>
            </Box>

            <ButtonBase
              onClick={() => navigate("/payments")}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                alignItems: "center",
                gap: 0.5,
                px: 1.5,
                py: 0.7,
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: isDark ? "#c4b5fd" : "#6d28d9",
                bgcolor: isDark ? "rgba(196, 181, 253, 0.08)" : "rgba(109, 40, 217, 0.05)",
                border: `1px solid ${isDark ? "rgba(196, 181, 253, 0.2)" : "rgba(109, 40, 217, 0.15)"}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: isDark ? "rgba(196, 181, 253, 0.16)" : "rgba(109, 40, 217, 0.12)",
                  transform: "translateX(2px)",
                },
              }}
            >
              View All
              <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
            </ButtonBase>
          </Box>

          {/* Table View of 5 transactions */}
          <TableContainer sx={{ flex: 1, borderRadius: "12px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}` }}>
            <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: isDark
                      ? alpha(theme.palette.primary.main, 0.16)
                      : alpha(theme.palette.primary.main, 0.06),
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: isDark ? "#c4b5fd" : "#4a3f6b",
                      py: 1.25,
                      pl: 2,
                      width: "48%",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                    }}
                  >
                    Event Details
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: isDark ? "#c4b5fd" : "#4a3f6b",
                      py: 1.25,
                      width: "26%",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                    }}
                  >
                    Amount
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: isDark ? "#c4b5fd" : "#4a3f6b",
                      py: 1.25,
                      pr: 2,
                      width: "26%",
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
                      sx={{ py: 6, borderBottom: "none" }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.25 }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
                            border: `1px dashed ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
                            display: "grid",
                            placeItems: "center",
                            color: "text.secondary",
                          }}
                        >
                          <HistoryRoundedIcon sx={{ fontSize: 26, opacity: 0.6 }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? "#ffffff" : "#1e293b" }}>
                          No Verified Payments Yet
                        </Typography>
                        
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  completedRecentPayments.slice(0, 5).map((item, idx) => {
                    const visuals = getCategoryVisuals(item.eventTypeName);
                    const CategoryIcon = visuals.icon;

                    return (
                      <TableRow
                        key={item.paymentId || idx}
                        hover
                        sx={{
                          transition: "all 0.18s ease",
                          "&:hover": {
                            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(74, 63, 107, 0.03)",
                          },
                          "&:last-child td": { borderBottom: "none" },
                        }}
                      >
                        {/* Event Name, Category & Date */}
                        <TableCell sx={{ py: 1.4, pl: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "8px",
                                bgcolor: visuals.bg,
                                color: visuals.color,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              <CategoryIcon sx={{ fontSize: 18 }} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <AppOverflowTooltip
                                text={item.eventName || "Event Payment"}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color: isDark ? "#ffffff" : "#0f172a",
                                  display: "block",
                                  lineHeight: 1.3,
                                }}
                              />
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.35, flexWrap: "wrap" }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: isDark ? "text.secondary" : "#64748b",
                                    fontSize: "0.735rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {dayjs(item.paymentDate).format("DD MMM YYYY")}
                                </Typography>
                                {item.paymentMode && item.paymentMode !== "--" && (
                                  <Box
                                    component="span"
                                    sx={{
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      px: 0.7,
                                      py: 0.15,
                                      borderRadius: "4px",
                                      bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                      color: isDark ? "#cbd5e1" : "#475569",
                                    }}
                                  >
                                    {item.paymentMode}
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Amount */}
                        <TableCell align="right" sx={{ py: 1.4, whiteSpace: "nowrap" }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.95rem",
                              color: isDark ? "#34d399" : "#059669",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {formatWholeCurrency(item.paymentAmount || 0)}
                          </Typography>
                        </TableCell>

                        {/* Status Chip */}
                        <TableCell align="center" sx={{ py: 1.4, pr: 2, whiteSpace: "nowrap" }}>
                          <Chip
                            icon={<CheckCircleRoundedIcon sx={{ fontSize: "14px !important", color: "#16a34a !important" }} />}
                            label="Approved"
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              height: 24,
                              px: 0.75,
                              borderRadius: "16px",
                              bgcolor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
                              color: isDark ? "#34d399" : "#059669",
                              border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0"}`,
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

          {/* Footer Bar */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2.25,
              pt: 1.75,
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: isDark ? "text.secondary" : "#64748b",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Recent Total:{" "}
              <Box component="span" sx={{ fontWeight: 800, color: isDark ? "#ffffff" : "#1e1b4b" }}>
                {formatWholeCurrency(totalRecentAmount)}
              </Box>
            </Typography>

            <ButtonBase
              onClick={() => navigate("/payments")}
              sx={{
                color: isDark ? "#c4b5fd" : "#6d28d9",
                fontWeight: 700,
                fontSize: "0.825rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.6,
                transition: "all 0.2s ease",
                "&:hover": {
                  color: isDark ? "#ddd6fe" : "#4c1d95",
                  transform: "translateX(2px)",
                },
              }}
            >
              Full Payment History
              <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
            </ButtonBase>
          </Box>
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

      {/* ── View Status Dialog for Pending Verification ── */}
      <Dialog
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setActiveStatusRow(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.1rem", pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <HourglassEmptyRoundedIcon sx={{ color: "#d97706", fontSize: 24 }} />
          Payment Status
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          {activeStatusRow && (
            <Stack spacing={2}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Event
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {activeStatusRow.eventName || "--"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Event Date
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {activeStatusRow.eventDate ? dayjs(activeStatusRow.eventDate).format("DD MMM YYYY") : "--"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                  {formatWholeCurrency(activeStatusRow.contributionAmount || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#d97706", mr: "4px !important" }} />}
                  label="Pending Verification"
                  size="small"
                  sx={{
                    bgcolor: "#fffbeb",
                    color: "#d97706",
                    fontWeight: 700,
                    borderRadius: "16px",
                    fontSize: "0.785rem",
                    border: "1px solid #fde68a",
                  }}
                />
              </Box>
              <Box
                sx={{
                  bgcolor: "#fffbeb",
                  borderRadius: "10px",
                  p: 1.5,
                  border: "1px solid #fde68a",
                  display: "flex",
                  gap: 1.25,
                  alignItems: "flex-start",
                }}
              >
                <InfoRoundedIcon sx={{ color: "#d97706", fontSize: 20, mt: 0.2 }} />
                <Typography variant="caption" sx={{ color: "#92400e", lineHeight: 1.45, fontWeight: 500 }}>
                  Your payment details and proof have been submitted and are currently awaiting review by an administrator. Once approved, this event will be settled and moved to Recent Payments.
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={() => {
              setStatusModalOpen(false);
              setActiveStatusRow(null);
            }}
            variant="contained"
            sx={{
              background: isDark
                ? "linear-gradient(90deg, #5a4c82 0%, #6f5ea0 100%)"
                : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
              color: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              px: 3,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
