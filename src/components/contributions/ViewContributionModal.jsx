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
import { getImageUrl } from "../../services/apiClient";

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
  allTransactions = [],
  events = [],
  onPay,
}) {
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  if (!row) return null;

  // Resolve status
  const rawStatus = String(row.paymentStatus || row.status || row.statusName || matchedTx?.status || "").toLowerCase().trim();
  const isRejected =
    rawStatus === "rejected" ||
    String(row.paymentStatus || "").toLowerCase() === "rejected" ||
    String(row.status || "").toLowerCase() === "rejected" ||
    String(row.statusName || "").toLowerCase() === "rejected" ||
    String(matchedTx?.status || "").toLowerCase() === "rejected";

  const isApproved =
    !isRejected &&
    (rawStatus === "approved" ||
      String(row.paymentStatus || "").toLowerCase() === "approved" ||
      String(row.status || "").toLowerCase() === "approved" ||
      String(row.statusName || "").toLowerCase() === "approved" ||
      String(matchedTx?.status || "").toLowerCase() === "approved" ||
      row.isApproved === true ||
      matchedTx?.isApproved === true);

  const isVerified =
    !isRejected &&
    !isApproved &&
    (row.isVerified === true ||
      rawStatus === "verified" ||
      String(row.paymentStatus || "").toLowerCase() === "verified" ||
      String(row.status || "").toLowerCase() === "verified" ||
      String(row.statusName || "").toLowerCase() === "verified" ||
      String(matchedTx?.status || "").toLowerCase() === "verified" ||
      Boolean(row.verifiedBy && String(row.verifiedBy).trim() !== ""));

  const isPaid =
    !isRejected &&
    (isApproved ||
      isVerified ||
      rawStatus === "paid" ||
      rawStatus === "2" ||
      row.paymentStatus === 2 ||
      String(row.paymentStatus || "").toLowerCase() === "paid" ||
      String(row.status || "").toLowerCase() === "paid" ||
      String(row.statusName || "").toLowerCase() === "paid" ||
      Number(row.paidAmount || 0) > 0 ||
      (matchedTx && Number(matchedTx.amount || 0) > 0));

  let displayStatus = "Pending";
  if (isRejected) displayStatus = "Rejected";
  else if (isApproved) displayStatus = "Approved";
  else if (isVerified) displayStatus = "Verified";
  else if (isPaid) displayStatus = "Paid";
  else displayStatus = "Not Paid";

  // Event info & financial metrics
  const currentEvent =
    (events || []).find((e) => String(e.eventId || e.id) === String(row.eventId)) || null;

  const eventBaseAmount = Number(
    currentEvent?.baseAmount ||
    currentEvent?.amount ||
    currentEvent?.contributionAmount ||
    0
  );

  const targetAmount = Number(row.amount || 0) > 0 ? Number(row.amount) : eventBaseAmount;
  const actualPaidAmount = Number(
    row.paidAmount ||
    matchedTx?.amount ||
    row.totalReceivedAmount ||
    (isPaid && targetAmount > 0 ? targetAmount : 0)
  );

  const arrears = Number(
    row.previousUnpaid || row.previousArrears || matchedTx?.previousArrears || row.previousAmount || 0
  );

  // Arrears breakdown list for rich hover tooltip
  const rawArrearsList =
    row.previousUnpaidItems ||
    row.arrearBreakdown ||
    matchedTx?.arrearBreakdown ||
    matchedTx?.previousUnpaidItems ||
    row.arrearsList ||
    [];

  let parsedArrearsList = [];
  if (Array.isArray(rawArrearsList)) {
    parsedArrearsList = rawArrearsList;
  } else if (typeof rawArrearsList === "string" && rawArrearsList.trim().startsWith("[")) {
    try {
      parsedArrearsList = JSON.parse(rawArrearsList);
    } catch {
      parsedArrearsList = [];
    }
  }

  const validArrearItems = parsedArrearsList.filter(
    (item) => Number(item?.amount || item?.dueAmount || item?.due || 0) > 0 || item?.eventName || item?.title
  );

  const getArrearItemName = (item) => {
    if (item?.eventName) return item.eventName;
    if (item?.title) return item.title;
    if (item?.eventCategory) return item.eventCategory;
    if (item?.name) return item.name;
    if (item?.eventId) {
      const ev = (events || []).find((e) => String(e.eventId || e.id) === String(item.eventId));
      if (ev?.eventName || ev?.title) return ev.eventName || ev.title;
    }
    return "Previous Event";
  };

  const getArrearItemAmount = (item) => {
    if (!item) return 0;
    const ev = (events || []).find((e) => String(e.eventId || e.id) === String(item.eventId));
    const evAmt = Number(ev?.baseAmount || ev?.amount || ev?.contributionAmount || 0);
    const itemAmt = Number(item.amount || item.dueAmount || item.due || 0);
    return itemAmt > 0 ? itemAmt : (evAmt > 0 ? evAmt : arrears);
  };

  const arrearsTooltipContent = validArrearItems.length > 0 ? (
    <Box sx={{ p: 0.8, minWidth: 180 }}>
      <Typography
        variant="caption"
        fontWeight={800}
        sx={{
          display: "block",
          color: "#f87171",
          mb: 0.6,
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          pb: 0.4,
          fontSize: "0.76rem",
          letterSpacing: "0.02em",
        }}
      >
        Unpaid Previous Events:
      </Typography>
      {validArrearItems.map((item, idx) => {
        const itemAmt = getArrearItemAmount(item);
        return (
          <Box
            key={idx}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1.5,
              fontSize: "0.74rem",
              py: 0.3,
            }}
          >
            <span style={{ color: "#e2e8f0" }}>• {getArrearItemName(item)}</span>
            <span style={{ fontWeight: 800, color: "#fff" }}>
              {formatWholeCurrency(itemAmt > 0 ? itemAmt : arrears)}
            </span>
          </Box>
        );
      })}
      <Box
        sx={{
          borderTop: "1px solid rgba(255,255,255,0.2)",
          mt: 0.6,
          pt: 0.4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 800,
          fontSize: "0.76rem",
          color: "#fca5a5",
        }}
      >
        <span>Total Arrears:</span>
        <span>{formatWholeCurrency(arrears)}</span>
      </Box>
    </Box>
  ) : arrears > 0 ? (
    <Box sx={{ p: 0.6, minWidth: 150 }}>
      <Typography variant="caption" fontWeight={700} sx={{ color: "#cbd5e1", display: "block" }}>
        Previous Pending Arrears:
      </Typography>
      <Typography variant="body2" fontWeight={800} sx={{ color: "#fca5a5", mt: 0.3 }}>
        {formatWholeCurrency(arrears)}
      </Typography>
    </Box>
  ) : (
    "No previous arrears"
  );

  const totalDue = isPaid && arrears === 0
    ? 0
    : Number(row.totalAccumulated ?? row.totalDue ?? Math.max(0, targetAmount + arrears - (isPaid ? actualPaidAmount : 0)));

  const balanceDue = totalDue > 0 ? totalDue : (isPaid ? 0 : targetAmount + arrears);

  const renderStatusBadge = (status) => {
    const st = String(status || displayStatus || "").toLowerCase().trim();
    let color = "#b45309";
    let bg = "rgba(234,179,8,0.12)";

    if (st === "approved" || isApproved) {
      color = "#16a34a";
      bg = "rgba(22,163,74,0.12)";
    } else if (st === "paid" || st === "verified" || st === "closed") {
      color = "#16a34a";
      bg = "rgba(22,163,74,0.12)";
    } else if (st === "in progress") {
      color = "#6366f1";
      bg = "rgba(99,102,241,0.12)";
    } else if (st === "failed" || st === "rejected") {
      color = "#dc2626";
      bg = "rgba(220,38,38,0.12)";
    }

    let label = "Not Paid (Pending)";
    if (st === "approved" || isApproved) label = "Approved";
    else if (st === "verified" || isVerified) label = "Verified";
    else if (st === "paid" || isPaid) label = "Paid";
    else if (st === "rejected" || isRejected) label = "Rejected";
    else if (st === "in progress") label = "In Progress";

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: bg,
          color: color,
          fontWeight: 800,
          fontSize: "0.76rem",
          height: 24,
          borderRadius: "6px",
        }}
      />
    );
  };

  // Authority Audit & Verification Details
  const verifier =
    row.verifiedBy ||
    matchedTx?.verifiedBy ||
    row.recordedBy ||
    matchedTx?.recordedBy ||
    (isApproved || isVerified ? "Authority Officer" : "");

  const verifyDateRaw = row.verifiedOn || row.verifiedDate || matchedTx?.verifiedOn || matchedTx?.verifiedDate;
  const verifyDateFormatted = verifyDateRaw ? dayjs(verifyDateRaw).format("DD/MM/YYYY") : "";

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

  // Helper to normalize payment method names
  const resolvePaymentMethodName = (modeRaw, utrRaw = "", notesRaw = "") => {
    if (modeRaw === 1 || modeRaw === "1") return "Cash";
    if (modeRaw === 5 || modeRaw === "5") return "Split";
    if (modeRaw === 3 || modeRaw === "3") return "Bank Transfer";
    if (modeRaw === 4 || modeRaw === "4") return "Card";

    const str = String(modeRaw || "").trim().toLowerCase();
    const utrStr = String(utrRaw || "").toLowerCase();
    const notesStr = String(notesRaw || "").toLowerCase();

    if (str.includes("split")) return "Split";
    if (str.includes("cash")) return "Cash";
    if (str.includes("gpay") || str.includes("google")) return "GPay";
    if (str.includes("phonepe") || str.includes("phone")) return "PhonePe";
    if (str.includes("paytm")) return "Paytm";
    if (str.includes("bank") || str.includes("transfer") || str.includes("neft") || str.includes("imps")) return "Bank Transfer";
    if (str.includes("card")) return "Card";

    if (str === "upi" || str === "online" || !str || str === "none" || str === "2" || str === "0") {
      if (utrStr.includes("phonepe") || notesStr.includes("phonepe") || notesStr.includes("phone pe")) return "Phonepe";
      if (utrStr.includes("cash") || notesStr.includes("cash")) return "Cash";
      return "Gpay";
    }

    return String(modeRaw || "Gpay").trim();
  };

  // Payment Mode and Breakdown parsing
  const rawMode = row.paymentMode || matchedTx?.paymentMode || "None";
  const rawUtr =
    row.utrNumber ||
    row.referenceNo ||
    row.utr ||
    row.txnNumber ||
    matchedTx?.utr ||
    matchedTx?.txnNumber ||
    matchedTx?.referenceNo ||
    matchedTx?.transactionRef ||
    "";

  // Parse structured splits or breakdown
  let splitsList = [];
  if (Array.isArray(matchedTx?.splits) && matchedTx.splits.length > 0) {
    splitsList = matchedTx.splits.map((s) => ({
      ...s,
      mode: resolvePaymentMethodName(s.mode || s.paymentMode, s.utr, s.notes),
      amount: Number(s.amount) || 0,
    }));
  } else if (Array.isArray(row.splits) && row.splits.length > 0) {
    splitsList = row.splits.map((s) => ({
      ...s,
      mode: resolvePaymentMethodName(s.mode || s.paymentMode, s.utr, s.notes),
      amount: Number(s.amount) || 0,
    }));
  } else if (Array.isArray(allTransactions) && allTransactions.length > 0) {
    const memberId = row.memberId || row.userId || matchedTx?.userId || matchedTx?.memberId;
    const memberName = String(row.memberName || matchedTx?.memberName || "").trim().toLowerCase();
    const eventId = row.eventId || matchedTx?.eventId;
    const eventName = String(row.eventName || matchedTx?.eventName || "").trim().toLowerCase();

    const relatedTxns = allTransactions.filter((t) => {
      const tMemberId = t.userId || t.memberId;
      const tMemberName = String(t.memberName || "").trim().toLowerCase();
      const mMatch =
        (memberId && tMemberId && String(memberId).toLowerCase() === String(tMemberId).toLowerCase()) ||
        (memberName && tMemberName && memberName === tMemberName);
      if (!mMatch) return false;

      const tEventId = t.eventId;
      const tEventName = String(t.eventName || "").trim().toLowerCase();
      if (eventId && tEventId) return String(eventId).toLowerCase() === String(tEventId).toLowerCase();
      return eventName && tEventName && eventName === tEventName;
    });

    if (relatedTxns.length > 1) {
      splitsList = relatedTxns.map((t) => ({
        id: t.txnNumber || t.id,
        mode: resolvePaymentMethodName(t.paymentMode, t.utr, t.notes),
        amount: Number(t.amount) || 0,
        utr: t.utr,
      }));
    }
  }

  if (splitsList.length === 0) {
    // Try to parse from notes "[Split Breakdown: Mode: ₹Amt (Ref: UTR), ...]"
    const match = rawNotes.match(/\[Split Breakdown:\s*([^\]]+)\]/);
    if (match && match[1]) {
      const items = match[1].split(",");
      splitsList = items.map((item, idx) => {
        const parts = item.trim().split(":");
        let mode = parts[0]?.trim() || `Mode ${idx + 1}`;
        mode = resolvePaymentMethodName(mode);
        const rest = parts.slice(1).join(":");
        const amtMatch = rest.match(/₹?([0-9.]+)/);
        const utrMatch = rest.match(/\(Ref:\s*([^)]+)\)/i) || rest.match(/\(UTR:\s*([^)]+)\)/i);
        return {
          mode,
          amount: amtMatch ? Number(amtMatch[1]) : 0,
          utr: utrMatch ? utrMatch[1].trim() : "",
        };
      });
    } else if (rawUtr && (rawUtr.includes(";") || (rawUtr.toLowerCase().includes("gpay") && rawUtr.toLowerCase().includes("phonepe")))) {
      const utrRegex = /(Gpay|Phonepe|Paytm|Cash|UPI)[\s:]+([A-Za-z0-9]+)/gi;
      let m;
      const extracted = [];
      while ((m = utrRegex.exec(rawUtr)) !== null) {
        extracted.push({
          mode: resolvePaymentMethodName(m[1]),
          utr: m[2],
          amount: 0,
        });
      }
      if (extracted.length > 1) {
        splitsList = extracted;
      }
    }
  }

  // Build distinct digital UTR items for each mode (e.g. GPay UTR and PhonePe UTR)
  const splitUtrMap = new Map();

  if (Array.isArray(allTransactions) && allTransactions.length > 0) {
    allTransactions.forEach((t) => {
      const m = resolvePaymentMethodName(t.paymentMode, t.utr, t.notes);
      const u = String(t.utr || t.transactionRef || t.referenceNo || "").trim();
      const isCash = m.toLowerCase().includes("cash");
      if (!isCash && u && u !== "-" && u !== "--" && u.toUpperCase() !== "SPLIT" && u.toUpperCase() !== "CASH") {
        if (!splitUtrMap.has(m)) {
          splitUtrMap.set(m, u);
        }
      }
    });
  }

  splitsList.forEach((s) => {
    const m = resolvePaymentMethodName(s.mode || s.paymentMode, s.utr, s.notes);
    const u = String(s.utr || s.referenceNo || s.transactionRef || "").trim();
    const isCash = m.toLowerCase().includes("cash");
    if (!isCash && u && u !== "-" && u !== "--" && u.toUpperCase() !== "SPLIT" && u.toUpperCase() !== "CASH") {
      if (!splitUtrMap.has(m)) {
        splitUtrMap.set(m, u);
      }
    }
  });

  const splitBreakdownMatch = rawNotes.match(/\[Split Breakdown:\s*([^\]]+)\]/i);
  if (splitBreakdownMatch && splitBreakdownMatch[1]) {
    const items = splitBreakdownMatch[1].split(",");
    items.forEach((item) => {
      const parts = item.trim().split(":");
      let m = parts[0]?.trim();
      m = resolvePaymentMethodName(m);
      const isCash = m.toLowerCase().includes("cash");
      if (!isCash) {
        const refMatch = item.match(/\(Ref:\s*([^)]+)\)/i) || item.match(/\(UTR:\s*([^)]+)\)/i);
        if (refMatch && refMatch[1]?.trim()) {
          const u = refMatch[1].trim();
          if (u && u !== "-" && u !== "--" && u.toUpperCase() !== "CASH") {
            if (!splitUtrMap.has(m)) {
              splitUtrMap.set(m, u);
            }
          }
        }
      }
    });
  }

  if (rawUtr) {
    const regex = /(Gpay|Phonepe|Paytm|UPI|Bank Transfer|Card)[\s:]+([A-Za-z0-9]+)/gi;
    let rm;
    while ((rm = regex.exec(rawUtr)) !== null) {
      const m = resolvePaymentMethodName(rm[1]);
      const u = rm[2].trim();
      if (!splitUtrMap.has(m) && u && u.toUpperCase() !== "CASH" && u.toUpperCase() !== "SPLIT") {
        splitUtrMap.set(m, u);
      }
    }
  }

  if (splitUtrMap.size === 0 && rawUtr && rawUtr !== "--" && rawUtr.toUpperCase() !== "SPLIT" && rawUtr.toUpperCase() !== "CASH") {
    const singleDigitalMode = singleMethodName && !singleMethodName.toLowerCase().includes("cash") ? singleMethodName : "Gpay";
    splitUtrMap.set(singleDigitalMode, rawUtr);
  }

  const splitUtrs = Array.from(splitUtrMap.entries()).map(([mode, utr]) => ({ mode, utr }));

  // Determine whether this is a split payment
  const isSplitPayment =
    splitsList.length > 1 ||
    Boolean(matchedTx?.isSplitGroup) ||
    Boolean(matchedTx?.parentTxnNumber) ||
    Boolean(matchedTx?.transactionGroupId) ||
    row.paymentMode === 5 ||
    row.paymentMode === "5" ||
    String(row.paymentMode || "").toLowerCase().includes("split") ||
    String(matchedTx?.paymentMode || "").toLowerCase().includes("split") ||
    (Number(row.cashAmount || 0) > 0 && Number(row.upiAmount || 0) > 0);

  const singleMethodName = resolvePaymentMethodName(rawMode, rawUtr, rawNotes);

  if (isSplitPayment && splitsList.length === 0) {
    const cashAmt = Number(row.cashAmount || matchedTx?.cashAmount || 0);
    const upiAmt = Number(row.upiAmount || matchedTx?.upiAmount || 0);
    if (cashAmt > 0 || upiAmt > 0) {
      if (cashAmt > 0) splitsList.push({ mode: "Cash", amount: cashAmt });
      if (upiAmt > 0) splitsList.push({ mode: resolvePaymentMethodName(matchedTx?.paymentMode || "Gpay", rawUtr, rawNotes), amount: upiAmt });
    }
  }

  // Extract clean Cash Handover Note dynamically (exclude system tags, show '--' if not entered)
  const getCleanCashNote = () => {
    // Dynamic audit/rejection filter: Collect known rejection reasons and audit remarks to exclude them
    const knownAuditTexts = [
      row.rejectionReason,
      matchedTx?.rejectionReason,
      row.auditRemarks,
      matchedTx?.auditRemarks,
      auditNotes,
    ]
      .filter((t) => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim().toLowerCase());

    const isAuditOrRejectionNote = (text) => {
      if (!text || typeof text !== "string") return true;
      const trimmed = text.trim();
      if (!trimmed || trimmed === "-" || trimmed === "--") return true;
      const lower = trimmed.toLowerCase();

      // Disqualify if it matches or is contained in any known audit / rejection note
      for (const audit of knownAuditTexts) {
        if (lower === audit) return true;
        if (audit.length >= 3 && (lower.includes(audit) || audit.includes(lower))) return true;
      }

      // Disqualify standard audit / review / status update prefixes
      if (
        /^(status updated|updated to|verified by|rejected by|reviewed by|rejected\b|verified\b)/i.test(lower)
      ) {
        return true;
      }

      // Disqualify system bracket metadata tags
      if (trimmed.startsWith("[") || trimmed.includes("Split Breakdown:") || trimmed.includes("Scope:")) {
        return true;
      }

      return false;
    };

    // 1. Check all notes sources for explicit [Cash Note: ...]
    const allNotesSources = [
      ...splitsList.map((s) => s.notes),
      matchedTx?.notes,
      row.notes,
      rawNotes,
      ...splitsList.map((s) => s.utr),
    ].filter((n) => typeof n === "string" && n.trim().length > 0);

    for (const raw of allNotesSources) {
      const match = raw.match(/\[Cash Note:\s*([^\]]+)\]/i);
      if (match && match[1]?.trim()) {
        const cleaned = match[1]
          .replace(/\[Scope:[^\]]+\]/gi, "")
          .replace(/\[Split Breakdown:[^\]]+\]/gi, "")
          .trim();
        if (cleaned && !isAuditOrRejectionNote(cleaned)) {
          return cleaned;
        }
      }
    }

    // 2. Check if a cash split item has an explicit custom note entered during submission
    const cashSplit = splitsList.find((s) =>
      String(s.mode || "").toLowerCase().includes("cash")
    );

    if (cashSplit) {
      const candidate = cashSplit.cashNote || cashSplit.notes;
      if (typeof candidate === "string" && candidate.trim()) {
        let cleaned = candidate
          .replace(/\[Scope:[^\]]+\]/gi, "")
          .replace(/\[Split Breakdown:[^\]]+\]/gi, "")
          .replace(/\[Cash Note:\s*([^\]]+)\]/gi, "$1")
          .replace(/Status updated to [^.]+(\.|$)/gi, "")
          .trim();

        if (
          cleaned &&
          cleaned.toUpperCase() !== "CASH" &&
          !isAuditOrRejectionNote(cleaned)
        ) {
          return cleaned;
        }
      }

      if (
        cashSplit.utr &&
        typeof cashSplit.utr === "string" &&
        cashSplit.utr.trim().toUpperCase() !== "CASH" &&
        cashSplit.utr.trim() !== "-" &&
        cashSplit.utr.trim() !== "--" &&
        !cashSplit.utr.includes(":") &&
        !isAuditOrRejectionNote(cashSplit.utr)
      ) {
        return cashSplit.utr.trim();
      }
    }

    // 3. For single Cash payment, check if rawUtr was entered as a cash handover note
    const isSingleCash = String(rawMode).toLowerCase().includes("cash") && !isSplitPayment;
    if (isSingleCash) {
      if (rawUtr && typeof rawUtr === "string") {
        const trimmedUtr = rawUtr.trim();
        if (
          trimmedUtr &&
          trimmedUtr.toUpperCase() !== "CASH" &&
          trimmedUtr !== "-" &&
          trimmedUtr !== "--" &&
          trimmedUtr !== "SPLIT" &&
          !trimmedUtr.includes(":") &&
          !isAuditOrRejectionNote(trimmedUtr)
        ) {
          return trimmedUtr;
        }
      }

      // Check if raw notes has an original user note that is NOT an audit/rejection note
      const cleanRawNotes = rawNotes
        .replace(/\[Scope:[^\]]+\]/gi, "")
        .replace(/\[Split Breakdown:[^\]]+\]/gi, "")
        .replace(/\[Cash Note:\s*([^\]]+)\]/gi, "$1")
        .trim();
      if (cleanRawNotes && cleanRawNotes.toUpperCase() !== "CASH" && !isAuditOrRejectionNote(cleanRawNotes)) {
        return cleanRawNotes;
      }
    }

    // Default to hyphen if no cash note was entered
    return "--";
  };

  const hasCashComponent =
    singleMethodName === "Cash" ||
    splitsList.some((s) => String(s.mode || "").toLowerCase().includes("cash")) ||
    Number(row.cashAmount || matchedTx?.cashAmount || 0) > 0;

  const cashHandoverNote = getCleanCashNote();

  // Event Breakdown (Current Event + Previous Events covered)
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

  // Screenshots resolution using getImageUrl and checking all sources
  const screenshots = (() => {
    const list = [];
    const seen = new Set();

    const addImg = (val) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(addImg);
        return;
      }
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed || trimmed === "-" || trimmed === "--" || trimmed === "null" || trimmed === "undefined") return;

        // Try parsing JSON array if string starts with '['
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              parsed.forEach(addImg);
              return;
            }
          } catch {
            // continue
          }
        }

        // Check for comma-separated URLs
        if (trimmed.includes(",") && !trimmed.startsWith("data:image")) {
          trimmed.split(",").forEach((part) => addImg(part.trim()));
          return;
        }

        const resolved = getImageUrl(trimmed);
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved);
          list.push(resolved);
        }
      }
    };

    // 1. Check row
    addImg(row?.screenshot);
    addImg(row?.screenshots);
    addImg(row?.receiptImage);
    addImg(row?.attachment);

    // 2. Check matchedTx
    addImg(matchedTx?.screenshot);
    addImg(matchedTx?.screenshots);
    addImg(matchedTx?.attachment);

    // 3. Check allTransactions matching this member + event
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      const rowMemId = String(row?.memberId || row?.userId || matchedTx?.userId || matchedTx?.memberId || "").trim().toLowerCase();
      const rowMemName = String(row?.memberName || matchedTx?.memberName || "").trim().toLowerCase();
      const rowEvId = String(row?.eventId || matchedTx?.eventId || "").trim().toLowerCase();
      const rowEvName = String(row?.eventName || matchedTx?.eventName || "").trim().toLowerCase();

      allTransactions.forEach((t) => {
        const tMemId = String(t.memberId || t.userId || "").trim().toLowerCase();
        const tMemName = String(t.memberName || "").trim().toLowerCase();
        const mMatch = (rowMemId && tMemId && rowMemId === tMemId) || (rowMemName && tMemName && rowMemName === tMemName);
        if (!mMatch) return;

        const tEvId = String(t.eventId || "").trim().toLowerCase();
        const tEvName = String(t.eventName || "").trim().toLowerCase();
        const evMatch = (rowEvId && tEvId && rowEvId === tEvId) || (rowEvName && tEvName && (rowEvName === tEvName || rowEvName.includes(tEvName) || tEvName.includes(rowEvName)));
        if (!evMatch) return;

        addImg(t.screenshot);
        addImg(t.screenshots);
        addImg(t.attachment);
      });
    }

    return list;
  })();

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
                  Event Type
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {resolvedEventType}
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
                  Payment Status
                </Typography>
                <Box sx={{ mt: 0.3 }}>
                  {renderStatusBadge(displayStatus)}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Contribution Amount
                </Typography>
                <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontSize: "0.95rem" }}>
                  {formatWholeCurrency(targetAmount)}
                </Typography>
              </Grid>


              {arrears > 0 && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    Previous Arrears
                  </Typography>
                  <Tooltip
                    title={arrearsTooltipContent}
                    arrow
                    enterDelay={100}
                    placement="top"
                    componentsProps={{
                      tooltip: {
                        sx: {
                          bgcolor: "#1e1b4b",
                          color: "#fff",
                          p: 1.2,
                          borderRadius: "8px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        },
                      },
                      arrow: {
                        sx: {
                          color: "#1e1b4b",
                        },
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color="warning.main"
                      sx={{
                        cursor: "help",
                        textDecoration: "underline dotted",
                        display: "inline-block",
                        fontSize: "0.95rem",
                      }}
                    >
                      {formatWholeCurrency(arrears)}
                    </Typography>
                  </Tooltip>
                </Grid>
              )}

              {balanceDue > 0 && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    Total Due / Balance
                  </Typography>
                  <Tooltip
                    title={
                      arrears > 0
                        ? `Total Balance Due: ${formatWholeCurrency(balanceDue)} (includes ${formatWholeCurrency(arrears)} previous arrears)`
                        : `Total Balance Due: ${formatWholeCurrency(balanceDue)}`
                    }
                    arrow
                    enterDelay={100}
                    placement="top"
                  >
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color="error.main"
                      sx={{
                        fontSize: "0.95rem",
                        cursor: arrears > 0 ? "help" : "default",
                        textDecoration: arrears > 0 ? "underline dotted" : "none",
                        display: "inline-block",
                      }}
                    >
                      {formatWholeCurrency(balanceDue)}
                    </Typography>
                  </Tooltip>
                </Grid>
              )}

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
                  {isSplitPayment ? (
                    <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip
                        label="Split"
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.78rem",
                          bgcolor: "rgba(99, 102, 241, 0.15)",
                          color: "#6366f1",
                          border: "1px solid rgba(99, 102, 241, 0.35)",
                        }}
                      />
                      {splitsList.map((split, idx) => {
                        const modeColor = getModeColor(split.mode);
                        const labelText = split.amount > 0
                          ? `${split.mode}: ${formatWholeCurrency(split.amount)}`
                          : split.mode;
                        return (
                          <Chip
                            key={idx}
                            label={labelText}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              bgcolor: `${modeColor}18`,
                              color: modeColor,
                              border: `1px solid ${modeColor}40`,
                            }}
                          />
                        );
                      })}
                    </Stack>
                  ) : (
                    <Chip
                      label={singleMethodName}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        bgcolor: `${getModeColor(singleMethodName)}18`,
                        color: getModeColor(singleMethodName),
                        border: `1px solid ${getModeColor(singleMethodName)}40`,
                      }}
                    />
                  )}
                </Box>
              </Grid>

              {hasCashComponent && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cash Handover Note
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {cashHandoverNote}
                  </Typography>
                </Grid>
              )}

              {splitUtrs.length > 0 && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ref / UTR Number
                  </Typography>
                  {splitUtrs.length > 1 ? (
                    <Box sx={{ mt: 0.3, display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {splitUtrs.map((item, idx) => {
                        const itemColor = getModeColor(item.mode);
                        return (
                          <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: itemColor, minWidth: 62, fontSize: "0.75rem" }}>
                              {item.mode}:
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              color="text.primary"
                              sx={{ fontSize: "0.82rem", fontFamily: "monospace", letterSpacing: "0.03em" }}
                            >
                              {item.utr}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ mt: 0.3, display: "flex", alignItems: "center", gap: 0.8 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: getModeColor(splitUtrs[0].mode), fontSize: "0.75rem" }}>
                        {splitUtrs[0].mode}:
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        color="text.primary"
                        sx={{ fontSize: "0.85rem", letterSpacing: "0.02em", wordBreak: "break-all" }}
                      >
                        {splitUtrs[0].utr}
                      </Typography>
                    </Box>
                  )}
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

              {(row.createdBy || row.submittedBy || matchedTx?.createdBy || matchedTx?.submittedBy) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Submitted By
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {row.createdBy || row.submittedBy || matchedTx?.createdBy || matchedTx?.submittedBy}
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
                  {isRejected ? "Rejection Reason " : "Audit Remarks / Notes:"}
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
                Attached Payment Receipts ({screenshots.length})
              </Typography>

              <Grid container spacing={1.5}>
                {screenshots.map((imgSrc, idx) => (
                  <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box
                      onClick={() => setPreviewImage(imgSrc)}
                      sx={{
                        position: "relative",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1.5px solid",
                        borderColor: "divider",
                        height: 180,
                        bgcolor: (t) => t.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
                          objectFit: "contain",
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
                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <ZoomInIcon sx={{ fontSize: 20 }} />
                          <Typography variant="caption" fontWeight={700}>
                            Click to Inspect
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
        title="Attached Payment Receipt Screenshot"
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
            p: 1.5,
            bgcolor: (t) => (t.palette.mode === "dark" ? "#090d16" : "#f1f5f9"),
            borderRadius: "8px",
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
              objectFit: "contain",
              borderRadius: "6px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            }}
          />
        </Box>
      </AppDialog>
    </>
  );
}
