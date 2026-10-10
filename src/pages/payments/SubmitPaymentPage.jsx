import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Paper,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  ConfirmationNumberOutlined as TicketIcon,
  CloudUpload as UploadIcon,
  CheckCircleOutline as CheckCircleIcon,
  ReceiptLong as ReceiptIcon,
  FilterList as FilterListIcon,
  PaymentRounded as PaymentIcon,
  QrCode2 as QrCodeIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  FactCheckOutlined as StatusUpdateIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { useAppToast } from "../../components/common/AppToast";
import { useNotifications } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  getPaymentTransactionsAsync,
  submitPaymentProofAsync,
  getPaymentContextAsync,
  verifyPaymentTransactionAsync,
} from "../../services/paymentService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync } from "../../services/eventService";
import { getStatusesAsync } from "../../services/statusService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getPaymentModesAsync } from "../../services/paymentModeService";
import { getImageUrl } from "../../services/apiClient";
import SubmitPaymentModal from "../../components/payments/SubmitPaymentModal";

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

export default function SubmitPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useAppToast();
  const { authState } = useAuth();
  const { addNotification } = useNotifications();

  const eventIdParam = searchParams.get("eventId");
  const memberIdParam = searchParams.get("memberId");
  const amountParam = searchParams.get("amount");

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [dbStatuses, setDbStatuses] = useState([]);
  const [dbPaymentModes, setDbPaymentModes] = useState([]);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Attachment Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");

  // Authority Status Update Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalTxn, setStatusModalTxn] = useState(null);
  const [statusChangeValue, setStatusChangeValue] = useState("");
  const [auditRemarks, setAuditRemarks] = useState("");

  const isAuthorityRole = [
    "admin",
    "superadmin",
    "organizer",
    "treasurer",
    "president",
    "secretary",
    "committee",
  ].includes(String(authState?.role || authState?.user?.role || "").toLowerCase());

  // Form State
  const [formData, setFormData] = useState({
    eventId: eventIdParam || "",
    memberId: memberIdParam || "",
    eventCategory: "",
    eventName: "",
    memberName: authState?.fullName || "",
    amount: amountParam || "",
    paymentMode: "",
    utr: "",
    paymentDate: dayjs(),
    notes: "",
    screenshot: "",
  });

  const [errors, setErrors] = useState({});

  // Filter States
  const [filterMember, setFilterMember] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterMode, setFilterMode] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState(null);

  const [appliedMember, setAppliedMember] = useState("ALL");
  const [appliedEvent, setAppliedEvent] = useState("ALL");
  const [appliedMode, setAppliedMode] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [appliedDate, setAppliedDate] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txnRes, memsRes, eventsRes, statusRes, eventTypesRes, modesRes] = await Promise.all([
        getPaymentTransactionsAsync().catch(() => []),
        getMembersAsync().catch(() => []),
        getEventsAsync().catch(() => []),
        getStatusesAsync(true, "Contribution").catch(() => []),
        getEventTypesAsync().catch(() => []),
        getPaymentModesAsync(true).catch(() => []),
      ]);

      if (Array.isArray(memsRes)) setMembersList(memsRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(statusRes)) setDbStatuses(statusRes);
      if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
      if (Array.isArray(modesRes)) setDbPaymentModes(modesRes);

      if (Array.isArray(txnRes)) {
        const mapped = txnRes.map((t, idx) => ({
          id: t.txnNumber || t.id || `TXN-SUB-${String(idx + 1).padStart(3, "0")}`,
          transactionId: t.transactionId || t.id,
          memberName: t.memberName || "",
          eventName: t.eventName || "",
          amount: t.amount || 0,
          paymentDate: t.paymentDate || "",
          paymentMode: t.paymentMode || "",
          utr: t.utr || "-",
          status: t.status || "Pending",
          notes: t.notes || "",
          screenshot: t.screenshot || "",
          createdAt: t.createdAt || t.createdOn || null,
        }));
        setTransactions(mapped);
      }
    } catch {
      toast.error("Failed to load payment submission history");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic statuses loaded directly from database table
  const getModalStatusOptions = (txn) => {
    const hasSubmittedProof = Boolean(
      txn?.transactionId ||
      (txn?.paymentMode && txn?.paymentMode !== "-" && txn?.paymentMode !== "--" && txn?.paymentMode !== "None") ||
      txn?.utrNumber ||
      txn?.utr
    );
    const actualReceived = hasSubmittedProof ? Number(txn?.amount || txn?.paidAmount || 0) : 0;
    const isAmountReceived = actualReceived > 0;

    const list = Array.isArray(dbStatuses) && dbStatuses.length > 0
      ? dbStatuses
          .filter((s) => s.statusName && s.isActive !== false)
          .map((s) => {
            const isVerificationStatus = ["verified", "paid", "closed", "completed"].includes(
              String(s.statusName).toLowerCase().trim()
            );
            return {
              label: !isAmountReceived && isVerificationStatus
                ? `${s.statusName} (Payment not received)`
                : s.statusName,
              value: s.statusName,
              disabled: !isAmountReceived && isVerificationStatus,
            };
          })
      : [
          { label: "Pending", value: "Pending" },
          { label: isAmountReceived ? "Verified" : "Verified (Payment not received)", value: "Verified", disabled: !isAmountReceived },
          { label: "Rejected", value: "Rejected" },
          { label: isAmountReceived ? "Paid" : "Paid (Payment not received)", value: "Paid", disabled: !isAmountReceived },
        ];

    if (txn?.status && !list.some((o) => o.value.toLowerCase() === String(txn.status).toLowerCase())) {
      return [{ label: String(txn.status), value: String(txn.status) }, ...list];
    }
    return list;
  };

  const handleStatusUpdate = async (txn, newStatus, customNotes) => {
    const target = txn || statusModalTxn;
    if (!target) return;

    const hasSubmittedProof = Boolean(
      target.transactionId ||
      (target.paymentMode && target.paymentMode !== "-" && target.paymentMode !== "--" && target.paymentMode !== "None") ||
      target.utrNumber ||
      target.utr
    );
    const actualReceived = hasSubmittedProof ? Number(target.amount || target.paidAmount || 0) : 0;

    if (actualReceived <= 0) {
      toast.error("Payment has not been received (Received Amount: ₹0.00). You cannot verify or save this status.");
      return;
    }

    const verifier = authState?.fullName || authState?.username || authState?.user?.name || authState?.user?.username || "Admin";
    const noteText = customNotes !== undefined
      ? customNotes
      : (auditRemarks || `Status updated to ${newStatus} by ${verifier}.`);

    if (target.transactionId) {
      try {
        await verifyPaymentTransactionAsync(target.transactionId, {
          status: newStatus,
          verifiedBy: verifier,
          notes: noteText,
        });

        toast.success(`Payment status updated to ${newStatus} successfully!`);
        addNotification({
          type: "PAYMENT_STATUS_UPDATED",
          title: "Payment Status Updated",
          message: `Payment ${target.id} of ₹${Number(target.amount).toLocaleString("en-IN")} status updated to ${newStatus}.`,
          link: "/payment-submission",
        });

        // Notify other modules (e.g. Contributions Ledger) in real time
        window.dispatchEvent(
          new CustomEvent("contribution_updated", {
            detail: { action: "verify", status: newStatus, target },
          })
        );

        setStatusModalOpen(false);
        setStatusModalTxn(null);
        setAuditRemarks("");
        await loadData();
      } catch {
        toast.error("Failed to update payment status");
      }
    }
  };

  useEffect(() => {
    loadData();
    if (eventIdParam || memberIdParam || amountParam) {
      setFormModalOpen(true);
    }
  }, []);

  // Auto-link member ID from membersList if not already set
  useEffect(() => {
    if (membersList.length > 0 && !formData.memberId) {
      const userFullName = authState?.fullName || authState?.user?.fullName || "";
      if (userFullName) {
        const found = membersList.find(
          (m) =>
            (m.name && m.name.toLowerCase() === userFullName.toLowerCase()) ||
            (m.memberName && m.memberName.toLowerCase() === userFullName.toLowerCase())
        );
        if (found) {
          setFormData((prev) => ({
            ...prev,
            memberId: found.id || found.memberId || prev.memberId,
            memberName: found.name || found.memberName || prev.memberName,
          }));
        }
      }
    }
  }, [membersList, authState?.fullName, authState?.user?.fullName]);

  // Auto-fill and match Event Category, Event Name, Member Name when opened via URL params
  useEffect(() => {
    if (eventIdParam || memberIdParam || amountParam) {
      setFormModalOpen(true);
      setFormData((prev) => {
        let updatedCat = prev.eventCategory;
        let updatedEvName = prev.eventName;
        let updatedMemName = prev.memberName;
        let updatedAmount = amountParam || prev.amount;

        if (eventIdParam && eventsList.length > 0) {
          const matched = eventsList.find((e) => String(e.id || e.eventId) === String(eventIdParam));
          if (matched) {
            updatedEvName = matched.title || matched.name || matched.eventName || updatedEvName;
            updatedCat = matched.eventTypeName || matched.categoryName || matched.eventType || matched.category || updatedCat;
            if (!amountParam && (matched.amount || matched.contributionAmount)) {
              updatedAmount = String(matched.amount || matched.contributionAmount);
            }
          }
        }

        if (memberIdParam && membersList.length > 0) {
          const matchedMem = membersList.find((m) => String(m.id || m.memberId) === String(memberIdParam));
          if (matchedMem) {
            updatedMemName = matchedMem.name || matchedMem.memberName || updatedMemName;
          }
        }

        return {
          ...prev,
          eventId: eventIdParam || prev.eventId,
          memberId: memberIdParam || prev.memberId,
          eventCategory: updatedCat,
          eventName: updatedEvName,
          memberName: updatedMemName || authState?.fullName || "",
          amount: updatedAmount,
        };
      });
    }
  }, [eventIdParam, memberIdParam, amountParam, eventsList, membersList, authState?.fullName]);

  // Dynamic Dues Summary & Payment Scope State (Loaded from API)
  const [duesSummary, setDuesSummary] = useState(null);
  const [paymentScope, setPaymentScope] = useState("");

  const handlePaymentScopeChange = (scope) => {
    setPaymentScope(scope);
    if (!duesSummary) return;
    let amt = duesSummary.totalDue;
    if (scope === "CurrentEvent") amt = duesSummary.currentEventDue;
    if (scope === "PreviousArrears") amt = duesSummary.previousArrears;
    setFormData((prev) => ({ ...prev, amount: String(amt) }));
  };

  // Sync Member/Event context dynamically from backend API when form opens or selection changes
  useEffect(() => {
    if (formModalOpen && (formData.eventId || formData.eventName || formData.memberId || formData.memberName)) {
      const loadContext = async () => {
        try {
          const res = await getPaymentContextAsync({
            eventId: formData.eventId || undefined,
            memberId: formData.memberId || undefined,
            eventName: formData.eventName || undefined,
            memberName: formData.memberName || undefined,
          });

          const matchedEvent = (eventsList || []).find(
            (ev) => (ev.title || ev.name || ev.eventName) === formData.eventName || (ev.id || ev.eventId) === formData.eventId
          );

          if (res) {
            const currentEvDue = Number(res.currentEventDue ?? res.amount ?? matchedEvent?.amount ?? matchedEvent?.contributionAmount ?? 0);
            const prevArrears = Number(res.previousArrears ?? res.arrears ?? 0);
            const total = Number((res.totalDue ?? (currentEvDue + prevArrears)).toFixed(2));
            const baseAmt = Number(res.amount ?? matchedEvent?.amount ?? matchedEvent?.contributionAmount ?? currentEvDue);

            const isPaidStatus =
              String(res.status || "").toLowerCase() === "paid" ||
              String(res.status || "").toLowerCase() === "verified" ||
              String(res.status || "").toLowerCase() === "completed" ||
              (res.totalDue === 0 && (res.currentEventDue ?? 0) === 0);

            setDuesSummary({
              currentEventDue: isPaidStatus ? 0 : currentEvDue,
              previousArrears: isPaidStatus ? 0 : prevArrears,
              totalDue: isPaidStatus ? 0 : (total > 0 ? total : currentEvDue),
              status: isPaidStatus ? "Paid" : (res.status || (currentEvDue === 0 && baseAmt > 0 ? "Paid" : "Pending")),
              baseAmount: baseAmt,
            });
            if (!paymentScope) setPaymentScope("AllOutstanding");

            setFormData((prev) => ({
              ...prev,
              eventName: res.eventName || prev.eventName,
              memberName: res.memberName || prev.memberName || authState?.fullName || "",
              amount: isPaidStatus || total === 0 ? "0.00" : (total > 0 ? String(total) : currentEvDue > 0 ? String(currentEvDue) : prev.amount),
            }));
          } else if (matchedEvent) {
            const currentEvDue = Number(matchedEvent.amount || matchedEvent.contributionAmount || 0);
            setDuesSummary({
              currentEventDue: currentEvDue,
              previousArrears: 0,
              totalDue: currentEvDue,
              status: "Pending",
              baseAmount: currentEvDue,
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
  }, [formModalOpen, formData.eventId, formData.memberId, formData.eventName, formData.memberName, eventsList]);

  const categoryOptions = useMemo(() => {
    const list = [{ label: "Select Event Category", value: "" }];
    const set = new Set();

    (eventTypesList || []).forEach((et) => {
      const name = et.typeName || et.name || et.eventTypeName;
      if (name && !set.has(name)) {
        set.add(name);
        list.push({ label: name, value: name });
      }
    });

    (eventsList || []).forEach((e) => {
      const cat = e.eventTypeName || e.categoryName || e.eventType || e.category;
      if (cat && !set.has(cat)) {
        set.add(cat);
        list.push({ label: cat, value: cat });
      }
    });

    return list;
  }, [eventTypesList, eventsList]);

  const filteredEventOptions = useMemo(() => {
    const list = [{ label: "Select Event Name", value: "" }];
    const set = new Set();

    (eventsList || []).forEach((e) => {
      const title = e.title || e.name || e.eventName;
      const cat = e.eventTypeName || e.categoryName || e.eventType || e.category || "";

      if (!formData.eventCategory || cat.toLowerCase() === formData.eventCategory.toLowerCase()) {
        if (title && !set.has(title)) {
          set.add(title);
          list.push({ label: title, value: title });
        }
      }
    });

    return list;
  }, [eventsList, formData.eventCategory]);

  const memberOptions = useMemo(() => {
    return [
      { label: "All Members", value: "ALL" },
      ...membersList.map((m) => ({
        label: m.name || m.memberName,
        value: m.name || m.memberName,
      })),
    ];
  }, [membersList]);

  const eventOptions = useMemo(() => {
    return [
      { label: "All Events", value: "ALL" },
      ...eventsList.map((e) => ({
        label: e.title || e.name || e.eventName,
        value: e.title || e.name || e.eventName,
      })),
    ];
  }, [eventsList]);

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

    return list;
  }, [dbPaymentModes]);

  useEffect(() => {
    if (dynamicPaymentModes.length > 0) {
      setFormData((prev) => {
        const exists = dynamicPaymentModes.some(
          (m) => m.value.toLowerCase() === (prev.paymentMode || "").toLowerCase()
        );
        if (!exists) {
          return { ...prev, paymentMode: dynamicPaymentModes[0].value };
        }
        return prev;
      });
    }
  }, [dynamicPaymentModes]);

  const modeOptions = useMemo(() => {
    return [
      { label: "All Modes", value: "ALL" },
      ...dynamicPaymentModes.map((m) => ({ label: m.label, value: m.value })),
    ];
  }, [dynamicPaymentModes]);

  const statusOptions = useMemo(() => {
    return [
      { label: "All Statuses", value: "ALL" },
      { label: "Pending", value: "Pending" },
      { label: "Verified", value: "Verified" },
    ];
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (appliedMember !== "ALL" && t.memberName !== appliedMember) return false;
      if (appliedEvent !== "ALL" && t.eventName !== appliedEvent) return false;
      if (appliedMode !== "ALL" && t.paymentMode !== appliedMode) return false;
      if (appliedStatus !== "ALL" && t.status !== appliedStatus) return false;
      if (appliedDate && t.paymentDate) {
        const rowD = dayjs(t.paymentDate).format("YYYY-MM-DD");
        const filterD = dayjs(appliedDate).format("YYYY-MM-DD");
        if (rowD !== filterD) return false;
      }
      return true;
    });
  }, [transactions, appliedMember, appliedEvent, appliedMode, appliedStatus, appliedDate]);

  const validateForm = () => {
    const errs = {};
    if (!formData.memberName.trim()) errs.memberName = "Member Name is required";
    if (!formData.eventCategory.trim()) errs.eventCategory = "Event Category is required";
    if (!formData.eventName.trim()) errs.eventName = "Event Name is required";
    if (!formData.amount || Number(formData.amount) <= 0) errs.amount = "Valid amount is required";

    const isCash = String(formData.paymentMode || "").toLowerCase().includes("cash");
    if (!isCash) {
      if (!formData.utr.trim()) {
        errs.utr = "UPI / Reference Number is required";
      } else if (formData.utr.trim().length < 6) {
        errs.utr = "UTR must be at least 6 characters";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitProof = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const isCash = String(formData.paymentMode || "").toLowerCase().includes("cash");
      const finalUtr = formData.utr.trim() || (isCash ? "CASH" : "-");

      const payload = {
        eventId: formData.eventId || undefined,
        memberId: formData.memberId || undefined,
        memberName: formData.memberName.trim(),
        eventName: formData.eventName.trim(),
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        utr: finalUtr,
        paymentDate: formData.paymentDate
          ? formData.paymentDate.toISOString()
          : new Date().toISOString(),
        screenshot: formData.screenshot || null,
        notes: formData.notes.trim() || null,
      };

      const res = await submitPaymentProofAsync(payload);
      toast.success("Payment submission successfully!");

      addNotification({
        type: "PAYMENT_PENDING",
        title: "New Payment Submission",
        message: `Member ${formData.memberName} submitted payment of ₹${formData.amount} (${formData.paymentMode}, UTR: ${finalUtr}). Status: Pending verification.`,
        link: "/payments",
      });

      // Synchronize with Contribution module in real-time
      window.dispatchEvent(
        new CustomEvent("contribution_updated", {
          detail: { action: "submit", payload, result: res },
        })
      );

      setFormModalOpen(false);
      setFormData({
        eventId: "",
        memberId: "",
        eventName: "",
        memberName: authState?.fullName || "",
        amount: "",
        paymentMode: dynamicPaymentModes[0]?.value || "GPay",
        utr: "",
        paymentDate: dayjs(),
        notes: "",
        screenshot: "",
      });
      setErrors({});
      await loadData();
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

  const renderStatusBadge = (status) => {
    let color = "#b45309";
    let bg = "rgba(234,179,8,0.12)";

    const st = String(status || "").toLowerCase().trim();

    if (st === "verified" || st === "closed") {
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
        }}
      />
    );
  };

  const renderUtrReferenceBadges = (rawUtr) => {
    if (!rawUtr || rawUtr === "-" || rawUtr === "--") {
      return (
        <Typography variant="body2" sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          --
        </Typography>
      );
    }

    const str = String(rawUtr).trim();
    const parts = str.includes(";")
      ? str.split(";").map((p) => p.trim()).filter(Boolean)
      : [str];

    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, alignItems: "center" }}>
        {parts.map((part, idx) => {
          const colonIdx = part.indexOf(":");
          let modeName = "";
          let refVal = part;

          if (colonIdx > 0) {
            modeName = part.substring(0, colonIdx).trim();
            refVal = part.substring(colonIdx + 1).trim();
          }

          const lowerMode = modeName.toLowerCase();
          let color = "#4a3f6b";
          let bg = "rgba(74, 63, 107, 0.08)";
          let border = "rgba(74, 63, 107, 0.22)";

          if (lowerMode.includes("gpay") || lowerMode.includes("google")) {
            color = "#2563eb";
            bg = "rgba(37, 99, 235, 0.08)";
            border = "rgba(37, 99, 235, 0.28)";
          } else if (lowerMode.includes("phonepe") || lowerMode.includes("phone")) {
            color = "#7c3aed";
            bg = "rgba(124, 58, 237, 0.08)";
            border = "rgba(124, 58, 237, 0.28)";
          } else if (lowerMode.includes("paytm")) {
            color = "#0284c7";
            bg = "rgba(2, 132, 199, 0.08)";
            border = "rgba(2, 132, 199, 0.28)";
          } else if (lowerMode.includes("upi") || lowerMode.includes("bhim")) {
            color = "#ea580c";
            bg = "rgba(234, 88, 12, 0.08)";
            border = "rgba(234, 88, 12, 0.28)";
          } else if (lowerMode.includes("cash")) {
            color = "#16a34a";
            bg = "rgba(22, 163, 74, 0.08)";
            border = "rgba(22, 163, 74, 0.28)";
          } else if (lowerMode.includes("bank") || lowerMode.includes("transfer") || lowerMode.includes("neft")) {
            color = "#059669";
            bg = "rgba(5, 150, 105, 0.08)";
            border = "rgba(5, 150, 105, 0.28)";
          }

          const isNumericRef = /^[0-9A-Za-z_-]{5,}$/.test(refVal);

          return (
            <Box
              key={idx}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.9,
                py: 0.25,
                borderRadius: "6px",
                bgcolor: bg,
                border: `1px solid ${border}`,
                whiteSpace: "nowrap",
              }}
            >
              {modeName ? (
                <>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      color: color,
                    }}
                  >
                    {modeName}:
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.73rem",
                      color: (t) => t.palette.mode === "dark" ? "#e2e8f0" : "#1e293b",
                      fontFamily: isNumericRef ? "monospace" : "inherit",
                    }}
                  >
                    {refVal}
                  </Typography>
                </>
              ) : (
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.74rem",
                    color: (t) => t.palette.mode === "dark" ? "#e2e8f0" : "#1e293b",
                    fontFamily: isNumericRef ? "monospace" : "inherit",
                  }}
                >
                  {refVal}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const columns = [
    {
      label: "Action",
      key: "action",
      render: (row) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedTxn(row);
                setViewDialogOpen(true);
              }}
              sx={{ color: "primary.main", p: 0.3 }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
    {
      label: "Txn / Ref ID",
      key: "id",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{
            color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
            cursor: "pointer",
            fontSize: "0.8rem",
            "&:hover": { textDecoration: "underline" },
          }}
          onClick={() => {
            setSelectedTxn(row);
            setViewDialogOpen(true);
          }}
        >
          {row.id}
        </Typography>
      ),
    },
    {
      label: "Member Name",
      key: "memberName",
      render: (row) => (
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
          {row.memberName}
        </Typography>
      ),
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          {row.eventName || "--"}
        </Typography>
      ),
    },
    {
      label: "Amount",
      key: "amount",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
          ₹{Number(row.amount).toLocaleString("en-IN")}
        </Typography>
      ),
    },
    {
      label: "Payment Date",
      key: "paymentDate",
      render: (row) => formatGridDate(row.paymentDate),
    },
    {
      label: "Payment Mode",
      key: "paymentMode",
      render: (row) => {
        const color = getModeColor(row.paymentMode);
        return (
          <Chip
            label={row.paymentMode}
            size="small"
            sx={{
              bgcolor: `${color}18`,
              color: color,
              fontWeight: 700,
              fontSize: "0.72rem",
              height: 22,
            }}
          />
        );
      },
    },
    {
      label: "UTR / Reference No",
      key: "utr",
      render: (row) => renderUtrReferenceBadges(row.utr),
    },
    {
      label: "Verification Status",
      key: "status",
      render: (row) => renderStatusBadge(row.status),
    },
    {
      label: "Attachment",
      key: "screenshot",
      render: (row) =>
        row.screenshot ? (
          <Tooltip title="View Attachment Screenshot">
            <Chip
              icon={<ImageIcon sx={{ fontSize: "0.85rem !important", color: "#4a3f6b !important" }} />}
              label="View Image"
              size="small"
              clickable
              onClick={() => {
                setPreviewImageSrc(getImageUrl(row.screenshot));
                setPreviewImageTitle(`Attachment Proof - ${row.id}`);
                setPreviewModalOpen(true);
              }}
              sx={{
                bgcolor: "rgba(74,63,107,0.12)",
                color: "#4a3f6b",
                fontWeight: 700,
                fontSize: "0.72rem",
                height: 22,
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(74,63,107,0.2)" },
              }}
            />
          </Tooltip>
        ) : (
          <Typography variant="body2" sx={{ fontSize: "0.78rem", color: "text.disabled" }}>
            --
          </Typography>
        ),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Payment Submissions"
        columns={columns}
        data={transactions}
        loading={loading}
        actions={
          <AppButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormModalOpen(true)}
          >
            Add
          </AppButton>
        }
      />

      {/* ── Submit Payment Details Modal Form ── */}
      <SubmitPaymentModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => loadData()}
        initialEventId={eventIdParam}
        initialMemberId={memberIdParam}
        initialAmount={amountParam}
      />

      {/* ── View Transaction Details Dialog ── */}
      <AppDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedTxn(null);
        }}
        title="Payment Submission Details"
        maxWidth="sm"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton variant="outlined" onClick={() => setViewDialogOpen(false)}>
              Close
            </AppButton>
            {selectedTxn && selectedTxn.status !== "Verified" && (
              <AppButton
                variant="outlined"
                color="error"
                startIcon={<TicketIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  navigate("/support-tickets", {
                    state: {
                      raiseTicket: true,
                      transactionId: selectedTxn.id,
                      memberName: selectedTxn.memberName,
                      relatedEvent: selectedTxn.eventName,
                      amount: selectedTxn.amount,
                      paymentMode: selectedTxn.paymentMode,
                      utr: selectedTxn.utr,
                    },
                  });
                }}
              >
                Raise Support Ticket
              </AppButton>
            )}
          </Stack>
        }
      >
        {selectedTxn && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: "10px" }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Transaction ID
                  </Typography>
                  <Typography variant="body2" fontWeight={800}>
                    {selectedTxn.id}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.2 }}>{renderStatusBadge(selectedTxn.status)}</Box>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Member Name
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {selectedTxn.memberName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Event Name
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {selectedTxn.eventName || "--"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Amount Paid
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="primary.main">
                    ₹{Number(selectedTxn.amount).toLocaleString("en-IN")}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {selectedTxn.paymentMode}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    UTR / Reference Number
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                    {selectedTxn.utr}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {selectedTxn.screenshot && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Attached Payment Proof Screenshot
                </Typography>
                <Box
                  component="img"
                  src={getImageUrl(selectedTxn.screenshot)}
                  alt="Payment Proof"
                  sx={{
                    width: "100%",
                    maxHeight: 250,
                    objectFit: "contain",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </AppDialog>

      {/* ── Image Attachment Preview Modal ── */}
      <AppDialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={previewImageTitle || "Attachment Proof"}
        maxWidth="md"
        actions={
          <AppButton variant="outlined" onClick={() => setPreviewModalOpen(false)}>
            Close
          </AppButton>
        }
      >
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 1 }}>
          <Box
            component="img"
            src={previewImageSrc}
            alt="Attachment Screenshot"
            sx={{
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          />
        </Box>
      </AppDialog>
      {/* ── Authority Status Update Modal (From Support Status Master) ── */}
      <AppDialog
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setStatusModalTxn(null);
          setAuditRemarks("");
        }}
        title="Authority Status Update"
        maxWidth="sm"
        actions={
          (() => {
            const hasSubmittedProof = Boolean(
              statusModalTxn?.transactionId ||
              (statusModalTxn?.paymentMode && statusModalTxn?.paymentMode !== "-" && statusModalTxn?.paymentMode !== "--" && statusModalTxn?.paymentMode !== "None") ||
              statusModalTxn?.utrNumber ||
              statusModalTxn?.utr
            );
            const actualReceived = hasSubmittedProof ? Number(statusModalTxn?.amount || statusModalTxn?.paidAmount || 0) : 0;
            const isZeroAmount = actualReceived <= 0;

            return (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AppButton variant="outlined" onClick={() => setStatusModalOpen(false)}>
                  Close
                </AppButton>
                <AppButton
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={isZeroAmount}
                  disabledTooltip={isZeroAmount ? "Cannot save or verify: Payment amount has not been received (₹0.00). Member must submit payment first." : ""}
                  onClick={() =>
                    handleStatusUpdate(
                      statusModalTxn,
                      statusChangeValue || statusModalTxn?.status,
                      auditRemarks
                    )
                  }
                >
                  Save
                </AppButton>
              </Stack>
            );
          })()
        }
      >
        {statusModalTxn && (
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


              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppSelect
                    label="Select Status *"
                    value={statusChangeValue || statusModalTxn?.status || "Pending"}
                    onChange={(e) => setStatusChangeValue(e.target.value)}
                    options={getModalStatusOptions(statusModalTxn)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Status Preview
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {renderStatusBadge(statusChangeValue || statusModalTxn?.status)}
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
    </div>
  );
}
