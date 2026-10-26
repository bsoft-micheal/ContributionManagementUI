import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Avatar,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stack,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Divider,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ExitToAppRounded as ExitIcon,
  CheckCircleRounded as CheckCircleIcon,
  AccountBalanceWalletRounded as WalletIcon,
  CurrencyRupeeRounded as RupeeIcon,
  VerifiedUserRounded as VerifiedIcon,
  HourglassEmptyRounded as PendingIcon,
  SearchRounded as SearchIcon,
  ReceiptLongRounded as DuesIcon,
  HistoryRounded as HistoryIcon,
  PaymentRounded as PaymentIcon,
  VisibilityRounded as ViewIcon,
  WarningAmberRounded as WarningIcon,
  DoneAllRounded as DoneAllIcon,
  FilterListRounded as FilterIcon,
  RefreshRounded as RefreshIcon,
  ClearRounded as ClearIcon,
  PersonRounded as PersonIcon,
  CalendarTodayRounded as CalendarIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { formatGridDate, formatGridDateTime } from "../../utils/dateHelper";
import { roundToWhole, formatWholeCurrency } from "../../utils/roundingHelper";
import {
  getExitClearanceQueueAsync,
  getExitClearanceDuesAsync,
  approveExitClearanceAsync,
  getExitClearanceHistoryAsync,
  getExitClearanceHistoryDetailAsync,
} from "../../services/exitClearanceService";
import {
  createPaymentTransactionAsync,
  verifyPaymentTransactionAsync,
} from "../../services/paymentService";
import { getPaymentModesAsync } from "../../services/paymentModeService";
import AppDataTable from "../../components/common/AppDataTable";
import AppButton from "../../components/common/AppButton";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";

