import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  ConfirmationNumberOutlined as TicketIcon,
  PaymentRounded as PaymentRoundedIcon,
  FilterList as FilterListIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";
import SubmitPaymentModal from "../../components/payments/SubmitPaymentModal";

import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { useAppToast } from "../../components/common/AppToast";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  getPaymentTransactionsAsync,
} from "../../services/paymentService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync } from "../../services/eventService";
import { getStatusesAsync } from "../../services/statusService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage, hasActionPermission } from "../../utils/rightsHelper";
import { TOAST_MESSAGES, COMMON_STRINGS, MENU_FEATURE_IDS } from "../../constants";
import { getImageUrl } from "../../services/apiClient";

export default function PaymentsPage() {
  const navigate = useNavigate();
  const toast = useAppToast();
  const { authState } = useAuth();
  const { addNotification } = useNotifications();
  const rights = getRightsForPage("Payments", authState?.role);
  const isAuthorityRole = [
    "admin",
    "superadmin",
    "organizer",
    "treasurer",
    "president",
    "secretary",
    "committee",
  ].includes(String(authState?.role || authState?.user?.role || "").toLowerCase());
  const hasWriteAccess = rights?.write !== undefined ? rights.write : true;

  // Granular Action Permissions
  const canViewPaymentHistory = hasActionPermission("View Payment History", 43, authState?.role).canView;
  const canSubmitPayment = (hasActionPermission("Submit", MENU_FEATURE_IDS.CONTRIBUTION_SUBMIT, authState?.role).canExecute !== false) && hasWriteAccess;
  const isMemberRole = String(authState?.role || "").toLowerCase() === "member";

  const [transactions, setTransactions] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [dbStatuses, setDbStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");

  // Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Filter state
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

  // Dynamically derive payment modes from DB transactions
  const modeOptions = useMemo(() => {
    const set = new Set();
    transactions.forEach((t) => {
      if (t.paymentMode) set.add(t.paymentMode);
    });
    return [
      { label: "All Modes", value: "ALL" },
      ...Array.from(set).map((m) => ({ label: m, value: m })),
    ];
  }, [transactions]);

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

  const statusOptions = useMemo(() => {
    return [
      { label: "All Statuses", value: "ALL" },
      ...(dbStatuses || []).map((s) => ({
        label: s.statusName || s.name || s.status_name,
        value: s.statusName || s.name || s.status_name,
      })),
    ];
  }, [dbStatuses]);


  // Load transactions and master data from backend on mount
  const loadBackendData = async () => {
    try {
      setLoading(true);
      const [txnRes, memsRes, eventsRes, statusRes] = await Promise.all([
        getPaymentTransactionsAsync().catch(() => []),
        getMembersAsync().catch(() => []),
        getEventsAsync().catch(() => []),
        getStatusesAsync().catch(() => []),
      ]);

      if (Array.isArray(memsRes)) setMembersList(memsRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(statusRes)) setDbStatuses(statusRes);

      if (Array.isArray(txnRes)) {
        const mapped = txnRes.map((t) => ({
          id: t.txnNumber || t.id,
          transactionId: t.transactionId,
          parentTxnNumber: t.parentTxnNumber || null,
          transactionGroupId: t.transactionGroupId || null,
          memberName: t.memberName || "",
          eventName: t.eventName || "",
          amount: t.amount || 0,
          paymentDate: t.paymentDate || "",
          paymentMode: t.paymentMode || "",
          utr: t.utr || "-",
          status:
            t.status && t.status !== "Pending"
              ? t.status
              : t.verifiedBy && t.verifiedBy !== "-" && t.verifiedBy !== "--"
              ? "Verified"
              : t.status || "Pending",
          verifiedBy: t.verifiedBy || "-",
          verifiedOn: t.verifiedOn || "-",
          notes: t.notes || "",
          screenshot: t.screenshot || "",
          createdBy: t.createdBy || t.CreatedBy || "--",
          createdOn: t.createdOn || t.CreatedOn || t.createdAt || t.CreatedAt || null,
          createdAt: t.createdAt || t.CreatedAt || t.createdOn || t.CreatedOn || null,
        }));
        setTransactions(mapped);
      }
    } catch {
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
    const handleUpdate = (e) => {
      // Optimistic patch: immediately reflect status change in UI
      const detail = e?.detail || {};
      const verifiedIds = Array.isArray(detail.verifiedTransactionIds)
        ? detail.verifiedTransactionIds
        : [];
      const verifiedStatus = detail.status || "Verified";
      const target = detail.target || {};

      setTransactions((prev) =>
        prev.map((t) => {
          const isIdMatch =
            verifiedIds.includes(t.transactionId) || verifiedIds.includes(t.id);
          const isTargetMatch =
            target.memberName &&
            target.eventName &&
            t.memberName?.trim().toLowerCase() === target.memberName?.trim().toLowerCase() &&
            t.eventName?.trim().toLowerCase() === target.eventName?.trim().toLowerCase();

          if (isIdMatch || isTargetMatch) {
            return {
              ...t,
              status: verifiedStatus,
              verifiedBy: detail.verifier || (t.verifiedBy && t.verifiedBy !== "-" ? t.verifiedBy : "Verified"),
            };
          }
          return t;
        })
      );

      // Then reload from server to get accurate persisted data
      loadBackendData();
    };
    window.addEventListener("contribution_updated", handleUpdate);
    return () => window.removeEventListener("contribution_updated", handleUpdate);
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (isMemberRole) {
        const userFullName = String(authState?.fullName || authState?.user?.fullName || authState?.name || "").trim().toLowerCase();
        const userEmail = String(authState?.email || "").trim().toLowerCase();
        const txnMember = String(t.memberName || "").trim().toLowerCase();
        if (userFullName && txnMember !== userFullName && (!t.email || String(t.email).trim().toLowerCase() !== userEmail)) {
          return false;
        }
      } else if (appliedMember !== "ALL" && t.memberName !== appliedMember) {
        return false;
      }
      if (appliedEvent !== "ALL" && t.eventName !== appliedEvent) return false;
      if (appliedMode !== "ALL" && t.paymentMode !== appliedMode) return false;
      if (appliedStatus !== "ALL" && t.status !== appliedStatus) return false;
      if (appliedDate && !dayjs(t.paymentDate).isSame(appliedDate, "day")) return false;
      return true;
    });
  }, [transactions, appliedMember, appliedEvent, appliedMode, appliedStatus, appliedDate, isMemberRole, authState]);


  const renderPaymentModeBadge = (mode) => {
    const raw = String(mode || "").trim();
    const lower = raw.toLowerCase().replace(/[\s\-_/]+/g, "");
    let color = "#3b82f6";

    if (lower.includes("gpay") || lower.includes("google")) color = "#2563eb";
    else if (lower.includes("phonepe") || lower.includes("phone")) color = "#7c3aed";
    else if (lower.includes("paytm")) color = "#0284c7";
    else if (lower.includes("upi") || lower.includes("bhim")) color = "#ea580c";
    else if (lower.includes("cash")) color = "#16a34a";
    else if (lower.includes("bank") || lower.includes("transfer") || lower.includes("neft") || lower.includes("imps")) color = "#059669";

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.6,
          bgcolor: `${color}18`,
          color: color,
          px: 1,
          py: 0.2,
          borderRadius: "6px",
        }}
      >
        <PaymentRoundedIcon sx={{ fontSize: 13 }} />
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.72rem" }}>
          {raw || "Payment"}
        </Typography>
      </Box>
    );
  };

  const renderStatusBadge = (status) => {
    let bg = "rgba(100, 116, 139, 0.1)";
    let color = "#64748b";
    let border = "rgba(100, 116, 139, 0.25)";

    const st = String(status || "").toLowerCase().trim();

    if (st === "verified" || st === "closed" || st === "paid") {
      bg = "rgba(22, 163, 74, 0.1)";
      color = "#16a34a";
      border = "rgba(22, 163, 74, 0.25)";
    } else if (st === "pending") {
      bg = "rgba(234, 179, 8, 0.12)";
      color = "#b45309";
      border = "rgba(234, 179, 8, 0.3)";
    } else if (st === "in progress") {
      bg = "rgba(99, 102, 241, 0.12)";
      color = "#6366f1";
      border = "rgba(99, 102, 241, 0.25)";
    } else if (st === "open") {
      bg = "rgba(2, 132, 199, 0.1)";
      color = "#0284c7";
      border = "rgba(2, 132, 199, 0.25)";
    } else if (st === "failed" || st === "rejected") {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#dc2626";
      border = "rgba(239, 68, 68, 0.25)";
    } else if (st === "needs clarification") {
      bg = "rgba(2, 132, 199, 0.1)";
      color = "#0284c7";
      border = "rgba(2, 132, 199, 0.25)";
    }

    return (
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          bgcolor: bg,
          color: color,
          border: `1px solid ${border}`,
          px: 1.2,
          py: 0.3,
          borderRadius: "12px",
          fontSize: "0.72rem",
          display: "inline-block",
        }}
      >
        {st === "paid" ? "Verified" : (status || "Pending")}
      </Typography>
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
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title={canViewPaymentHistory ? "View Details" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canViewPaymentHistory ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canViewPaymentHistory}
                onClick={() => {
                  if (!canViewPaymentHistory) return;
                  setSelectedTxn(row);
                  setViewDialogOpen(true);
                }}
              >
                <ViewIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canViewPaymentHistory
                        ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")
                        : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8"),
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    {
      label: "Transaction ID",
      key: "id",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
          {row.parentTxnNumber && (
            <Chip
              label="Split"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: "rgba(99, 102, 241, 0.1)",
                color: "#6366f1",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            />
          )}
        </Box>
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
      render: (row) => row.eventName || "--",
    },
    {
      label: "Amount",
      key: "amount",
      render: (row) => `₹${Number(row.amount).toLocaleString("en-IN")}`,
    },
    {
      label: "Payment Date",
      key: "paymentDate",
      render: (row) => formatGridDate(row.paymentDate),
    },
    {
      label: "Payment Mode",
      key: "paymentMode",
      render: (row) => renderPaymentModeBadge(row.paymentMode),
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
      label: "Verified By",
      key: "verifiedBy",
      render: (row) => row.verifiedBy || "--",
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdOn",
      render: (row) => formatGridDate(row.createdOn || row.CreatedOn || row.createdAt || row.CreatedAt),
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
        title={isMemberRole ? "My Payment History" : "Payment History"}
        columns={columns}
        data={filteredTransactions}
        loading={loading}

        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{ xs: 12, md: 10 }}
              sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
            >
              {!isMemberRole && (
                <Box sx={{ minWidth: 180 }}>
                  <AppSelect
                    label="Select Member"
                    value={filterMember}
                    onChange={(e) => {
                      setFilterMember(e.target.value);
                    }}
                    options={memberOptions}
                    size="small"
                    placeholder="Select Member"
                    fullWidth
                  />
                </Box>
              )}
              <Box sx={{ minWidth: 180 }}>
                <AppSelect
                  label="Select Event Name"
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value);
                  }}
                  options={eventOptions}
                  size="small"
                  placeholder="Select Event Name"
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 140 }}>
                <AppSelect
                  label="Payment Mode"
                  value={filterMode}
                  onChange={(e) => {
                    setFilterMode(e.target.value);
                  }}
                  options={modeOptions}
                  size="small"
                  placeholder="Payment Mode"
                  fullWidth
                />
              </Box>
              <Box sx={{ width: 160, minWidth: 160 }}>
                <AppSelect
                  label="Select Status"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                  }}
                  options={statusOptions}
                  size="small"
                  placeholder="Select Status"
                  required
                  fullWidth
                />
              </Box>
              <Box sx={{ width: 170, minWidth: 165 }}>
                <AppDateInput
                  label="Payment Date"
                  value={filterDate}
                  onChange={(newVal) => {
                    setFilterDate(newVal);
                  }}
                  size="small"
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setAppliedMember(filterMember);
                  setAppliedEvent(filterEvent);
                  setAppliedMode(filterMode);
                  setAppliedStatus(filterStatus);
                  setAppliedDate(filterDate);
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
                  setFilterMember("ALL");
                  setFilterEvent("ALL");
                  setFilterMode("ALL");
                  setFilterStatus("ALL");
                  setFilterDate(null);
                  setAppliedMember("ALL");
                  setAppliedEvent("ALL");
                  setAppliedMode("ALL");
                  setAppliedStatus("ALL");
                  setAppliedDate(null);
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

      {/* Transaction Details Dialog */}
      <AppDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedTxn(null);
        }}
        title="Transaction Details"
        maxWidth="sm"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <AppButton variant="outlined" onClick={() => setViewDialogOpen(false)}>
              Close
            </AppButton>
            {selectedTxn && selectedTxn.status !== "Closed" && (
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1.5,
                borderRadius: "10px",
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Transaction Number
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color={(t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")}
                >
                  {selectedTxn.id}
                </Typography>
              </Box>
              <Box>{renderStatusBadge(selectedTxn.status)}</Box>
            </Box>

            {selectedTxn.parentTxnNumber && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "8px",
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)",
                  border: "1px dashed rgba(99, 102, 241, 0.3)",
                }}
              >
                <Typography variant="caption" sx={{ color: "#6366f1", fontWeight: 700, display: "block" }}>
                  Multi-Mode Payment Group: {selectedTxn.parentTxnNumber}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
                  This transaction is a child breakdown item of payment group {selectedTxn.parentTxnNumber}. Group verification updates all split components together.
                </Typography>
              </Box>
            )}

            <Grid container spacing={2}>
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
                <Typography variant="body2" fontWeight={600}>
                  {selectedTxn.eventName || "--"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Amount
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color={(t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")}
                >
                  ₹{Number(selectedTxn.amount).toLocaleString("en-IN")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Payment Mode
                </Typography>
                <Box sx={{ mt: 0.5 }}>{renderPaymentModeBadge(selectedTxn.paymentMode)}</Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  UTR / Reference No
                </Typography>
                <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                  {renderUtrReferenceBadges(selectedTxn.utr)}
                  {selectedTxn.utr && selectedTxn.utr !== "-" && selectedTxn.utr !== "--" && (
                    <Tooltip title="Copy Reference">
                      <IconButton
                        size="small"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedTxn.utr);
                            toast.success("Reference copied to clipboard!");
                          } catch {
                            toast.error("Failed to copy reference");
                          }
                        }}
                        sx={{ p: 0.3 }}
                      >
                        <CopyIcon sx={{ fontSize: 15, color: "#64748b" }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Payment Date
                </Typography>
                <Typography variant="body2">
                  {formatViewDateTime(selectedTxn.paymentDate)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Verified By
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedTxn.verifiedBy || "--"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Verified On
                </Typography>
                <Typography variant="body2">
                  {selectedTxn.verifiedOn && selectedTxn.verifiedOn !== "-"
                    ? formatViewDateTime(selectedTxn.verifiedOn)
                    : "--"}
                </Typography>
              </Grid>

              {selectedTxn.notes && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                      border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                  >
                    {selectedTxn.notes}
                  </Typography>
                </Grid>
              )}

              {selectedTxn.screenshot && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Payment Screenshot / Receipt Proof
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      p: 1.5,
                      border: "1.5px solid",
                      borderColor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#e2e8f0",
                      borderRadius: 2.5,
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                      textAlign: "center",
                    }}
                  >
                    <img
                      src={getImageUrl(selectedTxn.screenshot)}
                      alt="Payment proof receipt"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 240,
                        borderRadius: 8,
                        display: "block",
                        margin: "0 auto",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    />
                  </Box>
                </Grid>
              )}


            </Grid>
          </Box>
        )}
      </AppDialog>

      {/* ── Submit Payment Modal Form ── */}
      <SubmitPaymentModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={() => loadBackendData()}
        initialEventId={searchParams.get("eventId")}
        initialMemberId={searchParams.get("memberId")}
        initialAmount={searchParams.get("amount")}
      />

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
