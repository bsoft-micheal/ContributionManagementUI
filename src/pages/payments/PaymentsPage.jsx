import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Divider,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  CheckCircleOutline as CheckCircleIcon,
  PaymentRounded as PaymentRoundedIcon,
  FileDownloadOutlined as FileDownloadIcon,
  ReceiptLongOutlined as ReceiptIcon,
  FilterList as FilterListIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { useAppToast } from "../../components/common/AppToast";
import {
  getPaymentTransactionsAsync,
  verifyPaymentTransactionAsync,
} from "../../services/paymentService";
import { GetMembersAsync } from "../../services/memberService";
import { GetEventsAsync } from "../../services/eventService";
import { GetStatusesAsync } from "../../services/statusService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

export default function PaymentsPage() {
  const toast = useAppToast();
  const { authState } = useAuth();
  const rights = getRightsForPage("Payments", authState?.role);
  const hasWriteAccess = rights?.write !== undefined ? rights.write : true;

  const [transactions, setTransactions] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [dbStatuses, setDbStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Dynamically derive payment modes from DB transactions + standard options
  const modeOptions = useMemo(() => {
    const set = new Set(["GPay", "PhonePe", "Paytm", "UPI"]);
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
    if (dbStatuses && dbStatuses.length > 0) {
      return [
        { label: "All Statuses", value: "ALL" },
        ...dbStatuses.map((s) => ({
          label: s.statusName || s.name || s.status_name,
          value: s.statusName || s.name || s.status_name,
        })),
      ];
    }
    return [
      { label: "All Statuses", value: "ALL" },
      { label: "Verified", value: "Verified" },
      { label: "Pending", value: "Pending" },
      { label: "Failed", value: "Failed" },
      { label: "Needs Clarification", value: "Needs Clarification" },
    ];
  }, [dbStatuses]);

  // Load transactions and master data from backend on mount
  const loadBackendData = async () => {
    try {
      setLoading(true);
      const [txnRes, memsRes, eventsRes, statusRes] = await Promise.all([
        getPaymentTransactionsAsync().catch(() => []),
        GetMembersAsync().catch(() => []),
        GetEventsAsync().catch(() => []),
        GetStatusesAsync().catch(() => []),
      ]);

      if (Array.isArray(memsRes)) setMembersList(memsRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(statusRes)) setDbStatuses(statusRes);

      if (Array.isArray(txnRes)) {
        const mapped = txnRes.map((t) => ({
          id: t.txnNumber || t.id,
          transactionId: t.transactionId,
          memberName: t.memberName || "",
          eventName: t.eventName || "",
          amount: t.amount || 0,
          paymentDate: t.paymentDate || "",
          paymentMode: t.paymentMode || "",
          utr: t.utr || "-",
          status: t.status || "Pending",
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
    } catch (err) {
      console.warn("Could not fetch payments from backend:", err);
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (appliedMember !== "ALL" && t.memberName !== appliedMember) return false;
      if (appliedEvent !== "ALL" && t.eventName !== appliedEvent) return false;
      if (appliedMode !== "ALL" && t.paymentMode !== appliedMode) return false;
      if (appliedStatus !== "ALL" && t.status !== appliedStatus) return false;
      if (appliedDate && !dayjs(t.paymentDate).isSame(appliedDate, "day")) return false;
      return true;
    });
  }, [transactions, appliedMember, appliedEvent, appliedMode, appliedStatus, appliedDate]);

  const handleVerify = async (txn) => {
    const target = txn || selectedTxn;
    if (!target) return;

    const verifier = authState?.fullName || authState?.username || authState?.user?.name || authState?.user?.username || "";
    if (target.transactionId) {
      try {
        await verifyPaymentTransactionAsync(target.transactionId, {
          status: "Verified",
          verifiedBy: verifier,
          notes: verifier ? `Payment verified by ${verifier}.` : "Payment verified.",
        });
        toast.success(TOAST_MESSAGES.PAYMENTS.VERIFIED_SUCCESS);
        await loadBackendData();
      } catch (err) {
        console.error("Backend verify failed:", err);
        toast.error(TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
      }
    }

    if (selectedTxn && selectedTxn.id === target.id) {
      setSelectedTxn((prev) => ({
        ...prev,
        status: "Verified",
        verifiedBy: verifier,
        verifiedOn: dayjs().format("YYYY-MM-DDTHH:mm:ss"),
        notes: `Payment verified by ${verifier}.`,
      }));
    }
  };

  const handleMarkPending = async (txn) => {
    const target = txn || selectedTxn;
    if (!target) return;

    if (target.transactionId) {
      try {
        await verifyPaymentTransactionAsync(target.transactionId, {
          status: "Pending",
          verifiedBy: "-",
          notes: "Marked as pending.",
        });
        toast.info(TOAST_MESSAGES.PAYMENTS.STATUS_UPDATED || TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
        await loadBackendData();
      } catch (err) {
        console.error("Backend update failed:", err);
        toast.error(TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
      }
    }

    if (selectedTxn && selectedTxn.id === target.id) {
      setSelectedTxn((prev) => ({
        ...prev,
        status: "Pending",
        verifiedBy: "-",
        verifiedOn: "-",
      }));
    }
  };

  const renderPaymentModeBadge = (mode) => {
    let color = "#3b82f6";
    let bg = "rgba(59, 130, 246, 0.1)";

    if (mode === "GPay") {
      color = "#2563eb";
      bg = "rgba(37, 99, 235, 0.1)";
    } else if (mode === "PhonePe") {
      color = "#7c3aed";
      bg = "rgba(124, 58, 237, 0.1)";
    } else if (mode === "Paytm") {
      color = "#0284c7";
      bg = "rgba(2, 132, 199, 0.1)";
    } else if (mode === "UPI") {
      color = "#ea580c";
      bg = "rgba(234, 88, 12, 0.1)";
    }

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.6,
          bgcolor: bg,
          color: color,
          px: 1,
          py: 0.2,
          borderRadius: "6px",
        }}
      >
        <PaymentRoundedIcon sx={{ fontSize: 13 }} />
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.72rem" }}>
          {mode || "UPI"}
        </Typography>
      </Box>
    );
  };

  const renderStatusBadge = (status) => {
    let bg = "rgba(100, 116, 139, 0.1)";
    let color = "#64748b";
    let border = "rgba(100, 116, 139, 0.25)";

    if (status === "Verified") {
      bg = "rgba(22, 163, 74, 0.1)";
      color = "#16a34a";
      border = "rgba(22, 163, 74, 0.25)";
    } else if (status === "Pending") {
      bg = "rgba(234, 179, 8, 0.12)";
      color = "#b45309";
      border = "rgba(234, 179, 8, 0.3)";
    } else if (status === "Failed") {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#dc2626";
      border = "rgba(239, 68, 68, 0.25)";
    } else if (status === "Needs Clarification") {
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
        {status}
      </Typography>
    );
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => {
                setSelectedTxn(row);
                setViewDialogOpen(true);
              }}
            >
              <ViewIcon
                sx={{
                  fontSize: "1.05rem",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                }}
              />
            </IconButton>
          </Tooltip>
          {hasWriteAccess && row.status !== "Verified" && (
            <Tooltip title="Mark Verified">
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                onClick={() => handleVerify(row)}
              >
                <CheckCircleIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: "#16a34a",
                  }}
                />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      label: "Transaction ID",
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
      render: (row) => (
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.76rem" }}>
          {formatGridDate(row.paymentDate)}
        </Typography>
      ),
    },
    {
      label: "Payment Mode",
      key: "paymentMode",
      render: (row) => renderPaymentModeBadge(row.paymentMode),
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
      label: "Verified By",
      key: "verifiedBy",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          {row.verifiedBy || "--"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          {row.createdBy || row.CreatedBy || "--"}
        </Typography>
      ),
    },
    {
      label: "Created On",
      key: "createdOn",
      render: (row) => formatGridDate(row.createdOn || row.CreatedOn || row.createdAt || row.CreatedAt),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Payment History"
        columns={columns}
        data={filteredTransactions}
        loading={loading}
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{ xs: 12, md: 10 }}
              sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
            >
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
                  required
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 180 }}>
                <AppSelect
                  label="Select Event"
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value);
                  }}
                  options={eventOptions}
                  size="small"
                  placeholder="Select Event"
                  required
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
                  required
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton variant="outlined" onClick={() => setViewDialogOpen(false)}>
              Close
            </AppButton>
            {hasWriteAccess && selectedTxn && selectedTxn.status !== "Verified" && (
              <AppButton
                variant="contained"
                onClick={() => handleVerify(selectedTxn)}
                sx={{ bgcolor: "#16a34a !important", "&:hover": { bgcolor: "#15803d !important" } }}
              >
                Verify Payment
              </AppButton>
            )}
            {hasWriteAccess && selectedTxn && selectedTxn.status === "Verified" && (
              <AppButton
                variant="outlined"
                color="warning"
                onClick={() => handleMarkPending(selectedTxn)}
              >
                Mark Pending
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
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <Typography variant="body2" fontWeight={700} color="#1e293b">
                    {selectedTxn.utr || "--"}
                  </Typography>
                  {selectedTxn.utr && selectedTxn.utr !== "-" && (
                    <Tooltip title="Copy UTR">
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTxn.utr);
                          toast.success("UTR copied to clipboard!");
                        }}
                        sx={{ p: 0.3 }}
                      >
                        <CopyIcon sx={{ fontSize: 15, color: "#64748b" }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
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
                  {selectedTxn.screenshot.startsWith("data:image") || selectedTxn.screenshot.startsWith("http") ? (
                    <Box
                      sx={{
                        mt: 0.5,
                        p: 1.5,
                        border: "1.5px solid #e2e8f0",
                        borderRadius: 2.5,
                        bgcolor: "#f8fafc",
                        textAlign: "center",
                      }}
                    >
                      <img
                        src={selectedTxn.screenshot}
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
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.2,
                        borderRadius: "10px",
                        bgcolor: (t) =>
                          t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                        border: (t) => `1px solid ${t.palette.divider}`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <ReceiptIcon sx={{ fontSize: 20, color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
                        <Typography variant="body2" fontWeight={600}>
                          {selectedTxn.screenshot}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </AppDialog>
    </div>
  );
}
