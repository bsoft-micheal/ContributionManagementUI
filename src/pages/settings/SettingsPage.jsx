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
import dayjs from "dayjs";

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
  qrImage: defaultPaymentQr,

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
  const fileInputRef = useRef(null);

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
      toast.success("QR Code image updated successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Load from backend on mount
  React.useEffect(() => {
    const loadBackendSettings = async () => {
      try {
        const data = await getSystemSettingsAsync();
        if (data && typeof data === "object") {
          setSettings((prev) => ({ ...prev, ...data }));
          if (data.modifiedOn || data.createdOn) {
            setLastUpdated(dayjs(data.modifiedOn || data.createdOn).format("DD MMM YYYY, hh:mm A"));
          }
          localStorage.setItem("cm_system_settings", JSON.stringify({ ...initialSettings, ...data }));
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
    try {
      const updated = await updateSystemSettingsAsync(settings);
      setSettings(updated);
      localStorage.setItem("cm_system_settings", JSON.stringify(updated));
    } catch (err) {
      console.warn("Backend settings update failed, saved locally:", err);
      localStorage.setItem("cm_system_settings", JSON.stringify(settings));
    }
    const now = dayjs().format("DD MMM YYYY, hh:mm A");
    setLastUpdated(now);
    toast.success("Settings saved successfully!");
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

                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="QR Receiver Name"
                        value={settings.qrReceiverName}
                        onChange={(e) => handleChange("qrReceiverName", e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <AppInput
                        label="QR UPI ID"
                        value={settings.qrUpiId}
                        onChange={(e) => handleChange("qrUpiId", e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5, display: "block" }}>
                      QR Code Image
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 7 }}>
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
                            p: 1.5,
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            "&:hover": { borderColor: "#0284c7", bgcolor: "rgba(2, 132, 199, 0.04)" },
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <CloudUploadOutlinedIcon sx={{ fontSize: 24, color: "#0284c7" }} />
                          <Typography variant="caption" sx={{ display: "block", fontWeight: 700, fontSize: "0.7rem", mt: 0.3 }}>
                            Click to upload QR code image
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                            PNG, JPG up to 2MB
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 5 }} sx={{ textAlign: "center" }}>
                        <Box
                          component="img"
                          src={settings.qrImage || defaultPaymentQr}
                          alt="QR Code"
                          sx={{
                            width: 72,
                            height: 72,
                            borderRadius: "8px",
                            border: (t) => `1px solid ${t.palette.divider}`,
                            p: 0.5,
                            bgcolor: "#fff",
                            display: "block",
                            margin: "0 auto",
                            objectFit: "contain",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                          }}
                        />
                        <AppButton
                          variant="outlined"
                          size="small"
                          sx={{ mt: 0.8, fontSize: "0.68rem", px: 1, py: 0.2 }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Image
                        </AppButton>
                      </Grid>
                    </Grid>
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
                      QR Uploaded
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      UPI ID: {settings.qrUpiId}
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
