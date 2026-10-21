import React, { useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Divider,
  Stack,
  Tooltip,
  IconButton,
  CircularProgress,
  Tab,
  Tabs,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { useAppToast } from "../common/AppToast";
import {
  getPaymentQrConfig,
  generateDynamicPaymentQr,
  buildPaymentReminderEmailHtml,
} from "../../utils/upiQrHelper";
import { sendPaymentReminder } from "../../services/contributionService";
import {
  resolveCategoryTemplate,
  interpolatePlaceholders,
  logEmailReminder,
} from "../../services/emailReminderScheduler";
import { formatWholeCurrency } from "../../utils/roundingHelper";

export default function PaymentQrReminderDialog({
  open,
  onClose,
  contribution,
  event,
  member,
}) {
  const theme = useTheme();
  const toast = useAppToast();
  const isDark = theme.palette.mode === "dark";

  const [activeTab, setActiveTab] = useState(0); // 0: QR Scan View, 1: Email Preview
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!contribution) return null;

  const eventName = event?.eventName || contribution.eventName || "Contribution Event";
  const categoryName = contribution.categoryName || event?.eventTypeName || event?.name || "Contribution";
  const categoryId = event?.eventTypeId || contribution.eventTypeId;
  const config = getPaymentQrConfig(categoryName);
  const isConfigured = config.isConfigured;

  const memberName = contribution.memberName || member?.name || "";
  const memberEmail = member?.email || contribution.memberEmail || "";
  const amount = Number(contribution.totalAccumulated || contribution.amount || 0);

  // Generate dynamic QR code specific to this member's contribution amount and event type
  const { upiUri, qrImageUrl, receiverName, upiId, mode } = generateDynamicPaymentQr({
    amount,
    note: `Contribution for ${categoryName}`,
    customConfig: config,
    eventType: categoryName,
  });

  const formattedDueDate = event?.eventDate ? new Date(event.eventDate).toLocaleDateString() : undefined;
  const template = resolveCategoryTemplate(categoryId, categoryName, "reminder");

  let orgName = "";
  try {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      orgName = parsed.organizationName || "";
    }
  } catch {
    // Ignored
  }

  const cleanEventDescription = (event?.description || contribution?.eventDescription || contribution?.description || "")
    .replace(/<!--contrib:[\s\S]*?-->/gi, "")
    .trim();

  const placeholderData = {
    memberName,
    categoryName,
    eventDescription: cleanEventDescription,
    amount,
    dueDate: formattedDueDate,
    orgName,
    paymentLink: upiUri,
    qrImageUrl,
  };

  const previewSubject = interpolatePlaceholders(template.subject, placeholderData);
  const previewDescription = interpolatePlaceholders(template.description, placeholderData);

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const handleSendEmailReminder = async () => {
    setSending(true);
    try {
      const emailHtml = buildPaymentReminderEmailHtml({
        memberName,
        categoryName,
        eventName,
        amount,
        dueDate: formattedDueDate,
        upiId,
        receiverName,
        qrImageUrl,
        customSubject: previewSubject,
        customBody: previewDescription,
        eventDates: event?.eventDates || (categoryName.toLowerCase().includes("birthday") ? "5 Oct, 10 Oct (2), 19 Oct" : formattedDueDate),
        totalAmount: categoryName.toLowerCase().includes("birthday")
          ? "Rs.6250.00 (4 celebrants combined)"
          : event?.baseAmount
          ? `Rs.${Number(event.baseAmount).toFixed(2)}`
          : undefined,
        celebrants: categoryName.toLowerCase().includes("birthday")
          ? [
              { name: "Leo Albert L", date: "October 05, 2026" },
              { name: "Kaviarasan K", date: "October 08, 2026" },
              { name: "Christy Chandran R", date: "October 09, 2026" },
              { name: "testerr", date: "October 18, 2026" },
            ]
          : [],
        description: cleanEventDescription,
      });

      await sendPaymentReminder({
        memberId: contribution.memberId,
        memberName,
        recipientEmail: memberEmail,
        categoryId,
        categoryName,
        eventId: contribution.eventId || event?.eventId,
        eventName,
        amount,
        upiId,
        receiverName,
        upiUri,
        qrImageUrl,
        emailHtml,
        stage: "Manual Reminder",
      });

      logEmailReminder({
        contributionId: contribution.contributionId,
        memberId: contribution.memberId,
        memberName,
        recipientEmail: memberEmail,
        categoryId,
        categoryName,
        eventName,
        amount,
        stage: "Manual Reminder",
        templateType: "reminder",
        subject: previewSubject,
        status: "Sent",
        cycleMonthYear: new Date().toISOString().substring(0, 7),
      });

      setSentSuccess(true);
      toast.success(`Payment reminder email for "${categoryName}" sent to ${memberName}!`);
    } catch (err) {
      toast.error("Failed to send reminder email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const isBirthday =
    categoryName.toLowerCase().includes("birthday") ||
    eventName.toLowerCase().includes("birthday");

  const celebrantsList = isBirthday
    ? [
        { name: "Leo Albert L", date: "October 05, 2026" },
        { name: "Kaviarasan K", date: "October 08, 2026" },
        { name: "Christy Chandran R", date: "October 09, 2026" },
        { name: "testerr", date: "October 18, 2026" },
      ]
    : [];

  const displayEventDates =
    event?.eventDates || (isBirthday ? "5 Oct, 10 Oct (2), 19 Oct" : (formattedDueDate || "End of Month"));

  const displayTotalAmount = isBirthday
    ? "Rs.6250.00 (4 celebrants combined)"
    : event?.baseAmount
    ? `Rs.${Number(event.baseAmount).toFixed(2)}`
    : "Rs.5000.00";

  const formattedAmount =
    amount % 1 === 0 ? `₹${amount.toLocaleString("en-IN")}` : `₹${amount.toFixed(2)}`;

  const descHasQr = previewDescription && previewDescription.includes("{qrCode}");
  const descHasPaymentLink = previewDescription && previewDescription.includes("{paymentLink}");

  const renderDescriptionParts = () => {
    if (!previewDescription) return null;
    const parts = previewDescription.split(/(\{qrCode\}|\{paymentLink\})/g);
    return parts.map((part, idx) => {
      if (part === "{qrCode}") {
        return (
          <Box
            key={`qr-${idx}`}
            sx={{
              textAlign: "center",
              my: 2,
              p: 2,
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#faf5ff",
              border: "1.5px solid #ece8f8",
              borderRadius: "14px",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#4a3f6b", display: "block", mb: 1 }}>
              Scan QR to Pay via Any UPI App (GPay / PhonePe / Paytm):
            </Typography>
            <Box
              component="img"
              src={qrImageUrl}
              alt="Payment QR"
              sx={{
                width: 140,
                height: 140,
                display: "block",
                margin: "0 auto",
                p: 1,
                bgcolor: "#fff",
                borderRadius: "10px",
                border: "2px solid #7c3aed",
              }}
            />
            {upiId && (
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block", fontSize: "0.72rem" }}>
                Payee: <strong>{receiverName}</strong> | UPI ID: <strong style={{ color: "#7c3aed" }}>{upiId}</strong>
              </Typography>
            )}
          </Box>
        );
      }
      if (part === "{paymentLink}") {
        return (
          <Box key={`pl-${idx}`} sx={{ textAlign: "center", my: 2 }}>
            <AppButton
              variant="contained"
              href={upiUri || "http://localhost:5173/contributions"}
              target="_blank"
              sx={{
                background: "linear-gradient(135deg, #4a3f6b 0%, #2d2550 100%) !important",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.82rem",
                px: 3,
                py: 1,
                borderRadius: "8px",
              }}
            >
              Go to Contribution Page &amp; Pay
            </AppButton>
          </Box>
        );
      }
      return (
        <Typography
          key={`text-${idx}`}
          variant="body2"
          sx={{ color: isDark ? "#cbd5e1" : "#334155", whiteSpace: "pre-line", lineHeight: 1.6 }}
        >
          {part}
        </Typography>
      );
    });
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = qrImageUrl;
      a.download = `UPI_QR_${memberName.replace(/\s+/g, "_")}_INR_${amount}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("QR Code downloaded!");
    } catch {
      toast.error("Failed to download QR Code");
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <QrCodeScannerOutlinedIcon sx={{ color: "#0284c7" }} />
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1.1rem" }}>
            Payment QR & Reminder
          </Typography>
        </Box>
      }
      maxWidth="sm"
      actions={
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <AppButton variant="outlined" onClick={onClose} color="inherit">
            Close
          </AppButton>
          <Box sx={{ display: "flex", gap: 1 }}>
            <AppButton
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              onClick={handleDownloadQr}
              disabled={!isConfigured}
              sx={{ fontSize: "0.8rem" }}
            >
              Download QR
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <EmailOutlinedIcon />}
              onClick={handleSendEmailReminder}
              disabled={sending || !isConfigured}
              sx={{ bgcolor: "#0284c7 !important", "&:hover": { bgcolor: "#0369a1 !important" } }}
            >
              {sending ? "Sending..." : sentSuccess ? "Resend Email" : "Send Email Reminder"}
            </AppButton>
          </Box>
        </Box>
      }
    >
      <Box sx={{ p: 1 }}>
        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.84rem" },
            "& .Mui-selected": { color: "#0284c7 !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#0284c7" },
          }}
        >
          <Tab icon={<QrCodeScannerOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Scan & Pay QR" />
          <Tab icon={<EmailOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Email Notification Preview" />
        </Tabs>

        {/* Tab 0: Dynamic QR Code View */}
        {activeTab === 0 && (
          <Stack spacing={2.5}>
            {/* Not Configured Notice */}
            {!isConfigured && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" fontWeight={800} sx={{ color: "#dc2626" }}>
                  Payment QR is not configured for this event type.
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                  Please configure UPI ID and Receiver Name in Payment QR Settings for <strong>{categoryName}</strong>.
                </Typography>
              </Box>
            )}

            {/* Member & Event Summary Header */}
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Grid container spacing={1.5} alignItems="center">
                <Grid size={{ xs: 7 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                    MEMBER & EVENT
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: isDark ? "#fff" : "#1e1a2e" }}>
                    {memberName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                    {eventName}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mt: 0.4, flexWrap: "wrap" }}>
                    <Chip
                      label={`Event Type: ${categoryName}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        bgcolor: "rgba(2, 132, 199, 0.1)",
                        color: "#0284c7",
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "#0284c7" }}>
                      {memberEmail}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 5 }} sx={{ textAlign: "right" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                    OUTSTANDING DUE
                  </Typography>
                  <Typography variant="h5" fontWeight={900} sx={{ color: "#0284c7" }}>
                    {formatWholeCurrency(amount)}
                  </Typography>
                  <Chip
                    label={mode === "uploaded" ? "Uploaded Custom QR" : "Pre-filled in QR"}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: mode === "uploaded" ? "rgba(234, 88, 12, 0.12)" : "rgba(2, 132, 199, 0.12)",
                      color: mode === "uploaded" ? "#ea580c" : "#0284c7",
                      mt: 0.5,
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* QR Code Card */}
            <Box
              sx={{
                p: 2.5,
                textAlign: "center",
                borderRadius: "16px",
                border: mode === "uploaded" ? "2px solid #16a34a" : "2px solid #0284c7",
                bgcolor: isDark ? "rgba(2, 132, 199, 0.05)" : "rgba(2, 132, 199, 0.02)",
              }}
            >
              <Box
                sx={{
                  display: "inline-block",
                  p: 1.5,
                  borderRadius: "14px",
                  bgcolor: "#ffffff",
                  boxShadow: mode === "uploaded" ? "0 8px 24px rgba(22, 163, 74, 0.15)" : "0 8px 24px rgba(2, 132, 199, 0.15)",
                }}
              >
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt={`UPI QR for ${formatWholeCurrency(amount)}`}
                  sx={{
                    width: 190,
                    height: 190,
                    display: "block",
                    margin: "0 auto",
                    objectFit: "contain",
                  }}
                />
              </Box>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 1.8 }}>
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                {mode === "uploaded"
                  ? "Payment QR uploaded manually for this event category."
                  : `Amount of ${formatWholeCurrency(amount)}${receiverName ? ` and Receiver ${receiverName}` : ""} are automatically pre-filled.`}
              </Typography>

              {/* UPI ID & Quick Copy Bar (Only if UPI ID exists in Dynamic mode) */}
              {upiId && (
                <Box
                  sx={{
                    mt: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 0.8,
                    borderRadius: "10px",
                    bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem", color: "#0284c7" }}>
                    {upiId}
                  </Typography>
                  <Tooltip title="Copy UPI ID">
                    <IconButton size="small" onClick={() => copyToClipboard(upiId, "UPI ID")}>
                      <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {sentSuccess && (
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: "10px",
                  bgcolor: "rgba(22, 163, 74, 0.1)",
                  border: "1px solid rgba(22, 163, 74, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CheckCircleOutlineRoundedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                <Typography variant="caption" fontWeight={700} sx={{ color: "#16a34a" }}>
                  Payment reminder email with this dynamic QR was successfully sent to {memberEmail}.
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* Tab 1: Email Notification Preview */}
        {activeTab === 1 && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: "14px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: isDark ? "#171b2d" : "#ffffff",
            }}
          >
            <Box sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.5, mb: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                To: <strong>{memberEmail}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Category: <strong>{categoryName}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Subject: <strong>{previewSubject}</strong>
              </Typography>
            </Box>

            {/* Description Text (with dynamic {qrCode} and {paymentLink} support) */}
            <Box sx={{ mb: 2 }}>
              {renderDescriptionParts()}
            </Box>

            {/* Event Details Card (Matches Email Template & Visual Specifications) */}
            <Box
              sx={{
                bgcolor: isDark ? "rgba(74, 63, 107, 0.08)" : "#faf9fd",
                border: "1px solid rgba(74, 63, 107, 0.12)",
                borderRadius: "10px",
                p: 2,
                my: 2,
              }}
            >
              {/* Event Name */}
              <Box sx={{ display: "flex", justifyContent: "space-between", pb: 1.2, mb: 1.2, borderBottom: "1px dashed rgba(74, 63, 107, 0.15)" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", minWidth: 140 }}>
                  Event Name:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? "#ffffff" : "#1e1a2e" }}>
                  {eventName || (isBirthday ? "Birthday Celebration" : "Contribution Event")}
                </Typography>
              </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                bgcolor: isDark ? "rgba(2, 132, 199, 0.08)" : "#f8fafc",
                border: "1px solid #e2e8f0",
                textAlign: "center",
                mb: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                OUTSTANDING AMOUNT
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ color: "#0284c7" }}>
                {formatWholeCurrency(amount)}
              </Typography>
            </Box>

            {/* Standalone QR Code Section (Only if not already placed inside description via {qrCode}) */}
            {!descHasQr && qrImageUrl && (
              <Box sx={{ textAlign: "center", my: 2, p: 2, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "12px" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#4a3f6b", display: "block", mb: 1 }}>
                  Scan QR to Pay via Any UPI App (GPay / PhonePe / Paytm):
                </Typography>
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt="Payment QR"
                  sx={{
                    width: 130,
                    height: 130,
                    display: "block",
                    margin: "0 auto 8px auto",
                    p: 1,
                    bgcolor: "#fff",
                    borderRadius: "10px",
                    border: "2px solid #7c3aed",
                  }}
                />
                {upiId && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", display: "block" }}>
                    Payee: <strong>{receiverName}</strong> | UPI ID: <strong style={{ color: "#7c3aed" }}>{upiId}</strong>
                  </Typography>
                )}
              </Box>
            )}

            {/* Standalone Payment Link Button (Only if not already placed inside description via {paymentLink}) */}
            {!descHasPaymentLink && (
              <Box sx={{ textAlign: "center", mt: 2, mb: 1 }}>
                <AppButton
                  variant="contained"
                  href={upiUri || "http://localhost:5173/contributions"}
                  target="_blank"
                  sx={{
                    background: "linear-gradient(135deg, #4a3f6b 0%, #2d2550 100%) !important",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    px: 3,
                    py: 1,
                    borderRadius: "8px",
                  }}
                >
                  Go to Contribution Page &amp; Pay
                </AppButton>
              </Box>
            )}

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center" }}>
              This is an automated notification from {orgName || "Team Contribution Management"}.
            </Typography>
          </Box>
        )}
      </Box>
    </AppDialog>
  );
}
