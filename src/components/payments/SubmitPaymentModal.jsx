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
  });

  const [errors, setErrors] = useState({});
  const [duesSummary, setDuesSummary] = useState(null);
  const [paymentScope, setPaymentScope] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Multi-Mode Split State (Add Row feature)
  const [isMultiSplit, setIsMultiSplit] = useState(false);
  const [splitRows, setSplitRows] = useState([
    { id: 1, mode: "GPay", amount: "", utr: "" },
    { id: 2, mode: "Cash", amount: "", utr: "" },
  ]);

  const allocatedSplitSum = useMemo(() => {
    return Math.round(splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100) / 100;
  }, [splitRows]);

  const targetAmount = Number(formData.amount) || 0;
  const splitDifference = Math.round((targetAmount - allocatedSplitSum) * 100) / 100;

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
    if (!cfg?.isConfigured && duesSummary?.qrUpiId) {
      cfg = {
        eventType: resolvedCategory || "Event",
        receiverName: duesSummary?.qrReceiverName || "Contribution Management",
        upiId: duesSummary.qrUpiId,
        qrMode: duesSummary?.qrImage ? "uploaded" : "generated",
        qrImage: duesSummary?.qrImage || null,
        isConfigured: true,
      };
    }
    return cfg;
  }, [resolvedCategory, formData.eventName, duesSummary]);

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
      list.push({
        label: formData.paymentMode,
        value: formData.paymentMode,
        color: getModeColor(formData.paymentMode),
      });
    }
    if (!set.has("split")) {
      list.push({
        label: "Split / Multi-Mode (Add Rows)",
        value: "Split",
        color: "#6366f1",
      });
    }

    return list;
  }, [dbPaymentModes, formData.paymentMode]);

  useEffect(() => {
    if (formData.paymentMode === "Split") {
      setIsMultiSplit(true);
    }
  }, [formData.paymentMode]);

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
      let resolvedAmount = initialAmount;

      if (initialEventId && eventsList.length > 0) {
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
        amount: resolvedAmount ? String(resolvedAmount) : prev.amount,
        paymentMode: prev.paymentMode || (dynamicPaymentModes.length > 0 ? dynamicPaymentModes[0]?.value : ""),
        paymentDate: dayjs(),
        utr: "",
        notes: "",
        screenshot: "",
      }));
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
            const currentEvDue = Number(
              res.currentEventDue ?? res.amount ?? matchedEvent?.amount ?? matchedEvent?.contributionAmount ?? 0
            );
            const prevArrears = Number(res.previousArrears ?? res.arrears ?? 0);
            const total = Number((res.totalDue ?? (currentEvDue + prevArrears)).toFixed(2));
            const baseAmt = Number(
              res.amount ?? matchedEvent?.amount ?? matchedEvent?.contributionAmount ?? currentEvDue
            );

            const breakdown = (res.arrearBreakdown && res.arrearBreakdown.length > 0)
              ? res.arrearBreakdown
              : (initialArrearBreakdown || []);

            setDuesSummary({
              currentEventDue: currentEvDue,
              previousArrears: prevArrears,
              totalDue: total > 0 ? total : currentEvDue,
              status: res.status || (currentEvDue === 0 && baseAmt > 0 ? "Paid" : "Pending"),
              baseAmount: baseAmt,
              arrearBreakdown: breakdown,
            });
            if (!paymentScope) setPaymentScope(prevArrears > 0 ? "AllOutstanding" : "CurrentEvent");

            setFormData((prev) => ({
              ...prev,
              eventName: res.eventName || prev.eventName,
              memberName: res.memberName || prev.memberName || authState?.fullName || "",
              amount: res.amount
                ? String(res.amount)
                : total > 0
                ? String(total)
                : currentEvDue > 0
                ? String(currentEvDue)
                : prev.amount,
            }));
          } else if (matchedEvent) {
            const currentEvDue = Number(matchedEvent.amount || matchedEvent.contributionAmount || 0);
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

    if (total > 0) {
      opts.push({
        label: `All Outstanding (₹${total.toLocaleString()})`,
        value: "AllOutstanding",
      });
    }
    if (currentDue > 0) {
      opts.push({
        label: `Current Event Only (₹${currentDue.toLocaleString()})${duesSummary.status === "Paid" ? " [Paid]" : ""}`,
        value: "CurrentEvent",
      });
    }
    if (arrears > 0) {
      opts.push({
        label: `Previous Arrears Only (₹${arrears.toLocaleString()})`,
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

    setSplitRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        mode: nextMode,
        amount: remaining > 0 ? String(remaining) : "",
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
    setSplitRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
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
    if (!formData.memberName.trim()) errs.memberName = "Member Name is required";
    if (!formData.eventCategory.trim()) errs.eventCategory = "Event Category is required";
    if (!formData.eventName.trim()) errs.eventName = "Event Name is required";
    if (!formData.amount || Number(formData.amount) <= 0) errs.amount = "Valid amount is required";

    if (isMultiSplit) {
      if (splitRows.length === 0) {
        errs.split = "At least one payment row is required in split payment";
      } else {
        const sum = Math.round(splitRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) * 100) / 100;
        const target = Number(formData.amount) || 0;
        if (Math.abs(sum - target) > 0.01) {
          errs.split = `Split breakdown sum (₹${sum}) must equal Total Amount (₹${target}). Difference: ₹${(target - sum).toFixed(2)}`;
        }
        for (let i = 0; i < splitRows.length; i++) {
          const r = splitRows[i];
          if (!r.amount || Number(r.amount) <= 0) {
            errs.split = `Row #${i + 1} (${r.mode}): Please enter a valid amount.`;
            break;
          }
          const isRowCash = String(r.mode || "").toLowerCase().includes("cash");
          if (!isRowCash && (!r.utr || !r.utr.trim())) {
            errs.split = `Row #${i + 1} (${r.mode}): UTR / Reference number is required for digital payments.`;
            break;
          }
        }
      }
    } else {
      const isCash = String(formData.paymentMode || "").toLowerCase().includes("cash");
      if (!isCash) {
        if (!formData.utr.trim()) {
          errs.utr = "UPI / Reference Number is required";
        } else if (formData.utr.trim().length < 6) {
          errs.utr = "UTR must be at least 6 characters";
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitProof = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      if (errors.split) {
        toast.error(errors.split);
      } else {
        toast.error("Please fill in all required fields");
      }
      return;
    }

    try {
      setSubmitting(true);
      let finalMode = formData.paymentMode;
      let finalUtr = formData.utr.trim();
      let cashTotal = 0;
      let upiTotal = 0;

      if (isMultiSplit) {
        cashTotal = splitRows
          .filter((r) => String(r.mode || "").toLowerCase().includes("cash"))
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        upiTotal = splitRows
          .filter((r) => !String(r.mode || "").toLowerCase().includes("cash"))
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        finalMode = `Split (${splitRows.map((r) => `${r.mode}: ₹${r.amount}`).join(", ")})`;
        finalUtr = splitRows
          .filter((r) => r.utr && r.utr.trim())
          .map((r) => `${r.mode}: ${r.utr.trim()}`)
          .join("; ") || "SPLIT";
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
        screenshot: formData.screenshot || null,
        notes: combinedNotes || null,
      };

      const res = await submitPaymentProofAsync(payload);
      toast.success("Payment submission recorded and synchronized with Contribution ledger successfully!");

      addNotification({
        type: "PAYMENT_PENDING",
        title: "New Payment Submission",
        message: `Member ${formData.memberName} submitted payment of ₹${formData.amount} (${finalMode}, UTR: ${finalUtr}). Status: Pending verification.`,
        link: "/payment-submission",
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFormData((prev) => ({ ...prev, screenshot: evt.target.result }));
      toast.success("Screenshot uploaded");
    };
    reader.readAsDataURL(file);
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
            disabled={submitting}
            sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
          >
            {submitting ? "Submitting..." : "Submit Payment Details"}
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
                  ₹{(duesSummary.currentEventDue || duesSummary.baseAmount || 0).toLocaleString()}
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
                <Typography variant="body1" fontWeight={900} color="primary.main">
                  ₹{(duesSummary.totalDue || duesSummary.currentEventDue || 0).toLocaleString()}
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

        {/* Payment Scope Selector */}
        {duesSummary && (duesSummary.previousArrears > 0 || duesSummary.totalDue > 0) && (
          <Box>
            <AppSelect
              label="Payment Target / Scope *"
              placeholder="Select payment target"
              value={paymentScope}
              onChange={(e) => handlePaymentScopeChange(e.target.value)}
              options={paymentScopeOptions}
              required
            />
          </Box>
        )}

        {/* Row 3: Amount & Payment Method with Multi-Mode Toggle */}
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Contribution Amount (₹)"
              type="number"
              value={formData.amount}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, amount: val }));
                if (isMultiSplit && splitRows.length === 1) {
                  setSplitRows([{ ...splitRows[0], amount: val }]);
                }
              }}
              placeholder="0.00"
              error={!!errors.amount}
              helperText={errors.amount || (duesSummary?.totalDue ? `Total due: ₹${duesSummary.totalDue}` : "")}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.7rem", color: (theme) => theme.palette.mode === "dark" ? "#fff" : "text.secondary" }}>
                  Payment Method *
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={isMultiSplit}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsMultiSplit(checked);
                        if (checked) {
                          setFormData((prev) => ({ ...prev, paymentMode: "Split" }));
                          const curSum = splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
                          if (curSum === 0 && Number(formData.amount) > 0) {
                            const half = Math.floor((Number(formData.amount) / 2) * 100) / 100;
                            const rest = Math.round((Number(formData.amount) - half) * 100) / 100;
                            setSplitRows([
                              { id: 1, mode: "GPay", amount: String(half), utr: "" },
                              { id: 2, mode: "Cash", amount: String(rest), utr: "" },
                            ]);
                          }
                        } else {
                          const firstMode = dynamicPaymentModes.find((m) => m.value !== "Split")?.value || "GPay";
                          setFormData((prev) => ({ ...prev, paymentMode: firstMode }));
                        }
                      }}
                      sx={{ mr: -1 }}
                    />
                  }
                  label={
                    <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem", color: isMultiSplit ? "secondary.main" : "text.secondary" }}>
                      Split / Add Rows
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Box>
              <AppSelect
                value={formData.paymentMode}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, paymentMode: val }));
                  if (val === "Split") {
                    setIsMultiSplit(true);
                  }
                }}
                options={dynamicPaymentModes.map((m) => ({ label: m.label, value: m.value }))}
                placeholder="Select Payment Method"
                required
              />
            </Box>
          </Grid>
        </Grid>

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
                    splitDifference === 0
                      ? `✓ Allocated: ₹${allocatedSplitSum} / ₹${targetAmount}`
                      : splitDifference > 0
                      ? `Remaining: ₹${splitDifference}`
                      : `Exceeds: ₹${Math.abs(splitDifference)}`
                  }
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor:
                      splitDifference === 0
                        ? "rgba(22, 163, 74, 0.15)"
                        : splitDifference > 0
                        ? "rgba(234, 179, 8, 0.15)"
                        : "rgba(220, 38, 38, 0.15)",
                    color:
                      splitDifference === 0
                        ? "#16a34a"
                        : splitDifference > 0
                        ? "#b45309"
                        : "#dc2626",
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleQuickSplitEvenly}
                  startIcon={<ResetIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: "0.7rem", py: 0.3, px: 1, textTransform: "none", borderRadius: "8px" }}
                >
                  Split Evenly
                </Button>
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
                  + Add Row
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
                          label={`Mode #${idx + 1}`}
                          value={row.mode}
                          onChange={(e) => handleSplitRowChange(row.id, "mode", e.target.value)}
                          options={dynamicPaymentModes.filter(m => m.value !== "Split").map(m => ({ label: m.label, value: m.value }))}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3.5 }}>
                        <AppInput
                          label="Amount (₹) *"
                          type="number"
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => handleSplitRowChange(row.id, "amount", e.target.value)}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 10, sm: 4 }}>
                        <AppInput
                          label={isRowCash ? "Cash Note (Optional)" : "UTR / Ref # *"}
                          placeholder={isRowCash ? "Handover note" : "12-digit UTR ref"}
                          value={row.utr}
                          onChange={(e) => handleSplitRowChange(row.id, "utr", e.target.value)}
                          size="small"
                          required={!isRowCash}
                        />
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

        {/* Live Payment QR Code Scanner Card (Displays when digital / UPI mode is selected) */}
        {supportsQr && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: (t) =>
                t.palette.mode === "dark" ? "rgba(74, 63, 107, 0.2)" : "#faf5ff",
              border: "1.5px solid",
              borderColor: (t) =>
                t.palette.mode === "dark" ? "rgba(168, 85, 247, 0.3)" : "#e9d5ff",
              boxShadow: "0 4px 20px -2px rgba(124, 58, 237, 0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    bgcolor: "#7c3aed",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <QrCodeIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: (t) => t.palette.mode === "dark" ? "#fff" : "#4a3f6b" }}>
                  Scan QR Code to Pay with {formData.paymentMode || "UPI"}
                </Typography>
              </Stack>
              {resolvedCategory && (
                <Chip
                  label={resolvedCategory}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor: "rgba(124, 58, 237, 0.12)",
                    color: "#7c3aed",
                  }}
                />
              )}
            </Box>

            {qrData && qrData.isConfigured ? (
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 5 }} sx={{ display: "flex", justifyContent: "center" }}>
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: "12px",
                      bgcolor: "#ffffff",
                      border: "2px solid #7c3aed",
                      boxShadow: "0 6px 16px rgba(124, 58, 237, 0.18)",
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      component="img"
                      src={qrData.qrImageUrl}
                      alt="UPI Payment QR Code"
                      sx={{
                        width: 155,
                        height: 155,
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                    <Typography variant="caption" fontWeight={800} sx={{ color: "#7c3aed", mt: 0.5, fontSize: "0.68rem" }}>
                      {formData.paymentMode || "UPI"} QR
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 7 }}>
                  <Stack spacing={1.2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }}>
                        Payee / Receiver Name
                      </Typography>
                      <Typography variant="body1" fontWeight={800} sx={{ color: (t) => t.palette.mode === "dark" ? "#fff" : "#1e1b4b" }}>
                        {qrData.receiverName || "Contribution Management"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }}>
                        Payee UPI ID
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            fontFamily: "monospace",
                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f3e8ff",
                            px: 1,
                            py: 0.4,
                            borderRadius: "6px",
                            color: "#7c3aed",
                            fontSize: "0.85rem",
                          }}
                        >
                          {qrData.upiId}
                        </Typography>
                        <Tooltip title={copiedUpi ? "Copied!" : "Copy UPI ID"}>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyUpi(qrData.upiId)}
                            sx={{ color: copiedUpi ? "success.main" : "#7c3aed", p: 0.4 }}
                          >
                            {copiedUpi ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }}>
                        Amount to Scan & Pay
                      </Typography>
                      <Typography variant="h6" fontWeight={900} color="primary.main">
                        ₹{Number(formData.amount || 0).toLocaleString("en-IN")}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", fontStyle: "italic" }}>
                      💡 Scan using {formData.paymentMode || "GPay"} or any UPI app, complete the transfer, and paste the 12-digit UTR reference below.
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ p: 1.5, textAlign: "center", bgcolor: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                  ℹ️ No custom QR configured for <strong>{resolvedCategory || "this event"}</strong>. You can configure it in <em>Settings &gt; Payment QR Settings</em> or enter your UPI reference below.
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Row 4: UPI Reference / UTR (Only when NOT in Multi-Mode Split) */}
        {!isMultiSplit && (
          <AppInput
            label={
              String(formData.paymentMode || "").toLowerCase().includes("cash")
                ? "Receipt / Handover Note (Optional for Cash)"
                : "UPI Reference / Transaction UTR *"
            }
            value={formData.utr}
            onChange={(e) => setFormData((prev) => ({ ...prev, utr: e.target.value }))}
            placeholder={
              String(formData.paymentMode || "").toLowerCase().includes("cash")
                ? "e.g. Handed cash directly to organizer"
                : "e.g. 426189345612 (12-digit number from payment app)"
            }
            maxLength={30}
            error={!!errors.utr}
            helperText={
              errors.utr ||
              (String(formData.paymentMode || "").toLowerCase().includes("cash")
                ? "Optional memo for cash payments"
                : "Find in GPay / PhonePe / Paytm receipt")
            }
            required={!String(formData.paymentMode || "").toLowerCase().includes("cash")}
          />
        )}

        {/* Row 5: Screenshot Upload with Live Image Preview Thumbnail */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.8, display: "block" }}>
            Payment Screenshot / Receipt Slip (Optional)
          </Typography>
          {formData.screenshot ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                borderColor: "#6366f1",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  component="img"
                  src={formData.screenshot}
                  alt="Payment Receipt Preview"
                  sx={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "#4f46e5" }}>
                    Receipt Image Attached
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Preview available before submission
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <AppButton
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  Change
                  <input type="file" accept="image/*" hidden onChange={handleScreenshotUpload} />
                </AppButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setFormData((prev) => ({ ...prev, screenshot: "" }))}
                  title="Remove Screenshot"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              component="label"
              sx={{
                p: 2,
                borderRadius: "10px",
                borderStyle: "dashed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                cursor: "pointer",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8fafc"),
                "&:hover": { bgcolor: "rgba(99, 102, 241, 0.04)" },
              }}
            >
              <input type="file" accept="image/*" hidden onChange={handleScreenshotUpload} />
              <UploadIcon sx={{ color: "#6366f1" }} />
              <Typography variant="body2" color="text.secondary">
                Click to upload payment screenshot or receipt slip (PNG, JPG)
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Row 6: Additional Notes */}
        <AppTextArea
          label="Additional Notes (Optional)"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="e.g. Paid via GPay account"
          rows={2}
        />
      </Box>
    </AppDialog>
  );
}
