import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  InputAdornment,
} from "@mui/material";
import {
  ReceiptLong as ReceiptIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  QrCode2 as QrCodeIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Add as AddIcon,
  CallSplit as SplitIcon,
  RestartAlt as ResetIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import {
  getPaymentQrConfig,
  generateDynamicPaymentQr,
} from "../../utils/upiQrHelper";
import {
  roundToWhole,
  formatWholeCurrency,
  formatWholeNumber,
  distributeEqualSplit,
} from "../../utils/roundingHelper";

import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppTextArea from "../common/AppTextArea";
import AppButton, { AppCancelButton, AppSaveButton } from "../common/AppButton";
import AppDialog from "../common/AppDialog";
import AppConfirmDialog from "../common/AppConfirmDialog";
import { useAppToast } from "../common/AppToast";
import { useNotifications } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  submitPaymentProofAsync,
  getPaymentContextAsync,
} from "../../services/paymentService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync, isEventPublished } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getPaymentModesAsync } from "../../services/paymentModeService";

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

const matchedEventCategory = (ev) => {
  if (!ev) return "";
  return ev.eventTypeName || ev.categoryName || ev.eventType || ev.category || "";
};

const EMPTY_ARRAY = Object.freeze([]);

export default function SubmitPaymentModal({
  open,
  onClose,
  onSuccess,
  initialEventId = "",
  initialEventName = "",
  initialEventCategory = "",
  initialMemberId = "",
  initialMemberName = "",
  initialAmount = "",
  initialCurrentDue,
  initialPreviousArrears,
  initialTotalDue,
  initialIsSubmitted,
  initialStatus,
  initialArrearBreakdown = EMPTY_ARRAY,
  initialPaymentScope = "",
  initialAllMemberEvents = EMPTY_ARRAY,
  isAllEventsFilter = false,
}) {
  const toast = useAppToast();
  const { authState } = useAuth();
  const { addNotification } = useNotifications();

  const isAuthorityRole = [
    "admin",
    "superadmin",
    "organizer",
    "treasurer",
    "president",
    "secretary",
    "committee",
  ].includes(String(authState?.role || authState?.user?.role || "").toLowerCase());

  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [dbPaymentModes, setDbPaymentModes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    eventId: initialEventId || "",
    memberId: initialMemberId || "",
    eventCategory: initialEventCategory || "",
    eventName: initialEventName || "",
    memberName: initialMemberName || authState?.fullName || "",
    amount: "",
    paymentMode: "",
    utr: "",
    paymentDate: dayjs(),
    notes: "",
    screenshot: "",
    screenshots: [],
  });

  const [errors, setErrors] = useState({});
  const [duesSummary, setDuesSummary] = useState(null);
  const [paymentScope, setPaymentScope] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Dynamic payment modes loaded from DB/API
  const dynamicPaymentModes = useMemo(() => {
    const list = [];
    const set = new Set();

    // Directly use modes fetched from the database table public.payment_modes
    (dbPaymentModes || [])
      .filter((m) => m.isActive !== false)
      .forEach((m) => {
        const name = m.paymentModeName || m.name || m.modeName;
        const lower = String(name || "").trim().toLowerCase();
        if (name && !set.has(lower) && !["upi", "online", "none"].includes(lower)) {
          set.add(lower);
          list.push({
            label: name,
            value: name,
            paymentModeId: m.paymentModeId,
            color: getModeColor(name),
          });
        }
      });

    // Fallback only if database list is empty
    if (list.length === 0) {
      const defaultModes = [
        { label: "Gpay", value: "Gpay", color: "#2563eb" },
        { label: "Cash", value: "Cash", color: "#16a34a" },
        { label: "Phonepe", value: "Phonepe", color: "#7c3aed" },
      ];
      defaultModes.forEach((d) => {
        if (!set.has(d.value.toLowerCase())) {
          set.add(d.value.toLowerCase());
          list.push(d);
        }
      });
    }

    if (!set.has("split")) {
      set.add("split");
      list.push({
        label: "Split / Multi-Mode (Add Rows)",
        value: "Split",
        color: "#6366f1",
      });
    }

    return list;
  }, [dbPaymentModes]);

  // Selectable individual payment modes excluding "Split" (strictly GPay, PhonePe, Cash)
  const selectablePaymentModes = useMemo(() => {
    return dynamicPaymentModes.filter(
      (m) => String(m.value || "").trim().toLowerCase() !== "split" && !["upi", "online", "none"].includes(String(m.value || "").trim().toLowerCase())
    );
  }, [dynamicPaymentModes]);

  // Multi-Mode Split is exclusively used
  const [isMultiSplit, setIsMultiSplit] = useState(true);
  const [splitRows, setSplitRows] = useState([
    { id: 1, mode: "", amount: "", utr: "" },
  ]);
  const [activeQrModal, setActiveQrModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [rowToDelete, setRowToDelete] = useState(null);

  const isEventSelected = Boolean(isAllEventsFilter || (formData.eventName && String(formData.eventName).trim()));

  const allocatedSplitSum = useMemo(() => {
    return Math.round(splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100) / 100;
  }, [splitRows]);

  const targetAmount = Number(formData.amount) || 0;
  const splitDifference = Math.round((targetAmount - allocatedSplitSum) * 100) / 100;

  const isAddRowDisabled = useMemo(() => {
    if (!isEventSelected) return true;
    if (targetAmount <= 0) return true;
    if (splitDifference <= 0) return true;
    // Each payment mode can only have at most one row
    if (selectablePaymentModes.length > 0 && splitRows.length >= selectablePaymentModes.length) {
      return true;
    }
    return false;
  }, [isEventSelected, targetAmount, splitDifference, splitRows.length, selectablePaymentModes.length]);

  const maxPayableDue = useMemo(() => {
    if (!duesSummary) return null;
    const currentDue = Math.round((duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : duesSummary.baseAmount || 0) * 100) / 100;
    const arrears = Math.round((duesSummary.previousArrears || 0) * 100) / 100;
    const totalDue = duesSummary.totalDue !== undefined && duesSummary.totalDue !== null && Number(duesSummary.totalDue) > 0
      ? Math.round(Number(duesSummary.totalDue) * 100) / 100
      : Math.round(((duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0) + arrears) * 100) / 100;
    const total = totalDue > 0 ? totalDue : Math.round(((duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0) + arrears) * 100) / 100;

    if (paymentScope === "CurrentEvent") return currentDue;
    if (paymentScope === "PreviousArrears") return arrears;
    if (paymentScope === "AllOutstanding") return total;
    return total;
  }, [duesSummary, paymentScope]);

  const isFullySettled = useMemo(() => {
    if (duesSummary) {
      const hasDues = (Number(duesSummary.totalDue) > 0) || (Number(duesSummary.currentEventDue) > 0) || (Number(duesSummary.previousArrears) > 0);
      if (hasDues) return false;
      return duesSummary.totalDue === 0 || String(duesSummary.status || "").toLowerCase() === "paid";
    }
    const hasInitialDues = (Number(initialTotalDue) > 0) || (Number(initialCurrentDue) > 0) || (Number(initialPreviousArrears) > 0);
    if (hasInitialDues) return false;
    return (
      String(initialStatus || "").toLowerCase() === "paid" ||
      (initialCurrentDue === 0 && initialPreviousArrears === 0 && initialTotalDue === 0)
    );
  }, [duesSummary, initialStatus, initialCurrentDue, initialPreviousArrears, initialTotalDue]);

  // Check if current payment mode is digital/UPI supporting QR
  const isCashMode = String(formData.paymentMode || "").toLowerCase().includes("cash");
  const selectedModeObj = (dbPaymentModes || []).find(
    (m) =>
      (m.paymentModeName || m.name || "").toLowerCase() ===
      (formData.paymentMode || "").toLowerCase()
  );

  const hasDigitalInSplit = useMemo(() => {
    return splitRows.some(
      (r) => !String(r.mode || "").toLowerCase().includes("cash") && Number(r.amount) > 0
    );
  }, [splitRows]);

  const supportsQr = isMultiSplit
    ? hasDigitalInSplit
    : (selectedModeObj
        ? selectedModeObj.supportsQr !== false && !selectedModeObj.isCash
        : !isCashMode);

  // Screenshot is mandatory if UPI/online mode is selected (including split with Cash + UPI).
  // Pure Cash payment means screenshot is optional.
  const isImageMandatory = useMemo(() => {
    if (isMultiSplit) {
      if (!splitRows || splitRows.length === 0) return true;
      // If ANY row is non-cash (UPI/online), image upload is mandatory.
      // Pure cash payment (all rows cash) means screenshot is optional.
      return splitRows.some(
        (r) => !String(r.mode || "").trim().toLowerCase().includes("cash")
      );
    }
    return !String(formData.paymentMode || "").trim().toLowerCase().includes("cash");
  }, [isMultiSplit, splitRows, formData.paymentMode]);

  useEffect(() => {
    if (!isImageMandatory && errors.screenshot) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.screenshot;
        return next;
      });
    }
  }, [isImageMandatory, errors.screenshot]);

  useEffect(() => {
    if (splitDifference === 0 && errors.split && errors.split.includes("Allocated breakdown total")) {
      setErrors((prev) => {
        if (!prev.split) return prev;
        const next = { ...prev };
        delete next.split;
        return next;
      });
    }
  }, [splitDifference, errors.split]);

  // Resolve QR Config based on Event Category or Event Name
  const resolvedCategory = useMemo(() => {
    if (formData.eventCategory) return formData.eventCategory;
    if (formData.eventName) {
      const matched = (eventsList || []).find(
        (e) => (e.title || e.name || e.eventName) === formData.eventName
      );
      if (matched) return matchedEventCategory(matched);
    }
    return "";
  }, [formData.eventCategory, formData.eventName, eventsList]);

  const qrConfig = useMemo(() => {
    let cfg = getPaymentQrConfig(resolvedCategory);
    if (!cfg?.isConfigured && formData.eventName) {
      cfg = getPaymentQrConfig(formData.eventName);
    }

    const isConfigured = Boolean(
      (cfg?.isConfigured && (cfg?.upiId || cfg?.qrImage)) ||
      (duesSummary?.qrUpiId && duesSummary?.qrReceiverName) ||
      duesSummary?.qrImage
    );

    const upiId = isConfigured ? (cfg?.upiId || duesSummary?.qrUpiId || "").trim() : "";
    const receiverName = isConfigured ? (cfg?.receiverName || duesSummary?.qrReceiverName || "Contribution Management").trim() : "";
    const qrImage = isConfigured ? (cfg?.qrImage || duesSummary?.qrImage || null) : null;
    const qrMode = qrImage ? "uploaded" : (cfg?.qrMode || "generated");

    return {
      eventType: resolvedCategory || formData.eventName || "Contribution",
      receiverName,
      upiId,
      qrReceiverName: receiverName,
      qrUpiId: upiId,
      qrMode,
      qrImage,
      isConfigured,
      message: isConfigured ? "" : "Payment QR is not configured for this event type.",
    };
  }, [resolvedCategory, formData.eventName, duesSummary]);

  const activeRowQrData = useMemo(() => {
    if (!activeQrModal) return null;
    if (!qrConfig?.isConfigured) return null;
    const rowAmt = Number(activeQrModal.amount) || Number(formData.amount) || 0;
    const modeLabel = activeQrModal.mode || "UPI";
    return generateDynamicPaymentQr({
      amount: rowAmt,
      note: `${formData.eventName || "Contribution"} - ${formData.memberName || "Member"} (${modeLabel})`,
      customConfig: qrConfig,
      eventType: resolvedCategory,
    });
  }, [activeQrModal, formData.eventName, formData.memberName, qrConfig, resolvedCategory]);

  const qrData = useMemo(() => {
    if (!supportsQr) return null;
    const digitalSum = isMultiSplit
      ? splitRows
          .filter((r) => !String(r.mode || "").toLowerCase().includes("cash"))
          .reduce((s, r) => s + (Number(r.amount) || 0), 0)
      : Number(formData.amount) || 0;
    const amt = digitalSum > 0 ? digitalSum : Number(formData.amount) || 0;

    return generateDynamicPaymentQr({
      amount: amt,
      note: `${formData.eventName || "Contribution"} - ${formData.memberName || "Member"}`,
      customConfig: qrConfig?.isConfigured ? qrConfig : undefined,
      eventType: resolvedCategory,
    });
  }, [supportsQr, isMultiSplit, splitRows, formData.amount, formData.eventName, formData.memberName, qrConfig, resolvedCategory]);

  const arrearTooltipContent = useMemo(() => {
    const list = duesSummary?.arrearBreakdown || [];
    const totalArrears =
      duesSummary?.previousArrears !== undefined && duesSummary?.previousArrears !== null
        ? Number(duesSummary.previousArrears)
        : list.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    if (totalArrears <= 0 || !list || list.length === 0) {
      return "No previous arrears";
    }
    return (
      <Box sx={{ p: 0.8, minWidth: 200 }}>
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{ display: "block", color: "#f87171", mb: 0.8, borderBottom: "1px solid rgba(255,255,255,0.2)", pb: 0.4 }}
        >
          Unpaid Previous Events ({list.length}):
        </Typography>
        <Stack spacing={0.6}>
          {list.map((item, idx) => (
            <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, fontSize: "0.74rem" }}>
              <span style={{ color: "#f1f5f9" }}>• {item.eventName || item.title || "Event"}</span>
              <span style={{ fontWeight: 800, color: "#fff" }}>{formatWholeCurrency(item.amount || 0)}</span>
            </Box>
          ))}
        </Stack>
        <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", mt: 0.8, pt: 0.5, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.78rem", color: "#fca5a5" }}>
          <span>Total Arrears:</span>
          <span>{formatWholeCurrency(totalArrears)}</span>
        </Box>
      </Box>
    );
  }, [duesSummary?.arrearBreakdown, duesSummary?.previousArrears]);

  const handleCopyUpi = async (upi) => {
    if (!upi) return;
    try {
      await navigator.clipboard.writeText(upi);
      setCopiedUpi(true);
      toast.success(`UPI ID copied: ${upi}`);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch {
      toast.error("Failed to copy UPI ID");
    }
  };

  // Load masters on mount or open
  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [memsRes, eventsRes, eventTypesRes, modesRes] = await Promise.all([
          getMembersAsync().catch(() => []),
          getEventsAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
          getPaymentModesAsync(true).catch(() => []),
        ]);
        if (!isMounted) return;
        if (Array.isArray(memsRes)) setMembersList(memsRes);
        if (Array.isArray(eventsRes)) setEventsList(eventsRes.filter((e) => !e.isDeleted && isEventPublished(e)));
        if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
        if (Array.isArray(modesRes)) setDbPaymentModes(modesRes);
      } catch {
        // ignore
      }
    };
    if (open) {
      loadMasters();
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Synchronize dynamic payment modes
  useEffect(() => {
    if (dynamicPaymentModes.length > 0) {
      setFormData((prev) => {
        if (!prev.paymentMode) return prev;
        const exists = dynamicPaymentModes.some(
          (m) => m.value.toLowerCase() === prev.paymentMode.toLowerCase()
        );
        if (!exists) {
          return { ...prev, paymentMode: "" };
        }
        return prev;
      });
    }
  }, [dynamicPaymentModes]);

  // Synchronize initial prop values when modal opens
  useEffect(() => {
    if (open) {
      let matchedEvName = initialEventName || "";
      let matchedCategory = initialEventCategory || "";
      const hasInitialDues = (Number(initialTotalDue) > 0) || (Number(initialCurrentDue) > 0) || (Number(initialPreviousArrears) > 0);
      const isPaidInitial = !hasInitialDues && (
        String(initialStatus || "").toLowerCase() === "paid" ||
        (initialCurrentDue === 0 && initialPreviousArrears === 0 && initialTotalDue === 0)
      );
      let resolvedAmount = isPaidInitial ? "0.00" : initialAmount;

      if (!isPaidInitial && initialEventId && eventsList.length > 0) {
        const matched = eventsList.find(
          (e) => String(e.id || e.eventId) === String(initialEventId)
        );
        if (matched) {
          matchedEvName = matched.title || matched.name || matched.eventName || matchedEvName;
          matchedCategory =
            matchedEventCategory(matched) || matchedCategory;
          if (!resolvedAmount && (matched.amount || matched.contributionAmount)) {
            resolvedAmount = String(matched.amount || matched.contributionAmount);
          }
        }
      }

      let resolvedMemName = initialMemberName || authState?.fullName || "";
      let resolvedMemId = initialMemberId || "";

      if (resolvedMemId && membersList.length > 0) {
        const matchedMem = membersList.find(
          (m) => String(m.id || m.memberId) === String(resolvedMemId)
        );
        if (matchedMem) {
          resolvedMemName = matchedMem.name || matchedMem.memberName || resolvedMemName;
        }
      } else if (!resolvedMemId && resolvedMemName && membersList.length > 0) {
        const matchedMem = membersList.find(
          (m) =>
            (m.name && m.name.toLowerCase() === resolvedMemName.toLowerCase()) ||
            (m.memberName && m.memberName.toLowerCase() === resolvedMemName.toLowerCase())
        );
        if (matchedMem) {
          resolvedMemId = matchedMem.id || matchedMem.memberId || "";
        }
      }

      // Determine default payment scope:
      let defaultScope = initialPaymentScope;
      if (!defaultScope) {
        if (Number(initialPreviousArrears) > 0 && Number(initialTotalDue) > 0) {
          defaultScope = "AllOutstanding";
        } else if (Number(initialCurrentDue) > 0) {
          defaultScope = "CurrentEvent";
        }
      }

      let defaultAmount = "";
      if (isPaidInitial) {
        defaultAmount = "0.00";
      } else if (defaultScope === "AllOutstanding") {
        defaultAmount = initialTotalDue !== undefined && Number(initialTotalDue) > 0
          ? String(initialTotalDue)
          : (resolvedAmount ? String(resolvedAmount) : String((Number(initialCurrentDue) || 0) + (Number(initialPreviousArrears) || 0)));
      } else if (defaultScope === "CurrentEvent") {
        defaultAmount = initialCurrentDue !== undefined && Number(initialCurrentDue) > 0
          ? String(initialCurrentDue)
          : (resolvedAmount ? String(resolvedAmount) : "");
      } else if (defaultScope === "PreviousArrears") {
        defaultAmount = initialPreviousArrears !== undefined && Number(initialPreviousArrears) > 0
          ? String(initialPreviousArrears)
          : "";
      } else {
        defaultAmount = resolvedAmount ? String(resolvedAmount) : "";
      }

      setFormData((prev) => ({
        ...prev,
        eventId: initialEventId || prev.eventId,
        memberId: resolvedMemId || prev.memberId,
        eventCategory: matchedCategory || prev.eventCategory,
        eventName: matchedEvName || prev.eventName,
        memberName: resolvedMemName || prev.memberName,
        amount: defaultAmount,
        paymentMode: "",
        paymentDate: dayjs(),
        utr: "",
        notes: "",
        screenshot: "",
        screenshots: [],
      }));
      setSplitRows([
        { id: 1, mode: "", amount: defaultAmount, utr: "" },
      ]);
      setPaymentScope(defaultScope);
      setErrors({});
    }
  }, [
    open,
    initialEventId,
    initialEventName,
    initialEventCategory,
    initialMemberId,
    initialMemberName,
    initialAmount,
    initialPaymentScope,
    initialTotalDue,
    initialCurrentDue,
    initialPreviousArrears,
    eventsList,
    membersList,
    dynamicPaymentModes,
    authState?.fullName,
    isAllEventsFilter,
  ]);

  // Category options
  const categoryOptions = useMemo(() => {
    const list = [];
    const set = new Set();

    (eventTypesList || []).forEach((et) => {
      const name = et.typeName || et.name || et.eventTypeName;
      if (name && !set.has(name)) {
        set.add(name);
        list.push({ label: name, value: name });
      }
    });

    (eventsList || []).forEach((e) => {
      const cat = matchedEventCategory(e);
      if (cat && !set.has(cat)) {
        set.add(cat);
        list.push({ label: cat, value: cat });
      }
    });

    if (formData.eventCategory && !set.has(formData.eventCategory)) {
      list.push({ label: formData.eventCategory, value: formData.eventCategory });
    }

    return list;
  }, [eventTypesList, eventsList, formData.eventCategory]);

  // Filtered Event options
  const filteredEventOptions = useMemo(() => {
    const list = [];
    const set = new Set();

    (eventsList || []).forEach((e) => {
      const title = e.title || e.name || e.eventName;
      const cat = matchedEventCategory(e);

      if (!formData.eventCategory || cat.toLowerCase() === formData.eventCategory.toLowerCase()) {
        if (title && !set.has(title)) {
          set.add(title);
          list.push({ label: title, value: title });
        }
      }
    });

    if (formData.eventName && !set.has(formData.eventName)) {
      list.push({ label: formData.eventName, value: formData.eventName });
    }

    return list;
  }, [eventsList, formData.eventCategory, formData.eventName]);

  // Contributor Select options
  const contributorOptions = useMemo(() => {
    const list = [];
    const set = new Set();
    (membersList || []).forEach((m) => {
      const val = String(m.id || m.memberId || m.name || m.memberName);
      if (val && !set.has(val)) {
        set.add(val);
        list.push({
          label: `${m.name || m.memberName || "Unknown"}${m.phone ? ` (${m.phone})` : ""}`,
          value: val,
        });
      }
    });
    const currentVal = String(formData.memberId || formData.memberName || "");
    if (currentVal && !set.has(currentVal)) {
      list.push({
        label: formData.memberName || currentVal,
        value: currentVal,
      });
    }
    return list;
  }, [membersList, formData.memberId, formData.memberName]);

  // Centralized helper to dynamically reset event-dependent state (scope, dues, amounts, split rows) without hardcoding
  const resetEventDependentFields = (clearEventName = true) => {
    const defaultMode = selectablePaymentModes[0]?.value || "";
    setFormData((prev) => ({
      ...prev,
      ...(clearEventName ? { eventName: "", eventId: "" } : {}),
      amount: "",
    }));
    setPaymentScope("");
    setDuesSummary(null);
    setSplitRows([
      { id: 1, mode: defaultMode, amount: "", utr: "" },
    ]);
    setErrors((prev) => {
      const next = { ...prev };
      if (clearEventName) delete next.eventName;
      delete next.amount;
      delete next.paymentScope;
      delete next.split;
      return next;
    });
  };

  const handleEventTypeChange = (newCategory) => {
    if (!newCategory) {
      // De-selecting Event Type clears eventCategory and ALL dependent fields
      setFormData((prev) => ({ ...prev, eventCategory: "" }));
      resetEventDependentFields(true);
      return;
    }

    const matchingEvents = (eventsList || []).filter(
      (ev) => matchedEventCategory(ev).toLowerCase() === newCategory.toLowerCase()
    );

    // If exactly one event exists for this category, auto-bind it
    if (matchingEvents.length === 1) {
      const singleEvent = matchingEvents[0];
      const singleName = singleEvent.title || singleEvent.name || singleEvent.eventName;
      setFormData((prev) => ({ ...prev, eventCategory: newCategory }));
      handleEventNameChange(singleName);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.eventCategory;
        return next;
      });
      return;
    }

    // Changing Event Type: check if currently selected event belongs to the newly selected category
    const isCurrentEventInNewCategory = matchingEvents.some(
      (ev) =>
        (ev.title || ev.name || ev.eventName) === formData.eventName
    );

    setFormData((prev) => ({
      ...prev,
      eventCategory: newCategory,
      ...(isCurrentEventInNewCategory ? {} : { eventName: "", eventId: "" }),
    }));

    if (!isCurrentEventInNewCategory) {
      resetEventDependentFields(true);
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.eventCategory;
      return next;
    });
  };

  const handleEventNameChange = (selectedName) => {
    if (!selectedName) {
      // De-selecting Event Name clears event and all dependent fields
      resetEventDependentFields(true);
      return;
    }

    const matchedEvent = (eventsList || []).find(
      (ev) => (ev.title || ev.name || ev.eventName) === selectedName
    );
    const matchedCategory = matchedEvent
      ? matchedEventCategory(matchedEvent) || formData.eventCategory
      : formData.eventCategory;
    const evId = matchedEvent ? matchedEvent.id || matchedEvent.eventId || "" : "";

    setFormData((prev) => ({
      ...prev,
      eventName: selectedName,
      eventId: evId,
      eventCategory: matchedCategory || prev.eventCategory,
      amount: "",
    }));

    // Reset dependent fields for the newly chosen event so user chooses scope
    setPaymentScope("");
    setDuesSummary(null);
    const defaultMode = selectablePaymentModes[0]?.value || "";
    setSplitRows([{ id: 1, mode: defaultMode, amount: "", utr: "" }]);

    setErrors((prev) => {
      const next = { ...prev };
      delete next.eventName;
      delete next.amount;
      delete next.paymentScope;
      delete next.split;
      return next;
    });
  };

  const lastLoadedContextRef = useRef("");

  useEffect(() => {
    if (!open) {
      lastLoadedContextRef.current = "";
    }
  }, [open]);

  // Dynamic Dues Context Loader
  useEffect(() => {
    if (!open) return;
    const evId = String(formData.eventId || initialEventId || "").trim();
    const evName = String(formData.eventName || initialEventName || "").trim();
    const memId = String(formData.memberId || initialMemberId || "").trim();
    const memName = String(formData.memberName || initialMemberName || "").trim();

    if (!evId && !evName) {
      setDuesSummary(null);
      return;
    }
    if (!memId && !memName) return;

    const contextKey = `${evId}|${evName}|${memId}|${memName}`;
    if (lastLoadedContextRef.current === contextKey) {
      return;
    }
    lastLoadedContextRef.current = contextKey;

    const loadContext = async () => {
      try {
        const res = await getPaymentContextAsync({
          eventId: evId || undefined,
          memberId: memId || undefined,
          eventName: evName || undefined,
          memberName: memName || undefined,
        });

        const matchedEvent = (eventsList || []).find(
          (ev) =>
            (ev.title || ev.name || ev.eventName) === evName ||
            (ev.id || ev.eventId) === evId
        );

          if (res) {
            // Check if this event is in initialAllMemberEvents
            const activeMemEv = (initialAllMemberEvents || []).find(
              (e) => (formData.eventId && String(e.eventId).toLowerCase() === String(formData.eventId).toLowerCase()) ||
                     (formData.eventName && String(e.eventName).toLowerCase().trim() === String(formData.eventName).toLowerCase().trim())
            );

            const hasActiveUnpaidEvent = Boolean(
              activeMemEv && !activeMemEv.isPaid && (Number(activeMemEv.amount) || 0) > (Number(activeMemEv.paidAmount) || 0)
            );

            const hasOtherUnpaidEvents = Array.isArray(initialAllMemberEvents) && initialAllMemberEvents.some(
              (e) => !e.isPaid && (Number(e.amount) || 0) > (Number(e.paidAmount) || 0)
            );

            const hasPropsRemainingDues =
              hasActiveUnpaidEvent ||
              hasOtherUnpaidEvents ||
              Number(initialTotalDue) > 0 ||
              Number(initialCurrentDue) > 0 ||
              Number(initialPreviousArrears) > 0;

            const isInitialPaid = !hasPropsRemainingDues && (
              String(initialStatus || "").toLowerCase() === "paid" ||
              String(initialStatus || "").toLowerCase() === "verified" ||
              (initialCurrentDue === 0 && initialPreviousArrears === 0 && initialTotalDue === 0)
            );

            const isBackendPaid = !hasPropsRemainingDues && (
              String(res.status || "").toLowerCase() === "paid" ||
              String(res.status || "").toLowerCase() === "verified" ||
              String(res.status || "").toLowerCase() === "completed"
            );

            const isPaidStatus = isInitialPaid || isBackendPaid;
            const isSubmittedProps = initialIsSubmitted || isPaidStatus;

            const fallbackEvAmt = () => {
              if (matchedEvent) {
                const base = Number(matchedEvent.baseAmount || matchedEvent.totalExpectedAmount || matchedEvent.plannedBudget || 0);
                const count = Number(
                  matchedEvent.participantCount ||
                  (Array.isArray(matchedEvent.participants) ? matchedEvent.participants.length : 0) ||
                  (matchedEvent.eventTypeMembers ? Object.values(matchedEvent.eventTypeMembers).flat().length : 0) ||
                  matchedEvent.eligibleContributors ||
                  matchedEvent.totalActiveMembers ||
                  0
                );
                if (count > 0 && base > 0) return Math.round(base / count);
              }
              return 0;
            };
            const resolvedFallback = fallbackEvAmt();

            // Calculate current event due:
            let currentEvDue = 0;
            if (activeMemEv) {
              currentEvDue = activeMemEv.isPaid ? 0 : Math.max(0, (Number(activeMemEv.amount) || 0) - (Number(activeMemEv.paidAmount) || 0));
            } else if (initialCurrentDue !== undefined && Number(initialCurrentDue) > 0) {
              currentEvDue = Number(initialCurrentDue);
            } else if (isPaidStatus) {
              currentEvDue = 0;
            } else if (isSubmittedProps) {
              currentEvDue = initialCurrentDue ?? (resolvedFallback > 0 ? resolvedFallback : 0);
            } else {
              currentEvDue = Number(res.currentEventDue ?? res.amount ?? matchedEvent?.amount ?? matchedEvent?.contributionAmount ?? resolvedFallback ?? 0);
            }

            // Determine other events / arrears breakdown
            let breakdown = [];
            if (initialAllMemberEvents && initialAllMemberEvents.length > 0) {
              // Get all other unpaid member events excluding the current one
              const otherMemberUnpaid = initialAllMemberEvents.filter((e) => {
                const isCurrentEv =
                  (formData.eventId && String(e.eventId).toLowerCase() === String(formData.eventId).toLowerCase()) ||
                  (formData.eventName && String(e.eventName).toLowerCase().trim() === String(formData.eventName).toLowerCase().trim());
                return !isCurrentEv && !e.isPaid && (Number(e.amount) || 0) > (Number(e.paidAmount) || 0);
              });
              const otherEvBreakdown = otherMemberUnpaid.map((e) => {
                const due = Math.max(0, (Number(e.amount) || 0) - (Number(e.paidAmount) || 0));
                return {
                  eventId: e.eventId,
                  eventName: e.eventName,
                  title: e.eventName,
                  amount: due,
                  dueAmount: due,
                };
              });
              // Append any older month arrears from initialArrearBreakdown that are not already in initialAllMemberEvents
              const olderItems = (initialArrearBreakdown || []).filter((item) => {
                return !initialAllMemberEvents.some((me) =>
                  String(me.eventId).toLowerCase() === String(item.eventId).toLowerCase()
                );
              });
              breakdown = [...otherEvBreakdown, ...olderItems];
            } else {
              const callerHasArrearBreakdown = Array.isArray(initialArrearBreakdown) && initialArrearBreakdown.length > 0;

              breakdown = callerHasArrearBreakdown
                ? initialArrearBreakdown
                : (res.arrearBreakdown || []);

              // Exclude current event if present in breakdown
              breakdown = breakdown.filter((item) => {
                const isCurrentEv =
                  (formData.eventId && String(item.eventId).toLowerCase() === String(formData.eventId).toLowerCase()) ||
                  (formData.eventName && String(item.eventName).toLowerCase().trim() === String(formData.eventName).toLowerCase().trim());
                return !isCurrentEv;
              });
            }

            // Dynamically filter out deleted events from arrear breakdown only when eventsList is populated
            if (eventsList && eventsList.length > 0) {
              const activeBreakdown = breakdown.filter(item => {
                 const evName = String(item.eventName || "").toLowerCase().trim();
                 const evId = String(item.eventId || "").trim();
                 return (eventsList || []).some(e => 
                   (evId && String(e.eventId || e.id) === evId) || 
                   (evName && String(e.eventName || e.title || e.name || "").toLowerCase().trim() === evName)
                 );
              });
              if (activeBreakdown.length > 0) {
                breakdown = activeBreakdown;
              }
            }

            const rawCalculatedArrears = breakdown.reduce((sum, item) => sum + (Number(item.dueAmount || item.amount) || 0), 0);
            const safePrevArrears = rawCalculatedArrears > 0 ? rawCalculatedArrears : (Number(initialPreviousArrears) || 0);
            const total = roundToWhole(currentEvDue + safePrevArrears);
            const isZeroDue = total === 0 && currentEvDue === 0 && safePrevArrears === 0;

            const baseAmt = Number(
              res.amount || matchedEvent?.amount || matchedEvent?.contributionAmount || (currentEvDue > 0 ? currentEvDue : resolvedFallback)
            );

            const computedStatus = isZeroDue
              ? "Paid"
              : (initialStatus && String(initialStatus).toLowerCase() !== "paid"
                  ? initialStatus
                  : (res.status && String(res.status).toLowerCase() !== "paid" ? res.status : "Pending"));

            const finalArrearBreakdown = safePrevArrears === 0
              ? []
              : (breakdown.length > 0
                  ? breakdown
                  : [{ eventId: "previous_arrears", eventName: "Previous Unpaid Arrears", title: "Previous Unpaid Arrears", amount: safePrevArrears, dueAmount: safePrevArrears }]);

            setDuesSummary({
              currentEventDue: currentEvDue,
              previousArrears: safePrevArrears,
              totalDue: total,
              status: computedStatus,
              baseAmount: baseAmt,
              arrearBreakdown: finalArrearBreakdown,
            });

            let resolvedScope = paymentScope || initialPaymentScope;
            if (!resolvedScope) {
              if (safePrevArrears > 0 && total > 0) {
                resolvedScope = "AllOutstanding";
              } else if (currentEvDue > 0) {
                resolvedScope = "CurrentEvent";
              } else {
                resolvedScope = "CurrentEvent";
              }
            }
            setPaymentScope(resolvedScope);

            let resolvedDuesAmount = "";
            if (total === 0) {
              resolvedDuesAmount = "0.00";
            } else if (resolvedScope === "AllOutstanding") {
              resolvedDuesAmount = String(total);
            } else if (resolvedScope === "CurrentEvent") {
              resolvedDuesAmount = String(roundToWhole(currentEvDue));
            } else if (resolvedScope === "PreviousArrears") {
              resolvedDuesAmount = String(roundToWhole(safePrevArrears));
            } else {
              resolvedDuesAmount = String(total);
            }

            setFormData((prev) => {
              const updatedEvName = prev.eventName || res.eventName || "";
              const updatedMemName = prev.memberName || res.memberName || authState?.fullName || "";
              if (
                prev.amount === resolvedDuesAmount &&
                prev.eventName === updatedEvName &&
                prev.memberName === updatedMemName
              ) {
                return prev;
              }
              return {
                ...prev,
                eventName: updatedEvName,
                memberName: updatedMemName,
                amount: resolvedDuesAmount,
              };
            });

            if (total === 0) {
              setSplitRows((rows) => rows.map((r) => ({ ...r, amount: "0.00" })));
            } else if (resolvedDuesAmount && Number(resolvedDuesAmount) > 0) {
              setSplitRows((rows) => {
                if (rows.length <= 1) {
                  return [{ ...(rows[0] || { id: 1, mode: "", utr: "" }), amount: resolvedDuesAmount }];
                }
                return rows;
              });
            } else {
              setSplitRows((rows) => rows.map((r) => ({ ...r, amount: "" })));
            }
          } else if (matchedEvent) {
            const base = Number(matchedEvent.baseAmount || matchedEvent.totalExpectedAmount || matchedEvent.plannedBudget || 0);
            const count = Number(
              matchedEvent.participantCount ||
              (Array.isArray(matchedEvent.participants) ? matchedEvent.participants.length : 0) ||
              (matchedEvent.eventTypeMembers ? Object.values(matchedEvent.eventTypeMembers).flat().length : 0) ||
              matchedEvent.eligibleContributors ||
              matchedEvent.totalActiveMembers ||
              0
            );
            const fallbackAmt = (count > 0 && base > 0) ? Math.round(base / count) : 0;
            const currentEvDue = Number(matchedEvent.amount || matchedEvent.contributionAmount || 0) || fallbackAmt;
            setDuesSummary({
              currentEventDue: currentEvDue,
              previousArrears: 0,
              totalDue: currentEvDue,
              status: "Pending",
              baseAmount: currentEvDue,
              arrearBreakdown: initialArrearBreakdown || [],
            });
            setPaymentScope("CurrentEvent");
            const resolvedFallbackAmount = String(currentEvDue);
            setFormData((prev) => ({
              ...prev,
              amount: resolvedFallbackAmount,
            }));
            setSplitRows((rows) => {
              if (rows.length <= 1) {
                return [{ ...(rows[0] || { id: 1, mode: "", utr: "" }), amount: resolvedFallbackAmount }];
              }
              return rows;
            });
          }
        } catch {
          // Silent fallback
        }
      };
      loadContext();
  }, [
    open,
    formData.eventId,
    formData.memberId,
    formData.eventName,
    formData.memberName,
    initialEventId,
    initialMemberId,
    initialEventName,
    initialMemberName,
    initialPaymentScope,
    isAllEventsFilter,
  ]);

  const paymentScopeOptions = useMemo(() => {
    if (!duesSummary) return [];
    const isPaid = String(duesSummary.status || "").toLowerCase() === "paid";
    const currentDue = isPaid ? 0 : roundToWhole(duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : duesSummary.baseAmount || 0);
    const arrears = roundToWhole(duesSummary.previousArrears || 0);
    const total = isPaid && arrears === 0 ? 0 : (duesSummary.totalDue !== undefined && duesSummary.totalDue !== null && Number(duesSummary.totalDue) > 0
      ? roundToWhole(duesSummary.totalDue)
      : roundToWhole((duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0) + arrears));

    const fmt = (num) => formatWholeNumber(num);

    const opts = [];
    if (arrears > 0 && total > 0) {
      opts.push({
        label: `All Outstanding (₹${fmt(total)})`,
        value: "AllOutstanding",
      });
    }
    const currentEventAmt = duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : (duesSummary.baseAmount || 0);
    opts.push({
      label: `Current Event Only (₹${fmt(currentEventAmt)})${isPaid ? " [Paid]" : ""}`,
      value: "CurrentEvent",
    });
    if (arrears > 0) {
      opts.push({
        label: `Previous Arrears Only (₹${fmt(arrears)})`,
        value: "PreviousArrears",
      });
    }
    return opts;
  }, [duesSummary]);

  const handlePaymentScopeChange = (scope) => {
    setPaymentScope(scope);
    if (!duesSummary || !scope) {
      setFormData((prev) => ({ ...prev, amount: "" }));
      setSplitRows((rows) => [{ id: 1, mode: rows[0]?.mode || "", amount: "", utr: "" }]);
      return;
    }
    const isPaid = String(duesSummary.status || "").toLowerCase() === "paid";
    const currentDue = isPaid ? 0 : roundToWhole(duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0);
    const arrears = roundToWhole(duesSummary.previousArrears || 0);
    const total = isPaid && arrears === 0 ? 0 : (duesSummary.totalDue !== undefined && duesSummary.totalDue !== null && Number(duesSummary.totalDue) > 0
      ? roundToWhole(duesSummary.totalDue)
      : roundToWhole(currentDue + arrears));

    let amt = total;
    if (scope === "CurrentEvent") amt = currentDue;
    if (scope === "PreviousArrears") amt = arrears;
    if (scope === "AllOutstanding") amt = total;

    setFormData((prev) => ({ ...prev, amount: roundToWhole(amt).toString() }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.amount;
      delete next.paymentScope;
      delete next.split;
      Object.keys(next).forEach((k) => {
        if (k.includes("_amount")) {
          delete next[k];
        }
      });
      return next;
    });

    if (isMultiSplit && splitRows.length > 0) {
      const count = splitRows.length;
      const shares = distributeEqualSplit(roundToWhole(amt), count);
      setSplitRows((rows) =>
        rows.map((r, i) => ({
          ...r,
          amount: String(shares[i] || 0),
        }))
      );
    } else {
      setSplitRows((rows) => {
        if (rows.length <= 1) {
          return [{ ...(rows[0] || { id: 1, mode: rows[0]?.mode || "", utr: "" }), amount: roundToWhole(amt).toString() }];
        }
        return rows;
      });
    }
  };

  const handleAddSplitRow = () => {
    if (!isEventSelected) {
      toast.warning("Please select an Event Name first.");
      return;
    }
    const curSum = roundToWhole(splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
    const targetAmt = roundToWhole(formData.amount || 0);
    const remaining = Math.max(0, targetAmt - curSum);

    if (targetAmt <= 0) {
      toast.warning("Please choose a payment scope and enter/select an amount first.");
      return;
    }
    if (remaining <= 0) {
      toast.warning("All amount is already allocated across existing rows.");
      return;
    }

    const newId = Date.now() + Math.random();
    const rowAmt = remaining > 0 ? String(remaining) : "";

    setSplitRows((prev) => [
      ...prev,
      {
        id: newId,
        mode: "",
        amount: rowAmt,
        utr: "",
      },
    ]);
  };

  const handleRemoveSplitRow = (id) => {
    if (!isEventSelected) {
      return;
    }
    if (splitRows.length <= 1) {
      toast.warning("At least one payment row is required.");
      return;
    }
    setSplitRows((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.split;
      delete next[`row_${id}_utr`];
      delete next[`row_${id}_amount`];
      delete next[`row_${id}_mode`];
      return next;
    });
  };

  const handleSplitRowChange = (id, field, value) => {
    if (!isEventSelected) {
      toast.warning("Please select an Event Name first.");
      return;
    }
    let sanitized = value;
    if (field === "mode") {
      const modeValStr = String(value || "").trim().toLowerCase();
      // Enforce 1 row per mode: Check if another row already uses this mode
      const isAlreadyUsed = Boolean(
        modeValStr &&
        splitRows.some(
          (r) => r.id !== id && r.mode && String(r.mode || "").trim().toLowerCase() === modeValStr
        )
      );
      if (isAlreadyUsed) {
        toast.warning(`Payment mode '${value}' is already added in another row. Each mode can only have one row.`);
        return;
      }

      const isNewCash = modeValStr.includes("cash");
      const existingRow = splitRows.find((r) => r.id === id);
      const existingUtr = existingRow?.utr || "";
      const trimmedUtr = isNewCash
        ? existingUtr.slice(0, 50)
        : existingUtr.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);

      setSplitRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, mode: value, utr: trimmedUtr } : r))
      );
      setErrors((prev) => {
        const next = { ...prev };
        delete next.split;
        delete next[`row_${id}_mode`];
        delete next[`row_${id}_utr`];
        return next;
      });
      return;
    }
    if (field === "amount") {
      // Strictly whole numbers: disallow decimal/point, e/E, and negative signs
      const rawStr = String(value ?? "").split(".")[0];
      sanitized = rawStr.replace(/[^0-9]/g, "");
      if (sanitized.length > 1 && sanitized.startsWith("0")) {
        sanitized = sanitized.replace(/^0+/, "") || "0";
      }

      const targetAmt = roundToWhole(formData.amount || 0);
      const otherRowsSum = roundToWhole(
        splitRows
          .filter((r) => r.id !== id)
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
      );

      const maxAllowedForThisRow = Math.max(0, targetAmt - otherRowsSum);
      const numVal = Number(sanitized);

      if (targetAmt > 0 && !isNaN(numVal) && numVal > maxAllowedForThisRow) {
        // Automatically clamp to the max remaining unallocated amount available for this row
        sanitized = String(maxAllowedForThisRow);
      } else if (numVal < 0) {
        sanitized = "0";
      } else if (sanitized.length > 10) {
        sanitized = sanitized.slice(0, 10);
      }
    }
    if (field === "utr") {
      const row = splitRows.find((r) => r.id === id);
      const isCash = String(row?.mode || "").toLowerCase().includes("cash");
      if (isCash) {
        // Strict limit Cash Note to max 50 characters
        sanitized = String(value || "").slice(0, 50);
      } else {
        // Limit UTR / Ref to max 12 characters (alphanumeric only, no symbols)
        sanitized = String(value || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      }
    }

    setSplitRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: sanitized } : r))
    );
    setErrors((prev) => {
      const errorKey = `row_${id}_${field}`;
      const next = { ...prev };
      if (field === "utr") {
        const row = splitRows.find((r) => r.id === id);
        const isCash = String(row?.mode || "").toLowerCase().includes("cash");
        if (!isCash) {
          const cleanVal = sanitized.trim().toLowerCase();
          const otherRow = splitRows.find(
            (r) => r.id !== id && !String(r.mode || "").toLowerCase().includes("cash") && r.utr && r.utr.trim().toLowerCase() === cleanVal
          );
          if (cleanVal && otherRow) {
            next[errorKey] = "Same UTR number cannot be used for different payment modes";
            next[`row_${otherRow.id}_utr`] = "Same UTR number cannot be used for different payment modes";
            return next;
          } else {
            if (next[errorKey] === "Same UTR number cannot be used for different payment modes") {
              delete next[errorKey];
            }
            splitRows.forEach((r) => {
              if (r.id !== id && next[`row_${r.id}_utr`] === "Same UTR number cannot be used for different payment modes") {
                const hasOtherClash = splitRows.some(
                  (other) =>
                    other.id !== r.id &&
                    other.id !== id &&
                    !String(other.mode || "").toLowerCase().includes("cash") &&
                    other.utr &&
                    other.utr.trim().toLowerCase() === (r.utr || "").trim().toLowerCase()
                );
                if (!hasOtherClash) {
                  delete next[`row_${r.id}_utr`];
                }
              }
            });
            if (sanitized.trim().length === 12) {
              delete next[errorKey];
              return next;
            } else if (prev[errorKey]) {
              next[errorKey] = sanitized.trim().length === 0 ? "This field is required" : "UTR number must be exactly 12 digits";
              return next;
            }
          }
        }
      }
      if (field === "amount") {
        const otherRowsSum = roundToWhole(
          splitRows
            .filter((r) => r.id !== id)
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
        );
        const newTotal = roundToWhole(otherRowsSum + (Number(sanitized) || 0));
        const target = roundToWhole(formData.amount || 0);
        if (newTotal === target && next.split && next.split.includes("Allocated breakdown total")) {
          delete next.split;
        }
      }
      if (next[errorKey]) {
        delete next[errorKey];
      }
      return next;
    });
  };

  const handleSplitRowBlur = (id, field) => {
    if (field === "utr") {
      const row = splitRows.find((r) => r.id === id);
      const isCash = String(row?.mode || "").toLowerCase().includes("cash");
      if (!isCash) {
        if (!row?.utr || !row.utr.trim()) {
          setErrors((prev) => ({
            ...prev,
            [`row_${id}_utr`]: "This field is required",
          }));
        } else if (row.utr.trim().length < 12) {
          setErrors((prev) => ({
            ...prev,
            [`row_${id}_utr`]: "UTR number must be exactly 12 digits",
          }));
        } else {
          const cleanUtr = row.utr.trim().toLowerCase();
          const hasDuplicate = splitRows.some(
            (r) =>
              r.id !== id &&
              !String(r.mode || "").toLowerCase().includes("cash") &&
              r.utr &&
              r.utr.trim().toLowerCase() === cleanUtr
          );
          if (hasDuplicate) {
            setErrors((prev) => ({
              ...prev,
              [`row_${id}_utr`]: "Same UTR number cannot be used for different payment modes",
            }));
          } else {
            setErrors((prev) => {
              const next = { ...prev };
              if (
                next[`row_${id}_utr`] === "Same UTR number cannot be used for different payment modes" ||
                next[`row_${id}_utr`] === "UTR number must be exactly 12 digits" ||
                next[`row_${id}_utr`] === "This field is required"
              ) {
                delete next[`row_${id}_utr`];
              }
              return next;
            });
          }
        }
      }
    }
  };

  const handleQuickSplitEvenly = () => {
    const targetAmt = roundToWhole(formData.amount || 0);
    if (targetAmt <= 0 || splitRows.length === 0) return;
    const count = splitRows.length;
    const shares = distributeEqualSplit(targetAmt, count);

    setSplitRows((prev) =>
      prev.map((row, idx) => ({
        ...row,
        amount: String(shares[idx] || 0),
      }))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.split;
      Object.keys(next).forEach((k) => {
        if (k.includes("_amount")) {
          delete next[k];
        }
      });
      return next;
    });
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.memberName || !formData.memberName.trim()) errs.memberName = "This field is required";
    if (!formData.eventCategory || !formData.eventCategory.trim()) errs.eventCategory = "This field is required";
    if (!formData.eventName || !formData.eventName.trim()) errs.eventName = "This field is required";
    if (formData.eventName && !paymentScope && paymentScopeOptions.length > 0) {
      errs.paymentScope = "This field is required";
    }
    
    const targetAmt = roundToWhole(formData.amount || 0);
    const maxDue = maxPayableDue !== null && maxPayableDue !== undefined
      ? roundToWhole(maxPayableDue)
      : null;

    if (!formData.amount || !String(formData.amount).trim() || targetAmt <= 0) {
      errs.amount = "Please choose a payment target scope to calculate contribution amount";
    } else if (maxDue !== null && maxDue > 0 && targetAmt > maxDue) {
      errs.amount = `Contribution amount (${formatWholeCurrency(targetAmt)}) cannot exceed the maximum payable due of ${formatWholeCurrency(maxDue)}`;
    } else if (targetAmt > 10000000) {
      errs.amount = "Contribution amount cannot exceed ₹1,00,00,000 (1 Crore)";
    }

    if (formData.paymentDate && dayjs(formData.paymentDate).isAfter(dayjs(), "day")) {
      errs.paymentDate = "Payment date cannot be in the future";
    }

    if (isMultiSplit) {
      if (splitRows.length === 0) {
        errs.split = "At least one payment row is required for payment breakdown";
      } else {
        const sum = roundToWhole(splitRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0));
        if (sum !== targetAmt) {
          const diff = targetAmt - sum;
          errs.split = diff > 0
            ? `Allocated breakdown total (${formatWholeCurrency(sum)}) is less than Total Amount (${formatWholeCurrency(targetAmt)}). Remaining: ${formatWholeCurrency(diff)}`
            : `Allocated breakdown total (${formatWholeCurrency(sum)}) exceeds Total Amount (${formatWholeCurrency(targetAmt)}). Excess: ${formatWholeCurrency(Math.abs(diff))}`;
        }

        // Check for duplicate payment modes
        const selectedModes = splitRows.map((r) => String(r.mode || "").trim().toLowerCase());
        const dupIndex = selectedModes.findIndex((m, idx) => m && selectedModes.indexOf(m) !== idx);
        if (dupIndex !== -1) {
          const dupName = splitRows[dupIndex]?.mode;
          errs.split = `Duplicate payment mode '${dupName}' selected. Please choose distinct payment modes per row or combine their amounts.`;
        }

        // Check for duplicate UTR numbers across split rows
        const utrSeen = {};
        for (let i = 0; i < splitRows.length; i++) {
          const r = splitRows[i];
          const isRowCash = String(r.mode || "").toLowerCase().includes("cash");
          if (!isRowCash && r.utr && r.utr.trim()) {
            const cleanUtr = r.utr.trim().toLowerCase();
            if (utrSeen[cleanUtr] !== undefined) {
              const prevId = utrSeen[cleanUtr];
              errs[`row_${r.id}_utr`] = "Same UTR number cannot be used for different payment modes";
              errs[`row_${prevId}_utr`] = "Same UTR number cannot be used for different payment modes";
            } else {
              utrSeen[cleanUtr] = r.id;
            }
          }
        }

        // Check individual rows
        for (let i = 0; i < splitRows.length; i++) {
          const r = splitRows[i];
          const rowAmt = Number(r.amount);
          if (!r.mode || !String(r.mode).trim()) {
            errs[`row_${r.id}_mode`] = "This field is required";
          }
          if (!r.amount || isNaN(rowAmt) || rowAmt <= 0) {
            errs[`row_${r.id}_amount`] = "Amount must be greater than ₹0";
          } else if (String(r.amount).includes(".") || rowAmt % 1 !== 0) {
            errs[`row_${r.id}_amount`] = "Point / decimal values are not allowed. Please enter a whole number.";
          } else if (targetAmt > 0 && rowAmt > targetAmt) {
            errs[`row_${r.id}_amount`] = `Cannot exceed ${formatWholeCurrency(targetAmt)}`;
          } else if (rowAmt > 10000000) {
            errs[`row_${r.id}_amount`] = "Amount cannot exceed ₹1,00,00,000 (1 Crore)";
          }

          const isRowCash = String(r.mode || "").toLowerCase().includes("cash");
          if (isRowCash) {
            if (r.utr && r.utr.length > 50) {
              errs[`row_${r.id}_utr`] = "Cash Note cannot exceed 50 characters.";
            }
          } else {
            if (!r.utr || !r.utr.trim()) {
              errs[`row_${r.id}_utr`] = "This field is required";
            } else if (r.utr.trim().length < 12) {
              errs[`row_${r.id}_utr`] = "UTR number must be exactly 12 digits";
            }
          }
        }
      }
    } else {
      const isCash = String(formData.paymentMode || "").toLowerCase().includes("cash");
      if (isCash) {
        if (formData.utr && formData.utr.length > 50) {
          errs.utr = "Cash Note cannot exceed 50 characters";
        }
      } else {
        if (!formData.utr || !formData.utr.trim()) {
          errs.utr = "This field is required";
        } else if (formData.utr.trim().length < 12) {
          errs.utr = "UTR number must be exactly 12 digits";
        }
      }
    }

    const hasScreenshots =
      (formData.screenshots && formData.screenshots.length > 0) ||
      (typeof formData.screenshot === "string" && formData.screenshot.trim().length > 0);
    if (isImageMandatory && !hasScreenshots) {
      errs.screenshot = "This field is required";
    }

    setErrors(errs);
    return errs;
  };

  const handleSubmitProof = async (e) => {
    if (e) e.preventDefault();
    if (!isEventSelected) {
      setErrors((prev) => ({ ...prev, eventName: "Event Name is required" }));
      toast.error("Please select an Event Name before submitting payment.");
      return;
    }
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      toast.error("Please fill required field");
      return;
    }

    try {
      setSubmitting(true);
      let finalMode = formData.paymentMode;
      let finalUtr = formData.utr.trim();
      let structuredSplits = [];
      let cashTotal = 0;
      let upiTotal = 0;

      if (isMultiSplit) {
        cashTotal = splitRows
          .filter((r) => String(r.mode || "").toLowerCase().includes("cash"))
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        upiTotal = splitRows
          .filter((r) => !String(r.mode || "").toLowerCase().includes("cash"))
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        
        if (splitRows.length === 1) {
          finalMode = splitRows[0].mode?.trim() || selectablePaymentModes[0]?.value || "";
          finalUtr = splitRows[0].utr?.trim() || (cashTotal > 0 ? "CASH" : "-");
        } else {
          finalMode = "Split";
          finalUtr = "SPLIT";
        }
        structuredSplits = splitRows.map((r) => {
          const isRowCash = String(r.mode || "").toLowerCase().includes("cash");
          const cashNoteVal = isRowCash ? (r.notes?.trim() || r.utr?.trim() || null) : null;
          return {
            mode: r.mode.trim(),
            amount: Number(r.amount),
            utr: isRowCash ? null : (r.utr ? r.utr.trim() : null),
            notes: cashNoteVal,
          };
        });
      } else {
        const isCash = String(formData.paymentMode || "").toLowerCase().includes("cash");
        finalUtr = formData.utr.trim() || (isCash ? "CASH" : "-");
        if (isCash) {
          cashTotal = Number(formData.amount);
        } else {
          upiTotal = Number(formData.amount);
        }
      }

      const cashSplitRow = isMultiSplit ? splitRows.find((r) => String(r.mode || "").toLowerCase().includes("cash")) : null;
      const rawCashNote = cashSplitRow ? (cashSplitRow.notes?.trim() || (cashSplitRow.utr && cashSplitRow.utr.toUpperCase() !== "CASH" ? cashSplitRow.utr.trim() : "")) : "";
      const cashTag = rawCashNote ? `[Cash Note: ${rawCashNote}]` : "";

      const splitNote = isMultiSplit
        ? `[Split Breakdown: ${splitRows.map((r) => `${r.mode}: ₹${r.amount}${r.utr ? ` (Ref: ${r.utr})` : ""}`).join(", ")}]`
        : "";

      const isSingleCash = !isMultiSplit && String(formData.paymentMode || "").toLowerCase().includes("cash");
      const singleCashNote = isSingleCash ? (formData.notes.trim() || (formData.utr && formData.utr.toUpperCase() !== "CASH" ? formData.utr.trim() : "")) : "";
      const singleCashTag = singleCashNote && !formData.notes.includes("[Cash Note:") ? `[Cash Note: ${singleCashNote}]` : "";

      const combinedNotes = [formData.notes.trim(), isMultiSplit ? cashTag : singleCashTag, splitNote].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join("\n");

      const screenshotsList = formData.screenshots && formData.screenshots.length > 0
        ? formData.screenshots
        : (formData.screenshot ? [formData.screenshot] : []);

      const matchedEv = (eventsList || []).find((e) =>
        (formData.eventId && String(e.id || e.eventId).toLowerCase() === String(formData.eventId).toLowerCase()) ||
        (formData.eventName && (e.title || e.name || e.eventName || "").trim().toLowerCase() === formData.eventName.trim().toLowerCase())
      );
      if (matchedEv && !isEventPublished(matchedEv)) {
        toast.warning("This event is not published yet. You can only pay for published events.");
        setSaving(false);
        return;
      }

      let submitEventId = formData.eventId;
      let submitEventName = formData.eventName;

      // When paying Previous Arrears Only, route the payment to the previous event that actually holds the arrear
      if (paymentScope === "PreviousArrears" && duesSummary?.arrearBreakdown && duesSummary.arrearBreakdown.length > 0) {
        const targetArrear = duesSummary.arrearBreakdown[0];
        if (targetArrear.eventId) submitEventId = targetArrear.eventId;
        if (targetArrear.eventName || targetArrear.title) {
          submitEventName = targetArrear.eventName || targetArrear.title;
        }
      }

      const payload = {
        eventId: submitEventId || undefined,
        memberId: formData.memberId || undefined,
        memberName: formData.memberName.trim(),
        eventName: submitEventName.trim(),
        amount: Number(formData.amount),
        paymentMode: finalMode,
        cashAmount: cashTotal > 0 ? cashTotal : undefined,
        upiAmount: upiTotal > 0 ? upiTotal : undefined,
        paymentScope: paymentScope || undefined,
        utr: finalUtr,
        paymentDate: formData.paymentDate
          ? formData.paymentDate.toISOString()
          : new Date().toISOString(),
        screenshot: screenshotsList[0] || formData.screenshot || null,
        screenshots: screenshotsList.length > 0 ? screenshotsList : null,
        notes: combinedNotes || null,
        splits: structuredSplits.length > 0 ? structuredSplits : undefined,
      };

      const res = await submitPaymentProofAsync(payload);
      toast.success("Payment successfull");

      addNotification({
        type: "PAYMENT_PENDING",
        title: "New Payment Submission",
        message: `Member ${formData.memberName} submitted payment of ₹${formData.amount} (${finalMode}, UTR: ${finalUtr}). Status: Pending verification.`,
        link: "/payments",
      });

      // Synchronize with Contribution module in real-time
      window.dispatchEvent(
        new CustomEvent("contribution_updated", {
          detail: { action: "submit", payload, result: res },
        })
      );

      onClose();
      if (onSuccess) onSuccess(res);
    } catch (err) {
      toast.error(err, "Failed to submit payment details");
      if (err?.response?.status === 404 || err?.response?.status === 409) {
        onClose();
        if (onSuccess) onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleScreenshotUpload = (e) => {
    if (!isEventSelected) {
      toast.warning("Please select an Event Name first before uploading payment screenshots.");
      return;
    }
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentList = formData.screenshots && formData.screenshots.length > 0
      ? formData.screenshots
      : (formData.screenshot ? [formData.screenshot] : []);

    if (currentList.length >= 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }

    const availableSlots = 3 - currentList.length;
    const filesToProcess = files.slice(0, availableSlots);

    let processedCount = 0;
    const newImages = [];

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`File ${file.name} is not an image file`);
        return;
      }
      const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // 6MB
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`File ${file.name} exceeds maximum limit of 6 MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        newImages.push(evt.target.result);
        processedCount++;
        if (processedCount === filesToProcess.length) {
          setFormData((prev) => {
            const existing = prev.screenshots && prev.screenshots.length > 0
              ? prev.screenshots
              : (prev.screenshot ? [prev.screenshot] : []);
            const updated = [...existing, ...newImages].slice(0, 3);
            return {
              ...prev,
              screenshots: updated,
              screenshot: updated[0] || "",
            };
          });
          setErrors((prev) => {
            const next = { ...prev };
            delete next.screenshot;
            return next;
          });
          toast.success(`${newImages.length} image(s) attached successfully`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveScreenshot = (index) => {
    setFormData((prev) => {
      const current = prev.screenshots && prev.screenshots.length > 0
        ? prev.screenshots
        : (prev.screenshot ? [prev.screenshot] : []);
      const updated = current.filter((_, i) => i !== index);
      return {
        ...prev,
        screenshots: updated,
        screenshot: updated[0] || "",
      };
    });
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Submit Payment Details"
      maxWidth="md"
      actions={
        <Stack direction="row" spacing={1.5}>
          <AppCancelButton onClick={onClose} />
          <Tooltip title={!isEventSelected ? "Please select an Event Name to proceed" : ""}>
            <span>
              <AppSaveButton
                onClick={handleSubmitProof}
                disabled={submitting || isFullySettled || !isEventSelected}
                sx={{
                  bgcolor: isFullySettled
                    ? (t) => (t.palette.mode === "dark" ? "rgba(22, 163, 74, 0.25) !important" : "rgba(22, 163, 74, 0.12) !important")
                    : !isEventSelected
                    ? undefined
                    : "#4a3f6b !important",
                  color: isFullySettled ? "#15803d !important" : "#ffffff !important",
                  fontWeight: 800,
                  "&.Mui-disabled": {
                    bgcolor: isFullySettled
                      ? (t) => (t.palette.mode === "dark" ? "rgba(22, 163, 74, 0.25) !important" : "rgba(22, 163, 74, 0.12) !important")
                      : undefined,
                    color: isFullySettled ? "#15803d !important" : undefined,
                  },
                  "&:hover": {
                    bgcolor: isFullySettled
                      ? "rgba(22, 163, 74, 0.18) !important"
                      : !isEventSelected
                      ? undefined
                      : "#3b325c !important",
                  },
                }}
              >
                {submitting ? "Saving..." : isFullySettled ? "✓ All Dues Settled" : "Save"}
              </AppSaveButton>
            </span>
          </Tooltip>
        </Stack>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
        {/* Row 1: Event Category & Event Name */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Type"
              value={formData.eventCategory}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              onClear={() => handleEventTypeChange("")}
              allowClear={!isAllEventsFilter}
              disabled={isAllEventsFilter}
              options={categoryOptions}
              placeholder="Select Event Type"
              error={!!errors.eventCategory}
              helperText={errors.eventCategory}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              value={formData.eventName}
              onChange={(e) => handleEventNameChange(e.target.value)}
              onClear={() => handleEventNameChange("")}
              allowClear={!isAllEventsFilter}
              disabled={isAllEventsFilter}
              options={filteredEventOptions}
              placeholder="Select Event Name"
              error={!!errors.eventName}
              helperText={errors.eventName}
              required
            />
          </Grid>
        </Grid>

        {/* Row 2: Member Name & Payment Date */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            {isAuthorityRole && membersList.length > 0 ? (
              <AppSelect
                label="Contributor / Member Name"
                value={formData.memberId || formData.memberName}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setFormData((prev) => ({ ...prev, memberId: "", memberName: "" }));
                    resetEventDependentFields(false);
                    return;
                  }
                  const matched = membersList.find(
                    (m) => String(m.id || m.memberId) === String(val) || (m.name || m.memberName) === val
                  );
                  setFormData((prev) => ({
                    ...prev,
                    memberId: matched ? matched.id || matched.memberId || "" : "",
                    memberName: matched ? matched.name || matched.memberName || "" : val,
                    amount: "",
                  }));
                  setPaymentScope("");
                  setDuesSummary(null);
                  const defaultMode = selectablePaymentModes[0]?.value || "";
                  setSplitRows([{ id: 1, mode: defaultMode, amount: "", utr: "" }]);
                  if (errors.memberName) setErrors((prev) => ({ ...prev, memberName: "" }));
                }}
                onClear={() => {
                  setFormData((prev) => ({ ...prev, memberId: "", memberName: "" }));
                  resetEventDependentFields(false);
                }}
                allowClear={!isAllEventsFilter}
                disabled={isAllEventsFilter}
                options={contributorOptions}
                placeholder="Select Contributor"
                error={!!errors.memberName}
                helperText={errors.memberName}
                required
              />
            ) : (
              <AppInput
                label="Contributor / Member Name"
                value={formData.memberName}
                onChange={(e) => setFormData((prev) => ({ ...prev, memberName: e.target.value }))}
                placeholder="Your full name"
                disabled={(!isAuthorityRole && !!authState?.fullName) || isAllEventsFilter}
                error={!!errors.memberName}
                helperText={errors.memberName}
                required
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateInput
              label="Payment Date"
              value={formData.paymentDate}
              onChange={(newVal) => setFormData((prev) => ({ ...prev, paymentDate: newVal }))}
              disableFuture
              maxDate={dayjs()}
              required
            />
          </Grid>
        </Grid>

        {/* Row 3: Payment Scope & Fixed Contribution Amount */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Payment Target / Scope"
              placeholder={
                !formData.eventName
                  ? "Select event first"
                  : paymentScopeOptions.length === 0
                  ? "No active dues"
                  : "Select payment target"
              }
              value={paymentScope}
              onChange={(e) => {
                handlePaymentScopeChange(e.target.value);
                setErrors((prev) => {
                  if (!prev.paymentScope) return prev;
                  const next = { ...prev };
                  delete next.paymentScope;
                  return next;
                });
              }}
              onClear={() => handlePaymentScopeChange("")}
              allowClear
              options={paymentScopeOptions}
              disabled={!formData.eventName || !duesSummary || paymentScopeOptions.length === 0}
              error={!!errors.paymentScope}
              helperText={
                errors.paymentScope ||
                (!formData.eventName
                  ? "Choose an event above to view payment scopes"
                  : isFullySettled
                  ? "All dues settled"
                  : "")
              }
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Contribution Amount (₹)"
              type="text"
              value={
                !isNaN(Number(formData.amount)) && Number(formData.amount) > 0
                  ? formatWholeNumber(formData.amount)
                  : "0"
              }
              disabled={true}
              placeholder="0"
              error={!!errors.amount}
              helperText={
                errors.amount ||
                (isFullySettled
                  ? " All dues settled"
                  : !formData.eventName
                  ? "Please select an event above to calculate amount"
                  : !paymentScope
                  ? "Please choose a payment target scope"
                  : Number(formData.amount || 0) > 0
                  ? `Fixed from target scope: ${formatWholeCurrency(formData.amount || 0)}`
                  : "")
              }
              required
            />
          </Grid>
        </Grid>

        {/* Live Contribution & Dues Summary Card */}
        {duesSummary && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              background: (t) =>
                t.palette.mode === "dark"
                  ? "linear-gradient(135deg, rgba(74, 63, 107, 0.25) 0%, rgba(30, 27, 46, 0.4) 100%)"
                  : "linear-gradient(135deg, rgba(74, 63, 107, 0.06) 0%, rgba(99, 102, 241, 0.03) 100%)",
              border: "1.5px solid",
              borderColor: (t) =>
                t.palette.mode === "dark" ? "rgba(129, 140, 248, 0.25)" : "rgba(74, 63, 107, 0.18)",
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    bgcolor: "primary.main",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ReceiptIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
                  Dues Status
                </Typography>
              </Stack>
              {duesSummary.status && (
                <Chip
                  label={`Status: ${duesSummary.status}`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor:
                      String(duesSummary.status).toLowerCase() === "paid"
                        ? "rgba(22, 163, 74, 0.15)"
                        : "rgba(234, 179, 8, 0.15)",
                    color:
                      String(duesSummary.status).toLowerCase() === "paid" ? "#16a34a" : "#b45309",
                  }}
                />
              )}
            </Box>

            <Grid container spacing={1.5} textAlign="center">
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }}>
                  Current Event Dues
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={800}
                  color={duesSummary.currentEventDue > 0 ? "error.main" : "success.main"}
                >
                  {formatWholeCurrency(duesSummary.currentEventDue ?? 0)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 4 }} sx={{ borderLeft: (t) => `1px solid ${t.palette.divider}` }}>
                <Tooltip title={arrearTooltipContent} arrow enterDelay={100}>
                  <Box sx={{ cursor: duesSummary.previousArrears > 0 ? "help" : "default" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: 0.3 }}
                    >
                      Previous Arrears {duesSummary.previousArrears > 0 && <InfoIcon sx={{ fontSize: 13, color: "error.main" }} />}
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={800}
                      color={duesSummary.previousArrears > 0 ? "error.main" : "text.secondary"}
                      sx={{ textDecoration: duesSummary.previousArrears > 0 ? "underline dotted" : "none" }}
                    >
                      {formatWholeCurrency(duesSummary.previousArrears || 0)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Grid>
              <Grid size={{ xs: 4 }} sx={{ borderLeft: (t) => `1px solid ${t.palette.divider}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }}>
                  Total Due
                </Typography>
                <Typography variant="body1" fontWeight={900} color={duesSummary.totalDue > 0 ? "error.main" : "success.main"}>
                  {formatWholeCurrency(duesSummary.totalDue ?? 0)}
                </Typography>
              </Grid>
            </Grid>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 1.2,
                fontSize: "0.7rem",
                fontStyle: "italic",
                textAlign: "center",
                opacity: 0.85,
              }}
            >
                
            </Typography>
          </Paper>
        )}

        {/* Multi-Mode Split Breakdown Card (Add Row) */}
        {isMultiSplit && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: (t) =>
                t.palette.mode === "dark" ? "rgba(30, 27, 46, 0.6)" : "rgba(74, 63, 107, 0.04)",
              border: "1.5px solid",
              borderColor: (t) =>
                errors.split && (splitDifference !== 0 || !errors.split.includes("Allocated breakdown total"))
                  ? "error.main"
                  : t.palette.mode === "dark"
                  ? "rgba(129, 140, 248, 0.3)"
                  : "rgba(74, 63, 107, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    bgcolor: "secondary.main",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SplitIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  Multi-Mode Payment Breakdown
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={
                    !isEventSelected
                      ? "⚠️ Select Event Name First"
                      : isFullySettled || (targetAmount === 0 && allocatedSplitSum === 0)
                      ? "✓ Dues Cleared: ₹0"
                      : splitDifference === 0
                      ? `✓ Allocated: ${formatWholeCurrency(allocatedSplitSum)} / ${formatWholeCurrency(targetAmount)}`
                      : splitDifference > 0
                      ? `Remaining: ${formatWholeCurrency(splitDifference)}`
                      : `Exceeds: ${formatWholeCurrency(Math.abs(splitDifference))}`
                  }
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor:
                      !isEventSelected
                        ? "rgba(234, 179, 8, 0.15)"
                        : isFullySettled || (targetAmount === 0 && allocatedSplitSum === 0) || splitDifference === 0
                        ? "rgba(22, 163, 74, 0.15)"
                        : splitDifference > 0
                        ? "rgba(234, 179, 8, 0.15)"
                        : "rgba(220, 38, 38, 0.15)",
                    color:
                      !isEventSelected
                        ? "#b45309"
                        : isFullySettled || (targetAmount === 0 && allocatedSplitSum === 0) || splitDifference === 0
                        ? "#16a34a"
                        : splitDifference > 0
                        ? "#b45309"
                        : "#dc2626",
                  }}
                />
                <Tooltip
                  title={
                    !isEventSelected
                      ? "Please select an Event Name above first"
                      : targetAmount <= 0
                      ? "Select payment target scope first"
                      : selectablePaymentModes.length > 0 && splitRows.length >= selectablePaymentModes.length
                      ? "All available payment modes have been added (1 row per mode)"
                      : splitDifference <= 0
                      ? "All amount is already allocated"
                      : "Add payment mode row"
                  }
                >
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAddSplitRow}
                      disabled={isAddRowDisabled}
                      startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        py: 0.4,
                        px: 1.2,
                        bgcolor: isAddRowDisabled ? undefined : "#7c3aed !important",
                        "&:hover": { bgcolor: isAddRowDisabled ? undefined : "#6d28d9 !important" },
                        borderRadius: "8px",
                        textTransform: "none",
                      }}
                    >
                      Add Row
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Box>

            {!isEventSelected && (
              <Box
                sx={{
                  p: 1,
                  mb: 1.2,
                  borderRadius: "8px",
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(234, 179, 8, 0.1)" : "rgba(234, 179, 8, 0.08)"),
                  border: "1px dashed rgba(234, 179, 8, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: "#b45309", fontWeight: 700 }}>
                  ⚠️ Please select an Event Name above to enable payment breakdown and mode selection.
                </Typography>
              </Box>
            )}

            {errors.split && (splitDifference !== 0 || !errors.split.includes("Allocated breakdown total")) && (
              <Typography variant="caption" color="error" sx={{ display: "block", mb: 1, fontWeight: 700 }}>
                ⚠️ {errors.split}
              </Typography>
            )}

            {/* Split Rows */}
            <Stack spacing={1.2}>
              {splitRows.map((row, idx) => {
                const isRowCash = String(row.mode || "").toLowerCase().includes("cash");
                return (
                  <Paper
                    key={row.id}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: "10px",
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#fff"),
                      borderColor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                    }}
                  >
                    <Grid container spacing={1.5} alignItems="flex-start">
                      <Grid size={{ xs: 12, sm: 3.5 }}>
                        <AppSelect
                          label={`Mode ${idx + 1}`}
                          value={row.mode || ""}
                          placeholder="Select Payment Mode"
                          allowClear
                          disabled={!isEventSelected || isFullySettled}
                          onChange={(e) => handleSplitRowChange(row.id, "mode", e.target.value)}
                          onClear={() => handleSplitRowChange(row.id, "mode", "")}
                          options={selectablePaymentModes.map((m) => {
                            const isUsedInOtherRow = splitRows.some(
                              (r) => r.id !== row.id && r.mode && String(r.mode || "").trim().toLowerCase() === String(m.value || "").trim().toLowerCase()
                            );
                            return {
                              label: isUsedInOtherRow ? `${m.label} (Already added)` : m.label,
                              value: m.value,
                              disabled: isUsedInOtherRow,
                            };
                          })}
                          size="small"
                          error={!!errors[`row_${row.id}_mode`]}
                          helperText={!isEventSelected ? "Select event name first" : errors[`row_${row.id}_mode`]}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2.5 }}>
                        <AppInput
                          label="Amount (₹)"
                          type="text"
                          inputMode="numeric"
                          restrictType="numberonly"
                          placeholder="0"
                          value={row.amount}
                          disabled={!isEventSelected || isFullySettled}
                          onChange={(e) => handleSplitRowChange(row.id, "amount", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-" || e.key === ".") {
                              e.preventDefault();
                            }
                          }}
                          size="small"
                          error={!!errors[`row_${row.id}_amount`]}
                          helperText={!isEventSelected ? "Select event name first" : errors[`row_${row.id}_amount`]}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 10, sm: 5 }}>
                        <Box sx={{ display: "flex", gap: 0.8, alignItems: "flex-start" }}>
                          <Box sx={{ flex: 1 }}>
                            <AppInput
                              label={isRowCash ? "Cash Note" : "UTR/Ref"}
                              placeholder={isRowCash ? "Handover note" : "12-digit UTR ref"}
                              value={row.utr}
                              disabled={!isEventSelected || isFullySettled}
                              restrictType={isRowCash ? undefined : "alphanumeric"}
                              onChange={(e) => handleSplitRowChange(row.id, "utr", e.target.value)}
                              onBlur={() => handleSplitRowBlur(row.id, "utr")}
                              onKeyDown={(e) => {
                                if (!isRowCash) {
                                  const isControlKey =
                                    e.key === "Backspace" ||
                                    e.key === "Delete" ||
                                    e.key === "Tab" ||
                                    e.key === "Escape" ||
                                    e.key === "Enter" ||
                                    e.key === "ArrowLeft" ||
                                    e.key === "ArrowRight" ||
                                    e.key === "ArrowUp" ||
                                    e.key === "ArrowDown" ||
                                    e.key === "Home" ||
                                    e.key === "End" ||
                                    e.ctrlKey ||
                                    e.metaKey;
                                  if (!isControlKey && !/^[a-zA-Z0-9]$/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }
                              }}
                              size="small"
                              error={!!errors[`row_${row.id}_utr`]}
                              helperText={!isEventSelected ? "Select event name first" : errors[`row_${row.id}_utr`]}
                              required={!isRowCash}
                              maxLength={isRowCash ? 50 : 12}
                              endAdornment={
                                isRowCash ? (
                                  <InputAdornment position="end" sx={{ mr: 0.5 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        color: (row.utr || "").length >= 50 ? "warning.main" : "text.secondary",
                                        userSelect: "none",
                                      }}
                                    >
                                      {(row.utr || "").length}/50
                                    </Typography>
                                  </InputAdornment>
                                ) : undefined
                              }
                            />
                          </Box>
                          {!isRowCash && Boolean(row.mode) && qrConfig?.isConfigured && (
                            <Tooltip title={`Open QR Scanner for ${row.mode} (₹${row.amount || 0})`}>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!isEventSelected || isFullySettled}
                                onClick={() => {
                                  setActiveQrModal({
                                    open: true,
                                    rowId: row.id,
                                    mode: row.mode,
                                    amount: row.amount,
                                  });
                                }}
                                startIcon={<QrCodeIcon sx={{ fontSize: 15 }} />}
                                sx={{
                                  height: 36,
                                  mt: "22px",
                                  borderRadius: "8px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  textTransform: "none",
                                  borderColor: getModeColor(row.mode),
                                  color: getModeColor(row.mode),
                                  bgcolor: `${getModeColor(row.mode)}12`,
                                  "&:hover": {
                                    borderColor: getModeColor(row.mode),
                                    bgcolor: `${getModeColor(row.mode)}22`,
                                  },
                                  whiteSpace: "nowrap",
                                  px: 1.2,
                                }}
                              >
                                Scan
                              </Button>
                            </Tooltip>
                          )}
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: "center", pt: { sm: 2.8, xs: 1 } }}>
                        <Tooltip title={!isEventSelected ? "Select event first" : splitRows.length > 1 ? "Remove this row" : "At least 1 row required"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setRowToDelete(row.id)}
                              disabled={!isEventSelected || splitRows.length <= 1}
                              sx={{
                                color: isEventSelected && splitRows.length > 1 ? "error.main" : "text.disabled",
                                p: 0.6,
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>
        )}



        {/* Row 5: Multi-Image Upload & Additional Notes side-by-side */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: errors.screenshot ? "error.main" : "text.secondary" }}>
                Payment Screenshots (Max 3 Images){" "}
                {isImageMandatory ? (
                  <Box component="span" sx={{ color: "error.main", fontWeight: 800 }}>*</Box>
                ) : (
                  <Box component="span" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.72rem", ml: 0.5 }}>
                    
                  </Box>
                )}
              </Typography>
              <Typography
                variant="caption"
                fontWeight={800}
                color={
                  (formData.screenshots?.length || (formData.screenshot ? 1 : 0)) === 3
                    ? "error.main"
                    : errors.screenshot
                    ? "error.main"
                    : "primary.main"
                }
              >
                {(formData.screenshots?.length || (formData.screenshot ? 1 : 0))}/3 Uploaded
              </Typography>
            </Box>

            <Grid container spacing={1.5}>
              {(formData.screenshots && formData.screenshots.length > 0
                ? formData.screenshots
                : (formData.screenshot ? [formData.screenshot] : [])
              ).map((imgSrc, idx) => (
                <Grid size={{ xs: 6, sm: 4 }} key={idx}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: "10px",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                      borderColor: "#6366f1",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                      "&:hover": { transform: "scale(1.02)", borderColor: "primary.main" },
                    }}
                    onClick={() => setPreviewImage(imgSrc)}
                  >
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveScreenshot(idx);
                      }}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        bgcolor: "rgba(239, 68, 68, 0.9)",
                        color: "#fff",
                        p: 0.3,
                        "&:hover": { bgcolor: "#dc2626" },
                        zIndex: 2,
                      }}
                      title="Remove Image"
                    >
                      <DeleteIcon sx={{ fontSize: "0.9rem" }} />
                    </IconButton>
                    <Tooltip title="Click to preview full image">
                      <Box
                        component="img"
                        src={imgSrc}
                        alt={`Receipt ${idx + 1}`}
                        sx={{
                          width: "100%",
                          height: 85,
                          objectFit: "cover",
                          borderRadius: "6px",
                        }}
                      />
                    </Tooltip>
                    <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5, color: "#4f46e5", fontSize: "0.68rem" }}>
                      Image #{idx + 1} (Click to Preview)
                    </Typography>
                  </Paper>
                </Grid>
              ))}

              {(formData.screenshots?.length || (formData.screenshot ? 1 : 0)) < 3 && (
                <Grid size={{ xs: 12, sm: (formData.screenshots?.length || (formData.screenshot ? 1 : 0)) > 0 ? 4 : 12 }}>
                  <Tooltip title={!isEventSelected ? "Please select an Event Name first to attach screenshots" : ""}>
                    <Box
                      component="label"
                      sx={{
                        border: errors.screenshot ? "1.5px dashed #ef4444" : "1.5px dashed",
                        borderColor: errors.screenshot
                          ? "#ef4444"
                          : ((t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)")),
                        borderRadius: "10px",
                        p: 1.1,
                        minHeight: (formData.screenshots?.length || (formData.screenshot ? 1 : 0)) > 0 ? 115 : 46,
                        display: "flex",
                        flexDirection: (formData.screenshots?.length || (formData.screenshot ? 1 : 0)) > 0 ? "column" : "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        cursor: !isEventSelected || isFullySettled ? "not-allowed" : "pointer",
                        opacity: !isEventSelected || isFullySettled ? 0.6 : 1,
                        pointerEvents: !isEventSelected || isFullySettled ? "none" : undefined,
                        bgcolor: errors.screenshot
                          ? "rgba(239, 68, 68, 0.05)"
                          : ((t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)")),
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: !isEventSelected || isFullySettled
                            ? undefined
                            : errors.screenshot
                            ? "#dc2626"
                            : ((t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b")),
                          bgcolor: !isEventSelected || isFullySettled
                            ? undefined
                            : (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.07)"),
                        },
                      }}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        multiple
                        hidden
                        disabled={!isEventSelected || isFullySettled}
                        onChange={handleScreenshotUpload}
                      />
                      <UploadIcon
                        sx={{
                          fontSize: 20,
                          color: errors.screenshot
                            ? "#ef4444"
                            : ((t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b")),
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: errors.screenshot ? "#ef4444" : "text.secondary" }}
                      >
                        {!isEventSelected
                          ? "Select Event Name above to attach image"
                          : (formData.screenshots?.length || (formData.screenshot ? 1 : 0)) > 0
                          ? "+ Add Image (Max 6MB)"
                          : "Click to attach image (Max 6MB)"}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              )}
            </Grid>

            {errors.screenshot && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.5,
                  fontSize: "0.75rem",
                  color: (theme) => (theme.palette.mode === "dark" ? "#f87171" : "#ef4444"),
                }}
              >
                {errors.screenshot}
              </Typography>
            )}
          </Grid>

          {/* Right Column: Additional Notes */}
          <Grid size={{ xs: 12, md: 5 }}>
            <AppTextArea
              label="Additional Notes"
              value={formData.notes}
              disabled={!isEventSelected || isFullySettled}
              onChange={(e) => {
                if (!isEventSelected) return;
                const val = e.target.value.slice(0, 300);
                setFormData((prev) => ({ ...prev, notes: val }));
              }}
              placeholder={!isEventSelected ? "Please select an Event Name above first" : "e.g. Paid via GPay account"}
              rows={4}
              maxLength={300}
            />
          </Grid>
        </Grid>
      </Box>

      {/* ── Active Row QR Code Scanner Modal (Opens on GPay/PhonePe/UPI selection) ── */}
      <AppDialog
        open={Boolean(activeQrModal?.open)}
        onClose={() => setActiveQrModal(null)}
        title={`Scan to Pay via ${activeQrModal?.mode || "UPI"}`}
        maxWidth="xs"
      >
        <Box sx={{ p: 2, textAlign: "center" }}>
          {activeRowQrData?.qrImageUrl ? (
            <Box
              sx={{
                display: "inline-block",
                p: 1.5,
                bgcolor: "#fff",
                borderRadius: "14px",
                border: `2.5px solid ${getModeColor(activeQrModal?.mode)}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                mb: 1.5,
              }}
            >
              <Box
                component="img"
                src={activeRowQrData.qrImageUrl}
                alt="Payment QR Code"
                sx={{ width: 210, height: 210, objectFit: "contain", display: "block" }}
              />
              <Chip
                label={`Pay with ${activeQrModal?.mode || "UPI"}`}
                size="small"
                sx={{
                  mt: 0.8,
                  fontWeight: 800,
                  bgcolor: `${getModeColor(activeQrModal?.mode)}15`,
                  color: getModeColor(activeQrModal?.mode),
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                py: 3,
                px: 2,
                mb: 2,
                borderRadius: "12px",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(234, 179, 8, 0.1)" : "rgba(234, 179, 8, 0.08)"),
                border: "1px dashed rgba(234, 179, 8, 0.4)",
              }}
            >
              <Typography variant="body2" fontWeight={800} sx={{ color: "#b45309", mb: 0.5 }}>
                ⚠️ Payment QR Not Configured
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Payment QR for this event type has not been configured yet. Once updated in Settings, the QR code and UPI scanner will appear here.
              </Typography>
            </Box>
          )}

          <Typography variant="h5" fontWeight={900} sx={{ color: "primary.main", mb: 0.5 }}>
            {formatWholeCurrency(activeQrModal?.amount || formData.amount || 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {formData.eventName || "Contribution"} • {formData.memberName || "Member"}
          </Typography>

          {activeRowQrData?.upiId ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                <Typography variant="caption" color="text.secondary">
                  Payee:
                </Typography>
                <Typography variant="caption" fontWeight={800}>
                  {activeRowQrData.receiverName || "Contribution Management"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  UPI ID:
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" fontWeight={800} sx={{ fontFamily: "monospace", color: "#7c3aed" }}>
                    {activeRowQrData.upiId}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyUpi(activeRowQrData.upiId)}
                    sx={{ p: 0.2 }}
                  >
                    {copiedUpi ? <CheckIcon sx={{ fontSize: 14, color: "success.main" }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                  </IconButton>
                </Stack>
              </Box>
            </Paper>
          ) : null}

          <Button
            fullWidth
            variant="contained"
            onClick={() => setActiveQrModal(null)}
            sx={{
              bgcolor: `${getModeColor(activeQrModal?.mode)} !important`,
              fontWeight: 800,
              py: 1,
              borderRadius: "10px",
              textTransform: "none",
            }}
          >
            I Have Paid • Enter UTR Reference
          </Button>
        </Box>
      </AppDialog>

      {/* ── Fullscreen Receipt Screenshot Image Preview Modal ── */}
      <AppDialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Payment Receipt Screenshot Preview"
        maxWidth="md"
        actions={
          <AppButton variant="outlined" onClick={() => setPreviewImage(null)}>
            Close Preview
          </AppButton>
        }
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 1.5,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(0,0,0,0.4)" : "#f8fafc"),
            borderRadius: "12px",
          }}
        >
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="Receipt Screenshot Preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "72vh",
                objectFit: "contain",
                borderRadius: "10px",
                boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </Box>
      </AppDialog>

      {/* ── Delete Confirmation Dialog for Payment Mode Rows ── */}
      <AppConfirmDialog
        open={Boolean(rowToDelete)}
        onClose={() => setRowToDelete(null)}
        onConfirm={() => {
          if (rowToDelete) {
            handleRemoveSplitRow(rowToDelete);
            setRowToDelete(null);
          }
        }}
        title="Delete Payment Mode Row"
        content="Are you sure you want to remove this payment mode row?"
        confirmText="Delete"
        confirmColor="error"
      />
    </AppDialog>
  );
}
