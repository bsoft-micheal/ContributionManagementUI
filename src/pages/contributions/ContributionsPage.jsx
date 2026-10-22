import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Payments as PaymentsIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Save as SaveIcon,
  QrCodeScanner as QrCodeIcon,
  FilterList as FilterListIcon,
  PaymentRounded as PaymentIcon,
  FactCheckOutlined as StatusUpdateIcon,
  ConfirmationNumberOutlined as TicketIcon,
  SupportAgent as SupportAgentIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import SubmitPaymentModal from "../../components/payments/SubmitPaymentModal";
import ViewContributionModal from "../../components/contributions/ViewContributionModal";
import AddSupportTicketModal from "../../components/support/AddSupportTicketModal";
import VerifySupportTicketModal from "../../components/support/VerifySupportTicketModal";
import AppTextArea from "../../components/common/AppTextArea";

import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import {
  roundToWhole,
  formatWholeCurrency,
  formatWholeNumber,
} from "../../utils/roundingHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton, { AppCancelButton, AppSaveButton } from "../../components/common/AppButton";
import { getContributionsAsync, getContributionsByEventAsync, recordPaymentAsync } from "../../services/contributionService";
import { getSupportTicketsAsync } from "../../services/supportTicketService";
import { getEventsAsync } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { getRolesAsync } from "../../services/roleService";
import { getPaymentModesAsync } from "../../services/paymentModeService";
import { getStatusesAsync } from "../../services/statusService";
import { getPaymentTransactionsAsync, verifyPaymentTransactionAsync, createPaymentTransactionAsync } from "../../services/paymentService";
import AppDataTable from "../../components/common/AppDataTable";
import { getImageUrl } from "../../services/apiClient";

import AppDialog from "../../components/common/AppDialog";
import { validateForm } from "../../utils/validation";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";
import PaymentQrReminderDialog from "../../components/contributions/PaymentQrReminderDialog";
import {
  getPaymentQrConfig,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
  generateQrPngDataUrl,
} from "../../utils/upiQrHelper";
import { TOAST_MESSAGES, COMMON_STRINGS, MENU_FEATURE_IDS } from "../../constants";

const initialPayment = {
  eventId: "",
  memberId: "",
  amount: "",
  paymentMode: "",
  paymentDate: dayjs(),
  cashAmount: "",
  upiAmount: "",
};

