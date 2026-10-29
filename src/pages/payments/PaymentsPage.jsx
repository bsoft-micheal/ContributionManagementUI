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
import { formatWholeCurrency } from "../../utils/roundingHelper";

import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton, { AppClearFilterButton } from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { useAppToast } from "../../components/common/AppToast";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  getPaymentTransactionsAsync,
} from "../../services/paymentService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync, isEventPublished } from "../../services/eventService";
import { getStatusesAsync } from "../../services/statusService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage, hasActionPermission } from "../../utils/rightsHelper";
import { TOAST_MESSAGES, COMMON_STRINGS, MENU_FEATURE_IDS } from "../../constants";
import { getImageUrl } from "../../services/apiClient";
import { groupSplitTransactions } from "../../utils/paymentGroupHelper";

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
  const [hasAppliedFilter, setHasAppliedFilter] = useState(true);

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
    const list = [{ label: "All Statuses", value: "ALL" }];
    const seen = new Set();
    (dbStatuses || []).forEach((s) => {
      const name = s.statusName || s.name || s.status_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });
    if (list.length === 1) {
      ["Pending", "Verified", "Rejected", "Paid", "Approved"].forEach((s) => {
        if (!seen.has(s.toLowerCase())) {
          seen.add(s.toLowerCase());
          list.push({ label: s, value: s });
        }
      });
    }
    return list;
  }, [dbStatuses]);


  // Load transactions and master data from backend on mount
  const loadBackendData = async () => {
    try {
      setLoading(true);
      const [txnRes, memsRes, eventsRes, statusRes] = await Promise.all([
        getPaymentTransactionsAsync().catch(() => []),
        getMembersAsync().catch(() => []),
        getEventsAsync().catch(() => []),
        getStatusesAsync(true).catch(() => []),
      ]);

      if (Array.isArray(memsRes)) setMembersList(memsRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes.filter((e) => !e.isDeleted && isEventPublished(e)));
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
        const grouped = groupSplitTransactions(mapped);
        setTransactions(grouped);
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
    const handleStatusUpdated = () => {
      getStatusesAsync(true)
        .then((res) => {
          if (Array.isArray(res)) setDbStatuses(res);
        })
        .catch(() => {});
    };
    window.addEventListener("contribution_updated", handleUpdate);
    window.addEventListener("status_updated", handleStatusUpdated);
    return () => {
      window.removeEventListener("contribution_updated", handleUpdate);
      window.removeEventListener("status_updated", handleStatusUpdated);
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((t) => {
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
      if (appliedMode !== "ALL") {
        const matchMode =
          t.paymentMode === appliedMode ||
          (Array.isArray(t.paymentModes) && t.paymentModes.includes(appliedMode));
        if (!matchMode) return false;
      }
      if (appliedStatus !== "ALL" && t.status !== appliedStatus) return false;
      if (appliedDate && !dayjs(t.paymentDate).isSame(appliedDate, "day")) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const dateA = a.createdAt || a.CreatedAt || a.createdOn || a.CreatedOn || a.paymentDate || "";
      const dateB = b.createdAt || b.CreatedAt || b.createdOn || b.CreatedOn || b.paymentDate || "";
      const dayA = dateA ? dayjs(dateA).format("YYYY-MM-DD") : "";
      const dayB = dateB ? dayjs(dateB).format("YYYY-MM-DD") : "";
      if (dayA !== dayB) {
        return dayB.localeCompare(dayA);
      }
      const nameA = String(a.memberName || a.name || "").trim();
      const nameB = String(b.memberName || b.name || "").trim();
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
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

    if (st === "verified" || st === "closed" || st === "paid" || st === "approved") {
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
      label: "Transaction ID",
      key: "id",
      minWidth: 165,
      render: (row) => {
        const isSplit = row.isSplitGroup && Array.isArray(row.splits) && row.splits.length > 0;

        const tooltipContent = (
          <Box sx={{ p: 0.5, minWidth: 320, maxWidth: 400, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {/* Header: Title / ID + Status */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                borderBottom: (t) => `1px solid ${t.palette.divider}`,
                pb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  sx={{
                    color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#1e293b"),
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  {row.id}
                </Typography>
                {isSplit && (
                  <Chip
                    label={`Split (${row.splits.length})`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      bgcolor: "rgba(99, 102, 241, 0.12)",
                      color: "#6366f1",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                    }}
                  />
                )}
              </Box>
              <Box>{renderStatusBadge(row.status)}</Box>
            </Box>

            {/* Core Details Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.2,
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc"),
                p: 1.25,
                borderRadius: "8px",
                border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0"}`,
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Member Name
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
                  {row.memberName || "--"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Event Name
                </Typography>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.78rem" }}>
                  {row.eventName || "--"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Amount
                </Typography>
                <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.82rem", color: "success.main" }}>
                  {formatWholeCurrency(row.amount)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Payment Mode
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
                  {row.paymentMode || "--"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Payment Date
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                  {row.paymentDate ? formatGridDate(row.paymentDate) : "--"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Verified By
                </Typography>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.75rem" }}>
                  {row.verifiedBy && row.verifiedBy !== "-" && row.verifiedBy !== "--" ? row.verifiedBy : "--"}
                </Typography>
              </Box>
            </Box>

            {/* Split Details Breakdown (if Split) */}
            {isSplit && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{ color: "#6366f1", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.03em" }}
                >
                  Split Breakdown ({row.splits.length} parts):
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {row.splits.map((s, idx) => (
                    <Box
                      key={s.id || idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "#ffffff"),
                        p: 0.75,
                        borderRadius: "6px",
                        border: (t) =>
                          `1px solid ${t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0"}`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        >
                          {s.id || s.txnNumber}
                        </Typography>
                        {s.paymentMode && (
                          <Chip
                            label={s.paymentMode}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: (t) =>
                                t.palette.mode === "dark" ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
                              color: "#6366f1",
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: "success.main", fontSize: "0.78rem" }}>
                          {formatWholeCurrency(s.amount)}
                        </Typography>
                        {s.utr && s.utr !== "-" && s.utr !== "--" && (
                          <Typography
                            variant="caption"
                            sx={{ display: "block", color: "text.secondary", fontSize: "0.68rem" }}
                          >
                            Ref: {s.utr}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Single Transaction Reference (if not split) */}
            {!isSplit && row.utr && row.utr !== "-" && row.utr !== "--" && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                  Ref / UTR No:
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {row.utr}
                </Typography>
              </Box>
            )}

            {/* Footer Hint */}
            {canViewPaymentHistory && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.68rem",
                  pt: 0.75,
                  borderTop: (t) => `1px dashed ${t.palette.divider}`,
                  textAlign: "center",
                  display: "block",
                }}
              >
                Click to view full transaction modal
              </Typography>
            )}
          </Box>
        );

        return (
          <Tooltip
            arrow
            disableInteractive={false}
            enterDelay={100}
            leaveDelay={200}
            placement="right-start"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: (t) => (t.palette.mode === "dark" ? "#1e293b" : "#ffffff"),
                  color: "text.primary",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  border: (t) =>
                    `1px solid ${t.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#e2e8f0"}`,
                  borderRadius: "12px",
                  p: 1.5,
                  maxWidth: 420,
                },
              },
              arrow: {
                sx: {
                  color: (t) => (t.palette.mode === "dark" ? "#1e293b" : "#ffffff"),
                },
              },
            }}
            title={tooltipContent}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                width: "100%",
                cursor: canViewPaymentHistory ? "pointer" : "default",
                py: 0.25,
              }}
              onClick={() => {
                if (!canViewPaymentHistory) return;
                setSelectedTxn(row);
                setViewDialogOpen(true);
              }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: (t) => (t.palette.mode === "dark" ? "#818cf8" : "#4f46e5"),
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  letterSpacing: "0.02em",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(99, 102, 241, 0.3)",
                  textUnderlineOffset: "3px",
                  "&:hover": {
                    color: "#4338ca",
                    textDecorationColor: "#4338ca",
                  },
                }}
              >
                {row.id}
              </Typography>
              {(row.isSplitGroup || row.parentTxnNumber) && (
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
                    cursor: "pointer",
                  }}
                />
              )}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      label: "Username",
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
      render: (row) => formatWholeCurrency(row.amount),
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
        data={hasAppliedFilter ? filteredTransactions : []}
        emptyMessage={!hasAppliedFilter ? "Please select filters and click Filter to view payment history." : undefined}
        loading={loading}

        filterPanel={
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 1.25,
              width: "100%",
            }}
          >
            {!isMemberRole && (
              <Box sx={{ width: { xs: "100%", sm: 175, md: 190 } }}>
                <AppSelect
                  label="Select Member"
                  value={filterMember}
                  onChange={(e) => {
                    setFilterMember(e.target.value || "ALL");
                  }}
                  onClear={() => setFilterMember("ALL")}
                  options={memberOptions}
                  size="small"
                  placeholder="Select Member"
                  fullWidth
                />
              </Box>
            )}
            <Box sx={{ width: { xs: "100%", sm: 220, md: 250 } }}>
              <AppSelect
                label="Select Event Name"
                value={filterEvent}
                onChange={(e) => {
                  setFilterEvent(e.target.value || "ALL");
                }}
                onClear={() => setFilterEvent("ALL")}
                options={eventOptions}
                size="small"
                placeholder="Select Event Name"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 140, md: 155 } }}>
              <AppSelect
                label="Payment Mode"
                value={filterMode}
                onChange={(e) => {
                  setFilterMode(e.target.value || "ALL");
                }}
                onClear={() => setFilterMode("ALL")}
                options={modeOptions}
                size="small"
                placeholder="Payment Mode"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 155, md: 170 } }}>
              <AppSelect
                label="Select Status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value || "ALL");
                }}
                onClear={() => setFilterStatus("ALL")}
                options={statusOptions}
                size="small"
                placeholder="Select Status"
                fullWidth
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 165, md: 175 } }}>
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
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                onClick={() => {
                  setAppliedMember(filterMember);
                  setAppliedEvent(filterEvent);
                  setAppliedMode(filterMode);
                  setAppliedStatus(filterStatus);
                  setAppliedDate(filterDate);
                  setHasAppliedFilter(true);
                }}
                sx={{
                  height: 34,
                  minHeight: 34,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  whiteSpace: "nowrap",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
                  border: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
                  "&:hover": { bgcolor: (theme) => theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important" },
                }}
              >
                Filter
              </AppButton>
              <AppClearFilterButton
                filters={{
                  member: filterMember,
                  event: filterEvent,
                  mode: filterMode,
                  status: filterStatus,
                  date: filterDate,
                }}
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
                  setHasAppliedFilter(true);
                }}
              />
            </Box>
          </Box>
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
          </Stack>  
        }
      >
        {selectedTxn && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Transaction ID
                </Typography>
                {selectedTxn.isSplitGroup && selectedTxn.splits?.length > 0 ? (
                  <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.6 }}>
                    {selectedTxn.splits.map((s, idx) => (
                      <Box key={s.id || idx} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            color: (t) => (t.palette.mode === "dark" ? "#8bb8ec" : "#2563a6"),
                            fontFamily: "monospace",
                            fontSize: "0.84rem",
                          }}
                        >
                          {s.id || s.txnNumber}
                        </Typography>
                        {s.paymentMode && (
                          <Chip
                            label={s.paymentMode}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              bgcolor: (t) =>
                                t.palette.mode === "dark" ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
                              color: "#6366f1",
                              border: "1px solid rgba(99, 102, 241, 0.2)",
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      color: (t) => (t.palette.mode === "dark" ? "#8bb8ec" : "#2563a6"),
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      mt: 0.5,
                    }}
                  >
                    {selectedTxn.id || selectedTxn.txnNumber || "--"}
                  </Typography>
                )}
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Verification Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>{renderStatusBadge(selectedTxn.status)}</Box>
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
                  color={(t) => (t.palette.mode === "dark" ? "#8bb8ec" : "#2563a6")}
                >
                  {formatWholeCurrency(selectedTxn.amount)}
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
                <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {selectedTxn.isSplitGroup && selectedTxn.splits?.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                      {selectedTxn.splits.map((s, idx) => (
                        <Box
                          key={s.id || idx}
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.75,
                            flexWrap: "wrap",
                          }}
                        >
                          <Chip
                            label={s.id || s.txnNumber}
                            size="small"
                            sx={{
                              height: 20,
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              bgcolor: (t) =>
                                t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                              color: (t) => (t.palette.mode === "dark" ? "#cbd5e1" : "#475569"),
                              border: (t) => `1px solid ${t.palette.divider}`,
                            }}
                          />
                          {renderUtrReferenceBadges(
                            s.utr && s.utr !== "-" && s.utr !== "--"
                              ? (s.utr.includes(":") ? s.utr : `${s.paymentMode || "Ref"}: ${s.utr}`)
                              : `${s.paymentMode || "Ref"}: --`
                          )}
                        </Box>
                      ))}
                      {selectedTxn.utr && selectedTxn.utr !== "-" && selectedTxn.utr !== "--" && (
                        <Box sx={{ mt: 0.2 }}>
                          <Tooltip title="Copy References">
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
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
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
