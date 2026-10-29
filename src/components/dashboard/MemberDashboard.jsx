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
import { getPaymentContextAsync } from "../../services/paymentService";
import SubmitPaymentModal from "../payments/SubmitPaymentModal";
import AddSupportTicketModal from "../support/AddSupportTicketModal";
import ViewContributionModal from "../contributions/ViewContributionModal";
import BirthdayCelebrationModal from "../common/BirthdayCelebrationModal";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import MetricCard from "../common/MetricCard";
import AppDataTable from "../common/AppDataTable";
import AppOverflowTooltip from "../common/AppOverflowTooltip";
import AppDialog from "../common/AppDialog";
import AppButton, { AppCancelButton } from "../common/AppButton";

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
      isApproved: false,
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

  // 2. Approved / Verified by authority
  const isApproved =
    !isRejected &&
    (verifStatus === "verified" ||
      verifStatus === "approved" ||
      verifStatus === "completed" ||
      payStatus === "approved" ||
      payStatus === "verified" ||
      payStatus === "completed" ||
      payStatus === "closed");

  // 3. Paid by member (whether awaiting approval or approved)
  const isPaid =
    !isRejected &&
    (isApproved ||
      row.isPaid === true ||
      payStatus === "paid" ||
      payStatus === "pending verification" ||
      payStatus === "pending" ||
      verifStatus === "pending" ||
      row.paymentEligibility === false ||
      (row.outstandingAmount !== undefined && Number(row.outstandingAmount) === 0 && Number(row.verifiedPaidAmount) > 0));

  // 4. Partially Paid
  const isPartial =
    !isRejected &&
    !isApproved &&
    !isPaid &&
    (row.isPartial === true ||
      payStatus === "partially paid" ||
      payStatus === "partiallypaid" ||
      payStatus === "partially_paid" ||
      payStatus === "partial" ||
      payStatus.includes("partial") ||
      (Number(row.verifiedPaidAmount) > 0 && Number(row.outstandingAmount) > 0));

  // 5. Unpaid
  const isUnpaid = !isPaid && !isApproved && !isPartial && !isRejected;

  let statusKey = "unpaid";
  let displayStatus = "Unpaid";

  if (isRejected) {
    statusKey = "rejected";
    displayStatus = "Payment Rejected";
  } else if (isApproved) {
    statusKey = "approved";
    displayStatus = "Approved";
  } else if (isPaid) {
    statusKey = "paid";
    displayStatus = "Paid";
  } else if (isPartial) {
    statusKey = "partial";
    displayStatus = "Partially Paid";
  }

  return {
    statusKey,
    isPaid: isPaid || isApproved,
    isApproved,
    isPartial,
    isPendingVerif: isPaid && !isApproved,
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

  // Status modal state for viewing Contribution & Payment details
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [activeStatusRow, setActiveStatusRow] = useState(null);
  const [activeStatusTx, setActiveStatusTx] = useState(null);

  const handleOpenStatusModal = (row) => {
    if (!row) return;

    const memberFullName =
      row.memberName ||
      summary?.memberName ||
      authState?.fullName ||
      authState?.username ||
      "Contributor";

    const matchingRecent = (recentPayments || []).filter(
      (p) =>
        (row.eventId && p.eventId && String(row.eventId).toLowerCase() === String(p.eventId).toLowerCase()) ||
        (row.eventName && p.eventName && String(row.eventName).trim().toLowerCase() === String(p.eventName).trim().toLowerCase())
    );

    const isSplitPayment =
      matchingRecent.length > 1 ||
      matchingRecent.some((p) => String(p.paymentMode || "").toLowerCase().includes("split")) ||
      String(row.paymentMode || "").toLowerCase().includes("split") ||
      row.paymentMode === 5 ||
      row.paymentMode === "5" ||
      (Number(row.verifiedPaidAmount || 0) > 0 && Number(row.submittedAmount || 0) > 0 && Number(row.verifiedPaidAmount) > Number(row.submittedAmount));

    const totalVerifiedPaid = Number(row.verifiedPaidAmount || row.submittedAmount || row.contributionAmount || 0);
    const resolvedMode = isSplitPayment ? "Split" : (row.paymentMode || "Gpay");

    const matchedTx = {
      txnNumber: row.txnNumber,
      paymentMode: resolvedMode,
      amount: totalVerifiedPaid,
      status: row.paymentVerificationStatus || row.paymentStatus,
      notes: row.notes || row.rejectionReason,
      rejectionReason: row.rejectionReason,
      auditRemarks: row.auditRemarks || row.rejectionReason,
      verifiedBy: row.verifiedBy,
      verifiedOn: row.verifiedOn,
      paymentDate: row.paymentDate || row.verifiedOn || row.createdAt || row.eventDate,
      utr: row.txnNumber,
      screenshot: row.screenshot,
      createdBy: row.createdBy || memberFullName,
      isSplitGroup: isSplitPayment,
    };

    setActiveStatusRow({
      ...row,
      memberName: memberFullName,
      amount: Number(row.contributionAmount || row.amount || totalVerifiedPaid),
      paidAmount: totalVerifiedPaid,
      paymentMode: resolvedMode,
    });
    setActiveStatusTx(matchedTx);
    setStatusModalOpen(true);
  };

  // Support ticket modal state for raising issues on rejected payments
  const [supportTicketModalOpen, setSupportTicketModalOpen] = useState(false);
  const [selectedTicketRow, setSelectedTicketRow] = useState(null);

  const handleOpenSupportTicket = (row) => {
    if (!row) return;
    const reason = row.rejectionReason || row.auditRemarks || row.notes || "";
    setSelectedTicketRow({
      memberName: row.memberName || authState?.fullName || authState?.name || "",
      memberId: row.memberId || authState?.userId || "",
      eventId: row.eventId || "",
      relatedEvent: row.eventName || "",
      eventType: row.eventTypeName || row.categoryName || "",
      amount: row.contributionAmount || row.amount || 0,
      status: row.paymentStatus || "Payment Rejected",
      ticketType: "Payment Issue",
      priority: "High",
      description: reason
        ? `Payment rejected for event: ${row.eventName || "Event"}. Rejection Reason: ${reason}`
        : `Payment rejected for event: ${row.eventName || "Event"}.`,
    });
    setSupportTicketModalOpen(true);
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
  const handleOpenPayment = async (row) => {
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

    const currentDue = Number(row.outstandingAmount !== undefined ? row.outstandingAmount : (row.contributionAmount || 0));
    const targetEvId = String(row.eventId || "").toLowerCase();

    // 1. Dynamically gather other unpaid events for this member
    const otherUnpaidEvents = (contributions || []).filter((c) => {
      const cEvId = String(c.eventId || "").toLowerCase();
      if (!cEvId || cEvId === targetEvId) return false;
      const cInfo = getContributionStatusInfo(c);
      return !cInfo.isPaid && ((Number(c.outstandingAmount) || Number(c.contributionAmount) || 0) > 0);
    });

    let breakdown = otherUnpaidEvents.map((c) => {
      const due = Number(c.outstandingAmount !== undefined ? c.outstandingAmount : (c.contributionAmount || 0));
      return {
        eventId: c.eventId,
        eventName: c.eventName,
        title: c.eventName,
        amount: due,
        dueAmount: due,
      };
    });

    const otherSum = breakdown.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    let resolvedArrears = Math.max(Number(row.previousArrears || 0), otherSum);

    // If breakdown from currently visible contributions is empty but previous arrears exist from older months, fetch context
    if (breakdown.length === 0 && resolvedArrears > 0) {
      try {
        const ctx = await getPaymentContextAsync({
          eventId: row.eventId,
          memberId: row.memberId,
          eventName: row.eventName,
          memberName: row.memberName || displayName,
        });
        if (ctx) {
          if (Array.isArray(ctx.arrearBreakdown) && ctx.arrearBreakdown.length > 0) {
            breakdown = ctx.arrearBreakdown;
          }
          if (Number(ctx.previousArrears) > 0) {
            resolvedArrears = Number(ctx.previousArrears);
          }
        }
      } catch { }
    }

    // Dynamic fallback so breakdown array is never empty when previous arrears exist
    if (breakdown.length === 0 && resolvedArrears > 0) {
      breakdown = [
        {
          eventId: "previous_arrears",
          eventName: "Previous Unpaid Arrears",
          title: "Previous Unpaid Arrears",
          amount: resolvedArrears,
          dueAmount: resolvedArrears,
        },
      ];
    }

    const totalDue = currentDue + resolvedArrears;
    const defaultScope = resolvedArrears > 0 ? "AllOutstanding" : "CurrentEvent";
    const initialAmount = defaultScope === "AllOutstanding" ? totalDue : currentDue;

    setActivePaymentRow({
      ...row,
      currentDue,
      previousArrears: resolvedArrears,
      totalDue,
      arrearBreakdown: breakdown,
      paymentScope: defaultScope,
      amount: initialAmount,
      allMemberEvents: contributions || [],
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setActivePaymentRow(null);
    toast.success("Payment details submitted successfully!");
    window.dispatchEvent(new CustomEvent("contribution_updated"));
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

    if (filterKey === "PAID" || filterKey === "APPROVED" || filterKey === "VERIFIED") {
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return info.isApproved || info.isPaid;
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
    } else {
      // Default (ALL, UNPAID, PENDING dues):
      // The grid displays unpaid, partially paid, rejected, and member-paid events awaiting verification.
      // Once approved, the event leaves the grid and is displayed in the "Recent Payments" card.
      list = list.filter((c) => {
        const info = getContributionStatusInfo(c);
        return !info.isApproved;
      });
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
    const groupMap = new Map();

    (recentPayments || []).forEach((item) => {
      const rawSt = String(item.verificationStatus || item.status || "").trim().toLowerCase();
      if (rawSt === "completed" || rawSt === "verified" || rawSt === "approved") {
        const evKey = String(item.eventId || item.eventName || item.paymentId || "").trim().toLowerCase();
        if (!groupMap.has(evKey)) {
          groupMap.set(evKey, {
            paymentId: item.paymentId,
            eventId: item.eventId,
            eventName: item.eventName || "Event Payment",
            eventTypeName: item.eventTypeName || item.category || "Event",
            paymentDate: item.paymentDate,
            paymentAmount: Number(item.paymentAmount || 0),
            modes: [String(item.paymentMode || "").trim()].filter(Boolean),
            verificationStatus: "Approved",
          });
        } else {
          const existing = groupMap.get(evKey);
          existing.paymentAmount += Number(item.paymentAmount || 0);
          if (item.paymentMode) {
            existing.modes.push(String(item.paymentMode).trim());
          }
          if (dayjs(item.paymentDate).isAfter(dayjs(existing.paymentDate))) {
            existing.paymentDate = item.paymentDate;
          }
        }
      }
    });

    const list = Array.from(groupMap.values()).map((entry) => {
      // Cross-reference with contributions list to get complete event-level payment metrics
      const matchedContrib = (contributions || []).find((c) =>
        (entry.eventId && c.eventId && String(entry.eventId).toLowerCase() === String(c.eventId).toLowerCase()) ||
        (entry.eventName && c.eventName && String(entry.eventName).trim().toLowerCase() === String(c.eventName).trim().toLowerCase())
      );

      const uniqueModes = Array.from(new Set(entry.modes.map((m) => m.toLowerCase())));
      const contribMode = String(matchedContrib?.paymentMode || "").toLowerCase();

      const eventFullPaid = Number(matchedContrib?.verifiedPaidAmount || matchedContrib?.submittedAmount || 0);
      const isAmountMultiPart = eventFullPaid > entry.paymentAmount;

      const isSplit =
        uniqueModes.length > 1 ||
        uniqueModes.some((m) => m.includes("split")) ||
        contribMode.includes("split") ||
        matchedContrib?.paymentMode === 5 ||
        matchedContrib?.paymentMode === "5" ||
        isAmountMultiPart;

      let resolvedAmount = entry.paymentAmount;
      if (isAmountMultiPart && eventFullPaid > 0) {
        resolvedAmount = eventFullPaid;
      }

      let resolvedMode = "Gpay";
      if (isSplit) {
        resolvedMode = "Split";
      } else if (uniqueModes.length === 1) {
        const m = uniqueModes[0];
        if (m.includes("phonepe") || m.includes("phone")) resolvedMode = "Phonepe";
        else if (m.includes("cash")) resolvedMode = "Cash";
        else resolvedMode = "Gpay";
      } else if (contribMode) {
        if (contribMode.includes("phonepe") || contribMode.includes("phone")) resolvedMode = "Phonepe";
        else if (contribMode.includes("cash")) resolvedMode = "Cash";
        else resolvedMode = "Gpay";
      }

      return {
        ...entry,
        paymentAmount: resolvedAmount,
        paymentMode: resolvedMode,
      };
    });

    const seenEvents = new Set(list.map((x) => String(x.eventId || x.eventName || "").trim().toLowerCase()).filter(Boolean));

    // Also incorporate any approved items from contributions list if not already present
    (contributions || []).forEach((c) => {
      const info = getContributionStatusInfo(c);
      if (info.isApproved) {
        const evKey = String(c.eventId || c.eventName || "").trim().toLowerCase();
        if (evKey && !seenEvents.has(evKey)) {
          seenEvents.add(evKey);
          const rawM = String(c.paymentMode || "").toLowerCase();
          const isSplit = rawM.includes("split") || c.paymentMode === 5 || c.paymentMode === "5";
          let resolvedMode = "Gpay";
          if (isSplit) resolvedMode = "Split";
          else if (rawM.includes("phonepe") || rawM.includes("phone")) resolvedMode = "Phonepe";
          else if (rawM.includes("cash")) resolvedMode = "Cash";

          list.push({
            paymentId: c.contributionId || c.eventId,
            eventId: c.eventId,
            eventName: c.eventName || "Event Payment",
            eventTypeName: c.eventTypeName || c.category || "Event",
            paymentDate: c.paymentDate || c.eventDate,
            paymentAmount: Number(c.verifiedPaidAmount || c.submittedAmount || c.contributionAmount || 0),
            paymentMode: resolvedMode,
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

          // 1. Rejected
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

          // 2. Paid or Approved
          if (info.isPaid || info.isApproved) {
            return (
              <Chip
                icon={<CheckCircleRoundedIcon sx={{ fontSize: "15px !important", color: "#16a34a !important" }} />}
                label={info.isApproved ? "Approved" : "Paid"}
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

          // 3. Partially Paid
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
                    : "linear-gradient(90deg, #1e5183 0%, #2968a2 100%)",
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
                      : "linear-gradient(90deg, #162538 0%, #1e3a5f 100%)",
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

          if (info.isPaid || info.isApproved || info.isPendingVerif || info.isRejected) {
            return (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenStatusModal(row)}
                startIcon={<VisibilityRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderColor: info.isRejected
                    ? (isDark ? "rgba(239, 68, 68, 0.5)" : "#fca5a5")
                    : (isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1"),
                  color: info.isRejected
                    ? (isDark ? "#f87171" : "#dc2626")
                    : (isDark ? "#c4b5fd" : "#4a3f6b"),
                  bgcolor: info.isRejected
                    ? (isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.04)")
                    : "transparent",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.65,
                  fontSize: "0.825rem",
                  "&:hover": {
                    borderColor: info.isRejected ? "#dc2626" : "#7c3aed",
                    bgcolor: info.isRejected
                      ? (isDark ? "rgba(239, 68, 68, 0.18)" : "rgba(239, 68, 68, 0.1)")
                      : "rgba(124, 58, 237, 0.04)",
                  },
                }}
              >
                View Status
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
                      width: "46%",
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
                      width: "22%",
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
                      px: 1,
                      width: "32%",
                      minWidth: 105,
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
                                      fontWeight: 700,
                                      px: 0.75,
                                      py: 0.2,
                                      borderRadius: "4px",
                                      bgcolor: (() => {
                                        const m = String(item.paymentMode).toLowerCase();
                                        if (m.includes("split")) return isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)";
                                        if (m.includes("phonepe") || m.includes("phone")) return isDark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.1)";
                                        if (m.includes("gpay") || m.includes("google")) return isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.1)";
                                        if (m.includes("cash")) return isDark ? "rgba(22, 163, 74, 0.2)" : "rgba(22, 163, 74, 0.1)";
                                        return isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
                                      })(),
                                      color: (() => {
                                        const m = String(item.paymentMode).toLowerCase();
                                        if (m.includes("split")) return isDark ? "#a5b4fc" : "#6366f1";
                                        if (m.includes("phonepe") || m.includes("phone")) return isDark ? "#c4b5fd" : "#7c3aed";
                                        if (m.includes("gpay") || m.includes("google")) return isDark ? "#93c5fd" : "#2563eb";
                                        if (m.includes("cash")) return isDark ? "#86efac" : "#16a34a";
                                        return isDark ? "#cbd5e1" : "#475569";
                                      })(),
                                      border: (() => {
                                        const m = String(item.paymentMode).toLowerCase();
                                        if (m.includes("split")) return "1px solid rgba(99, 102, 241, 0.35)";
                                        if (m.includes("phonepe") || m.includes("phone")) return "1px solid rgba(124, 58, 237, 0.3)";
                                        if (m.includes("gpay") || m.includes("google")) return "1px solid rgba(37, 99, 235, 0.3)";
                                        if (m.includes("cash")) return "1px solid rgba(22, 163, 74, 0.3)";
                                        return "none";
                                      })(),
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
                        <TableCell align="center" sx={{ py: 1.4, px: 1, minWidth: 105, whiteSpace: "nowrap" }}>
                          <Chip
                            icon={<CheckCircleRoundedIcon sx={{ fontSize: "14px !important", color: "#16a34a !important" }} />}
                            label="Approved"
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              height: 24,
                              px: 0.5,
                              borderRadius: "16px",
                              bgcolor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
                              color: isDark ? "#34d399" : "#059669",
                              border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0"}`,
                              "& .MuiChip-label": {
                                px: 0.75,
                                overflow: "visible",
                                textOverflow: "clip",
                                whiteSpace: "nowrap",
                              },
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
          initialAmount={activePaymentRow.amount || (activePaymentRow.outstandingAmount || activePaymentRow.contributionAmount)}
          initialCurrentDue={activePaymentRow.currentDue !== undefined ? activePaymentRow.currentDue : (activePaymentRow.outstandingAmount || activePaymentRow.contributionAmount)}
          initialPreviousArrears={activePaymentRow.previousArrears || 0}
          initialTotalDue={activePaymentRow.totalDue || ((activePaymentRow.outstandingAmount || activePaymentRow.contributionAmount) + (activePaymentRow.previousArrears || 0))}
          initialStatus={activePaymentRow.paymentStatus}
          initialArrearBreakdown={activePaymentRow.arrearBreakdown || []}
          initialPaymentScope={activePaymentRow.paymentScope || (activePaymentRow.previousArrears > 0 ? "AllOutstanding" : "CurrentEvent")}
          initialAllMemberEvents={activePaymentRow.allMemberEvents || contributions || []}
        />
      )}

      {/* ── Contribution & Payment Details Dynamic Modal (Reuses ViewContributionModal) ── */}
      <ViewContributionModal
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setActiveStatusRow(null);
          setActiveStatusTx(null);
        }}
        row={activeStatusRow}
        matchedTx={activeStatusTx}
        allTransactions={recentPayments || []}
        events={eventTypes || []}
      />

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

      {/* ── Add Support Ticket Dialog ── */}
      <AddSupportTicketModal
        open={supportTicketModalOpen}
        onClose={() => {
          setSupportTicketModalOpen(false);
          setSelectedTicketRow(null);
        }}
        initialData={selectedTicketRow}
        onSuccess={async () => {
          loadDashboardData();
        }}
      />
    </Box>
  );
}
