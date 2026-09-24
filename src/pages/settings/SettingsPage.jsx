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
  Paper,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CircularProgress from "@mui/material/CircularProgress";
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
import MfaSettings from "../../components/common/MfaSettings";
import { useAppToast } from "../../components/common/AppToast";
import {
  getSystemSettingsAsync,
  updateSystemSettings,
} from "../../services/settingsService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import SendTestEmailDialog from "../../components/settings/SendTestEmailDialog";
import EmailReminderLogsDialog from "../../components/settings/EmailReminderLogsDialog";
import {
  DEFAULT_CATEGORY_TEMPLATES,
  getCategoryTemplates,
  resolveCategoryTemplate,
  evaluateAndRunScheduler,
  interpolatePlaceholders,
} from "../../services/emailReminderScheduler";

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
  // General & Notifications
  orgName: "Unit 1A Residents Association",
  birthdayMembersExempt: true,
  enableEmailNotif: true,
  notifNewMember: true,
  notifPaymentConfirm: true,
  notifEventReminder: true,
  notifSupportTicket: false,

  // Category-based Email Template & Automation
  selectedTemplateCategoryId: "all",
  categoryTemplates: DEFAULT_CATEGORY_TEMPLATES,
  enableMonthlyEmail: true,
  enableReminderEmail: true,
  reminderIntervalDays: "10",
  maxReminders: "3",

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
        const parsed = JSON.parse(saved);
        return {
          ...initialSettings,
          ...parsed,
          birthdayMembersExempt:
            parsed.birthdayMembersExempt !== undefined
              ? parsed.birthdayMembersExempt
              : true,
        };
      } catch (e) {
        return initialSettings;
      }
    }
    return initialSettings;
  });

  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedTemplateCategoryId) return parsed.selectedTemplateCategoryId;
      } catch (e) {}
    }
    return "all";
  });
  const [templateType, setTemplateType] = useState("initial"); // "initial" | "reminder"
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => dayjs().format("DD MMM YYYY"));
  const [mfaDevicesCount, setMfaDevicesCount] = useState(1);

  const [activeTab, setActiveTab] = useState("general");

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

  // Helper to load template for given category and type
  const loadTemplateForCategoryAndType = (catId, tType, currentSettings = settings, catList = categoriesList) => {
    const foundCat = catList.find((c) => String(c.eventTypeId) === String(catId));
    const catName = foundCat?.eventTypeName || "";

    const custom = currentSettings.categoryTemplates?.[catId];
    if (custom) {
      if (tType === "initial" && (custom.initialSubject || custom.initialDescription)) {
        setTemplateSubject(custom.initialSubject || "");
        setTemplateDescription(custom.initialDescription || "");
        return;
      }
      if (tType === "reminder" && (custom.reminderSubject || custom.reminderDescription)) {
        setTemplateSubject(custom.reminderSubject || "");
        setTemplateDescription(custom.reminderDescription || "");
        return;
      }
    }

    const resolved = resolveCategoryTemplate(catId, catName, tType);
    setTemplateSubject(resolved.subject);
    setTemplateDescription(resolved.description);
  };

  // Load categories list for the Email Template selector
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const types = await GetEventTypesAsync();
        if (Array.isArray(types)) {
          setCategoriesList(types);
          // Initial template populate once categories arrive
          loadTemplateForCategoryAndType(selectedCategoryId, templateType, settings, types);
        }
      } catch (err) {
        console.warn("Could not fetch categories for template settings:", err);
      }
    };
    loadCategories();
  }, []);

  // Load settings from backend on mount
  useEffect(() => {
    const loadBackendSettings = async () => {
      try {
        const data = await getSystemSettingsAsync();
        if (data && typeof data === "object") {
          const localSaved = localStorage.getItem("cm_system_settings");
          let localMode = "generated";
          let localCategoryTemplates = DEFAULT_CATEGORY_TEMPLATES;
          let localSelectedCategoryId = "all";
          let localEnableMonthlyEmail = true;
          let localEnableReminderEmail = true;
          let localReminderIntervalDays = "10";
          let localMaxReminders = "3";
          let localBirthdayMembersExempt = undefined;
          try {
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (parsed.qrMode) localMode = parsed.qrMode;
              if (parsed.categoryTemplates) localCategoryTemplates = parsed.categoryTemplates;
              if (parsed.selectedTemplateCategoryId) localSelectedCategoryId = parsed.selectedTemplateCategoryId;
              if (parsed.enableMonthlyEmail !== undefined) localEnableMonthlyEmail = parsed.enableMonthlyEmail;
              if (parsed.enableReminderEmail !== undefined) localEnableReminderEmail = parsed.enableReminderEmail;
              if (parsed.reminderIntervalDays) localReminderIntervalDays = String(parsed.reminderIntervalDays);
              if (parsed.maxReminders) localMaxReminders = String(parsed.maxReminders);
              if (parsed.birthdayMembersExempt !== undefined) localBirthdayMembersExempt = parsed.birthdayMembersExempt;
            }
          } catch (e) {}

          const resolvedBirthdayMembersExempt =
            data.birthdayMembersExempt !== undefined
              ? data.birthdayMembersExempt
              : localBirthdayMembersExempt !== undefined
              ? localBirthdayMembersExempt
              : true;

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
            birthdayMembersExempt: resolvedBirthdayMembersExempt,
            qrUpiId: cleanUpiId,
            qrReceiverName: cleanReceiver,
            qrMode: localMode,
            categoryTemplates: localCategoryTemplates,
            selectedTemplateCategoryId: localSelectedCategoryId,
            enableMonthlyEmail: localEnableMonthlyEmail,
            enableReminderEmail: localEnableReminderEmail,
            reminderIntervalDays: localReminderIntervalDays,
            maxReminders: localMaxReminders,
          };

          setSettings(merged);
          setSelectedCategoryId(localSelectedCategoryId);
          loadTemplateForCategoryAndType(localSelectedCategoryId, "initial", merged, categoriesList);
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

  // Immediate toggle and persistence for Birthday Exemption setting
  const handleBirthdayExemptToggle = async (checked) => {
    const updated = { ...settings, birthdayMembersExempt: checked };
    setSettings(updated);

    try {
      const saved = localStorage.getItem("cm_system_settings");
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem("cm_system_settings", JSON.stringify({ ...parsed, ...updated, birthdayMembersExempt: checked }));
    } catch (e) {}

    try {
      await updateSystemSettings(updated);
    } catch (err) {
      console.warn("Could not sync birthdayMembersExempt to backend:", err);
    }
  };

  const persistSettings = async (updated) => {
    try {
      const savedRes = await updateSystemSettings(updated);
      const finalState = { ...updated, ...savedRes };
      setSettings(finalState);
      setLastUpdated(dayjs().format("DD MMM YYYY"));
      localStorage.setItem("cm_system_settings", JSON.stringify(finalState));
      return finalState;
    } catch (err) {
      console.warn("Backend settings update failed, saved locally:", err);
      setSettings(updated);
      setLastUpdated(dayjs().format("DD MMM YYYY"));
      localStorage.setItem("cm_system_settings", JSON.stringify(updated));
      return updated;
    }
  };

  // 1. Save General Settings (Org info + OTP / 2FA)
  const handleSaveGeneral = async () => {
    if (!settings.orgName || !settings.orgName.trim()) {
      toast.error("Organization Name is required.");
      return;
    }
    if (!settings.otpExpiry || Number(settings.otpExpiry) <= 0) {
      toast.error("Please enter a valid OTP Expiry in minutes.");
      return;
    }
    if (!settings.maxRetry || Number(settings.maxRetry) <= 0) {
      toast.error("Please enter a valid Max Retry Attempt.");
      return;
    }
    await persistSettings(settings);
    toast.success("General & Security settings saved successfully!");
  };

  // 2. Handle Category Selection Change in Email Template Settings
  const handleTemplateCategoryChange = (catId) => {
    setSelectedCategoryId(catId);
    loadTemplateForCategoryAndType(catId, templateType);
  };

  // Handle Template Type Switch (Initial vs Reminder)
  const handleTemplateTypeChange = (newType) => {
    if (!newType) return;
    setTemplateType(newType);
    loadTemplateForCategoryAndType(selectedCategoryId, newType);
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

    const updatedCategoryTemplates = { ...(settings.categoryTemplates || DEFAULT_CATEGORY_TEMPLATES) };
    const currentEntry = { ...(updatedCategoryTemplates[selectedCategoryId] || {}) };

    if (templateType === "initial") {
      currentEntry.initialSubject = templateSubject;
      currentEntry.initialDescription = templateDescription;
    } else {
      currentEntry.reminderSubject = templateSubject;
      currentEntry.reminderDescription = templateDescription;
    }

    updatedCategoryTemplates[selectedCategoryId] = currentEntry;

    let defaultSub = settings.emailSubject;
    let defaultDesc = settings.emailDescription;
    if (selectedCategoryId === "all" && templateType === "initial") {
      defaultSub = templateSubject;
      defaultDesc = templateDescription;
    }

    const updated = {
      ...settings,
      emailSubject: defaultSub,
      emailDescription: defaultDesc,
      categoryTemplates: updatedCategoryTemplates,
      selectedTemplateCategoryId: selectedCategoryId,
      enableMonthlyEmail: settings.enableMonthlyEmail !== false,
      enableReminderEmail: settings.enableReminderEmail !== false,
      reminderIntervalDays: settings.reminderIntervalDays || "10",
      maxReminders: settings.maxReminders || "3",
    };

    await persistSettings(updated);
    const targetLabel =
      selectedCategoryId === "all"
        ? "All Categories (Default)"
        : categoriesList.find((c) => String(c.eventTypeId) === String(selectedCategoryId))?.eventTypeName || "Selected Category";
    toast.success(`Email template for "${targetLabel}" (${templateType === "initial" ? "Initial Email" : "Reminder Email"}) saved successfully!`);
  };

  // Manual Trigger to Run Scheduler check
  const handleRunSchedulerCheck = async () => {
    setSchedulerRunning(true);
    try {
      const res = await evaluateAndRunScheduler();
      if (res.status === "completed") {
        toast.success(res.message || "Scheduler evaluation completed!");
      } else {
        toast.info(res.message || "Scheduler evaluation finished.");
      }
    } catch (e) {
      console.error("Scheduler error:", e);
      toast.error("Error executing scheduler check.");
    } finally {
      setSchedulerRunning(false);
    }
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

  // Category dropdown options
  const categorySelectOptions = [
    { label: "All Categories (Default Template)", value: "all" },
    ...categoriesList.map((cat) => ({
      label: cat.eventTypeName || "Unnamed Category",
      value: String(cat.eventTypeId),
    })),
  ];

  return (
    <div className="page-shell">
      <Paper
        elevation={0}
        sx={{
          border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "1px solid rgba(224, 224, 224, 1)",
          borderRadius: "8px",
          overflow: "hidden",
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* ── Top Header Bar (Matching Support Tickets / Members Details) ──── */}
        <Box
          sx={{
            background: theme.palette.mode === "dark"
              ? "linear-gradient(90deg, #171b2d 0%, #1d2338 100%)"
              : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
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
            fontWeight={700}
            sx={{ fontSize: "0.95rem", letterSpacing: "0.02em", color: "#ffffff" }}
          >
            Settings
          </Typography>
        </Box>

        {/* ── Settings Content Area ────────────────────────────────────────── */}
        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          {/* Settings Navigation Tabs matching ReportsPage style */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
            {[
              { key: "general", label: "General Settings" },
              { key: "emailTemplate", label: "Email Template Settings" },
              { key: "paymentQr", label: "Payment QR Settings" },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Box
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  sx={{
                    px: 1.8,
                    py: 0.6,
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 700 : 600,
                    bgcolor: isActive
                      ? "primary.main"
                      : theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(74,63,107,0.06)",
                    color: isActive ? "#ffffff" : "text.secondary",
                    border: isActive
                      ? "1px solid transparent"
                      : `1px solid ${theme.palette.divider}`,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isActive
                        ? "primary.dark"
                        : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(74,63,107,0.12)",
                      color: isActive ? "#ffffff" : "text.primary",
                    },
                  }}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Box>

        {/* ── 1. General Settings (including OTP / 2FA & MFA) ───────────────── */}
        {activeTab === "general" && (
          <Box sx={{ width: "100%" }}>
            <Card
              sx={{
                borderRadius: "16px",
                border: (t) => `1px solid ${t.palette.divider}`,
                p: { xs: 2, md: 3 },
                bgcolor: "background.paper",
                boxShadow: isDark
                  ? "0 4px 20px rgba(0,0,0,0.3)"
                  : "0 4px 20px rgba(74, 63, 107, 0.05)",
              }}
            >
              {/* General Settings Section Header */}
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
                    Basic organization information and preferences.
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
                      onChange={(e) => handleBirthdayExemptToggle(e.target.checked)}
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

                <Divider sx={{ my: 1.5 }} />

                {/* 2. Forgot Password OTP Settings Section Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 0.5 }}>
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
                    <LockResetOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Forgot Password OTP Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                      Configure email OTP expiry time and maximum retry limits for password reset requests.
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label="Forgot Password OTP Expiry (minutes)"
                      value={settings.otpExpiry}
                      onChange={(e) => handleChange("otpExpiry", e.target.value)}
                      restrictType="numberonly"
                      placeholder="e.g. 10"
                      required
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                      Validity window for the 6-digit OTP code emailed to users during password reset.
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label="Max Retry Attempts"
                      value={settings.maxRetry}
                      onChange={(e) => handleChange("maxRetry", e.target.value)}
                      restrictType="numberonly"
                      placeholder="e.g. 3"
                      required
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                      Number of incorrect attempts allowed before the OTP is invalidated and locked.
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1.5 }} />

                {/* 3. Two-Factor Authentication (2FA) Section Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 0.5 }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: "10px",
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#059669",
                    }}
                  >
                    <SecurityOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Two-Factor Authentication (2FA)
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                      Secure account logins with an Authenticator app (Google Authenticator, Microsoft Authenticator).
                    </Typography>
                  </Box>
                </Box>

                {/* Personal 2FA Device Configuration at UI level */}
                <MfaSettings
                  embedded
                  title=""
                  onDevicesChange={(devs) => setMfaDevicesCount(devs.length)}
                />
              </Stack>

              {/* Save Button for General Settings */}
              <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "center" }}>
                <AppButton
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={handleSaveGeneral}
                  sx={{
                    bgcolor: "#0284c7 !important",
                    "&:hover": { bgcolor: "#0369a1 !important" },
                    px: 3,
                    py: 1,
                    fontWeight: 700,
                  }}
                >
                  Save General Settings
                </AppButton>
              </Box>
            </Card>
          </Box>
        )}

        {/* ── 2. Email Template Settings (Subject & Description against Category) ── */}
        {activeTab === "emailTemplate" && (() => {
          const currentCategoryLabel =
            selectedCategoryId === "all"
              ? "All Categories (General)"
              : categoriesList.find((c) => String(c.eventTypeId) === String(selectedCategoryId))?.eventTypeName || "Birthday";

          const previewDueDate = dayjs().endOf("month").format("DD/MM/YYYY");
          const livePreviewData = {
            memberName: "Daniel",
            categoryName: selectedCategoryId === "all" ? "Birthday" : currentCategoryLabel,
            amount: 500,
            dueDate: previewDueDate,
            orgName: settings.orgName || "Unit 1A",
            paymentLink: liveUpiUri,
            qrImageUrl: dynamicQrUrl,
          };

          const rawSubject = templateSubject || "Contribution Notice - {categoryName}";
          const liveSubject = interpolatePlaceholders(rawSubject, livePreviewData);

          const defaultDesc =
            "Dear {memberName},\n\nThis is a notification regarding your {categoryName} contribution of {amount}.\n\nDue Date: {dueDate}\n\nThank You,\n{orgName}";
          const rawDesc = templateDescription || defaultDesc;
          const liveBody = interpolatePlaceholders(rawDesc, livePreviewData)
            .replace(/<img[^>]*>/gi, "")
            .replace(/https?:\/\/\S+/gi, "")
            .trim();

          return (
            <Grid container spacing={2.5} alignItems="flex-start">
              {/* Left: Email Template Form (65-70% on desktop) */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card
                  sx={{
                    borderRadius: "16px",
                    border: (t) => `1px solid ${t.palette.divider}`,
                    p: 2.5,
                    bgcolor: "background.paper",
                  }}
                >
                  <Box>
                    {/* Card Header with Test Email & Logs action buttons */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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

                        </Box>
                      </Box>

                      {/* Quick Action Buttons */}
                      <Box sx={{ display: "flex", gap: 1 }}>
                        
                        
                      </Box>
                    </Box>

                    <Stack spacing={2.4} sx={{ mt: 2 }}>
                      {/* 1. Category Selector Dropdown */}
                      <Box>
                        <AppSelect
                          label="Event Type"
                          value={selectedCategoryId}
                          onChange={(e) => handleTemplateCategoryChange(e.target.value)}
                          options={categorySelectOptions}
                          required
                          fullWidth
                        />
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                          Select a category (e.g. Birthday, Team Dinner, Farewell). Each category has one common template shared by all its events.
                        </Typography>
                      </Box>

                      {/* 2. Dual Template Selector (Initial Email vs Reminder Email) */}
                      <Box>
                        <Typography variant="caption" fontWeight={750} sx={{ color: "text.secondary", mb: 0.6, display: "block" }}>
                          Template Type
                        </Typography>
                        <ToggleButtonGroup
                          value={templateType}
                          exclusive
                          onChange={(_, val) => handleTemplateTypeChange(val)}
                          size="small"
                          sx={{
                            width: "100%",
                            borderRadius: "8px",
                            "& .MuiToggleButton-root": {
                              flex: 1,
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              py: 0.8,
                              color: "text.secondary",
                              border: `1px solid ${theme.palette.divider}`,
                              "&.Mui-selected": {
                                bgcolor: "#0284c7",
                                color: "#ffffff",
                                "&:hover": { bgcolor: "#0369a1" },
                              },
                            },
                          }}
                        >
                          <ToggleButton value="initial">
                            Initial Email Template (Day 1 of Month)
                          </ToggleButton>
                          <ToggleButton value="reminder">
                            Reminder Email Template (Day 11, Day 21, Day 31)
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>

                      {/* 3. Email Subject */}
                      <AppInput
                        label={`Email Subject (${templateType === "initial" ? "Initial Email" : "Reminder Email"})`}
                        value={templateSubject}
                        onChange={(e) => setTemplateSubject(e.target.value)}
                        placeholder="e.g. Contribution Payment Reminder - {categoryName}"
                        required
                      />

                      {/* 4. Email Description */}
                      <AppTextArea
                        label={`Email Description (${templateType === "initial" ? "Initial Email" : "Reminder Email"})`}
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Enter email message / description for the category..."
                        minRows={6}
                        required
                      />

                      <Divider sx={{ my: 0.5 }} />

                      {/* 6. Automated Monthly & Reminder Configuration Card */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "12px",
                          border: `1px solid ${theme.palette.divider}`,
                          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                          <ScheduleOutlinedIcon sx={{ fontSize: 19, color: "#0284c7" }} />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
                            Automated Monthly & 10-Day Reminder Settings
                          </Typography>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <AppSwitch
                              label="Enable Monthly Email (Day 1)"
                              checked={settings.enableMonthlyEmail !== false}
                              onChange={(e) => handleChange("enableMonthlyEmail", e.target.checked)}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block", pl: 0.5 }}>
                              Automatically dispatch initial email on 1st of month to users with pending contributions.
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <AppSwitch
                              label="Enable Recurring Reminders"
                              checked={settings.enableReminderEmail !== false}
                              onChange={(e) => handleChange("enableReminderEmail", e.target.checked)}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block", pl: 0.5 }}>
                              Send reminders every 10 days for unpaid contributions (stops once paid).
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 12, sm: 6 }}>
                            <AppInput
                              label="Reminder Interval (Days)"
                              value={settings.reminderIntervalDays || "10"}
                              onChange={(e) => handleChange("reminderIntervalDays", e.target.value)}
                              restrictType="numberonly"
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <AppInput
                              label="Maximum Reminders Allowed"
                              value={settings.maxReminders || "3"}
                              onChange={(e) => handleChange("maxReminders", e.target.value)}
                              restrictType="numberonly"
                            />
                          </Grid>
                        </Grid>
                        {/* Manual Scheduler Trigger Action */}
                        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                        </Box>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Save Button for Email Template Settings */}
                  <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "center", gap: 2 }}>
                    <AppButton
                      variant="contained"
                      startIcon={<SaveOutlinedIcon />}
                      onClick={handleSaveEmailTemplate}
                      sx={{
                        bgcolor: "#0284c7 !important",
                        "&:hover": { bgcolor: "#0369a1 !important" },
                        px: 3,
                        fontWeight: 700,
                      }}
                    >
                      Save 
                    </AppButton>
                  </Box>
                </Card>
              </Grid>

              {/* Right: Live Email Preview Panel (30-35% on desktop) */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card
                  sx={{
                    borderRadius: "16px",
                    border: (t) => `1px solid ${t.palette.divider}`,
                    p: 2.5,
                    bgcolor: "background.paper",
                  }}
                >
                  {/* Header */}
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
                      <VisibilityOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        Email Preview
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                        Live simulation using current template values.
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Subject Line Display */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "10px",
                      bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      border: (t) => `1px solid ${t.palette.divider}`,
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={750}
                      sx={{ color: "text.secondary", textTransform: "uppercase", fontSize: "0.66rem", letterSpacing: "0.05em", display: "block" }}
                    >
                      Subject Preview
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={750}
                      sx={{ mt: 0.3, color: "#0284c7", wordBreak: "break-word" }}
                    >
                      {liveSubject || "Contribution Notice - Birthday"}
                    </Typography>
                  </Box>

                  {/* Simulated Email Canvas */}
                  <Box
                    sx={{
                      borderRadius: "12px",
                      border: (t) => `1px solid ${t.palette.divider}`,
                      bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
                      p: 2,
                      boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Simulated Email Headers */}
                    <Box sx={{ pb: 1.2, mb: 1.5, borderBottom: (t) => `1px dashed ${t.palette.divider}` }}>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem" }}>
                        <strong>From:</strong> {settings.orgName || "Unit 1A"} &lt;notifications@unit1a.org&gt;
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem", mt: 0.2 }}>
                        <strong>To:</strong> Daniel &lt;daniel@example.com&gt;
                      </Typography>
                    </Box>

                    {/* Email Body text */}
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-line",
                        color: "text.primary",
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                        mb: 2,
                      }}
                    >
                      {liveBody || `Dear Daniel,\n\nThis is a notification regarding your ${currentCategoryLabel} contribution of ₹500.\n\nDue Date: ${previewDueDate}\n\nThank You,\n${settings.orgName || "Unit 1A"}`}
                    </Typography>

                    {/* QR Code Container */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                        border: (t) => `1px solid ${t.palette.divider}`,
                        textAlign: "center",
                        my: 2,
                      }}
                    >
                      <Typography variant="caption" fontWeight={750} sx={{ display: "block", color: "text.secondary", mb: 1, fontSize: "0.7rem" }}>
                        Live Dynamic Payment QR:
                      </Typography>
                      <Box
                        component="img"
                        src={dynamicQrUrl}
                        alt="Live QR Code Preview"
                        sx={{
                          width: 125,
                          height: 125,
                          borderRadius: "8px",
                          border: "1.5px solid #0284c7",
                          p: 0.4,
                          bgcolor: "#fff",
                          display: "block",
                          margin: "0 auto",
                          objectFit: "contain",
                          boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
                        }}
                      />
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.66rem", mt: 0.8 }}>
                        Scan using Google Pay, PhonePe, or Paytm
                      </Typography>
                    </Box>


                    {/* Email Footer */}
                    <Box sx={{ mt: 2, pt: 1, borderTop: (t) => `1px dashed ${t.palette.divider}` }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        Thank You,<br />
                        <strong>{settings.orgName || "Unit 1A"}</strong>
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          );
        })()}



        {/* ── 4. Payment QR Settings ──────────────────────────────────────────── */}
        {activeTab === "paymentQr" && (
          <Grid container spacing={2.5} alignItems="flex-start">
            {/* Left: Payment QR Form (65-70% on desktop) */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
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

                  <Stack spacing={2.2} sx={{ mt: 2 }}>
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
                            py: 0.7,
                            fontSize: "0.78rem",
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
                          <AutoAwesomeOutlinedIcon sx={{ fontSize: 15, mr: 0.6 }} />
                          Dynamic UPI QR
                        </ToggleButton>
                        <ToggleButton value="uploaded">
                          <CloudUploadOutlinedIcon sx={{ fontSize: 15, mr: 0.6 }} />
                          Uploaded QR
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {/* Receiver Name and UPI ID */}
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
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
                      <Grid size={{ xs: 12, sm: 6 }}>
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

                    {/* Upload Section / Static Fallback */}
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.6 }}>
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

                      <Box sx={{ width: "100%", mt: 0.5 }}>
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
                            p: 2,
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
                                  mt: 1,
                                  height: 20,
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  bgcolor:
                                    settings.qrMode === "uploaded"
                                      ? "rgba(22, 163, 74, 0.12)"
                                      : "rgba(234, 88, 12, 0.12)",
                                  color: settings.qrMode === "uploaded" ? "#16a34a" : "#ea580c",
                                }}
                              />
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.2 }}>
                                <AppButton
                                  size="small"
                                  variant="outlined"
                                  startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: 14 }} />}
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
                                  sx={{ fontSize: "0.72rem", height: 28 }}
                                >
                                  Remove
                                </AppButton>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              <CloudUploadOutlinedIcon sx={{ fontSize: 28, color: "#0284c7" }} />
                              <Typography variant="body2" sx={{ display: "block", fontWeight: 700, fontSize: "0.8rem", mt: 0.4 }}>
                                Click to upload static QR code image
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                                PNG or JPG format (up to 2MB)
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Stack>
                </Box>

                {/* Save Button for Payment QR Settings */}
                <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "center" }}>
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

            {/* Right: Live QR Preview Panel (30-35% on desktop) */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  p: 2.5,
                  bgcolor: "background.paper",
                }}
              >
                {/* Header */}
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
                      Live QR Preview
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
                      Real-time scannable payment QR code.
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                <Stack spacing={2.2} alignItems="center" sx={{ textAlign: "center" }}>
                  {/* Receiver Name */}
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="caption" fontWeight={750} sx={{ color: "text.secondary", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em", display: "block" }}>
                      Receiver Name
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.2, color: "text.primary" }}>
                      {settings.qrReceiverName || "Daniel A"}
                    </Typography>
                  </Box>

                  {/* Prominent QR Code Image */}
                  <Box
                    sx={{
                      p: 1.2,
                      bgcolor: "#ffffff",
                      borderRadius: "16px",
                      border: "2px solid #0284c7",
                      boxShadow: "0 6px 20px rgba(2, 132, 199, 0.18)",
                      display: "inline-block",
                      transition: "transform 0.2s ease",
                      "&:hover": { transform: "scale(1.02)" },
                    }}
                  >
                    <Box
                      component="img"
                      src={settings.qrMode === "uploaded" && settings.qrImage ? settings.qrImage : dynamicQrUrl}
                      alt="Payment QR Code"
                      sx={{
                        width: 170,
                        height: 170,
                        display: "block",
                        borderRadius: "10px",
                        objectFit: "contain",
                      }}
                    />
                  </Box>

                  {/* UPI ID Display */}
                  <Box
                    sx={{
                      width: "100%",
                      p: 1.2,
                      borderRadius: "10px",
                      bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block" }}>
                      UPI ID
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={750}
                      sx={{
                        fontFamily: "monospace",
                        color: "#0284c7",
                        fontSize: "0.84rem",
                        wordBreak: "break-all",
                        mt: 0.2,
                      }}
                    >
                      {settings.qrUpiId || "danielrobertanto604@okicici"}
                    </Typography>
                  </Box>

                  {/* Copy Action Buttons */}
                  <Stack direction="row" spacing={1} sx={{ width: "100%", justifyContent: "center" }}>
                    <AppButton
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />}
                      onClick={() => copyToClipboard(settings.qrUpiId, "UPI ID")}
                      sx={{ flex: 1, fontSize: "0.72rem", height: 32 }}
                    >
                      Copy UPI
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />}
                      onClick={() => copyToClipboard(liveUpiUri, "UPI Link")}
                      sx={{ flex: 1, fontSize: "0.72rem", height: 32 }}
                    >
                      Copy URI
                    </AppButton>
                  </Stack>

                  {/* Scannable Apps Support Pill */}
                  <Chip
                    label="Scannable with Google Pay, PhonePe, Paytm"
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      bgcolor: "#0284c7",
                      color: "#ffffff",
                      px: 0.5,
                    }}
                  />

                  {/* Mode Badge */}
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                    {settings.qrMode === "uploaded" ? "Custom Uploaded Mode" : "Dynamic Instant UPI QR Mode"}
                  </Typography>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        )}
        </Box>
      </Paper>

      {/* Send Test Email Dialog */}
      <SendTestEmailDialog
        open={testEmailDialogOpen}
        onClose={() => setTestEmailDialogOpen(false)}
        categoryOptions={categorySelectOptions}
        initialCategoryId={selectedCategoryId}
      />

      {/* Email Reminder Sending History / Audit Logs Dialog */}
      <EmailReminderLogsDialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
      />
    </div>
  );
}
