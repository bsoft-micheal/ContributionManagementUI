import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  FormControlLabel,
  Checkbox,
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
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";

export default function ExitProcessPage() {
  const navigate = useNavigate();
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
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedClearanceStatus, setSelectedClearanceStatus] = useState("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");

  // Dues Details Modal
  const [duesModalOpen, setDuesModalOpen] = useState(false);
  const [selectedClearanceId, setSelectedClearanceId] = useState(null);
  const [duesDetail, setDuesDetail] = useState(null);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesActiveSubTab, setDuesActiveSubTab] = useState(0); // 0 = Event Dues, 1 = Payment History
  const [onlyUnpaidEventsInModal, setOnlyUnpaidEventsInModal] = useState(false);

  // Unpaid Events Popover (for Pending Obligations chip)
  const [unpaidPopoverAnchor, setUnpaidPopoverAnchor] = useState(null);
  const [unpaidPopoverData, setUnpaidPopoverData] = useState(null);

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
  const [markAsInactive, setMarkAsInactive] = useState(true);
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
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.includes("42P01") || msg.toLowerCase().includes("does not exist")) {
        // Table created on backend restart / first sync
        setQueueData([]);
      } else {
        toast.error(err, "Failed to load exit clearance queue");
      }
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
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.includes("42P01") || msg.toLowerCase().includes("does not exist")) {
        setHistoryData([]);
      } else {
        toast.error(err, "Failed to load exit clearance history");
      }
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

  // Filtered Queue Data (search is handled by the data table search)
  const filteredQueueData = useMemo(() => {
    return queueData.filter((item) => {
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
  }, [queueData, selectedEventId, selectedClearanceStatus, selectedPaymentStatus]);

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
    setMarkAsInactive(true);
    setApprovalDialogOpen(true);
  }

  // Execute Final Approval
  async function handleConfirmApproval() {
    if (!approvalTarget) return;

    setApproving(true);
    try {
      await approveExitClearanceAsync(approvalTarget.clearanceId, {
        approvalRemarks: approvalRemarks.trim(),
        markAsInactive: Boolean(markAsInactive),
      });
      const successMessage = markAsInactive
        ? `Exit clearance approved successfully. ${approvalTarget.memberName}'s account has been marked as Inactive.`
        : `Exit clearance approved successfully for ${approvalTarget.memberName}.`;
      toast.success(successMessage);
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

  // Status Chip Renderer (Curated Application Color Palette)
  const renderStatusChip = (status) => {
    switch (status) {
      case "Approved":
        return (
          <Chip
            label="Approved"
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#34d399 !important" : "#16a34a !important" }} />}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: isDark ? "#34d399" : "#16a34a",
              bgcolor: isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(22, 163, 74, 0.1)",
              border: isDark ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(22, 163, 74, 0.25)",
              borderRadius: 999,
              "& .MuiChip-label": { px: 0.8 },
            }}
          />
        );
      case "ReadyForApproval":
        return (
          <Chip
            label="Ready for Approval"
            size="small"
            icon={<VerifiedIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#c4b5fd !important" : "#2563a6 !important" }} />}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: isDark ? "#c4b5fd" : "#4a3f6b",
              bgcolor: isDark ? "rgba(196, 181, 253, 0.14)" : "rgba(74, 63, 107, 0.08)",
              border: isDark ? "1px solid rgba(196, 181, 253, 0.3)" : "1px solid rgba(74, 63, 107, 0.25)",
              borderRadius: 999,
              "& .MuiChip-label": { px: 0.8 },
            }}
          />
        );
      case "DuesOutstanding":
        return (
          <Chip
            label="Dues Outstanding"
            size="small"
            icon={<WarningIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#f87171 !important" : "#dc2626 !important" }} />}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: isDark ? "#f87171" : "#dc2626",
              bgcolor: isDark ? "rgba(220, 38, 38, 0.14)" : "rgba(220, 38, 38, 0.08)",
              border: isDark ? "1px solid rgba(220, 38, 38, 0.3)" : "1px solid rgba(220, 38, 38, 0.25)",
              borderRadius: 999,
              "& .MuiChip-label": { px: 0.8 },
            }}
          />
        );
      case "PendingClearance":
      default:
        return (
          <Chip
            label="Pending Verification"
            size="small"
            icon={<PendingIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#fbbf24 !important" : "#b45309 !important" }} />}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: isDark ? "#fbbf24" : "#b45309",
              bgcolor: isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)",
              border: isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: 999,
              "& .MuiChip-label": { px: 0.8 },
            }}
          />
        );
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
        <Tooltip title={`View contributions for ${row.eventName}`}>
          <Box
            onClick={() => {
              if (row.eventId) {
                navigate(`/contributions?eventId=${row.eventId}`, { state: { eventId: row.eventId } });
              }
            }}
            sx={{
              cursor: "pointer",
              display: "inline-block",
              transition: "transform 0.15s ease",
              "&:hover .event-name-link": {
                color: "primary.main",
                textDecoration: "underline",
              },
            }}
          >
            <Typography
              className="event-name-link"
              variant="body2"
              fontWeight={700}
              sx={{ color: "text.primary", transition: "color 0.15s ease" }}
            >
              {row.eventName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatGridDate(row.eventDate)}
            </Typography>
          </Box>
        </Tooltip>
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
      label: "Pending Events",
      key: "pendingObligationsCount",
      align: "center",
      render: (row) => {
        const count = row.pendingObligationsCount || 0;
        const targetEvId = row.unpaidEventId || row.eventId;
        const unpaidList = row.unpaidEvents || [];
        const hasDues = count > 0;
        return (
          <Tooltip title={hasDues ? "Click to view unpaid events" : "No pending obligations"}>
            <Chip
              label={`${count} Event${count === 1 ? "" : "s"}`}
              size="small"
              onClick={hasDues ? (e) => {
                if (unpaidList.length > 1) {
                  setUnpaidPopoverAnchor(e.currentTarget);
                  setUnpaidPopoverData({
                    memberName: row.memberName,
                    memberId: row.memberId,
                    unpaidEvents: unpaidList,
                  });
                } else if (targetEvId) {
                  navigate(`/contributions?eventId=${targetEvId}`, { state: { eventId: targetEvId } });
                }
              } : undefined}
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                height: 24,
                cursor: hasDues ? "pointer" : "default",
                color: hasDues ? (isDark ? "#fbbf24" : "#b45309") : (isDark ? "#94a3b8" : "#64748b"),
                bgcolor: hasDues
                  ? (isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)")
                  : (isDark ? "rgba(100, 116, 139, 0.14)" : "rgba(100, 116, 139, 0.08)"),
                border: hasDues
                  ? (isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(245, 158, 11, 0.25)")
                  : (isDark ? "1px solid rgba(100, 116, 139, 0.25)" : "1px solid rgba(100, 116, 139, 0.2)"),
                borderRadius: 999,
                transition: "all 0.2s ease",
                "&:hover": hasDues ? { filter: "brightness(0.95)", transform: "translateY(-1px)", boxShadow: "0 2px 6px rgba(245, 158, 11, 0.25)" } : {},
              }}
            />
          </Tooltip>
        );
      },
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
              icon={<PendingIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#fbbf24 !important" : "#b45309 !important" }} />}
              sx={{
                height: 24,
                fontWeight: 700,
                fontSize: "0.72rem",
                color: isDark ? "#fbbf24" : "#b45309",
                bgcolor: isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)",
                border: isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: 999,
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          );
        }
        return (
          <Chip
            label={row.paymentVerificationStatus || "All Verified"}
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#34d399 !important" : "#16a34a !important" }} />}
            sx={{
              height: 24,
              fontWeight: 700,
              fontSize: "0.72rem",
              color: isDark ? "#34d399" : "#16a34a",
              bgcolor: isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(22, 163, 74, 0.08)",
              border: isDark ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(22, 163, 74, 0.25)",
              borderRadius: 999,
              "& .MuiChip-label": { px: 0.8 },
            }}
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
                  "&:hover": { bgcolor: isDark ? "rgba(196,181,253,0.12)" : "rgba(74,63,107,0.08)" },
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
                    color: isDark ? "#c4b5fd" : "#4a3f6b",
                    "&:hover": { bgcolor: isDark ? "rgba(196,181,253,0.12)" : "rgba(74,63,107,0.08)" },
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
                    variant="contained"
                    disabled={!canApprove}
                    onClick={() => handleOpenApproveDialog(row)}
                    startIcon={<CheckCircleIcon sx={{ fontSize: "0.95rem !important" }} />}
                    sx={{
                      fontSize: "0.72rem",
                      py: 0.35,
                      px: 1.4,
                      fontWeight: 700,
                      textTransform: "none",
                      borderRadius: "8px",
                      background: canApprove
                        ? (isDark
                            ? "linear-gradient(135deg, #6d5ca0 0%, #52447d 100%) !important"
                            : "linear-gradient(135deg, #4a3f6b 0%, #2d2550 100%) !important")
                        : "action.disabledBackground",
                      color: canApprove ? "#ffffff !important" : "text.disabled",
                      border: canApprove && isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
                      boxShadow: canApprove
                        ? (isDark ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(74, 63, 107, 0.25)")
                        : "none",
                      opacity: canApprove ? 1 : 0.6,
                      "&:hover": {
                        background: canApprove
                          ? (isDark
                              ? "linear-gradient(135deg, #7d6bb3 0%, #605191 100%) !important"
                              : "linear-gradient(135deg, #5c4f82 0%, #3a3065 100%) !important")
                          : undefined,
                      },
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
                icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important", color: isDark ? "#94a3b8 !important" : "#64748b !important" }} />}
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  height: 24,
                  color: isDark ? "#94a3b8" : "#64748b",
                  bgcolor: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(100, 116, 139, 0.08)",
                  border: isDark ? "1px solid rgba(148, 163, 184, 0.25)" : "1px solid rgba(100, 116, 139, 0.2)",
                  borderRadius: 999,
                  "& .MuiChip-label": { px: 0.8 },
                }}
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
          icon={<VerifiedIcon sx={{ fontSize: "0.9rem !important", color: isDark ? "#34d399 !important" : "#16a34a !important" }} />}
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            height: 24,
            color: isDark ? "#34d399" : "#16a34a",
            bgcolor: isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(22, 163, 74, 0.08)",
            border: isDark ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(22, 163, 74, 0.25)",
            borderRadius: 999,
            "& .MuiChip-label": { px: 0.8 },
          }}
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
    <div className="page-shell">
      {/* ── Top Header Bar (Matching Support Tickets) ──── */}
      <Box
        sx={{
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(90deg, #162538 0%, #1e3a5f 100%)"
              : "linear-gradient(90deg, #1e5183 0%, #2968a2 100%)",
          borderBottom: (theme) =>
            theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
          borderRadius: "8px",
          color: "#ffffff",
          px: 3,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 46,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ fontSize: "0.9375rem", letterSpacing: "-0.005em", color: "#ffffff" }}
        >
          Member Exit Clearance
        </Typography>
      </Box>

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
          {/* Filter Panel (Common Component Pattern) */}
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
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: 1.5,
                width: "100%",
              }}
            >
              <Box sx={{ width: { xs: "100%", sm: 220, md: 240 } }}>
                <AppSelect
                  label="Send-Off Event"
                  value={selectedEventId || "all"}
                  onChange={(e) => setSelectedEventId(e.target.value === "all" ? "" : e.target.value)}
                  onClear={() => setSelectedEventId("")}
                  options={[
                    { label: "All Send-Off Events", value: "all" },
                    ...uniqueSendOffEvents.map((ev) => ({ label: ev.name, value: ev.id })),
                  ]}
                  placeholder="Select Event"
                />
              </Box>

              <Box sx={{ width: { xs: "100%", sm: 200, md: 220 } }}>
                <AppSelect
                  label="Clearance Status"
                  value={selectedClearanceStatus}
                  onChange={(e) => setSelectedClearanceStatus(e.target.value || "all")}
                  onClear={() => setSelectedClearanceStatus("all")}
                  options={[
                    { label: "All Clearance Statuses", value: "all" },
                    { label: "Ready For Approval", value: "ReadyForApproval" },
                    { label: "Dues Outstanding", value: "DuesOutstanding" },
                    { label: "Pending Verification", value: "PendingClearance" },
                    { label: "Approved", value: "Approved" },
                  ]}
                  placeholder="Select Status"
                />
              </Box>

              <Box sx={{ width: { xs: "100%", sm: 200, md: 220 } }}>
                <AppSelect
                  label="Payment Status"
                  value={selectedPaymentStatus}
                  onChange={(e) => setSelectedPaymentStatus(e.target.value || "all")}
                  onClear={() => setSelectedPaymentStatus("all")}
                  options={[
                    { label: "All Payment Statuses", value: "all" },
                    { label: "All Cleared (₹0 Dues)", value: "cleared" },
                    { label: "Has Outstanding Dues", value: "dues" },
                    { label: "Awaiting Verification", value: "unverified" },
                  ]}
                  placeholder="Select Status"
                />
              </Box>

              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterIcon sx={{ fontSize: 17 }} />}
                  onClick={() => loadQueue()}
                  sx={{
                    height: 34,
                    minHeight: 34,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
                    whiteSpace: "nowrap",
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#2d6bb3 !important" : "#2563a6 !important"),
                    border: (theme) => (theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none"),
                    "&:hover": {
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? "#3b7fc7 !important" : "#1d5083 !important"),
                    },
                  }}
                >
                  Filter
                </AppButton>
                <AppButton
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedEventId("");
                    setSelectedClearanceStatus("all");
                    setSelectedPaymentStatus("all");
                  }}
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
          </Paper>

          {/* Queue Data Table */}
          <AppDataTable
            data={filteredQueueData}
            columns={queueColumns}
            loading={loading}
            emptyMessage="No record found"
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
            emptyMessage="No record found"
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider", mb: 1.5 }}>
              <Tabs
                value={duesActiveSubTab}
                onChange={(e, v) => setDuesActiveSubTab(v)}
                sx={{
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

              {duesActiveSubTab === 0 && (duesDetail.eventDues?.filter(ed => ed.outstandingBalance > 0).length || 0) > 0 && (
                <Button
                  size="small"
                  variant={onlyUnpaidEventsInModal ? "contained" : "outlined"}
                  color={onlyUnpaidEventsInModal ? "warning" : "inherit"}
                  onClick={() => setOnlyUnpaidEventsInModal((prev) => !prev)}
                  sx={{
                    fontSize: "0.72rem",
                    py: 0.3,
                    px: 1,
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "6px",
                  }}
                >
                  {onlyUnpaidEventsInModal ? "Showing Unpaid Alone" : "Show Unpaid Alone"}
                </Button>
              )}
            </Box>

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
                    {(() => {
                      const displayedDues = onlyUnpaidEventsInModal
                        ? (duesDetail.eventDues || []).filter((ed) => ed.outstandingBalance > 0)
                        : (duesDetail.eventDues || []);

                      if (displayedDues.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                              {onlyUnpaidEventsInModal ? "No unpaid events found for this member." : "No contribution obligations found for this member."}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return displayedDues.map((ed) => (
                        <TableRow key={ed.eventId} hover>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <Tooltip title={`View contributions for ${ed.eventName}`}>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                onClick={() => navigate(`/contributions?eventId=${ed.eventId}`, { state: { eventId: ed.eventId } })}
                                sx={{
                                  cursor: "pointer",
                                  color: "primary.main",
                                  display: "inline-block",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {ed.eventName}
                              </Typography>
                            </Tooltip>
                          </TableCell>
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
                            {(() => {
                              const isPaid = ed.paymentStatus === "Paid";
                              const isPartial = ed.paymentStatus === "Partially Paid";
                              const color = isPaid
                                ? (isDark ? "#34d399" : "#16a34a")
                                : isPartial
                                ? (isDark ? "#fbbf24" : "#b45309")
                                : (isDark ? "#f87171" : "#dc2626");
                              const bg = isPaid
                                ? (isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(22, 163, 74, 0.08)")
                                : isPartial
                                ? (isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)")
                                : (isDark ? "rgba(220, 38, 38, 0.14)" : "rgba(220, 38, 38, 0.08)");
                              const border = isPaid
                                ? (isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(22, 163, 74, 0.25)")
                                : isPartial
                                ? (isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)")
                                : (isDark ? "rgba(220, 38, 38, 0.3)" : "rgba(220, 38, 38, 0.25)");
                              return (
                                <Chip
                                  label={ed.paymentStatus}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.68rem",
                                    height: 22,
                                    color,
                                    bgcolor: bg,
                                    border: `1px solid ${border}`,
                                    borderRadius: 999,
                                  }}
                                />
                              );
                            })()}
                            {ed.hasPendingPayment && ed.outstandingBalance > 0 && ed.paymentStatus !== "Paid" && (
                              <Typography variant="caption" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: isDark ? "#fbbf24" : "#b45309", mt: 0.3 }}>
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
                      ));
                    })()}
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
                            {(() => {
                              const isVer = pt.status === "Verified" || pt.status === "Approved" || pt.status === "Paid";
                              const isRej = pt.status === "Rejected";
                              const color = isVer
                                ? (isDark ? "#34d399" : "#16a34a")
                                : isRej
                                ? (isDark ? "#f87171" : "#dc2626")
                                : (isDark ? "#fbbf24" : "#b45309");
                              const bg = isVer
                                ? (isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(22, 163, 74, 0.08)")
                                : isRej
                                ? (isDark ? "rgba(220, 38, 38, 0.14)" : "rgba(220, 38, 38, 0.08)")
                                : (isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)");
                              const border = isVer
                                ? (isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(22, 163, 74, 0.25)")
                                : isRej
                                ? (isDark ? "rgba(220, 38, 38, 0.3)" : "rgba(220, 38, 38, 0.25)")
                                : (isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)");
                              return (
                                <Chip
                                  label={pt.status || "Pending"}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.68rem",
                                    height: 22,
                                    color,
                                    bgcolor: bg,
                                    border: `1px solid ${border}`,
                                    borderRadius: 999,
                                  }}
                                />
                              );
                            })()}
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
            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="UTR / Reference Number (Optional for Cash)"
                size="small"
                placeholder="e.g. UPI Ref, Bank UTR"
                value={paymentForm.utr}
                onChange={(e) => setPaymentForm({ ...paymentForm, utr: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
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

          {Boolean(
            (authState?.userId && String(approvalTarget?.memberId).toLowerCase() === String(authState.userId).toLowerCase()) ||
            (authState?.user?.userId && String(approvalTarget?.memberId).toLowerCase() === String(authState.user.userId).toLowerCase()) ||
            (authState?.email && approvalTarget?.memberEmail && String(approvalTarget.memberEmail).toLowerCase() === String(authState.email).toLowerCase())
          ) && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: "8px", fontWeight: 600 }}>
              Notice: You are approving your own exit clearance. Marking your account as inactive will deactivate your current administrator access.
            </Alert>
          )}

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
            <Typography variant="body2" color="success.main" fontWeight={800} sx={{ mb: 0.5 }}>
              <strong>Outstanding Dues:</strong> ₹0 (Fully Cleared)
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, pt: 1, borderTop: `1px dashed ${theme.palette.divider}` }}>
              <Typography variant="body2" fontWeight={700}>
                Account Status on Approval:
              </Typography>
              <Chip
                label={markAsInactive ? "Inactive (Deactivated)" : "Active"}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  bgcolor: markAsInactive
                    ? (isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2")
                    : (isDark ? "rgba(16, 185, 129, 0.2)" : "#dcfce7"),
                  color: markAsInactive ? "error.main" : "success.main",
                  border: `1px solid ${markAsInactive ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                }}
              />
            </Box>
          </Paper>

          <FormControlLabel
            control={
              <Checkbox
                checked={markAsInactive}
                onChange={(e) => setMarkAsInactive(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  Mark member account as Inactive
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Deactivates login credentials and flags offboarding complete for {approvalTarget?.memberName || "this member"}
                </Typography>
              </Box>
            }
            sx={{ mb: 2, alignItems: "flex-start" }}
          />

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
                  <Grid size={{ xs: 12, sm: 6 }}>
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

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      SEND-OFF EVENT
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {selectedHistoryItem.eventNameSnapshot}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      APPROVED BY
                    </Typography>
                    <Typography variant="body2" fontWeight={800}>
                      {selectedHistoryItem.approvedByName}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      APPROVAL DATE
                    </Typography>
                    <Typography variant="body2" fontWeight={800}>
                      {formatGridDateTime(selectedHistoryItem.exitApprovalDate)}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
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

      {/* ── UNPAID EVENTS POPOVER (Shows Unpaid Events Alone) ── */}
      <Popover
        open={Boolean(unpaidPopoverAnchor)}
        anchorEl={unpaidPopoverAnchor}
        onClose={() => {
          setUnpaidPopoverAnchor(null);
          setUnpaidPopoverData(null);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              width: 330,
              maxWidth: "92vw",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
            },
          },
        }}
      >
        <Box sx={{ mb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle2" fontWeight={800} color="error.main">
            Unpaid Events ({unpaidPopoverData?.unpaidEvents?.length || 0})
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {unpaidPopoverData?.memberName}
          </Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <List dense disablePadding>
          {(unpaidPopoverData?.unpaidEvents || []).map((ev) => (
            <ListItem
              key={ev.eventId}
              button
              onClick={() => {
                const targetId = ev.eventId;
                setUnpaidPopoverAnchor(null);
                setUnpaidPopoverData(null);
                navigate(`/contributions?eventId=${targetId}`, { state: { eventId: targetId } });
              }}
              sx={{
                borderRadius: "8px",
                mb: 0.5,
                bgcolor: isDark ? "rgba(239, 68, 68, 0.08)" : "#fef2f2",
                "&:hover": {
                  bgcolor: isDark ? "rgba(239, 68, 68, 0.16)" : "#fee2e2",
                },
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.75,
                px: 1,
              }}
            >
              <Box sx={{ pr: 1, minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ color: "primary.main" }}>
                  {ev.eventName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatGridDate(ev.eventDate)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" fontWeight={900} color="error.main">
                  {formatWholeCurrency(ev.outstandingBalance)}
                </Typography>
                <Typography variant="caption" color="error.main" fontWeight={700}>
                  {ev.paymentStatus || "Unpaid"}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      </Popover>
    </div>
  );
}
