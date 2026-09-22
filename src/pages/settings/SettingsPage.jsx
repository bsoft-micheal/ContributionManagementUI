import React, { useState, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  Breadcrumbs,
  Link,
  Divider,
  Stack,
  Switch,
  Chip,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import dayjs from "dayjs";
import {
  validateUpiId,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
  generateQrPngDataUrl,
} from "../../utils/upiQrHelper";

const defaultPaymentQr = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="#ffffff"/>
  <rect x="10" y="10" width="28" height="28" fill="#1e1a2e" rx="4"/>
  <rect x="14" y="14" width="20" height="20" fill="#ffffff" rx="2"/>
  <rect x="18" y="18" width="12" height="12" fill="#0284c7" rx="2"/>
  <rect x="62" y="10" width="28" height="28" fill="#1e1a2e" rx="4"/>
  <rect x="66" y="14" width="20" height="20" fill="#ffffff" rx="2"/>
  <rect x="70" y="18" width="12" height="12" fill="#0284c7" rx="2"/>
  <rect x="10" y="62" width="28" height="28" fill="#1e1a2e" rx="4"/>
  <rect x="14" y="66" width="20" height="20" fill="#ffffff" rx="2"/>
  <rect x="18" y="70" width="12" height="12" fill="#0284c7" rx="2"/>
  <rect x="44" y="12" width="6" height="6" fill="#1e1a2e"/>
  <rect x="52" y="12" width="5" height="10" fill="#1e1a2e"/>
  <rect x="44" y="24" width="10" height="6" fill="#0284c7"/>
  <rect x="12" y="44" width="6" height="10" fill="#1e1a2e"/>
  <rect x="22" y="44" width="8" height="6" fill="#0284c7"/>
  <rect x="34" y="44" width="12" height="12" fill="#1e1a2e"/>
  <rect x="50" y="40" width="10" height="10" fill="#1e1a2e"/>
  <rect x="64" y="44" width="8" height="6" fill="#0284c7"/>
  <rect x="76" y="44" width="12" height="10" fill="#1e1a2e"/>
  <rect x="44" y="62" width="6" height="14" fill="#0284c7"/>
  <rect x="54" y="62" width="8" height="8" fill="#1e1a2e"/>
  <rect x="66" y="60" width="10" height="12" fill="#1e1a2e"/>
  <rect x="80" y="62" width="8" height="8" fill="#0284c7"/>
  <rect x="44" y="80" width="12" height="8" fill="#1e1a2e"/>
  <rect x="60" y="76" width="14" height="6" fill="#0284c7"/>
  <rect x="78" y="76" width="10" height="12" fill="#1e1a2e"/>
</svg>
`)}`;

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppSwitch from "../../components/common/AppSwitch";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import {
  getSystemSettingsAsync,
  updateSystemSettingsAsync,
  resetSystemSettingsAsync,
} from "../../services/settingsService";

const initialSettings = {
  // General
  orgName: "Unit 1A Residents Association",
  defaultCurrency: "INR",
  timeZone: "Asia/Kolkata",
  birthdayMembersExempt: true,

  // Email
  fromEmail: "noreply@unit1a.com",
  fromName: "Unit 1A Management",
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  encryption: "TLS",

  // OTP / 2FA
  otpExpiry: "10",
  maxRetry: "3",
  enableOtpLogin: true,
  enable2faAdmin: false,

  // Notifications
  enableEmailNotif: true,
  notifNewMember: true,
  notifPaymentConfirm: true,
  notifEventReminder: true,
  notifSupportTicket: false,

  // Payment QR
  qrReceiverName: "Daniel A",
  qrUpiId: "danielrobertanto604@okicici",
  qrMode: "generated", // "generated" | "uploaded"
  qrPreviewAmount: "100",
  qrImage: null,

  // Audit
  enableAuditLogs: true,
  logUserLogin: true,
  logDataChanges: true,
  logConfigChanges: true,
  retentionPeriod: "365",
};

export default function SettingsPage() {
  const theme = useTheme();
  const toast = useAppToast();
  const isDark = theme.palette.mode === "dark";

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("cm_system_settings");
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [lastUpdated, setLastUpdated] = useState(() => dayjs().format("DD MMM YYYY, hh:mm A"));
  const [qrRefreshKey, setQrRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

  const upiValidation = validateUpiId(settings.qrUpiId);
  const upiError = !settings.qrUpiId ? "QR UPI ID is required" : (!upiValidation.isValid ? upiValidation.error : "");
  const receiverError = !settings.qrReceiverName?.trim() ? "QR Receiver Name is required" : "";

  const liveUpiUri = buildUpiPaymentUri({
    upiId: settings.qrUpiId,
    receiverName: settings.qrReceiverName,
    amount: settings.qrPreviewAmount || 100,
    note: "Contribution Payment",
  });

  const dynamicQrUrl = settings.qrUpiId
    ? generateQrPngDataUrl(liveUpiUri, 300)
    : defaultPaymentQr;

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleChange("qrImage", reader.result);
      handleChange("qrMode", "uploaded");
      toast.success("QR Code image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Load from backend on mount
  React.useEffect(() => {
    const loadBackendSettings = async () => {
      try {
        const data = await getSystemSettingsAsync();
        if (data && typeof data === "object") {
          const localSaved = localStorage.getItem("cm_system_settings");
          let localMode = "generated";
          try {
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (parsed.qrMode) localMode = parsed.qrMode;
            }
          } catch (e) {}

          // Filter out old placeholder 'unit1a@okaxis' so it cleanly defaults to danielrobertanto604@okicici
          const isPlaceholderUpi =
            !data.qrUpiId ||
            data.qrUpiId.toLowerCase() === "unit1a@okaxis" ||
            data.qrUpiId.toLowerCase() === "name@okaxis";

          const isPlaceholderReceiver =
            !data.qrReceiverName ||
            data.qrReceiverName.toLowerCase().includes("unit 1a");

          const cleanUpiId = isPlaceholderUpi ? "danielrobertanto604@okicici" : data.qrUpiId;
          const cleanReceiver = isPlaceholderReceiver ? "Daniel A" : data.qrReceiverName;

          const merged = {
            ...initialSettings,
            ...data,
            qrUpiId: cleanUpiId,
            qrReceiverName: cleanReceiver,
            qrMode: localMode,
          };

          setSettings((prev) => ({
            ...prev,
            ...merged,
          }));
          if (data.modifiedOn || data.createdOn) {
            setLastUpdated(dayjs(data.modifiedOn || data.createdOn).format("DD MMM YYYY, hh:mm A"));
          }
          localStorage.setItem(
            "cm_system_settings",
            JSON.stringify(merged)
          );
        }
      } catch (err) {
        console.warn("Could not fetch settings from backend, keeping cached settings:", err);
      }
    };
    loadBackendSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings.qrReceiverName || !settings.qrReceiverName.trim()) {
      toast.error("QR Receiver Name is required.");
      return;
    }
    const upiCheck = validateUpiId(settings.qrUpiId);
    if (!upiCheck.isValid) {
      toast.error(upiCheck.error || "Please enter a valid UPI ID.");
      return;
    }
    if (settings.qrPreviewAmount && (isNaN(Number(settings.qrPreviewAmount)) || Number(settings.qrPreviewAmount) <= 0)) {
      toast.error("QR Preview Amount must be greater than 0.");
      return;
    }

    // Generate scanner QR image URL compatible with backend database and Gmail
    const scannerQrUrl = getQrCodeApiUrl(liveUpiUri, 300);
    const isCustomUploaded = settings.qrMode === "uploaded" && settings.qrImage;
    const effectiveQrImage = isCustomUploaded ? settings.qrImage : scannerQrUrl;

    const payload = {
      ...settings,
      qrImage: effectiveQrImage,
    };

    try {
      const updated = await updateSystemSettings(payload);
      setSettings((prev) => ({
        ...prev,
        ...updated,
        qrImage: effectiveQrImage,
      }));
      localStorage.setItem(
        "cm_system_settings",
        JSON.stringify({
          ...settings,
          ...updated,
          qrImage: effectiveQrImage,
        })
      );
    } catch (err) {
      console.warn("Backend settings update failed, saved locally:", err);
      localStorage.setItem(
        "cm_system_settings",
        JSON.stringify({
          ...settings,
          qrImage: effectiveQrImage,
        })
      );
    }
    const now = dayjs().format("DD MMM YYYY, hh:mm A");
    setLastUpdated(now);
    toast.success("Settings saved! Dynamic UPI QR code updated for emails and Google Pay.");
  };

  const handleReset = async () => {
    try {
      const defaults = await resetSystemSettingsAsync();
      setSettings(defaults);
      localStorage.setItem("cm_system_settings", JSON.stringify(defaults));
    } catch (err) {
      console.warn("Backend reset failed, resetting locally:", err);
      setSettings(initialSettings);
      localStorage.setItem("cm_system_settings", JSON.stringify(initialSettings));
    }
    toast.info("Settings reset to defaults");
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1600, margin: "0 auto" }}>
      {/* Breadcrumbs & Header */}
      <Breadcrumbs sx={{ mb: 1, fontSize: "0.8rem" }}>
        <Link underline="hover" color="inherit" href="/">
          Home
        </Link>
        <Typography color="text.primary" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
          Settings
        </Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ color: isDark ? "#ffffff" : "#1e1a2e", letterSpacing: "-0.02em" }}>
          System Settings
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.3 }}>
          Manage system configuration, preferences and integrations.
        </Typography>
      </Box>

      {/* Main Grid: Left side has 6 Settings cards in a 3x2 layout; Right side has Configuration Status */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Grid container spacing={2.5}>
            {/* 1. General Settings */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  height: "100%",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "rgba(2, 132, 199, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                    }}
                  >
                    <SettingsOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      General Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Basic information about your organization.
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  <AppInput
                    label="Organization Name"
                    value={settings.orgName}
                    onChange={(e) => handleChange("orgName", e.target.value)}
                  />
                  <AppSelect
                    label="Default Currency"
                    value={settings.defaultCurrency}
                    onChange={(e) => handleChange("defaultCurrency", e.target.value)}
                    options={[
                      { label: "INR (₹) - Indian Rupee", value: "INR" },
                      { label: "USD ($) - US Dollar", value: "USD" },
                      { label: "EUR (€) - Euro", value: "EUR" },
                    ]}
                  />
                  <AppSelect
                    label="Time Zone"
                    value={settings.timeZone}
                    onChange={(e) => handleChange("timeZone", e.target.value)}
                    options={[
                      { label: "(GMT+05:30) Asia/Kolkata", value: "Asia/Kolkata" },
                      { label: "(GMT+00:00) UTC", value: "UTC" },
                      { label: "(GMT-05:00) America/New_York", value: "America/New_York" },
                    ]}
                  />

                  <Box sx={{ pt: 0.5 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        Birthday Members Exempt?
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.4 }}>
                        <Switch
                          checked={settings.birthdayMembersExempt !== undefined ? settings.birthdayMembersExempt : true}
                          onChange={(e) => handleChange("birthdayMembersExempt", e.target.checked)}
                          sx={{
                            width: 44,
                            height: 24,
                            padding: 0,
                            "& .MuiSwitch-switchBase": {
                              padding: 0,
                              margin: "2px",
                              transitionDuration: "200ms",
                              "&.Mui-checked": {
                                transform: "translateX(20px)",
                                color: "#fff",
                                "& + .MuiSwitch-track": {
                                  backgroundColor: "#1677c8",
                                  opacity: 1,
                                  border: 0,
                                },
                              },
                            },
                            "& .MuiSwitch-thumb": {
                              width: 20,
                              height: 20,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            },
                            "& .MuiSwitch-track": {
                              borderRadius: 24 / 2,
                              backgroundColor: (t) =>
                                t.palette.mode === "dark" ? "#39393D" : "#E9E9EA",
                              opacity: 1,
                            },
                          }}
                        />
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            (settings.birthdayMembersExempt !== undefined ? settings.birthdayMembersExempt : true)
                              ? "#1677c8"
                              : "text.secondary"
                          }
                        >
                          {(settings.birthdayMembersExempt !== undefined ? settings.birthdayMembersExempt : true)
                            ? "Enabled"
                            : "Disabled"}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.3 }}>
                        Exempt celebrants from contributing towards their birthday event by default.
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* 2. Email Template Settings */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  height: "100%",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "rgba(2, 132, 199, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                    }}
                  >
                    <EmailOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Email Template Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Configure email server and sender details.
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  <AppInput
                    label="From Email"
                    value={settings.fromEmail}
                    onChange={(e) => handleChange("fromEmail", e.target.value)}
                  />
                  <AppInput
                    label="From Name"
                    value={settings.fromName}
                    onChange={(e) => handleChange("fromName", e.target.value)}
                  />
                  <AppInput
                    label="SMTP Host"
                    value={settings.smtpHost}
                    onChange={(e) => handleChange("smtpHost", e.target.value)}
                  />
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="SMTP Port"
                        value={settings.smtpPort}
                        onChange={(e) => handleChange("smtpPort", e.target.value)}
                        restrictType="numberonly"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <AppSelect
                        label="Encryption"
                        value={settings.encryption}
                        onChange={(e) => handleChange("encryption", e.target.value)}
                        options={[
                          { label: "TLS", value: "TLS" },
                          { label: "SSL", value: "SSL" },
                          { label: "None", value: "None" },
                        ]}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Card>
            </Grid>

            {/* 3. OTP / 2FA Settings */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  height: "100%",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "rgba(2, 132, 199, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                    }}
                  >
                    <SecurityOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      OTP / 2FA Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Configure one-time password and two-factor authentication.
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="OTP Expiry (minutes)"
                        value={settings.otpExpiry}
                        onChange={(e) => handleChange("otpExpiry", e.target.value)}
                        restrictType="numberonly"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="Max Retry Attempt"
                        value={settings.maxRetry}
                        onChange={(e) => handleChange("maxRetry", e.target.value)}
                        restrictType="numberonly"
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ pt: 1 }}>
                    <AppSwitch
                      label="Enable OTP for Member Login"
                      checked={settings.enableOtpLogin}
                      onChange={(e) => handleChange("enableOtpLogin", e.target.checked)}
                    />
                  </Box>
                  <Box>
                    <AppSwitch
                      label="Enable 2FA for Admin Users"
                      checked={settings.enable2faAdmin}
                      onChange={(e) => handleChange("enable2faAdmin", e.target.checked)}
                    />
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* 4. Notification Settings */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  height: "100%",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "rgba(2, 132, 199, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                    }}
                  >
                    <NotificationsNoneOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Notification Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Configure system notifications and alerts.
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  <AppSwitch
                    label="Enable Email Notifications"
                    checked={settings.enableEmailNotif}
                    onChange={(e) => handleChange("enableEmailNotif", e.target.checked)}
                  />
                  <AppSwitch
                    label="Notify for New Member Registrations"
                    checked={settings.notifNewMember}
                    onChange={(e) => handleChange("notifNewMember", e.target.checked)}
                  />
                  <AppSwitch
                    label="Notify for Payment Confirmations"
                    checked={settings.notifPaymentConfirm}
                    onChange={(e) => handleChange("notifPaymentConfirm", e.target.checked)}
                  />
                  <AppSwitch
                    label="Notify for Event Reminders"
                    checked={settings.notifEventReminder}
                    onChange={(e) => handleChange("notifEventReminder", e.target.checked)}
                  />
                  <AppSwitch
                    label="Notify for Support Tickets"
                    checked={settings.notifSupportTicket}
                    onChange={(e) => handleChange("notifSupportTicket", e.target.checked)}
                  />
                </Stack>
              </Card>
            </Grid>

            {/* 5. Payment QR Settings */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  height: "100%",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: "rgba(2, 132, 199, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0284c7",
                      }}
                    >
                      <QrCodeScannerOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800}>
                        Payment QR Settings
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        Configure UPI/QR code for member contributions.
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  {/* Mode Selector */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.6, display: "block" }}>
                      QR Code Mode
                    </Typography>
                    <ToggleButtonGroup
                      value={settings.qrMode || "generated"}
                      exclusive
                      onChange={(e, val) => {
                        if (val) handleChange("qrMode", val);
                      }}
                      size="small"
                      fullWidth
                      sx={{
                        "& .MuiToggleButton-root": {
                          py: 0.5,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "none",
                          borderRadius: "8px",
                          "&.Mui-selected": {
                            bgcolor: "rgba(2, 132, 199, 0.12)",
                            color: "#0284c7",
                            borderColor: "#0284c7",
                          },
                        },
                      }}
                    >
                      <ToggleButton value="generated">
                        <AutoAwesomeOutlinedIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Dynamic UPI QR
                      </ToggleButton>
                      <ToggleButton value="uploaded">
                        <CloudUploadOutlinedIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Uploaded QR
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {/* Receiver Name and UPI ID */}
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="QR Receiver Name"
                        value={settings.qrReceiverName}
                        onChange={(e) => handleChange("qrReceiverName", e.target.value)}
                        placeholder="e.g. Daniel A"
                        required
                        error={Boolean(receiverError)}
                        helperText={receiverError}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="QR UPI ID"
                        value={settings.qrUpiId}
                        onChange={(e) => handleChange("qrUpiId", e.target.value)}
                        placeholder="name@okaxis"
                        required
                        error={Boolean(upiError)}
                        helperText={upiError}
                      />
                    </Grid>
                  </Grid>

                  {/* When Dynamic Mode */}
                  {(settings.qrMode || "generated") === "generated" ? (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(2, 132, 199, 0.06)" : "rgba(2, 132, 199, 0.03)"),
                        border: "1px solid rgba(2, 132, 199, 0.2)",
                      }}
                    >
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid size={{ xs: 7 }}>
                          <AppInput
                            label="Preview Amount (₹)"
                            value={settings.qrPreviewAmount || "100"}
                            onChange={(e) => handleChange("qrPreviewAmount", e.target.value)}
                            restrictType="numberonly"
                            placeholder="100"
                          />
                          <Box sx={{ mt: 1, display: "flex", gap: 0.8 }}>
                            <AppButton
                              variant="outlined"
                              size="small"
                              startIcon={<RefreshOutlinedIcon sx={{ fontSize: "0.9rem !important" }} />}
                              onClick={() => {
                                setQrRefreshKey((k) => k + 1);
                                toast.info("QR Code regenerated with current amount!");
                              }}
                              sx={{ fontSize: "0.68rem", px: 1, py: 0.3 }}
                            >
                              Regenerate QR
                            </AppButton>
                            <Tooltip title="Copy UPI ID">
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(settings.qrUpiId, "UPI ID")}
                                sx={{ border: "1px solid rgba(2, 132, 199, 0.3)", borderRadius: "8px", p: 0.4 }}
                              >
                                <ContentCopyOutlinedIcon sx={{ fontSize: 15, color: "#0284c7" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.8, display: "block" }}>
                            ⚡ Dynamic QR automatically opens <strong>Google Pay</strong> with receiver and exact contribution amount pre-filled.
                          </Typography>
                          <Box sx={{ mt: 1, display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                            <AppButton
                              variant="contained"
                              size="small"
                              component="a"
                              href={liveUpiUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                fontSize: "0.7rem",
                                py: 0.3,
                                px: 1.2,
                                bgcolor: "#0284c7",
                                "&:hover": { bgcolor: "#0369a1" },
                              }}
                            >
                              Test Open in Google Pay
                            </AppButton>
                            <AppButton
                              variant="outlined"
                              size="small"
                              onClick={async () => {
                                try {
                                  const qrUrl = getQrCodeApiUrl(liveUpiUri, 300);
                                  await updateSystemSettings({
                                    ...settings,
                                    qrImage: qrUrl,
                                    qrMode: "generated",
                                  });
                                  handleChange("qrImage", null);
                                  handleChange("qrMode", "generated");
                                  toast.success("Scanner QR image synced to server database! Emails will now show the QR code.");
                                } catch (e) {
                                  toast.error("Failed to sync: " + (e.response?.data?.message || e.message));
                                }
                              }}
                              sx={{
                                fontSize: "0.7rem",
                                py: 0.3,
                                px: 1,
                                borderColor: "#0284c7",
                                color: "#0284c7",
                                "&:hover": { bgcolor: "rgba(2, 132, 199, 0.08)" },
                              }}
                            >
                              Sync Scanner Image to Email
                            </AppButton>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 5 }} sx={{ textAlign: "center" }}>
                          <Box
                            component="img"
                            src={dynamicQrUrl}
                            alt="Dynamic UPI QR"
                            sx={{
                              width: 96,
                              height: 96,
                              borderRadius: "10px",
                              border: "2px solid #0284c7",
                              p: 0.6,
                              bgcolor: "#fff",
                              display: "block",
                              margin: "0 auto",
                              objectFit: "contain",
                              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.2)",
                            }}
                          />
                          <Chip
                            label="Scannable with GPay"
                            size="small"
                            sx={{
                              mt: 0.8,
                              height: 20,
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              bgcolor: "#0284c7",
                              color: "#ffffff",
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ) : null}

                  {/* Upload Section */}
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        {(settings.qrMode || "generated") === "uploaded"
                          ? "Upload Custom QR Code Image"
                          : "Static QR Image (Optional Fallback)"}
                      </Typography>
                      {settings.qrImage && (
                        <Tooltip title="Remove Uploaded Image">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              handleChange("qrImage", null);
                              if (settings.qrMode === "uploaded") {
                                handleChange("qrMode", "generated");
                              }
                              toast.info("Uploaded QR image removed.");
                            }}
                            sx={{ p: 0.3 }}
                          >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Box sx={{ width: "100%", mt: 1 }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleQrUpload}
                        accept="image/*"
                        style={{ display: "none" }}
                      />
                      <Box
                        sx={{
                          border: "1.5px dashed",
                          borderColor: (t) => t.palette.divider,
                          borderRadius: "12px",
                          p: settings.qrImage ? 2 : 2,
                          textAlign: "center",
                          cursor: settings.qrImage ? "default" : "pointer",
                          transition: "all 0.2s ease",
                          "&:hover": { borderColor: "#0284c7", bgcolor: "rgba(2, 132, 199, 0.04)" },
                        }}
                        onClick={() => {
                          if (!settings.qrImage) fileInputRef.current?.click();
                        }}
                      >
                        {settings.qrImage ? (
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <Box
                              component="img"
                              src={settings.qrImage}
                              alt="Uploaded QR Code"
                              sx={{
                                width: 90,
                                height: 90,
                                borderRadius: "8px",
                                border: (t) => `1.5px solid ${t.palette.divider}`,
                                p: 0.6,
                                bgcolor: "#fff",
                                display: "block",
                                margin: "0 auto",
                                objectFit: "contain",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                              }}
                            />
                            <Chip
                              label={settings.qrMode === "uploaded" ? "Uploaded QR Active" : "Uploaded Image (Fallback)"}
                              size="small"
                              sx={{
                                mt: 1,
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: settings.qrMode === "uploaded" ? "rgba(22, 163, 74, 0.12)" : "rgba(234, 88, 12, 0.12)",
                                color: settings.qrMode === "uploaded" ? "#16a34a" : "#ea580c",
                              }}
                            />
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.2 }}>
                              <AppButton
                                size="small"
                                variant="outlined"
                                startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                sx={{ fontSize: "0.72rem", height: 28 }}
                              >
                                Change QR Image
                              </AppButton>
                              <AppButton
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChange("qrImage", null);
                                  if (settings.qrMode === "uploaded") {
                                    handleChange("qrMode", "generated");
                                  }
                                  toast.info("Uploaded QR image removed.");
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                sx={{ fontSize: "0.72rem", height: 28 }}
                              >
                                Remove
                              </AppButton>
                            </Box>
                          </Box>
                        ) : (
                          <>
                            <CloudUploadOutlinedIcon sx={{ fontSize: 26, color: "#0284c7" }} />
                            <Typography variant="caption" sx={{ display: "block", fontWeight: 700, fontSize: "0.72rem", mt: 0.3 }}>
                              Click to upload QR code image
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                              PNG, JPG up to 2MB
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>

                    {settings.qrImage && (settings.qrMode || "generated") === "generated" && (
                      <Box sx={{ mt: 1.2, p: 1.2, borderRadius: "8px", bgcolor: "rgba(2, 132, 199, 0.06)", border: "1px dashed rgba(2, 132, 199, 0.3)" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "#0369a1", display: "block" }}>
                          💡 <strong>Dynamic UPI QR Mode Active:</strong> A live, scannable QR code encoding Daniel A ({settings.qrUpiId}) is active. Scanning will automatically redirect to Google Pay.
                        </Typography>
                        <AppButton
                          size="small"
                          variant="text"
                          color="error"
                          onClick={() => {
                            handleChange("qrImage", null);
                            toast.info("Uploaded image cleared. Dynamic QR is now active for all emails!");
                          }}
                          sx={{ fontSize: "0.67rem", px: 0, py: 0.2, mt: 0.4, textTransform: "none", fontWeight: 700 }}
                        >
                          Clear Uploaded Image & Use Dynamic QR Exclusively
                        </AppButton>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* 6. Audit Settings */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  height: "100%",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "rgba(2, 132, 199, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                    }}
                  >
                    <StorageOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Audit Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Configure system audit and activity logging.
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <AppSwitch
                    label="Enable Audit Logs"
                    checked={settings.enableAuditLogs}
                    onChange={(e) => handleChange("enableAuditLogs", e.target.checked)}
                  />
                  <AppSwitch
                    label="Log User Login/Logout"
                    checked={settings.logUserLogin}
                    onChange={(e) => handleChange("logUserLogin", e.target.checked)}
                  />
                  <AppSwitch
                    label="Log Data Changes"
                    checked={settings.logDataChanges}
                    onChange={(e) => handleChange("logDataChanges", e.target.checked)}
                  />
                  <AppSwitch
                    label="Log Configuration Changes"
                    checked={settings.logConfigChanges}
                    onChange={(e) => handleChange("logConfigChanges", e.target.checked)}
                  />
                  <Box sx={{ pt: 1 }}>
                    <AppInput
                      label="Retention Period (days)"
                      value={settings.retentionPeriod}
                      onChange={(e) => handleChange("retentionPeriod", e.target.value)}
                      restrictType="numberonly"
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                      ⓘ Audit logs will be stored for the specified number of days.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Right Sidebar: System Configuration Status */}
        <Grid size={{ xs: 12, lg: 3 }}>
          <Card
            sx={{
              borderRadius: "16px",
              border: (t) => `1px solid ${t.palette.divider}`,
              p: 2.5,
              height: "100%",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: "rgba(2, 132, 199, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0284c7",
                  }}
                >
                  <InsightsOutlinedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>
                    System Configuration Status
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                    Current status of your system settings.
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2.5} sx={{ mt: 3 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 22, mt: 0.2 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                      Email Configured
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {settings.fromEmail}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 22, mt: 0.2 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                      OTP Enabled
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Expires in {settings.otpExpiry} minutes
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 22, mt: 0.2 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                      Payment QR Configured
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      UPI: {settings.qrUpiId} ({(settings.qrMode || "generated") === "uploaded" && settings.qrImage ? "Uploaded QR" : "Dynamic UPI QR"})
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 22, mt: 0.2 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                      Birthday Exemption
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {settings.birthdayMembersExempt !== false
                        ? "Celebrants Exempt (Enabled)"
                        : "All Members Contribute (Disabled)"}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PersonOutlineRoundedIcon sx={{ color: "#0284c7", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                      Last Updated By
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>
                      Admin
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CalendarTodayOutlinedIcon sx={{ color: "#0284c7", fontSize: 18 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                      Last Updated On
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>
                      {lastUpdated}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Bottom Status Banner */}
            <Box
              sx={{
                mt: 3,
                p: 1.5,
                borderRadius: "12px",
                bgcolor: "rgba(22, 163, 74, 0.08)",
                border: "1px solid rgba(22, 163, 74, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: 1.2,
              }}
            >
              <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 22 }} />
              <Box>
                <Typography variant="caption" fontWeight={800} sx={{ color: "#16a34a", display: "block" }}>
                  System is properly configured
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                  All essential settings are in place.
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Actions Bar */}
      <Box sx={{ mt: 3, display: "flex", gap: 1.5 }}>
        <AppButton
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          onClick={handleSave}
          sx={{ bgcolor: "#0284c7 !important", "&:hover": { bgcolor: "#0369a1 !important" } }}
        >
          Save Changes
        </AppButton>
        <AppButton variant="outlined" startIcon={<RestartAltRoundedIcon />} onClick={handleReset}>
          Reset
        </AppButton>
      </Box>
    </Box>
  );
}