export default function ExitProcessPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const toast = useAppToast();

  const isAdmin = authState?.role?.toLowerCase() === "admin";
  const canProcessExit = hasActionPermission("Process Exit", 77, authState?.role).canExecute && canEdit;
  const hasApprovalRight = isAdmin || canProcessExit;

  // Tabs: 0 = Clearance Queue, 1 = Exit History
  const [activeTab, setActiveTab] = useState(0);

  // Queue state
  const [queueData, setQueueData] = useState([]);
  const [kpis, setKpis] = useState({
    pendingExitRequests: 0,
    membersWithOutstandingDues: 0,
    totalOutstandingAmount: 0,
    readyForFinalApproval: 0,
  });
  const [loading, setLoading] = useState(true);

  // History state
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedClearanceStatus, setSelectedClearanceStatus] = useState("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");

  // Dues Details Modal
  const [duesModalOpen, setDuesModalOpen] = useState(false);
  const [selectedClearanceId, setSelectedClearanceId] = useState(null);
  const [duesDetail, setDuesDetail] = useState(null);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesActiveSubTab, setDuesActiveSubTab] = useState(0); // 0 = Event Dues, 1 = Payment History

  // Record Payment Dialog
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentModes, setPaymentModes] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    eventId: "",
    eventName: "",
    memberId: "",
    memberName: "",
    amount: "",
    paymentMode: "",
    utr: "",
    notes: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Final Approval Dialog
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [approving, setApproving] = useState(false);

  // Historical Snapshot View Dialog
  const [historySnapshotOpen, setHistorySnapshotOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [snapshotDetail, setSnapshotDetail] = useState(null);

  useEffect(() => {
    loadQueue();
    loadPaymentModes();
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      loadHistory();
    }
  }, [activeTab]);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await getExitClearanceQueueAsync();
      const items = res?.items || [];
      setQueueData(items);
      if (res?.kpis) {
        setKpis(res.kpis);
      }
    } catch (err) {
      toast.error(err, "Failed to load exit clearance queue");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await getExitClearanceHistoryAsync();
      setHistoryData(res || []);
    } catch (err) {
      toast.error(err, "Failed to load exit clearance history");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadPaymentModes() {
    try {
      const modes = await getPaymentModesAsync(true);
      setPaymentModes(modes || []);
    } catch {
      // Non-fatal fallback
    }
  }

  // Unique send-off events from queue for filter dropdown
  const uniqueSendOffEvents = useMemo(() => {
    const map = new Map();
    queueData.forEach((item) => {
      if (item.eventId && !map.has(item.eventId)) {
        map.set(item.eventId, item.eventName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [queueData]);

  // Filtered Queue Data
  const filteredQueueData = useMemo(() => {
    return queueData.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const mName = (item.memberName || "").toLowerCase();
        const mEmail = (item.memberEmail || "").toLowerCase();
        const mCode = (item.memberCode || "").toLowerCase();
        const eName = (item.eventName || "").toLowerCase();
        if (!mName.includes(q) && !mEmail.includes(q) && !mCode.includes(q) && !eName.includes(q)) {
          return false;
        }
      }
      if (selectedEventId && item.eventId !== selectedEventId) {
        return false;
      }
      if (selectedClearanceStatus !== "all" && item.clearanceStatus !== selectedClearanceStatus) {
        return false;
      }
      if (selectedPaymentStatus !== "all") {
        if (selectedPaymentStatus === "cleared" && item.outstandingAmount > 0) return false;
        if (selectedPaymentStatus === "dues" && item.outstandingAmount === 0) return false;
        if (selectedPaymentStatus === "unverified" && !item.hasUnverifiedPayments) return false;
      }
      return true;
    });
  }, [queueData, searchTerm, selectedEventId, selectedClearanceStatus, selectedPaymentStatus]);

  // Open Dues Details Modal
  async function handleOpenDues(clearanceId) {
    setSelectedClearanceId(clearanceId);
    setDuesModalOpen(true);
    setDuesActiveSubTab(0);
    setDuesLoading(true);
    try {
      const data = await getExitClearanceDuesAsync(clearanceId);
      setDuesDetail(data);
    } catch (err) {
      toast.error(err, "Failed to load member dues details");
      setDuesModalOpen(false);
    } finally {
      setDuesLoading(false);
    }
  }

  // Open Record Payment Dialog
  function handleOpenRecordPayment(clearance, targetEventDue = null) {
    const memberName = clearance.memberName || duesDetail?.memberName || "";
    const memberId = clearance.memberId || duesDetail?.memberId || "";
    const eventId = targetEventDue?.eventId || clearance.eventId || "";
    const eventName = targetEventDue?.eventName || clearance.eventName || "";
    const amount = targetEventDue ? targetEventDue.outstandingBalance : clearance.outstandingAmount || "";

    const defaultMode = paymentModes.length > 0 ? paymentModes[0].paymentModeName : "Cash";

    setPaymentForm({
      eventId,
      eventName,
      memberId,
      memberName,
      amount: amount > 0 ? amount : "",
      paymentMode: defaultMode,
      utr: "",
      notes: `Exit Clearance payment for ${memberName}`,
    });
    setRecordPaymentOpen(true);
  }

  // Submit Payment
  async function handleSavePayment() {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }
    if (!paymentForm.paymentMode) {
      toast.error("Please select a payment mode.");
      return;
    }

    setSavingPayment(true);
    try {
      await createPaymentTransactionAsync({
        memberName: paymentForm.memberName,
        eventName: paymentForm.eventName,
        amount: Number(paymentForm.amount),
        paymentDate: new Date().toISOString(),
        paymentMode: paymentForm.paymentMode,
        utr: paymentForm.utr,
        notes: paymentForm.notes,
        status: isAdmin ? "Verified" : "Pending", // Admin records as verified directly
      });

      toast.success(isAdmin ? "Payment recorded and verified successfully." : "Payment recorded. Awaiting verification.");
      setRecordPaymentOpen(false);

      // Refresh dues detail if open
      if (selectedClearanceId) {
        const updatedDues = await getExitClearanceDuesAsync(selectedClearanceId);
        setDuesDetail(updatedDues);
      }
      loadQueue();
    } catch (err) {
      toast.error(err, "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  // Quick Verify Payment Transaction from Dues modal
  async function handleVerifyPayment(transactionId) {
    try {
      await verifyPaymentTransactionAsync(transactionId, {
        status: "Verified",
        verifiedBy: authState?.user?.fullName || authState?.user?.userName || "Admin",
        notes: "Verified via Exit Clearance settlement",
      });
      toast.success("Payment verified successfully.");
      if (selectedClearanceId) {
        const updatedDues = await getExitClearanceDuesAsync(selectedClearanceId);
        setDuesDetail(updatedDues);
      }
      loadQueue();
    } catch (err) {
      toast.error(err, "Failed to verify payment");
    }
  }

  // Open Final Approval Dialog
  function handleOpenApproveDialog(row) {
    if (!hasApprovalRight) {
      toast.error("Only administrators are authorized to approve member exit clearance.");
      return;
    }
    setApprovalTarget(row);
    setApprovalRemarks("");
    setApprovalDialogOpen(true);
  }

  // Execute Final Approval
  async function handleConfirmApproval() {
    if (!approvalTarget) return;

    setApproving(true);
    try {
      await approveExitClearanceAsync(approvalTarget.clearanceId, {
        approvalRemarks: approvalRemarks.trim(),
      });
      toast.success(`Exit clearance approved successfully for ${approvalTarget.memberName}.`);
      setApprovalDialogOpen(false);
      setApprovalTarget(null);
      if (duesModalOpen) setDuesModalOpen(false);
      loadQueue();
      if (activeTab === 1) loadHistory();
    } catch (err) {
      toast.error(err, "Failed to approve exit clearance");
    } finally {
      setApproving(false);
    }
  }

  // View Historical Snapshot
  async function handleOpenHistorySnapshot(item) {
    setSelectedHistoryItem(item);
    setHistorySnapshotOpen(true);
    try {
      const detail = await getExitClearanceHistoryDetailAsync(item.historyId);
      setSnapshotDetail(detail);
    } catch {
      setSnapshotDetail(item);
    }
  }

  // Status Chip Renderer
  const renderStatusChip = (status) => {
    switch (status) {
      case "Approved":
        return <Chip label="Approved" size="small" color="success" icon={<CheckCircleIcon />} sx={{ fontWeight: 700 }} />;
      case "ReadyForApproval":
        return <Chip label="Ready for Approval" size="small" color="success" variant="outlined" icon={<VerifiedIcon />} sx={{ fontWeight: 800 }} />;
      case "DuesOutstanding":
        return <Chip label="Dues Outstanding" size="small" color="error" icon={<WarningIcon />} sx={{ fontWeight: 700 }} />;
      case "PendingClearance":
      default:
        return <Chip label="Pending Verification" size="small" color="warning" icon={<PendingIcon />} sx={{ fontWeight: 700 }} />;
    }
  };

  // Queue Columns
  const queueColumns = [
    {
      label: "Member Profile",
      key: "memberName",
      sortable: true,
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src={row.profileImage}
            sx={{
              width: 36,
              height: 36,
              bgcolor: isDark ? "#7c3aed" : "#4a3f6b",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.85rem",
            }}
          >
            {row.memberName ? row.memberName[0].toUpperCase() : "M"}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={800} sx={{ color: "text.primary", lineHeight: 1.2 }}>
              {row.memberName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {row.memberEmail || row.memberCode || "--"}
            </Typography>
            {row.roleName && (
              <Chip label={row.roleName} size="small" sx={{ fontSize: "0.62rem", height: 18, mt: 0.3 }} />
            )}
          </Box>
        </Box>
      ),
    },
    {
      label: "Joining Date",
      key: "joiningDate",
      sortable: true,
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
          {row.joiningDate ? formatGridDate(row.joiningDate) : "--"}
        </Typography>
      ),
    },
    {
      label: "Send-Off Event",
      key: "eventName",
      sortable: true,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ color: "text.primary" }}>
            {row.eventName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatGridDate(row.eventDate)}
          </Typography>
        </Box>
      ),
    },
    {
      label: "Planned Exit",
      key: "plannedExitDate",
      sortable: true,
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
          {row.plannedExitDate ? formatGridDate(row.plannedExitDate) : "--"}
        </Typography>
      ),
    },
    {
      label: "Outstanding Dues",
      key: "outstandingAmount",
      align: "right",
      sortable: true,
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={900}
          sx={{
            color: row.outstandingAmount > 0 ? "error.main" : "success.main",
            fontSize: "0.9rem",
          }}
        >
          {formatWholeCurrency(row.outstandingAmount || 0)}
        </Typography>
      ),
    },
    {
      label: "Pending Obligations",
      key: "pendingObligationsCount",
      align: "center",
      render: (row) => (
        <Chip
          label={`${row.pendingObligationsCount || 0} Event${row.pendingObligationsCount === 1 ? "" : "s"}`}
          size="small"
          color={row.pendingObligationsCount > 0 ? "warning" : "default"}
          sx={{ fontWeight: 700, fontSize: "0.68rem" }}
        />
      ),
    },
    {
      label: "Payment Verification",
      key: "paymentVerificationStatus",
      align: "center",
      render: (row) => {
        if (row.hasUnverifiedPayments) {
          return (
            <Chip
              label="Pending Verification"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: "0.68rem" }}
            />
          );
        }
        return (
          <Chip
            label={row.paymentVerificationStatus || "All Verified"}
            size="small"
            color={row.outstandingAmount === 0 ? "success" : "default"}
            sx={{ fontWeight: 700, fontSize: "0.68rem" }}
          />
        );
      },
    },
    {
      label: "Clearance Status",
      key: "clearanceStatus",
      align: "center",
      render: (row) => renderStatusChip(row.clearanceStatus),
    },
    {
      label: "Actions",
      key: "actions",
      align: "center",
      render: (row) => {
        const isApproved = row.clearanceStatus === "Approved";
        const canApprove = row.canApprove;

        return (
          <Stack direction="row" spacing={0.75} justifyContent="center" alignItems="center">
            <Tooltip title="View Event-wise Obligations and Payments">
              <IconButton
                size="small"
                onClick={() => handleOpenDues(row.clearanceId)}
                sx={{
                  color: isDark ? "#c4b5fd" : "#4a3f6b",
                  "&:hover": { bgcolor: isDark ? "rgba(196,181,253,0.12)" : "rgba(74,63,107,0.1)" },
                }}
              >
                <DuesIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {!isApproved && row.outstandingAmount > 0 && (
              <Tooltip title="Record Payment for Pending Dues">
                <IconButton
                  size="small"
                  onClick={() => handleOpenRecordPayment(row)}
                  sx={{
                    color: "primary.main",
                    "&:hover": { bgcolor: "rgba(33, 150, 243, 0.1)" },
                  }}
                >
                  <PaymentIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {!isApproved && (
              <Tooltip
                title={
                  canApprove
                    ? "Approve Final Exit (All dues cleared)"
                    : row.approvalBlockReason || "Exit approval is not allowed until all dues and payments are verified"
                }
              >
                <span>
                  <Button
                    size="small"
                    variant={canApprove ? "contained" : "outlined"}
                    color={canApprove ? "success" : "inherit"}
                    disabled={!canApprove}
                    onClick={() => handleOpenApproveDialog(row)}
                    startIcon={<CheckCircleIcon sx={{ fontSize: "1rem !important" }} />}
                    sx={{
                      fontSize: "0.72rem",
                      py: 0.3,
                      px: 1.2,
                      fontWeight: 800,
                      textTransform: "none",
                      borderRadius: "6px",
                      opacity: canApprove ? 1 : 0.45,
                    }}
                  >
                    Approve
                  </Button>
                </span>
              </Tooltip>
            )}

            {isApproved && (
              <Chip
                label="Completed"
                size="small"
                color="default"
                sx={{ fontSize: "0.68rem", fontWeight: 700 }}
              />
            )}
          </Stack>
        );
      },
    },
  ];

  // History Columns
  const historyColumns = [
    {
      label: "Member Profile",
      key: "memberNameSnapshot",
      sortable: true,
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: isDark ? "#7c3aed" : "#4a3f6b",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.85rem",
            }}
          >
            {row.memberNameSnapshot ? row.memberNameSnapshot[0].toUpperCase() : "M"}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={800}>
              {row.memberNameSnapshot}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.memberCodeSnapshot || "--"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      label: "Send-Off Event",
      key: "eventNameSnapshot",
      sortable: true,
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.eventNameSnapshot}
        </Typography>
      ),
    },
    {
      label: "Joining Date",
      key: "joiningDate",
      render: (row) => (row.joiningDate ? formatGridDate(row.joiningDate) : "--"),
    },
    {
      label: "Exit Approved On",
      key: "exitApprovalDate",
      sortable: true,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {formatGridDate(row.exitApprovalDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatGridDateTime(row.exitApprovalDate)}
          </Typography>
        </Box>
      ),
    },
    {
      label: "Approved By",
      key: "approvedByName",
      render: (row) => (
        <Chip
          label={row.approvedByName || "Admin"}
          size="small"
          icon={<VerifiedIcon />}
          color="success"
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: "0.72rem" }}
        />
      ),
    },
    {
      label: "Settled Obligations",
      key: "totalObligations",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={800} color="text.primary">
          {formatWholeCurrency(row.totalObligations || 0)}
        </Typography>
      ),
    },
    {
      label: "Outstanding at Approval",
      key: "outstandingAtApproval",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={900} color="success.main">
          {formatWholeCurrency(row.outstandingAtApproval || 0)}
        </Typography>
      ),
    },
    {
      label: "Audit Snapshot",
      key: "actions",
      align: "center",
      render: (row) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleOpenHistorySnapshot(row)}
          startIcon={<ViewIcon sx={{ fontSize: "1rem !important" }} />}
          sx={{
            fontSize: "0.72rem",
            textTransform: "none",
            borderRadius: "6px",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)",
            color: isDark ? "#c4b5fd" : "#4a3f6b",
          }}
        >
          View Audit
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <Box sx={{ mb: 2.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1.5 }}>
        <Box>
          <Typography variant="caption" sx={{ color: isDark ? "#c4b5fd" : "#4a3f6b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Tools &bull; Member Clearance
          </Typography>
          <Typography variant="h5" fontWeight={900} sx={{ color: "text.primary", mt: 0.25 }}>
            Member Exit Clearance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Automated send-off clearance workflow: Send-off Beneficiaries &rarr; Live Dues Settlement &rarr; Admin Final Approval.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <AppButton
            variant="outlined"
            size="small"
            onClick={() => (activeTab === 0 ? loadQueue() : loadHistory())}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </AppButton>
        </Stack>
      </Box>

      {/* ── KPI Summary Cards ──────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: "12px",
              boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 16px rgba(74,63,107,0.08)",
              bgcolor: isDark ? "rgba(124, 58, 237, 0.08)" : "#faf8ff",
              border: `1px solid ${isDark ? "rgba(124, 58, 237, 0.25)" : "rgba(74,63,107,0.15)"}`,
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: isDark ? "#c4b5fd" : "#4a3f6b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Pending Exit Requests
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5, color: "text.primary" }}>
                    {kpis.pendingExitRequests}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: isDark ? "rgba(124,58,237,0.25)" : "rgba(74,63,107,0.12)", color: isDark ? "#c4b5fd" : "#4a3f6b", width: 44, height: 44 }}>
                  <ExitIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: "12px",
              boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 16px rgba(245,158,11,0.08)",
              bgcolor: isDark ? "rgba(245, 158, 11, 0.08)" : "#fffcf2",
              border: `1px solid ${isDark ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.2)"}`,
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Members with Dues
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5, color: "text.primary" }}>
                    {kpis.membersWithOutstandingDues}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(245, 158, 11, 0.15)", color: "warning.main", width: 44, height: 44 }}>
                  <WalletIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: "12px",
              boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 16px rgba(239,68,68,0.08)",
              bgcolor: isDark ? "rgba(239, 68, 68, 0.08)" : "#fff5f5",
              border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.2)"}`,
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "error.main", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Total Outstanding
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5, color: "error.main" }}>
                    {formatWholeCurrency(kpis.totalOutstandingAmount || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(239, 68, 68, 0.15)", color: "error.main", width: 44, height: 44 }}>
                  <RupeeIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: "12px",
              boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 16px rgba(16,185,129,0.08)",
              bgcolor: isDark ? "rgba(16, 185, 129, 0.08)" : "#f0fdf4",
              border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.2)"}`,
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "success.main", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Ready for Approval
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5, color: "success.main" }}>
                    {kpis.readyForFinalApproval}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.15)", color: "success.main", width: 44, height: 44 }}>
                  <VerifiedIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Tabs Navigation ────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              fontWeight: 800,
              fontSize: "0.88rem",
              textTransform: "none",
              minHeight: 44,
              px: 2.5,
            },
          }}
        >
          <Tab
            icon={<ExitIcon sx={{ fontSize: "1.1rem" }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Clearance Queue</span>
                <Chip
                  label={queueData.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    bgcolor: activeTab === 0 ? "primary.main" : "action.selected",
                    color: activeTab === 0 ? "#fff" : "text.secondary",
                  }}
                />
              </Box>
            }
          />
          <Tab
            icon={<HistoryIcon sx={{ fontSize: "1.1rem" }} />}
            iconPosition="start"
            label="Exit Clearance History"
          />
        </Tabs>
      </Box>

      {/* ── TAB 0: Clearance Queue ─────────────────────────────── */}
      {activeTab === 0 && (
        <Box>
          {/* Filter Panel */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: "10px",
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search member, email, event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm("")}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="event-filter-label">Send-Off Event</InputLabel>
                  <Select
                    labelId="event-filter-label"
                    label="Send-Off Event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Send-Off Events</em>
                    </MenuItem>
                    {uniqueSendOffEvents.map((ev) => (
                      <MenuItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel id="clearance-status-label">Clearance Status</InputLabel>
                  <Select
                    labelId="clearance-status-label"
                    label="Clearance Status"
                    value={selectedClearanceStatus}
                    onChange={(e) => setSelectedClearanceStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Clearance Statuses</MenuItem>
                    <MenuItem value="ReadyForApproval">Ready For Approval</MenuItem>
                    <MenuItem value="DuesOutstanding">Dues Outstanding</MenuItem>
                    <MenuItem value="PendingClearance">Pending Verification</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel id="payment-status-label">Payment Status</InputLabel>
                  <Select
                    labelId="payment-status-label"
                    label="Payment Status"
                    value={selectedPaymentStatus}
                    onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Payment Statuses</MenuItem>
                    <MenuItem value="cleared">All Cleared (₹0 Dues)</MenuItem>
                    <MenuItem value="dues">Has Outstanding Dues</MenuItem>
                    <MenuItem value="unverified">Awaiting Verification</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={1} sx={{ display: "flex", justifyContent: "flex-end" }}>
                {(searchTerm || selectedEventId || selectedClearanceStatus !== "all" || selectedPaymentStatus !== "all") && (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedEventId("");
                      setSelectedClearanceStatus("all");
                      setSelectedPaymentStatus("all");
                    }}
                    sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  >
                    Reset
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Queue Data Table */}
          <AppDataTable
            data={filteredQueueData}
            columns={queueColumns}
            loading={loading}
            emptyMessage="No members currently in the exit clearance queue. Beneficiaries will automatically appear when a Send-Off event is published."
            exportFileName="Member_Exit_Clearance_Queue"
          />
        </Box>
      )}

      {/* ── TAB 1: Exit Clearance History ─────────────────────── */}
      {activeTab === 1 && (
        <Box>
          <AppDataTable
            data={historyData}
            columns={historyColumns}
            loading={historyLoading}
            emptyMessage="No approved exit clearance history records found yet."
            exportFileName="Member_Exit_Clearance_History"
          />
        </Box>
      )}

      {/* ── DUES DETAILS MODAL (Phase 5) ───────────────────────── */}
      <AppDialog
        open={duesModalOpen}
        onClose={() => setDuesModalOpen(false)}
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DuesIcon sx={{ color: "#fff" }} />
            <Typography variant="subtitle1" fontWeight={800} color="#fff">
              Member Clearance Dues Details &bull; {duesDetail?.memberName || "Member"}
            </Typography>
          </Box>
        }
        maxWidth="md"
        fullWidth
        actions={
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
            {duesDetail && !duesDetail.canApprove && duesDetail.totalOutstanding > 0 && (
              <AppButton
                variant="contained"
                color="primary"
                startIcon={<PaymentIcon />}
                onClick={() => handleOpenRecordPayment(duesDetail)}
              >
                Record Payment
              </AppButton>
            )}

            {duesDetail && duesDetail.canApprove && (
              <AppButton
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => {
                  handleOpenApproveDialog(duesDetail);
                }}
              >
                Approve Exit
              </AppButton>
            )}

            <AppButton variant="outlined" onClick={() => setDuesModalOpen(false)}>
              Close
            </AppButton>
          </Stack>
        }
      >
        {duesLoading || !duesDetail ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Calculating live contribution obligations and balances...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            {/* Member Summary Header */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: "10px",
                bgcolor: isDark ? "rgba(124,58,237,0.06)" : "#faf8ff",
                border: `1px solid ${isDark ? "rgba(124,58,237,0.2)" : "rgba(74,63,107,0.15)"}`,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: isDark ? "#7c3aed" : "#4a3f6b",
                        fontSize: "1rem",
                        fontWeight: 900,
                      }}
                    >
                      {duesDetail.memberName ? duesDetail.memberName[0].toUpperCase() : "M"}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2 }}>
                        {duesDetail.memberName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {duesDetail.memberEmail} &bull; {duesDetail.roleName}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                        Joining Date: {duesDetail.joiningDate ? formatGridDate(duesDetail.joiningDate) : "--"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", sm: "flex-end" } }}>
                    <Typography variant="caption" color="text.secondary">
                      Send-Off Event: <strong>{duesDetail.eventName}</strong>
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {renderStatusChip(duesDetail.clearanceStatus)}
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              {/* Financial Metrics Strip */}
              <Grid container spacing={2} textAlign="center">
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    TOTAL OBLIGATIONS
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                    {formatWholeCurrency(duesDetail.totalObligations || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    VERIFIED PAID
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={900} color="success.main">
                    {formatWholeCurrency(duesDetail.totalVerifiedPaid || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    OUTSTANDING BALANCE
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={900}
                    color={duesDetail.totalOutstanding > 0 ? "error.main" : "success.main"}
                  >
                    {formatWholeCurrency(duesDetail.totalOutstanding || 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Approval Notice / Restriction Alert */}
            {duesDetail.totalOutstanding > 0 && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: "8px", fontWeight: 700 }}>
                Exit approval is blocked. This member has pending contribution dues of {formatWholeCurrency(duesDetail.totalOutstanding)}. All dues must be paid and verified before final approval.
              </Alert>
            )}

            {duesDetail.totalOutstanding === 0 && duesDetail.hasUnverifiedPayments && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: "8px", fontWeight: 700 }}>
                Member has payments pending verification. Verify pending payments below to unlock final exit approval.
              </Alert>
            )}

            {duesDetail.canApprove && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: "8px", fontWeight: 700 }}>
                All contribution dues have been cleared and verified. Ready for Admin final exit approval!
              </Alert>
            )}

            {/* Sub-tabs: Event Dues vs Payment History */}
            <Tabs
              value={duesActiveSubTab}
              onChange={(e, v) => setDuesActiveSubTab(v)}
              sx={{
                mb: 1.5,
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": { fontWeight: 800, fontSize: "0.82rem", textTransform: "none" },
              }}
            >
              <Tab
                label={`Event Obligations (${duesDetail.eventDues?.length || 0})`}
                icon={<DuesIcon sx={{ fontSize: "1rem" }} />}
                iconPosition="start"
              />
              <Tab
                label={`Payment History (${duesDetail.paymentHistory?.length || 0})`}
                icon={<HistoryIcon sx={{ fontSize: "1rem" }} />}
                iconPosition="start"
              />
            </Tabs>

            {/* Event Dues Table */}
            {duesActiveSubTab === 0 && (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa" }}>
                      <TableCell sx={{ fontWeight: 800 }}>Event Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Event Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Due Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Verified Paid</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Balance</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {duesDetail.eventDues?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No contribution obligations found for this member.
                        </TableCell>
                      </TableRow>
                    ) : (
                      duesDetail.eventDues.map((ed) => (
                        <TableRow key={ed.eventId} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{ed.eventName}</TableCell>
                          <TableCell sx={{ fontSize: "0.82rem" }}>{formatGridDate(ed.eventDate)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatWholeCurrency(ed.contributionAmount)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "success.main", fontWeight: 700 }}>
                            {formatWholeCurrency(ed.verifiedPaidAmount)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 900,
                              color: ed.outstandingBalance > 0 ? "error.main" : "success.main",
                            }}
                          >
                            {formatWholeCurrency(ed.outstandingBalance)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={ed.paymentStatus}
                              size="small"
                              color={
                                ed.paymentStatus === "Paid"
                                  ? "success"
                                  : ed.paymentStatus === "Partially Paid"
                                  ? "warning"
                                  : "error"
                              }
                              sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                            />
                            {ed.hasPendingPayment && (
                              <Typography variant="caption" color="warning.main" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700 }}>
                                +{formatWholeCurrency(ed.pendingPaymentAmount)} Pending
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {ed.outstandingBalance > 0 ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => handleOpenRecordPayment(duesDetail, ed)}
                                sx={{ fontSize: "0.7rem", py: 0.2, px: 1, textTransform: "none" }}
                              >
                                Settle
                              </Button>
                            ) : (
                              <Typography variant="caption" color="success.main" fontWeight={800}>
                                Cleared
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* Payment History Table */}
            {duesActiveSubTab === 1 && (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa" }}>
                      <TableCell sx={{ fontWeight: 800 }}>Txn Number</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Event</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Amount</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>UTR / Reference</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {duesDetail.paymentHistory?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No payment transactions recorded for this member.
                        </TableCell>
                      </TableRow>
                    ) : (
                      duesDetail.paymentHistory.map((pt) => (
                        <TableRow key={pt.transactionId} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.78rem" }}>{pt.txnNumber || "--"}</TableCell>
                          <TableCell sx={{ fontSize: "0.82rem" }}>{formatGridDate(pt.paymentDate)}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{pt.eventName || "--"}</TableCell>
                          <TableCell>{pt.paymentMode || "--"}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            {formatWholeCurrency(pt.amount)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={pt.status || "Pending"}
                              size="small"
                              color={
                                pt.status === "Verified" || pt.status === "Approved" || pt.status === "Paid"
                                  ? "success"
                                  : pt.status === "Rejected"
                                  ? "error"
                                  : "warning"
                              }
                              sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{pt.utr || "--"}</TableCell>
                          <TableCell align="center">
                            {pt.status === "Pending" && isAdmin && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleVerifyPayment(pt.transactionId)}
                                sx={{ fontSize: "0.68rem", py: 0.2, px: 1, textTransform: "none" }}
                              >
                                Verify
                              </Button>
                            )}
                            {(pt.status === "Verified" || pt.status === "Approved" || pt.status === "Paid") && (
                              <Typography variant="caption" color="text.secondary">
                                Verified by {pt.verifiedBy || "Admin"}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}
      </AppDialog>

      {/* ── RECORD PAYMENT DIALOG (Phase 6) ────────────────────── */}
      <AppDialog
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        title="Record Contribution Payment"
        maxWidth="sm"
        fullWidth
        actions={
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <AppButton variant="outlined" onClick={() => setRecordPaymentOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              color="primary"
              loading={savingPayment}
              onClick={handleSavePayment}
            >
              Record Payment
            </AppButton>
          </Stack>
        }
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Record settlement payment for <strong>{paymentForm.memberName}</strong> against event <strong>{paymentForm.eventName}</strong>.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Amount (₹)"
                type="number"
                size="small"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="payment-mode-select-label">Payment Mode</InputLabel>
                <Select
                  labelId="payment-mode-select-label"
                  label="Payment Mode"
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                >
                  {paymentModes.map((pm) => (
                    <MenuItem key={pm.paymentModeId} value={pm.paymentModeName}>
                      {pm.paymentModeName}
                    </MenuItem>
                  ))}
                  {paymentModes.length === 0 && (
                    <MenuItem value="Cash">Cash</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="UTR / Reference Number (Optional for Cash)"
                size="small"
                placeholder="e.g. UPI Ref, Bank UTR"
                value={paymentForm.utr}
                onChange={(e) => setPaymentForm({ ...paymentForm, utr: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Remarks / Notes"
                size="small"
                placeholder="Exit clearance settlement note"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </AppDialog>

      {/* ── ADMIN FINAL APPROVAL DIALOG (Phase 7) ──────────────── */}
      <AppDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <VerifiedIcon sx={{ color: "#fff" }} />
            <Typography variant="subtitle1" fontWeight={800} color="#fff">
              Confirm Final Exit Clearance Approval
            </Typography>
          </Box>
        }
        maxWidth="sm"
        fullWidth
        actions={
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <AppButton variant="outlined" onClick={() => setApprovalDialogOpen(false)} disabled={approving}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              color="success"
              loading={approving}
              onClick={handleConfirmApproval}
              startIcon={<CheckCircleIcon />}
            >
              Confirm Exit Approval
            </AppButton>
          </Stack>
        }
      >
        <Box sx={{ p: 1 }}>
          <Alert severity="success" sx={{ mb: 2, borderRadius: "8px", fontWeight: 700 }}>
            All contribution dues have been cleared. Are you sure you want to approve the final exit for this member?
          </Alert>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: "8px",
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8f9fa",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Member:</strong> {approvalTarget?.memberName} ({approvalTarget?.memberCode || approvalTarget?.memberEmail})
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Send-Off Event:</strong> {approvalTarget?.eventName}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Total Obligations Settled:</strong> {formatWholeCurrency(approvalTarget?.totalObligations || 0)}
            </Typography>
            <Typography variant="body2" color="success.main" fontWeight={800}>
              <strong>Outstanding Dues:</strong> ₹0 (Fully Cleared)
            </Typography>
          </Paper>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Approval Remarks (Optional)"
            size="small"
            placeholder="e.g. All farewell obligations verified and cleared on departure"
            value={approvalRemarks}
            onChange={(e) => setApprovalRemarks(e.target.value)}
          />
        </Box>
      </AppDialog>

      {/* ── HISTORICAL SNAPSHOT DIALOG (Phase 8) ───────────────── */}
      <AppDialog
        open={historySnapshotOpen}
        onClose={() => setHistorySnapshotOpen(false)}
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HistoryIcon sx={{ color: "#fff" }} />
            <Typography variant="subtitle1" fontWeight={800} color="#fff">
              Permanent Exit Clearance Audit Snapshot
            </Typography>
          </Box>
        }
        maxWidth="md"
        fullWidth
        actions={
          <AppButton variant="outlined" onClick={() => setHistorySnapshotOpen(false)}>
            Close
          </AppButton>
        }
      >
        <Box sx={{ p: 1 }}>
          {selectedHistoryItem && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: "10px",
                  bgcolor: isDark ? "rgba(16,185,129,0.06)" : "#f0fdf4",
                  border: `1px solid ${isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.2)"}`,
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      MEMBER NAME AT APPROVAL
                    </Typography>
                    <Typography variant="h6" fontWeight={900}>
                      {selectedHistoryItem.memberNameSnapshot}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Code: {selectedHistoryItem.memberCodeSnapshot || "--"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      SEND-OFF EVENT
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {selectedHistoryItem.eventNameSnapshot}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      APPROVED BY
                    </Typography>
                    <Typography variant="body2" fontWeight={800}>
                      {selectedHistoryItem.approvedByName}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      APPROVAL DATE
                    </Typography>
                    <Typography variant="body2" fontWeight={800}>
                      {formatGridDateTime(selectedHistoryItem.exitApprovalDate)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      OUTSTANDING AT APPROVAL
                    </Typography>
                    <Typography variant="body2" fontWeight={900} color="success.main">
                      {formatWholeCurrency(selectedHistoryItem.outstandingAtApproval || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Approval Remarks:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedHistoryItem.approvalRemarks || "No approval remarks provided."}
              </Typography>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Immutable Financial Audit Summary:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedHistoryItem.paymentVerificationSummary || "All obligations cleared."}
              </Typography>
            </Box>
          )}
        </Box>
      </AppDialog>
    </Box>
  );
}
