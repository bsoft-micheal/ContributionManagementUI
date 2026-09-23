import React, { useState, useEffect, useRef } from "react";
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
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import dayjs from "dayjs";
import {
  validateUpiId,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
  generateQrPngDataUrl,
} from "../../utils/upiQrHelper";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppSwitch from "../../components/common/AppSwitch";
import AppButton from "../../components/common/AppButton";
import AppTextArea from "../../components/common/AppTextArea";
import { useAppToast } from "../../components/common/AppToast";
import {
  getSystemSettingsAsync,
  updateSystemSettings,
} from "../../services/settingsService";
import { GetEventsAsync } from "../../services/eventService";

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

const initialSettings = {
  // General
  orgName: "Unit 1A Residents Association",
  birthdayMembersExempt: true,

  // Notifications (now in General)
  enableEmailNotif: true,
  notifNewMember: true,
  notifPaymentConfirm: true,
  notifEventReminder: true,
  notifSupportTicket: false,

  // Email Template (against event)
  selectedTemplateEventId: "all",
  emailSubject: "Contribution Payment Reminder - {eventName}",
  emailDescription:
    "Dear {memberName},\n\nThis is a friendly reminder regarding your pending contribution for {eventName}.\nPlease scan the attached dynamic UPI QR code or use the payment link to complete your payment.\n\nThank you,\n{orgName}",
  eventTemplates: {},

  // OTP / 2FA
  otpExpiry: "10",
  maxRetry: "3",
  enableOtpLogin: true,
  enable2faAdmin: false,

  // Payment QR
  qrReceiverName: "Daniel A",
  qrUpiId: "danielrobertanto604@okicici",
  qrMode: "generated", // "generated" | "uploaded"
  qrPreviewAmount: "100",
  qrImage: null,
};