export default function ContributionsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { addNotification } = useNotifications();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  // Granular Action Permissions (aligned with User Rights Master & menuConstants)
  const canAddContribution = hasActionPermission(
    "Submit",
    MENU_FEATURE_IDS.CONTRIBUTION_SUBMIT,
    authState?.role
  ).canExecute !== false;

  const canUpdateContribution = hasActionPermission(
    "Update",
    MENU_FEATURE_IDS.CONTRIBUTION_AUTHORITY_UPDATE,
    authState?.role
  ).canExecute;

  const canRaiseSupportTicket = hasActionPermission(
    "Support",
    MENU_FEATURE_IDS.CONTRIBUTION_RAISE_SUPPORT,
    authState?.role
  ).canExecute !== false;

  const canVerifySupportTicket = hasActionPermission(
    "Verify support Ticket",
    MENU_FEATURE_IDS.CONTRIBUTION_VERIFY_SUPPORT,
    authState?.role
  ).canExecute;

  const canViewContribution = hasActionPermission("View Contribution", MENU_FEATURE_IDS.CONTRIBUTION_SUBMIT, authState?.role).canView;
  const isMemberRole = String(authState?.role || "").toLowerCase() === "member";
  const isAuthorityRole = canUpdateContribution;

  // Authority Status Update state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalRow, setStatusModalRow] = useState(null);
  const [statusChangeValue, setStatusChangeValue] = useState("");
  const [auditRemarks, setAuditRemarks] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [dbStatuses, setDbStatuses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [verifiedKeys, setVerifiedKeys] = useState(() => new Set());
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [supportTicketModalOpen, setSupportTicketModalOpen] = useState(false);
  const [selectedTicketRow, setSelectedTicketRow] = useState(null);
  const [verifyTicketModalOpen, setVerifyTicketModalOpen] = useState(false);
  const [selectedVerifyTicketRow, setSelectedVerifyTicketRow] = useState(null);
  const [supportTickets, setSupportTickets] = useState([]);

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [filterEventId, setFilterEventId] = useState("");
  const [eventTypes, setEventTypes] = useState([]);
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [appliedEventType, setAppliedEventType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [rawContributions, setRawContributions] = useState([]);

  // --- All remaining useState declarations (must be before any useEffect/useMemo that references them) ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedContributionForQr, setSelectedContributionForQr] = useState(null);
  const [payment, setPayment] = useState(initialPayment);
  const [allContributions, setAllContributions] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  // View Contribution Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewModalRow, setViewModalRow] = useState(null);
  const [viewModalTx, setViewModalTx] = useState(null);

  // Submit Payment Details Modal State
  const [submitPaymentModalOpen, setSubmitPaymentModalOpen] = useState(false);
  const [paymentModalContext, setPaymentModalContext] = useState({
    eventId: "",
    eventName: "",
    eventCategory: "",
    memberId: "",
    memberName: "",
    amount: "",
    arrearBreakdown: [],
  });

  const reloadAllContributions = useCallback(async () => {
    try {
      const allData = await getContributionsAsync();
      const list = Array.isArray(allData) ? allData : [];
      setAllContributions(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  // --- Effects & Memos (all state is declared above, so no TDZ errors) ---
  useEffect(() => {
    if (!selectedEventId) {
      setRawContributions([]);
      return;
    }

    let isMounted = true;
    async function loadContributions() {
      try {
        let freshAll = allContributions;
        if (!freshAll || freshAll.length === 0) {
          freshAll = await reloadAllContributions();
        }

        let rawData = [];
        if (selectedEventId !== "ALL") {
          rawData = await getContributionsByEventAsync(selectedEventId);
        } else {
          if (appliedEventType && appliedEventType !== "ALL") {
            const matchingEventIds = new Set(
              (events || [])
                .filter((e) => isMatchingEventType(e, appliedEventType))
                .map((e) => String(e.eventId || e.id))
            );
            rawData = (freshAll || []).filter(
              (c) =>
                matchingEventIds.has(String(c.eventId)) ||
                (c.categoryName && c.categoryName.toLowerCase() === appliedEventType.toLowerCase())
            );
          } else {
            rawData = freshAll || [];
          }
        }

        if (isMounted) {
          setRawContributions(Array.isArray(rawData) ? rawData : []);
        }
      } catch (error) {
        if (isMounted) toast.error("Failed to load contributions.");
      }
    }

    loadContributions();
    return () => {
      isMounted = false;
    };
  }, [selectedEventId, appliedEventType, allContributions, reloadAllContributions]);

  useEffect(() => {
    const handleContributionUpdated = async () => {
      let updatedTxns = transactions;
      try {
        const txRes = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes)) {
          setTransactions(txRes);
          updatedTxns = txRes;
        }
      } catch { }
      const freshAll = await reloadAllContributions();
      if (selectedEventId) {
        let freshData = [];
        if (selectedEventId !== "ALL") {
          freshData = await getContributionsByEventAsync(selectedEventId);
        } else {
          freshData = freshAll || [];
        }
        const enriched = enrichContributions(freshData, freshAll, events, updatedTxns);
        setRawContributions(enriched);
      }
    };
    window.addEventListener("contribution_updated", handleContributionUpdated);
    return () => {
      window.removeEventListener("contribution_updated", handleContributionUpdated);
    };
  }, [selectedEventId, events, transactions]);

  const getMemberEventAmount = (c, activeEv) => {
    const directAmt = Number(c?.amount || 0);
    if (directAmt > 0) return directAmt;
    if (!activeEv) return 0;
    const base = Number(activeEv.baseAmount || activeEv.totalExpectedAmount || 0);
    const count = Number(activeEv.participantCount || (activeEv.participants && activeEv.participants.length) || 0);
    if (count > 0 && base > 0) {
      return roundToWhole(base / count);
    }
    return base > 0 ? base : 0;
  };

  const isSameText = (a, b) => {
    if (!a || !b) return false;
    const s1 = String(a).trim().toLowerCase();
    const s2 = String(b).trim().toLowerCase();
    return Boolean(s1 && s2 && s1 === s2);
  };

  const isMatchingEventName = (name1, name2) => {
    if (!name1 || !name2) return false;
    const s1 = String(name1).trim().toLowerCase();
    const s2 = String(name2).trim().toLowerCase();
    if (!s1 || !s2) return false;
    return s1 === s2;
  };

  const findContributionTransaction = (c, tList = transactions, fallbackEvId = selectedEventId) => {
    if (!c || !Array.isArray(tList) || tList.length === 0) return null;
    const targetMemberId = c.memberId || c.userId;
    const targetMemberName = c.memberName;
    const targetEventId = c.eventId || fallbackEvId;
    const targetEventName = c.eventName || (events || []).find(e => String(e.eventId || e.id) === String(targetEventId))?.eventName;

    return tList.find((t) => {
      // Member match: must match either ID or Name
      const tMemberId = t.userId || t.memberId;
      const tMemberName = t.memberName;
      const memberMatch = isSameText(targetMemberId, tMemberId) || isSameText(targetMemberName, tMemberName);
      if (!memberMatch) return false;

      // Event match: MUST strictly match Event ID if both present, or exact Event Name
      const tEventId = t.eventId;
      const tEventName = t.eventName;
      if (targetEventId && tEventId) {
        return isSameText(targetEventId, tEventId);
      }
      return isMatchingEventName(targetEventName, tEventName);
    }) || null;
  };

  const findAllContributionTransactions = (c, tList = transactions, fallbackEvId = selectedEventId) => {
    if (!c || !Array.isArray(tList) || tList.length === 0) return [];
    const targetMemberId = c.memberId || c.userId;
    const targetMemberName = c.memberName;
    const targetEventId = c.eventId || fallbackEvId;
    const targetEventName = c.eventName || (events || []).find(e => String(e.eventId || e.id) === String(targetEventId))?.eventName;

    return tList.filter((t) => {
      const tMemberId = t.userId || t.memberId;
      const tMemberName = t.memberName;
      const memberMatch = isSameText(targetMemberId, tMemberId) || isSameText(targetMemberName, tMemberName);
      if (!memberMatch) return false;

      const tEventId = t.eventId;
      const tEventName = t.eventName;
      if (targetEventId && tEventId) {
        return isSameText(targetEventId, tEventId);
      }
      return isMatchingEventName(targetEventName, tEventName);
    });
  };

  const normalizeModeName = (mode) => {
    if (!mode) return "";
    const trimmed = String(mode).trim();
    const lower = trimmed.toLowerCase();

    // Match against dynamic DB payment modes first
    if (Array.isArray(paymentModes) && paymentModes.length > 0) {
      const matched = paymentModes.find(
        (m) =>
          (m.paymentModeName && m.paymentModeName.trim().toLowerCase() === lower) ||
          (m.name && m.name.trim().toLowerCase() === lower) ||
          (m.paymentModeId && String(m.paymentModeId).toLowerCase() === lower)
      );
      if (matched) {
        return matched.paymentModeName || matched.name;
      }
    }

    if (lower.includes("gpay") || lower.includes("google")) return "GPay";
    if (lower.includes("phonepe") || lower.includes("phone")) return "PhonePe";
    if (lower.includes("paytm")) return "Paytm";
    if (lower.includes("cash")) return "Cash";
    if (lower.includes("split")) return "Split";
    if (lower.includes("upi")) return "UPI";

    return trimmed;
  };

  const getResolvedPaymentMode = (c, matchedTx) => {
    const tx = matchedTx !== undefined ? matchedTx : findContributionTransaction(c);

    // 1. Check if multiple splits exist in matchedTx or row
    const splits = tx?.splits || c?.splits;
    if (Array.isArray(splits) && splits.length > 1) {
      return "Split";
    }

    // 2. Check for [Split Breakdown: ...] in notes
    const notes = String(tx?.notes || c?.notes || "");
    const splitMatch = notes.match(/\[Split Breakdown:\s*([^\]]+)\]/i);
    if (splitMatch) {
      const rawBreakdown = splitMatch[1];
      const items = rawBreakdown.split(",").map((s) => s.trim()).filter(Boolean);
      if (items.length > 1) {
        return "Split";
      }
      if (items.length === 1) {
        const modePart = items[0].split(":")[0]?.trim();
        if (modePart) return normalizeModeName(modePart);
      }
    }

    // 3. Check if multiple amounts are recorded (e.g. cash + upi)
    const cashAmt = Number(c?.cashAmount || tx?.cashAmount || 0);
    const upiAmt = Number(c?.upiAmount || tx?.upiAmount || 0);
    if (cashAmt > 0 && upiAmt > 0) {
      return "Split";
    }

    // 4. If single split row
    if (Array.isArray(splits) && splits.length === 1 && splits[0]?.mode) {
      return normalizeModeName(splits[0].mode);
    }

    // 5. Check raw mode
    const rawMode = String(c?.paymentMode || tx?.paymentMode || "").trim();
    if (rawMode && rawMode !== "-" && rawMode !== "--" && rawMode.toLowerCase() !== "none") {
      if (rawMode.toLowerCase().includes("split")) {
        return "Split";
      }
      if (rawMode.toLowerCase() === "upi" || rawMode.toLowerCase() === "online") {
        const lowerNotes = notes.toLowerCase();
        if (lowerNotes.includes("gpay") || lowerNotes.includes("google pay")) return "GPay";
        if (lowerNotes.includes("phonepe") || lowerNotes.includes("phone pe")) return "PhonePe";
        if (lowerNotes.includes("paytm")) return "Paytm";
        if (lowerNotes.includes("cash")) return "Cash";
      }
      return normalizeModeName(rawMode);
    }

    return "";
  };

  const findRaisedSupportTicket = (c) => {
    if (!c || !Array.isArray(supportTickets) || supportTickets.length === 0) return null;

    const rowMemberId = String(c.memberId || c.userId || "").trim().toLowerCase();
    const rowMemberName = String(c.memberName || "").trim().toLowerCase();
    if (!rowMemberId && !rowMemberName) return null;

    const rowEventId = String(c.eventId || (selectedEventId !== "ALL" ? selectedEventId : "") || "").trim().toLowerCase();
    const activeEvent = (events || []).find((e) => String(e.eventId || e.id).toLowerCase() === rowEventId);
    const rowEventName = (c.eventName || activeEvent?.eventName || activeEvent?.title || activeEvent?.name || "")
      .replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)/g, "")
      .trim()
      .toLowerCase();

    // Filter tickets that belong strictly to this member
    const memberTickets = [...supportTickets].reverse().filter((t) => {
      const tMemberId = String(t.memberId || t.userId || "").trim().toLowerCase();
      const tMemberName = String(t.memberName || "").trim().toLowerCase();

      return (rowMemberId && tMemberId && rowMemberId === tMemberId) ||
        (rowMemberName && tMemberName && rowMemberName === tMemberName);
    });

    if (memberTickets.length === 0) return null;

    // 1. Exact Match: member + eventId
    if (rowEventId) {
      const matchedByEventId = memberTickets.find((t) => {
        const tEventId = String(t.eventId || "").trim().toLowerCase();
        return Boolean(tEventId && tEventId === rowEventId);
      });
      if (matchedByEventId) return matchedByEventId;
    }

    // 2. Match: member + eventName
    if (rowEventName) {
      const matchedByEventName = memberTickets.find((t) => {
        const tEv = String(t.relatedEvent || t.eventName || "")
          .replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)/g, "")
          .trim()
          .toLowerCase();
        return Boolean(tEv && (tEv === rowEventName || tEv.includes(rowEventName) || rowEventName.includes(tEv)));
      });
      if (matchedByEventName) return matchedByEventName;
    }

    // 3. Match: member ticket with no specific event attached (general ticket raised by member)
    const generalTicket = memberTickets.find((t) => {
      const tEv = String(t.relatedEvent || t.eventName || "").trim();
      const tEvId = String(t.eventId || "").trim();
      return !tEv && !tEvId;
    });
    if (generalTicket) return generalTicket;

    return null;
  };

  const hasContributionPayment = (c, tx = null) => {
    if (!c) return false;
    const matchedTx = tx !== null ? tx : findContributionTransaction(c);

    // Direct contribution payment indicators
    const mode = String(c.paymentMode || "").trim().toLowerCase();
    const hasValidMode = Boolean(mode && mode !== "none" && mode !== "-" && mode !== "0");
    const hasDate = Boolean(c.paymentDate && !String(c.paymentDate).includes("0001-01-01"));
    if (hasDate && hasValidMode) return true;
    if (mode === "split" || mode.includes("split")) return true;

    // Amounts paid
    const cash = Number(c.cashAmount) || 0;
    const upi = Number(c.upiAmount) || 0;
    if (cash > 0 || upi > 0) return true;

    // Transaction strictly for THIS event with positive amount & non-rejected status
    if (matchedTx) {
      const txStatus = String(matchedTx.status || "").trim().toLowerCase();
      if (txStatus !== "rejected") {
        const amt = Number(matchedTx.amount) || 0;
        if (amt > 0 || txStatus === "verified" || txStatus === "paid" || txStatus === "pending") {
          return true;
        }
      }
    }

    // Backend status indicating paid or verified
    const rawStatus = String(c.statusName || c.paymentStatus || c.status || "").trim().toLowerCase();
    if (rawStatus === "paid" || rawStatus === "verified" || rawStatus === "closed" || rawStatus === "completed") {
      return true;
    }

    return false;
  };

  const isContributionVerified = (c, tx = null) => {
    if (!c) return false;
    const matchedTx = tx !== null ? tx : findContributionTransaction(c);

    const txStatus = String(matchedTx?.status || "").trim().toLowerCase();
    const rawStatus = String(c.statusName || c.paymentStatus || c.status || "").trim().toLowerCase();

    // If status is rejected or pending, it can NEVER be verified!
    if (rawStatus === "rejected" || txStatus === "rejected" || rawStatus === "pending" || txStatus === "pending") {
      return false;
    }

    // CRITICAL: A member who has NOT paid can NEVER be shown as Verified!
    if (!hasContributionPayment(c, matchedTx)) {
      return false;
    }

    const key = `${c.memberId}_${c.eventId}`;

    return Boolean(
      rawStatus === "verified" ||
      txStatus === "verified" ||
      (c.isVerified === true && rawStatus !== "rejected" && txStatus !== "rejected") ||
      (verifiedKeys.has(key) && rawStatus !== "rejected" && txStatus !== "rejected")
    );
  };

  const isContributionPaid = (c) => {
    if (!c) return false;
    if (typeof c === "string") {
      const s = c.trim().toLowerCase();
      return s === "paid" || s === "verified" || s === "closed" || s === "completed";
    }
    return hasContributionPayment(c);
  };

  const hasSubmittedPayment = (c) => {
    if (!c) return false;
    return hasContributionPayment(c);
  };

  const getContributionOutstanding = (c, activeEv) => {
    if (!c) return 0;
    if (isContributionPaid(c)) return 0;
    const isSubmitted = hasSubmittedPayment(c);
    if (isSubmitted) return 0;
    return getMemberEventAmount(c, activeEv);
  };

  const isMatchingEventType = (ev, typeFilter) => {
    if (!typeFilter || typeFilter === "ALL") return true;
    if (!ev) return false;
    const filterIdStr = String(typeFilter).trim().toLowerCase();
    const evTypeId = String(ev.eventTypeId || ev.id || "").trim().toLowerCase();
    if (evTypeId && evTypeId === filterIdStr) return true;

    const selectedTypeObj = (eventTypes || []).find(
      (t) => String(t.eventTypeId || t.id || "").trim().toLowerCase() === filterIdStr
    );
    const targetTypeName = (selectedTypeObj?.eventTypeName || selectedTypeObj?.name || typeFilter).trim().toLowerCase();
    const evTypeName = String(ev.eventTypeName || ev.categoryName || ev.eventType || "").trim().toLowerCase();

    if (evTypeName && targetTypeName && (evTypeName === targetTypeName || evTypeName.includes(targetTypeName))) {
      return true;
    }
    return false;
  };

  const enrichContributions = (rawData, allList = allContributions, evList = events, txList = transactions) => {
    let enriched = (rawData || [])
      .filter((c) => {
        const evIdToMatch = c.eventId || (selectedEventId !== "ALL" ? selectedEventId : "");
        return (evList || []).some((e) => String(e.eventId || e.id) === String(evIdToMatch));
      })
      .map((c) => {
      const activeEv = (evList || []).find(
        (e) => String(e.eventId || e.id) === String(c.eventId || (selectedEventId !== "ALL" ? selectedEventId : ""))
      );
      const resolvedAmount = getMemberEventAmount(c, activeEv);
      const currentContribution = {
        ...c,
        amount: resolvedAmount > 0 ? resolvedAmount : Number(c.amount || 0),
      };

      // Calculate Arrears: sum of unpaid contributions for this member in other events
      const targetMemberId = String(c.memberId || c.userId || "").toLowerCase().trim();
      const targetMemberName = String(c.memberName || "").toLowerCase().trim();
      const targetEventId = String(c.eventId || (selectedEventId !== "ALL" ? selectedEventId : "")).toLowerCase().trim();

      const previousUnpaidItems = (allList || []).filter((prev) => {
        const prevMemberId = String(prev.memberId || prev.userId || "").toLowerCase().trim();
        const prevMemberName = String(prev.memberName || "").toLowerCase().trim();
        const isSameMember = (targetMemberId && prevMemberId && targetMemberId === prevMemberId) ||
                             (targetMemberName && prevMemberName && targetMemberName === prevMemberName);
        if (!isSameMember) return false;

        const prevEventId = String(prev.eventId || "").toLowerCase().trim();
        if (!prevEventId || prevEventId === targetEventId) return false;

        if (isContributionPaid(prev)) return false;

        return (evList || []).some((e) => String(e.eventId || e.id).toLowerCase().trim() === prevEventId);
      });
      const matchedTx = findContributionTransaction(c, txList, c.eventId || (selectedEventId !== "ALL" ? selectedEventId : ""));
      const scope = String(c.paymentScope || c.scope || matchedTx?.notes || "").toLowerCase();
      const isAllOutstandingScope =
        scope.includes("alloutstanding") ||
        scope.includes("all outstanding") ||
        scope.includes("scope: all") ||
        scope.includes("scope:all") ||
        scope.includes("arrear");
      const isCurrentEventOnly =
        scope.includes("currentevent") ||
        scope.includes("current event") ||
        scope.includes("scope: current");

      const isArrearsCleared = isAllOutstandingScope && !isCurrentEventOnly && (hasSubmittedPayment(c, matchedTx) || isContributionPaid(c));

      const rawPreviousUnpaid = previousUnpaidItems.reduce((sum, prev) => {
        const prevEv = (evList || []).find((e) => String(e.eventId || e.id) === String(prev.eventId));
        const prevAmt = getMemberEventAmount(prev, prevEv);
        return sum + (prevAmt > 0 ? prevAmt : Number(prev.amount) || 0);
      }, 0);
      const previousUnpaid = isArrearsCleared ? 0 : rawPreviousUnpaid;
      const currentOutstanding = getContributionOutstanding(currentContribution, activeEv);
      const isVerified = isContributionVerified(currentContribution, matchedTx);
      const isRejected =
        String(matchedTx?.status || "").toLowerCase() === "rejected" ||
        String(c.paymentStatus || "").toLowerCase() === "rejected" ||
        String(c.statusName || "").toLowerCase() === "rejected";

      const isPaid =
        isContributionPaid(currentContribution, matchedTx) ||
        hasSubmittedPayment(currentContribution, matchedTx) ||
        c.paymentStatus === 2 ||
        String(c.paymentStatus || "").toLowerCase() === "paid" ||
        String(c.statusName || "").toLowerCase() === "paid" ||
        String(c.status || "").toLowerCase() === "paid" ||
        isVerified;

      let resolvedStatus = "Pending";
      if (isRejected) {
        resolvedStatus = "Rejected";
      } else if (isVerified) {
        resolvedStatus = "Verified";
      } else if (isPaid) {
        resolvedStatus = "Paid";
      }

      // Compute paid amount for this contribution
      let paidAmount = 0;
      const cash = Number(c.cashAmount) || 0;
      const upi = Number(c.upiAmount) || 0;
      const allTxns = findAllContributionTransactions(c, txList, c.eventId || (selectedEventId !== "ALL" ? selectedEventId : ""));
      const totalTxAmt = allTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const txAmt = totalTxAmt > 0 ? totalTxAmt : Number(matchedTx?.amount || 0);
      const rawPaid = Number(c.paidAmount) || Number(c.totalReceivedAmount) || 0;
      if (cash > 0 || upi > 0) {
        paidAmount = cash + upi;
      } else if (txAmt > 0) {
        paidAmount = txAmt;
      } else if (rawPaid > 0) {
        paidAmount = rawPaid;
      } else if (isPaid || isRejected) {
        paidAmount = resolvedAmount > 0 ? resolvedAmount : Number(c.amount || 0);
      }

      return {
        ...currentContribution,
        paymentStatus: resolvedStatus,
        isVerified,
        verifiedBy: currentContribution.verifiedBy || matchedTx?.verifiedBy,
        verifiedOn: currentContribution.verifiedOn || matchedTx?.verifiedOn,
        auditRemarks: currentContribution.auditRemarks || matchedTx?.auditRemarks || matchedTx?.notes || currentContribution.notes,
        notes: matchedTx?.notes || currentContribution.notes,
        rejectionReason: isRejected
          ? (currentContribution.rejectionReason || matchedTx?.notes || currentContribution.notes)
          : currentContribution.rejectionReason,
        paidAmount,
        previousUnpaid,
        previousUnpaidItems: isArrearsCleared ? [] : previousUnpaidItems,
        totalAccumulated: currentOutstanding + previousUnpaid,
      };
    });

    if (isMemberRole) {
      const userEmail = String(authState?.email || "").toLowerCase().trim();
      const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;
      enriched = enriched.filter(
        (c) =>
          (currentMemberId && String(c.memberId).toLowerCase() === currentMemberId) ||
          (userEmail && String(c.email || c.memberEmail || "").toLowerCase().trim() === userEmail) ||
          (authState?.user?.fullName &&
            String(c.memberName || "").toLowerCase().trim() ===
            String(authState.user.fullName).toLowerCase().trim())
      );
    }

    return enriched;
  };

  // contributions is derived from rawContributions via enrichContributions (defined above)
  const contributions = useMemo(() => {
    const enriched = enrichContributions(rawContributions, allContributions, events, transactions);
    if (!appliedStatus || appliedStatus === "ALL") return enriched;
    const filterLower = appliedStatus.toLowerCase();
    return enriched.filter((c) => {
      const statusLower = String(c.paymentStatus || "").toLowerCase();
      if (filterLower === "paid") {
        return statusLower === "paid" || statusLower === "verified";
      }
      if (filterLower === "pending") {
        return statusLower === "pending";
      }
      return statusLower === filterLower;
    });
  }, [rawContributions, allContributions, events, transactions, appliedStatus]);

  const handleOpenSubmitPaymentModal = (row) => {
    if (!row) return;
    const matchedTx = findContributionTransaction(row);
    const isVerifiedRow = isContributionVerified(row, matchedTx);
    const hasSubmitted = hasSubmittedPayment(row, matchedTx);
    const hasDirectPaid = isContributionPaid(row, matchedTx);
    const statusStr = String(row?.paymentStatus || row?.status || row?.statusName || "").trim().toLowerCase();
    const isPaidStatus = statusStr === "paid" || statusStr === "verified" || statusStr === "completed" || statusStr === "closed" || row?.paymentStatus === 2;
    const isSettledByAmount = Number(row?.paidAmount || 0) > 0 && (row?.totalAccumulated === undefined || Number(row?.totalAccumulated) <= 0);
    const isPaidMember = Boolean(isVerifiedRow || isPaidStatus || hasDirectPaid || hasSubmitted || isSettledByAmount);

    if (isPaidMember) {
      toast.info("This contribution has already been fully paid and settled.");
      return;
    }

    const evId = row?.eventId || selectedEventId || "";
    const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(evId));
    const isPaidRow = row ? (isContributionPaid(row) || String(row?.paymentStatus || row?.status || "").toLowerCase() === "paid") : false;
    const submitted = row ? (isPaidRow || hasSubmittedPayment(row)) : false;
    const resolvedEvAmt = row ? getMemberEventAmount(row, activeEv) : Number(activeEv?.baseAmount || 0);
    const currentEvDue = isPaidRow ? 0 : resolvedEvAmt;
    const prevArrears = isPaidRow ? 0 : Number(row?.previousUnpaid || 0);
    const totalDue = isPaidRow ? 0 : (currentEvDue + prevArrears);

    setPaymentModalContext({
      eventId: evId,
      eventName: row?.eventName || activeEv?.eventName || activeEv?.title || activeEv?.name || "",
      eventCategory: row?.categoryName || activeEv?.eventTypeName || activeEv?.categoryName || "",
      memberId: row?.memberId || "",
      memberName: row?.memberName || "",
      amount: isPaidRow || totalDue === 0 ? 0 : (totalDue > 0 ? totalDue : (resolvedEvAmt > 0 ? resolvedEvAmt : 0)),
      currentEventDue: currentEvDue,
      previousArrears: prevArrears,
      totalDue: totalDue,
      isSubmitted: submitted,
      paymentStatus: isPaidRow ? "Paid" : (row?.paymentStatus || "Pending"),
      arrearBreakdown: prevArrears === 0 ? [] : (row?.previousUnpaidItems || []),
    });
    setSubmitPaymentModalOpen(true);
  };

  const handleOpenViewModal = (row) => {
    if (!row) return;
    const matchedTx = findContributionTransaction(row);
    setViewModalRow(row);
    setViewModalTx(matchedTx);
    setViewModalOpen(true);
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        const [mems, rls, data, modes, evTypes] = await Promise.all([
          getMembersAsync(),
          getRolesAsync(),
          getEventsAsync(),
          getPaymentModesAsync(true).catch(() => []),
          getEventTypesAsync().catch(() => []),
        ]);
        setMembers(mems);
        setRoles(rls);
        setEvents(data);
        setPaymentModes(Array.isArray(modes) ? modes : []);
        setEventTypes(Array.isArray(evTypes) ? evTypes : []);
        if (data.length > 0) {

          setSelectedEventId(data[0].eventId);
          setFilterEventId(data[0].eventId);
        }
        try {
          const allData = await getContributionsAsync();
          setAllContributions(allData);
        } catch {
          setAllContributions([]);
        }

        try {
          const [stRes, txRes, ticketsRes] = await Promise.all([
            getStatusesAsync(true, "Contribution").catch(() => []),
            getPaymentTransactionsAsync().catch(() => []),
            getSupportTicketsAsync().catch(() => []),
          ]);
          if (Array.isArray(stRes)) setDbStatuses(stRes);
          if (Array.isArray(txRes)) setTransactions(txRes);
          if (Array.isArray(ticketsRes)) setSupportTickets(ticketsRes);
        } catch {
          // fallback
        }
      } catch {
        toast.error("Failed to load events and contributions data.");
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    const handleUpdate = async () => {
      try {
        const [txRes, ticketsRes] = await Promise.all([
           getPaymentTransactionsAsync().catch(() => []),
           getSupportTicketsAsync().catch(() => []),
        ]);
        if (Array.isArray(txRes)) setTransactions(txRes);
        if (Array.isArray(ticketsRes)) setSupportTickets(ticketsRes);
      } catch { }
      reloadAllContributions();
    };
    window.addEventListener("contribution_updated", handleUpdate);
    window.addEventListener("support_ticket_updated", handleUpdate);
    return () => {
      window.removeEventListener("contribution_updated", handleUpdate);
      window.removeEventListener("support_ticket_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!statusModalOpen) return;
    getStatusesAsync(true, "Contribution")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDbStatuses(res);
        }
      })
      .catch(() => {});
  }, [statusModalOpen]);



  const handleAmountChange = (val) => {
    setPayment((prev) => {
      const next = { ...prev, amount: val };
      if (isSplitMode && val !== "") {
        const total = Number(val) || 0;
        const currentCash = Number(prev.cashAmount);
        if (!isNaN(currentCash) && currentCash > 0 && currentCash <= total) {
          next.upiAmount = String(Math.round((total - currentCash) * 100) / 100);
        } else if (total > 0) {
          const half = Math.round((total / 2) * 100) / 100;
          next.cashAmount = String(half);
          next.upiAmount = String(Math.round((total - half) * 100) / 100);
        }
      }
      return next;
    });
    if (errors.amount || errors.split) setErrors(prev => ({ ...prev, amount: "", split: "" }));
  };

  const handlePaymentModeChange = (newMode) => {
    const matchedMode = (paymentModes || []).find(
      (m) =>
        (m.paymentModeName && m.paymentModeName.trim().toLowerCase() === String(newMode).trim().toLowerCase()) ||
        (m.paymentModeId && String(m.paymentModeId).toLowerCase() === String(newMode).trim().toLowerCase())
    );

    const isSplit = matchedMode
      ? (String(matchedMode.paymentType || "").toLowerCase() === "split" || String(matchedMode.paymentModeName || "").toLowerCase().includes("split"))
      : false;

    setPayment((current) => {
      const next = { ...current, paymentMode: newMode };
      if (isSplit) {
        const total = Number(current.amount) || 0;
        if (total > 0 && (!current.cashAmount || !current.upiAmount)) {
          const half = Math.round((total / 2) * 100) / 100;
          next.cashAmount = String(half);
          next.upiAmount = String(Math.round((total - half) * 100) / 100);
        }
      }
      return next;
    });
    if (errors.paymentMode || errors.split || errors.cashAmount || errors.upiAmount) {
      setErrors(prev => ({ ...prev, paymentMode: "", split: "", cashAmount: "", upiAmount: "" }));
    }
  };

  const handleCashAmountChange = (val) => {
    setPayment((prev) => {
      const total = Number(prev.amount) || 0;
      const parsedCash = val === "" ? 0 : (Number(val) || 0);
      const remainingUpi = Math.max(0, Math.round((total - parsedCash) * 100) / 100);
      return {
        ...prev,
        cashAmount: val,
        upiAmount: val === "" ? "" : String(remainingUpi)
      };
    });
    if (errors.cashAmount || errors.upiAmount || errors.split) {
      setErrors(prev => ({ ...prev, cashAmount: "", upiAmount: "", split: "" }));
    }
  };

  const handleUpiAmountChange = (val) => {
    setPayment((prev) => {
      const total = Number(prev.amount) || 0;
      const parsedUpi = val === "" ? 0 : (Number(val) || 0);
      const remainingCash = Math.max(0, Math.round((total - parsedUpi) * 100) / 100);
      return {
        ...prev,
        upiAmount: val,
        cashAmount: val === "" ? "" : String(remainingCash)
      };
    });
    if (errors.cashAmount || errors.upiAmount || errors.split) {
      setErrors(prev => ({ ...prev, cashAmount: "", upiAmount: "", split: "" }));
    }
  };

  const handlePaymentScopeChange = (scope) => {
    let newAmt = payment.currentEventDue || 0;
    if (scope === "PreviousArrears") newAmt = payment.previousArrears || 0;
    else if (scope === "AllOutstanding") newAmt = payment.totalDue || 0;

    setPayment((prev) => {
      const next = { ...prev, paymentScope: scope, amount: String(newAmt) };
      if (isSplitMode) {
        const half = Math.round((newAmt / 2) * 100) / 100;
        next.cashAmount = String(half);
        next.upiAmount = String(Math.round((newAmt - half) * 100) / 100);
      }
      return next;
    });
    if (errors.amount || errors.split) setErrors((prev) => ({ ...prev, amount: "", split: "" }));
  };

  const modeOptions = useMemo(() => {
    return (paymentModes || [])
      .filter((m) => m.isActive !== false)
      .map((m) => {
        const rawName = m.paymentModeName || m.name || "";
        return {
          label: rawName,
          value: rawName,
          isCash: m.isCash,
          supportsQr: m.supportsQr,
          paymentType: m.paymentType,
        };
      });
  }, [paymentModes]);

  const selectedModeObj = useMemo(() => {
    if (!payment.paymentMode || !Array.isArray(paymentModes)) return null;
    const search = String(payment.paymentMode).trim().toLowerCase();
    return (
      paymentModes.find(
        (m) =>
          (m.paymentModeName && m.paymentModeName.trim().toLowerCase() === search) ||
          (m.paymentModeId && String(m.paymentModeId).toLowerCase() === search)
      ) || null
    );
  }, [paymentModes, payment.paymentMode]);

  // Determine QR display capability purely using API / database flags (isCash, supportsQr, paymentType)
  const isQrSupported = useMemo(() => {
    if (!selectedModeObj) return false;
    if (typeof selectedModeObj.supportsQr === "boolean") {
      return selectedModeObj.supportsQr;
    }
    if (typeof selectedModeObj.isCash === "boolean") {
      return !selectedModeObj.isCash;
    }
    if (selectedModeObj.paymentType) {
      return String(selectedModeObj.paymentType).trim().toLowerCase() !== "cash";
    }
    return false;
  }, [selectedModeObj]);

  const isSplitMode = useMemo(() => {
    if (!selectedModeObj) return false;
    const type = String(selectedModeObj.paymentType || "").toLowerCase();
    const name = String(selectedModeObj.paymentModeName || "").toLowerCase();
    return type === "split" || name.includes("split");
  }, [selectedModeObj]);

  async function handlePay() {
    const filed = "This field is required";
    const schema = {
      amount: { required: true, type: "decimalonly", min: 0, max: 1000000, label: filed },
      paymentMode: { required: true, label: filed },
      paymentDate: { required: true, label: filed }
    };
    const newErrors = validateForm(payment, schema);

    if (isSplitMode) {
      const total = Number(payment.amount) || 0;
      const cash = Number(payment.cashAmount);
      const upi = Number(payment.upiAmount);

      if (payment.cashAmount === "" || isNaN(cash) || cash < 0) {
        newErrors.cashAmount = "Please enter valid cash amount";
      }
      if (payment.upiAmount === "" || isNaN(upi) || upi < 0) {
        newErrors.upiAmount = "Please enter valid UPI amount";
      }
      if (!newErrors.cashAmount && !newErrors.upiAmount) {
        const splitSum = Math.round((cash + upi) * 100) / 100;
        if (splitSum !== total) {
          newErrors.split = `Cash (₹${cash}) + UPI (₹${upi}) = ₹${splitSum} must equal Total (₹${total}).`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.split) {
        toast.error(newErrors.split);
      } else {
        toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      }
      return;
    }

    try {
      await recordPaymentAsync({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString(),
        amount: payment.amount === "" ? null : Number(payment.amount),
        cashAmount: isSplitMode ? (payment.cashAmount === "" ? null : Number(payment.cashAmount)) : null,
        upiAmount: isSplitMode ? (payment.upiAmount === "" ? null : Number(payment.upiAmount)) : null,
        paymentScope: payment.paymentScope || "CurrentEvent",
      });
      toast.success(TOAST_MESSAGES.CONTRIBUTIONS.SAVED_SUCCESS || TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      setDialogOpen(false);

      window.dispatchEvent(
        new CustomEvent("contribution_updated", {
          detail: { source: "contributions_page", payment },
        })
      );

      // Reload global and event contributions to update all outstanding balances
      const allData = await getContributionsAsync();
      setAllContributions(allData);

      let eventData = [];
      if (selectedEventId && selectedEventId !== "ALL") {
        eventData = await getContributionsByEventAsync(selectedEventId);
      } else {
        eventData = allData;
        if (appliedEventType && appliedEventType !== "ALL") {
          const matchingEventIds = new Set(
            (events || [])
              .filter((e) => isMatchingEventType(e, appliedEventType))
              .map((e) => String(e.eventId || e.id))
          );
          eventData = eventData.filter(
            (c) =>
              matchingEventIds.has(String(c.eventId)) ||
              (c.categoryName && c.categoryName.toLowerCase() === appliedEventType.toLowerCase())
          );
        }
      }
      setRawContributions(eventData);
    } catch (error) {
      const apiErrorMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(" ") : null) ||
        error.response?.data?.title ||
        TOAST_MESSAGES.GENERAL.SAVE_FAILED;
      toast.error(apiErrorMsg);
    }
  }

  const eventTypeOptions = useMemo(() => {
    const list = [{ label: "All Event Types", value: "ALL" }];
    const seen = new Set(["all"]);

    (eventTypes || []).forEach((t) => {
      const id = String(t.eventTypeId || t.id || "").trim();
      const name = String(t.eventTypeName || t.name || "").trim();
      if (id && name && !seen.has(id.toLowerCase()) && !seen.has(name.toLowerCase())) {
        seen.add(id.toLowerCase());
        seen.add(name.toLowerCase());
        list.push({ label: name, value: id });
      }
    });

    (events || []).forEach((e) => {
      const id = String(e.eventTypeId || "").trim();
      const name = String(e.eventTypeName || e.categoryName || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        if (id) seen.add(id.toLowerCase());
        list.push({ label: name, value: id || name });
      }
    });

    return list;
  }, [eventTypes, events]);

  const eventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const filteredEvents = (events || []).filter((e) => isMatchingEventType(e, filterEventType));

    filteredEvents.forEach((e) => {
      const dateStr = e.eventDate ? dayjs(e.eventDate).format("DD/MM/YYYY") : "";
      const label = dateStr ? `${e.eventName || "Unnamed Event"} (${dateStr})` : (e.eventName || "Unnamed Event");
      list.push({
        label,
        value: String(e.eventId || e.id),
      });
    });

    return list;
  }, [events, filterEventType, eventTypes]);

  const handleEventTypeChange = (newTypeId) => {
    setFilterEventType(newTypeId);
    if (newTypeId === "ALL") {
      return;
    }
    const matching = (events || []).filter((e) => isMatchingEventType(e, newTypeId));
    const stillValid = matching.some((e) => String(e.eventId || e.id) === String(filterEventId));
    if (!stillValid && filterEventId !== "ALL") {
      setFilterEventId("ALL");
    }
  };

  const handleApplyFilter = () => {
    setAppliedEventType(filterEventType);
    setSelectedEventId(filterEventId);
    setAppliedStatus(filterStatus);
  };

  const handleClearFilter = () => {
    setFilterEventType("ALL");
    setAppliedEventType("ALL");
    setFilterEventId("ALL");
    setSelectedEventId("ALL");
    setFilterStatus("ALL");
    setAppliedStatus("ALL");
  };

  const getActualReceivedAmount = useCallback((row, matchedTx) => {
    if (!row) return 0;
    const rawStatus = row.paymentStatus;
    const isPaidOrVerified =
      rawStatus === 2 ||
      rawStatus === "Paid" ||
      String(rawStatus).toLowerCase() === "paid" ||
      String(rawStatus).toLowerCase() === "verified" ||
      String(matchedTx?.status || "").toLowerCase() === "verified";

    const cashAmt = Number(matchedTx?.cashAmount || row.cashAmount || 0);
    const upiAmt = Number(matchedTx?.upiAmount || row.upiAmount || 0);
    const splitSum = cashAmt + upiAmt;

    if (isPaidOrVerified) {
      if (splitSum > 0) return splitSum;
      return Number(row.totalReceivedAmount || row.paidAmount || matchedTx?.amount || row.amount || 0);
    }

    const hasSubmittedProof = Boolean(
      (matchedTx && Number(matchedTx.amount) > 0) ||
      (row.paymentMode && row.paymentMode !== "-" && row.paymentMode !== "--" && row.paymentMode.toLowerCase() !== "none") ||
      row.utrNumber ||
      row.referenceNo
    );

    if (hasSubmittedProof) {
      if (splitSum > 0) return splitSum;
      return Number(
        matchedTx?.amount ||
        row.paidAmount ||
        row.totalReceivedAmount ||
        (Number(row.amount) > 0 && row.paymentMode && row.paymentMode !== "None" ? row.amount : 0)
      );
    }

    return Number(matchedTx?.amount || row.paidAmount || row.totalReceivedAmount || row.amount || 0);
  }, []);

  const getModalStatusOptions = (row) => {
    const matchedTx = row ? findContributionTransaction(row) : null;
    const actualReceivedAmt = getActualReceivedAmount(row, matchedTx);
    const isAmountReceived = actualReceivedAmt > 0;

    // Allowed statuses for Authority Status Update modal: Pending, Rejected, Verified (Paid is strictly excluded)
    const allowed = ["pending", "verified", "rejected"];

    let options = [];

    if (Array.isArray(dbStatuses) && dbStatuses.length > 0) {
      options = dbStatuses
        .filter((s) => {
          const name = String(s.statusName || "").toLowerCase().trim();
          return s.statusName && s.isActive !== false && allowed.includes(name) && name !== "paid";
        })
        .map((s) => {
          const name = s.statusName.trim();
          const isVerificationStatus = name.toLowerCase() === "verified";
          return {
            label: !isAmountReceived && isVerificationStatus
              ? `${name} (Payment not received)`
              : name,
            value: name,
            disabled: !isAmountReceived && isVerificationStatus,
          };
        });
    }

    // Ensure all 3 required statuses (Pending, Verified, Rejected) exist in options
    const existingValues = new Set(options.map((o) => o.value.toLowerCase()));

    if (!existingValues.has("pending")) {
      options.push({ label: "Pending", value: "Pending", disabled: false });
    }
    if (!existingValues.has("verified")) {
      options.push({
        label: isAmountReceived ? "Verified" : "Verified (Payment not received)",
        value: "Verified",
        disabled: !isAmountReceived,
      });
    }
    if (!existingValues.has("rejected")) {
      options.push({ label: "Rejected", value: "Rejected", disabled: false });
    }

    // Sort to keep consistent order: Pending, Verified, Rejected
    const order = ["pending", "verified", "rejected"];
    options.sort((a, b) => order.indexOf(a.value.toLowerCase()) - order.indexOf(b.value.toLowerCase()));

    // Never display "Paid" even if row's current paymentStatus is "Paid"
    if (
      row?.paymentStatus &&
      String(row.paymentStatus).toLowerCase().trim() !== "paid" &&
      !options.some((o) => o.value.toLowerCase() === String(row.paymentStatus).toLowerCase().trim())
    ) {
      return [{ label: String(row.paymentStatus), value: String(row.paymentStatus) }, ...options];
    }

    return options;
  };
  const renderStatusBadge = (status) => {
    let color = "#b45309";
    let bg = "rgba(234,179,8,0.12)";

    const st = String(status || "").toLowerCase().trim();

    if (st === "paid" || st === "verified" || st === "closed") {
      color = "#16a34a";
      bg = "rgba(22,163,74,0.12)";
    } else if (st === "in progress") {
      color = "#6366f1";
      bg = "rgba(99,102,241,0.12)";
    } else if (st === "open") {
      color = "#0284c7";
      bg = "rgba(2,132,199,0.12)";
    } else if (st === "failed" || st === "rejected") {
      color = "#dc2626";
      bg = "rgba(220,38,38,0.12)";
    }

    return (
      <Chip
        label={status || "Pending"}
        size="small"
        sx={{
          bgcolor: bg,
          color: color,
          fontWeight: 800,
          fontSize: "0.72rem",
          height: 22,
          borderRadius: "6px",
        }}
      />
    );
  };

  const handleStatusUpdate = async (row, newStatus, customNotes) => {
    const target = row || statusModalRow;
    if (!target) return;

    if (!newStatus || !String(newStatus).trim()) {
      setStatusError("This field is required");
      toast.error("This field is required");
      return;
    }

    const verifier = authState?.fullName || authState?.username || authState?.user?.name || authState?.user?.username || "Admin";
    const trimmedNotes = customNotes && String(customNotes).trim() ? String(customNotes).trim() : (auditRemarks && String(auditRemarks).trim() ? String(auditRemarks).trim() : "");
    const noteText = trimmedNotes || (String(newStatus).toLowerCase() === "rejected" ? `Rejected by ${verifier}.` : `Status updated to ${newStatus} by ${verifier}.`);

    const targetKey = `${target.memberId}_${target.eventId}`;
    if (String(newStatus).toLowerCase() === "verified") {
      setVerifiedKeys((prev) => new Set(prev).add(targetKey));
    } else {
      setVerifiedKeys((prev) => {
        const next = new Set(prev);
        next.delete(targetKey);
        return next;
      });
    }

    const isMarkingPaid = ["paid", "verified", "closed", "completed"].includes(String(newStatus).toLowerCase());

    const matchedTxnForValidation = findContributionTransaction(target);
    const actualReceived = getActualReceivedAmount(target, matchedTxnForValidation);

    if (actualReceived <= 0 && String(newStatus).toLowerCase() !== "rejected") {
      toast.error("Payment has not been received (Received Amount: ₹0.00). You cannot verify or save this status.");
      return;
    }

    // Optimistically update the current table row immediately
    setRawContributions((prev) =>
      prev.map((c) => {
        if (
          (target.contributionId && c.contributionId === target.contributionId) ||
          (String(c.memberId).toLowerCase() === String(target.memberId).toLowerCase() &&
            String(c.eventId).toLowerCase() === String(target.eventId).toLowerCase())
        ) {
          const isVerified = String(newStatus).toLowerCase() === "verified";
          const updatedStatus = isVerified ? "Verified" : (isMarkingPaid ? "Paid" : newStatus);
          const isPaid = isMarkingPaid;
          const arrears = c.previousUnpaid || 0;
          const splitAmount = (Number(c.cashAmount || 0) + Number(c.upiAmount || 0));
          const preservedPaid =
            splitAmount > 0
              ? splitAmount
              : (Number(c.paidAmount || 0) > 0
                ? Number(c.paidAmount)
                : (actualReceived > 0
                  ? actualReceived
                  : (Number(target.paidAmount || 0) > 0
                    ? Number(target.paidAmount)
                    : Number(c.amount || 0))));

          return {
            ...c,
            paidAmount: preservedPaid,
            paymentStatus: updatedStatus,
            statusName: updatedStatus,
            isVerified: isVerified,
            verifiedBy: isVerified ? verifier : c.verifiedBy,
            auditRemarks: noteText,
            notes: noteText,
            rejectionReason: String(newStatus).toLowerCase() === "rejected" ? noteText : c.rejectionReason,
            paymentDate: isPaid ? (c.paymentDate || new Date().toISOString()) : c.paymentDate,
            paymentMode: c.paymentMode && c.paymentMode !== "None" ? c.paymentMode : (isPaid ? "Cash" : c.paymentMode),
            totalAccumulated: isPaid ? arrears : (Number(c.amount || 0) + arrears),
          };
        }
        return c;
      })
    );

    try {
      setStatusSaving(true);

      let freshTxns = transactions;
      try {
        const txRes = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes)) {
          setTransactions(txRes);
          freshTxns = txRes;
        }
      } catch { }

      const matchedTxns = findAllContributionTransactions(target, freshTxns);
      const statusToSend = isMarkingPaid ? "Verified" : newStatus;

      if (matchedTxns.length > 0) {
        await Promise.all(
          matchedTxns.map((txn) => {
            const txnId = txn.transactionId || txn.id;
            return verifyPaymentTransactionAsync(txnId, {
              status: statusToSend,
              verifiedBy: verifier,
              notes: noteText,
            });
          })
        );
      } else {
        await createPaymentTransactionAsync({
          eventId: target.eventId,
          userId: target.memberId,
          memberName: target.memberName,
          eventName: target.eventName || events.find((e) => e.eventId === target.eventId)?.eventName || "Contribution",
          amount: Number(target.amount || target.totalAccumulated || 0),
          paymentMode: target.paymentMode && target.paymentMode !== "None" ? target.paymentMode : "Cash",
          status: statusToSend,
          notes: noteText,
          paymentDate: new Date().toISOString(),
        });
      }

      toast.success(`Contribution status updated to ${statusToSend} successfully!`);
      if (addNotification) {
        addNotification({
          type: "PAYMENT_STATUS_UPDATED",
          title: "Contribution Status Updated",
          message: `${target.memberName}'s contribution status updated to ${statusToSend}.`,
          link: "/contributions",
        });
      }

      setStatusModalOpen(false);
      setStatusModalRow(null);
      setAuditRemarks("");

      // Fetch latest transactions — critical: use this for both state + enrichment
      let latestTxns = freshTxns;
      try {
        const txRes2 = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes2)) {
          // Patch the verified transactions optimistically in case backend has slight delay
          const patchedTxns = txRes2.map((t) => {
            const wasVerified = matchedTxns.some(
              (m) => (m.transactionId || m.id) === (t.transactionId || t.id)
            );
            if (wasVerified) {
              return { ...t, status: statusToSend, verifiedBy: verifier, notes: noteText, auditRemarks: noteText };
            }
            return t;
          });
          setTransactions(patchedTxns);
          latestTxns = patchedTxns;
        }
      } catch { }

      // Dispatch AFTER updating local state so PaymentsPage gets consistent data
      window.dispatchEvent(
        new CustomEvent("contribution_updated", {
          detail: {
            action: "verify",
            status: statusToSend,
            target,
            verifiedTransactionIds: matchedTxns.map((t) => t.transactionId || t.id),
          },
        })
      );

      const freshAll = await reloadAllContributions();
      if (selectedEventId) {
        let freshData = [];
        if (selectedEventId !== "ALL") {
          freshData = await getContributionsByEventAsync(selectedEventId);
        } else {
          freshData = freshAll;
          if (appliedEventType && appliedEventType !== "ALL") {
            const matchingEventIds = new Set(
              (events || [])
                .filter((e) => isMatchingEventType(e, appliedEventType))
                .map((e) => String(e.eventId || e.id))
            );
            freshData = freshData.filter(
              (c) =>
                matchingEventIds.has(String(c.eventId)) ||
                (c.categoryName && c.categoryName.toLowerCase() === appliedEventType.toLowerCase())
            );
          }
        }
        // Use latestTxns (not stale `transactions` state) for enrichment
        const enriched = enrichContributions(freshData, freshAll, events, latestTxns);
        setRawContributions(enriched);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update contribution status");
    } finally {
      setStatusSaving(false);
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => {
        const matchedTx = findContributionTransaction(row);
        const statusStr = String(row?.paymentStatus || row?.status || row?.statusName || matchedTx?.status || "").trim().toLowerCase();
        const isVerifiedRow = isContributionVerified(row, matchedTx);
        const isActuallyVerified = statusStr === "verified" || (isVerifiedRow && statusStr !== "rejected");
        const hasSubmitted = hasSubmittedPayment(row, matchedTx);
        const hasDirectPaid = isContributionPaid(row, matchedTx);
        const isPaidStatus = statusStr === "paid" || statusStr === "verified" || statusStr === "completed" || statusStr === "closed" || row?.paymentStatus === 2;
        const isSettledByAmount = Number(row?.paidAmount || 0) > 0 && (row?.totalAccumulated === undefined || Number(row?.totalAccumulated) <= 0);
        const isPaidMember = Boolean(isActuallyVerified || isPaidStatus || hasDirectPaid || hasSubmitted || isSettledByAmount);

        const tooltipTitle = isPaidMember
          ? (isActuallyVerified
              ? "Payment Verified & Settled"
              : (hasSubmitted && statusStr === "pending")
              ? "Payment Proof Submitted (Pending Verification)"
              : "Payment Fully Cleared (Settled)")
          : "Submit Payment Details";

        return (
          <Box sx={{ display: "flex", gap: 0.6, alignItems: "center" }}>
            {/* View Contribution & Payment Details Icon */}
            <Tooltip title={canViewContribution !== false ? "View Details" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: canViewContribution === false ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={canViewContribution === false}
                  onClick={() => handleOpenViewModal(row)}
                >
                  <ViewIcon
                    sx={{
                      fontSize: "1.1rem",
                      color: canViewContribution !== false
                        ? actionIconColor
                        : (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8"),
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>

            {canAddContribution && (
              <Tooltip title={tooltipTitle}>
                <span style={{ display: "inline-flex", cursor: isPaidMember ? "not-allowed" : "pointer" }}>
                  <IconButton
                    size="small"
                    disabled={isPaidMember}
                    onClick={() => handleOpenSubmitPaymentModal(row)}
                    sx={{
                      p: 0.4,
                      color: isPaidMember ? "#9ca3af" : (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                      bgcolor: isPaidMember
                        ? "rgba(156, 163, 175, 0.08)"
                        : (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(74, 63, 107, 0.08)"),
                      borderRadius: "6px",
                      "&.Mui-disabled": {
                        color: "#9ca3af",
                        bgcolor: "rgba(156, 163, 175, 0.08)",
                        opacity: 0.65,
                      },
                      "&:hover": {
                        bgcolor: isPaidMember
                          ? "rgba(156, 163, 175, 0.08)"
                          : (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(74, 63, 107, 0.18)"),
                        color: isPaidMember ? "#9ca3af" : (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#3b325c"),
                      },
                    }}
                  >
                    <PaymentIcon sx={{ fontSize: "1.15rem" }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {canUpdateContribution && (
              <Tooltip title={isActuallyVerified ? "Already Verified" : "Authority Status Update"}>
                <span>
                  <IconButton
                    size="small"
                    disabled={isActuallyVerified}
                    onClick={() => {
                      setStatusModalRow(row);
                      setStatusChangeValue("");
                      setAuditRemarks("");
                      setStatusError("");
                      setStatusModalOpen(true);
                    }}
                    sx={{
                      p: 0.4,
                      color: isActuallyVerified ? "#9ca3af" : "#16a34a",
                      bgcolor: isActuallyVerified ? "rgba(156, 163, 175, 0.08)" : "rgba(22, 163, 74, 0.08)",
                      borderRadius: "6px",
                      "&:hover": {
                        bgcolor: isActuallyVerified ? "rgba(156, 163, 175, 0.08)" : "rgba(22, 163, 74, 0.18)",
                        color: isActuallyVerified ? "#9ca3af" : "#15803d",
                      },
                    }}
                  >
                    <StatusUpdateIcon sx={{ fontSize: "1.15rem" }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Raise Support Ticket Icon */}
            {canRaiseSupportTicket && (
              <Tooltip title="Raise Support Ticket">
                <IconButton
                  size="small"
                  onClick={() => {
                    const activeEvent = events.find((e) => String(e.eventId) === String(row.eventId || (selectedEventId !== "ALL" ? selectedEventId : "")));
                    setSelectedTicketRow({
                      memberName: row.memberName,
                      memberId: row.memberId,
                      eventId: row.eventId || (selectedEventId !== "ALL" ? selectedEventId : ""),
                      relatedEvent: row.eventName || activeEvent?.eventName || activeEvent?.title || "",
                      eventType: row.categoryName || activeEvent?.eventTypeName || activeEvent?.categoryName || activeEvent?.eventType || "",
                      amount: row.amount || row.totalAccumulated,
                      paymentMode: row.paymentMode,
                      status: row.paymentStatus,
                      contributionId: row.contributionId,
                    });
                    setSupportTicketModalOpen(true);
                  }}
                  sx={{
                    p: 0.4,
                    color: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.08)",
                    borderRadius: "6px",
                    "&:hover": {
                      bgcolor: "rgba(239, 68, 68, 0.18)",
                      color: "#dc2626",
                    },
                  }}
                >
                  <TicketIcon sx={{ fontSize: "1.15rem" }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Verify Support Ticket Icon - Only visible when member has actually raised a support ticket */}
            {(() => {
              const raisedTicket = findRaisedSupportTicket(row);
              if (!canVerifySupportTicket || !raisedTicket) return null;

              return (
                <Tooltip title={`Verify Support Ticket (${raisedTicket.ticketNo || "Raised"})`}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const activeEvent = events.find((e) => String(e.eventId) === String(row.eventId || (selectedEventId !== "ALL" ? selectedEventId : "")));
                      setSelectedVerifyTicketRow({
                        ...raisedTicket,
                        memberName: raisedTicket.memberName || row.memberName,
                        memberId: raisedTicket.memberId || row.memberId,
                        ticketId: raisedTicket.ticketId || raisedTicket.id,
                        ticketNo: raisedTicket.ticketNo,
                        attachment: raisedTicket.attachment,
                        description: raisedTicket.description || raisedTicket.Description || "",
                        status: raisedTicket.status || "Open",
                        ticketType: raisedTicket.ticketType || "Payment Issue",
                        priority: raisedTicket.priority || "Medium",
                        relatedEvent: raisedTicket.relatedEvent || raisedTicket.eventName || row.eventName || activeEvent?.eventName || activeEvent?.title || "",
                        eventName: raisedTicket.eventName || raisedTicket.relatedEvent || row.eventName || activeEvent?.eventName || "",
                        contributionId: row.contributionId,
                        paymentStatus: row.paymentStatus,
                      });
                      setVerifyTicketModalOpen(true);
                    }}
                    sx={{
                      p: 0.4,
                      color: "#0284c7",
                      bgcolor: "rgba(2, 132, 199, 0.1)",
                      borderRadius: "6px",
                      "&:hover": {
                        bgcolor: "rgba(2, 132, 199, 0.22)",
                        color: "#0369a1",
                      },
                    }}
                  >
                    <SupportAgentIcon sx={{ fontSize: "1.15rem" }} />
                  </IconButton>
                </Tooltip>
              );
            })()}
          </Box>
        );
      },
    },
    { label: "Member Name", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    ...(selectedEventId === "ALL"
      ? [
        {
          label: "Event Name",
          key: "eventName",
          render: (row) => {
            const ev = (events || []).find((e) => String(e.eventId || e.id) === String(row.eventId));
            return (
              <Typography variant="body2" fontWeight={600} color="primary.main">
                {row.eventName || ev?.eventName || "--"}
              </Typography>
            );
          },
        },
      ]
      : []),
    {
      label: "Status",
      key: "paymentStatus",
      render: (row) => {
        const matchedTx = findContributionTransaction(row);
        const isVerified = isContributionVerified(row, matchedTx);
        const isPaid =
          isContributionPaid(row, matchedTx) ||
          hasSubmittedPayment(row, matchedTx) ||
          isVerified ||
          row?.paymentStatus === 2 ||
          String(row?.paymentStatus || "").toLowerCase() === "paid" ||
          String(row?.statusName || "").toLowerCase() === "paid";

        const isRejected =
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(row?.paymentStatus || "").toLowerCase() === "rejected" ||
          String(row?.statusName || "").toLowerCase() === "rejected";

        let displayStatus = "Pending";
        if (isRejected) {
          displayStatus = "Rejected";
        } else if (isVerified) {
          displayStatus = "Verified";
        } else if (isPaid) {
          displayStatus = "Paid";
        }

        const color = isRejected
          ? "#dc2626"
          : (isVerified ? "#16a34a" : (isPaid ? "#059669" : "#b45309"));
        const bg = isRejected
          ? "rgba(220,38,38,0.08)"
          : (isVerified ? "rgba(22,163,74,0.12)" : (isPaid ? "rgba(5,150,105,0.08)" : "rgba(234,179,8,0.12)"));

        return (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color,
              bgcolor: bg,
              px: 1.2,
              py: 0.3,
              borderRadius: "3px",
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
            }}
          >
            {displayStatus}
          </Typography>
        );
      }
    },
    {
      label: "Paid",
      key: "paidAmount",
      align: "right",
      render: (row) => {
        const allTxns = findAllContributionTransactions(row);
        const matchedTx = allTxns[0] || findContributionTransaction(row);
        const isVerified = isContributionVerified(row, matchedTx);
        const isPaid =
          isContributionPaid(row, matchedTx) ||
          hasSubmittedPayment(row, matchedTx) ||
          isVerified ||
          row?.paymentStatus === 2 ||
          String(row?.paymentStatus || "").toLowerCase() === "paid" ||
          String(row?.statusName || "").toLowerCase() === "paid";

        const isRejected =
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(row?.paymentStatus || "").toLowerCase() === "rejected" ||
          String(row?.statusName || "").toLowerCase() === "rejected";

        const activeEv = (events || []).find(
          (e) => String(e.eventId || e.id) === String(row.eventId || selectedEventId)
        );
        const eventAmount = getMemberEventAmount(row, activeEv);

        let paidAmount = 0;
        const cash = Number(row.cashAmount) || 0;
        const upi = Number(row.upiAmount) || 0;
        const totalTxAmt = allTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const txAmt = totalTxAmt > 0 ? totalTxAmt : (Number(matchedTx?.amount) || 0);
        const rawPaid = Number(row.paidAmount) || Number(row.totalReceivedAmount) || 0;

        if (cash > 0 || upi > 0) {
          paidAmount = cash + upi;
        } else if (txAmt > 0) {
          paidAmount = txAmt;
        } else if (rawPaid > 0) {
          paidAmount = rawPaid;
        } else if (isPaid || isRejected) {
          paidAmount = eventAmount > 0 ? eventAmount : Number(row.amount || 0);
        }

        const paidEventName =
          row.eventName ||
          activeEv?.eventName ||
          activeEv?.title ||
          matchedTx?.eventName ||
          "Current Event";

        const tooltipContent = paidAmount > 0 ? (
          <Box sx={{ p: 0.5, minWidth: 150 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: "block", color: "#86efac", mb: 0.3 }}>
              Paid Against Event:
            </Typography>
            <Typography variant="body2" sx={{ color: "#fff", fontSize: "0.78rem", fontWeight: 700 }}>
              {paidEventName}
            </Typography>
            {(row.paymentDate || matchedTx?.paymentDate) && (
              <Typography variant="caption" sx={{ display: "block", color: "#cbd5e1", mt: 0.4, fontSize: "0.72rem" }}>
                Payment Date: {formatGridDate(row.paymentDate || matchedTx?.paymentDate)}
              </Typography>
            )}
            {(() => {
              const displayMode = getResolvedPaymentMode(row, matchedTx);
              return displayMode ? (
                <Typography variant="caption" sx={{ display: "block", color: "#cbd5e1", fontSize: "0.72rem" }}>
                  Payment Mode: {displayMode}
                </Typography>
              ) : null;
            })()}
          </Box>
        ) : (
          `Pending payment for ${paidEventName}`
        );

        return (
          <Tooltip title={tooltipContent} arrow enterDelay={150}>
            <Typography
              variant="body2"
              fontWeight={paidAmount > 0 ? 800 : 500}
              color={paidAmount > 0 ? "success.main" : "text.secondary"}
              sx={{
                cursor: "help",
                textDecoration: paidAmount > 0 ? "underline dotted" : "none",
                display: "inline-block",
              }}
            >
              {formatWholeCurrency(paidAmount)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      label: "Amount",
      key: "amount",
      align: "right",
      render: (row) => {
        const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(row.eventId || selectedEventId));
        const eventAmount = getMemberEventAmount(row, activeEv);
        const displayAmount = eventAmount > 0 ? eventAmount : Number(row.amount || 0);

        return (
          <Typography
            variant="body2"
            fontWeight={700}
            color="inherit"
          >
            {formatWholeCurrency(displayAmount)}
          </Typography>
        );
      },
    },
    {
      label: "Arrears",
      key: "previousUnpaid",
      align: "right",
      render: (row) => {
        const displayArrears = row.previousUnpaid || 0;
        const arrearsList = row.previousUnpaidItems || [];
        const hasArrears = displayArrears > 0 && arrearsList.length > 0;
        const tooltipContent = hasArrears ? (
          <Box sx={{ p: 0.5, minWidth: 160 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: "block", color: "#f87171", mb: 0.5, borderBottom: "1px solid rgba(255,255,255,0.2)", pb: 0.3 }}>
              Unpaid Previous Events:
            </Typography>
            {arrearsList.map((item, idx) => (
              <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, fontSize: "0.72rem", py: 0.2 }}>
                <span style={{ color: "#e2e8f0" }}>• {item.eventName || "Event"}</span>
                <span style={{ fontWeight: 800, color: "#fff" }}>{formatWholeCurrency(item.amount || 0)}</span>
              </Box>
            ))}
            <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", mt: 0.5, pt: 0.3, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.75rem", color: "#fca5a5" }}>
              <span>Total Arrears:</span>
              <span>{formatWholeCurrency(displayArrears)}</span>
            </Box>
          </Box>
        ) : (displayArrears > 0 ? `Total Arrears: ${formatWholeCurrency(displayArrears)}` : "No previous arrears");

        return (
          <Tooltip title={tooltipContent} arrow enterDelay={150}>
            <Typography
              variant="body2"
              color={displayArrears > 0 ? "error.main" : "text.secondary"}
              fontWeight={displayArrears > 0 ? 800 : 400}
              sx={{
                cursor: displayArrears > 0 ? "help" : "default",
                textDecoration: displayArrears > 0 ? "underline dotted" : "none",
                display: "inline-block",
              }}
            >
              {formatWholeCurrency(displayArrears)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      label: "Total Due",
      key: "totalAccumulated",
      align: "right",
      render: (row) => {
        const isPaid = isContributionPaid(row) || hasSubmittedPayment(row);
        const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(row.eventId || selectedEventId));
        const currentDue = isPaid ? 0 : getContributionOutstanding(row, activeEv);
        const prevArrears = row.previousUnpaid || 0;
        const due = currentDue + prevArrears;
        return formatWholeCurrency(due);
      }
    },
    {
      label: "Payment Mode",
      key: "paymentMode",
      render: (row) => {
        const matchedTx = findContributionTransaction(row);
        const isPaid = isContributionPaid(row);
        const hasSubmitted = hasSubmittedPayment(row);
        let resolvedMode = "-";
        if (isPaid || hasSubmitted) {
          resolvedMode = getResolvedPaymentMode(row, matchedTx) || "-";
        }

        if (resolvedMode === "-" || resolvedMode === "None") {
          return <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>--</Typography>;
        }

        const isSplit = resolvedMode === "Split" || String(resolvedMode).toLowerCase().includes("split");

        if (isSplit) {
          const cashAmount = row.cashAmount || matchedTx?.cashAmount;
          const upiAmount = row.upiAmount || matchedTx?.upiAmount;
          const cashInfo = cashAmount ? `${formatWholeCurrency(cashAmount)} Cash` : "";
          const upiInfo = upiAmount ? `${formatWholeCurrency(upiAmount)} UPI` : "";
          const splitLabel = cashInfo && upiInfo ? `Split (${cashInfo} + ${upiInfo})` : "Split";
          const tooltipText = cashInfo && upiInfo ? `Split Payment: ${cashInfo} and ${upiInfo}` : "Split Payment (Partial Cash + Partial UPI)";

          return (
            <Tooltip title={tooltipText}>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  px: 1,
                  py: 0.3,
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "#4f46e5",
                  bgcolor: "rgba(79, 70, 229, 0.08)",
                  border: "1px solid rgba(79, 70, 229, 0.25)",
                }}
              >
                {splitLabel}
              </Box>
            </Tooltip>
          );
        }
        return resolvedMode !== "None" ? resolvedMode : "-";
      },
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.createdBy || row.CreatedBy || "--"}
        </Typography>
      ),
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title={isMemberRole ? "My Contribution Details" : "Contribution Collections"}
        columns={columns}
        data={contributions}
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 220, maxWidth: 280 }}>
                <AppSelect
                  label="Event Type"
                  placeholder="Select event type"
                  value={filterEventType}
                  onChange={(event) => {
                    handleEventTypeChange(event.target.value || "ALL");
                  }}
                  onClear={() => handleEventTypeChange("ALL")}
                  options={eventTypeOptions}
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 260, maxWidth: 360 }}>
                <AppSelect
                  label="Event"
                  placeholder="Select an event"
                  value={filterEventId}
                  onChange={(event) => {
                    setFilterEventId(event.target.value || "ALL");
                  }}
                  onClear={() => setFilterEventId("ALL")}
                  options={eventOptions}
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 180, maxWidth: 240 }}>
                <AppSelect
                  label="Status"
                  placeholder="Select status"
                  value={filterStatus}
                  onChange={(event) => {
                    setFilterStatus(event.target.value || "ALL");
                  }}
                  onClear={() => setFilterStatus("ALL")}
                  options={[
                    { label: "All Statuses", value: "ALL" },
                    { label: "Paid", value: "Paid" },
                    { label: "Pending", value: "Pending" },
                  ]}
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={handleApplyFilter}
                sx={{
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                }}
              >
                Filter
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                onClick={handleClearFilter}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                  },
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
          </Grid>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        title="Contribution Collections "
        actions={
          <>
            <AppCancelButton onClick={() => setDialogOpen(false)} />
            <AppSaveButton
              onClick={handlePay}
              disabled={
                payment.paymentMode === "Split" && (
                  !payment.amount ||
                  Number(payment.amount) <= 0 ||
                  payment.cashAmount === "" ||
                  payment.upiAmount === "" ||
                  Math.round(((Number(payment.cashAmount) || 0) + (Number(payment.upiAmount) || 0)) * 100) / 100 !== Number(payment.amount)
                )
              }
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "#5e6783 !important" : "#4a3f6b !important",
                "&:hover": { bgcolor: theme.palette.mode === "dark" ? "#6b7390 !important" : "#3b325c !important" }
              }}
            >
              Save
            </AppSaveButton>
          </>
        }
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {/* Member Dues Summary Banner */}
          {(payment.previousArrears > 0 || payment.currentEventDue > 0) && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(74,63,107,0.04)",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.8, fontSize: "0.68rem" }}>
                Member Dues Summary
              </Typography>
              <Grid container spacing={1} textAlign="center">
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Current Event</Typography>
                  <Typography variant="body2" fontWeight={800} color={payment.currentEventDue > 0 ? "error.main" : "success.main"}>
                    {formatWholeCurrency(payment.currentEventDue || 0)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Previous Arrears</Typography>
                  <Typography variant="body2" fontWeight={800} color={payment.previousArrears > 0 ? "error.main" : "text.secondary"}>
                    {formatWholeCurrency(payment.previousArrears || 0)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Total Due</Typography>
                  <Typography variant="body2" fontWeight={900} color="primary.main">
                    {formatWholeCurrency(payment.totalDue || 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Payment Scope Selector */}
          {(payment.previousArrears > 0 || payment.currentEventDue > 0) && (
            <AppSelect
              label="Payment For *"
              placeholder="Select payment target"
              value={payment.paymentScope || "CurrentEvent"}
              onChange={(e) => handlePaymentScopeChange(e.target.value)}
              options={[
                ...(payment.currentEventDue > 0 ? [{ label: `Current Event Only (${formatWholeCurrency(payment.currentEventDue)})`, value: "CurrentEvent" }] : []),
                ...(payment.previousArrears > 0 ? [{ label: `Previous Arrears Only (${formatWholeCurrency(payment.previousArrears)})`, value: "PreviousArrears" }] : []),
                ...((payment.currentEventDue > 0 && payment.previousArrears > 0) ? [{ label: `All Outstanding (${formatWholeCurrency(payment.totalDue)})`, value: "AllOutstanding" }] : []),
              ]}
              required
            />
          )}

          <AppInput
            label="Amount"
            placeholder="Fixed payment amount (₹)"
            value={payment.amount}
            onChange={(event) => handleAmountChange(event.target.value)}
            restrictType="decimalonly"
            maxLength={10}
            disabled={true}
            error={!!errors.amount}
            helperText={
              errors.amount ||
              (isSplitMode
                ? "Total fixed due amount. You can adjust Cash and UPI amounts below."
                : "Fixed due amount for the selected payment scope.")
            }
            required
          />
          <AppSelect
            label="Payment Mode"
            placeholder="Select payment mode"
            value={payment.paymentMode}
            onChange={(event) => handlePaymentModeChange(event.target.value)}
            options={modeOptions}
            error={!!errors.paymentMode}
            helperText={errors.paymentMode}
            required
          />

          {isSplitMode && (
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(74, 63, 107, 0.03)",
                border: "1px dashed",
                borderColor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(74, 63, 107, 0.25)",
              }}
            >
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={800} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                  Split Payment Breakdown
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <AppInput
                    label="Cash Amount *"
                    placeholder="₹ Cash"
                    value={payment.cashAmount}
                    onChange={(e) => handleCashAmountChange(e.target.value)}
                    restrictType="decimalonly"
                    maxLength={10}
                    error={!!errors.cashAmount}
                    helperText={errors.cashAmount}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <AppInput
                    label="UPI Amount *"
                    placeholder="₹ UPI"
                    value={payment.upiAmount}
                    onChange={(e) => handleUpiAmountChange(e.target.value)}
                    restrictType="decimalonly"
                    maxLength={10}
                    error={!!errors.upiAmount}
                    helperText={errors.upiAmount}
                    required
                  />
                </Grid>
              </Grid>

              {/* Real-time Balance Status Indicator */}
              {(() => {
                const tot = Number(payment.amount) || 0;
                const c = Number(payment.cashAmount) || 0;
                const u = Number(payment.upiAmount) || 0;
                const sum = Math.round((c + u) * 100) / 100;
                const isBalanced = tot > 0 && sum === tot && payment.cashAmount !== "" && payment.upiAmount !== "";
                const diff = Math.round((tot - sum) * 100) / 100;

                if (isBalanced) {
                  return (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1,
                        borderRadius: "8px",
                        bgcolor: "rgba(22, 163, 74, 0.08)",
                        border: "1px solid rgba(22, 163, 74, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 800, fontSize: "0.75rem" }}>
                        ✓ Balanced: {formatWholeCurrency(c)} (Cash) + {formatWholeCurrency(u)} (UPI) = {formatWholeCurrency(tot)}
                      </Typography>
                    </Box>
                  );
                }

                if (tot > 0 && (payment.cashAmount !== "" || payment.upiAmount !== "")) {
                  return (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1,
                        borderRadius: "8px",
                        bgcolor: "rgba(220, 38, 38, 0.08)",
                        border: "1px solid rgba(220, 38, 38, 0.25)",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 800, fontSize: "0.72rem", display: "block" }}>
                        ⚠️ Split total is {formatWholeCurrency(sum)} (Diff: {diff > 0 ? `${formatWholeCurrency(diff)} remaining` : `${formatWholeCurrency(Math.abs(diff))} over`}).
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                        The sum of Cash + UPI must equal the Total Amount ({formatWholeCurrency(tot)}).
                      </Typography>
                    </Box>
                  );
                }

                return null;
              })()}
            </Box>
          )}

          <AppDateInput
            label="Payment Date"
            value={payment.paymentDate}
            onChange={(newValue) => {
              setPayment((current) => ({ ...current, paymentDate: newValue }));
              if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: "" }));
            }}
            error={!!errors.paymentDate}
            helperText={errors.paymentDate}
            required
          />

          {isQrSupported && (() => {
            const targetAmount = isSplitMode ? Number(payment.upiAmount || 0) : Number(payment.amount || 0);
            if (targetAmount <= 0) return null;

            const activeEventObj = events.find(e => e.eventId === selectedEventId);
            const qrConfig = getPaymentQrConfig(activeEventObj);

            const isUploaded = qrConfig.qrMode === "uploaded" && qrConfig.qrImage;
            let qrSrc = "";
            if (isUploaded) {
              qrSrc = qrConfig.qrImage;
            } else {
              qrSrc = generateQrPngDataUrl(
                buildUpiPaymentUri({
                  upiId: qrConfig.upiId || qrConfig.qrUpiId,
                  receiverName: qrConfig.receiverName || qrConfig.qrReceiverName,
                  amount: targetAmount,
                  note: `Contribution Payment - ${activeEventObj?.eventName || ""}`,
                }),
                200
              );
            }

            return (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(2, 132, 199, 0.08)" : "rgba(2, 132, 199, 0.04)"),
                  border: isUploaded ? "1px solid rgba(22, 163, 74, 0.3)" : "1px solid rgba(2, 132, 199, 0.2)",
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" fontWeight={800} sx={{ color: isUploaded ? "#16a34a" : "#0284c7", display: "block", mb: 0.8 }}>
                  {isUploaded
                    ? `Uploaded Custom QR (${formatWholeCurrency(targetAmount)})`
                    : isSplitMode
                    ? `Dynamic UPI QR (Split UPI Portion: ${formatWholeCurrency(targetAmount)})`
                    : `Dynamic UPI Payment QR (${formatWholeCurrency(targetAmount)})`}
                </Typography>
                <Box
                  component="img"
                  src={qrSrc}
                  alt="Payment QR Code"
                  sx={{
                    width: 130,
                    height: 130,
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                    p: 0.6,
                    bgcolor: "#ffffff",
                    borderRadius: "10px",
                    border: isUploaded ? "1.5px solid #16a34a" : "1.5px solid #0284c7",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.12)",
                  }}
                />
                {!isUploaded && qrConfig.upiId && (
                  <Typography variant="caption" fontWeight={700} sx={{ color: "#0284c7", fontSize: "0.72rem", mt: 0.5, display: "block" }}>
                    UPI ID: {qrConfig.upiId} {qrConfig.receiverName ? `(${qrConfig.receiverName})` : ""}
                  </Typography>
                )}
                {isUploaded && (
                  <Typography variant="caption" fontWeight={700} sx={{ color: "#16a34a", fontSize: "0.72rem", mt: 0.5, display: "block" }}>
                    Payment QR uploaded manually
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.4, display: "block" }}>
                  {isSplitMode
                    ? `Scan with any UPI app to pay ${formatWholeCurrency(targetAmount)} online. Collect ${formatWholeCurrency(Number(payment.cashAmount || 0))} in cash.`
                    : `Scan with any UPI app to pay ${formatWholeCurrency(targetAmount)} directly.`}
                </Typography>
              </Box>
            );
          })()}
        </Stack>
      </AppDialog>

      {/* Dynamic Payment QR & Email Reminder Dialog */}
      <PaymentQrReminderDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        contribution={selectedContributionForQr}
        event={events.find((e) => e.eventId === selectedContributionForQr?.eventId)}
        member={members.find((m) => m.memberId === selectedContributionForQr?.memberId)}
      />

      {/* ── View Contribution Details Modal ── */}
      <ViewContributionModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewModalRow(null);
          setViewModalTx(null);
        }}
        row={viewModalRow}
        matchedTx={viewModalTx}
        events={events}
        onPay={canAddContribution ? () => {
          const target = viewModalRow;
          setViewModalOpen(false);
          if (target) handleOpenSubmitPaymentModal(target);
        } : undefined}
      />

      {/* ── Submit Payment Details Modal ── */}
      <SubmitPaymentModal
        open={submitPaymentModalOpen}
        onClose={() => setSubmitPaymentModalOpen(false)}
        initialEventId={paymentModalContext.eventId || selectedEventId}
        initialEventName={paymentModalContext.eventName}
        initialEventCategory={paymentModalContext.eventCategory}
        initialMemberId={paymentModalContext.memberId}
        initialMemberName={paymentModalContext.memberName}
        initialAmount={paymentModalContext.amount}
        initialCurrentDue={paymentModalContext.currentEventDue}
        initialPreviousArrears={paymentModalContext.previousArrears}
        initialTotalDue={paymentModalContext.totalDue}
        initialIsSubmitted={paymentModalContext.isSubmitted}
        initialStatus={paymentModalContext.paymentStatus}
        initialArrearBreakdown={paymentModalContext.arrearBreakdown}
        onSuccess={async () => {
          let updatedTxns = transactions;
          try {
            const txRes = await getPaymentTransactionsAsync();
            if (Array.isArray(txRes)) {
              setTransactions(txRes);
              updatedTxns = txRes;
            }
          } catch { }
          const freshAll = await reloadAllContributions();
          if (selectedEventId) {
            let freshData = [];
            if (selectedEventId !== "ALL") {
              freshData = await getContributionsByEventAsync(selectedEventId);
            } else {
              const allList = (freshAll && freshAll.length > 0) ? freshAll : [];
              if (appliedEventType && appliedEventType !== "ALL") {
                const matchingEventIds = new Set(
                  (events || [])
                    .filter((e) => isMatchingEventType(e, appliedEventType))
                    .map((e) => String(e.eventId || e.id))
                );
                freshData = allList.filter(
                  (c) =>
                    matchingEventIds.has(String(c.eventId)) ||
                    (c.categoryName && c.categoryName.toLowerCase() === appliedEventType.toLowerCase())
                );
              } else {
                freshData = allList;
              }
            }
            const enriched = enrichContributions(freshData, freshAll, events, updatedTxns);
            setRawContributions(enriched);
          }
        }}
      />

      {/* ── Authority Status Update Modal (From Support Status Master) ── */}
      <AppDialog
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setStatusModalRow(null);
          setStatusChangeValue("");
          setAuditRemarks("");
          setStatusError("");
        }}
        title="Authority Status Update"
        maxWidth="md"
        actions={
          (() => {
            const matchedTx = statusModalRow ? findContributionTransaction(statusModalRow) : null;
            const actualReceivedAmt = getActualReceivedAmount(statusModalRow, matchedTx);
            const isZeroAmount = actualReceivedAmt <= 0;

            return (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AppCancelButton onClick={() => setStatusModalOpen(false)}>
                  Close
                </AppCancelButton>
                <AppSaveButton
                  loading={statusSaving}
                  disabled={isZeroAmount && String(statusChangeValue).toLowerCase() !== "rejected"}
                  disabledTooltip={
                    isZeroAmount && String(statusChangeValue).toLowerCase() !== "rejected"
                      ? "Cannot save or verify: Payment amount has not been received (₹0.00). Member must submit payment first."
                      : ""
                  }
                  onClick={() => {
                    if (!statusChangeValue || !String(statusChangeValue).trim()) {
                      setStatusError("This field is required");
                      toast.error("This field is required");
                      return;
                    }
                    handleStatusUpdate(
                      statusModalRow,
                      statusChangeValue,
                      auditRemarks
                    );
                  }}
                >
                  Save
                </AppSaveButton>
              </Stack>
            );
          })()
        }
      >
        {statusModalRow && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: 1.8,
              }}
            >


              {/* Submitted Payment Details Summary Card */}
              {(() => {
                const matchedTx = findContributionTransaction(statusModalRow);
                const actualReceivedAmt = getActualReceivedAmount(statusModalRow, matchedTx);
                const rawStatus = statusModalRow?.paymentStatus;
                const isPaidOrVerified =
                  rawStatus === 2 ||
                  rawStatus === "Paid" ||
                  String(rawStatus).toLowerCase() === "paid" ||
                  String(rawStatus).toLowerCase() === "verified" ||
                  String(matchedTx?.status || "").toLowerCase() === "verified";

                const cashAmt = Number(matchedTx?.cashAmount || statusModalRow?.cashAmount || 0);
                const upiAmt = Number(matchedTx?.upiAmount || statusModalRow?.upiAmount || 0);
                const splitSum = cashAmt + upiAmt;

                const rawMode = statusModalRow?.paymentMode || matchedTx?.paymentMode;
                const modeStr = (rawMode && rawMode !== "-" && rawMode !== "--") ? rawMode : "None";
                const totalDueAmt = Number(statusModalRow?.totalDue || statusModalRow?.amount || matchedTx?.amount || 0);
                const hasSubmittedProof = Boolean(
                  (matchedTx && Number(matchedTx.amount) > 0) ||
                  (statusModalRow?.paymentMode && statusModalRow?.paymentMode !== "-" && statusModalRow?.paymentMode !== "--" && statusModalRow?.paymentMode.toLowerCase() !== "none") ||
                  statusModalRow?.utrNumber ||
                  statusModalRow?.referenceNo
                );

                const utrVal = statusModalRow?.utrNumber || statusModalRow?.referenceNo || statusModalRow?.utr || matchedTx?.utr || matchedTx?.transactionRef || matchedTx?.referenceNo || "--";
                const dateVal = statusModalRow?.paymentDate || matchedTx?.paymentDate || matchedTx?.createdOn;
                const dateDisplay = dateVal ? dayjs(dateVal).format("DD/MM/YYYY hh:mm A") : (isPaidOrVerified ? "Today" : "--");
                const scopeVal = statusModalRow?.paymentScope || matchedTx?.paymentScope || (totalDueAmt > 100 ? "All Outstanding" : "Current Event");
                const notesVal = statusModalRow?.notes || matchedTx?.notes || "";
                const createdByVal = statusModalRow?.createdBy || statusModalRow?.recordedBy || matchedTx?.createdBy || matchedTx?.memberName || "Member";
                const rawImgs = statusModalRow?.screenshots || matchedTx?.screenshots || statusModalRow?.screenshot || matchedTx?.screenshot;
                const proofImgs = Array.isArray(rawImgs) ? rawImgs : (rawImgs ? [rawImgs] : []);

                const primaryEvName = statusModalRow?.eventName || (events.find((e) => e.eventId === statusModalRow?.eventId)?.eventName) || "Current Event";
                const currentEvAmt = Number(statusModalRow?.amount || statusModalRow?.currentEventDue || 0);

                const eventBreakdownItems = [];
                if (currentEvAmt > 0) {
                  eventBreakdownItems.push(`${primaryEvName}: ${formatWholeCurrency(currentEvAmt)}`);
                } else {
                  eventBreakdownItems.push(`${primaryEvName}: ${formatWholeCurrency(actualReceivedAmt)}`);
                }

                const prevArrears = Number(statusModalRow?.previousArrears || matchedTx?.previousArrears || (actualReceivedAmt > currentEvAmt && currentEvAmt > 0 ? actualReceivedAmt - currentEvAmt : 0));
                const arrearItems = statusModalRow?.previousUnpaidItems || statusModalRow?.arrearBreakdown || matchedTx?.arrearBreakdown || [];

                if (arrearItems.length > 0) {
                  arrearItems.forEach((item) => {
                    const name = item.eventName || item.title || item.eventCategory || "Previous Event";
                    const amt = Number(item.dueAmount || item.amount || item.due || 0);
                    if (amt > 0) {
                      eventBreakdownItems.push(`${name}: ${formatWholeCurrency(amt)}`);
                    }
                  });
                } else if (prevArrears > 0 && actualReceivedAmt > currentEvAmt) {
                  eventBreakdownItems.push(`Previous Arrears: ${formatWholeCurrency(prevArrears)}`);
                }

                return (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "10px",
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(74, 63, 107, 0.03)"),
                      border: "1px solid",
                      borderColor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(74, 63, 107, 0.16)"),
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, pb: 1, borderBottom: "1px dashed rgba(120,120,120,0.2)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PaymentsIcon sx={{ fontSize: "1.2rem", color: "primary.main" }} />
                        <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
                          Submitted Payment Audit Details
                        </Typography>
                      </Box>
                      <Chip
                        label={scopeVal}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          bgcolor: "rgba(99,102,241,0.1)",
                          color: "#6366f1",
                          borderRadius: "4px",
                        }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem", fontWeight: 600 }}>
                          {isPaidOrVerified ? "Total Received Amount" : (hasSubmittedProof ? "Submitted Claim Amount" : "Received Amount")}
                        </Typography>
                        <Tooltip
                          arrow
                          enterDelay={100}
                          title={
                            actualReceivedAmt <= 0 ? (
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="caption" fontWeight={800} sx={{ display: "block", color: "#fca5a5" }}>
                                  Money Not Received
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="caption" fontWeight={800} sx={{ display: "block", mb: 0.5, textDecoration: "underline", color: "#93c5fd" }}>
                                  Event Payment Breakdown:
                                </Typography>
                                {eventBreakdownItems.map((itemStr, idx) => (
                                   <Typography key={idx} variant="caption" sx={{ display: "block", fontSize: "0.72rem", py: 0.1 }}>
                                    • {itemStr}
                                  </Typography>
                                ))}
                                <Typography variant="caption" fontWeight={800} sx={{ display: "block", mt: 0.5, pt: 0.5, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                                  {isPaidOrVerified ? "Total Received" : "Received"}: {formatWholeCurrency(actualReceivedAmt)}
                                </Typography>
                              </Box>
                            )
                          }
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={900}
                            color={isPaidOrVerified ? "success.main" : (hasSubmittedProof ? "warning.main" : "text.secondary")}
                            sx={{
                              fontSize: "1rem",
                              cursor: "help",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.4,
                              textDecoration: "underline dotted",
                              textUnderlineOffset: "3px",
                            }}
                          >
                            {formatWholeCurrency(actualReceivedAmt)}
                            <InfoIcon sx={{ fontSize: 13, opacity: 0.7 }} />
                          </Typography>
                        </Tooltip>
                        {!isPaidOrVerified && !hasSubmittedProof && totalDueAmt > 0 && (
                          <Typography variant="caption" color="warning.main" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700, mt: 0.2 }}>
                            (Due: {formatWholeCurrency(totalDueAmt)})
                          </Typography>
                        )}
                        {!isPaidOrVerified && hasSubmittedProof && (
                          <Typography variant="caption" color="warning.main" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700, mt: 0.2 }}>
                            (Pending Verification)
                          </Typography>
                        )}
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem", fontWeight: 600 }}>
                          Payment Method
                        </Typography>
                        <Chip
                          label={modeStr}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            bgcolor: modeStr === "None"
                              ? (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(100,116,139,0.1)"
                              : modeStr.toLowerCase().includes("cash")
                                ? "rgba(22,163,74,0.1)"
                                : "rgba(37,99,235,0.1)",
                            color: modeStr === "None"
                              ? (t) => t.palette.mode === "dark" ? "#cbd5e1" : "#64748b"
                              : modeStr.toLowerCase().includes("cash")
                                ? "#16a34a"
                                : "#2563eb",
                            mt: 0.2,
                          }}
                        />
                        {(cashAmt > 0 || upiAmt > 0) && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", mt: 0.4 }}>
                            Cash: {formatWholeCurrency(cashAmt || 0)} | UPI: {formatWholeCurrency(upiAmt || 0)}
                          </Typography>
                        )}
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem", fontWeight: 600 }}>
                          Submitted Date & Time
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.78rem", mt: 0.3 }}>
                          {dateDisplay}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem", fontWeight: 600 }}>
                          Ref / UTR Number
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ fontSize: "0.78rem", mt: 0.3, letterSpacing: "0.02em", wordBreak: "break-all" }}>
                          {utrVal}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem", fontWeight: 600 }}>
                          Member / Submitted By
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.78rem" }}>
                          {statusModalRow.memberName}
                        </Typography>
                      </Grid>

                      {proofImgs.length > 0 && (
                        <Grid size={{ xs: 12, sm: 12 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "rgba(37,99,235,0.04)", border: "1px dashed rgba(37,99,235,0.2)", borderRadius: "6px", p: 1, mt: 0.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                              <Stack direction="row" spacing={1}>
                                {proofImgs.map((imgItem, imgIdx) => (
                                  <Box
                                    key={imgIdx}
                                    component="img"
                                    src={getImageUrl(imgItem)}
                                    alt={`Payment Proof ${imgIdx + 1}`}
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: "4px",
                                      objectFit: "cover",
                                      border: "1px solid rgba(0,0,0,0.1)",
                                      cursor: "pointer",
                                      transition: "transform 0.15s",
                                      "&:hover": { transform: "scale(1.08)" }
                                    }}
                                    onClick={() => setPreviewImageSrc(getImageUrl(imgItem))}
                                  />
                                ))}
                              </Stack>
                              <Box>
                                <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ display: "block", fontSize: "0.72rem" }}>
                                  {proofImgs.length} Payment Receipt Image(s) Attached
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                                  Click any thumbnail to inspect full resolution screenshot
                                </Typography>
                              </Box>
                            </Box>
                            <AppButton
                              size="small"
                              variant="outlined"
                              startIcon={<ViewIcon />}
                              onClick={() => setPreviewImageSrc(getImageUrl(proofImgs[0]))}
                              sx={{ fontSize: "0.7rem", py: 0.2 }}
                            >
                              View ({proofImgs.length})
                            </AppButton>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                );
              })()}

              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppSelect
                    label="Select Status"
                    placeholder="Select Status"
                    value={statusChangeValue}
                    onChange={(e) => {
                      setStatusChangeValue(e.target.value);
                      if (statusError) setStatusError("");
                    }}
                    options={getModalStatusOptions(statusModalRow)}
                    error={Boolean(statusError)}
                    helperText={statusError || ""}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Status Preview
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {statusChangeValue ? (
                      renderStatusBadge(statusChangeValue)
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        None selected
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>

              <AppTextArea
                label="Audit Remarks / Notes"
                placeholder="Enter remarks or status update notes..."
                value={auditRemarks}
                onChange={(e) => setAuditRemarks(e.target.value)}
                rows={3}
              />
            </Paper>
          </Box>
        )}
      </AppDialog>

      {/* ── Payment Proof Screenshot Lightbox Preview ── */}
      <AppDialog
        open={Boolean(previewImageSrc)}
        onClose={() => setPreviewImageSrc(null)}
        title="Payment Submission Proof / Receipt"
        maxWidth="md"
      >
        {previewImageSrc && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 1 }}>
            <Box
              component="img"
              src={previewImageSrc}
              alt="Payment Proof Full Receipt"
              sx={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", objectFit: "contain" }}
            />
          </Box>
        )}
      </AppDialog>

      {/* ── Add Support Ticket Dialog ── */}
      <AddSupportTicketModal
        open={supportTicketModalOpen}
        onClose={() => {
          setSupportTicketModalOpen(false);
          setSelectedTicketRow(null);
        }}
        initialData={selectedTicketRow}
        onSuccess={async () => {
          try {
            const ticketsRes = await getSupportTicketsAsync();
            if (Array.isArray(ticketsRes)) setSupportTickets(ticketsRes);
          } catch {}
          window.dispatchEvent(new CustomEvent("contribution_updated"));
        }}
      />

      {/* ── Verify Support Ticket Dialog ── */}
      <VerifySupportTicketModal
        open={verifyTicketModalOpen}
        onClose={() => {
          setVerifyTicketModalOpen(false);
          setSelectedVerifyTicketRow(null);
        }}
        initialData={selectedVerifyTicketRow}
        statuses={null}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("contribution_updated"));
        }}
      />
    </div>
  );
}
