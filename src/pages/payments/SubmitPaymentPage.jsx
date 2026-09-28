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
} from "../../services/paymentService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync } from "../../services/eventService";
import { getStatusesAsync } from "../../services/statusService";
import { getEventTypesAsync } from "../../services/eventTypeService";

const PAYMENT_MODES = [
  { label: "Google Pay", value: "GPay", color: "#2563eb" },
  { label: "PhonePe", value: "PhonePe", color: "#7c3aed" },
  { label: "Paytm", value: "Paytm", color: "#0284c7" },
  { label: "BHIM / UPI", value: "UPI", color: "#ea580c" },
  { label: "Bank Transfer / IMPS", value: "Bank Transfer", color: "#059669" },
];

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

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Attachment Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    eventId: eventIdParam || "",
    memberId: memberIdParam || "",
    eventCategory: "",
    eventName: "",
    memberName: authState?.fullName || "",
    amount: amountParam || "",
    paymentMode: "GPay",
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
      const [txnRes, memsRes, eventsRes, statusRes, eventTypesRes] = await Promise.all([
        getPaymentTransactionsAsync().catch(() => []),
        getMembersAsync().catch(() => []),
        getEventsAsync().catch(() => []),
        getStatusesAsync().catch(() => []),
        getEventTypesAsync().catch(() => []),
      ]);

      if (Array.isArray(memsRes)) setMembersList(memsRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(statusRes)) setDbStatuses(statusRes);
      if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);

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

  useEffect(() => {
    loadData();
    if (eventIdParam || memberIdParam || amountParam) {
      setFormModalOpen(true);
    }
  }, []);

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
    if (formModalOpen) {
      const loadContext = async () => {
        try {
          const res = await getPaymentContextAsync({
            eventId: formData.eventId || undefined,
            memberId: formData.memberId || undefined,
          });

          const matchedEvent = (eventsList || []).find(
            (ev) => (ev.title || ev.name || ev.eventName) === formData.eventName || (ev.id || ev.eventId) === formData.eventId
          );

          if (res) {
            const currentEvDue = Number(res.currentEventDue ?? res.amount ?? matchedEvent?.amount ?? matchedEvent?.contributionAmount ?? 0);
            const prevArrears = Number(res.previousArrears ?? res.arrears ?? 0);
            const total = Number((currentEvDue + prevArrears).toFixed(2));

            if (total > 0 || currentEvDue > 0 || prevArrears > 0) {
              setDuesSummary({
                currentEventDue: currentEvDue,
                previousArrears: prevArrears,
                totalDue: total,
              });
              if (!paymentScope) setPaymentScope("AllOutstanding");
            }

            setFormData((prev) => ({
              ...prev,
              eventName: res.eventName || prev.eventName,
              memberName: res.memberName || prev.memberName || authState?.fullName || "",
              amount: res.amount ? String(res.amount) : total > 0 ? String(total) : prev.amount,
            }));
          } else if (matchedEvent) {
            const currentEvDue = Number(matchedEvent.amount || matchedEvent.contributionAmount || 0);
            if (currentEvDue > 0) {
              setDuesSummary({
                currentEventDue: currentEvDue,
                previousArrears: 0,
                totalDue: currentEvDue,
              });
              setFormData((prev) => ({
                ...prev,
                amount: prev.amount || String(currentEvDue),
              }));
            }
          }
        } catch {
          // Silent fallback
        }
      };
      loadContext();
    }
  }, [formModalOpen, formData.eventId, formData.memberId, formData.eventName, eventsList]);

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

  const modeOptions = useMemo(() => {
    return [
      { label: "All Modes", value: "ALL" },
      ...PAYMENT_MODES.map((m) => ({ label: m.label, value: m.value })),
    ];
  }, []);

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
    if (!formData.utr.trim()) {
      errs.utr = "UPI / Reference Number is required";
    } else if (formData.utr.trim().length < 6) {
      errs.utr = "UTR must be at least 6 characters";
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
      const payload = {
        eventId: formData.eventId || undefined,
        memberId: formData.memberId || undefined,
        memberName: formData.memberName.trim(),
        eventName: formData.eventName.trim(),
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        utr: formData.utr.trim(),
        paymentDate: formData.paymentDate
          ? formData.paymentDate.toISOString()
          : new Date().toISOString(),
        screenshot: formData.screenshot || null,
        notes: formData.notes.trim() || null,
      };

      const res = await submitPaymentProofAsync(payload);
      toast.success("Payment submission recorded successfully!");

      addNotification({
        type: "PAYMENT_PENDING",
        title: "New Payment Submission",
        message: `Member ${formData.memberName} submitted payment of ₹${formData.amount} (${formData.paymentMode}, UTR: ${formData.utr}). Status: Pending verification.`,
        link: "/payments",
      });

      setFormModalOpen(false);
      setFormData({
        eventId: "",
        memberId: "",
        eventName: "",
        memberName: authState?.fullName || "",
        amount: "",
        paymentMode: "GPay",
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

  const columns = [
    {
      label: "Action",
      key: "action",
      render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedTxn(row);
                setViewDialogOpen(true);
              }}
              sx={{ color: "primary.main" }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {row.status !== "Verified" && (
            <Tooltip title="Raise Support Ticket">
              <IconButton
                size="small"
                onClick={() => {
                  navigate("/support-tickets", {
                    state: {
                      raiseTicket: true,
                      transactionId: row.id,
                      memberName: row.memberName,
                      relatedEvent: row.eventName,
                      amount: row.amount,
                      paymentMode: row.paymentMode,
                      utr: row.utr,
                    },
                  });
                }}
                sx={{ color: "#ef4444" }}
              >
                <TicketIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
      render: (row) => (
        <Chip
          label={row.paymentMode}
          size="small"
          sx={{
            bgcolor: "rgba(99, 102, 241, 0.12)",
            color: "#6366f1",
            fontWeight: 700,
            fontSize: "0.72rem",
            height: 22,
          }}
        />
      ),
    },
    {
      label: "UTR / Reference No",
      key: "utr",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          {row.utr || "--"}
        </Typography>
      ),
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
                setPreviewImageSrc(row.screenshot);
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

      {/* ── New Payment Submission Modal Form ── */}
      <AppDialog
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Submit Payment Details"
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5}>
            <AppButton variant="outlined" onClick={() => setFormModalOpen(false)}>
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
          {/* Dynamic Member Dues Summary Banner (Only shown when dues data is loaded from API/Event) */}
          {duesSummary && (duesSummary.totalDue > 0 || duesSummary.currentEventDue > 0 || duesSummary.previousArrears > 0) && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(74, 63, 107, 0.03)"),
                border: "1px solid",
                borderColor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(74, 63, 107, 0.15)"),
              }}
            >
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.8, fontSize: "0.68rem" }}>
                Member Dues Summary
              </Typography>
              <Grid container spacing={1} textAlign="center">
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Current Event</Typography>
                  <Typography variant="body2" fontWeight={800} color={duesSummary.currentEventDue > 0 ? "error.main" : "success.main"}>
                    ₹{(duesSummary.currentEventDue || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Previous Arrears</Typography>
                  <Typography variant="body2" fontWeight={800} color={duesSummary.previousArrears > 0 ? "error.main" : "text.secondary"}>
                    ₹{(duesSummary.previousArrears || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Total Due</Typography>
                  <Typography variant="body2" fontWeight={900} color="primary.main">
                    ₹{(duesSummary.totalDue || 0).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

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
                    ? matchedEvent.eventTypeName || matchedEvent.categoryName || matchedEvent.eventType || matchedEvent.category || formData.eventCategory
                    : formData.eventCategory;

                  setFormData((prev) => ({
                    ...prev,
                    eventName: selectedName,
                    eventId: matchedEvent ? (matchedEvent.id || matchedEvent.eventId || "") : prev.eventId,
                    eventCategory: matchedCategory || prev.eventCategory,
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

          {/* Row 2: Member Name & Payment For (or Amount) */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <AppInput
                label="Contributor / Member Name"
                value={formData.memberName}
                onChange={(e) => setFormData((prev) => ({ ...prev, memberName: e.target.value }))}
                placeholder="Your full name"
                error={!!errors.memberName}
                helperText={errors.memberName}
                required
              />
            </Grid>
            {duesSummary && (duesSummary.currentEventDue > 0 || duesSummary.previousArrears > 0) ? (
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppSelect
                  label="Payment For *"
                  placeholder="Select payment scope"
                  value={paymentScope}
                  onChange={(e) => handlePaymentScopeChange(e.target.value)}
                  options={[
                    ...(duesSummary.currentEventDue > 0 ? [{ label: `Current Event Only (₹${duesSummary.currentEventDue.toLocaleString()})`, value: "CurrentEvent" }] : []),
                    ...(duesSummary.previousArrears > 0 ? [{ label: `Previous Arrears Only (₹${duesSummary.previousArrears.toLocaleString()})`, value: "PreviousArrears" }] : []),
                    ...((duesSummary.currentEventDue > 0 && duesSummary.previousArrears > 0) ? [{ label: `All Outstanding (₹${duesSummary.totalDue.toLocaleString()})`, value: "AllOutstanding" }] : []),
                  ]}
                  required
                />
              </Grid>
            ) : (
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppInput
                  label="Contribution Amount (₹)"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  error={!!errors.amount}
                  helperText={errors.amount}
                  required
                />
              </Grid>
            )}
          </Grid>

          {/* Conditional Rows 3 & 4 based on Dues Summary */}
          {duesSummary && (duesSummary.currentEventDue > 0 || duesSummary.previousArrears > 0) ? (
            <>
              {/* Row 3: Amount & Date */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppInput
                    label="Contribution Amount (₹)"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    error={!!errors.amount}
                    helperText={errors.amount || "Auto-calculated based on payment scope."}
                    required
                  />
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

              {/* Row 4: UTR & Payment Method Chips */}
              <Grid container spacing={2} alignItems="flex-start">
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppInput
                    label="UPI Reference"
                    value={formData.utr}
                    onChange={(e) => setFormData((prev) => ({ ...prev, utr: e.target.value }))}
                    placeholder="e.g. 426189345612"
                    maxLength={20}
                    error={!!errors.utr}
                    helperText={errors.utr || "Find 12-digit number in payment app receipt"}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.8, display: "block" }}>
                    Payment Method Used *
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {PAYMENT_MODES.map((mode) => (
                      <Chip
                        key={mode.value}
                        label={mode.label}
                        clickable
                        onClick={() => setFormData((prev) => ({ ...prev, paymentMode: mode.value }))}
                        sx={{
                          bgcolor: formData.paymentMode === mode.value ? mode.color : "transparent",
                          color: formData.paymentMode === mode.value ? "#ffffff" : "text.primary",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          border: "1px solid",
                          borderColor: formData.paymentMode === mode.value ? mode.color : "divider",
                          px: 0.5,
                          py: 1.5,
                        }}
                      />
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </>
          ) : (
            <>
              {/* Row 3: Date & UTR */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppDateInput
                    label="Payment Date"
                    value={formData.paymentDate}
                    onChange={(newVal) => setFormData((prev) => ({ ...prev, paymentDate: newVal }))}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppInput
                    label="UPI Reference"
                    value={formData.utr}
                    onChange={(e) => setFormData((prev) => ({ ...prev, utr: e.target.value }))}
                    placeholder="e.g. 426189345612"
                    maxLength={20}
                    error={!!errors.utr}
                    helperText={errors.utr || "Find 12-digit number in payment app receipt"}
                    required
                  />
                </Grid>
              </Grid>

              {/* Row 4: Payment Method Chips */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.8, display: "block" }}>
                  Payment Method Used *
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {PAYMENT_MODES.map((mode) => (
                    <Chip
                      key={mode.value}
                      label={mode.label}
                      clickable
                      onClick={() => setFormData((prev) => ({ ...prev, paymentMode: mode.value }))}
                      sx={{
                        bgcolor: formData.paymentMode === mode.value ? mode.color : "transparent",
                        color: formData.paymentMode === mode.value ? "#ffffff" : "text.primary",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        border: "1px solid",
                        borderColor: formData.paymentMode === mode.value ? mode.color : "divider",
                        px: 0.5,
                        py: 1.5,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </>
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
                  src={selectedTxn.screenshot}
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
    </div>
  );
}
