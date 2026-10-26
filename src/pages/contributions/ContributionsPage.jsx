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
import { getEventsAsync, isEventPublished } from "../../services/eventService";
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
  const [auditRemarksError, setAuditRemarksError] = useState("");
  const [dbStatuses, setDbStatuses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [verifiedKeys, setVerifiedKeys] = useState(() => new Set());
  const [approvedKeys, setApprovedKeys] = useState(() => new Set());
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [supportTicketModalOpen, setSupportTicketModalOpen] = useState(false);
  const [selectedTicketRow, setSelectedTicketRow] = useState(null);
  const [verifyTicketModalOpen, setVerifyTicketModalOpen] = useState(false);
  const [selectedVerifyTicketRow, setSelectedVerifyTicketRow] = useState(null);
  const [supportTickets, setSupportTickets] = useState([]);

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("ALL");
  const [filterEventId, setFilterEventId] = useState("ALL");
  const [eventTypes, setEventTypes] = useState([]);
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [appliedEventType, setAppliedEventType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [hasAppliedFilter, setHasAppliedFilter] = useState(true);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [appliedYear, setAppliedYear] = useState(dayjs().year());
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [appliedMonth, setAppliedMonth] = useState(dayjs().month() + 1);
  const [filterLookupEvents, setFilterLookupEvents] = useState([]);
  const [rawContributions, setRawContributions] = useState([]);

  // Automatically fetch events available in selected month and year for cascading dropdowns
  useEffect(() => {
    let cancelled = false;
    async function fetchLookupEvents() {
      try {
        const m = Number(filterMonth);
        const y = Number(filterYear);
        const data = await getEventsAsync({
          month: m > 0 ? m : undefined,
          year: y > 0 ? y : undefined,
        });
        if (!cancelled && Array.isArray(data)) {
          setFilterLookupEvents(data.filter((e) => !e.isDeleted && isEventPublished(e)));
        }
      } catch {
        if (!cancelled) setFilterLookupEvents([]);
      }
    }
    fetchLookupEvents();
    return () => {
      cancelled = true;
    };
  }, [filterMonth, filterYear]);

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

  const isMatchingEventType = useCallback((ev, typeFilter) => {
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
  }, [eventTypes]);

  const fetchFilteredContributions = useCallback(
    async (
      eventId = selectedEventId,
      year = appliedYear,
      month = appliedMonth,
      eventType = appliedEventType,
      freshAllList = null
    ) => {
      if (!eventId) return [];

      if (eventId !== "ALL") {
        const evObj = (events || []).find((e) => String(e.eventId || e.id).toLowerCase() === String(eventId).toLowerCase());
        if (evObj && !isEventPublished(evObj)) {
          return [];
        }
        try {
          const res = await getContributionsByEventAsync(eventId);
          return Array.isArray(res) ? res : [];
        } catch {
          return [];
        }
      }

      // eventId === "ALL": retrieve events matching year, month, and eventType
      let freshAll = freshAllList;
      if (!freshAll || freshAll.length === 0) {
        freshAll = await reloadAllContributions();
      }

      let targetEvents = [];
      const m = Number(month);
      const y = Number(year);

      if (m > 0 || y > 0) {
        try {
          const fetched = await getEventsAsync({
            month: m > 0 ? m : undefined,
            year: y > 0 ? y : undefined,
          });
          if (Array.isArray(fetched) && fetched.length > 0) {
            targetEvents = fetched.filter((e) => !e.isDeleted && isEventPublished(e));
          } else {
            targetEvents = (events || []).filter((e) => {
              if (e.isDeleted || !isEventPublished(e)) return false;
              const d = e.eventDate || e.createdOn || e.date;
              if (!d) return false;
              const dj = dayjs(d);
              if (y > 0 && dj.year() !== y) return false;
              if (m > 0 && dj.month() + 1 !== m) return false;
              return true;
            });
          }
        } catch {
          targetEvents = (events || []).filter((e) => {
            if (e.isDeleted || !isEventPublished(e)) return false;
            const d = e.eventDate || e.createdOn || e.date;
            if (!d) return false;
            const dj = dayjs(d);
            if (y > 0 && dj.year() !== y) return false;
            if (m > 0 && dj.month() + 1 !== m) return false;
            return true;
          });
        }
      } else {
        targetEvents = (events || []).filter((e) => !e.isDeleted && isEventPublished(e));
      }

      if (eventType && eventType !== "ALL") {
        targetEvents = targetEvents.filter((e) => isMatchingEventType(e, eventType));
      }

      const matchingEventIds = new Set(
        targetEvents.map((e) => String(e.eventId || e.id).toLowerCase())
      );
      const matchingEventNames = new Set(
        targetEvents
          .map((e) => String(e.eventName || e.title || e.name || "").trim().toLowerCase())
          .filter(Boolean)
      );

      return (freshAll || []).filter((c) => {
        const cEvId = String(c.eventId || "").toLowerCase();
        const cEvName = String(c.eventName || "").trim().toLowerCase();
        return (
          (cEvId && matchingEventIds.has(cEvId)) ||
          (cEvName && matchingEventNames.has(cEvName))
        );
      });
    },
    [selectedEventId, appliedYear, appliedMonth, appliedEventType, events, isMatchingEventType, reloadAllContributions]
  );

  // --- Effects & Memos (all state is declared above, so no TDZ errors) ---
  useEffect(() => {
    if (!hasAppliedFilter || !selectedEventId) {
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

        const rawData = await fetchFilteredContributions(
          selectedEventId,
          appliedYear,
          appliedMonth,
          appliedEventType,
          freshAll
        );

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
  }, [
    hasAppliedFilter,
    selectedEventId,
    appliedYear,
    appliedMonth,
    appliedEventType,
    allContributions,
    fetchFilteredContributions,
    reloadAllContributions,
  ]);

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
      if (hasAppliedFilter && selectedEventId) {
        const freshData = await fetchFilteredContributions(
          selectedEventId,
          appliedYear,
          appliedMonth,
          appliedEventType,
          freshAll
        );
        setRawContributions(Array.isArray(freshData) ? freshData : []);
      }
    };
    window.addEventListener("contribution_updated", handleContributionUpdated);
    return () => {
      window.removeEventListener("contribution_updated", handleContributionUpdated);
    };
  }, [
    hasAppliedFilter,
    selectedEventId,
    appliedYear,
    appliedMonth,
    appliedEventType,
    events,
    transactions,
    fetchFilteredContributions,
    reloadAllContributions,
  ]);

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
    const isGrouped = Boolean(c.isGrouped);
    const targetEventId = c.eventId || (fallbackEvId !== "ALL" ? fallbackEvId : "");
    const targetEventName = c.eventName || (events || []).find(e => String(e.eventId || e.id) === String(targetEventId))?.eventName;

    // 1. Grouped row (All Events aggregated view):
    // Match transactions that belong to this member AND belong to one of the events currently in this member's group
    if (isGrouped && Array.isArray(c.memberEvents) && c.memberEvents.length > 0) {
      const groupEventIds = new Set(
        c.memberEvents.map((e) => String(e.eventId || "").toLowerCase().trim()).filter(Boolean)
      );
      const groupEventNames = new Set(
        c.memberEvents.map((e) => String(e.eventName || "").toLowerCase().trim()).filter(Boolean)
      );

      return tList.find((t) => {
        const tMemberId = t.userId || t.memberId;
        const tMemberName = t.memberName;
        const memberMatch = isSameText(targetMemberId, tMemberId) || isSameText(targetMemberName, tMemberName);
        if (!memberMatch) return false;

        const tEvId = String(t.eventId || "").toLowerCase().trim();
        const tEvName = String(t.eventName || "").toLowerCase().trim();
        return (tEvId && groupEventIds.has(tEvId)) || (tEvName && groupEventNames.has(tEvName));
      }) || null;
    }

    // 2. Individual contribution row: Transaction MUST strictly belong to this specific event
    return tList.find((t) => {
      const tMemberId = t.userId || t.memberId;
      const tMemberName = t.memberName;
      const memberMatch = isSameText(targetMemberId, tMemberId) || isSameText(targetMemberName, tMemberName);
      if (!memberMatch) return false;

      const tEventId = t.eventId;
      const tEventName = t.eventName;
      if (targetEventId && tEventId) {
        return isSameText(targetEventId, tEventId);
      }
      if (targetEventName && tEventName) {
        return isMatchingEventName(targetEventName, tEventName);
      }
      return false;
    }) || null;
  };

  const findAllContributionTransactions = (c, tList = transactions, fallbackEvId = selectedEventId) => {
    if (!c || !Array.isArray(tList) || tList.length === 0) return [];
    const targetMemberId = c.memberId || c.userId;
    const targetMemberName = c.memberName;
    const isGrouped = Boolean(c.isGrouped);
    const targetEventId = c.eventId || (fallbackEvId !== "ALL" ? fallbackEvId : "");
    const targetEventName = c.eventName || (events || []).find(e => String(e.eventId || e.id) === String(targetEventId))?.eventName;

    return tList.filter((t) => {
      const tMemberId = t.userId || t.memberId;
      const tMemberName = t.memberName;
      const memberMatch = isSameText(targetMemberId, tMemberId) || isSameText(targetMemberName, tMemberName);
      if (!memberMatch) return false;

      if (isGrouped && Array.isArray(c.memberEvents) && c.memberEvents.length > 0) {
        const groupEventIds = new Set(
          c.memberEvents.map((e) => String(e.eventId || "").toLowerCase().trim()).filter(Boolean)
        );
        const groupEventNames = new Set(
          c.memberEvents.map((e) => String(e.eventName || "").toLowerCase().trim()).filter(Boolean)
        );
        const tEvId = String(t.eventId || "").toLowerCase().trim();
        const tEvName = String(t.eventName || "").toLowerCase().trim();
        return (tEvId && groupEventIds.has(tEvId)) || (tEvName && groupEventNames.has(tEvName));
      }

      const tEventId = t.eventId;
      const tEventName = t.eventName;
      if (targetEventId && tEventId) {
        return isSameText(targetEventId, tEventId);
      }
      if (targetEventName && tEventName) {
        return isMatchingEventName(targetEventName, tEventName);
      }
      return false;
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

  const getModeColor = (name) => {
    const lower = String(name || "").toLowerCase().replace(/[\s\-_/]+/g, "");
    if (lower.includes("gpay") || lower.includes("google")) return "#2563eb";
    if (lower.includes("phonepe") || lower.includes("phone")) return "#7c3aed";
    if (lower.includes("paytm")) return "#0284c7";
    if (lower.includes("upi") || lower.includes("bhim")) return "#ea580c";
    if (lower.includes("bank") || lower.includes("transfer") || lower.includes("neft") || lower.includes("imps")) return "#059669";
    if (lower.includes("cash")) return "#16a34a";
    return "#4a3f6b";
  };

  const resolvePaymentMethodName = (modeRaw, utrRaw = "", notesRaw = "") => {
    if (modeRaw === 1 || modeRaw === "1") return "Cash";
    if (modeRaw === 5 || modeRaw === "5") return "Split";
    if (modeRaw === 3 || modeRaw === "3") return "Bank Transfer";
    if (modeRaw === 4 || modeRaw === "4") return "Card";

    const str = String(modeRaw || "").trim().toLowerCase();
    const utrStr = String(utrRaw || "").toLowerCase();
    const notesStr = String(notesRaw || "").toLowerCase();

    if (str.includes("split")) return "Split";
    if (str.includes("cash")) return "Cash";
    if (str.includes("gpay") || str.includes("google")) return "GPay";
    if (str.includes("phonepe") || str.includes("phone")) return "PhonePe";
    if (str.includes("paytm")) return "Paytm";
    if (str.includes("bank") || str.includes("transfer") || str.includes("neft") || str.includes("imps")) return "Bank Transfer";
    if (str.includes("card")) return "Card";

    if (str === "upi" || str === "online" || !str || str === "none" || str === "2" || str === "0") {
      if (utrStr.includes("gpay") || notesStr.includes("gpay") || notesStr.includes("google pay")) return "GPay";
      if (utrStr.includes("phonepe") || notesStr.includes("phonepe") || notesStr.includes("phone pe")) return "PhonePe";
      if (utrStr.includes("paytm") || notesStr.includes("paytm")) return "Paytm";
      if (utrStr.includes("cash") || notesStr.includes("cash")) return "Cash";
      if (str === "upi" || str === "online" || str === "2") return "UPI";
    }

    return String(modeRaw || "Cash").trim();
  };

  const getResolvedPaymentMode = (c, matchedTx) => {
    const tx = matchedTx !== undefined ? matchedTx : findContributionTransaction(c);
    const allTxns = findAllContributionTransactions(c);

    // 1. Multiple transactions or splits = Split
    if (allTxns.length > 1) {
      return "Split";
    }

    const splits = tx?.splits || c?.splits;
    if (Array.isArray(splits) && splits.length > 1) {
      return "Split";
    }

    if (tx?.isSplitGroup || tx?.parentTxnNumber || tx?.transactionGroupId) {
      return "Split";
    }

    if (c?.paymentMode === 5 || c?.paymentMode === "5" || tx?.paymentMode === 5 || tx?.paymentMode === "5") {
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
        if (modePart) return resolvePaymentMethodName(modePart);
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
      return resolvePaymentMethodName(splits[0].mode, splits[0].utr, splits[0].notes);
    }

    // 5. Check raw mode — Prioritize specific transaction mode (e.g. GPay, PhonePe)
    // over generic Contribution enum values (like generic UPI/2).
    const isGenericMode = (m) => {
      if (!m || m === "-" || m === "--") return true;
      const s = String(m).trim().toLowerCase();
      return s === "none" || s === "upi" || s === "online" || s === "2" || s === "0";
    };

    const txMode = String(tx?.paymentMode || "").trim();
    const cModeName = String(c?.paymentModeName || "").trim();
    const cMode = String(c?.paymentMode || "").trim();

    let rawMode = "";
    if (txMode && !isGenericMode(txMode)) {
      rawMode = txMode;
    } else if (cModeName && !isGenericMode(cModeName)) {
      rawMode = cModeName;
    } else if (cMode && !isGenericMode(cMode)) {
      rawMode = cMode;
    } else {
      rawMode = txMode || cModeName || cMode;
    }

    const rawUtr = String(c?.utrNumber || c?.referenceNo || tx?.utr || tx?.transactionRef || "").trim();
    if (rawMode && rawMode !== "-" && rawMode !== "--" && rawMode.toLowerCase() !== "none" && rawMode.toLowerCase() !== "0") {
      return resolvePaymentMethodName(rawMode, rawUtr, notes);
    }

    if (rawUtr || notes) {
      const resolved = resolvePaymentMethodName("", rawUtr, notes);
      if (resolved && resolved !== "Cash") return resolved;
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

    // Backend status indicating paid, verified, or approved
    const rawStatus = String(c.statusName || c.paymentStatus || c.status || "").trim().toLowerCase();
    if (rawStatus === "paid" || rawStatus === "verified" || rawStatus === "approved" || rawStatus === "closed" || rawStatus === "completed") {
      return true;
    }

    return false;
  };

  const isContributionApproved = (c, tx = null) => {
    if (!c) return false;
    const matchedTx = tx !== null ? tx : findContributionTransaction(c);

    const txStatus = String(matchedTx?.status || "").trim().toLowerCase();
    const rawStatus = String(c.statusName || c.paymentStatus || c.status || "").trim().toLowerCase();

    // If status is rejected or pending, it can NEVER be approved!
    if (rawStatus === "rejected" || txStatus === "rejected" || rawStatus === "pending" || txStatus === "pending") {
      return false;
    }

    if (!hasContributionPayment(c, matchedTx)) {
      return false;
    }

    const key = `${c.memberId}_${c.eventId}`;

    return Boolean(
      rawStatus === "approved" ||
      txStatus === "approved" ||
      (c.isApproved === true && rawStatus !== "rejected" && txStatus !== "rejected") ||
      (approvedKeys.has(key) && rawStatus !== "rejected" && txStatus !== "rejected")
    );
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
      return s === "paid" || s === "verified" || s === "approved" || s === "closed" || s === "completed";
    }
    return hasContributionPayment(c);
  };

  const hasSubmittedPayment = (c, tx = null) => {
    if (!c) return false;
    return hasContributionPayment(c, tx);
  };

  const getContributionOutstanding = (c, activeEv) => {
    if (!c) return 0;
    if (isContributionPaid(c)) return 0;
    const isSubmitted = hasSubmittedPayment(c);
    if (isSubmitted) return 0;
    return getMemberEventAmount(c, activeEv);
  };

  const enrichContributions = (rawData, allList = allContributions, evList = events, txList = transactions) => {
    // Only published events are eligible for contributions, collections, and arrears
    const publishedEvList = (evList || []).filter((e) => !e.isDeleted && isEventPublished(e));
    let enriched = (rawData || [])
      .filter((c) => {
        const evIdToMatch = String(c.eventId || (selectedEventId !== "ALL" ? selectedEventId : "")).toLowerCase();
        const evNameToMatch = String(c.eventName || "").trim().toLowerCase();
        return publishedEvList.some((e) => {
          const eId = String(e.eventId || e.id || "").toLowerCase();
          const eName = String(e.eventName || e.title || e.name || "").trim().toLowerCase();
          return (evIdToMatch && eId === evIdToMatch) || (evNameToMatch && eName === evNameToMatch);
        });
      })
      .map((c) => {
        const targetEvId = String(c.eventId || (selectedEventId !== "ALL" ? selectedEventId : "")).toLowerCase();
        const targetEvName = String(c.eventName || "").trim().toLowerCase();
        const activeEv = publishedEvList.find((e) => {
          const eId = String(e.eventId || e.id || "").toLowerCase();
          const eName = String(e.eventName || e.title || e.name || "").trim().toLowerCase();
          return (targetEvId && eId === targetEvId) || (targetEvName && eName === targetEvName);
        });
        const resolvedAmount = getMemberEventAmount(c, activeEv);
        const currentContribution = {
          ...c,
          eventName: c.eventName || activeEv?.eventName || activeEv?.title || activeEv?.name || "",
          categoryName: c.categoryName || activeEv?.eventTypeName || activeEv?.categoryName || "",
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

          return publishedEvList.some((e) => String(e.eventId || e.id).toLowerCase().trim() === prevEventId);
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

        const rawPreviousUnpaid = previousUnpaidItems.reduce((sum, prev) => {
          const prevEv = (evList || []).find((e) => String(e.eventId || e.id) === String(prev.eventId));
          const prevAmt = getMemberEventAmount(prev, prevEv);
          return sum + (prevAmt > 0 ? prevAmt : Number(prev.amount) || 0);
        }, 0);

        const currentOutstanding = getContributionOutstanding(currentContribution, activeEv);
        const isVerified = isContributionVerified(currentContribution, matchedTx);
        const isRejected =
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(c.paymentStatus || "").toLowerCase() === "rejected" ||
          String(c.statusName || "").toLowerCase() === "rejected";

        const isApproved =
          String(matchedTx?.status || "").toLowerCase() === "approved" ||
          String(c.paymentStatus || "").toLowerCase() === "approved" ||
          String(c.statusName || "").toLowerCase() === "approved" ||
          (isContributionApproved(currentContribution, matchedTx) && !isRejected);

        const isPaid =
          isContributionPaid(currentContribution, matchedTx) ||
          hasSubmittedPayment(currentContribution, matchedTx) ||
          c.paymentStatus === 2 ||
          String(c.paymentStatus || "").toLowerCase() === "paid" ||
          String(c.statusName || "").toLowerCase() === "paid" ||
          String(c.status || "").toLowerCase() === "paid" ||
          isVerified ||
          isApproved;

        let resolvedStatus = "Pending";
        if (isRejected) {
          resolvedStatus = "Rejected";
        } else if (isApproved) {
          resolvedStatus = "Approved";
        } else if (isVerified) {
          resolvedStatus = "Verified";
        } else if (isPaid) {
          resolvedStatus = "Paid";
        }

        // Compute raw transacted amount for this contribution
        let rawPaidAmount = 0;
        const cash = Number(c.cashAmount) || 0;
        const upi = Number(c.upiAmount) || 0;
        const allTxns = findAllContributionTransactions(c, txList, c.eventId || (selectedEventId !== "ALL" ? selectedEventId : ""));
        const totalTxAmt = allTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const txAmt = totalTxAmt > 0 ? totalTxAmt : Number(matchedTx?.amount || 0);
        const rawPaid = Number(c.paidAmount) || Number(c.totalReceivedAmount) || 0;
        if (cash > 0 || upi > 0) {
          rawPaidAmount = cash + upi;
        } else if (txAmt > 0) {
          rawPaidAmount = txAmt;
        } else if (rawPaid > 0) {
          rawPaidAmount = rawPaid;
        } else if (isPaid || isRejected) {
          rawPaidAmount = resolvedAmount > 0 ? resolvedAmount : Number(c.amount || 0);
        }

        // For this event's contribution, the paid amount cannot exceed the event's required amount.
        // Any excess transacted amount was paid towards previous arrears.
        const eventTargetAmt = resolvedAmount > 0 ? resolvedAmount : Number(c.amount || 0);
        const paidAmount = eventTargetAmt > 0
          ? (isPaid ? eventTargetAmt : Math.min(rawPaidAmount, eventTargetAmt))
          : rawPaidAmount;
        const arrearsPaidInTx = eventTargetAmt > 0 ? Math.max(0, rawPaidAmount - eventTargetAmt) : 0;

        const isArrearsCleared =
          (isAllOutstandingScope && !isCurrentEventOnly && (hasSubmittedPayment(c, matchedTx) || isContributionPaid(c))) ||
          (arrearsPaidInTx > 0 && arrearsPaidInTx >= rawPreviousUnpaid);
        const previousUnpaid = isArrearsCleared ? 0 : Math.max(0, rawPreviousUnpaid - arrearsPaidInTx);

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
          rawTotalPaid: rawPaidAmount,
          arrearsPaid: arrearsPaidInTx,
          previousUnpaid,
          previousUnpaidItems: isArrearsCleared || previousUnpaid === 0 ? [] : previousUnpaidItems,
          totalAccumulated: currentOutstanding + previousUnpaid,
          screenshot: currentContribution.screenshot || matchedTx?.screenshot || (allTxns.find((t) => t.screenshot)?.screenshot) || null,
          screenshots: currentContribution.screenshots || matchedTx?.screenshots || (allTxns.find((t) => t.screenshots)?.screenshots) || null,
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

    if (selectedEventId === "ALL") {
      const memberMap = new Map();

      (enriched || []).forEach((c) => {
        const memberKey = String(c.memberId || c.userId || c.memberName || "").toLowerCase().trim();
        if (!memberKey) return;

        const ev = (events || []).find(
          (e) => String(e.eventId || e.id).toLowerCase() === String(c.eventId || "").toLowerCase()
        );
        const eventName = c.eventName || ev?.eventName || ev?.title || ev?.name || "Event";
        const eventAmount = Number(c.amount) || 0;
        const matchedTx = findContributionTransaction(c, transactions, c.eventId);
        const isVerified = isContributionVerified(c, matchedTx);
        const isRejected =
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(c.paymentStatus || "").toLowerCase() === "rejected" ||
          String(c.statusName || "").toLowerCase() === "rejected";
        const isApproved =
          String(matchedTx?.status || "").toLowerCase() === "approved" ||
          String(c.paymentStatus || "").toLowerCase() === "approved" ||
          String(c.statusName || "").toLowerCase() === "approved" ||
          (isContributionApproved(c, matchedTx) && !isRejected);
        const isPaid =
          isContributionPaid(c, matchedTx) ||
          hasSubmittedPayment(c, matchedTx) ||
          isApproved ||
          isVerified ||
          c.paymentStatus === 2 ||
          String(c.paymentStatus || "").toLowerCase() === "paid";

        const rawTxAmt = Number(c.rawTotalPaid) || Number(c.paidAmount) || 0;
        // Event contribution paid cannot exceed this event's expected amount
        const eventPaid = eventAmount > 0
          ? (isPaid ? eventAmount : Math.min(rawTxAmt, eventAmount))
          : (isPaid ? eventAmount : rawTxAmt);
        const arrearsPaid = eventAmount > 0 ? Math.max(0, rawTxAmt - eventAmount) : 0;

        const eventDetail = {
          contributionId: c.contributionId,
          eventId: c.eventId,
          eventName,
          amount: eventAmount,
          paidAmount: eventPaid,
          rawTxAmount: rawTxAmt,
          arrearsPaid,
          paymentStatus: c.paymentStatus || (isPaid ? "Paid" : "Pending"),
          paymentMode: getResolvedPaymentMode(c, matchedTx) || c.paymentMode || "",
          paymentDate: c.paymentDate || matchedTx?.paymentDate || null,
          isPaid,
          isApproved,
          isVerified,
          isRejected,
          rawContribution: c,
        };

        if (!memberMap.has(memberKey)) {
          memberMap.set(memberKey, {
            ...c,
            isGrouped: true,
            memberEvents: [eventDetail],
            totalAmount: eventAmount,
            totalPaid: eventPaid,
            totalArrearsPaid: arrearsPaid,
            allMemberTransactions: findAllContributionTransactions(c, transactions),
          });
        } else {
          const existing = memberMap.get(memberKey);
          const alreadyHasEvent = existing.memberEvents.some(
            (e) => String(e.eventId).toLowerCase() === String(c.eventId).toLowerCase()
          );
          if (!alreadyHasEvent) {
            existing.memberEvents.push(eventDetail);
            existing.totalAmount += eventAmount;
            existing.totalPaid += eventPaid;
            existing.totalArrearsPaid = (existing.totalArrearsPaid || 0) + arrearsPaid;
          } else {
            const idx = existing.memberEvents.findIndex(
              (e) => String(e.eventId).toLowerCase() === String(c.eventId).toLowerCase()
            );
            if (eventPaid > (existing.memberEvents[idx].paidAmount || 0)) {
              existing.totalPaid += eventPaid - (existing.memberEvents[idx].paidAmount || 0);
              existing.totalArrearsPaid = (existing.totalArrearsPaid || 0) + (arrearsPaid - (existing.memberEvents[idx].arrearsPaid || 0));
              existing.memberEvents[idx] = eventDetail;
            }
          }
          const moreTxns = findAllContributionTransactions(c, transactions);
          existing.allMemberTransactions = [...existing.allMemberTransactions, ...moreTxns];
        }
      });

      const groupedList = Array.from(memberMap.values()).map((row) => {
        const currentEventIds = new Set(
          (row.memberEvents || []).map((e) => String(e.eventId || "").toLowerCase().trim()).filter(Boolean)
        );
        const currentEventNames = new Set(
          (row.memberEvents || []).map((e) => String(e.eventName || "").toLowerCase().trim()).filter(Boolean)
        );

        const memberIdKey = String(row.memberId || row.userId || "").toLowerCase().trim();
        const memberNameKey = String(row.memberName || "").toLowerCase().trim();

        const memberTxns = (transactions || []).filter((t) => {
          const tMemId = String(t.userId || t.memberId || "").toLowerCase().trim();
          const tMemName = String(t.memberName || "").toLowerCase().trim();
          const isMember = (memberIdKey && tMemId && memberIdKey === tMemId) ||
            (memberNameKey && tMemName && memberNameKey === tMemName);
          if (!isMember) return false;
          const tEvId = String(t.eventId || "").toLowerCase().trim();
          const tEvName = String(t.eventName || "").toLowerCase().trim();
          return (tEvId && currentEventIds.has(tEvId)) || (tEvName && currentEventNames.has(tEvName));
        });

        // Calculate excess payment strictly from events in this active group
        let excessPool = (row.memberEvents || []).reduce((sum, e) => sum + (e.arrearsPaid || 0), 0);

        // Allocate excessPool across unpaid / partially paid events of this member
        if (excessPool > 0) {
          const validTxns = memberTxns.filter((t) => String(t.status || "").toLowerCase() !== "rejected");
          const sourceTx =
            validTxns.find((t) => Number(t.amount) > 0) ||
            row.allMemberTransactions?.[0];

          row.memberEvents.forEach((ev) => {
            const needed = Number(ev.amount || 0) - Number(ev.paidAmount || 0);
            if (needed > 0 && excessPool > 0) {
              // Chronological check: a transaction cannot pay for an event created after transaction date
              if (sourceTx) {
                const txDate = sourceTx.paymentDate || sourceTx.createdOn || sourceTx.createdAt;
                const evDate = ev.rawContribution?.createdAt || ev.rawContribution?.createdOn || ev.createdOn || ev.createdAt;
                if (txDate && evDate && new Date(evDate).getTime() > new Date(txDate).getTime()) {
                  return;
                }
              }

              const alloc = Math.min(needed, excessPool);
              ev.paidAmount = (Number(ev.paidAmount) || 0) + alloc;
              excessPool -= alloc;

              if (ev.paidAmount >= Number(ev.amount || 0)) {
                ev.isPaid = true;
                const isTxApproved = String(sourceTx?.status || "").toLowerCase() === "approved";
                const isTxVerified = String(sourceTx?.status || "").toLowerCase() === "verified";
                ev.isApproved = ev.isApproved || isTxApproved;
                ev.isVerified = ev.isVerified || isTxVerified;
                ev.paymentStatus = ev.isApproved ? "Approved" : (ev.isVerified ? "Verified" : (sourceTx?.status || "Paid"));
                ev.paymentMode = ev.paymentMode && ev.paymentMode !== "None" && ev.paymentMode !== "-"
                  ? ev.paymentMode
                  : (getResolvedPaymentMode(sourceTx) || sourceTx?.paymentMode || "");
                ev.paymentDate = ev.paymentDate || sourceTx?.paymentDate || sourceTx?.createdOn || null;
              }
            }
          });
        }

        // If excess was consumed by memberEvents, reset individual arrearsPaid on events
        row.memberEvents.forEach((ev) => {
          if (excessPool <= 0) {
            ev.arrearsPaid = 0;
          }
        });

        // Recalculate member totals
        const totalAmount = (row.memberEvents || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const totalPaid = (row.memberEvents || []).reduce((sum, e) => sum + Number(e.paidAmount || 0), 0);
        const trueArrearsPaid = Math.max(0, excessPool);
        row.totalAmount = totalAmount;
        row.totalPaid = totalPaid;
        row.totalArrearsPaid = trueArrearsPaid;

        const previousUnpaidItems = (allContributions || []).filter((prev) => {
          const prevMemberId = String(prev.memberId || prev.userId || "").toLowerCase().trim();
          const prevMemberName = String(prev.memberName || "").toLowerCase().trim();
          const isSameMember =
            (memberIdKey && prevMemberId && memberIdKey === prevMemberId) ||
            (memberNameKey && prevMemberName && memberNameKey === prevMemberName);
          if (!isSameMember) return false;

          const prevEvId = String(prev.eventId || "").toLowerCase().trim();
          if (!prevEvId || currentEventIds.has(prevEvId)) return false;

          if (isContributionPaid(prev)) return false;

          return (events || []).some((e) => String(e.eventId || e.id).toLowerCase().trim() === prevEvId);
        });

        const rawPreviousUnpaid = previousUnpaidItems.reduce((sum, prev) => {
          const prevEv = (events || []).find((e) => String(e.eventId || e.id) === String(prev.eventId));
          const prevAmt = getMemberEventAmount(prev, prevEv);
          return sum + (prevAmt > 0 ? prevAmt : Number(prev.amount) || 0);
        }, 0);

        const matchedTx = row.allMemberTransactions?.[0] || findContributionTransaction(row, transactions);
        const scope = String(row.paymentScope || row.scope || matchedTx?.notes || "").toLowerCase();
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
        const isArrearsCleared =
          (isAllOutstandingScope && !isCurrentEventOnly && (hasSubmittedPayment(row, matchedTx) || isContributionPaid(row))) ||
          (trueArrearsPaid > 0 && trueArrearsPaid >= rawPreviousUnpaid);

        const truePreviousUnpaid = isArrearsCleared ? 0 : Math.max(0, rawPreviousUnpaid - trueArrearsPaid);
        const remainingCurrentDue = Math.max(0, totalAmount - totalPaid);
        const totalDue = remainingCurrentDue + truePreviousUnpaid;

        const allApproved = row.memberEvents.length > 0 && row.memberEvents.every((e) => e.isApproved);
        const allVerified = row.memberEvents.length > 0 && row.memberEvents.every((e) => e.isVerified || e.isApproved);
        const allPaid =
          (row.memberEvents.length > 0 && row.memberEvents.every((e) => e.isPaid)) ||
          (totalPaid >= totalAmount && totalAmount > 0);
        const somePaid =
          row.memberEvents.some((e) => e.isPaid || e.paidAmount > 0) || (totalPaid > 0 && totalPaid < totalAmount);
        const allRejected = row.memberEvents.length > 0 && row.memberEvents.every((e) => e.isRejected);

        let aggregateStatus = "Pending";
        if (allRejected) {
          aggregateStatus = "Rejected";
        } else if (allApproved) {
          aggregateStatus = "Approved";
        } else if (allVerified) {
          aggregateStatus = "Verified";
        } else if (allPaid) {
          aggregateStatus = "Paid";
        } else if (somePaid) {
          aggregateStatus = "Partial";
        }

        const joinedEventNames = row.memberEvents.map((e) => e.eventName).filter(Boolean).join(", ");

        return {
          ...row,
          eventName: joinedEventNames,
          amount: totalAmount,
          paidAmount: totalPaid,
          previousUnpaid: truePreviousUnpaid,
          previousUnpaidItems: isArrearsCleared ? [] : previousUnpaidItems,
          totalDue,
          totalAccumulated: totalDue,
          paymentStatus: aggregateStatus,
        };
      });

      if (!appliedStatus || appliedStatus === "ALL") return groupedList;
      const filterLower = appliedStatus.toLowerCase();
      return groupedList.filter((c) => {
        const statusLower = String(c.paymentStatus || "").toLowerCase();
        if (filterLower === "paid") {
          return statusLower === "paid" || statusLower === "verified" || statusLower === "approved";
        }
        if (filterLower === "approved") {
          return statusLower === "approved";
        }
        if (filterLower === "verified") {
          return statusLower === "verified";
        }
        if (filterLower === "pending") {
          return statusLower === "pending" || statusLower === "partial";
        }
        if (filterLower === "partial") {
          return statusLower === "partial";
        }
        if (filterLower === "rejected") {
          return statusLower === "rejected";
        }
        return statusLower === filterLower;
      });
    }

    if (!appliedStatus || appliedStatus === "ALL") return enriched;
    const filterLower = appliedStatus.toLowerCase();
    return enriched.filter((c) => {
      const statusLower = String(c.paymentStatus || "").toLowerCase();
      if (filterLower === "paid") {
        return statusLower === "paid" || statusLower === "verified" || statusLower === "approved";
      }
      if (filterLower === "approved") {
        return statusLower === "approved";
      }
      if (filterLower === "verified") {
        return statusLower === "verified";
      }
      if (filterLower === "pending") {
        return statusLower === "pending";
      }
      if (filterLower === "rejected") {
        return (
          statusLower === "rejected" ||
          String(c.status || "").toLowerCase() === "rejected" ||
          String(c.statusName || "").toLowerCase() === "rejected"
        );
      }
      return statusLower === filterLower;
    });
  }, [rawContributions, allContributions, events, transactions, appliedStatus, selectedEventId]);

  const filterStatusOptions = useMemo(() => {
    const list = [{ label: "All Statuses", value: "ALL" }];
    const seen = new Set();
    (dbStatuses || []).forEach((s) => {
      const name = (s.statusName || s.name || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });
    if (list.length === 1) {
      ["Paid", "Pending", "Verified", "Rejected", "Approved"].forEach((s) => {
        if (!seen.has(s.toLowerCase())) {
          seen.add(s.toLowerCase());
          list.push({ label: s, value: s });
        }
      });
    }
    return list;
  }, [dbStatuses]);

  const handleOpenSubmitPaymentModal = (row) => {
    if (!row) return;
    const isGrouped = selectedEventId === "ALL" && Boolean(row.isGrouped);
    const matchedTx = findContributionTransaction(row);
    const isVerifiedRow = isContributionVerified(row, matchedTx);
    const hasSubmitted = hasSubmittedPayment(row, matchedTx);
    const hasDirectPaid = isContributionPaid(row, matchedTx);
    const statusStr = String(row?.paymentStatus || row?.status || row?.statusName || "").trim().toLowerCase();
    const isApprovedRow =
      String(row?.paymentStatus || row?.status || row?.statusName || matchedTx?.status || "").trim().toLowerCase() === "approved" ||
      isContributionApproved(row, matchedTx);
    const isPaidStatus = statusStr === "paid" || statusStr === "verified" || statusStr === "approved" || statusStr === "completed" || statusStr === "closed" || row?.paymentStatus === 2;
    const isSettledByAmount = Number(row?.paidAmount || 0) > 0 && (row?.totalAccumulated === undefined || Number(row?.totalAccumulated) <= 0);

    const hasRemainingDues = isGrouped
      ? (Number(row?.totalDue ?? 0) > 0 || (Array.isArray(row.memberEvents) && row.memberEvents.some((e) => !e.isPaid && (Number(e.amount) || 0) > (Number(e.paidAmount) || 0))))
      : (Number(row?.totalDue ?? row?.totalAccumulated ?? 0) > 0 || statusStr === "partial");

    const isPaidMember = !hasRemainingDues && (isGrouped
      ? (statusStr === "paid" || statusStr === "approved" || statusStr === "verified" || (row?.totalDue !== undefined && row?.totalDue <= 0))
      : Boolean(isApprovedRow || isVerifiedRow || isPaidStatus || hasDirectPaid || hasSubmitted || isSettledByAmount));

    if (isPaidMember) {
      toast.info("This contribution has already been fully paid and settled.");
      return;
    }

    let evId = row?.eventId || selectedEventId || "";
    let activeEv = (events || []).find((e) => String(e.eventId || e.id).toLowerCase() === String(evId).toLowerCase());
    let unpaidEv = null;

    if (isGrouped && Array.isArray(row.memberEvents)) {
      unpaidEv = row.memberEvents.find((e) => !e.isPaid && (Number(e.paidAmount) || 0) < Number(e.amount)) || row.memberEvents[0];
      if (unpaidEv) {
        evId = unpaidEv.eventId;
        activeEv = (events || []).find((e) => String(e.eventId || e.id).toLowerCase() === String(evId).toLowerCase());
      }
    }

    if (activeEv && !isEventPublished(activeEv)) {
      toast.warning("This event is not published yet. You can only pay for published events.");
      return;
    }

    const isPaidRow = !hasRemainingDues && (statusStr === "paid" || statusStr === "approved" || statusStr === "verified");
    const submitted = isPaidRow;

    let activeDue = 0;
    let prevArrears = 0;
    let totalDue = 0;
    let combinedArrearBreakdown = [];
    let activeEvName = "";
    let activeCategory = "";

    if (isGrouped && Array.isArray(row.memberEvents)) {
      activeDue = unpaidEv ? Math.max(0, (Number(unpaidEv.amount) || 0) - (Number(unpaidEv.paidAmount) || 0)) : 0;
      const otherMemberEvents = row.memberEvents.filter((e) =>
        String(e.eventId).toLowerCase() !== String(evId).toLowerCase() &&
        !e.isPaid &&
        (Number(e.amount) || 0) > (Number(e.paidAmount) || 0)
      );
      const otherDueSum = otherMemberEvents.reduce(
        (sum, e) => sum + Math.max(0, (Number(e.amount) || 0) - (Number(e.paidAmount) || 0)),
        0
      );
      const olderArrears = Number(row.previousUnpaid || 0);
      prevArrears = otherDueSum + olderArrears;
      totalDue = activeDue + prevArrears;

      const otherBreakdown = otherMemberEvents.map((e) => {
        const due = Math.max(0, (Number(e.amount) || 0) - (Number(e.paidAmount) || 0));
        return {
          eventId: e.eventId,
          eventName: e.eventName,
          title: e.eventName,
          amount: due,
          dueAmount: due,
        };
      });
      combinedArrearBreakdown = [...otherBreakdown, ...(row.previousUnpaidItems || [])];
      activeEvName = unpaidEv?.eventName || activeEv?.eventName || activeEv?.title || activeEv?.name || "";
      activeCategory = activeEv?.eventTypeName || activeEv?.categoryName || unpaidEv?.categoryName || row?.categoryName || "";
    } else {
      const resolvedEvAmt = row ? getMemberEventAmount(row, activeEv) : Number(activeEv?.baseAmount || 0);
      activeDue = isPaidRow ? 0 : resolvedEvAmt;
      prevArrears = isPaidRow ? 0 : Number(row?.previousUnpaid || 0);
      totalDue = isPaidRow ? 0 : (activeDue + prevArrears);
      combinedArrearBreakdown = prevArrears === 0 ? [] : (row?.previousUnpaidItems || []);
      activeEvName = row?.eventName || activeEv?.eventName || activeEv?.title || activeEv?.name || "";
      activeCategory = row?.categoryName || activeEv?.eventTypeName || activeEv?.categoryName || "";
    }

    const defaultScope = isGrouped || prevArrears > 0 ? "AllOutstanding" : "CurrentEvent";
    const initialAmt = !hasRemainingDues || totalDue === 0 ? 0 : (defaultScope === "AllOutstanding" ? totalDue : (activeDue > 0 ? activeDue : (totalDue > 0 ? totalDue : 0)));

    setPaymentModalContext({
      eventId: evId,
      eventName: activeEvName,
      eventCategory: activeCategory,
      memberId: row?.memberId || "",
      memberName: row?.memberName || "",
      amount: initialAmt,
      currentEventDue: activeDue,
      previousArrears: prevArrears,
      totalDue: totalDue,
      isSubmitted: submitted,
      paymentStatus: isPaidRow ? "Paid" : (hasRemainingDues ? (row?.paymentStatus || "Pending") : "Paid"),
      arrearBreakdown: combinedArrearBreakdown,
      paymentScope: defaultScope,
      allMemberEvents: isGrouped && Array.isArray(row.memberEvents) ? row.memberEvents : [],
      isAllEventsFilter: Boolean(isGrouped || selectedEventId === "ALL"),
    });
    setSubmitPaymentModalOpen(true);
  };

  const handleOpenViewModal = (row) => {
    if (!row) return;
    const allTxns = findAllContributionTransactions(row);
    let matchedTx = allTxns[0] || findContributionTransaction(row);
    const txWithScreenshot = allTxns.find((t) => t.screenshot || t.screenshots);
    const foundScreenshot = row.screenshot || row.screenshots || matchedTx?.screenshot || matchedTx?.screenshots || txWithScreenshot?.screenshot || txWithScreenshot?.screenshots || null;

    if (allTxns.length > 1) {
      matchedTx = {
        ...(matchedTx || {}),
        isSplitGroup: true,
        paymentMode: "Split",
        screenshot: matchedTx?.screenshot || foundScreenshot,
        screenshots: matchedTx?.screenshots || (Array.isArray(foundScreenshot) ? foundScreenshot : (foundScreenshot ? [foundScreenshot] : null)),
        splits: allTxns.map((t) => ({
          id: t.txnNumber || t.id,
          mode: normalizeModeName(t.paymentMode) || t.paymentMode || "UPI",
          amount: Number(t.amount) || 0,
          utr: t.utr || "-",
          notes: t.notes || "",
        })),
      };
    } else if (matchedTx && !matchedTx.screenshot && foundScreenshot) {
      matchedTx = {
        ...matchedTx,
        screenshot: foundScreenshot,
      };
    }
    setViewModalRow({ ...row, screenshot: row.screenshot || foundScreenshot });
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
        const publishedEvents = (Array.isArray(data) ? data : []).filter((e) => !e.isDeleted && isEventPublished(e));
        setEvents(publishedEvents);
        setPaymentModes(Array.isArray(modes) ? modes : []);
        setEventTypes(Array.isArray(evTypes) ? evTypes : []);
        if (data.length > 0) {
          // Do not auto-select event on initial mount; wait for Filter click
        }
        try {
          const allData = await getContributionsAsync();
          setAllContributions(allData);
        } catch {
          setAllContributions([]);
        }

        try {
          const [stRes, txRes, ticketsRes] = await Promise.all([
            getStatusesAsync(true).catch(() => []),
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
    getStatusesAsync(true)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDbStatuses(res);
        }
      })
      .catch(() => { });
  }, [statusModalOpen]);

  useEffect(() => {
    const handleStatusUpdated = () => {
      getStatusesAsync(true)
        .then((res) => {
          if (Array.isArray(res)) setDbStatuses(res);
        })
        .catch(() => { });
    };
    window.addEventListener("status_updated", handleStatusUpdated);
    return () => window.removeEventListener("status_updated", handleStatusUpdated);
  }, []);



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
    const targetEvId = payment.eventId || selectedEventId || "";
    const activeEv = (events || []).find((e) => String(e.eventId || e.id).toLowerCase() === String(targetEvId).toLowerCase());
    if (activeEv && !isEventPublished(activeEv)) {
      toast.warning("This event is not published yet. You can only pay for published events.");
      return;
    }

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

      if (hasAppliedFilter && selectedEventId) {
        const eventData = await fetchFilteredContributions(
          selectedEventId,
          appliedYear,
          appliedMonth,
          appliedEventType,
          allData
        );
        setRawContributions(eventData);
      }
    } catch (error) {
      const apiErrorMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(" ") : null) ||
        error.response?.data?.title ||
        TOAST_MESSAGES.GENERAL.SAVE_FAILED;
      toast.error(apiErrorMsg);
    }
  }

  const yearOptions = useMemo(() => {
    const curYear = dayjs().year();
    const yearsSet = new Set();
    for (let i = curYear - 5; i <= curYear + 5; i++) {
      yearsSet.add(i);
    }
    (filterLookupEvents || []).forEach((e) => {
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
  }, [filterLookupEvents]);

  const monthOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    })),
  ];

  const eventTypeOptions = useMemo(() => {
    const list = [{ label: "All Event Types", value: "ALL" }];
    const seen = new Set(["all"]);

    (filterLookupEvents || []).forEach((e) => {
      const id = String(e.eventTypeId || "").trim();
      const name = String(e.eventTypeName || e.categoryName || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        if (id) seen.add(id.toLowerCase());
        list.push({ label: name, value: id || name });
      }
    });

    return list;
  }, [filterLookupEvents]);

  // Reset invalid dependent Event Type when options change
  useEffect(() => {
    if (filterEventType && filterEventType !== "ALL") {
      const isValid = eventTypeOptions.some(
        (opt) => String(opt.value).toLowerCase() === String(filterEventType).toLowerCase()
      );
      if (!isValid) {
        setFilterEventType("ALL");
        setFilterEventId("ALL");
      }
    }
  }, [eventTypeOptions, filterEventType]);

  const eventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const filteredEvents = (filterLookupEvents || []).filter((e) => isMatchingEventType(e, filterEventType));

    filteredEvents.forEach((e) => {
      const dateStr = e.eventDate ? dayjs(e.eventDate).format("DD/MM/YYYY") : "";
      const label = dateStr ? `${e.eventName || "Unnamed Event"} (${dateStr})` : (e.eventName || "Unnamed Event");
      list.push({
        label,
        value: String(e.eventId || e.id),
      });
    });

    return list;
  }, [filterLookupEvents, filterEventType]);

  // Reset invalid dependent Event ID when eventOptions change
  useEffect(() => {
    if (filterEventId && filterEventId !== "ALL") {
      const isValid = eventOptions.some(
        (opt) => String(opt.value).toLowerCase() === String(filterEventId).toLowerCase()
      );
      if (!isValid) {
        setFilterEventId("ALL");
      }
    }
  }, [eventOptions, filterEventId]);

  const handleEventTypeChange = (newTypeId) => {
    setFilterEventType(newTypeId);
  };

  const handleApplyFilter = () => {
    setAppliedYear(filterYear);
    setAppliedMonth(filterMonth);
    setAppliedEventType(filterEventType);
    setSelectedEventId(filterEventId || "ALL");
    setAppliedStatus(filterStatus);
    setHasAppliedFilter(true);
  };

  const handleClearFilter = () => {
    setFilterYear(0);
    setFilterMonth(0);
    setAppliedYear(0);
    setAppliedMonth(0);
    setFilterEventType("ALL");
    setAppliedEventType("ALL");
    setFilterEventId("ALL");
    setSelectedEventId("ALL");
    setFilterStatus("ALL");
    setAppliedStatus("ALL");
    setHasAppliedFilter(true);
  };

  const getActualReceivedAmount = useCallback((row, matchedTx) => {
    if (!row) return 0;
    if (row.isGrouped) {
      if (Array.isArray(row.memberEvents)) {
        const sumEvPaid = row.memberEvents.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        if (sumEvPaid > 0) return sumEvPaid;
      }
      return Number(row.paidAmount || row.totalPaid || matchedTx?.amount || 0);
    }
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

    return Number(matchedTx?.amount || row.paidAmount || row.totalReceivedAmount || 0);
  }, []);

  const getModalStatusOptions = (row) => {
    const matchedTx = row ? findContributionTransaction(row) : null;
    const actualReceivedAmt = getActualReceivedAmount(row, matchedTx);
    const isAmountReceived = actualReceivedAmt > 0;

    // The authority review workflow explicitly requires: Approved, Rejected, Pending
    const allowedAuthorityStatuses = ["approved", "rejected", "pending"];

    let options = [];

    if (Array.isArray(dbStatuses) && dbStatuses.length > 0) {
      options = dbStatuses
        .filter((s) => {
          if (!s.statusName || s.isActive === false) return false;
          const nameLower = s.statusName.trim().toLowerCase();
          return allowedAuthorityStatuses.includes(nameLower);
        })
        .map((s) => {
          const name = s.statusName.trim();
          const isApproval = name.toLowerCase() === "approved";
          return {
            label: !isAmountReceived && isApproval
              ? `${name} (Payment not received)`
              : name,
            value: name,
            disabled: !isAmountReceived && isApproval,
          };
        });
    }

    const orderMap = { approved: 1, rejected: 2, pending: 3 };

    // Deduplicate options by case-insensitive value
    const uniqueOptions = [];
    const seen = new Set();
    for (const opt of options) {
      const valLower = opt.value.toLowerCase();
      if (!seen.has(valLower)) {
        seen.add(valLower);
        uniqueOptions.push(opt);
      }
    }

    // Ensure all 3 authority statuses are present
    if (!seen.has("approved")) {
      uniqueOptions.push({
        label: !isAmountReceived ? "Approved (Payment not received)" : "Approved",
        value: "Approved",
        disabled: !isAmountReceived,
      });
      seen.add("approved");
    }
    if (!seen.has("rejected")) {
      uniqueOptions.push({ label: "Rejected", value: "Rejected", disabled: false });
      seen.add("rejected");
    }
    if (!seen.has("pending")) {
      uniqueOptions.push({ label: "Pending", value: "Pending", disabled: false });
      seen.add("pending");
    }

    // Sort to canonical order: Approved, Rejected, Pending
    uniqueOptions.sort((a, b) => {
      const ordA = orderMap[a.value.toLowerCase()] || 99;
      const ordB = orderMap[b.value.toLowerCase()] || 99;
      return ordA - ordB;
    });

    return uniqueOptions;
  };

  const renderStatusBadge = (status) => {
    let color = "#b45309";
    let bg = "rgba(234,179,8,0.12)";

    const st = String(status || "").toLowerCase().trim();

    if (st === "paid" || st === "verified" || st === "closed" || st === "approved") {
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
    if (String(newStatus).toLowerCase() === "approved") {
      setApprovedKeys((prev) => new Set(prev).add(targetKey));
    } else {
      setApprovedKeys((prev) => {
        const next = new Set(prev);
        next.delete(targetKey);
        return next;
      });
    }

    if (String(newStatus).toLowerCase() === "verified") {
      setVerifiedKeys((prev) => new Set(prev).add(targetKey));
    } else {
      setVerifiedKeys((prev) => {
        const next = new Set(prev);
        next.delete(targetKey);
        return next;
      });
    }

    const isMarkingPaid = ["paid", "verified", "approved", "closed", "completed"].includes(String(newStatus).toLowerCase());

    const matchedTxnForValidation = findContributionTransaction(target);
    const actualReceived = getActualReceivedAmount(target, matchedTxnForValidation);

    if (actualReceived <= 0 && String(newStatus).toLowerCase() !== "rejected") {
      toast.error("Payment has not been received (Received Amount: ₹0.00). You cannot verify or save this status.");
      return;
    }

    // Optimistically update the current table row immediately
    setRawContributions((prev) =>
      prev.map((c) => {
        const isMatch = target.isGrouped
          ? (isSameText(c.memberId, target.memberId) || isSameText(c.memberName, target.memberName))
          : ((target.contributionId && c.contributionId === target.contributionId) ||
            (isSameText(c.memberId, target.memberId) && isSameText(c.eventId, target.eventId)));
        if (isMatch) {
          const isApproved = String(newStatus).toLowerCase() === "approved";
          const isVerified = String(newStatus).toLowerCase() === "verified";
          const updatedStatus = isApproved ? "Approved" : (isVerified ? "Verified" : (isMarkingPaid ? "Paid" : newStatus));
          const isPaid = isMarkingPaid;
          const arrears = c.previousUnpaid || 0;
          const splitAmount = (Number(c.cashAmount || 0) + Number(c.upiAmount || 0));
          const preservedPaid =
            splitAmount > 0
              ? splitAmount
              : (Number(c.paidAmount || 0) > 0
                ? Number(c.paidAmount)
                : (isPaid
                  ? Number(c.amount || 0)
                  : (actualReceived > 0
                    ? actualReceived
                    : Number(target.paidAmount || c.amount || 0))));

          const origTxMode = matchedTxnForValidation?.paymentMode;
          const currentMode = origTxMode && !["none", "0"].includes(String(origTxMode).toLowerCase())
            ? origTxMode
            : (c.paymentModeName || (c.paymentMode && c.paymentMode !== "None" ? c.paymentMode : (isPaid ? "Cash" : c.paymentMode)));

          return {
            ...c,
            paidAmount: preservedPaid,
            paymentStatus: updatedStatus,
            statusName: updatedStatus,
            isVerified: isVerified,
            isApproved: isApproved,
            verifiedBy: (isVerified || isApproved) ? verifier : c.verifiedBy,
            auditRemarks: noteText,
            notes: c.notes || noteText,
            rejectionReason: String(newStatus).toLowerCase() === "rejected" ? noteText : c.rejectionReason,
            paymentDate: isPaid ? (c.paymentDate || new Date().toISOString()) : c.paymentDate,
            paymentMode: currentMode,
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
      const statusToSend = String(newStatus).toLowerCase() === "approved" ? "Approved" : (isMarkingPaid ? "Verified" : newStatus);

      if (matchedTxns.length > 0) {
        await Promise.all(
          matchedTxns.map((txn) => {
            const txnId = txn.transactionId || txn.id;
            return verifyPaymentTransactionAsync(txnId, {
              status: statusToSend,
              verifiedBy: verifier,
              notes: trimmedNotes ? (txn.notes ? `${txn.notes} | ${trimmedNotes}` : trimmedNotes) : txn.notes,
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
      setStatusError("");
      setAuditRemarksError("");

      // Fetch latest transactions — critical: use this for both state + enrichment
      let latestTxns = freshTxns;
      try {
        const txRes2 = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes2)) {
          // Patch the verified transactions optimistically in case backend has slight delay
          const patchedTxns = txRes2.map((t) => {
            const origMatch = matchedTxns.find(
              (m) => (m.transactionId || m.id) === (t.transactionId || t.id)
            );
            if (origMatch) {
              return {
                ...t,
                status: statusToSend,
                verifiedBy: verifier,
                notes: t.notes || origMatch.notes || noteText,
                auditRemarks: noteText,
                paymentMode: t.paymentMode || origMatch.paymentMode,
              };
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
      if (hasAppliedFilter && selectedEventId) {
        const freshData = await fetchFilteredContributions(
          selectedEventId,
          appliedYear,
          appliedMonth,
          appliedEventType,
          freshAll
        );
        setRawContributions(Array.isArray(freshData) ? freshData : []);
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
        const isRejected =
          statusStr === "rejected" ||
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(row?.paymentStatus || "").toLowerCase() === "rejected" ||
          String(row?.statusName || "").toLowerCase() === "rejected";

        const isApprovedRow = isContributionApproved(row, matchedTx);
        const isApproved =
          statusStr === "approved" ||
          String(matchedTx?.status || "").toLowerCase() === "approved" ||
          String(row?.paymentStatus || "").toLowerCase() === "approved" ||
          String(row?.statusName || "").toLowerCase() === "approved" ||
          (isApprovedRow && !isRejected);

        const isVerifiedRow = isContributionVerified(row, matchedTx);
        const isActuallyVerified = statusStr === "verified" || (isVerifiedRow && !isRejected);
        const hasSubmitted = hasSubmittedPayment(row, matchedTx);
        const hasDirectPaid = isContributionPaid(row, matchedTx);
        const isPaidStatus =
          statusStr === "paid" ||
          statusStr === "verified" ||
          statusStr === "approved" ||
          statusStr === "completed" ||
          statusStr === "closed" ||
          row?.paymentStatus === 2;

        const actualReceivedAmt = getActualReceivedAmount(row, matchedTx);
        const hasPositiveReceivedAmt = actualReceivedAmt > 0;
        const isSettledByAmount = Number(row?.paidAmount || 0) > 0 && (row?.totalAccumulated === undefined || Number(row?.totalAccumulated) <= 0);

        // Member has payment recorded, payment proof submitted, or is settled/paid
        const hasMemberPaid = Boolean(
          isApproved ||
          isActuallyVerified ||
          isPaidStatus ||
          hasDirectPaid ||
          hasSubmitted ||
          isSettledByAmount ||
          hasPositiveReceivedAmt ||
          (Number(row?.paidAmount || 0) > 0) ||
          (Number(row?.totalReceivedAmount || 0) > 0) ||
          (row?.paymentMode && row?.paymentMode !== "-" && row?.paymentMode !== "--" && String(row?.paymentMode).toLowerCase() !== "none")
        );

        const isGrouped = selectedEventId === "ALL" && Boolean(row.isGrouped);
        const isPaidMember = isGrouped
          ? (statusStr === "paid" || statusStr === "approved" || statusStr === "verified" || (row?.totalDue !== undefined && row?.totalDue <= 0))
          : Boolean(isApproved || isActuallyVerified || isPaidStatus || hasDirectPaid || hasSubmitted || isSettledByAmount || hasPositiveReceivedAmt);

        // Verify icon is disabled when already approved, already verified, or if the member has not paid yet (unless rejected, which can be re-evaluated/updated)
        const isVerifyDisabled = isGrouped
          ? (!row.memberEvents?.some((e) => e.isPaid || e.paidAmount > 0) && !isRejected) || isApproved || isActuallyVerified
          : (isApproved || isActuallyVerified || (!hasMemberPaid && !isRejected));

        const verifyTooltipTitle = isApproved
          ? "Already Approved"
          : isActuallyVerified
            ? "Already Verified"
            : isRejected
              ? "Authority Status Update (Payment Rejected)"
              : !hasMemberPaid
                ? "Payment Not Received (Verification Disabled)"
                : "Authority Status Update";

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
              <Tooltip title={verifyTooltipTitle}>
                <span style={{ display: "inline-flex", cursor: isVerifyDisabled ? "not-allowed" : "pointer" }}>
                  <IconButton
                    size="small"
                    disabled={isVerifyDisabled}
                    onClick={() => {
                      setStatusModalRow(row);
                      setStatusChangeValue("");
                      setAuditRemarks("");
                      setStatusError("");
                      setAuditRemarksError("");
                      setStatusModalOpen(true);
                    }}
                    sx={{
                      p: 0.4,
                      color: isVerifyDisabled ? "#9ca3af" : "#16a34a",
                      bgcolor: isVerifyDisabled ? "rgba(156, 163, 175, 0.08)" : "rgba(22, 163, 74, 0.08)",
                      borderRadius: "6px",
                      "&.Mui-disabled": {
                        color: "#9ca3af",
                        bgcolor: "rgba(156, 163, 175, 0.08)",
                        opacity: 0.65,
                      },
                      "&:hover": {
                        bgcolor: isVerifyDisabled ? "rgba(156, 163, 175, 0.08)" : "rgba(22, 163, 74, 0.18)",
                        color: isVerifyDisabled ? "#9ca3af" : "#15803d",
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
          </Box>
        );
      },
    },
    { label: "Username", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    ...(selectedEventId === "ALL"
      ? [
        {
          label: "Event Name",
          key: "eventName",
          render: (row) => {
            if (row.isGrouped && Array.isArray(row.memberEvents) && row.memberEvents.length > 0) {
              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6, py: 0.5 }}>
                  {row.memberEvents.map((ev, idx) => (
                    <Box
                      key={ev.eventId || idx}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: ev.isPaid ? "#16a34a" : "#6366f1",
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="primary.main"
                        sx={{
                          fontSize: "0.82rem",
                          lineHeight: 1.3,
                        }}
                      >
                        {ev.eventName || "--"}
                      </Typography>
                      {row.memberEvents.length > 1 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.7rem",
                            color: "text.secondary",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                            px: 0.6,
                            py: 0.1,
                            borderRadius: "4px",
                            fontWeight: 700,
                          }}
                        >
                          {formatWholeCurrency(ev.amount || 0)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              );
            }

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
        if (selectedEventId === "ALL" && row.isGrouped) {
          const status = row.paymentStatus || "Pending";
          let color = "#b45309";
          let bg = "rgba(234,179,8,0.12)";
          if (status === "Paid") {
            color = "#059669";
            bg = "rgba(5,150,105,0.08)";
          } else if (status === "Approved") {
            color = "#059669";
            bg = "rgba(5,150,105,0.14)";
          } else if (status === "Verified") {
            color = "#16a34a";
            bg = "rgba(22,163,74,0.12)";
          } else if (status === "Partial") {
            color = "#d97706";
            bg = "rgba(217,119,6,0.12)";
          } else if (status === "Rejected") {
            color = "#dc2626";
            bg = "rgba(220,38,38,0.08)";
          }

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
              {status}
            </Typography>
          );
        }

        const matchedTx = findContributionTransaction(row);
        const statusStr = String(row?.paymentStatus || row?.status || row?.statusName || matchedTx?.status || "").trim().toLowerCase();
        const isRejected =
          statusStr === "rejected" ||
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(row?.paymentStatus || "").toLowerCase() === "rejected" ||
          String(row?.statusName || "").toLowerCase() === "rejected";

        const isApproved =
          statusStr === "approved" ||
          String(matchedTx?.status || "").toLowerCase() === "approved" ||
          String(row?.paymentStatus || "").toLowerCase() === "approved" ||
          String(row?.statusName || "").toLowerCase() === "approved" ||
          (isContributionApproved(row, matchedTx) && !isRejected);

        const isVerified = isContributionVerified(row, matchedTx);
        const isPaid =
          isContributionPaid(row, matchedTx) ||
          hasSubmittedPayment(row, matchedTx) ||
          isApproved ||
          isVerified ||
          row?.paymentStatus === 2 ||
          String(row?.paymentStatus || "").toLowerCase() === "paid" ||
          String(row?.statusName || "").toLowerCase() === "paid";

        let displayStatus = "Pending";
        if (isRejected) {
          displayStatus = "Rejected";
        } else if (isApproved) {
          displayStatus = "Approved";
        } else if (isVerified) {
          displayStatus = "Verified";
        } else if (isPaid) {
          displayStatus = "Paid";
        }

        const color = isRejected
          ? "#dc2626"
          : (isApproved ? "#059669" : (isVerified ? "#16a34a" : (isPaid ? "#059669" : "#b45309")));
        const bg = isRejected
          ? "rgba(220,38,38,0.08)"
          : (isApproved ? "rgba(5,150,105,0.14)" : (isVerified ? "rgba(22,163,74,0.12)" : (isPaid ? "rgba(5,150,105,0.08)" : "rgba(234,179,8,0.12)")));

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
        if (selectedEventId === "ALL" && row.isGrouped && Array.isArray(row.memberEvents)) {
          const totalPaid = Number(row.totalPaid) || Number(row.paidAmount) || 0;
          const tooltipContent = (
            <Box sx={{ p: 0.8, minWidth: 220, maxWidth: 340 }}>
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{
                  display: "block",
                  color: "#86efac",
                  borderBottom: "1px solid rgba(255,255,255,0.18)",
                  pb: 0.4,
                  mb: 0.6,
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                Payment Details by Event
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                {row.memberEvents.map((ev, idx) => {
                  const evPaid = Number(ev.paidAmount) || (ev.isPaid ? Number(ev.amount) : 0);
                  const isFullyPaid = evPaid >= Number(ev.amount) && Number(ev.amount) > 0;
                  const isPartial = evPaid > 0 && !isFullyPaid;
                  const evStatus = isFullyPaid ? "Fully Paid" : isPartial ? "Partially Paid" : "Pending";
                  const statusColor = isFullyPaid ? "#4ade80" : isPartial ? "#fbbf24" : "#f87171";

                  return (
                    <Box
                      key={ev.eventId || idx}
                      sx={{
                        p: 0.6,
                        borderRadius: "4px",
                        bgcolor: "rgba(255,255,255,0.06)",
                        borderLeft: `3px solid ${statusColor}`,
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ color: "#f8fafc", fontSize: "0.75rem", fontWeight: 700 }}>
                          {ev.eventName || "Event"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: statusColor, fontWeight: 800, fontSize: "0.72rem" }}>
                          {formatWholeCurrency(evPaid)} / {formatWholeCurrency(ev.amount || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.68rem" }}>
                          Status: <span style={{ color: statusColor, fontWeight: 600 }}>{evStatus}</span>
                        </Typography>
                        {ev.paymentMode && (
                          <Typography variant="caption" sx={{ color: "#cbd5e1", fontSize: "0.68rem" }}>
                            Mode: {ev.paymentMode}
                          </Typography>
                        )}
                      </Box>
                      {ev.paymentDate && (
                        <Typography variant="caption" sx={{ display: "block", color: "#94a3b8", fontSize: "0.68rem", mt: 0.15 }}>
                          Date: {formatGridDate(ev.paymentDate)}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
              <Box
                sx={{
                  borderTop: "1px solid rgba(255,255,255,0.18)",
                  mt: 0.8,
                  pt: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.35,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                  <span style={{ color: "#cbd5e1" }}>Total Paid:</span>
                  <span style={{ color: totalPaid > 0 ? "#86efac" : "#cbd5e1", fontWeight: 800 }}>
                    {formatWholeCurrency(totalPaid)}
                  </span>
                </Box>
              </Box>
            </Box>
          );

          return (
            <Tooltip title={tooltipContent} arrow enterDelay={150}>
              <Typography
                variant="body2"
                fontWeight={totalPaid > 0 ? 800 : 500}
                color={totalPaid > 0 ? "success.main" : "text.secondary"}
                sx={{
                  cursor: "help",
                  textDecoration: "underline dotted",
                  display: "inline-block",
                }}
              >
                {formatWholeCurrency(totalPaid)}
              </Typography>
            </Tooltip>
          );
        }

        const allTxns = findAllContributionTransactions(row);
        const matchedTx = allTxns[0] || findContributionTransaction(row);
        const isRejected =
          String(matchedTx?.status || "").toLowerCase() === "rejected" ||
          String(row?.paymentStatus || "").toLowerCase() === "rejected" ||
          String(row?.statusName || "").toLowerCase() === "rejected";

        const isApproved =
          String(row?.paymentStatus || "").toLowerCase() === "approved" ||
          String(row?.statusName || "").toLowerCase() === "approved" ||
          (isContributionApproved(row, matchedTx) && !isRejected);

        const isVerified = isContributionVerified(row, matchedTx);
        const isPaid =
          isContributionPaid(row, matchedTx) ||
          hasSubmittedPayment(row, matchedTx) ||
          isApproved ||
          isVerified ||
          row?.paymentStatus === 2 ||
          String(row?.paymentStatus || "").toLowerCase() === "paid" ||
          String(row?.statusName || "").toLowerCase() === "paid";

        const activeEv = (events || []).find(
          (e) => String(e.eventId || e.id) === String(row.eventId || selectedEventId)
        );
        const eventAmount = getMemberEventAmount(row, activeEv);

        let rawPaidAmt = 0;
        const cash = Number(row.cashAmount) || 0;
        const upi = Number(row.upiAmount) || 0;
        const totalTxAmt = allTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const txAmt = totalTxAmt > 0 ? totalTxAmt : (Number(matchedTx?.amount) || 0);
        const rawPaid = Number(row.paidAmount) || Number(row.totalReceivedAmount) || 0;

        if (cash > 0 || upi > 0) {
          rawPaidAmt = cash + upi;
        } else if (txAmt > 0) {
          rawPaidAmt = txAmt;
        } else if (rawPaid > 0) {
          rawPaidAmt = rawPaid;
        } else if (isPaid || isRejected) {
          rawPaidAmt = eventAmount > 0 ? eventAmount : Number(row.amount || 0);
        }

        // For this single event, contribution paid cannot exceed eventAmount
        const paidAmount = eventAmount > 0 ? (isPaid ? eventAmount : Math.min(rawPaidAmt, eventAmount)) : rawPaidAmt;
        const extraArrearsPaid = eventAmount > 0 ? Math.max(0, rawPaidAmt - eventAmount) : 0;

        const paidEventName =
          row.eventName ||
          activeEv?.eventName ||
          activeEv?.title ||
          matchedTx?.eventName ||
          "Current Event";

        const tooltipContent = paidAmount > 0 ? (
          <Box sx={{ p: 0.5, minWidth: 160 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: "block", color: "#86efac", mb: 0.3 }}>
              Paid Against Event:
            </Typography>
            <Typography variant="body2" sx={{ color: "#fff", fontSize: "0.78rem", fontWeight: 700 }}>
              {paidEventName}: {formatWholeCurrency(paidAmount)}
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
        if (selectedEventId === "ALL" && row.isGrouped) {
          const totalAmount = Number(row.totalAmount) || Number(row.amount) || 0;
          return (
            <Tooltip
              title={
                row.memberEvents && row.memberEvents.length > 1 ? (
                  <Box sx={{ p: 0.5, minWidth: 160 }}>
                    <Typography variant="caption" fontWeight={800} sx={{ display: "block", color: "#93c5fd", mb: 0.4 }}>
                      Events Total Breakdown:
                    </Typography>
                    {row.memberEvents.map((ev, idx) => (
                      <Box key={ev.eventId || idx} sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: "0.72rem", py: 0.15 }}>
                        <span style={{ color: "#e2e8f0" }}>• {ev.eventName}</span>
                        <span style={{ fontWeight: 700, color: "#fff" }}>{formatWholeCurrency(ev.amount || 0)}</span>
                      </Box>
                    ))}
                    <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", mt: 0.4, pt: 0.3, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.75rem", color: "#bfdbfe" }}>
                      <span>Total:</span>
                      <span>{formatWholeCurrency(totalAmount)}</span>
                    </Box>
                  </Box>
                ) : ""
              }
              arrow
              enterDelay={150}
              disableHoverListener={!row.memberEvents || row.memberEvents.length <= 1}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="inherit"
                sx={{
                  cursor: row.memberEvents && row.memberEvents.length > 1 ? "help" : "inherit",
                  textDecoration: row.memberEvents && row.memberEvents.length > 1 ? "underline dotted" : "none",
                }}
              >
                {formatWholeCurrency(totalAmount)}
              </Typography>
            </Tooltip>
          );
        }

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
        if (selectedEventId === "ALL" && row.isGrouped && row.totalDue !== undefined) {
          return formatWholeCurrency(row.totalDue);
        }
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
        if (selectedEventId === "ALL" && row.isGrouped && Array.isArray(row.memberEvents)) {
          const modes = [
            ...new Set(
              row.memberEvents
                .filter((e) => e.isPaid && e.paymentMode)
                .map((e) => normalizeModeName(e.paymentMode) || e.paymentMode)
            ),
          ];
          if (modes.length > 0) {
            return modes.join(", ");
          }
        }
        const allTxns = findAllContributionTransactions(row);
        const matchedTx = allTxns[0] || findContributionTransaction(row);
        const isPaid = isContributionPaid(row, matchedTx);
        const hasSubmitted = hasSubmittedPayment(row, matchedTx);
        let resolvedMode = "-";
        if (isPaid || hasSubmitted) {
          resolvedMode = getResolvedPaymentMode(row, matchedTx);
          if (!resolvedMode || resolvedMode === "-" || resolvedMode === "None") {
            const isGeneric = (m) => {
              if (!m || m === "-" || m === "--") return true;
              const s = String(m).trim().toLowerCase();
              return s === "none" || s === "upi" || s === "online" || s === "2" || s === "0";
            };
            const txMode = matchedTx?.paymentMode;
            const cMode = row.paymentModeName || row.paymentMode;
            const raw = (!isGeneric(txMode) ? txMode : null) ||
              (!isGeneric(cMode) ? cMode : null) ||
              txMode ||
              cMode;
            const utr = row.utrNumber || row.referenceNo || matchedTx?.utr || matchedTx?.transactionRef;
            const notes = row.notes || matchedTx?.notes;
            resolvedMode = resolvePaymentMethodName(raw, utr, notes);
          }
        }

        if (!resolvedMode || resolvedMode === "-" || resolvedMode === "None") {
          return <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>--</Typography>;
        }

        const isSplit = resolvedMode === "Split" || String(resolvedMode).toLowerCase().includes("split");

        if (isSplit) {
          const cashAmount = row.cashAmount || matchedTx?.cashAmount;
          const upiAmount = row.upiAmount || matchedTx?.upiAmount;
          const cashInfo = cashAmount ? `${formatWholeCurrency(cashAmount)} Cash` : "";
          const upiInfo = upiAmount ? `${formatWholeCurrency(upiAmount)} UPI` : "";
          const tooltipText = cashInfo && upiInfo ? `Split Payment: ${cashInfo} + ${upiInfo}` : "Split Payment";

          return (
            <Tooltip title={tooltipText} arrow enterDelay={100}>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  px: 1.2,
                  py: 0.3,
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "#6366f1",
                  bgcolor: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  cursor: "help",
                }}
              >
                Split
              </Box>
            </Tooltip>
          );
        }

        const modeColor = getModeColor(resolvedMode);
        return (
          <Box
            component="span"
            sx={{
              display: "inline-block",
              px: 1.2,
              py: 0.3,
              borderRadius: "4px",
              fontSize: "0.72rem",
              fontWeight: 800,
              color: modeColor,
              bgcolor: `${modeColor}14`,
              border: `1px solid ${modeColor}35`,
            }}
          >
            {resolvedMode}
          </Box>
        );
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
        data={hasAppliedFilter ? contributions : []}
        emptyMessage={!hasAppliedFilter ? "Please select filters and click Filter to view contribution collections." : undefined}
        filterPanel={
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 1.25,
              width: "100%",
            }}
          >
            <Box sx={{ width: { xs: "100%", sm: 125, md: 135 } }}>
              <AppSelect
                label="Year"
                placeholder="Select Year"
                value={filterYear}
                onChange={(event) => {
                  const val = event.target.value;
                  setFilterYear(val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
                }}
                onClear={() => setFilterYear(0)}
                options={yearOptions}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 145, md: 155 } }}>
              <AppSelect
                label="Month"
                placeholder="Select Month"
                value={filterMonth}
                onChange={(event) => {
                  const val = event.target.value;
                  setFilterMonth(val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
                }}
                onClear={() => setFilterMonth(0)}
                options={monthOptions}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 180, md: 200 } }}>
              <AppSelect
                label="Event Type"
                placeholder="Select event type"
                value={filterEventType}
                onChange={(event) => {
                  handleEventTypeChange(event.target.value || "ALL");
                }}
                onClear={() => handleEventTypeChange("ALL")}
                options={eventTypeOptions}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 200, md: 230 } }}>
              <AppSelect
                label="Event"
                placeholder="Select an event"
                value={filterEventId}
                onChange={(event) => {
                  setFilterEventId(event.target.value || "ALL");
                }}
                onClear={() => setFilterEventId("ALL")}
                options={eventOptions}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
              <AppSelect
                label="Status"
                placeholder="Select status"
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value || "ALL");
                }}
                onClear={() => setFilterStatus("ALL")}
                options={filterStatusOptions}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                onClick={handleApplyFilter}
                sx={{
                  height: 34,
                  minHeight: 34,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  whiteSpace: "nowrap",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
                  border: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
                  "&:hover": { bgcolor: (theme) => theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important" },
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
                  minHeight: 34,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                  },
                }}
              >
                Clear Filter
              </AppButton>
            </Box>
          </Box>
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
            if (!qrConfig?.isConfigured || (!qrConfig.upiId && !qrConfig.qrImage)) {
              return null;
            }

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
        allTransactions={transactions}
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
        initialPaymentScope={paymentModalContext.paymentScope}
        initialAllMemberEvents={paymentModalContext.allMemberEvents}
        isAllEventsFilter={Boolean(paymentModalContext.isAllEventsFilter)}
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
          if (hasAppliedFilter && selectedEventId) {
            const freshData = await fetchFilteredContributions(
              selectedEventId,
              appliedYear,
              appliedMonth,
              appliedEventType,
              freshAll
            );
            setRawContributions(Array.isArray(freshData) ? freshData : []);
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
          setAuditRemarksError("");
        }}
        title="Authority Status Update"
        maxWidth="md"
        actions={
          (() => {
            const matchedTx = statusModalRow ? findContributionTransaction(statusModalRow) : null;
            const actualReceivedAmt = getActualReceivedAmount(statusModalRow, matchedTx);
            const isZeroAmount = actualReceivedAmt <= 0;
            const isVerificationTarget = ["verified", "paid", "closed", "completed", "approved"].includes(
              String(statusChangeValue).toLowerCase()
            );

            return (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AppCancelButton onClick={() => setStatusModalOpen(false)}>
                  Close
                </AppCancelButton>
                <AppSaveButton
                  loading={statusSaving}
                  disabled={isZeroAmount && isVerificationTarget}
                  disabledTooltip={
                    isZeroAmount && isVerificationTarget
                      ? "Cannot save or verify: Payment amount has not been received (₹0.00). Member must submit payment first."
                      : ""
                  }
                  onClick={() => {
                    let hasError = false;
                    if (!statusChangeValue || !String(statusChangeValue).trim()) {
                      setStatusError("This field is required");
                      hasError = true;
                    }
                    if (!auditRemarks || !String(auditRemarks).trim()) {
                      setAuditRemarksError("This field is required");
                      hasError = true;
                    }
                    if (hasError) {
                      toast.error("This field is required");
                      return;
                    }
                    handleStatusUpdate(
                      statusModalRow,
                      statusChangeValue,
                      auditRemarks.trim()
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
                const allRelatedTxns = findAllContributionTransactions(statusModalRow);
                const matchedTx = allRelatedTxns[0] || findContributionTransaction(statusModalRow);
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

                const rawMode = statusModalRow?.paymentMode || matchedTx?.paymentMode;
                const totalDueAmt = Number(statusModalRow?.totalDue ?? (statusModalRow?.amount ?? 0));
                const hasSubmittedProof = Boolean(
                  (matchedTx && Number(matchedTx.amount) > 0) ||
                  (statusModalRow?.paymentMode && statusModalRow?.paymentMode !== "-" && statusModalRow?.paymentMode !== "--" && statusModalRow?.paymentMode.toLowerCase() !== "none") ||
                  statusModalRow?.utrNumber ||
                  statusModalRow?.referenceNo
                );

                const utrVal = statusModalRow?.utrNumber || statusModalRow?.referenceNo || statusModalRow?.utr || matchedTx?.utr || matchedTx?.transactionRef || matchedTx?.referenceNo || "--";
                const dateVal = statusModalRow?.paymentDate || matchedTx?.paymentDate || matchedTx?.createdOn;
                const dateDisplay = dateVal ? dayjs(dateVal).format("DD/MM/YYYY") : (isPaidOrVerified ? dayjs().format("DD/MM/YYYY") : "--");
                const scopeVal = statusModalRow?.paymentScope || matchedTx?.paymentScope || (totalDueAmt > 100 ? "All Outstanding" : "Current Event");
                const notesVal = statusModalRow?.notes || matchedTx?.notes || "";
                const createdByVal = statusModalRow?.createdBy || statusModalRow?.recordedBy || matchedTx?.createdBy || matchedTx?.memberName || statusModalRow?.memberName || "Member";
                const rawImgs = statusModalRow?.screenshots || matchedTx?.screenshots || statusModalRow?.screenshot || matchedTx?.screenshot;
                const proofImgs = Array.isArray(rawImgs) ? rawImgs : (rawImgs ? [rawImgs] : []);

                const primaryEvName = statusModalRow.isGrouped
                  ? (statusModalRow.memberEvents?.map((e) => e.eventName).join(", ") || "All Events")
                  : (statusModalRow?.eventName || (events.find((e) => e.eventId === statusModalRow?.eventId)?.eventName) || "Current Event");
                const currentEvAmt = Number(statusModalRow?.amount || statusModalRow?.currentEventDue || 0);

                const resolvedEventType = statusModalRow.isGrouped
                  ? "All Event Types"
                  : (statusModalRow?.eventTypeName ||
                    statusModalRow?.eventType ||
                    statusModalRow?.categoryName ||
                    statusModalRow?.eventCategory ||
                    (events.find((e) => String(e.eventId || e.id) === String(statusModalRow?.eventId)))?.eventTypeName ||
                    (events.find((e) => String(e.eventId || e.id) === String(statusModalRow?.eventId)))?.categoryName ||
                    (events.find((e) => String(e.eventId || e.id) === String(statusModalRow?.eventId)))?.category ||
                    "--");

                // Parse structured splits or breakdown
                let splitsList = [];
                if (allRelatedTxns.length > 1) {
                  splitsList = allRelatedTxns.map((t) => ({
                    id: t.txnNumber || t.id,
                    mode: resolvePaymentMethodName(t.paymentMode, t.utr, t.notes),
                    amount: Number(t.amount) || 0,
                    utr: t.utr || t.transactionRef || t.referenceNo || "",
                    notes: t.notes,
                  }));
                } else if (Array.isArray(matchedTx?.splits) && matchedTx.splits.length > 0) {
                  splitsList = matchedTx.splits.map((s) => ({
                    ...s,
                    mode: resolvePaymentMethodName(s.mode || s.paymentMode, s.utr, s.notes),
                    amount: Number(s.amount) || 0,
                    utr: s.utr || s.referenceNo || s.transactionRef || "",
                  }));
                } else if (Array.isArray(statusModalRow.splits) && statusModalRow.splits.length > 0) {
                  splitsList = statusModalRow.splits.map((s) => ({
                    ...s,
                    mode: resolvePaymentMethodName(s.mode || s.paymentMode, s.utr, s.notes),
                    amount: Number(s.amount) || 0,
                    utr: s.utr || s.referenceNo || s.transactionRef || "",
                  }));
                }

                if (splitsList.length === 0) {
                  const match = notesVal.match(/\[Split Breakdown:\s*([^\]]+)\]/i);
                  if (match && match[1]) {
                    const items = match[1].split(",");
                    splitsList = items.map((item, idx) => {
                      const parts = item.trim().split(":");
                      let mode = parts[0]?.trim() || `Mode ${idx + 1}`;
                      mode = resolvePaymentMethodName(mode);
                      const rest = parts.slice(1).join(":");
                      const amtMatch = rest.match(/₹?([0-9.]+)/);
                      const utrMatch = rest.match(/\(Ref:\s*([^)]+)\)/i) || rest.match(/\(UTR:\s*([^)]+)\)/i);
                      return {
                        mode,
                        amount: amtMatch ? Number(amtMatch[1]) : 0,
                        utr: utrMatch ? utrMatch[1].trim() : "",
                      };
                    });
                  } else if (cashAmt > 0 && upiAmt > 0) {
                    splitsList.push({ mode: "Cash", amount: cashAmt, utr: "" });
                    splitsList.push({ mode: resolvePaymentMethodName("UPI", utrVal, notesVal), amount: upiAmt, utr: utrVal });
                  }
                }

                // Build distinct digital UTR items for each mode (e.g. GPay UTR and PhonePe UTR)
                const splitUtrMap = new Map();

                allRelatedTxns.forEach((t) => {
                  const m = resolvePaymentMethodName(t.paymentMode, t.utr, t.notes);
                  const u = String(t.utr || t.transactionRef || t.referenceNo || "").trim();
                  const isCash = m.toLowerCase().includes("cash");
                  if (!isCash && u && u !== "-" && u !== "--" && u.toUpperCase() !== "SPLIT" && u.toUpperCase() !== "CASH") {
                    if (!splitUtrMap.has(m)) {
                      splitUtrMap.set(m, u);
                    }
                  }
                });

                const splitsArrays = [
                  ...(Array.isArray(matchedTx?.splits) ? matchedTx.splits : []),
                  ...(Array.isArray(statusModalRow?.splits) ? statusModalRow.splits : []),
                  ...splitsList,
                ];
                splitsArrays.forEach((s) => {
                  const m = resolvePaymentMethodName(s.mode || s.paymentMode, s.utr, s.notes);
                  const u = String(s.utr || s.referenceNo || s.transactionRef || "").trim();
                  const isCash = m.toLowerCase().includes("cash");
                  if (!isCash && u && u !== "-" && u !== "--" && u.toUpperCase() !== "SPLIT" && u.toUpperCase() !== "CASH") {
                    if (!splitUtrMap.has(m)) {
                      splitUtrMap.set(m, u);
                    }
                  }
                });

                const allNotesToScan = [notesVal, matchedTx?.notes, statusModalRow?.notes].filter(Boolean);
                allNotesToScan.forEach((n) => {
                  const splitBreakdownMatch = n.match(/\[Split Breakdown:\s*([^\]]+)\]/i);
                  if (splitBreakdownMatch && splitBreakdownMatch[1]) {
                    const items = splitBreakdownMatch[1].split(",");
                    items.forEach((item) => {
                      const parts = item.trim().split(":");
                      let m = parts[0]?.trim();
                      m = resolvePaymentMethodName(m);
                      const isCash = m.toLowerCase().includes("cash");
                      if (!isCash) {
                        const refMatch = item.match(/\(Ref:\s*([^)]+)\)/i) || item.match(/\(UTR:\s*([^)]+)\)/i);
                        if (refMatch && refMatch[1]?.trim()) {
                          const u = refMatch[1].trim();
                          if (u && u !== "-" && u !== "--" && u.toUpperCase() !== "CASH" && u.toUpperCase() !== "SPLIT") {
                            if (!splitUtrMap.has(m)) {
                              splitUtrMap.set(m, u);
                            }
                          }
                        }
                      }
                    });
                  }
                });

                const allRawUtrs = [
                  statusModalRow?.utrNumber,
                  statusModalRow?.referenceNo,
                  matchedTx?.utr,
                  matchedTx?.transactionRef,
                  matchedTx?.referenceNo,
                ].filter(Boolean);

                allRawUtrs.forEach((raw) => {
                  const regex = /(Gpay|Phonepe|Paytm|UPI|Bank Transfer|Card)[\s:]+([A-Za-z0-9]+)/gi;
                  let rm;
                  while ((rm = regex.exec(raw)) !== null) {
                    const m = resolvePaymentMethodName(rm[1]);
                    const u = rm[2].trim();
                    if (!splitUtrMap.has(m) && u && u.toUpperCase() !== "CASH" && u.toUpperCase() !== "SPLIT") {
                      splitUtrMap.set(m, u);
                    }
                  }
                });

                if (splitUtrMap.size === 0 && utrVal && utrVal !== "--" && utrVal.toUpperCase() !== "SPLIT" && utrVal.toUpperCase() !== "CASH") {
                  const singleDigitalMode = singleMethodName && !singleMethodName.toLowerCase().includes("cash") ? singleMethodName : "UPI";
                  splitUtrMap.set(singleDigitalMode, utrVal);
                }

                const splitUtrs = Array.from(splitUtrMap.entries()).map(([mode, utr]) => ({ mode, utr }));

                const isSplitPayment =
                  splitsList.length > 1 ||
                  Boolean(matchedTx?.isSplitGroup) ||
                  Boolean(matchedTx?.parentTxnNumber) ||
                  Boolean(matchedTx?.transactionGroupId) ||
                  statusModalRow.paymentMode === 5 ||
                  statusModalRow.paymentMode === "5" ||
                  String(statusModalRow.paymentMode || "").toLowerCase().includes("split") ||
                  String(matchedTx?.paymentMode || "").toLowerCase().includes("split") ||
                  (cashAmt > 0 && upiAmt > 0);

                const singleMethodName = resolvePaymentMethodName(rawMode, utrVal, notesVal);

                // Clean Cash Handover Note extraction
                const getCleanCashNote = () => {
                  const knownAuditTexts = [
                    statusModalRow?.rejectionReason,
                    matchedTx?.rejectionReason,
                    statusModalRow?.auditRemarks,
                    matchedTx?.auditRemarks,
                    auditRemarks,
                  ]
                    .filter((t) => typeof t === "string" && t.trim().length > 0)
                    .map((t) => t.trim().toLowerCase());

                  const isAuditOrRejectionNote = (text) => {
                    if (!text || typeof text !== "string") return true;
                    const trimmed = text.trim();
                    if (!trimmed || trimmed === "-" || trimmed === "--") return true;
                    const lower = trimmed.toLowerCase();

                    for (const audit of knownAuditTexts) {
                      if (lower === audit) return true;
                      if (audit.length >= 3 && (lower.includes(audit) || audit.includes(lower))) return true;
                    }

                    if (/^(status updated|updated to|verified by|rejected by|reviewed by|rejected\b|verified\b)/i.test(lower)) {
                      return true;
                    }

                    if (trimmed.startsWith("[") || trimmed.includes("Split Breakdown:") || trimmed.includes("Scope:")) {
                      return true;
                    }

                    return false;
                  };

                  const allNotesSources = [
                    ...splitsList.map((s) => s.notes),
                    notesVal,
                    matchedTx?.notes,
                    statusModalRow?.notes,
                    ...splitsList.map((s) => s.utr),
                  ].filter((n) => typeof n === "string" && n.trim().length > 0);

                  for (const raw of allNotesSources) {
                    const match = raw.match(/\[Cash Note:\s*([^\]]+)\]/i);
                    if (match && match[1]?.trim()) {
                      const cleaned = match[1]
                        .replace(/\[Scope:[^\]]+\]/gi, "")
                        .replace(/\[Split Breakdown:[^\]]+\]/gi, "")
                        .trim();
                      if (cleaned && !isAuditOrRejectionNote(cleaned)) {
                        return cleaned;
                      }
                    }
                  }

                  const cashSplit = splitsList.find((s) =>
                    String(s.mode || "").toLowerCase().includes("cash")
                  );

                  if (cashSplit) {
                    const candidate = cashSplit.cashNote || cashSplit.notes;
                    if (typeof candidate === "string" && candidate.trim()) {
                      let cleaned = candidate
                        .replace(/\[Scope:[^\]]+\]/gi, "")
                        .replace(/\[Split Breakdown:[^\]]+\]/gi, "")
                        .replace(/\[Cash Note:\s*([^\]]+)\]/gi, "$1")
                        .replace(/Status updated to [^.]+(\.|$)/gi, "")
                        .trim();

                      if (
                        cleaned &&
                        cleaned.toUpperCase() !== "CASH" &&
                        !isAuditOrRejectionNote(cleaned)
                      ) {
                        return cleaned;
                      }
                    }

                    if (
                      cashSplit.utr &&
                      typeof cashSplit.utr === "string" &&
                      cashSplit.utr.trim().toUpperCase() !== "CASH" &&
                      cashSplit.utr.trim() !== "-" &&
                      cashSplit.utr.trim() !== "--" &&
                      !cashSplit.utr.includes(":") &&
                      !isAuditOrRejectionNote(cashSplit.utr)
                    ) {
                      return cashSplit.utr.trim();
                    }
                  }

                  const isSingleCash = String(rawMode).toLowerCase().includes("cash") && !isSplitPayment;
                  if (isSingleCash) {
                    if (utrVal && typeof utrVal === "string") {
                      const trimmedUtr = utrVal.trim();
                      if (
                        trimmedUtr &&
                        trimmedUtr.toUpperCase() !== "CASH" &&
                        trimmedUtr !== "-" &&
                        trimmedUtr !== "--" &&
                        trimmedUtr !== "SPLIT" &&
                        !trimmedUtr.includes(":") &&
                        !isAuditOrRejectionNote(trimmedUtr)
                      ) {
                        return trimmedUtr;
                      }
                    }

                    const cleanNotesVal = notesVal
                      .replace(/\[Scope:[^\]]+\]/gi, "")
                      .replace(/\[Split Breakdown:[^\]]+\]/gi, "")
                      .replace(/\[Cash Note:\s*([^\]]+)\]/gi, "$1")
                      .trim();
                    if (cleanNotesVal && cleanNotesVal.toUpperCase() !== "CASH" && !isAuditOrRejectionNote(cleanNotesVal)) {
                      return cleanNotesVal;
                    }
                  }

                  return "--";
                };

                const hasCashComponent =
                  singleMethodName === "Cash" ||
                  splitsList.some((s) => String(s.mode || "").toLowerCase().includes("cash")) ||
                  cashAmt > 0;

                const cashHandoverNote = getCleanCashNote();

                const eventBreakdownItems = [];
                if (statusModalRow.isGrouped && Array.isArray(statusModalRow.memberEvents) && statusModalRow.memberEvents.length > 0) {
                  statusModalRow.memberEvents.forEach((ev) => {
                    const evAmt = Number(ev.paidAmount || ev.amount || 0);
                    eventBreakdownItems.push(`${ev.eventName}: ${formatWholeCurrency(evAmt)}`);
                  });
                } else if (currentEvAmt > 0) {
                  eventBreakdownItems.push(`${primaryEvName}: ${formatWholeCurrency(currentEvAmt)}`);
                } else {
                  eventBreakdownItems.push(`${primaryEvName}: ${formatWholeCurrency(actualReceivedAmt)}`);
                }

                const prevArrears = Number(statusModalRow?.previousArrears || matchedTx?.previousArrears || (actualReceivedAmt > currentEvAmt && currentEvAmt > 0 ? actualReceivedAmt - currentEvAmt : 0));
                const arrearItems = statusModalRow?.previousUnpaidItems || statusModalRow?.arrearBreakdown || matchedTx?.arrearBreakdown || [];

                if (!statusModalRow.isGrouped && arrearItems.length > 0) {
                  arrearItems.forEach((item) => {
                    const name = item.eventName || item.title || item.eventCategory || "Previous Event";
                    const amt = Number(item.dueAmount || item.amount || item.due || 0);
                    if (amt > 0) {
                      eventBreakdownItems.push(`${name}: ${formatWholeCurrency(amt)}`);
                    }
                  });
                } else if (!statusModalRow.isGrouped && prevArrears > 0 && actualReceivedAmt > currentEvAmt) {
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
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                          Member / Contributor
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem", color: "text.primary" }}>
                          {statusModalRow.memberName || "Contributor"}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                          Event Name
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: "0.85rem" }}>
                          {primaryEvName}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                          Event Type
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem", color: "text.primary" }}>
                          {resolvedEventType}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                          Payment Date
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem", color: "text.primary" }}>
                          {dateDisplay}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600, mb: 0.5 }}>
                          Payment Method
                        </Typography>
                        <Box sx={{ mt: 0.2 }}>
                          {isSplitPayment && splitsList.length > 0 ? (
                            <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Chip
                                label="Split"
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                  bgcolor: "rgba(99, 102, 241, 0.15)",
                                  color: "#6366f1",
                                  border: "1px solid rgba(99, 102, 241, 0.35)",
                                }}
                              />
                              {splitsList.map((split, idx) => {
                                const modeColor = getModeColor(split.mode);
                                const labelText = split.amount > 0
                                  ? `${split.mode}: ${formatWholeCurrency(split.amount)}`
                                  : split.mode;
                                return (
                                  <Chip
                                    key={idx}
                                    label={labelText}
                                    size="small"
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                      bgcolor: `${modeColor}18`,
                                      color: modeColor,
                                      border: `1px solid ${modeColor}40`,
                                    }}
                                  />
                                );
                              })}
                            </Stack>
                          ) : (
                            <Chip
                              label={singleMethodName}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.78rem",
                                bgcolor: `${getModeColor(singleMethodName)}18`,
                                color: getModeColor(singleMethodName),
                                border: `1px solid ${getModeColor(singleMethodName)}40`,
                              }}
                            />
                          )}
                        </Box>
                      </Grid>

                      {hasCashComponent && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                            Cash Handover Note
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: "0.85rem", mt: 0.4 }}>
                            {cashHandoverNote}
                          </Typography>
                        </Grid>
                      )}

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
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
                              mt: 0.2,
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

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                          Ref / UTR Number
                        </Typography>
                        {splitUtrs.length > 1 ? (
                          <Box sx={{ mt: 0.3, display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {splitUtrs.map((item, idx) => {
                              const itemColor = getModeColor(item.mode);
                              return (
                                <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: itemColor, minWidth: 62, fontSize: "0.75rem" }}>
                                    {item.mode}:
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight={800}
                                    color="text.primary"
                                    sx={{ fontSize: "0.82rem", fontFamily: "monospace", letterSpacing: "0.03em" }}
                                  >
                                    {item.utr}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        ) : splitUtrs.length === 1 ? (
                          <Box sx={{ mt: 0.3, display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: getModeColor(splitUtrs[0].mode), fontSize: "0.75rem" }}>
                              {splitUtrs[0].mode}:
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              color="text.primary"
                              sx={{ fontSize: "0.85rem", letterSpacing: "0.02em", wordBreak: "break-all" }}
                            >
                              {splitUtrs[0].utr}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" fontWeight={800} color={utrVal && utrVal !== "--" && utrVal.toUpperCase() !== "SPLIT" && utrVal.toUpperCase() !== "CASH" ? "text.primary" : "text.secondary"} sx={{ fontSize: "0.85rem", mt: 0.3 }}>
                            {utrVal && utrVal !== "--" && utrVal.toUpperCase() !== "SPLIT" && utrVal.toUpperCase() !== "CASH" ? utrVal : "--"}
                          </Typography>
                        )}
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 600 }}>
                          Submitted By
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.85rem", mt: 0.2 }}>
                          {createdByVal}
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
                onChange={(e) => {
                  setAuditRemarks(e.target.value);
                  if (auditRemarksError) setAuditRemarksError("");
                }}
                rows={3}
                required
                error={Boolean(auditRemarksError)}
                helperText={auditRemarksError || ""}
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
          } catch { }
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
