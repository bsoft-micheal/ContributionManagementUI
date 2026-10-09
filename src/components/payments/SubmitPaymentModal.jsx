import React, { useState, useEffect, useMemo } from "react";
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

import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppTextArea from "../common/AppTextArea";
import AppButton from "../common/AppButton";
import AppDialog from "../common/AppDialog";
import { useAppToast } from "../common/AppToast";
import { useNotifications } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  submitPaymentProofAsync,
  getPaymentContextAsync,
} from "../../services/paymentService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync } from "../../services/eventService";
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
  initialArrearBreakdown = [],
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
    amount: initialAmount || "",
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

  // Multi-Mode Split is exclusively used
  const [isMultiSplit, setIsMultiSplit] = useState(true);
  const [splitRows, setSplitRows] = useState([
    { id: 1, mode: "GPay", amount: "", utr: "" },
    { id: 2, mode: "Cash", amount: "", utr: "" },
  ]);
  const [activeQrModal, setActiveQrModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const allocatedSplitSum = useMemo(() => {
    return Math.round(splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100) / 100;
  }, [splitRows]);

  const targetAmount = Number(formData.amount) || 0;
  const splitDifference = Math.round((targetAmount - allocatedSplitSum) * 100) / 100;

  const maxPayableDue = useMemo(() => {
    if (!duesSummary) return null;
    const currentDue = duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : duesSummary.baseAmount;
    const arrears = duesSummary.previousArrears || 0;
    const total = (duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0) + arrears;

    if (paymentScope === "CurrentEvent") return currentDue;
    if (paymentScope === "PreviousArrears") return arrears;
    if (paymentScope === "AllOutstanding") return total > 0 ? total : duesSummary.totalDue;
    return duesSummary.totalDue > 0 ? duesSummary.totalDue : total;
  }, [duesSummary, paymentScope]);

  const isFullySettled = useMemo(() => {
    if (duesSummary) {
      return duesSummary.totalDue === 0 || String(duesSummary.status || "").toLowerCase() === "paid";
    }
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
    const upiId = cfg?.upiId || duesSummary?.qrUpiId || "danielrobertanto604@okicici";
    const receiverName = cfg?.receiverName || duesSummary?.qrReceiverName || "Contribution Management";
    const qrImage = cfg?.qrImage || duesSummary?.qrImage || null;
    const qrMode = qrImage ? "uploaded" : (cfg?.qrMode || "generated");

    return {
      eventType: resolvedCategory || formData.eventName || "Contribution",
      receiverName,
      upiId,
      qrReceiverName: receiverName,
      qrUpiId: upiId,
      qrMode,
      qrImage,
      isConfigured: true,
    };
  }, [resolvedCategory, formData.eventName, duesSummary]);

  const activeRowQrData = useMemo(() => {
    if (!activeQrModal) return null;
    const rowAmt = Number(activeQrModal.amount) || Number(formData.amount) || 0;
    const modeLabel = activeQrModal.mode || "UPI";
    return generateDynamicPaymentQr({
      amount: rowAmt,
      note: `${formData.eventName || "Contribution"} - ${formData.memberName || "Member"} (${modeLabel})`,
      customConfig: qrConfig?.isConfigured ? qrConfig : undefined,
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
    const list = duesSummary?.arrearBreakdown || initialArrearBreakdown || [];
    const totalArrears =
      duesSummary?.previousArrears !== undefined && duesSummary?.previousArrears !== null
        ? Number(duesSummary.previousArrears)
        : list.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    if (!list || list.length === 0) {
      return totalArrears > 0
        ? `Arrears accumulated: ₹${totalArrears.toLocaleString()}`
        : "No previous arrears";
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
              <span style={{ fontWeight: 800, color: "#fff" }}>₹{Number(item.amount || 0).toLocaleString()}</span>
            </Box>
          ))}
        </Stack>
        <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", mt: 0.8, pt: 0.5, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.78rem", color: "#fca5a5" }}>
          <span>Total Arrears:</span>
          <span>₹{totalArrears.toLocaleString()}</span>
        </Box>
      </Box>
    );
  }, [duesSummary?.arrearBreakdown, duesSummary?.previousArrears, initialArrearBreakdown]);

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
        if (Array.isArray(eventsRes)) setEventsList(eventsRes);
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

  // Dynamic payment modes
  const dynamicPaymentModes = useMemo(() => {
    const list = [];
    const set = new Set();
    (dbPaymentModes || [])
      .filter((m) => m.isActive !== false)
      .forEach((m) => {
        const name = m.paymentModeName || m.name || m.modeName;
        if (name && !set.has(name.toLowerCase())) {
          set.add(name.toLowerCase());
          list.push({
            label: name,
            value: name,
            color: getModeColor(name),
          });
        }
      });
    if (formData.paymentMode && !set.has(formData.paymentMode.toLowerCase())) {
      set.add(formData.paymentMode.toLowerCase());
      list.push({
        label: formData.paymentMode,
        value: formData.paymentMode,
        color: getModeColor(formData.paymentMode),
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
  }, [dbPaymentModes, formData.paymentMode]);


  useEffect(() => {
    if (dynamicPaymentModes.length > 0) {
      setFormData((prev) => {
        const exists = dynamicPaymentModes.some(
          (m) => m.value.toLowerCase() === (prev.paymentMode || "").toLowerCase()
        );
        if (!exists || !prev.paymentMode) {
          return { ...prev, paymentMode: dynamicPaymentModes[0].value };
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
      const isPaidInitial =
        String(initialStatus || "").toLowerCase() === "paid" ||
        (initialCurrentDue === 0 && initialPreviousArrears === 0 && initialTotalDue === 0);
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

      setFormData((prev) => ({
        ...prev,
        eventId: initialEventId || prev.eventId,
        memberId: resolvedMemId || prev.memberId,
        eventCategory: matchedCategory || prev.eventCategory,
        eventName: matchedEvName || prev.eventName,
        memberName: resolvedMemName || prev.memberName,
        amount: isPaidInitial ? "0.00" : (resolvedAmount ? String(resolvedAmount) : prev.amount),
        paymentMode: prev.paymentMode || (dynamicPaymentModes.length > 0 ? dynamicPaymentModes[0]?.value : ""),
        paymentDate: dayjs(),
        utr: "",
        notes: "",
        screenshot: "",
      }));
      if (isPaidInitial) {
        setSplitRows((rows) => rows.map((r) => ({ ...r, amount: "0.00" })));
      }
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
    eventsList,
    membersList,
    dynamicPaymentModes,
    authState?.fullName,
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

  // Dynamic Dues Context Loader
  useEffect(() => {
    if (open && (formData.eventId || formData.eventName || formData.memberId || formData.memberName)) {
      const loadContext = async () => {
        try {
          const res = await getPaymentContextAsync({
            eventId: formData.eventId || undefined,
            memberId: formData.memberId || undefined,
            eventName: formData.eventName || undefined,
            memberName: formData.memberName || undefined,
          });

          const matchedEvent = (eventsList || []).find(
            (ev) =>
              (ev.title || ev.name || ev.eventName) === formData.eventName ||
              (ev.id || ev.eventId) === formData.eventId
          );

          if (res) {
            const isPaidStatus =
              String(res.status || initialStatus || "").toLowerCase() === "paid" ||
              String(res.status || initialStatus || "").toLowerCase() === "verified" ||
              String(res.status || initialStatus || "").toLowerCase() === "completed" ||
              (res.totalDue === 0 && (res.currentEventDue ?? 0) === 0);
            const isSubmittedProps = initialIsSubmitted || (initialCurrentDue === 0 && initialPreviousArrears === 0 && initialTotalDue === 0) || isPaidStatus;

            const fallbackEvAmt = () => {
              if (matchedEvent) {
                const base = Number(matchedEvent.baseAmount || matchedEvent.totalExpectedAmount || 0);
                const count = Number(matchedEvent.participantCount || matchedEvent.participants?.length || 0);
                if (count > 0 && base > 0) return Math.round(base / count);
                if (base > 0) return base;
              }
              return 0;
            };
            const resolvedFallback = fallbackEvAmt();

            const currentEvDue = isPaidStatus
              ? 0
              : (isSubmittedProps
                ? (initialCurrentDue ?? (resolvedFallback > 0 ? resolvedFallback : 0))
                : Number(res.currentEventDue || res.amount || matchedEvent?.amount || matchedEvent?.contributionAmount || resolvedFallback || 0));

            const prevArrears = isPaidStatus
              ? 0
              : (isSubmittedProps
                ? (initialPreviousArrears ?? 0)
                : Number(res.previousArrears ?? res.arrears ?? 0));

            const baseAmt = Number(
              res.amount || matchedEvent?.amount || matchedEvent?.contributionAmount || (currentEvDue > 0 ? currentEvDue : resolvedFallback)
            );

            let breakdown = (res.arrearBreakdown && res.arrearBreakdown.length > 0)
              ? res.arrearBreakdown
              : (initialArrearBreakdown || []);

            // Dynamically filter out deleted events from arrear breakdown
            breakdown = breakdown.filter(item => {
               const evName = String(item.eventName || "").toLowerCase().trim();
               const evId = String(item.eventId || "").trim();
               return (eventsList || []).some(e => 
                 (evId && String(e.eventId || e.id) === evId) || 
                 (evName && String(e.eventName || e.title || e.name || "").toLowerCase().trim() === evName)
               );
            });

            const filteredPrevArrears = isPaidStatus 
              ? 0 
              : breakdown.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

            // Re-evaluate total based on filtered arrears
            const total = isPaidStatus ? 0 : Number((currentEvDue + filteredPrevArrears).toFixed(2));

            setDuesSummary({
              currentEventDue: currentEvDue,
              previousArrears: filteredPrevArrears,
              totalDue: total,
              status: isPaidStatus ? "Paid" : (isSubmittedProps ? (initialStatus || "Pending") : (res.status || (currentEvDue === 0 && baseAmt > 0 ? "Paid" : "Pending"))),
              baseAmount: baseAmt,
              arrearBreakdown: filteredPrevArrears === 0 ? [] : breakdown,
            });
            if (!paymentScope) setPaymentScope(prevArrears > 0 ? "AllOutstanding" : "CurrentEvent");

            const resolvedDuesAmount = (isPaidStatus || total === 0)
              ? "0.00"
              : (total > 0
                ? String(total)
                : currentEvDue > 0
                ? String(currentEvDue)
                : (res.amount ? String(res.amount) : prev.amount));

            setFormData((prev) => ({
              ...prev,
              eventName: res.eventName || prev.eventName,
              memberName: res.memberName || prev.memberName || authState?.fullName || "",
              amount: resolvedDuesAmount,
            }));

            if (isPaidStatus || total === 0) {
              setSplitRows((rows) => rows.map((r) => ({ ...r, amount: "0.00" })));
            }
          } else if (matchedEvent) {
            const base = Number(matchedEvent.baseAmount || matchedEvent.totalExpectedAmount || 0);
            const count = Number(matchedEvent.participantCount || matchedEvent.participants?.length || 0);
            const fallbackAmt = (count > 0 && base > 0) ? Math.round(base / count) : (base > 0 ? base : 0);
            const currentEvDue = Number(matchedEvent.amount || matchedEvent.contributionAmount || 0) || fallbackAmt;
            setDuesSummary({
              currentEventDue: currentEvDue,
              previousArrears: 0,
              totalDue: currentEvDue,
              status: "Pending",
              baseAmount: currentEvDue,
              arrearBreakdown: initialArrearBreakdown || [],
            });
            setFormData((prev) => ({
              ...prev,
              amount: prev.amount || String(currentEvDue),
            }));
          }
        } catch {
          // Silent fallback
        }
      };
      loadContext();
    }
  }, [
    open,
    formData.eventId,
    formData.memberId,
    formData.eventName,
    formData.memberName,
    eventsList,
    initialArrearBreakdown,
  ]);

  const paymentScopeOptions = useMemo(() => {
    if (!duesSummary) return [];
    const opts = [];
    const currentDue = duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : duesSummary.baseAmount;
    const arrears = duesSummary.previousArrears || 0;
    const total = (duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0) + arrears;

    const fmt = (num) => Number(num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (total > 0) {
      opts.push({
        label: `All Outstanding (₹${fmt(total)})`,
        value: "AllOutstanding",
      });
    }
    if (currentDue > 0) {
      opts.push({
        label: `Current Event Only (₹${fmt(currentDue)})${duesSummary.status === "Paid" ? " [Paid]" : ""}`,
        value: "CurrentEvent",
      });
    }
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
    if (!duesSummary) return;
    const currentDue = duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : duesSummary.baseAmount;
    const arrears = duesSummary.previousArrears || 0;
    const total = (duesSummary.currentEventDue > 0 ? duesSummary.currentEventDue : 0) + arrears;

    let amt = total > 0 ? total : duesSummary.totalDue;
    if (scope === "CurrentEvent") amt = currentDue;
    if (scope === "PreviousArrears") amt = arrears;
    if (scope === "AllOutstanding") amt = total > 0 ? total : duesSummary.totalDue;

    setFormData((prev) => ({ ...prev, amount: String(amt) }));

    if (isMultiSplit && splitRows.length > 0) {
      const count = splitRows.length;
      const baseShare = Math.floor((amt / count) * 100) / 100;
      const remainder = Math.round((amt - baseShare * count) * 100) / 100;
      setSplitRows((rows) =>
        rows.map((r, i) => ({
          ...r,
          amount: i === 0 ? String((baseShare + remainder).toFixed(2)) : String(baseShare.toFixed(2)),
        }))
      );
    }
  };

  const handleAddSplitRow = () => {
    const curSum = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const targetAmt = Number(formData.amount) || 0;
    const remaining = Math.max(0, Math.round((targetAmt - curSum) * 100) / 100);

    const usedModes = new Set(splitRows.map((r) => (r.mode || "").toLowerCase()));
    const availableMode = dynamicPaymentModes.find(
      (m) => m.value !== "Split" && !usedModes.has(m.value.toLowerCase())
    );
    const nextMode = availableMode
      ? availableMode.value
      : usedModes.has("cash")
      ? "GPay"
      : "Cash";

    const newId = Date.now() + Math.random();
    const rowAmt = remaining > 0 ? String(remaining) : "";

    setSplitRows((prev) => [
      ...prev,
      {
        id: newId,
        mode: nextMode,
        amount: rowAmt,
        utr: "",
      },
    ]);
  };

  const handleRemoveSplitRow = (id) => {
    if (splitRows.length <= 1) {
      toast.warning("At least one payment row is required.");
      return;
    }
    setSplitRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSplitRowChange = (id, field, value) => {
    let sanitized = value;
    if (field === "amount") {
      const targetAmt = Number(formData.amount) || 0;
      const otherRowsSum = Math.round(
        splitRows
          .filter((r) => r.id !== id)
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100
      ) / 100;

      const maxAllowedForThisRow = Math.max(0, Math.round((targetAmt - otherRowsSum) * 100) / 100);
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
        // Limit Cash Note to max 50 characters
        sanitized = String(value || "").slice(0, 50);
      } else {
        // Limit UTR / Ref to max 12 characters (alphanumeric)
        sanitized = String(value || "").replace(/[^a-zA-Z0-9\-_/]/g, "").slice(0, 12);
      }
    }

    setSplitRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: sanitized } : r))
    );
  };

  const handleQuickSplitEvenly = () => {
    const targetAmt = Number(formData.amount) || 0;
    if (targetAmt <= 0 || splitRows.length === 0) return;
    const count = splitRows.length;
    const baseShare = Math.floor((targetAmt / count) * 100) / 100;
    const remainder = Math.round((targetAmt - baseShare * count) * 100) / 100;

    setSplitRows((prev) =>
      prev.map((row, idx) => ({
        ...row,
        amount: idx === 0 ? String((baseShare + remainder).toFixed(2)) : String(baseShare.toFixed(2)),
      }))
    );
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.memberName || !formData.memberName.trim()) errs.memberName = "Member Name is required";
    if (!formData.eventCategory || !formData.eventCategory.trim()) errs.eventCategory = "Event Category is required";
    if (!formData.eventName || !formData.eventName.trim()) errs.eventName = "Event Name is required";
    
    const targetAmt = Number(formData.amount);
    if (!formData.amount || isNaN(targetAmt) || targetAmt <= 0) {
      errs.amount = "Contribution amount must be greater than ₹0.00";
    } else if (maxPayableDue !== null && maxPayableDue > 0 && targetAmt > maxPayableDue) {
      const fmtMax = maxPayableDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      errs.amount = `Contribution amount (₹${targetAmt.toLocaleString("en-IN")}) cannot exceed the maximum payable due of ₹${fmtMax}`;
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
        const sum = Math.round(splitRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) * 100) / 100;
        if (Math.abs(sum - (targetAmt || 0)) > 0.01) {
          const diff = Math.round(((targetAmt || 0) - sum) * 100) / 100;
          const fmtSum = sum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fmtTarget = (targetAmt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fmtDiff = Math.abs(diff).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          errs.split = diff > 0
            ? `Allocated breakdown total (₹${fmtSum}) is less than Total Amount (₹${fmtTarget}). Remaining: ₹${fmtDiff}`
            : `Allocated breakdown total (₹${fmtSum}) exceeds Total Amount (₹${fmtTarget}). Excess: ₹${fmtDiff}`;
        }

        // Check for duplicate payment modes
        const selectedModes = splitRows.map((r) => String(r.mode || "").trim().toLowerCase());
        const dupIndex = selectedModes.findIndex((m, idx) => m && selectedModes.indexOf(m) !== idx);
        if (dupIndex !== -1) {
          const dupName = splitRows[dupIndex]?.mode;
          errs.split = `Duplicate payment mode '${dupName}' selected. Please choose distinct payment modes per row or combine their amounts.`;
        }

        // Check individual rows
        for (let i = 0; i < splitRows.length; i++) {
          const r = splitRows[i];
          const rowAmt = Number(r.amount);
          if (!r.amount || isNaN(rowAmt) || rowAmt <= 0) {
            errs.split = "Amount must be greater than ₹0.00";
            break;
          }
          if (targetAmt > 0 && rowAmt > targetAmt) {
            errs.split = `Amount (₹${rowAmt.toLocaleString("en-IN")}) cannot exceed Total Amount (₹${targetAmt.toLocaleString("en-IN")})`;
            break;
          }
          if (rowAmt > 10000000) {
            errs.split = "Amount cannot exceed ₹1,00,00,000 (1 Crore)";
            break;
          }
          const isRowCash = String(r.mode || "").toLowerCase().includes("cash");
          if (!isRowCash) {
            if (!r.utr || !r.utr.trim()) {
              errs.split = "UTR / Reference number is mandatory for digital payments.";
              break;
            } else if (r.utr.trim().length < 6) {
              errs.split = "UTR / Ref number must be at least 6 characters (e.g. 12-digit UTR).";
              break;
            } else if (r.utr.trim().length > 12) {
              errs.split = "UTR / Ref number cannot exceed 12 characters.";
              break;
            }
          }
        }
      }
    } else {
      const isCash = String(formData.paymentMode || "").toLowerCase().includes("cash");
      if (!isCash) {
        if (!formData.utr || !formData.utr.trim()) {
          errs.utr = "UPI / Reference Number is required for digital payments";
        } else if (formData.utr.trim().length < 6) {
          errs.utr = "UTR must be at least 6 characters";
        } else if (formData.utr.trim().length > 12) {
          errs.utr = "UTR cannot exceed 12 characters";
        }
      }
    }

    const hasScreenshots =
      (formData.screenshots && formData.screenshots.length > 0) ||
      (typeof formData.screenshot === "string" && formData.screenshot.trim().length > 0);
    if (!hasScreenshots) {
      errs.screenshot = "At least 1 payment screenshot / receipt slip is mandatory.";
    }

    setErrors(errs);
    return errs;
  };

  const handleSubmitProof = async (e) => {
    if (e) e.preventDefault();
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
        finalMode = "Split";
        finalUtr = "SPLIT";
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

      const splitNote = isMultiSplit
        ? `[Split Breakdown: ${splitRows.map((r) => `${r.mode}: ₹${r.amount}${r.utr ? ` (Ref: ${r.utr})` : ""}`).join(", ")}]`
        : "";
      const combinedNotes = [formData.notes.trim(), splitNote].filter(Boolean).join("\n");

      const screenshotsList = formData.screenshots && formData.screenshots.length > 0
        ? formData.screenshots
        : (formData.screenshot ? [formData.screenshot] : []);

      const payload = {
        eventId: formData.eventId || undefined,
        memberId: formData.memberId || undefined,
        memberName: formData.memberName.trim(),
        eventName: formData.eventName.trim(),
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
      toast.success("Payment submission recorded and synchronized with Contribution ledger successfully!");

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
      toast.error(err.response?.data?.message || "Failed to submit payment details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScreenshotUpload = (e) => {
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 5 MB size limit`);
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
          <AppButton variant="outlined" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={handleSubmitProof}
            disabled={submitting || isFullySettled}
            sx={{
              bgcolor: isFullySettled
                ? (t) => (t.palette.mode === "dark" ? "rgba(22, 163, 74, 0.25) !important" : "rgba(22, 163, 74, 0.12) !important")
                : "#4a3f6b !important",
              color: isFullySettled ? "#15803d !important" : "#ffffff !important",
              fontWeight: 800,
              "&.Mui-disabled": {
                bgcolor: isFullySettled
                  ? (t) => (t.palette.mode === "dark" ? "rgba(22, 163, 74, 0.25) !important" : "rgba(22, 163, 74, 0.12) !important")
                  : undefined,
                color: isFullySettled ? "#15803d !important" : undefined,
              },
              "&:hover": { bgcolor: isFullySettled ? "rgba(22, 163, 74, 0.18) !important" : "#3b325c !important" },
            }}
          >
            {submitting ? "Saving..." : isFullySettled ? "✓ All Dues Settled" : "Save"}
          </AppButton>
        </Stack>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
        {/* Row 1: Event Category & Event Name */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Category"
              value={formData.eventCategory}
              onChange={(e) => {
                const newCategory = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  eventCategory: newCategory,
                  eventName: "",
                  eventId: "",
                }));
                if (errors.eventCategory) setErrors((prev) => ({ ...prev, eventCategory: "" }));
              }}
              options={categoryOptions}
              placeholder="Select Event Category"
              error={!!errors.eventCategory}
              helperText={errors.eventCategory}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              value={formData.eventName}
              onChange={(e) => {
                const selectedName = e.target.value;
                const matchedEvent = (eventsList || []).find(
                  (ev) => (ev.title || ev.name || ev.eventName) === selectedName
                );
                const matchedCategory = matchedEvent
                  ? matchedEventCategory(matchedEvent) || formData.eventCategory
                  : formData.eventCategory;
                const evId = matchedEvent ? matchedEvent.id || matchedEvent.eventId || "" : "";
                const baseAmt = matchedEvent
                  ? String(matchedEvent.amount || matchedEvent.contributionAmount || "")
                  : "";

                setFormData((prev) => ({
                  ...prev,
                  eventName: selectedName,
                  eventId: evId,
                  eventCategory: matchedCategory || prev.eventCategory,
                  amount: baseAmt || prev.amount,
                }));
                if (errors.eventName) setErrors((prev) => ({ ...prev, eventName: "" }));
              }}
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
                  const matched = membersList.find(
                    (m) => String(m.id || m.memberId) === String(val) || (m.name || m.memberName) === val
                  );
                  setFormData((prev) => ({
                    ...prev,
                    memberId: matched ? matched.id || matched.memberId || "" : "",
                    memberName: matched ? matched.name || matched.memberName || "" : val,
                  }));
                  if (errors.memberName) setErrors((prev) => ({ ...prev, memberName: "" }));
                }}
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
                disabled={!isAuthorityRole && !!authState?.fullName}
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
              required
            />
          </Grid>
        </Grid>

        {/* Row 3: Payment Scope & Fixed Contribution Amount */}
        <Grid container spacing={2}>
          {duesSummary && (duesSummary.previousArrears > 0 || duesSummary.totalDue > 0) && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <AppSelect
                label="Payment Target / Scope"
                placeholder="Select payment target"
                value={paymentScope}
                onChange={(e) => handlePaymentScopeChange(e.target.value)}
                options={paymentScopeOptions}
                required
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Contribution Amount (₹)"
              type={duesSummary ? "text" : "number"}
              value={
                duesSummary && !isNaN(Number(formData.amount)) && Number(formData.amount) > 0
                  ? Number(formData.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : formData.amount
              }
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, amount: val }));
                const num = Number(val) || 0;
                if (splitRows.length === 1) {
                  setSplitRows([{ ...splitRows[0], amount: val }]);
                } else if (splitRows.length > 1 && num > 0) {
                  const baseShare = Math.floor((num / splitRows.length) * 100) / 100;
                  const remainder = Math.round((num - baseShare * splitRows.length) * 100) / 100;
                  setSplitRows((rows) =>
                    rows.map((r, i) => ({
                      ...r,
                      amount: i === 0 ? String((baseShare + remainder).toFixed(2)) : String(baseShare.toFixed(2)),
                    }))
                  );
                }
              }}
              disabled={!!duesSummary}
              placeholder="0.00"
              error={!!errors.amount}
              helperText={
                errors.amount ||
                (isFullySettled
                  ? " All dues settled"
                  : duesSummary?.totalDue
                  ? `Fixed from target scope: ₹${Number(formData.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
                  Live Contribution & Dues Status
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
                  ₹{(duesSummary.currentEventDue ?? 0).toLocaleString()}
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
                      ₹{(duesSummary.previousArrears || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Tooltip>
              </Grid>
              <Grid size={{ xs: 4 }} sx={{ borderLeft: (t) => `1px solid ${t.palette.divider}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }}>
                  Total Due
                </Typography>
                <Typography variant="body1" fontWeight={900} color={duesSummary.totalDue > 0 ? "error.main" : "success.main"}>
                  ₹{(duesSummary.totalDue ?? 0).toLocaleString()}
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
                errors.split
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
                    isFullySettled || (targetAmount === 0 && allocatedSplitSum === 0)
                      ? "✓ Dues Cleared: ₹0"
                      : splitDifference === 0
                      ? `✓ Allocated: ₹${allocatedSplitSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₹${targetAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : splitDifference > 0
                      ? `Remaining: ₹${splitDifference.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `Exceeds: ₹${Math.abs(splitDifference).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor:
                      isFullySettled || (targetAmount === 0 && allocatedSplitSum === 0) || splitDifference === 0
                        ? "rgba(22, 163, 74, 0.15)"
                        : splitDifference > 0
                        ? "rgba(234, 179, 8, 0.15)"
                        : "rgba(220, 38, 38, 0.15)",
                    color:
                      isFullySettled || (targetAmount === 0 && allocatedSplitSum === 0) || splitDifference === 0
                        ? "#16a34a"
                        : splitDifference > 0
                        ? "#b45309"
                        : "#dc2626",
                  }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAddSplitRow}
                  startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    py: 0.4,
                    px: 1.2,
                    bgcolor: "#7c3aed !important",
                    "&:hover": { bgcolor: "#6d28d9 !important" },
                    borderRadius: "8px",
                    textTransform: "none",
                  }}
                >
                  Add Row
                </Button>
              </Stack>
            </Box>

            {errors.split && (
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
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, sm: 3.5 }}>
                        <AppSelect
                          label={`Mode ${idx + 1}`}
                          value={row.mode}
                          onChange={(e) => handleSplitRowChange(row.id, "mode", e.target.value)}
                          options={dynamicPaymentModes.filter(m => m.value !== "Split").map(m => ({ label: m.label, value: m.value }))}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2.5 }}>
                        <AppInput
                          label="Amount (₹)"
                          type="number"
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => handleSplitRowChange(row.id, "amount", e.target.value)}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 10, sm: 5 }}>
                        <Box sx={{ display: "flex", gap: 0.8, alignItems: "flex-end" }}>
                          <Box sx={{ flex: 1 }}>
                            <AppInput
                              label={isRowCash ? "Cash Note" : "UTR/Ref"}
                              placeholder={isRowCash ? "Handover note" : "12-digit UTR ref"}
                              value={row.utr}
                              onChange={(e) => handleSplitRowChange(row.id, "utr", e.target.value)}
                              size="small"
                              required={!isRowCash}
                            />
                          </Box>
                          {!isRowCash && (
                            <Tooltip title={`Open QR Scanner for ${row.mode} (₹${row.amount || 0})`}>
                              <Button
                                size="small"
                                variant="outlined"
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
                                  height: 38,
                                  mb: "2px",
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
                      <Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: "center", pt: { sm: 2 } }}>
                        <Tooltip title={splitRows.length > 1 ? "Remove this row" : "At least 1 row required"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveSplitRow(row.id)}
                              disabled={splitRows.length <= 1}
                              sx={{
                                color: splitRows.length > 1 ? "error.main" : "text.disabled",
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
                <Box component="span" sx={{ color: "error.main", fontWeight: 800 }}>*</Box>
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
                  <Paper
                    variant="outlined"
                    component="label"
                    sx={{
                      p: 2,
                      minHeight: (formData.screenshots?.length || (formData.screenshot ? 1 : 0)) > 0 ? 115 : "auto",
                      borderRadius: "10px",
                      borderStyle: "dashed",
                      borderWidth: errors.screenshot ? "1.5px" : "1px",
                      borderColor: errors.screenshot ? "error.main" : undefined,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.8,
                      cursor: "pointer",
                      bgcolor: errors.screenshot
                        ? (t) => (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.04)")
                        : (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8fafc"),
                      "&:hover": {
                        bgcolor: errors.screenshot
                          ? (t) => (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)")
                          : "rgba(99, 102, 241, 0.04)",
                        borderColor: errors.screenshot ? "error.main" : "#6366f1",
                      },
                    }}
                  >
                    <input type="file" accept="image/*" multiple hidden onChange={handleScreenshotUpload} />
                    <UploadIcon sx={{ color: errors.screenshot ? "error.main" : "#6366f1", fontSize: "1.4rem" }} />
                    <Typography
                      variant="caption"
                      textAlign="center"
                      fontWeight={700}
                      sx={{
                        fontSize: "0.72rem",
                        color: errors.screenshot ? "error.main" : "text.secondary",
                      }}
                    >
                      {(formData.screenshots?.length || (formData.screenshot ? 1 : 0)) > 0 ? "+ Add Image" : "Click to upload payment screenshot (PNG, JPG)"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.65rem",
                        color: errors.screenshot ? "error.main" : "text.secondary",
                      }}
                    >
                      Select up to 3 images (Mandatory)
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>

            {errors.screenshot && (
              <Typography
                variant="caption"
                color="error"
                sx={{ display: "block", mt: 0.8, fontWeight: 700 }}
              >
                ⚠️ {errors.screenshot}
              </Typography>
            )}
          </Grid>

          {/* Right Column: Additional Notes */}
          <Grid size={{ xs: 12, md: 5 }}>
            <AppTextArea
              label="Additional Notes"
              value={formData.notes}
              onChange={(e) => {
                const val = e.target.value.slice(0, 300);
                setFormData((prev) => ({ ...prev, notes: val }));
              }}
              placeholder="e.g. Paid via GPay account"
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
            <Box sx={{ py: 3, color: "text.secondary" }}>
              <Typography variant="body2">Generating QR Code...</Typography>
            </Box>
          )}

          <Typography variant="h5" fontWeight={900} sx={{ color: "primary.main", mb: 0.5 }}>
            ₹{Number(activeQrModal?.amount || formData.amount || 0).toLocaleString("en-IN")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {formData.eventName || "Contribution"} • {formData.memberName || "Member"}
          </Typography>

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
                {activeRowQrData?.receiverName || "Contribution Management"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary">
                UPI ID:
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" fontWeight={800} sx={{ fontFamily: "monospace", color: "#7c3aed" }}>
                  {activeRowQrData?.upiId || "danielrobertanto604@okicici"}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyUpi(activeRowQrData?.upiId || "danielrobertanto604@okicici")}
                  sx={{ p: 0.2 }}
                >
                  {copiedUpi ? <CheckIcon sx={{ fontSize: 14, color: "success.main" }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Stack>
            </Box>
          </Paper>

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
    </AppDialog>
  );
}
