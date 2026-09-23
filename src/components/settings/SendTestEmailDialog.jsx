import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppButton from "../common/AppButton";
import { useAppToast } from "../common/AppToast";
import {
  resolveCategoryTemplate,
  interpolatePlaceholders,
  sendTestEmail,
} from "../../services/emailReminderScheduler";
import {
  getPaymentQrConfig,
  generateDynamicPaymentQr,
} from "../../utils/upiQrHelper";

export default function SendTestEmailDialog({
  open,
  onClose,
  categoryOptions = [],
  initialCategoryId = "all",
}) {
  const theme = useTheme();
  const toast = useAppToast();
  const isDark = theme.palette.mode === "dark";

  const [recipientEmail, setRecipientEmail] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId || "all");
  const [templateType, setTemplateType] = useState("initial"); // "initial" | "reminder"
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoryId(initialCategoryId || "all");
      // Auto-fill from logged-in user if available
      try {
        const auth = sessionStorage.getItem("teamContributionAuth") || localStorage.getItem("teamContributionAuth");
        if (auth) {
          const parsed = JSON.parse(auth);
          if (parsed.email) setRecipientEmail(parsed.email);
        }
      } catch (e) {}
      if (!recipientEmail) {
        setRecipientEmail("admin@contribution.org");
      }
    }
  }, [open, initialCategoryId]);

  // Selected category name
  const currentCategoryOption = categoryOptions.find((c) => String(c.value) === String(categoryId));
  const categoryName = currentCategoryOption?.label?.replace(" (Default Template)", "") || "Birthday";

  // Resolve template
  const template = resolveCategoryTemplate(categoryId, categoryName, templateType);

  // Generate test dynamic data
  const qrConfig = getPaymentQrConfig();
  const testAmount = 500;
  const { upiUri, qrImageUrl, receiverName, upiId } = generateDynamicPaymentQr({
    amount: testAmount,
    note: `Test Contribution for ${categoryName}`,
    customConfig: qrConfig,
  });

  const previewData = {
    memberName: "Alex Morgan",
    categoryName,
    amount: testAmount,
    dueDate: "15th of this month",
    orgName: "Unit 1A Residents Association",
    paymentLink: upiUri,
    qrImageUrl,
  };

  const previewSubject = interpolatePlaceholders(template.subject, previewData);
  const previewDescription = interpolatePlaceholders(template.description, previewData);

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.trim() || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setSending(true);
    try {
      await sendTestEmail({
        recipientEmail: recipientEmail.trim(),
        categoryId,
        categoryName,
        templateType,
      });
      toast.success(`Test email for "${categoryName}" successfully dispatched to ${recipientEmail.trim()}!`);
      onClose();
    } catch (err) {
      console.error("Test email error:", err);
      toast.error("Failed to send test email. Please check your SMTP settings or network.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <EmailOutlinedIcon sx={{ color: "#0284c7" }} />
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1.05rem" }}>
            Send Test Email
          </Typography>
        </Box>
      }
      maxWidth="md"
      actions={
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <AppButton variant="outlined" onClick={onClose} color="inherit">
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendOutlinedIcon />}
            onClick={handleSend}
            disabled={sending}
            sx={{
              bgcolor: "#0284c7 !important",
              "&:hover": { bgcolor: "#0369a1 !important" },
              fontWeight: 700,
              px: 2.5,
            }}
          >
            {sending ? "Sending..." : "Dispatch Test Email"}
          </AppButton>
        </Box>
      }
    >
      <Stack spacing={2.2}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.76rem" }}>
          Verify and preview your Category-based email templates by dispatching a sample email with live dynamic placeholders and UPI QR code.
        </Typography>

        {/* Inputs */}
        <Stack spacing={2}>
          <AppInput
            label="Recipient Email Address"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="e.g. yourname@example.com"
            required
            fullWidth
          />

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <AppSelect
                label="Select Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categoryOptions}
                required
                fullWidth
              />
            </Box>

            <Box sx={{ minWidth: 240 }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: "text.secondary", mb: 0.6, display: "block" }}>
                Template Type
              </Typography>
              <ToggleButtonGroup
                value={templateType}
                exclusive
                onChange={(_, val) => val && setTemplateType(val)}
                size="small"
                sx={{
                  width: "100%",
                  "& .MuiToggleButton-root": {
                    flex: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    py: 0.7,
                    "&.Mui-selected": {
                      bgcolor: "#0284c7",
                      color: "#ffffff",
                      "&:hover": { bgcolor: "#0369a1" },
                    },
                  },
                }}
              >
                <ToggleButton value="initial">Initial Email</ToggleButton>
                <ToggleButton value="reminder">Reminder Email</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Stack>

        <Divider sx={{ my: 0.5 }} />

        {/* Live Visual Preview Card */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#0284c7" }} />
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: "0.84rem" }}>
              Live Email Preview ({templateType === "initial" ? "Initial Email" : "Reminder Email"})
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2.2,
              borderRadius: "12px",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
            }}
          >
            {/* Subject Preview */}
            <Box sx={{ mb: 1.5, pb: 1, borderBottom: `1px dashed ${theme.palette.divider}` }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: "text.secondary" }}>
                Subject:
              </Typography>
              <Typography variant="body2" fontWeight={800} sx={{ color: isDark ? "#ffffff" : "#0f172a", mt: 0.2 }}>
                {previewSubject}
              </Typography>
            </Box>

            {/* Description Preview */}
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-line",
                color: isDark ? "#cbd5e1" : "#334155",
                fontSize: "0.82rem",
                lineHeight: 1.6,
                mb: 2,
              }}
            >
              {previewDescription}
            </Typography>

            {/* QR Scanner & Amount Box in Preview */}
            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                border: `1px solid ${theme.palette.divider}`,
                textAlign: "center",
                maxWidth: 320,
                margin: "0 auto",
              }}
            >
              <Typography variant="caption" fontWeight={800} sx={{ color: "#0284c7", textTransform: "uppercase" }}>
                Pending Contribution: ₹{testAmount}
              </Typography>
              <Box sx={{ my: 1 }}>
                <img
                  src={qrImageUrl}
                  alt="Test QR"
                  width={140}
                  height={140}
                  style={{ display: "block", margin: "0 auto", borderRadius: "8px" }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                UPI ID: <strong>{upiId}</strong> ({receiverName})
              </Typography>
            </Box>
          </Box>
        </Box>
      </Stack>
    </AppDialog>
  );
}