export default function SettingsPage() {
  const theme = useTheme();
  const toast = useAppToast();
  const isDark = theme.palette.mode === "dark";

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      try {
        return { ...initialSettings, ...JSON.parse(saved) };
      } catch (e) {
        return initialSettings;
      }
    }
    return initialSettings;
  });

  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [templateSubject, setTemplateSubject] = useState(
    settings.emailSubject || "Contribution Payment Reminder - {eventName}"
  );
  const [templateDescription, setTemplateDescription] = useState(
    settings.emailDescription ||
      "Dear {memberName},\n\nThis is a friendly reminder regarding your pending contribution for {eventName}.\nPlease scan the attached dynamic UPI QR code or use the payment link to complete your payment.\n\nThank you,\n{orgName}"
  );

  const fileInputRef = useRef(null);

  const upiValidation = validateUpiId(settings.qrUpiId);
  const upiError = !settings.qrUpiId
    ? "QR UPI ID is required"
    : !upiValidation.isValid
    ? upiValidation.error
    : "";
  const receiverError = !settings.qrReceiverName?.trim()
    ? "QR Receiver Name is required"
    : "";

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

  // Load events list for the Email Template selector
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const events = await GetEventsAsync();
        if (Array.isArray(events)) {
          setEventsList(events);
        }
      } catch (err) {
        console.warn("Could not fetch events for template settings:", err);
      }
    };
    loadEvents();
  }, []);

  // Load settings from backend on mount
  useEffect(() => {
    const loadBackendSettings = async () => {
      try {
        const data = await getSystemSettingsAsync();
        if (data && typeof data === "object") {
          const localSaved = localStorage.getItem("cm_system_settings");
          let localMode = "generated";
          let localEventTemplates = {};
          let localSelectedEventId = "all";
          try {
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (parsed.qrMode) localMode = parsed.qrMode;
              if (parsed.eventTemplates) localEventTemplates = parsed.eventTemplates;
              if (parsed.selectedTemplateEventId) localSelectedEventId = parsed.selectedTemplateEventId;
            }
          } catch (e) {}

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
            eventTemplates: localEventTemplates,
            selectedTemplateEventId: localSelectedEventId,
          };

          setSettings(merged);
          setTemplateSubject(merged.emailSubject || initialSettings.emailSubject);
          setTemplateDescription(merged.emailDescription || initialSettings.emailDescription);
          localStorage.setItem("cm_system_settings", JSON.stringify(merged));
        }
      } catch (err) {
        console.warn("Could not fetch settings from backend, using cached settings:", err);
      }
    };
    loadBackendSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const persistSettings = async (updated) => {
    try {
      const savedRes = await updateSystemSettings(updated);
      const finalState = { ...updated, ...savedRes };
      setSettings(finalState);
      localStorage.setItem("cm_system_settings", JSON.stringify(finalState));
      return finalState;
    } catch (err) {
      console.warn("Backend settings update failed, saved locally:", err);
      setSettings(updated);
      localStorage.setItem("cm_system_settings", JSON.stringify(updated));
      return updated;
    }
  };

  // 1. Save General Settings (Org info + Notifications)
  const handleSaveGeneral = async () => {
    if (!settings.orgName || !settings.orgName.trim()) {
      toast.error("Organization Name is required.");
      return;
    }
    await persistSettings(settings);
    toast.success("General and Notification settings saved successfully!");
  };

  // 2. Handle Event Selection Change in Email Template Settings
  const handleTemplateEventChange = (eventId) => {
    setSelectedEventId(eventId);
    if (eventId === "all") {
      setTemplateSubject(settings.emailSubject || initialSettings.emailSubject);
      setTemplateDescription(settings.emailDescription || initialSettings.emailDescription);
    } else {
      const custom = settings.eventTemplates?.[eventId];
      if (custom && (custom.subject || custom.description)) {
        setTemplateSubject(custom.subject || "");
        setTemplateDescription(custom.description || "");
      } else {
        const found = eventsList.find((e) => String(e.eventId) === String(eventId));
        const eventTitle = found?.eventName || "Event";
        setTemplateSubject(`Contribution Payment Reminder - ${eventTitle}`);
        setTemplateDescription(
          `Dear {memberName},\n\nThis is a friendly reminder regarding your pending contribution for ${eventTitle}.\nPlease scan the attached dynamic UPI QR code or use the payment link to complete your payment.\n\nThank you,\n{orgName}`
        );
      }
    }
  };

  // Save Email Template Settings
  const handleSaveEmailTemplate = async () => {
    if (!templateSubject.trim()) {
      toast.error("Email Subject is required.");
      return;
    }
    if (!templateDescription.trim()) {
      toast.error("Email Description is required.");
      return;
    }

    const updatedEventTemplates = { ...(settings.eventTemplates || {}) };
    let newDefaultSubject = settings.emailSubject;
    let newDefaultDescription = settings.emailDescription;

    if (selectedEventId === "all") {
      newDefaultSubject = templateSubject;
      newDefaultDescription = templateDescription;
    } else {
      updatedEventTemplates[selectedEventId] = {
        subject: templateSubject,
        description: templateDescription,
      };
    }

    const updated = {
      ...settings,
      emailSubject: newDefaultSubject,
      emailDescription: newDefaultDescription,
      eventTemplates: updatedEventTemplates,
      selectedTemplateEventId: selectedEventId,
    };

    await persistSettings(updated);
    const targetLabel =
      selectedEventId === "all"
        ? "All Events (Default)"
        : eventsList.find((e) => String(e.eventId) === String(selectedEventId))?.eventName || "Selected Event";
    toast.success(`Email template for "${targetLabel}" saved successfully!`);
  };

  // 3. Save OTP / 2FA Settings
  const handleSaveOtp = async () => {
    if (!settings.otpExpiry || Number(settings.otpExpiry) <= 0) {
      toast.error("Please enter a valid OTP Expiry in minutes.");
      return;
    }
    if (!settings.maxRetry || Number(settings.maxRetry) <= 0) {
      toast.error("Please enter a valid Max Retry Attempt.");
      return;
    }
    await persistSettings(settings);
    toast.success("OTP & 2FA settings saved successfully!");
  };

  // 4. Save Payment QR Settings
  const handleSavePaymentQr = async () => {
    if (!settings.qrReceiverName || !settings.qrReceiverName.trim()) {
      toast.error("QR Receiver Name is required.");
      return;
    }
    const upiCheck = validateUpiId(settings.qrUpiId);
    if (!upiCheck.isValid) {
      toast.error(upiCheck.error || "Please enter a valid UPI ID.");
      return;
    }

    const scannerQrUrl = getQrCodeApiUrl(liveUpiUri, 300);
    const isCustomUploaded = settings.qrMode === "uploaded" && settings.qrImage;
    const effectiveQrImage = isCustomUploaded ? settings.qrImage : scannerQrUrl;

    const updated = {
      ...settings,
      qrImage: effectiveQrImage,
    };

    await persistSettings(updated);
    toast.success("Payment QR settings saved successfully!");
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

  // Event dropdown options
  const eventSelectOptions = [
    { label: "All Events (Default Template)", value: "all" },
    ...eventsList.map((evt) => ({
      label: `${evt.eventName || "Unnamed Event"} ${
        evt.eventDate ? `(${dayjs(evt.eventDate).format("DD/MM/YYYY")})` : ""
      }`,
      value: String(evt.eventId),
    })),
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1600, margin: "0 auto" }}>
      {/* Breadcrumbs & Page Header */}
      <Breadcrumbs sx={{ mb: 1, fontSize: "0.8rem" }}>
        <Link underline="hover" color="inherit" href="/">
          Home
        </Link>
        <Typography color="text.primary" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
          Settings
        </Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ color: isDark ? "#ffffff" : "#1e1a2e", letterSpacing: "-0.02em" }}
        >
          System Settings
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.3 }}>
          Manage system configuration, organization preferences, and email templates.
        </Typography>
      </Box>

      {/* Main 2x2 Grid of 4 Settings Cards */}
      <Grid container spacing={2.5}>
        {/* ── 1. General Settings (including Notification Settings) ───────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "16px",
              border: (t) => `1px solid ${t.palette.divider}`,
              p: 2.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              bgcolor: "background.paper",
            }}
          >
            <Box>
              {/* Card Header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
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
                  <Typography variant="subtitle1" fontWeight={800}>
                    General Settings
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                    Basic information and notification preferences.
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2.2} sx={{ mt: 2 }}>
                {/* Organization Name */}
                <AppInput
                  label="Organization Name"
                  value={settings.orgName}
                  onChange={(e) => handleChange("orgName", e.target.value)}
                  placeholder="e.g. Unit 1A Residents Association"
                />

                {/* Birthday Exemption */}
                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Birthday Members Exempt?
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.6 }}>
                    <Switch
                      checked={
                        settings.birthdayMembersExempt !== undefined
                          ? settings.birthdayMembersExempt
                          : true
                      }
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
                      fontWeight={700}
                      color={
                        settings.birthdayMembersExempt !== false ? "#1677c8" : "text.secondary"
                      }
                    >
                      {settings.birthdayMembersExempt !== false ? "Enabled" : "Disabled"}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.4, display: "block" }}>
                    Exempt celebrants from contributing towards their birthday event by default.
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Notification Settings Embedded Section */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <NotificationsNoneOutlinedIcon sx={{ fontSize: 18, color: "#0284c7" }} />
                  <Typography variant="subtitle2" fontWeight={750} sx={{ fontSize: "0.83rem" }}>
                    Notification Alerts
                  </Typography>
                </Box>

                <Stack spacing={1.6}>
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
              </Stack>
            </Box>

            {/* Save Button for General Settings */}
            <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "flex-end" }}>
              <AppButton
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleSaveGeneral}
                sx={{
                  bgcolor: "#0284c7 !important",
                  "&:hover": { bgcolor: "#0369a1 !important" },
                  px: 2.5,
                  fontWeight: 700,
                }}
              >
                Save General Settings
              </AppButton>
            </Box>
          </Card>
        </Grid>

        {/* ── 2. Email Template Settings (Subject & Description against Event) ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "16px",
              border: (t) => `1px solid ${t.palette.divider}`,
              p: 2.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              bgcolor: "background.paper",
            }}
          >
            <Box>
              {/* Card Header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
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
                  <Typography variant="subtitle1" fontWeight={800}>
                    Email Template Settings
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                    Configure email subject and description against events.
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2.2} sx={{ mt: 2 }}>
                {/* Event Selector Dropdown */}
                <Box>
                  <AppSelect
                    label="Event"
                    value={selectedEventId}
                    onChange={(e) => handleTemplateEventChange(e.target.value)}
                    options={eventSelectOptions}
                    required
                    fullWidth
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                    Select a specific event to configure its template or choose default for all events.
                  </Typography>
                </Box>

                {/* Email Subject */}
                <AppInput
                  label="Email Subject"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="e.g. Contribution Payment Reminder - {eventName}"
                  required
                />

                {/* Email Description */}
                <AppTextArea
                  label="Email Description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Enter email message / description for the event..."
                  minRows={6}
                  required
                />

                {/* Dynamic Variables Legend Chips */}
                <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(2,132,199,0.05)", border: (t) => `1px dashed ${t.palette.divider}` }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                    💡 Supported Dynamic Placeholders:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {[
                      { tag: "{memberName}", desc: "Member's Name" },
                      { tag: "{eventName}", desc: "Event Name" },
                      { tag: "{amount}", desc: "Due Amount" },
                      { tag: "{dueDate}", desc: "Due Date" },
                      { tag: "{orgName}", desc: "Organization" },
                    ].map((item) => (
                      <Chip
                        key={item.tag}
                        label={`${item.tag}`}
                        size="small"
                        onClick={() => {
                          setTemplateDescription((prev) => `${prev} ${item.tag}`);
                          toast.info(`Inserted ${item.tag}`);
                        }}
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#e0f2fe",
                          color: "#0284c7",
                          "&:hover": { bgcolor: "#bae6fd" },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* Save Button for Email Template Settings */}
            <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "flex-end" }}>
              <AppButton
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleSaveEmailTemplate}
                sx={{
                  bgcolor: "#0284c7 !important",
                  "&:hover": { bgcolor: "#0369a1 !important" },
                  px: 2.5,
                  fontWeight: 700,
                }}
              >
                Save Email Template
              </AppButton>
            </Box>
          </Card>
        </Grid>

        {/* ── 3. OTP / 2FA Settings ───────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "16px",
              border: (t) => `1px solid ${t.palette.divider}`,
              p: 2.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              bgcolor: "background.paper",
            }}
          >
            <Box>
              {/* Card Header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
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
                  <Typography variant="subtitle1" fontWeight={800}>
                    OTP / 2FA Settings
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                    Configure one-time password and two-factor authentication.
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <AppInput
                      label="OTP Expiry (minutes)"
                      value={settings.otpExpiry}
                      onChange={(e) => handleChange("otpExpiry", e.target.value)}
                      restrictType="numberonly"
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <AppInput
                      label="Max Retry Attempt"
                      value={settings.maxRetry}
                      onChange={(e) => handleChange("maxRetry", e.target.value)}
                      restrictType="numberonly"
                      required
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
              </Box>

              {/* Save Button for OTP / 2FA Settings */}
              <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "flex-end" }}>
                <AppButton
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={handleSaveOtp}
                  sx={{
                    bgcolor: "#0284c7 !important",
                    "&:hover": { bgcolor: "#0369a1 !important" },
                    px: 2.5,
                    fontWeight: 700,
                  }}
                >
                  Save OTP / 2FA Settings
                </AppButton>
              </Box>
            </Card>
          </Grid>

        {/* ── 4. Payment QR Settings ──────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "16px",
              border: (t) => `1px solid ${t.palette.divider}`,
              p: 2.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              bgcolor: "background.paper",
            }}
          >
            <Box>
              {/* Card Header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
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
                  <Typography variant="subtitle1" fontWeight={800}>
                    Payment QR Settings
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                    Configure UPI/QR code for member contributions.
                  </Typography>
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
                      placeholder="e.g. danielrobertanto604@okicici"
                      required
                      error={Boolean(upiError)}
                      helperText={upiError}
                    />
                  </Grid>
                </Grid>

                {/* When Dynamic Mode: Interactive Preview */}
                {(settings.qrMode || "generated") === "generated" ? (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "12px",
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(2, 132, 199, 0.04)",
                      border: "1px solid",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(2, 132, 199, 0.15)",
                    }}
                  >
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 7 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#0284c7", display: "block" }}>
                          Live Dynamic UPI QR Preview
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block", mt: 0.3 }}>
                          Receiver: <strong>{settings.qrReceiverName || "—"}</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block" }}>
                          UPI ID: <strong>{settings.qrUpiId || "—"}</strong>
                        </Typography>

                        <Box sx={{ mt: 1, display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                          <AppButton
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => copyToClipboard(settings.qrUpiId, "UPI ID")}
                            sx={{ fontSize: "0.65rem", height: 24, px: 0.8 }}
                          >
                            Copy UPI
                          </AppButton>
                          <AppButton
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => copyToClipboard(liveUpiUri, "UPI Link")}
                            sx={{ fontSize: "0.65rem", height: 24, px: 0.8 }}
                          >
                            Copy URI
                          </AppButton>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 5 }} sx={{ textAlign: "center" }}>
                        <Box
                          component="img"
                          src={dynamicQrUrl}
                          alt="Dynamic UPI QR"
                          sx={{
                            width: 88,
                            height: 88,
                            borderRadius: "10px",
                            border: "2px solid #0284c7",
                            p: 0.5,
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
                            mt: 0.6,
                            height: 18,
                            fontSize: "0.6rem",
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

                  <Box sx={{ width: "100%", mt: 0.8 }}>
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
                              width: 80,
                              height: 80,
                              borderRadius: "8px",
                              border: (t) => `1.5px solid ${t.palette.divider}`,
                              p: 0.5,
                              bgcolor: "#fff",
                              display: "block",
                              margin: "0 auto",
                              objectFit: "contain",
                              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                            }}
                          />
                          <Chip
                            label={
                              settings.qrMode === "uploaded"
                                ? "Uploaded QR Active"
                                : "Uploaded Image (Fallback)"
                            }
                            size="small"
                            sx={{
                              mt: 0.8,
                              height: 18,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              bgcolor:
                                settings.qrMode === "uploaded"
                                  ? "rgba(22, 163, 74, 0.12)"
                                  : "rgba(234, 88, 12, 0.12)",
                              color: settings.qrMode === "uploaded" ? "#16a34a" : "#ea580c",
                            }}
                          />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                            <AppButton
                              size="small"
                              variant="outlined"
                              startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: 14 }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              sx={{ fontSize: "0.68rem", height: 26 }}
                            >
                              Change
                            </AppButton>
                            <AppButton
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange("qrImage", null);
                                if (settings.qrMode === "uploaded") {
                                  handleChange("qrMode", "generated");
                                }
                                toast.info("Uploaded QR image removed.");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              sx={{ fontSize: "0.68rem", height: 26 }}
                            >
                              Remove
                            </AppButton>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <CloudUploadOutlinedIcon sx={{ fontSize: 24, color: "#0284c7" }} />
                          <Typography variant="caption" sx={{ display: "block", fontWeight: 700, fontSize: "0.72rem", mt: 0.2 }}>
                            Click to upload QR code image
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.63rem" }}>
                            PNG, JPG up to 2MB
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Save Button for Payment QR Settings */}
            <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "flex-end" }}>
              <AppButton
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleSavePaymentQr}
                sx={{
                  bgcolor: "#0284c7 !important",
                  "&:hover": { bgcolor: "#0369a1 !important" },
                  px: 2.5,
                  fontWeight: 700,
                }}
              >
                Save Payment QR
              </AppButton>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
