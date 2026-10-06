import React, { useEffect, useState, useMemo } from "react";
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
} from "@mui/icons-material";
import SubmitPaymentModal from "../../components/payments/SubmitPaymentModal";
import AppTextArea from "../../components/common/AppTextArea";

import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import { getContributionsAsync, getContributionsByEventAsync, recordPaymentAsync } from "../../services/contributionService";
import { getEventsAsync } from "../../services/eventService";
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
  const [statusChangeValue, setStatusChangeValue] = useState("Paid");
  const [auditRemarks, setAuditRemarks] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [dbStatuses, setDbStatuses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [verifiedKeys, setVerifiedKeys] = useState(() => new Set());
  const [previewImageSrc, setPreviewImageSrc] = useState(null);

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [filterEventId, setFilterEventId] = useState("");
  const [contributions, setContributions] = useState([]);
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

  const getMemberEventAmount = (c, activeEv) => {
    const directAmt = Number(c?.amount || 0);
    if (directAmt > 0) return directAmt;
    if (!activeEv) return 0;
    const base = Number(activeEv.baseAmount || activeEv.totalExpectedAmount || 0);
    const count = Number(activeEv.participantCount || (activeEv.participants && activeEv.participants.length) || 0);
    if (count > 0 && base > 0) {
      return Math.round(base / count);
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
    return s1 === s2 || s1.startsWith(s2) || s2.startsWith(s1);
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

      // Event match: MUST strictly match Event ID or Event Name (NEVER cross-match across different events!)
      const tEventId = t.eventId;
      const tEventName = t.eventName;
      const idMatch = isSameText(targetEventId, tEventId);
      const nameMatch = isMatchingEventName(targetEventName, tEventName);
      return idMatch || nameMatch;
    }) || null;
  };

  const hasContributionPayment = (c, tx = null) => {
    if (!c) return false;
    const matchedTx = tx !== null ? tx : findContributionTransaction(c);

    // Direct contribution payment indicators
    const mode = String(c.paymentMode || "").trim().toLowerCase();
    const hasValidMode = Boolean(mode && mode !== "none" && mode !== "-");
    const hasDate = Boolean(c.paymentDate);
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

    // CRITICAL: A member who has NOT paid can NEVER be shown as Verified!
    if (!hasContributionPayment(c, matchedTx)) {
      return false;
    }

    const key = `${c.memberId}_${c.eventId}`;
    const txStatus = String(matchedTx?.status || "").trim().toLowerCase();
    const rawStatus = String(c.statusName || c.paymentStatus || c.status || "").trim().toLowerCase();

    return Boolean(
      verifiedKeys.has(key) ||
      c.isVerified === true ||
      (c.verifiedBy && String(c.verifiedBy).trim() !== "") ||
      (matchedTx?.verifiedBy && String(matchedTx.verifiedBy).trim() !== "") ||
      txStatus === "verified" ||
      rawStatus === "verified"
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

  const handleOpenSubmitPaymentModal = (row) => {
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
      amount: totalDue > 0 ? totalDue : (resolvedEvAmt > 0 ? resolvedEvAmt : 0),
      currentEventDue: currentEvDue,
      previousArrears: prevArrears,
      totalDue: totalDue,
      isSubmitted: submitted,
      paymentStatus: isPaidRow ? "Paid" : (row?.paymentStatus || "Pending"),
      arrearBreakdown: prevArrears === 0 ? [] : (row?.previousUnpaidItems || []),
    });
    setSubmitPaymentModalOpen(true);
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        const [mems, rls, data, modes] = await Promise.all([
          getMembersAsync(),
          getRolesAsync(),
          getEventsAsync(),
          getPaymentModesAsync(true).catch(() => []),
        ]);
        setMembers(mems);
        setRoles(rls);
        setEvents(data);
        setPaymentModes(Array.isArray(modes) ? modes : []);
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
          const [stRes, txRes] = await Promise.all([
            getStatusesAsync().catch(() => []),
            getPaymentTransactionsAsync().catch(() => []),
          ]);
          if (Array.isArray(stRes)) setDbStatuses(stRes);
          if (Array.isArray(txRes)) setTransactions(txRes);
        } catch {
          // fallback
        }
      } catch {
        toast.error("Failed to load events and contributions data.");
      }
    }

    loadEvents();
  }, []);

  const reloadAllContributions = async () => {
    try {
      const allData = await getContributionsAsync();
      const list = Array.isArray(allData) ? allData : [];
      setAllContributions(list);
      return list;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const handleUpdate = async () => {
      try {
        const txRes = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes)) setTransactions(txRes);
      } catch {}
      reloadAllContributions();
    };
    window.addEventListener("contribution_updated", handleUpdate);
    return () => window.removeEventListener("contribution_updated", handleUpdate);
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setContributions([]);
      return;
    }

    async function loadContributions() {
      try {
        const data = await getContributionsByEventAsync(selectedEventId);
        const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(selectedEventId));

        let enrichedData = data.map(c => {
          const resolvedAmount = getMemberEventAmount(c, activeEv);
          const currentContribution = {
            ...c,
            amount: resolvedAmount > 0 ? resolvedAmount : Number(c.amount || 0),
          };

          // Calculate Arrears: sum of unpaid contributions for this member in other events
          const previousUnpaidItems = allContributions.filter(
            prev =>
              prev.memberId === c.memberId &&
              prev.eventId !== c.eventId &&
              !isContributionPaid(prev)
          );
          const matchedTx = findContributionTransaction(c, transactions, selectedEventId);
          const scope = String(c.paymentScope || c.scope || matchedTx?.notes || "").toLowerCase();
          const clearsArrears = scope.includes("alloutstanding") || scope.includes("all outstanding") || scope.includes("scope: all") || scope.includes("arrear") || (!c.paymentScope && (hasSubmittedPayment(c) || isContributionPaid(c)));
          const isArrearsCleared = (hasSubmittedPayment(c) || isContributionPaid(c)) && clearsArrears;

          const rawPreviousUnpaid = previousUnpaidItems.reduce((sum, prev) => {
            const prevEv = (events || []).find((e) => String(e.eventId || e.id) === String(prev.eventId));
            const prevAmt = getMemberEventAmount(prev, prevEv);
            return sum + (prevAmt > 0 ? prevAmt : (Number(prev.amount) || 0));
          }, 0);
          const previousUnpaid = isArrearsCleared ? 0 : rawPreviousUnpaid;
          const currentOutstanding = getContributionOutstanding(currentContribution, activeEv);

          return {
            ...currentContribution,
            previousUnpaid,
            previousUnpaidItems: isArrearsCleared ? [] : previousUnpaidItems,
            totalAccumulated: currentOutstanding + previousUnpaid
          };
        });

        if (isMemberRole) {
          const userEmail = String(authState?.email || "").toLowerCase().trim();
          const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;
          enrichedData = enrichedData.filter(c =>
            (currentMemberId && String(c.memberId).toLowerCase() === currentMemberId) ||
            (userEmail && String(c.email || c.memberEmail || "").toLowerCase().trim() === userEmail) ||
            (authState?.user?.fullName && String(c.memberName || "").toLowerCase().trim() === String(authState.user.fullName).toLowerCase().trim())
          );
        }

        setContributions(enrichedData);
      } catch (error) {
        toast.error("Failed to load contributions.");
      }
    }

    loadContributions();
  }, [selectedEventId, allContributions, events, transactions]);

  useEffect(() => {
    const handleContributionUpdated = async () => {
      try {
        const txRes = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes)) setTransactions(txRes);
      } catch {}
      await reloadAllContributions();
    };

    window.addEventListener("contribution_updated", handleContributionUpdated);
    return () => window.removeEventListener("contribution_updated", handleContributionUpdated);
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

      const eventData = await getContributionsByEventAsync(selectedEventId);
      let enriched = eventData.map(c => {
        const previousUnpaidItems = allData.filter(
          prev =>
            prev.memberId === c.memberId &&
            prev.eventId !== c.eventId &&
            !isContributionPaid(prev)
        );
        const previousUnpaid = previousUnpaidItems.reduce((sum, prev) => sum + (Number(prev.amount) || 0), 0);
        const currentOutstanding = getContributionOutstanding(c);
        const isPaid = isContributionPaid(c);

        return {
          ...c,
          previousUnpaid,
          previousUnpaidItems,
          totalAccumulated: isPaid ? previousUnpaid : (currentOutstanding + previousUnpaid)
        };
      });

      if (isMemberRole) {
        const userEmail = String(authState?.email || "").toLowerCase().trim();
        const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;
        enriched = enriched.filter(c =>
          (currentMemberId && String(c.memberId).toLowerCase() === currentMemberId) ||
          (userEmail && String(c.email || c.memberEmail || "").toLowerCase().trim() === userEmail) ||
          (authState?.user?.fullName && String(c.memberName || "").toLowerCase().trim() === String(authState.user.fullName).toLowerCase().trim())
        );
      }

      setContributions(enriched);
    } catch (error) {
      const apiErrorMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(" ") : null) ||
        error.response?.data?.title ||
        TOAST_MESSAGES.GENERAL.SAVE_FAILED;
      toast.error(apiErrorMsg);
    }
  }

  const eventOptions = useMemo(() => {
    return events.map((e) => {
      const dateStr = e.eventDate ? dayjs(e.eventDate).format("DD/MM/YYYY") : "";
      return {
        label: dateStr ? `${e.eventName || "Unnamed Event"} (${dateStr})` : (e.eventName || "Unnamed Event"),
        value: e.eventId,
      };
    });
  }, [events]);

  const modalStatusOptions = useMemo(() => {
    const set = new Set();
    const list = [];
    (dbStatuses || [])
      .filter((s) => s.isActive !== false)
      .forEach((s) => {
        const name = s.statusName || s.name || s.status_name;
        if (name && !set.has(name.toLowerCase())) {
          set.add(name.toLowerCase());
          list.push({ label: name, value: name });
        }
      });
    if (list.length === 0) {
      return [
        { label: "Paid", value: "Paid" },
        { label: "Pending", value: "Pending" },
        { label: "Verified", value: "Verified" },
        { label: "Rejected", value: "Rejected" },
        { label: "Closed", value: "Closed" },
      ];
    }
    if (!set.has("paid")) list.unshift({ label: "Paid", value: "Paid" });
    if (!set.has("pending")) list.push({ label: "Pending", value: "Pending" });
    return list;
  }, [dbStatuses]);

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

    const verifier = authState?.fullName || authState?.username || authState?.user?.name || authState?.user?.username || "Admin";
    const noteText = customNotes !== undefined
      ? customNotes
      : (auditRemarks || `Status updated to ${newStatus} by ${verifier}.`);

    const targetKey = `${target.memberId}_${target.eventId}`;
    setVerifiedKeys((prev) => new Set(prev).add(targetKey));

    const isMarkingPaid = ["paid", "verified", "closed", "completed"].includes(String(newStatus).toLowerCase());

    // Optimistically update the current table row immediately
    setContributions((prev) =>
      prev.map((c) => {
        if (
          (target.contributionId && c.contributionId === target.contributionId) ||
          (String(c.memberId).toLowerCase() === String(target.memberId).toLowerCase() &&
            String(c.eventId).toLowerCase() === String(target.eventId).toLowerCase())
        ) {
          const updatedStatus = isMarkingPaid ? "Paid" : newStatus;
          const isPaid = isMarkingPaid;
          const arrears = c.previousUnpaid || 0;
          return {
            ...c,
            paymentStatus: updatedStatus,
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

      const matchedTxn = findContributionTransaction(target);

      if (matchedTxn && (matchedTxn.transactionId || matchedTxn.id)) {
        await verifyPaymentTransactionAsync(matchedTxn.transactionId || matchedTxn.id, {
          status: newStatus,
          verifiedBy: verifier,
          notes: noteText,
        });
      } else if (isMarkingPaid) {
        await recordPaymentAsync({
          eventId: target.eventId,
          memberId: target.memberId,
          amount: Number(target.amount || target.totalAccumulated || 0),
          paymentMode: target.paymentMode && target.paymentMode !== "None" ? target.paymentMode : "Cash",
          paymentDate: new Date().toISOString(),
          notes: noteText,
        });
      } else {
        await createPaymentTransactionAsync({
          eventId: target.eventId,
          userId: target.memberId,
          memberName: target.memberName,
          eventName: target.eventName || events.find((e) => e.eventId === target.eventId)?.eventName || "Contribution",
          amount: Number(target.amount || target.totalAccumulated || 0),
          paymentMode: target.paymentMode && target.paymentMode !== "None" ? target.paymentMode : "Cash",
          status: newStatus,
          notes: noteText,
          paymentDate: new Date().toISOString(),
        });
      }

      toast.success(`Contribution status updated to ${newStatus} successfully!`);
      if (addNotification) {
        addNotification({
          type: "PAYMENT_STATUS_UPDATED",
          title: "Contribution Status Updated",
          message: `${target.memberName}'s contribution status updated to ${newStatus}.`,
          link: "/contributions",
        });
      }

      window.dispatchEvent(
        new CustomEvent("contribution_updated", {
          detail: { action: "verify", status: newStatus, target },
        })
      );

      setStatusModalOpen(false);
      setStatusModalRow(null);
      setAuditRemarks("");

      try {
        const txRes = await getPaymentTransactionsAsync();
        if (Array.isArray(txRes)) setTransactions(txRes);
      } catch {}

      const freshAll = await reloadAllContributions();
      if (selectedEventId) {
        const freshData = await getContributionsByEventAsync(selectedEventId);
        const allList = (freshAll && freshAll.length > 0) ? freshAll : (allContributions || []);
        let enriched = freshData.map((c) => {
          const previousUnpaidItems = allList.filter(
            (prev) => prev.memberId === c.memberId && prev.eventId !== c.eventId && !isContributionPaid(prev)
          );
          const scope = String(c.paymentScope || c.scope || "").toLowerCase();
          const clearsArrears = scope === "alloutstanding" || scope === "previousarrears" || scope.includes("all") || scope.includes("arrear");
          const isArrearsCleared = hasSubmittedPayment(c) && (clearsArrears || !c.paymentScope);

          const rawPreviousUnpaid = previousUnpaidItems.reduce((sum, prev) => sum + (Number(prev.amount) || 0), 0);
          const previousUnpaid = isArrearsCleared ? 0 : rawPreviousUnpaid;
          const currentOutstanding = getContributionOutstanding(c);

          return {
            ...c,
            previousUnpaid,
            previousUnpaidItems: isArrearsCleared ? [] : previousUnpaidItems,
            totalAccumulated: currentOutstanding + previousUnpaid,
          };
        });

        if (isMemberRole) {
          const userEmail = String(authState?.email || "").toLowerCase().trim();
          const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;
          enriched = enriched.filter(c =>
            (currentMemberId && String(c.memberId).toLowerCase() === currentMemberId) ||
            (userEmail && String(c.email || c.memberEmail || "").toLowerCase().trim() === userEmail) ||
            (authState?.user?.fullName && String(c.memberName || "").toLowerCase().trim() === String(authState.user.fullName).toLowerCase().trim())
          );
        }

        setContributions(enriched);
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
        const isPaidRow = isContributionPaid(row) || String(row?.paymentStatus || row?.status || "").toLowerCase() === "paid";
        return (
          <Box sx={{ display: "flex", gap: 0.6, alignItems: "center" }}>
            {canAddContribution && (
              <Tooltip title={isPaidRow ? "Payment Fully Cleared (Settled)" : "Submit Payment Details"}>
                <IconButton
                  size="small"
                  onClick={() => handleOpenSubmitPaymentModal(row)}
                  sx={{
                    p: 0.4,
                    color: isPaidRow ? "#16a34a" : "#4a3f6b",
                    bgcolor: isPaidRow ? "rgba(22, 163, 74, 0.12)" : "rgba(74, 63, 107, 0.08)",
                    borderRadius: "6px",
                    "&:hover": {
                      bgcolor: isPaidRow ? "rgba(22, 163, 74, 0.22)" : "rgba(74, 63, 107, 0.18)",
                      color: isPaidRow ? "#15803d" : "#3b325c",
                    },
                  }}
                >
                  <PaymentIcon sx={{ fontSize: "1.15rem" }} />
                </IconButton>
              </Tooltip>
            )}

            {canUpdateContribution && (
              <Tooltip title="Authority Status Update">
                <IconButton
                  size="small"
                  onClick={() => {
                    setStatusModalRow(row);
                    setStatusChangeValue(row.paymentStatus || "Paid");
                    setAuditRemarks("");
                    setStatusModalOpen(true);
                  }}
                  sx={{
                    p: 0.4,
                    color: "#16a34a",
                    bgcolor: "rgba(22, 163, 74, 0.08)",
                    borderRadius: "6px",
                    "&:hover": {
                      bgcolor: "rgba(22, 163, 74, 0.18)",
                      color: "#15803d",
                    },
                  }}
                >
                  <StatusUpdateIcon sx={{ fontSize: "1.15rem" }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Raise Support Ticket Icon */}
            {canRaiseSupportTicket && (
              <Tooltip title="Raise Support Ticket">
                <IconButton
                  size="small"
                  onClick={() => {
                    const activeEvent = events.find((e) => String(e.eventId) === String(row.eventId || selectedEventId));
                    navigate("/support-tickets", {
                      state: {
                        raiseTicket: true,
                        memberName: row.memberName,
                        memberId: row.memberId,
                        eventId: row.eventId || selectedEventId,
                        relatedEvent: row.eventName || activeEvent?.eventName || activeEvent?.title || "",
                        eventType: row.categoryName || activeEvent?.eventTypeName || activeEvent?.categoryName || activeEvent?.eventType || "",
                        amount: row.amount || row.totalAccumulated,
                        paymentMode: row.paymentMode,
                        status: row.paymentStatus,
                        contributionId: row.contributionId,
                      },
                    });
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

            {/* Verify Support Ticket Icon */}
            {canVerifySupportTicket && (
              <Tooltip title="Verify Support Ticket">
                <IconButton
                  size="small"
                  onClick={() => {
                    const activeEvent = events.find((e) => String(e.eventId) === String(row.eventId || selectedEventId));
                    navigate("/support-tickets", {
                      state: {
                        verifyTicket: true,
                        memberName: row.memberName,
                        relatedEvent: row.eventName || activeEvent?.eventName || activeEvent?.title || "",
                        contributionId: row.contributionId,
                      },
                    });
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
            )}
          </Box>
        );
      },
    },
    { label: "Member", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    {
      label: "Status",
      key: "paymentStatus",
      render: (row) => {
        const matchedTx = findContributionTransaction(row);
        const isVerified = isContributionVerified(row, matchedTx);

        let displayStatus = "Pending";
        if (isVerified) {
          displayStatus = "Verified";
        }

        const color = isVerified ? "#16a34a" : "#b45309";
        const bg = isVerified ? "rgba(22,163,74,0.08)" : "rgba(234,179,8,0.12)";

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
      label: "Amount",
      key: "amount",
      align: "right",
      render: (row) => {
        const isPaid = isContributionPaid(row) || hasSubmittedPayment(row);
        const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(row.eventId || selectedEventId));
        const eventAmount = getMemberEventAmount(row, activeEv);
        const displayAmount = isPaid ? 0 : eventAmount;

        return (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8, justifyContent: "flex-end" }}>
            <Typography
              variant="body2"
              fontWeight={700}
              color={isPaid ? "success.main" : "inherit"}
            >
              ₹{displayAmount.toLocaleString()}
            </Typography>
            {isPaid && (
              <Chip
                label="Paid"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  bgcolor: "rgba(22, 163, 74, 0.12)",
                  color: "#16a34a",
                  border: "1px solid rgba(22, 163, 74, 0.3)",
                }}
              />
            )}
          </Box>
        );
      }
    },
    {
      label: "Arrears",
      key: "previousUnpaid",
      align: "right",
      render: (row) => {
        const isPaid = isContributionPaid(row);
        const submitted = hasSubmittedPayment(row);
        const displayArrears = (isPaid || submitted) ? 0 : (row.previousUnpaid || 0);
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
                <span style={{ fontWeight: 800, color: "#fff" }}>₹{Number(item.amount || 0).toLocaleString()}</span>
              </Box>
            ))}
            <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", mt: 0.5, pt: 0.3, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.75rem", color: "#fca5a5" }}>
              <span>Total Arrears:</span>
              <span>₹{displayArrears.toLocaleString()}</span>
            </Box>
          </Box>
        ) : (displayArrears > 0 ? `Total Arrears: ₹${displayArrears.toLocaleString()}` : "No previous arrears");

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
              ₹{displayArrears.toLocaleString()}
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
        const isPaid = isContributionPaid(row);
        const submitted = hasSubmittedPayment(row);
        const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(row.eventId || selectedEventId));
        const currentDue = (isPaid || submitted) ? 0 : getContributionOutstanding(row, activeEv);
        const prevArrears = (isPaid || submitted) ? 0 : (row.previousUnpaid || 0);
        const due = currentDue + prevArrears;
        return (
          <Typography
            variant="body2"
            fontWeight={900}
            color={due > 0 ? (theme.palette.mode === "dark" ? "#ffffff" : "primary.main") : "text.secondary"}
          >
            ₹{due.toLocaleString()}
          </Typography>
        );
      }
    },
    {
      label: "Mode",
      key: "paymentMode",
      render: (row) => {
        const matchedTx = findContributionTransaction(row);
        const resolvedMode = (row.paymentMode && row.paymentMode !== "None" && row.paymentMode !== "-") ? row.paymentMode : (matchedTx?.paymentMode || "-");
        const isSplit = resolvedMode === "Split" || String(resolvedMode).toLowerCase().includes("split");

        if (isSplit) {
          const cashAmount = row.cashAmount || matchedTx?.cashAmount;
          const upiAmount = row.upiAmount || matchedTx?.upiAmount;
          const cashInfo = cashAmount ? `₹${Number(cashAmount).toLocaleString()} Cash` : "";
          const upiInfo = upiAmount ? `₹${Number(upiAmount).toLocaleString()} UPI` : "";
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
              <Box sx={{ minWidth: 220 }}>
                <AppSelect
                  label="Selected Event"
                  placeholder="Select an event"
                  value={filterEventId}
                  onChange={(event) => {
                    const val = event.target.value;
                    setFilterEventId(val);
                    setSelectedEventId(val);
                  }}
                  options={eventOptions}
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setSelectedEventId(filterEventId);
                }}
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
                onClick={() => {
                  if (events.length > 0) {
                    const firstEventId = events[0].eventId;
                    setFilterEventId(firstEventId);
                    setSelectedEventId(firstEventId);
                    toast.success("Filter cleared");
                  }
                }}
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
                    bgcolor: "rgba(239, 68, 68, 0.05)"
                  }
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
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
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
            </AppButton>
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
                    ₹{(payment.currentEventDue || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Previous Arrears</Typography>
                  <Typography variant="body2" fontWeight={800} color={payment.previousArrears > 0 ? "error.main" : "text.secondary"}>
                    ₹{(payment.previousArrears || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Total Due</Typography>
                  <Typography variant="body2" fontWeight={900} color="primary.main">
                    ₹{(payment.totalDue || 0).toLocaleString()}
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
                ...(payment.currentEventDue > 0 ? [{ label: `Current Event Only (₹${payment.currentEventDue.toLocaleString()})`, value: "CurrentEvent" }] : []),
                ...(payment.previousArrears > 0 ? [{ label: `Previous Arrears Only (₹${payment.previousArrears.toLocaleString()})`, value: "PreviousArrears" }] : []),
                ...((payment.currentEventDue > 0 && payment.previousArrears > 0) ? [{ label: `All Outstanding (₹${payment.totalDue.toLocaleString()})`, value: "AllOutstanding" }] : []),
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
                        ✓ Balanced: ₹{c.toLocaleString()} (Cash) + ₹{u.toLocaleString()} (UPI) = ₹{tot.toLocaleString()}
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
                        ⚠️ Split total is ₹{sum.toLocaleString()} (Diff: {diff > 0 ? `₹${diff.toLocaleString()} remaining` : `₹${Math.abs(diff).toLocaleString()} over`}).
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                        The sum of Cash + UPI must equal the Total Amount (₹{tot.toLocaleString()}).
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

            let qrSrc = "";
            if (qrConfig.qrMode === "uploaded" && qrConfig.qrImage) {
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
                  border: "1px solid rgba(2, 132, 199, 0.2)",
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" fontWeight={800} sx={{ color: "#0284c7", display: "block", mb: 0.8 }}>
                  {isSplitMode
                    ? `Dynamic UPI QR (Split UPI Portion: ₹${targetAmount.toLocaleString("en-IN")})`
                    : `Dynamic UPI Payment QR (₹${targetAmount.toLocaleString("en-IN")})`}
                </Typography>
                <Box
                  component="img"
                  src={qrSrc}
                  alt="UPI QR Code"
                  sx={{
                    width: 130,
                    height: 130,
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                    p: 0.6,
                    bgcolor: "#ffffff",
                    borderRadius: "10px",
                    border: "1.5px solid #0284c7",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.12)",
                  }}
                />
                {qrConfig.upiId && (
                  <Typography variant="caption" fontWeight={700} sx={{ color: "#0284c7", fontSize: "0.72rem", mt: 0.5, display: "block" }}>
                    UPI ID: {qrConfig.upiId} {qrConfig.receiverName ? `(${qrConfig.receiverName})` : ""}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.4, display: "block" }}>
                  {isSplitMode
                    ? `Scan with any UPI app to pay ₹${targetAmount.toLocaleString("en-IN")} online. Collect ₹${Number(payment.cashAmount || 0).toLocaleString("en-IN")} in cash.`
                    : `Scan with any UPI app to pay ₹${targetAmount.toLocaleString("en-IN")} directly.`}
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
          try {
            const txRes = await getPaymentTransactionsAsync();
            if (Array.isArray(txRes)) setTransactions(txRes);
          } catch {}
          const freshAll = await reloadAllContributions();
          if (selectedEventId) {
            const freshData = await getContributionsByEventAsync(selectedEventId);
            const activeEv = (events || []).find((e) => String(e.eventId || e.id) === String(selectedEventId));
            const allList = (freshAll && freshAll.length > 0) ? freshAll : [];
            let enriched = freshData.map((c) => {
              const resolvedAmount = getMemberEventAmount(c, activeEv);
              const currentContribution = {
                ...c,
                amount: resolvedAmount > 0 ? resolvedAmount : Number(c.amount || 0),
              };
              const isSubmitted = hasSubmittedPayment(c);
              const isPaid = isContributionPaid(c);
              const isCleared = isSubmitted || isPaid;

              const previousUnpaidItems = isCleared ? [] : allList.filter(
                (prev) => prev.memberId === c.memberId && prev.eventId !== c.eventId && !isContributionPaid(prev)
              );
              const previousUnpaid = isCleared ? 0 : previousUnpaidItems.reduce((sum, prev) => {
                const prevEv = (events || []).find((e) => String(e.eventId || e.id) === String(prev.eventId));
                const prevAmt = getMemberEventAmount(prev, prevEv);
                return sum + (prevAmt > 0 ? prevAmt : (Number(prev.amount) || 0));
              }, 0);
              const currentOutstanding = isCleared ? 0 : getContributionOutstanding(currentContribution, activeEv);
              return {
                ...currentContribution,
                previousUnpaid,
                previousUnpaidItems,
                totalAccumulated: isCleared ? 0 : (currentOutstanding + previousUnpaid),
              };
            });
            if (isMemberRole) {
              const userEmail = String(authState?.email || "").toLowerCase().trim();
              const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;
              enriched = enriched.filter(c =>
                (currentMemberId && String(c.memberId).toLowerCase() === currentMemberId) ||
                (userEmail && String(c.email || c.memberEmail || "").toLowerCase().trim() === userEmail) ||
                (authState?.user?.fullName && String(c.memberName || "").toLowerCase().trim() === String(authState.user.fullName).toLowerCase().trim())
              );
            }
            setContributions(enriched);
          }
        }}
      />

      {/* ── Authority Status Update Modal (From Support Status Master) ── */}
      <AppDialog
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setStatusModalRow(null);
          setAuditRemarks("");
        }}
        title="Authority Status Update"
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton variant="outlined" onClick={() => setStatusModalOpen(false)}>
              Close
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              loading={statusSaving}
              onClick={() =>
                handleStatusUpdate(
                  statusModalRow,
                  statusChangeValue || statusModalRow?.paymentStatus,
                  auditRemarks
                )
              }
              sx={{
                bgcolor:
                  (statusChangeValue || statusModalRow?.paymentStatus) === "Closed" ||
                    (statusChangeValue || statusModalRow?.paymentStatus) === "Paid"
                    ? "#16a34a !important"
                    : (statusChangeValue || statusModalRow?.paymentStatus) === "Verified"
                      ? "#0284c7 !important"
                      : undefined,
              }}
            >
              Save
            </AppButton>
          </Stack>
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
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="primary.main"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.72rem" }}
                >
                  Authority Status Update • {statusModalRow.memberName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
                  Event: <strong>{statusModalRow.eventName || events.find((e) => e.eventId === statusModalRow.eventId)?.eventName || "Current Event"}</strong> • Amount: <strong>₹{Number(statusModalRow.amount || 0).toLocaleString("en-IN")}</strong>
                </Typography>
              </Box>

              {/* Submitted Payment Details Summary Card */}
              {(() => {
                const matchedTx = findContributionTransaction(statusModalRow);
                const paidAmt = Number(statusModalRow?.amount || statusModalRow?.paidAmount || matchedTx?.amount || 0);
                const modeStr = statusModalRow?.paymentMode || matchedTx?.paymentMode || "Cash";
                const utrVal = statusModalRow?.utrNumber || statusModalRow?.referenceNo || statusModalRow?.utr || matchedTx?.utr || matchedTx?.transactionRef || matchedTx?.referenceNo || "--";
                const dateVal = statusModalRow?.paymentDate || matchedTx?.paymentDate || matchedTx?.createdOn;
                const dateDisplay = dateVal ? dayjs(dateVal).format("DD/MM/YYYY hh:mm A") : "Today";
                const scopeVal = statusModalRow?.paymentScope || matchedTx?.paymentScope || (paidAmt > 100 ? "All Outstanding" : "Current Event");
                const notesVal = statusModalRow?.notes || matchedTx?.notes || "";
                const createdByVal = statusModalRow?.createdBy || statusModalRow?.recordedBy || matchedTx?.createdBy || matchedTx?.memberName || "Member";
                const cashAmt = matchedTx?.cashAmount || statusModalRow?.cashAmount;
                const upiAmt = matchedTx?.upiAmount || statusModalRow?.upiAmount;
                const rawImgs = statusModalRow?.screenshots || matchedTx?.screenshots || statusModalRow?.screenshot || matchedTx?.screenshot;
                const proofImgs = Array.isArray(rawImgs) ? rawImgs : (rawImgs ? [rawImgs] : []);

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
                          Total Received Amount
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={900} color="success.main" sx={{ fontSize: "1rem" }}>
                          ₹{paidAmt.toLocaleString("en-IN")}
                        </Typography>
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
                            bgcolor: modeStr.toLowerCase().includes("cash") ? "rgba(22,163,74,0.1)" : "rgba(37,99,235,0.1)",
                            color: modeStr.toLowerCase().includes("cash") ? "#16a34a" : "#2563eb",
                            mt: 0.2,
                          }}
                        />
                        {(cashAmt > 0 || upiAmt > 0) && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", mt: 0.4 }}>
                            Cash: ₹{Number(cashAmt || 0).toLocaleString()} | UPI: ₹{Number(upiAmt || 0).toLocaleString()}
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
                          {statusModalRow.memberName} {createdByVal && createdByVal !== statusModalRow.memberName ? `(Recorded by ${createdByVal})` : ""}
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
                    label="Select Status *"
                    value={statusChangeValue || statusModalRow?.paymentStatus || "Paid"}
                    onChange={(e) => setStatusChangeValue(e.target.value)}
                    options={modalStatusOptions}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Status Preview
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {renderStatusBadge(statusChangeValue || statusModalRow?.paymentStatus)}
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
    </div>
  );
}
