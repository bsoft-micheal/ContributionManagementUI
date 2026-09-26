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

  const placeholderData = {
    memberName,
    categoryName,
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
                    ₹{amount.toLocaleString("en-IN")}
                  </Typography>
                  <Chip
                    label="Pre-filled in QR"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: "rgba(2, 132, 199, 0.12)",
                      color: "#0284c7",
                      mt: 0.5,
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Dynamic QR Code Card */}
            <Box
              sx={{
                p: 2.5,
                textAlign: "center",
                borderRadius: "16px",
                border: "2px solid #0284c7",
                bgcolor: isDark ? "rgba(2, 132, 199, 0.05)" : "rgba(2, 132, 199, 0.02)",
              }}
            >
              <Box
                sx={{
                  display: "inline-block",
                  p: 1.5,
                  borderRadius: "14px",
                  bgcolor: "#ffffff",
                  boxShadow: "0 8px 24px rgba(2, 132, 199, 0.15)",
                }}
              >
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt={`UPI QR for ₹${amount}`}
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
                Amount of <strong>₹{amount.toLocaleString("en-IN")}</strong> and Receiver <strong>{receiverName}</strong> are automatically pre-filled.
              </Typography>

              {/* UPI ID & Quick Copy Bar */}
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

            <Typography variant="body2" sx={{ color: isDark ? "#cbd5e1" : "#334155", mb: 2, whiteSpace: "pre-line", lineHeight: 1.6 }}>
              {previewDescription}
            </Typography>

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
                ₹{amount.toLocaleString("en-IN")}
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Box
                component="img"
                src={qrImageUrl}
                alt="Payment QR"
                sx={{
                  width: 140,
                  height: 140,
                  display: "block",
                  margin: "0 auto 8px auto",
                  p: 1,
                  bgcolor: "#fff",
                  borderRadius: "10px",
                  border: "1.5px solid #0284c7",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Scan via Google Pay, PhonePe, or Paytm
              </Typography>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center" }}>
              Payee: <strong>{receiverName}</strong> | UPI ID: <strong>{upiId}</strong>
            </Typography>
          </Box>
        )}
      </Box>
    </AppDialog>
  );
}
