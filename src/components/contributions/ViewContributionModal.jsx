import React, { useState } from "react";
import {
  Box,
  Grid,
  Stack,
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  CheckCircleRounded as VerifiedIcon,
  CancelRounded as RejectedIcon,
  HourglassEmptyRounded as PendingIcon,
  PaymentRounded as PaymentIcon,
  ReceiptLongRounded as ReceiptIcon,
  EventRounded as EventIcon,
  PersonRounded as PersonIcon,
  ContentCopyRounded as CopyIcon,
  CheckRounded as CheckIcon,
  ZoomInRounded as ZoomInIcon,
  ChatBubbleOutlineRounded as NoteIcon,
  AdminPanelSettingsRounded as AdminIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import AppCancelButton from "../common/AppCancelButton";
import { formatWholeCurrency, formatWholeNumber } from "../../utils/roundingHelper";

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

export default function ViewContributionModal({
  open,
  onClose,
  row,
  matchedTx,
  events = [],
  onPay,
}) {
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  if (!row) return null;

  // Resolve status
  const rawStatus = String(row.paymentStatus || matchedTx?.status || "").toLowerCase().trim();
  const isVerified =
    row.isVerified === true ||
    rawStatus === "verified" ||
    Boolean(row.verifiedBy && String(row.verifiedBy).trim() !== "");

  const isRejected = rawStatus === "rejected";
  const isPaid =
    isVerified ||
    rawStatus === "paid" ||
    rawStatus === "2" ||
    row.paymentStatus === 2 ||
    (Number(row.paidAmount || 0) > 0 && !isRejected);

  let displayStatus = "Pending";
  if (isRejected) displayStatus = "Rejected";
  else if (isVerified) displayStatus = "Verified";
  else if (isPaid) displayStatus = "Paid";

  // Financial metrics
  const targetAmount = Number(row.amount || 0);
  const actualPaidAmount = Number(row.paidAmount || matchedTx?.amount || 0);
  const arrears = Number(row.previousUnpaid || row.previousArrears || matchedTx?.previousArrears || 0);
  const totalDue = Number(row.totalAccumulated ?? row.totalDue ?? (targetAmount + arrears));

  // Authority Audit & Verification Details
  const verifier =
    row.verifiedBy ||
    matchedTx?.verifiedBy ||
    row.recordedBy ||
    matchedTx?.recordedBy ||
    (isVerified ? "Authority Officer" : "");

  const verifyDateRaw = row.verifiedOn || row.verifiedDate || matchedTx?.verifiedOn || matchedTx?.verifiedDate;
  const verifyDateFormatted = verifyDateRaw ? dayjs(verifyDateRaw).format("DD/MM/YYYY hh:mm A") : "";

  // Extract authority audit remarks / notes (from Image 3: Audit Remarks / Notes)
  const rawNotes = String(matchedTx?.notes || row.notes || "").trim();
  let auditNotes =
    row.auditRemarks ||
    matchedTx?.auditRemarks ||
    row.rejectionReason ||
    matchedTx?.rejectionReason ||
    "";

  if (!auditNotes && rawNotes) {
    if (rawNotes.includes("Rejected:")) {
      auditNotes = rawNotes.split("Rejected:")[1]?.trim() || "";
    } else if (rawNotes.includes("Status updated to")) {
      auditNotes = rawNotes.trim();
    } else if (!rawNotes.startsWith("[Scope:") && (isRejected || isVerified || verifier)) {
      auditNotes = rawNotes;
    }
  }

  // Remove [Split Breakdown: ...] string from notes
  if (auditNotes) {
    auditNotes = auditNotes.replace(/\[Split Breakdown:[^\]]+\]/g, "").trim();
    if (auditNotes.startsWith("[Scope:")) {
      auditNotes = "";
    }
  }

  // Fallback if status is rejected but no specific note was written
  if (isRejected && !auditNotes) {
    auditNotes = `Status updated to Rejected${verifier ? ` by ${verifier}` : ""}.`;
  }

  // Payment Mode and Breakdown parsing
  const rawMode = row.paymentMode || matchedTx?.paymentMode || "None";
  const rawUtr =
    row.utrNumber ||
    row.referenceNo ||
    row.utr ||
    matchedTx?.utr ||
    matchedTx?.referenceNo ||
    matchedTx?.transactionRef ||
    "";

  // Parse structured splits or breakdown
  let splitsList = [];
  if (Array.isArray(matchedTx?.splits) && matchedTx.splits.length > 0) {
    splitsList = matchedTx.splits;
  } else if (Array.isArray(row.splits) && row.splits.length > 0) {
    splitsList = row.splits;
  } else {
    // Try to parse from notes "[Split Breakdown: Mode: ₹Amt (Ref: UTR), ...]"
    const match = rawNotes.match(/\[Split Breakdown:\s*([^\]]+)\]/);
    if (match && match[1]) {
      const items = match[1].split(",");
      splitsList = items.map((item, idx) => {
        const parts = item.trim().split(":");
        let mode = parts[0]?.trim() || `Mode ${idx + 1}`;
        const lowerM = mode.toLowerCase();
        if (lowerM.includes("gpay") || lowerM.includes("google")) mode = "GPay";
        else if (lowerM.includes("phonepe") || lowerM.includes("phone")) mode = "PhonePe";
        else if (lowerM.includes("paytm")) mode = "Paytm";
        else if (lowerM.includes("cash")) mode = "Cash";
        else if (lowerM.includes("split")) mode = "Split";
        const rest = parts.slice(1).join(":");
        const amtMatch = rest.match(/₹?([0-9.]+)/);
        return {
          mode,
          amount: amtMatch ? Number(amtMatch[1]) : 0,
        };
      });
    } else {
      // Single mode
      const isCash = rawMode.toLowerCase().includes("cash");
      let resolvedSingleMode = rawMode !== "-" && rawMode !== "--" ? rawMode : "Cash";
      const lowerRaw = resolvedSingleMode.toLowerCase();
      if (lowerRaw.includes("gpay") || lowerRaw.includes("google")) resolvedSingleMode = "GPay";
      else if (lowerRaw.includes("phonepe") || lowerRaw.includes("phone")) resolvedSingleMode = "PhonePe";
      else if (lowerRaw.includes("paytm")) resolvedSingleMode = "Paytm";
      else if (lowerRaw.includes("cash")) resolvedSingleMode = "Cash";
      else if (lowerRaw.includes("split")) resolvedSingleMode = "Split";
      else if (lowerRaw === "upi" || lowerRaw === "online") {
        const lowerNotes = (matchedTx?.notes || row.notes || "").toLowerCase();
        if (lowerNotes.includes("gpay") || lowerNotes.includes("google pay")) resolvedSingleMode = "GPay";
        else if (lowerNotes.includes("phonepe") || lowerNotes.includes("phone pe")) resolvedSingleMode = "PhonePe";
        else if (lowerNotes.includes("paytm")) resolvedSingleMode = "Paytm";
        else if (lowerNotes.includes("cash")) resolvedSingleMode = "Cash";
      }

      splitsList = [
        {
          mode: resolvedSingleMode,
          amount: actualPaidAmount > 0 ? actualPaidAmount : targetAmount,
          notes: isCash && rawUtr && rawUtr !== "CASH" && rawUtr !== "-" ? rawUtr : "",
        },
      ];
    }
  }

  // Event Breakdown (Current Event + Previous Events covered)
  const currentEvent =
    events.find((e) => String(e.eventId || e.id) === String(row.eventId)) || null;

  const currentEventName =
    row.eventName ||
    currentEvent?.eventName ||
    currentEvent?.title ||
    "Current Event";

  const resolvedEventType =
    row.eventTypeName ||
    row.eventType ||
    row.categoryName ||
    row.eventCategory ||
    currentEvent?.eventTypeName ||
    currentEvent?.eventType ||
    currentEvent?.categoryName ||
    currentEvent?.category ||
    "--";

  // Event Breakdown: Only multi-event arrears actually paid in an AllOutstanding transaction
  const isAllOutstanding =
    String(row.paymentScope || matchedTx?.paymentScope || "").toLowerCase() === "alloutstanding" ||
    rawNotes.toLowerCase().includes("[scope: alloutstanding]");

  const arrearItems =
    isAllOutstanding && actualPaidAmount > targetAmount
      ? (Array.isArray(matchedTx?.arrearBreakdown) && matchedTx.arrearBreakdown.length > 0
          ? matchedTx.arrearBreakdown
          : Array.isArray(row.arrearBreakdown) && row.arrearBreakdown.length > 0
          ? row.arrearBreakdown
          : [])
      : [];

  // Screenshots
  const rawScreenshots =
    row.screenshots ||
    matchedTx?.screenshots ||
    row.screenshot ||
    matchedTx?.screenshot;
  const screenshots = Array.isArray(rawScreenshots)
    ? rawScreenshots
    : rawScreenshots
    ? [rawScreenshots]
    : [];

  const handleCopyUtr = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  return (
    <>
      <AppDialog
        open={open}
        onClose={onClose}
        title="Contribution & Payment Details"
        maxWidth="md"
        fullWidth
        showCloseIcon
        actions={
          <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", alignItems: "center" }}>
            <AppCancelButton onClick={onClose}>Close</AppCancelButton>
          </Box>
        }
      >
        <Stack spacing={2.2} sx={{ pt: 0.5 }}>


          {/* ── Event & Contributor Details ── */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: "10px",
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.8 }}>
              <EventIcon sx={{ fontSize: 18, color: "primary.main" }} />
              Event & Contributor Details
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Member / Contributor
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {row.memberName || "Contributor"}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Name
                </Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {currentEventName}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Type
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {resolvedEventType}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Payment Date
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {row.paymentDate || matchedTx?.paymentDate || matchedTx?.createdOn
                    ? dayjs(row.paymentDate || matchedTx?.paymentDate || matchedTx?.createdOn).format("DD/MM/YYYY")
                    : (row.createdOn ? dayjs(row.createdOn).format("DD/MM/YYYY") : "--")}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Payment Method
                </Typography>
                <Box sx={{ mt: 0.4 }}>
                  {splitsList.length > 0 ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      {splitsList.map((split, idx) => {
                        const modeColor = getModeColor(split.mode);
                        return (
                          <Chip
                            key={idx}
                            label={`${split.mode}: ${formatWholeCurrency(split.amount || 0)}`}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              bgcolor: `${modeColor}18`,
                              color: modeColor,
                              border: `1px solid ${modeColor}40`,
                            }}
                          />
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" fontWeight={600}>
                      --
                    </Typography>
                  )}
                </Box>
              </Grid>

              {splitsList.some((s) => s.notes) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cash Handover Note
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {splitsList.find((s) => s.notes)?.notes}
                  </Typography>
                </Grid>
              )}

              {(row.paymentScope || matchedTx?.paymentScope) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Payment Scope
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="secondary.main">
                    {row.paymentScope || matchedTx?.paymentScope}
                  </Typography>
                </Grid>
              )}

              {row.createdBy && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Submitted / Recorded By
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {row.createdBy}
                  </Typography>
                </Grid>
              )}
            </Grid>

            {/* Event Scope Breakdown (if payment covered multiple events) */}
            {arrearItems.length > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed", borderColor: "divider" }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Scope Allocation Breakdown:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${currentEventName}: ${formatWholeCurrency(targetAmount)}`}
                    sx={{ fontWeight: 700 }}
                  />
                  {arrearItems.map((item, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      variant="outlined"
                      color="warning"
                      label={`${item.eventName || item.title || "Previous Event"}: ${formatWholeCurrency(item.amount || item.dueAmount || 0)}`}
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>

          {/* ── Authority Audit Remarks / Notes (From Image 3) ── */}
          {auditNotes && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: "10px",
                bgcolor: (t) =>
                  isRejected
                    ? t.palette.mode === "dark" ? "rgba(220, 38, 38, 0.15)" : "rgba(220, 38, 38, 0.08)"
                    : isVerified
                    ? t.palette.mode === "dark" ? "rgba(22, 163, 74, 0.15)" : "rgba(22, 163, 74, 0.08)"
                    : t.palette.mode === "dark" ? "rgba(74, 63, 107, 0.18)" : "rgba(74, 63, 107, 0.08)",
                border: "1.5px solid",
                borderColor: isRejected ? "#ef4444" : isVerified ? "#16a34a" : "#6366f1",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }} flexWrap="wrap" useFlexGap>
                {isRejected ? (
                  <RejectedIcon sx={{ fontSize: 18, color: "#ef4444" }} />
                ) : (
                  <AdminIcon sx={{ fontSize: 18, color: isVerified ? "#16a34a" : "#6366f1" }} />
                )}
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  color={isRejected ? "error.main" : isVerified ? "success.main" : "text.primary"}
                >
                  {isRejected ? "Rejection Reason / Remarks:" : "Audit Remarks / Notes:"}
                </Typography>
                {verifier && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    — Reviewed by {verifier}{verifyDateFormatted ? ` on ${verifyDateFormatted}` : ""}
                  </Typography>
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontSize: "0.92rem", fontWeight: 600, pl: 3.2, color: "text.primary" }}>
                "{auditNotes}"
              </Typography>
            </Paper>
          )}

          {/* ── Payment Proof Screenshots ── */}
          {screenshots.length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "10px",
              }}
            >
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.8 }}>
                <ReceiptIcon sx={{ fontSize: 18, color: "primary.main" }} />
                Attached Payment Receipts / Screenshots ({screenshots.length})
              </Typography>

              <Grid container spacing={1.5}>
                {screenshots.map((imgSrc, idx) => (
                  <Grid key={idx} size={{ xs: 6, sm: 4 }}>
                    <Box
                      onClick={() => setPreviewImage(imgSrc)}
                      sx={{
                        position: "relative",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1.5px solid",
                        borderColor: "divider",
                        height: 120,
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "primary.main",
                          "& .preview-overlay": { opacity: 1 },
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={imgSrc}
                        alt={`Receipt ${idx + 1}`}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <Box
                        className="preview-overlay"
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(0,0,0,0.45)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <ZoomInIcon sx={{ fontSize: 18 }} />
                          <Typography variant="caption" fontWeight={700}>
                            Preview
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Stack>
      </AppDialog>

      {/* ── Image Fullscreen Preview Modal ── */}
      <AppDialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Receipt Screenshot Preview"
        maxWidth="md"
        actions={
          <AppCancelButton onClick={() => setPreviewImage(null)}>
            Close Preview
          </AppCancelButton>
        }
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 1,
            maxHeight: "75vh",
            overflow: "auto",
          }}
        >
          <Box
            component="img"
            src={previewImage}
            alt="Payment Receipt Preview"
            sx={{
              maxWidth: "100%",
              maxHeight: "70vh",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          />
        </Box>
      </AppDialog>
    </>
  );
}
