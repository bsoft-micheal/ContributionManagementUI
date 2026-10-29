import React, { useState, useEffect, useRef, useMemo } from "react";
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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
  getAllPaymentQrConfigs,
  savePaymentQrConfigForEventType,
  normalizeEventTypeName,
  getPaymentQrConfig,
  EVENT_QR_STORAGE_KEY,
} from "../../utils/upiQrHelper";
import { formatGridDate } from "../../utils/dateHelper";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppSwitch from "../../components/common/AppSwitch";
import AppButton from "../../components/common/AppButton";
import AppTextArea from "../../components/common/AppTextArea";
import AppDataTable from "../../components/common/AppDataTable";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import MfaSettings from "../../components/common/MfaSettings";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { getRightsForPage, hasActionPermission } from "../../utils/rightsHelper";
import { useAppToast } from "../../components/common/AppToast";
import {
  getSystemSettingsAsync,
  updateSystemSettings,
  updateSystemSettingsAsync,
  getAllPaymentQrSettingsAsync,
  savePaymentQrSettingAsync,
  triggerHangfireRemindersAsync,
} from "../../services/settingsService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getUsersAsync } from "../../services/userService";
import { getHangfireDashboardUrl } from "../../services/apiClient";
import SendTestEmailDialog from "../../components/settings/SendTestEmailDialog";
import EmailReminderLogsDialog from "../../components/settings/EmailReminderLogsDialog";
import {
  TOAST_MESSAGES,
  COMMON_STRINGS,
  MENU_FEATURE_IDS,
  SETTINGS_STORAGE_KEYS,
  SETTINGS_VALIDATION_LIMITS,
  SETTINGS_DEFAULTS,
} from "../../constants";
import defaultPaymentQrPlaceholder from "../../assets/defaultPaymentQr";
import {
  DEFAULT_CATEGORY_TEMPLATES,
  getCategoryTemplates,
  resolveCategoryTemplate,
  evaluateAndRunScheduler,
  interpolatePlaceholders,
} from "../../services/emailReminderScheduler";

const defaultPaymentQr = defaultPaymentQrPlaceholder;

const isGuid = (val) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()));

const initialSettings = {
  // General & Notifications
  orgName: "",
  birthdayMembersExempt: false,
  allowedMultipleEvent: false,
  allowMultipleEvents: false,
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
  reminderIntervalDays: SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS,
  reminderIntervalValue: SETTINGS_DEFAULTS.REMINDER_INTERVAL_VALUE,
  reminderIntervalUnit: SETTINGS_DEFAULTS.REMINDER_INTERVAL_UNIT,
  maxReminders: SETTINGS_DEFAULTS.MAX_REMINDERS,

  // OTP / 2FA
  otpExpiry: SETTINGS_DEFAULTS.OTP_EXPIRY,
  maxRetry: SETTINGS_DEFAULTS.MAX_RETRY,
  enableOtpLogin: true,
  enable2faAdmin: false,

  // Payment QR
  qrReceiverName: "",
  qrUpiId: "",
  qrMode: SETTINGS_DEFAULTS.QR_MODE_GENERATED, // "generated" | "uploaded"
  qrPreviewAmount: "",
  qrImage: null,
  paymentQrConfigs: {},
};

export default function SettingsPage() {
  const theme = useTheme();
  const toast = useAppToast();
  const isDark = theme.palette.mode === "dark";
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const canUpdateSettings = hasActionPermission("Update Settings", MENU_FEATURE_IDS.SETTINGS, authState?.role).canExecute;
  const hasWriteAccess = canUpdateSettings && canEdit;
  const isMemberRole = String(authState?.role || authState?.user?.role || "").toLowerCase().trim() === "member";

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...initialSettings,
          ...parsed,
          birthdayMembersExempt:
            parsed.birthdayMembersExempt !== undefined
              ? parsed.birthdayMembersExempt
              : false,
          allowedMultipleEvent:
            parsed.allowedMultipleEvent !== undefined
              ? Boolean(parsed.allowedMultipleEvent)
              : parsed.allowMultipleEvents !== undefined
                ? Boolean(parsed.allowMultipleEvents)
                : false,
          allowMultipleEvents:
            parsed.allowedMultipleEvent !== undefined
              ? Boolean(parsed.allowedMultipleEvent)
              : parsed.allowMultipleEvents !== undefined
                ? Boolean(parsed.allowMultipleEvents)
                : false,
        };
      } catch (e) {
        return initialSettings;
      }
    }
    return initialSettings;
  });

  const [categoriesList, setCategoriesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedTemplateCategoryId) return parsed.selectedTemplateCategoryId;
      } catch (e) { }
    }
    return "all";
  });
  const [templateType, setTemplateType] = useState("initial"); // "initial" | "reminder"
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [triggeringHangfire, setTriggeringHangfire] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => dayjs().format("DD MMM YYYY"));
  const [mfaDevicesCount, setMfaDevicesCount] = useState(1);
  const mfaRef = useRef(null);
  const [generalErrors, setGeneralErrors] = useState({});
  const [templateErrors, setTemplateErrors] = useState({});

  const [activeTab, setActiveTab] = useState("general");

  const availableTabs = useMemo(() => {
    if (isMemberRole) {
      return [{ key: "general", label: "General Settings" }];
    }
    return [
      { key: "general", label: "General Settings" },
      { key: "emailTemplate", label: "Email Template Settings" },
      { key: "paymentQr", label: "Payment QR Settings" },
    ];
  }, [isMemberRole]);

  useEffect(() => {
    if (isMemberRole && activeTab !== "general") {
      setActiveTab("general");
    }
  }, [isMemberRole, activeTab]);

  const fileInputRef = useRef(null);

  // Per-event-type Payment QR State (strictly dynamically persisted from Database)
  const [eventPaymentQrConfigs, setEventPaymentQrConfigs] = useState(() => {
    try {
      const raw = localStorage.getItem(EVENT_QR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch { }
    return {};
  });
  const [selectedQrEventType, setSelectedQrEventType] = useState("");
  const [deleteQrEventType, setDeleteQrEventType] = useState(null);

  // Dynamically derive event type options strictly from active categoriesList
  const qrEventTypeOptions = useMemo(() => {
    const list = [];
    if (Array.isArray(categoriesList) && categoriesList.length > 0) {
      categoriesList.forEach((c) => {
        const name = c.eventTypeName || c.name;
        if (name && !list.includes(name)) list.push(name);
      });
    }
    return list.map((t) => ({ label: t, value: t }));
  }, [categoriesList]);

  // If an event type was selected but it was removed from options, reset to empty
  useEffect(() => {
    if (selectedQrEventType && qrEventTypeOptions.length > 0) {
      if (!qrEventTypeOptions.some((o) => o.value === selectedQrEventType)) {
        setSelectedQrEventType("");
      }
    }
  }, [qrEventTypeOptions, selectedQrEventType]);

  const currentQrConfig = useMemo(() => {
    if (!selectedQrEventType) {
      return {
        receiverName: "",
        upiId: "",
        qrMode: SETTINGS_DEFAULTS.QR_MODE_GENERATED,
        qrImage: null,
        accountLabel: "",
        remarks: "",
        previewAmount: "",
        isActive: true,
      };
    }
    const found = eventPaymentQrConfigs[selectedQrEventType];
    if (found) {
      const mode = (found.qrMode || SETTINGS_DEFAULTS.QR_MODE_GENERATED).toLowerCase() === "uploaded" ? "uploaded" : "generated";
      return {
        receiverName: mode === "uploaded" ? "" : (found.receiverName || ""),
        upiId: mode === "uploaded" ? "" : (found.upiId || ""),
        qrMode: mode,
        qrImage: mode === "uploaded" ? (found.qrImage || null) : null,
        accountLabel: found.accountLabel || "",
        remarks: found.remarks || "",
        previewAmount: found.previewAmount ? String(found.previewAmount).trim() : "",
        isActive: found.isActive !== undefined ? found.isActive : true,
      };
    }
    return {
      receiverName: "",
      upiId: "",
      qrMode: SETTINGS_DEFAULTS.QR_MODE_GENERATED,
      qrImage: null,
      accountLabel: "",
      remarks: "",
      previewAmount: "",
      isActive: true,
    };
  }, [eventPaymentQrConfigs, selectedQrEventType]);

  const isUploadedMode = (currentQrConfig.qrMode || SETTINGS_DEFAULTS.QR_MODE_GENERATED) === "uploaded";

  const isCurrentConfigured = isUploadedMode
    ? Boolean(currentQrConfig.qrImage)
    : Boolean(
        currentQrConfig.upiId && currentQrConfig.upiId.trim() &&
        currentQrConfig.receiverName && currentQrConfig.receiverName.trim()
      );

  const upiValidation = !isUploadedMode && currentQrConfig.upiId
    ? validateUpiId(currentQrConfig.upiId)
    : { isValid: false, error: "" };

  const upiError = !selectedQrEventType || isUploadedMode
    ? ""
    : !currentQrConfig.upiId?.trim()
      ? (COMMON_STRINGS?.VALIDATION?.REQUIRED_FIELD || "This field is required")
      : currentQrConfig.upiId.length > SETTINGS_VALIDATION_LIMITS.UPI_ID_MAX_LENGTH
        ? `UPI ID cannot exceed ${SETTINGS_VALIDATION_LIMITS.UPI_ID_MAX_LENGTH} characters.`
        : !upiValidation.isValid
          ? (upiValidation.error || "Enter a valid UPI ID.")
          : "";

  const receiverError = !selectedQrEventType || isUploadedMode
    ? ""
    : !currentQrConfig.receiverName?.trim()
      ? (COMMON_STRINGS?.VALIDATION?.REQUIRED_FIELD || "This field is required")
      : currentQrConfig.receiverName.length > SETTINGS_VALIDATION_LIMITS.RECEIVER_NAME_MAX_LENGTH
        ? `Receiver name cannot exceed ${SETTINGS_VALIDATION_LIMITS.RECEIVER_NAME_MAX_LENGTH} characters.`
        : "";

  const liveUpiUri = !isUploadedMode && isCurrentConfigured
    ? buildUpiPaymentUri({
      upiId: currentQrConfig.upiId,
      receiverName: currentQrConfig.receiverName,
      amount: currentQrConfig.previewAmount && Number(currentQrConfig.previewAmount) > 0 ? Number(currentQrConfig.previewAmount) : undefined,
      note: `Contribution for ${selectedQrEventType}`,
    })
    : "";

  const dynamicQrUrl = isUploadedMode
    ? (currentQrConfig.qrImage || "")
    : (isCurrentConfigured ? generateQrPngDataUrl(liveUpiUri, 300) : "");

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const userMap = useMemo(() => {
    const map = {};
    if (Array.isArray(usersList)) {
      usersList.forEach((u) => {
        const id = String(u.userId || u.id || "").toLowerCase();
        const name = u.fullName || u.name || u.username;
        if (id && name) map[id] = name;
        if (u.username && name) map[String(u.username).toLowerCase()] = name;
      });
    }
    return map;
  }, [usersList]);

  const currentUserName = useMemo(() => {
    return (
      authState?.fullName?.trim() ||
      authState?.username?.trim() ||
      authState?.name?.trim() ||
      authState?.user?.fullName?.trim() ||
      authState?.user?.username?.trim() ||
      (isMemberRole ? SETTINGS_DEFAULTS.FALLBACK_USER_NAME : "Admin")
    );
  }, [authState, isMemberRole]);

  const resolveUserName = (rawCreatedBy) => {
    if (!rawCreatedBy || rawCreatedBy === "--") {
      return currentUserName;
    }
    const str = String(rawCreatedBy).trim();
    if (isGuid(str)) {
      return userMap[str.toLowerCase()] || currentUserName;
    }
    if (str.toLowerCase() === "admin") {
      const adminUser = usersList.find((u) => {
        const role = String(u.roleName || u.role || "").toLowerCase();
        return role === "admin";
      });
      return adminUser?.fullName || adminUser?.name || adminUser?.username || currentUserName;
    }
    if (userMap[str.toLowerCase()]) {
      return userMap[str.toLowerCase()];
    }
    return str;
  };

  // Directory of all Event Types and their configured UPI IDs for the AppDataTable Grid
  const qrTableData = useMemo(() => {
    const rows = [];
    const processedTypes = new Set();

    if (Array.isArray(categoriesList) && categoriesList.length > 0) {
      categoriesList.forEach((c) => {
        const typeName = c.eventTypeName || c.name || "";
        if (typeName && !processedTypes.has(typeName.toLowerCase())) {
          processedTypes.add(typeName.toLowerCase());
          const matchKey = Object.keys(eventPaymentQrConfigs).find((k) => k.toLowerCase() === typeName.toLowerCase());
          const config = matchKey ? eventPaymentQrConfigs[matchKey] : null;
          const isDeleted = Boolean(config && (config.isDeleted || config.IsDeleted));
          const rowMode = isDeleted ? "generated" : ((config?.qrMode || "generated").toLowerCase() === "uploaded" ? "uploaded" : "generated");
          const hasUploaded = Boolean(!isDeleted && rowMode === "uploaded" && config?.qrImage);
          const hasDynamic = Boolean(!isDeleted && rowMode === "generated" && config?.upiId && config?.upiId.trim() && config?.receiverName && config?.receiverName.trim());
          const isConfigured = hasUploaded || hasDynamic;

          const rawCreatedBy = config?.createdBy || c?.createdBy || c?.CreatedBy;
          const resolvedCreatedBy = resolveUserName(rawCreatedBy);

          rows.push({
            id: c.eventTypeId || typeName,
            eventTypeId: c.eventTypeId,
            eventTypeName: typeName,
            receiverName: isDeleted ? "" : (rowMode === "uploaded" ? (config?.accountLabel || "--") : (config?.receiverName || config?.qrReceiverName || "")),
            upiId: isDeleted ? "" : (rowMode === "uploaded" ? "" : (config?.upiId || config?.qrUpiId || "")),
            previewAmount: isDeleted ? "" : (config?.previewAmount || ""),
            qrMode: rowMode,
            qrImage: isDeleted ? null : (config?.qrImage || null),
            accountLabel: isDeleted ? "" : (config?.accountLabel || ""),
            remarks: isDeleted ? "" : (config?.remarks || ""),
            isConfigured,
            isDeleted: isDeleted,
            isActive: isDeleted ? false : (config ? config.isActive !== false : false),
            createdBy: resolvedCreatedBy,
            createdOn: config?.createdOn || config?.createdAt || c?.createdOn || c?.CreatedOn || null,
          });
        }
      });
    }

    return rows;
  }, [categoriesList, eventPaymentQrConfigs]);

  const qrTableColumns = useMemo(
    () => [
      {
        label: "Action",
        render: (row) => {
          const isSelected = selectedQrEventType === row.eventTypeName;
          return (
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              <Tooltip title={`Configure Payment QR for ${row.eventTypeName}`}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedQrEventType(row.eventTypeName);
                    const formCard = document.getElementById("payment-qr-form-card");
                    if (formCard) {
                      formCard.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  sx={{
                    p: 0.4,
                    bgcolor: isSelected ? "rgba(74, 63, 107, 0.15)" : "transparent",
                    color: isSelected ? "#4a3f6b" : "inherit",
                    "&:hover": { bgcolor: "rgba(74, 63, 107, 0.2)", color: "#4a3f6b" },
                  }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              {row.upiId && (
                <Tooltip title="Copy UPI ID">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(row.upiId, `UPI ID (${row.eventTypeName})`)}
                    sx={{ p: 0.4, "&:hover": { color: "#4a3f6b" } }}
                  >
                    <ContentCopyOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
              {row.isConfigured && (
                <Tooltip title={`Delete Payment QR for ${row.eventTypeName}`}>
                  <IconButton
                    size="small"
                    onClick={() => setDeleteQrEventType(row.eventTypeName)}
                    sx={{
                      p: 0.4,
                      color: "#dc2626",
                      "&:hover": { bgcolor: "rgba(220, 38, 38, 0.1)" },
                    }}
                  >
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
      },
      {
        label: "Event Type",
        key: "eventTypeName",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: row.isConfigured ? "#16a34a" : "#cbd5e1",
              }}
            />
            <Typography variant="body2" fontWeight={700}>
              {row.eventTypeName}
            </Typography>
            {selectedQrEventType === row.eventTypeName && (
              <Chip
                label="Selected"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: "rgba(74, 63, 107, 0.12)",
                  color: "#4a3f6b",
                }}
              />
            )}
          </Box>
        ),
      },
      {
        label: "UPI ID",
        key: "upiId",
        render: (row) => {
          if (row.qrMode === "uploaded") {
            return (
              <Typography variant="caption" sx={{ color: "#ea580c", fontWeight: 700, fontStyle: "italic" }}>
                Custom QR Image
              </Typography>
            );
          }
          return row.upiId ? (
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.82rem",
                fontWeight: 650,
                color: "#4a3f6b",
              }}
            >
              {row.upiId}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              -- Not Configured --
            </Typography>
          );
        },
      },
      {
        label: "Receiver Name",
        key: "receiverName",
        render: (row) => (
          <Typography variant="body2" sx={{ fontSize: "0.82rem", color: row.receiverName ? "text.primary" : "text.secondary" }}>
            {row.receiverName || "--"}
          </Typography>
        ),
      },
      {
        label: "QR Mode",
        key: "qrMode",
        render: (row) => {
          if (!row.isConfigured) {
            return (
              <Chip
                label="None"
                size="small"
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600, bgcolor: "rgba(148, 163, 184, 0.15)", color: "#64748b" }}
              />
            );
          }
          return row.qrMode === "uploaded" ? (
            <Chip
              label="Uploaded QR"
              size="small"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, bgcolor: "rgba(234, 88, 12, 0.12)", color: "#ea580c" }}
            />
          ) : (
            <Chip
              label="Dynamic UPI QR"
              size="small"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, bgcolor: "rgba(74, 63, 107, 0.12)", color: "#4a3f6b" }}
            />
          );
        },
      },
      {
        label: "Status",
        key: "isConfigured",
        render: (row) => (
          <Chip
            label={row.isConfigured ? "Configured" : "Pending Setup"}
            size="small"
            sx={{
              height: 22,
              fontSize: "0.7rem",
              fontWeight: 700,
              bgcolor: row.isConfigured ? "rgba(22, 163, 74, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: row.isConfigured ? "#16a34a" : "#dc2626",
              border: row.isConfigured ? "1px solid rgba(22, 163, 74, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
            }}
          />
        ),
      },
      {
        label: "Created By",
        key: "createdBy",
        render: (row) => {
          const raw = row.createdBy || row.CreatedBy;
          const name = resolveUserName(raw);
          return (
            <Typography variant="body2" color="text.secondary">
              {name || "--"}
            </Typography>
          );
        },
      },
      {
        label: "Created On",
        key: "createdOn",
        render: (row) => formatGridDate(row.createdOn || row.CreatedOn || row.createdAt || row.CreatedAt),
      },
    ],
    [selectedQrEventType]
  );

  const sanitizeTemplateDesc = (desc) => {
    if (!desc) return desc;
    if (desc.includes("{eventDescription}") && !desc.includes("{eventDetails}") && !desc.includes("{eventTable}")) {
      return desc.replace("{eventDescription}", "{eventDetails}");
    }
    return desc;
  };

  // Helper to load template for given category and type
  const loadTemplateForCategoryAndType = (catId, tType, currentSettings = settings, catList = categoriesList) => {
    const foundCat = catList.find((c) => String(c.eventTypeId || c.id) === String(catId));
    const catName = foundCat?.eventTypeName || "";

    const custom = currentSettings.categoryTemplates?.[catId];
    if (custom) {
      if (tType === "initial" && (custom.initialSubject || custom.initialDescription)) {
        setTemplateSubject(custom.initialSubject || "");
        setTemplateDescription(sanitizeTemplateDesc(custom.initialDescription || ""));
        return;
      }
      if (tType === "reminder" && (custom.reminderSubject || custom.reminderDescription)) {
        setTemplateSubject(custom.reminderSubject || "");
        setTemplateDescription(sanitizeTemplateDesc(custom.reminderDescription || ""));
        return;
      }
    }

    const resolved = resolveCategoryTemplate(catId, catName, tType);
    setTemplateSubject(resolved.subject);
    setTemplateDescription(sanitizeTemplateDesc(resolved.description));
  };

  // Load categories list for the Email Template selector
  useEffect(() => {
    if (isMemberRole) return;
    const loadCategories = async () => {
      try {
        const types = await getEventTypesAsync();
        if (Array.isArray(types)) {
          setCategoriesList(types);
          // Check if selectedCategoryId is valid
          const validCat = types.find(
            (c) => String(c.eventTypeId || c.id || "").toLowerCase() === String(selectedCategoryId || "").toLowerCase()
          );
          const activeId = validCat ? String(validCat.eventTypeId || validCat.id) : "all";
          setSelectedCategoryId(activeId);
          loadTemplateForCategoryAndType(activeId, templateType, settings, types);
        }
      } catch {
        toast.error("Failed to load event types for email templates");
      }
    };
    loadCategories();

    // Load users list to resolve createdBy user names
    getUsersAsync()
      .then((res) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) setUsersList(list);
      })
      .catch(() => {});
  }, [isMemberRole]);

  // Load settings from backend on mount
  useEffect(() => {
    const loadBackendSettings = async () => {
      try {
        const data = await getSystemSettingsAsync();
        if (data && typeof data === "object") {
          const localSaved = localStorage.getItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS);
          let localMode = SETTINGS_DEFAULTS.QR_MODE_GENERATED;
          let backendCategoryTemplates = null;
          if (data.categoryTemplates) {
            try {
              backendCategoryTemplates = typeof data.categoryTemplates === "string"
                ? JSON.parse(data.categoryTemplates)
                : data.categoryTemplates;
            } catch (e) { }
          }

          let localCategoryTemplates =
            backendCategoryTemplates && typeof backendCategoryTemplates === "object" && Object.keys(backendCategoryTemplates).length > 0
              ? { ...DEFAULT_CATEGORY_TEMPLATES, ...backendCategoryTemplates }
              : DEFAULT_CATEGORY_TEMPLATES;

          let localReminderIntervalDays = data.reminderIntervalDays ? String(data.reminderIntervalDays) : SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS;
          let localReminderIntervalValue = data.reminderIntervalValue ? String(data.reminderIntervalValue) : localReminderIntervalDays;
          let localReminderIntervalUnit = data.reminderIntervalUnit || SETTINGS_DEFAULTS.REMINDER_INTERVAL_UNIT;
          let localMaxReminders = data.maxReminders ? String(data.maxReminders) : SETTINGS_DEFAULTS.MAX_REMINDERS;
          let localBirthdayMembersExempt = undefined;
          let localAllowedMultipleEvent = undefined;
          let localSelectedCategoryId = data.selectedTemplateCategoryId || "all";
          let localEnableMonthlyEmail = data.enableMonthlyEmail !== undefined ? data.enableMonthlyEmail : true;
          let localEnableReminderEmail = data.enableReminderEmail !== undefined ? data.enableReminderEmail : true;

          try {
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (parsed.qrMode) localMode = parsed.qrMode;
              if (!backendCategoryTemplates && parsed.categoryTemplates) {
                localCategoryTemplates = { ...DEFAULT_CATEGORY_TEMPLATES, ...parsed.categoryTemplates };
              }
              if (!data.selectedTemplateCategoryId && parsed.selectedTemplateCategoryId) {
                localSelectedCategoryId = parsed.selectedTemplateCategoryId;
              }
              if (data.enableMonthlyEmail === undefined && parsed.enableMonthlyEmail !== undefined) {
                localEnableMonthlyEmail = parsed.enableMonthlyEmail;
              }
              if (data.enableReminderEmail === undefined && parsed.enableReminderEmail !== undefined) {
                localEnableReminderEmail = parsed.enableReminderEmail;
              }
              if (!data.reminderIntervalDays && parsed.reminderIntervalDays) {
                localReminderIntervalDays = String(parsed.reminderIntervalDays);
              }
              if (!data.reminderIntervalValue && parsed.reminderIntervalValue) {
                localReminderIntervalValue = String(parsed.reminderIntervalValue);
              }
              if (!data.reminderIntervalUnit && parsed.reminderIntervalUnit) {
                localReminderIntervalUnit = String(parsed.reminderIntervalUnit);
              }
              if (!data.maxReminders && parsed.maxReminders) {
                localMaxReminders = String(parsed.maxReminders);
              }
              if (parsed.birthdayMembersExempt !== undefined) localBirthdayMembersExempt = parsed.birthdayMembersExempt;
              if (parsed.allowedMultipleEvent !== undefined) localAllowedMultipleEvent = parsed.allowedMultipleEvent;
              if (parsed.allowMultipleEvents !== undefined && localAllowedMultipleEvent === undefined) localAllowedMultipleEvent = parsed.allowMultipleEvents;
            }
          } catch (e) { }

          const resolvedBirthdayMembersExempt =
            data.birthdayMembersExempt !== undefined
              ? data.birthdayMembersExempt
              : localBirthdayMembersExempt !== undefined
                ? localBirthdayMembersExempt
                : false;

          const resolvedAllowedMultipleEvent =
            data.allowedMultipleEvent !== undefined
              ? Boolean(data.allowedMultipleEvent)
              : data.allowMultipleEvents !== undefined
                ? Boolean(data.allowMultipleEvents)
                : localAllowedMultipleEvent !== undefined
                  ? Boolean(localAllowedMultipleEvent)
                  : false;

          const cleanUpiId = data.qrUpiId || "";
          const cleanReceiver = data.qrReceiverName || "";

          const merged = {
            ...initialSettings,
            ...data,
            birthdayMembersExempt: resolvedBirthdayMembersExempt,
            allowedMultipleEvent: resolvedAllowedMultipleEvent,
            allowMultipleEvents: resolvedAllowedMultipleEvent,
            qrUpiId: cleanUpiId,
            qrReceiverName: cleanReceiver,
            qrMode: localMode,
            categoryTemplates: localCategoryTemplates,
            selectedTemplateCategoryId: localSelectedCategoryId,
            enableMonthlyEmail: localEnableMonthlyEmail,
            enableReminderEmail: localEnableReminderEmail,
            reminderIntervalDays: localReminderIntervalDays,
            reminderIntervalValue: localReminderIntervalValue,
            reminderIntervalUnit: localReminderIntervalUnit,
            maxReminders: localMaxReminders,
          };

          setSettings(merged);
          setSelectedCategoryId(localSelectedCategoryId);
          loadTemplateForCategoryAndType(localSelectedCategoryId, "initial", merged, categoriesList);
          localStorage.setItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(merged));

          // Fetch per-event-type QR settings from backend database system settings
          let loadedMap = {};
          const rawConfigs = data.paymentQrConfigs || data.PaymentQrConfigs;
          if (rawConfigs) {
            if (typeof rawConfigs === "string") {
              try {
                loadedMap = JSON.parse(rawConfigs);
              } catch {
                loadedMap = {};
              }
            } else if (typeof rawConfigs === "object") {
              loadedMap = { ...rawConfigs };
            }
          }
          setEventPaymentQrConfigs(loadedMap);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEYS.EVENT_PAYMENT_QR, JSON.stringify(loadedMap));
          } catch (e) { }
        }
      } catch {
        toast.error("Failed to load system settings");
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
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS);
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify({ ...parsed, ...updated, birthdayMembersExempt: checked }));
    } catch (e) { }

    try {
      await updateSystemSettings(updated);
    } catch {
      // Sync birthdayMembersExempt error handled silently
    }
  };

  // Immediate toggle and persistence for Allow Multiple Events setting
  const handleAllowedMultipleEventToggle = async (checked) => {
    const updated = {
      ...settings,
      allowedMultipleEvent: checked,
      allowMultipleEvents: checked,
    };
    setSettings(updated);

    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS);
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem(
        SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS,
        JSON.stringify({
          ...parsed,
          ...updated,
          allowedMultipleEvent: checked,
          allowMultipleEvents: checked,
        })
      );
    } catch (e) { }

    try {
      await updateSystemSettings(updated);
      toast.success(`Allow Multiple Events ${checked ? "enabled" : "disabled"} successfully.`);
    } catch {
      // Sync allowedMultipleEvent error handled silently
    }
  };

  const persistSettings = async (updated) => {
    try {
      const savedRes = await updateSystemSettings(updated);
      const finalState = { ...updated, ...savedRes };
      setSettings(finalState);
      setLastUpdated(dayjs().format("DD MMM YYYY"));
      localStorage.setItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(finalState));
      return finalState;
    } catch {
      setSettings(updated);
      setLastUpdated(dayjs().format("DD MMM YYYY"));
      localStorage.setItem(SETTINGS_STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(updated));
      return updated;
    }
  };

  // 1. Save General Settings (Org info + OTP / 2FA)
  const handleSaveGeneral = async () => {
    const newErrors = {};
    const requiredMsg = COMMON_STRINGS?.VALIDATION?.REQUIRED_FIELD || "This field is required";

    if (!settings.orgName || !settings.orgName.trim()) {
      newErrors.orgName = requiredMsg;
    } else if (settings.orgName.length > SETTINGS_VALIDATION_LIMITS.ORG_NAME_MAX_LENGTH) {
      newErrors.orgName = `Organization Name cannot exceed ${SETTINGS_VALIDATION_LIMITS.ORG_NAME_MAX_LENGTH} characters.`;
    }

    if (!settings.otpExpiry || !String(settings.otpExpiry).trim()) {
      newErrors.otpExpiry = requiredMsg;
    } else if (Number(settings.otpExpiry) <= 0) {
      newErrors.otpExpiry = "Please enter a valid OTP Expiry in minutes.";
    }

    if (!settings.maxRetry || !String(settings.maxRetry).trim()) {
      newErrors.maxRetry = requiredMsg;
    } else if (Number(settings.maxRetry) <= 0) {
      newErrors.maxRetry = "Please enter a valid Max Retry Attempt.";
    }

    let mfaValid = true;
    if (mfaRef.current?.isSettingUp) {
      mfaValid = mfaRef.current.validate();
    }

    if (Object.keys(newErrors).length > 0 || !mfaValid) {
      setGeneralErrors(newErrors);
      return;
    }

    setGeneralErrors({});

    try {
      if (mfaRef.current?.isSettingUp) {
        const verified = await mfaRef.current.verifyAndSave();
        if (!verified) return;
      }

      await persistSettings(settings);
      toast.success("General & Security settings saved successfully!");
    } catch {
      toast.error("Failed to save general settings");
    }
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
    const newErrors = {};
    const requiredMsg = COMMON_STRINGS?.VALIDATION?.REQUIRED_FIELD || "This field is required";

    if (!templateSubject || !templateSubject.trim()) {
      newErrors.templateSubject = requiredMsg;
    }
    if (!templateDescription || !templateDescription.trim()) {
      newErrors.templateDescription = requiredMsg;
    }

    const intervalVal = Number(settings.reminderIntervalValue || settings.reminderIntervalDays);
    const unit = settings.reminderIntervalUnit || SETTINGS_DEFAULTS.REMINDER_INTERVAL_UNIT;

    if (!settings.reminderIntervalValue && !settings.reminderIntervalDays) {
      newErrors.reminderInterval = requiredMsg;
    } else if (!intervalVal || isNaN(intervalVal) || intervalVal <= 0) {
      newErrors.reminderInterval = "Please enter a valid Reminder Interval number greater than 0.";
    }

    const maxRemindersNum = Number(settings.maxReminders);
    if (!settings.maxReminders) {
      newErrors.maxReminders = requiredMsg;
    } else if (isNaN(maxRemindersNum) || maxRemindersNum < 1 || maxRemindersNum > SETTINGS_VALIDATION_LIMITS.MAX_REMINDERS_MAX) {
      newErrors.maxReminders = `Please enter a valid Maximum Reminders limit between 1 and ${SETTINGS_VALIDATION_LIMITS.MAX_REMINDERS_MAX}.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setTemplateErrors(newErrors);
      return;
    }
    setTemplateErrors({});

    try {
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

      const foundCat = categoriesList.find((c) => String(c.eventTypeId || c.id) === String(selectedCategoryId));
      const catName = foundCat?.eventTypeName?.toLowerCase().trim();
      if (catName) {
        updatedCategoryTemplates[catName] = currentEntry;
      }

      let defaultSub = settings.emailSubject;
      let defaultDesc = settings.emailDescription;
      if (selectedCategoryId === "all") {
        if (templateType === "initial") {
          defaultSub = templateSubject;
          defaultDesc = templateDescription;
        }
        // Dynamically clear overrides matching registered categories instead of hardcoded strings
        if (Array.isArray(categoriesList)) {
          categoriesList.forEach((cat) => {
            const catNameKey = (cat.eventTypeName || cat.name || "").toLowerCase().trim();
            if (catNameKey && updatedCategoryTemplates[catNameKey]) {
              delete updatedCategoryTemplates[catNameKey];
            }
            const catIdKey = String(cat.eventTypeId || cat.id || "").toLowerCase().trim();
            if (catIdKey && updatedCategoryTemplates[catIdKey]) {
              delete updatedCategoryTemplates[catIdKey];
            }
          });
        }
      }

      const updated = {
        ...settings,
        emailSubject: defaultSub,
        emailDescription: defaultDesc,
        categoryTemplates: updatedCategoryTemplates,
        selectedTemplateCategoryId: selectedCategoryId,
        enableMonthlyEmail: settings.enableMonthlyEmail !== false,
        enableReminderEmail: settings.enableReminderEmail !== false,
        reminderIntervalDays: String(intervalVal),
        reminderIntervalValue: String(intervalVal),
        reminderIntervalUnit: unit,
        maxReminders: String(maxRemindersNum),
      };

      await persistSettings(updated);
      const targetLabel =
        selectedCategoryId === "all"
          ? "All Categories (Default)"
          : categoriesList.find((c) => String(c.eventTypeId || c.id) === String(selectedCategoryId))?.eventTypeName || "Selected Category";
      toast.success(`"${targetLabel}" (${templateType === "initial" ? "Initial Email" : "Reminder Email"}) saved successfully!`);
    } catch {
      toast.error("Failed to save email template settings");
    }
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
    } catch {
      toast.error("Error executing scheduler check.");
    } finally {
      setSchedulerRunning(false);
    }
  };

  const handleTriggerHangfireJob = async () => {
    try {
      setTriggeringHangfire(true);
      await triggerHangfireRemindersAsync();
      toast.success("Hangfire reminder job successfully enqueued! Check your inbox and the Hangfire Dashboard.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger Hangfire reminder job");
    } finally {
      setTriggeringHangfire(false);
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
    try {
      await persistSettings(settings);
      toast.success("OTP & 2FA settings saved successfully!");
    } catch {
      toast.error("Failed to save OTP settings");
    }
  };

  // 4. Per-Event-Type Payment QR Handlers
  const handleQrEventTypeChange = (newType) => {
    setSelectedQrEventType(newType);
  };

  const handleQrFieldChange = (field, value) => {
    setEventPaymentQrConfigs((prev) => {
      const current = prev[selectedQrEventType] || {};
      const updated = {
        ...prev,
        [selectedQrEventType]: {
          ...current,
          [field]: value,
        },
      };
      return updated;
    });
  };

  const handleSavePaymentQr = async () => {
    const configToSave = currentQrConfig;
    const isUploaded = (configToSave.qrMode || SETTINGS_DEFAULTS.QR_MODE_GENERATED).toLowerCase() === "uploaded";

    if (isUploaded) {
      if (!configToSave.qrImage) {
        return;
      }
    } else {
      if (!configToSave.receiverName || !configToSave.receiverName.trim()) {
        return;
      }
      if (configToSave.receiverName.length > SETTINGS_VALIDATION_LIMITS.RECEIVER_NAME_MAX_LENGTH) {
        return;
      }
      if (!configToSave.upiId || !configToSave.upiId.trim()) {
        return;
      }
      const upiCheck = validateUpiId(configToSave.upiId);
      if (!upiCheck.isValid) {
        return;
      }
      if (configToSave.upiId && configToSave.upiId.length > SETTINGS_VALIDATION_LIMITS.UPI_ID_MAX_LENGTH) {
        return;
      }
    }

    try {
      const updatedConfig = isUploaded
        ? {
            receiverName: null,
            upiId: null,
            qrMode: "uploaded",
            qrImage: configToSave.qrImage,
            accountLabel: configToSave.accountLabel ? configToSave.accountLabel.trim() : null,
            remarks: configToSave.remarks ? configToSave.remarks.trim() : null,
            previewAmount: configToSave.previewAmount ? String(configToSave.previewAmount).trim() : "",
            isActive: true,
            isConfigured: true,
            isDeleted: false,
            IsDeleted: false,
            createdOn: new Date().toISOString(),
            createdBy: currentUserName,
          }
        : {
            receiverName: configToSave.receiverName.trim(),
            upiId: configToSave.upiId.trim(),
            qrMode: "generated",
            qrImage: null,
            accountLabel: null,
            remarks: null,
            previewAmount: configToSave.previewAmount ? String(configToSave.previewAmount).trim() : "",
            isActive: true,
            isConfigured: true,
            isDeleted: false,
            IsDeleted: false,
            createdOn: new Date().toISOString(),
            createdBy: currentUserName,
          };

      // 1. Save in local per-event-type storage & update state (isolated per event type)
      const updatedAll = savePaymentQrConfigForEventType(selectedQrEventType, updatedConfig);
      setEventPaymentQrConfigs(updatedAll);

      // 2. Persist to Database table and update app settings state
      const updatedSettings = {
        ...settings,
        paymentQrConfigs: updatedAll,
        PaymentQrConfigs: updatedAll,
      };
      await persistSettings(updatedSettings);

      toast.success("Payment QR settings saved successfully.");
    } catch (err) {
      console.error("Failed to save payment QR settings:", err);
      toast.error(err?.response?.data?.message || `Failed to save payment QR settings for "${selectedQrEventType}"`);
    }
  };

  const handleConfirmDeleteQr = async () => {
    if (!deleteQrEventType) return;
    const target = deleteQrEventType;
    setDeleteQrEventType(null);
    await handleDeletePaymentQr(target);
  };

  const handleDeletePaymentQr = async (eventTypeName) => {
    if (!eventTypeName) return;
    try {
      const deletedConfig = {
        receiverName: "",
        upiId: "",
        qrMode: "generated",
        qrImage: null,
        accountLabel: "",
        remarks: "",
        previewAmount: "",
        isActive: false,
        isConfigured: false,
        isDeleted: true,
        IsDeleted: true,
        deletedOn: new Date().toISOString(),
        deletedBy: currentUserName,
      };

      const updatedAll = savePaymentQrConfigForEventType(eventTypeName, deletedConfig);
      setEventPaymentQrConfigs(updatedAll);

      const updatedSettings = {
        ...settings,
        paymentQrConfigs: updatedAll,
        PaymentQrConfigs: updatedAll,
      };
      await persistSettings(updatedSettings);

      toast.success(`Payment QR for "${eventTypeName}" deleted successfully.`);
    } catch (err) {
      console.error("Failed to delete payment QR settings:", err);
      toast.error(err?.response?.data?.message || `Failed to delete payment QR settings for "${eventTypeName}"`);
    }
  };

  const handleQrUpload = (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > SETTINGS_VALIDATION_LIMITS.MAX_QR_IMAGE_SIZE_BYTES) {
        toast.error("File size must be under 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        handleQrFieldChange("qrImage", reader.result);
        toast.success(`QR Code image for ${selectedQrEventType} uploaded successfully!`);
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to upload QR image");
    }
  };

  // Category dropdown options
  const categorySelectOptions = useMemo(
    () => [
      { label: "All Categories (Default Template)", value: "all" },
      ...categoriesList.map((cat) => ({
        label: cat.eventTypeName || cat.name || "Unnamed Category",
        value: String(cat.eventTypeId || cat.id),
      })),
    ],
    [categoriesList]
  );

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
              ? "linear-gradient(90deg, #372e54 0%, #4a3f6b 100%)"
              : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
            borderBottom: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
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
            {availableTabs.map((tab) => {
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
                {/* For Admin/Manager: General Settings (Org Name) & OTP Settings */}
                {!isMemberRole && (
                  <>
                    {/* General Settings Section Header */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: "10px",
                          bgcolor: "rgba(74, 63, 107, 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#4a3f6b",
                        }}
                      >
                        <SettingsOutlinedIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800}>
                          General Settings
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>

                        </Typography>
                      </Box>
                    </Box>

                    <Stack spacing={2.2} sx={{ mt: 2 }}>
                      {/* Organization Name */}
                      <Box sx={{ maxWidth: { xs: "100%", sm: 460 } }}>
                        <AppInput
                          label="Organization Name"
                          value={settings.orgName}
                          maxLength={SETTINGS_VALIDATION_LIMITS.ORG_NAME_MAX_LENGTH}
                          onChange={(e) => {
                            const val = e.target.value.slice(0, SETTINGS_VALIDATION_LIMITS.ORG_NAME_MAX_LENGTH);
                            handleChange("orgName", val);
                            if (val.trim()) {
                              setGeneralErrors((prev) => ({ ...prev, orgName: "" }));
                            }
                          }}
                          placeholder="Enter Organization Name"
                          required
                          error={Boolean(generalErrors.orgName)}
                          helperText={generalErrors.orgName}
                        />
                      </Box>

                      {/* General Toggles (Hidden as requested) */}

                      <Divider sx={{ my: 1.5 }} />

                      {/* 2. Forgot Password OTP Settings Section Header */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 0.5 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            bgcolor: "rgba(74, 63, 107, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#4a3f6b",
                          }}
                        >
                          <LockResetOutlinedIcon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800}>
                            Forgot Password OTP Settings
                          </Typography>
                         
                        </Box>
                      </Box>

                      <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Box sx={{ maxWidth: { xs: "100%", sm: 260 } }}>
                            <AppInput
                              label="Forgot Password OTP Expiry (minutes)"
                              value={settings.otpExpiry}
                              maxLength={SETTINGS_VALIDATION_LIMITS.OTP_EXPIRY_MAX_LENGTH}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, SETTINGS_VALIDATION_LIMITS.OTP_EXPIRY_MAX_LENGTH);
                                handleChange("otpExpiry", val);
                                if (val.trim()) {
                                  setGeneralErrors((prev) => ({ ...prev, otpExpiry: "" }));
                                }
                              }}
                              restrictType="numberonly"
                              placeholder={`e.g. ${SETTINGS_DEFAULTS.OTP_EXPIRY}`}
                              required
                              error={Boolean(generalErrors.otpExpiry)}
                              helperText={generalErrors.otpExpiry}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                              Validity window for the 6-digit OTP code emailed to users during password reset.
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Box sx={{ maxWidth: { xs: "100%", sm: 260 } }}>
                            <AppInput
                              label="Max Retry Attempts"
                              value={settings.maxRetry}
                              maxLength={SETTINGS_VALIDATION_LIMITS.MAX_RETRY_MAX_LENGTH}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, SETTINGS_VALIDATION_LIMITS.MAX_RETRY_MAX_LENGTH);
                                handleChange("maxRetry", val);
                                if (val.trim()) {
                                  setGeneralErrors((prev) => ({ ...prev, maxRetry: "" }));
                                }
                              }}
                              restrictType="numberonly"
                              placeholder={`e.g. ${SETTINGS_DEFAULTS.MAX_RETRY}`}
                              required
                              error={Boolean(generalErrors.maxRetry)}
                              helperText={generalErrors.maxRetry}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                              Number of incorrect attempts allowed before the OTP is invalidated and locked.
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 1.5 }} />
                    </Stack>
                  </>
                )}

                {/* 3. Two-Factor Authentication (2FA) Section Header (Visible for Member and Admin) */}
                <Stack spacing={2.2} sx={{ mt: isMemberRole ? 0 : 2 }}>
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
                    </Box>
                  </Box>

                  {/* Personal 2FA Device Configuration at UI level */}
                  <MfaSettings
                    ref={mfaRef}
                    embedded
                    title=""
                  />
                </Stack>

                {/* Save Button for General Settings (Admin / Non-Member only) */}
                {!isMemberRole && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "center" }}>
                    <AppButton
                      variant="contained"
                      onClick={handleSaveGeneral}
                      sx={{
                        px: 3.5,
                        fontWeight: 700,
                      }}
                    >
                      Save
                    </AppButton>
                  </Box>
                )}
              </Card>
            </Box>
          )}

          {/* ── 2. Email Template Settings (Subject & Description against Category) ── */}
          {!isMemberRole && activeTab === "emailTemplate" && (() => {
            const currentCategoryLabel =
              selectedCategoryId === "all"
                ? "All Categories (General)"
                : categoriesList.find((c) => String(c.eventTypeId || c.id) === String(selectedCategoryId))?.eventTypeName || SETTINGS_DEFAULTS.FALLBACK_CATEGORY_NAME;

            const previewDueDate = dayjs().endOf("month").format("DD/MM/YYYY");
            const currentCatQrConfig = getPaymentQrConfig(currentCategoryLabel);
            const previewIsUploaded = (currentCatQrConfig.qrMode || "").toLowerCase() === "uploaded";
            const previewUpiId = currentCatQrConfig.upiId || currentQrConfig.upiId || "";
            const displayOrgName = settings.orgName?.trim() || SETTINGS_DEFAULTS.FALLBACK_ORG_NAME;
            const previewReceiverName = currentCatQrConfig.receiverName || currentQrConfig.receiverName || displayOrgName;
            const previewAmountNum = Number(currentCatQrConfig.previewAmount) > 0
              ? Number(currentCatQrConfig.previewAmount)
              : (Number(currentQrConfig.previewAmount) > 0 ? Number(currentQrConfig.previewAmount) : SETTINGS_DEFAULTS.PREVIEW_AMOUNT);

            const previewUpiUri = !previewIsUploaded && previewUpiId
              ? buildUpiPaymentUri({
                  upiId: previewUpiId,
                  receiverName: previewReceiverName,
                  amount: previewAmountNum,
                  note: `Contribution for ${currentCategoryLabel}`,
                })
              : "";
            const previewQrUrl = previewIsUploaded
              ? (currentCatQrConfig.qrImage || dynamicQrUrl || defaultPaymentQr)
              : (previewUpiUri ? generateQrPngDataUrl(previewUpiUri, 300) : (dynamicQrUrl || defaultPaymentQr));

            const defaultCategoryName = categoriesList[0]?.eventTypeName || SETTINGS_DEFAULTS.FALLBACK_CATEGORY_NAME;
            const livePreviewData = {
              memberName: currentUserName,
              categoryName: selectedCategoryId === "all" ? defaultCategoryName : currentCategoryLabel,
              eventDescription: "Sample event description entered during event creation",
              amount: previewAmountNum,
              dueDate: previewDueDate,
              orgName: displayOrgName,
              paymentLink: previewUpiUri,
              qrImageUrl: previewQrUrl,
            };

            const rawSubject = templateSubject || `Contribution Notice - {categoryName}`;
            const liveSubject = interpolatePlaceholders(rawSubject, livePreviewData);

            const defaultDesc =
              "Dear {memberName},\n\nThis is a notification regarding your {categoryName} contribution of {amount}.\n\nDue Date: {dueDate}\n\n{eventDetails}\n\nPlease scan the dynamic UPI QR code below or log in to the portal to complete your contribution payment.\n\n{qrCode}\n\nThank You,\n{orgName}";
            const rawDesc = templateDescription || defaultDesc;

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
                          <AppButton
                            size="small"
                            variant="outlined"
                            startIcon={<SendOutlinedIcon sx={{ fontSize: 15 }} />}
                            onClick={() => setTestEmailDialogOpen(true)}
                            sx={{
                              fontSize: "0.75rem",
                              height: 32,
                              borderColor: "#4a3f6b",
                              color: "#4a3f6b",
                              fontWeight: 700,
                              "&:hover": { borderColor: "#3b325c", bgcolor: "rgba(74,63,107,0.06)" },
                            }}
                          >
                            Send Test Email
                          </AppButton>
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
                                  bgcolor: "#4a3f6b",
                                  color: "#ffffff",
                                  "&:hover": { bgcolor: "#3b325c" },
                                },
                              },
                            }}
                          >
                            <ToggleButton value="initial">
                              Initial Email Template (Day 1 of Month)
                            </ToggleButton>
                            <ToggleButton value="reminder">
                              {(() => {
                                const intVal = Math.max(1, Number(settings.reminderIntervalDays) || Number(SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS));
                                const maxVal = Math.max(1, Number(settings.maxReminders) || Number(SETTINGS_DEFAULTS.MAX_REMINDERS));
                                const days = Array.from({ length: maxVal }, (_, i) => `Day ${1 + (i + 1) * intVal}`).join(", ");
                                return `Reminder Email Template (${days})`;
                              })()}
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Box>

                        {/* 3. Email Subject */}
                        <AppInput
                          label={`Email Subject (${templateType === "initial" ? "Initial Email" : "Reminder Email"})`}
                          value={templateSubject}
                          onChange={(e) => {
                            setTemplateSubject(e.target.value);
                            if (e.target.value.trim()) {
                              setTemplateErrors((prev) => ({ ...prev, templateSubject: "" }));
                            }
                          }}
                          placeholder="e.g. Contribution Payment Reminder - {categoryName}"
                          required
                          error={Boolean(templateErrors.templateSubject)}
                          helperText={templateErrors.templateSubject}
                        />

                        {/* Subject Placeholder Helper Chips */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap", mt: -0.5, mb: 1 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 700 }}>
                            Subject Placeholders:
                          </Typography>
                          {[
                            "{categoryName}",
                            "{memberName}",
                            "{amount}",
                            "{dueDate}",
                            "{orgName}",
                            "{eventDescription}",
                          ].map((token) => (
                            <Chip
                              key={token}
                              label={token}
                              size="small"
                              onClick={() => {
                                setTemplateSubject((prev) => (prev ? `${prev} ${token}` : token));
                                setTemplateErrors((prev) => ({ ...prev, templateSubject: "" }));
                              }}
                              sx={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                height: 22,
                                cursor: "pointer",
                                bgcolor: "rgba(2, 132, 199, 0.08)",
                                color: "#0284c7",
                                border: "1px solid rgba(2, 132, 199, 0.2)",
                                "&:hover": { bgcolor: "rgba(2, 132, 199, 0.16)" },
                              }}
                            />
                          ))}
                        </Box>

                        {/* 4. Email Description */}
                        <AppTextArea
                          label={`Email Description (${templateType === "initial" ? "Initial Email" : "Reminder Email"})`}
                          value={templateDescription}
                          onChange={(e) => {
                            setTemplateDescription(e.target.value);
                            if (e.target.value.trim()) {
                              setTemplateErrors((prev) => ({ ...prev, templateDescription: "" }));
                            }
                          }}
                          placeholder="Enter email message / description for the category..."
                          minRows={6}
                          required
                          error={Boolean(templateErrors.templateDescription)}
                          helperText={templateErrors.templateDescription}
                        />

                        {/* Token Placeholder Helper Chips */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap", mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 700 }}>
                            Placeholders:
                          </Typography>
                          {[
                            "{memberName}",
                            "{categoryName}",
                            "{eventDetails}",
                            "{eventDescription}",
                            "{amount}",
                            "{dueDate}",
                            "{orgName}",
                            "{qrCode}",
                          ].map((token) => (
                            <Chip
                              key={token}
                              label={token}
                              size="small"
                              onClick={() => {
                                setTemplateDescription((prev) => {
                                  if (!prev) return token;
                                  if (token === "{eventDetails}") {
                                    if (prev.includes("{eventDescription}")) {
                                      return prev.replace("{eventDescription}", token);
                                    }
                                    const scanIdx = prev.search(/please\s+scan/i);
                                    if (scanIdx !== -1) {
                                      return `${prev.slice(0, scanIdx).trimEnd()}\n\n${token}\n\n${prev.slice(scanIdx).trimStart()}`;
                                    }
                                    const qrIdx = prev.indexOf("{qrCode}");
                                    if (qrIdx !== -1) {
                                      return `${prev.slice(0, qrIdx).trimEnd()}\n\n${token}\n\n${prev.slice(qrIdx).trimStart()}`;
                                    }
                                    const thankIdx = prev.search(/thank\s*you/i);
                                    if (thankIdx !== -1) {
                                      return `${prev.slice(0, thankIdx).trimEnd()}\n\n${token}\n\n${prev.slice(thankIdx).trimStart()}`;
                                    }
                                  }
                                  if (token === "{qrCode}") {
                                    const thankIdx = prev.search(/thank\s*you/i);
                                    if (thankIdx !== -1) {
                                      return `${prev.slice(0, thankIdx).trimEnd()}\n\n${token}\n\n${prev.slice(thankIdx).trimStart()}`;
                                    }
                                  }
                                  return `${prev.trimEnd()}\n\n${token}`;
                                });
                              }}
                              sx={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                height: 22,
                                cursor: "pointer",
                                bgcolor: token === "{qrCode}" ? "rgba(124, 58, 237, 0.1)" : token === "{eventDetails}" ? "rgba(74, 63, 107, 0.14)" : "rgba(74, 63, 107, 0.08)",
                                color: token === "{qrCode}" ? "#7c3aed" : "#4a3f6b",
                                border: token === "{qrCode}" ? "1px solid rgba(124, 58, 237, 0.3)" : token === "{eventDetails}" ? "1px solid rgba(74, 63, 107, 0.4)" : "1px solid rgba(74, 63, 107, 0.2)",
                                "&:hover": { bgcolor: "rgba(74, 63, 107, 0.16)" },
                              }}
                            />
                          ))}
                          <Chip
                            label="+ Insert Event Table"
                            size="small"
                            onClick={() => {
                              setTemplateDescription((prev) => {
                                const current = prev || "";
                                if (current.includes("{eventDetails}") || current.includes("{eventTable}")) return current;
                                if (current.includes("{eventDescription}")) {
                                  return current.replace("{eventDescription}", "{eventDetails}");
                                }
                                const scanIdx = current.search(/please\s+scan/i);
                                if (scanIdx !== -1) {
                                  return `${current.slice(0, scanIdx).trimEnd()}\n\n{eventDetails}\n\n${current.slice(scanIdx).trimStart()}`;
                                }
                                const qrIdx = current.indexOf("{qrCode}");
                                if (qrIdx !== -1) {
                                  return `${current.slice(0, qrIdx).trimEnd()}\n\n{eventDetails}\n\n${current.slice(qrIdx).trimStart()}`;
                                }
                                const thankIdx = current.search(/thank\s*you/i);
                                if (thankIdx !== -1) {
                                  return `${current.slice(0, thankIdx).trimEnd()}\n\n{eventDetails}\n\n${current.slice(thankIdx).trimStart()}`;
                                }
                                return `${current.trimEnd()}\n\n{eventDetails}`;
                              });
                              setTemplateErrors((prev) => ({ ...prev, templateDescription: "" }));
                            }}
                            sx={{
                              fontSize: "0.68rem",
                              fontWeight: 750,
                              height: 22,
                              cursor: "pointer",
                              bgcolor: "rgba(74, 63, 107, 0.12)",
                              color: "#4a3f6b",
                              border: "1px dashed #4a3f6b",
                              "&:hover": { bgcolor: "rgba(74, 63, 107, 0.22)" },
                            }}
                          />
                          <Chip
                            label="+ Insert QR Code"
                            size="small"
                            onClick={() => {
                              setTemplateDescription((prev) => {
                                const current = prev || "";
                                if (current.includes("{qrCode}")) return current;

                                const thankIdx = current.search(/thank\s*you/i);
                                if (thankIdx !== -1) {
                                  return `${current.slice(0, thankIdx).trimEnd()}\n\n{qrCode}\n\n${current.slice(thankIdx).trimStart()}`;
                                }
                                return `${current.trimEnd()}\n\n{qrCode}`;
                              });
                            }}
                            sx={{
                              fontSize: "0.68rem",
                              fontWeight: 750,
                              height: 22,
                              cursor: "pointer",
                              bgcolor: "rgba(124, 58, 237, 0.12)",
                              color: "#7c3aed",
                              border: "1px dashed #7c3aed",
                              "&:hover": { bgcolor: "rgba(124, 58, 237, 0.22)" },
                            }}
                          />
                        </Box>

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
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <ScheduleOutlinedIcon sx={{ fontSize: 19, color: "#4a3f6b" }} />
                              <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
                                Automated Monthly &amp; Recurring Reminder Settings
                              </Typography>
                            </Box>
                            <Chip
                              label={`Cadence: Every ${settings.reminderIntervalValue || settings.reminderIntervalDays || SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS} ${(settings.reminderIntervalUnit || SETTINGS_DEFAULTS.REMINDER_INTERVAL_UNIT).toLowerCase()}`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                bgcolor: "rgba(74, 63, 107, 0.08)",
                                color: "#4a3f6b",
                                border: "1px solid rgba(74, 63, 107, 0.2)",
                              }}
                            />
                          </Box>

                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <AppSwitch
                                label="Enable Monthly Email (Day 1)"
                                checked={settings.enableMonthlyEmail !== false}
                                onChange={(e) => handleChange("enableMonthlyEmail", e.target.checked)}
                              />
                    
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <AppSwitch
                                label="Enable Recurring Reminders"
                                checked={settings.enableReminderEmail !== false}
                                onChange={(e) => handleChange("enableReminderEmail", e.target.checked)}
                              />
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block", pl: 0.5 }}>
                                Send reminders every {settings.reminderIntervalValue || settings.reminderIntervalDays || SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS} ${(settings.reminderIntervalUnit || SETTINGS_DEFAULTS.REMINDER_INTERVAL_UNIT).toLowerCase()} for unpaid contributions (stops once paid).
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 4 }}>
                              <AppInput
                                label="Reminder Interval"
                                value={settings.reminderIntervalValue !== undefined && settings.reminderIntervalValue !== null ? settings.reminderIntervalValue : (settings.reminderIntervalDays ?? SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS)}
                                maxLength={SETTINGS_VALIDATION_LIMITS.REMINDER_INTERVAL_MAX_LENGTH}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, SETTINGS_VALIDATION_LIMITS.REMINDER_INTERVAL_MAX_LENGTH);
                                  handleChange("reminderIntervalValue", val);
                                  handleChange("reminderIntervalDays", val);
                                  if (val.trim()) {
                                    setTemplateErrors((prev) => ({ ...prev, reminderInterval: "" }));
                                  }
                                }}
                                restrictType="numberonly"
                                placeholder={`e.g. ${SETTINGS_DEFAULTS.REMINDER_INTERVAL_DAYS}`}
                                required
                                error={Boolean(templateErrors.reminderInterval)}
                                helperText={templateErrors.reminderInterval}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <AppSelect
                                label="Interval Unit"
                                value={settings.reminderIntervalUnit || SETTINGS_DEFAULTS.REMINDER_INTERVAL_UNIT}
                                onChange={(e) => handleChange("reminderIntervalUnit", e.target.value)}
                                options={[
                                  { label: "Minutes", value: "Minutes" },
                                  { label: "Hours", value: "Hours" },
                                  { label: "Days", value: "Days" },
                                ]}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <AppInput
                                label="Maximum Reminders Allowed"
                                value={settings.maxReminders !== undefined && settings.maxReminders !== null ? settings.maxReminders : SETTINGS_DEFAULTS.MAX_REMINDERS}
                                maxLength={SETTINGS_VALIDATION_LIMITS.MAX_RETRY_MAX_LENGTH}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, SETTINGS_VALIDATION_LIMITS.MAX_RETRY_MAX_LENGTH);
                                  handleChange("maxReminders", val);
                                  if (val.trim()) {
                                    setTemplateErrors((prev) => ({ ...prev, maxReminders: "" }));
                                  }
                                }}
                                restrictType="numberonly"
                                placeholder={`e.g. ${SETTINGS_DEFAULTS.MAX_REMINDERS}`}
                                required
                                error={Boolean(templateErrors.maxReminders)}
                                helperText={templateErrors.maxReminders}
                              />
                            </Grid>
                          </Grid>
                          {/* Manual Scheduler & Hangfire Action */}
                          <Box sx={{ mt: 2.5, pt: 1.5, borderTop: `1px dashed ${theme.palette.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            </Box>
                            <AppButton
                              variant="outlined"
                              size="small"
                              startIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
                              onClick={() => window.open(getHangfireDashboardUrl(), "_blank")}
                              sx={{
                                borderColor: "#4a3f6b",
                                color: "#4a3f6b",
                                "&:hover": { bgcolor: "rgba(74,63,107,0.06)", borderColor: "#3b325c" },
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              Open Hangfire Dashboard
                            </AppButton>
                          </Box>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Save Button for Email Template Settings */}
                    <Box sx={{ mt: 3, pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "center", gap: 2 }}>
                      <AppButton
                        variant="contained"
                        onClick={handleSaveEmailTemplate}
                        sx={{
                          px: 3.5,
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
                          bgcolor: "rgba(74, 63, 107, 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#4a3f6b",
                        }}
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800}>
                          Email Preview
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem" }}>
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
                        sx={{ mt: 0.3, color: "#4a3f6b", wordBreak: "break-word" }}
                      >
                        {liveSubject || `Contribution Notice - ${currentCategoryLabel}`}
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
                          <strong>From:</strong> {displayOrgName} &lt;{settings.fromEmail?.trim() || "notifications@system.local"}&gt;
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem", mt: 0.2 }}>
                          <strong>To:</strong> {currentUserName} &lt;{authState?.email || authState?.user?.email || "member@system.local"}&gt;
                        </Typography>
                      </Box>

                      {/* Dynamic Email Body & Embedded Components */}
                      {(() => {
                        const effectiveDesc = templateDescription || defaultDesc;
                        if (!effectiveDesc) return null;

                        // Replace standard text placeholders
                        let processed = effectiveDesc
                          .replace(/\{memberName\}/g, livePreviewData.memberName || SETTINGS_DEFAULTS.FALLBACK_USER_NAME)
                          .replace(/\{categoryName\}/g, livePreviewData.categoryName || SETTINGS_DEFAULTS.FALLBACK_CATEGORY_NAME)
                          .replace(/\{eventName\}/g, livePreviewData.categoryName || SETTINGS_DEFAULTS.FALLBACK_CATEGORY_NAME)
                          .replace(/\{eventDescription\}/g, livePreviewData.eventDescription || "")
                          .replace(/\{amount\}/g, typeof livePreviewData.amount === "number" ? `₹${livePreviewData.amount}` : (livePreviewData.amount || `₹${SETTINGS_DEFAULTS.PREVIEW_AMOUNT}`))
                          .replace(/\{dueDate\}/g, livePreviewData.dueDate || previewDueDate || "End of Month")
                          .replace(/\{orgName\}/g, livePreviewData.orgName || displayOrgName);

                        // Tokenize on {eventDetails}, {eventTable}, {qrCode}, and {paymentLink}
                        const parts = processed.split(/(\{eventDetails\}|\{eventTable\}|\{qrCode\}|\{paymentLink\})/gi);

                        return (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {parts.map((part, index) => {
                              const trimmed = part.trim();
                              if (trimmed.toLowerCase() === "{eventdetails}" || trimmed.toLowerCase() === "{eventtable}") {
                                return (
                                  <Box
                                    key={`event-details-${index}`}
                                    sx={{
                                      bgcolor: isDark ? "rgba(74, 63, 107, 0.08)" : "#faf9fd",
                                      border: "1px solid rgba(74, 63, 107, 0.12)",
                                      borderRadius: "10px",
                                      p: 2,
                                      my: 1.5,
                                    }}
                                  >
                                    {/* Event Name */}
                                    <Box sx={{ display: "flex", justifyContent: "space-between", pb: 1.2, mb: 1.2, borderBottom: "1px dashed rgba(74, 63, 107, 0.15)" }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", minWidth: 140 }}>
                                        Event Name:
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? "#ffffff" : "#1e1a2e" }}>
                                        {selectedCategoryId === "all" ? "{eventName}" : `${currentCategoryLabel} Celebration`}
                                      </Typography>
                                    </Box>

                                    {/* Birthday Celebrants row if Birthday category specifically selected */}
                                    {currentCategoryLabel.toLowerCase().includes("birthday") && selectedCategoryId !== "all" && (
                                      <Box sx={{ pb: 1.2, mb: 1.2, borderBottom: "1px dashed rgba(74, 63, 107, 0.15)" }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", display: "block", mb: 0.4 }}>
                                          Celebrants &amp; Dates:
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "#7c3aed", fontWeight: 700 }}>
                                          {"{celebrantNames & dates}"}
                                        </Typography>
                                      </Box>
                                    )}

                                    {/* Event Date */}
                                    <Box sx={{ display: "flex", justifyContent: "space-between", pb: 1.2, mb: 1.2, borderBottom: "1px dashed rgba(74, 63, 107, 0.15)" }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", minWidth: 140 }}>
                                        Event Date:
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: isDark ? "#ffffff" : "#1e1a2e" }}>
                                        {previewDueDate || dayjs().format("DD/MM/YYYY")}
                                      </Typography>
                                    </Box>

                                    {/* Total Amount */}
                                    <Box sx={{ display: "flex", justifyContent: "space-between", pb: 1.2, mb: 1.2, borderBottom: "1px dashed rgba(74, 63, 107, 0.15)" }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", minWidth: 140 }}>
                                        Total Amount:
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? "#ffffff" : "#1e1a2e" }}>
                                        {typeof livePreviewData.amount === "number" ? `₹${livePreviewData.amount}` : (livePreviewData.amount || `₹${SETTINGS_DEFAULTS.PREVIEW_AMOUNT}`)}
                                      </Typography>
                                    </Box>

                                    {/* Description */}
                                    <Box sx={{ display: "flex", justifyContent: "space-between", pb: 1.2, mb: 1.2, borderBottom: "1px dashed rgba(74, 63, 107, 0.15)" }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", minWidth: 140 }}>
                                        Description:
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: isDark ? "#cbd5e1" : "#1e1a2e" }}>
                                        {livePreviewData.eventDescription || "Sample event description entered during event creation"}
                                      </Typography>
                                    </Box>

                                    {/* Contribution Amount */}
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5b5280", minWidth: 140 }}>
                                        Contribution Amount:
                                      </Typography>
                                      <Box
                                        sx={{
                                          bgcolor: "#f0ecf9",
                                          color: "#2d2550",
                                          fontWeight: 800,
                                          fontSize: "0.88rem",
                                          px: 1.2,
                                          py: 0.4,
                                          borderRadius: "6px",
                                          letterSpacing: "0.02em",
                                        }}
                                      >
                                        {typeof livePreviewData.amount === "number" ? `₹${livePreviewData.amount}` : (livePreviewData.amount || `₹${SETTINGS_DEFAULTS.PREVIEW_AMOUNT}`)}
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              }

                              if (trimmed.toLowerCase() === "{qrcode}") {
                                return (
                                  <Box
                                    key={`qr-${index}`}
                                    sx={{
                                      textAlign: "center",
                                      bgcolor: isDark ? "rgba(124, 58, 237, 0.06)" : "#faf5ff",
                                      border: "1px solid #e9d5ff",
                                      borderRadius: "12px",
                                      p: 1.8,
                                      my: 1.5,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 750,
                                        color: "#4b5563",
                                        display: "block",
                                        mb: 1,
                                        textTransform: "uppercase",
                                        fontSize: "0.66rem",
                                        letterSpacing: "0.3px",
                                      }}
                                    >
                                      Scan QR to Pay via Any UPI App (GPay / PhonePe / Paytm)
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "inline-block",
                                        p: 0.8,
                                        bgcolor: "#ffffff",
                                        borderRadius: "10px",
                                        border: "2px solid #7c3aed",
                                        boxShadow: "0 4px 12px rgba(124, 58, 237, 0.12)",
                                        mb: 1,
                                      }}
                                    >
                                      <Box
                                        component="img"
                                        src={previewQrUrl || defaultPaymentQr}
                                        alt="Payment QR Code"
                                        sx={{ width: 130, height: 130, display: "block", mx: "auto", borderRadius: "6px" }}
                                      />
                                    </Box>
                                    <Typography variant="caption" sx={{ display: "block", fontSize: "0.72rem", color: "#4b5563" }}>
                                      <strong>Payee:</strong> {previewReceiverName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: "block", fontSize: "0.72rem", color: "#7c3aed", fontWeight: 700 }}>
                                      <strong>UPI ID:</strong> {previewUpiId || "Not Configured"}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: "block", fontSize: "0.66rem", color: "#64748b", mt: 0.5 }}>
                                      Amount is pre-filled automatically when scanned (₹{previewAmountNum})
                                    </Typography>

                                    {previewUpiUri && (
                                      <Box sx={{ mt: 1.2 }}>
                                        <AppButton
                                          variant="contained"
                                          size="small"
                                          sx={{
                                            bgcolor: "#7c3aed !important",
                                            "&:hover": { bgcolor: "#6d28d9 !important" },
                                            fontSize: "0.74rem",
                                            fontWeight: 700,
                                            py: 0.6,
                                            px: 2,
                                            borderRadius: "8px",
                                          }}
                                        >
                                          Pay ₹{previewAmountNum} via UPI
                                        </AppButton>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              }

                              if (trimmed.toLowerCase() === "{paymentlink}") {
                                return (
                                  <Box key={`paylink-${index}`} sx={{ textAlign: "center", my: 1.5 }}>
                                    <AppButton
                                      variant="contained"
                                      fullWidth
                                      sx={{
                                        bgcolor: "#4a3f6b !important",
                                        "&:hover": { bgcolor: "#2d2550 !important" },
                                        py: 1.2,
                                        fontWeight: 700,
                                        fontSize: "0.82rem",
                                        textTransform: "none",
                                        borderRadius: "10px",
                                        boxShadow: "0 4px 12px rgba(74, 63, 107, 0.25)",
                                      }}
                                    >
                                      Go to Contribution Page &amp; Pay
                                    </AppButton>
                                  </Box>
                                );
                              }

                              if (!part) return null;

                              return (
                                <Typography
                                  key={`frag-${index}`}
                                  variant="body2"
                                  sx={{
                                    whiteSpace: "pre-line",
                                    color: "text.primary",
                                    fontSize: "0.82rem",
                                    lineHeight: 1.6,
                                    mb: 1.5,
                                  }}
                                >
                                  {part}
                                </Typography>
                              );
                            })}
                          </Box>
                        );
                      })()}
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            );
          })()}

          {/* ── 4. Payment QR Settings (Per-Event-Type) ────────────────────────── */}
          {!isMemberRole && activeTab === "paymentQr" && (
            <Stack spacing={3}>
              <Grid container spacing={2.5} alignItems="flex-start">
                {/* Left: Payment QR Form (65-70% on desktop) */}
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Card
                    id="payment-qr-form-card"
                    sx={{
                      borderRadius: "16px",
                      border: (t) => `1px solid ${t.palette.divider}`,
                      p: 2.5,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box>
                      {/* Card Header with Status Badge */}
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
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
                            <QrCodeScannerOutlinedIcon fontSize="small" />
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800}>
                              Payment QR Settings
                            </Typography>
                            
                          </Box>
                        </Box>

                        {/* Status Badge */}
                        <Chip
                          label={
                            !selectedQrEventType
                              ? "Select Event Type"
                              : isCurrentConfigured
                              ? `${selectedQrEventType}: Configured`
                              : `${selectedQrEventType}: Not Configured`
                          }
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            height: 24,
                            bgcolor: !selectedQrEventType
                              ? "rgba(100, 116, 139, 0.12)"
                              : isCurrentConfigured
                              ? "rgba(22, 163, 74, 0.12)"
                              : "rgba(239, 68, 68, 0.12)",
                            color: !selectedQrEventType
                              ? "#64748b"
                              : isCurrentConfigured
                              ? "#16a34a"
                              : "#dc2626",
                            border: !selectedQrEventType
                              ? "1px solid rgba(100, 116, 139, 0.25)"
                              : isCurrentConfigured
                              ? "1px solid rgba(22, 163, 74, 0.25)"
                              : "1px solid rgba(239, 68, 68, 0.25)",
                          }}
                        />
                      </Box>

                      <Stack spacing={2} sx={{ mt: 2 }}>
                        {/* STEP 1: SELECT EVENT TYPE (Compact field size) */}
                        <Box
                          sx={{
                            p: 1.25,
                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                            borderRadius: "10px",
                            border: (t) => `1px solid ${t.palette.divider}`,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.6, flexWrap: "wrap", gap: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "#0284c7", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              SELECT EVENT TYPE
                            </Typography>
                          </Box>
                          <Box sx={{ maxWidth: { xs: "100%", sm: 300 } }}>
                            <AppSelect
                              label=""
                              placeholder="Select Event Type"
                              value={selectedQrEventType}
                              onChange={(e) => handleQrEventTypeChange(e.target.value)}
                              options={qrEventTypeOptions}
                              size="small"
                              required
                              fullWidth
                            />
                          </Box>
                        </Box>

                        {/* Unconfigured Event Type Banner */}
                        {!isCurrentConfigured && (
                          <Box
                            sx={{
                              p: 1.4,
                              borderRadius: "10px",
                              bgcolor: "rgba(239, 68, 68, 0.06)",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              display: "flex",
                              alignItems: "center",
                              gap: 1.2,
                            }}
                          >
                            <InfoOutlinedIcon sx={{ color: "#ef4444", fontSize: 20, flexShrink: 0 }} />
                            <Box>
                              <Typography variant="caption" fontWeight={750} sx={{ color: "#dc2626", display: "block", fontSize: "0.76rem" }}>
                                Payment QR is not configured for this event type.
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                                {isUploadedMode
                                  ? `Please upload a QR code image below for ${selectedQrEventType} and click Save to activate.`
                                  : `Enter the Receiver Name and UPI ID below for ${selectedQrEventType} and click Save to activate.`}
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        {/* QR Code Mode Selector */}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5, display: "block", fontSize: "0.72rem" }}>
                            QR Code Mode for {selectedQrEventType}
                          </Typography>
                          <Box sx={{ maxWidth: { xs: "100%", sm: 440 } }}>
                            <ToggleButtonGroup
                              value={currentQrConfig.qrMode || SETTINGS_DEFAULTS.QR_MODE_GENERATED}
                              exclusive
                              onChange={(e, val) => {
                                if (val) handleQrFieldChange("qrMode", val);
                              }}
                              size="small"
                              fullWidth
                              sx={{
                                "& .MuiToggleButton-root": {
                                  py: 0.6,
                                  fontSize: "0.76rem",
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
                                Dynamic UPI QR (Auto-Generated)
                              </ToggleButton>
                              <ToggleButton value="uploaded">
                                <CloudUploadOutlinedIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                Uploaded Custom QR
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </Box>
                        </Box>

                        {/* Dynamic UPI QR Mode: Receiver Name and UPI ID */}
                        {!isUploadedMode && (
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <AppInput
                                label={`Receiver Name (${selectedQrEventType})`}
                                value={currentQrConfig.receiverName || ""}
                                maxLength={SETTINGS_VALIDATION_LIMITS.RECEIVER_NAME_MAX_LENGTH}
                                onChange={(e) => handleQrFieldChange("receiverName", e.target.value.slice(0, SETTINGS_VALIDATION_LIMITS.RECEIVER_NAME_MAX_LENGTH))}
                                placeholder={`e.g. ${selectedQrEventType} Lead`}
                                required
                                size="small"
                                error={Boolean(receiverError)}
                                helperText={receiverError}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <AppInput
                                label={`UPI ID (${selectedQrEventType})`}
                                value={currentQrConfig.upiId || ""}
                                maxLength={SETTINGS_VALIDATION_LIMITS.UPI_ID_MAX_LENGTH}
                                onChange={(e) => handleQrFieldChange("upiId", e.target.value.slice(0, SETTINGS_VALIDATION_LIMITS.UPI_ID_MAX_LENGTH))}
                                placeholder={`e.g. name@okaxis`}
                                required
                                size="small"
                                error={Boolean(upiError)}
                                helperText={upiError}
                              />
                            </Grid>
                          </Grid>
                        )}

                        {/* Uploaded Custom QR Mode: Image Upload & Optional Details */}
                        {isUploadedMode && (
                          <Stack spacing={2}>
                            <Box sx={{ mt: 0.5 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.72rem" }}>
                                  Upload Custom QR Code for {selectedQrEventType} *
                                </Typography>
                              </Box>

                              <Box sx={{ width: "100%", maxWidth: { xs: "100%", sm: 520 }, mt: 0.3 }}>
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
                                    borderColor: (t) => currentQrConfig.qrImage ? "#16a34a" : t.palette.divider,
                                    borderRadius: "10px",
                                    p: 1.5,
                                    textAlign: "center",
                                    cursor: currentQrConfig.qrImage ? "default" : "pointer",
                                    transition: "all 0.2s ease",
                                    bgcolor: currentQrConfig.qrImage ? "rgba(22, 163, 74, 0.02)" : "transparent",
                                    "&:hover": { borderColor: "#0284c7", bgcolor: "rgba(2, 132, 199, 0.04)" },
                                  }}
                                  onClick={() => {
                                    if (!currentQrConfig.qrImage) fileInputRef.current?.click();
                                  }}
                                >
                                  {currentQrConfig.qrImage ? (
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <Box
                                        component="img"
                                        src={currentQrConfig.qrImage}
                                        alt={`Uploaded QR Code for ${selectedQrEventType}`}
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
                                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                        }}
                                      />
                                      <Chip
                                        label={`Uploaded QR Active (${selectedQrEventType})`}
                                        size="small"
                                        sx={{
                                          mt: 0.8,
                                          height: 20,
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          bgcolor: "rgba(22, 163, 74, 0.12)",
                                          color: "#16a34a",
                                        }}
                                      />
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                                        <AppButton
                                          size="small"
                                          variant="outlined"
                                          startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: 13 }} />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                          }}
                                          sx={{ fontSize: "0.7rem", height: 26, px: 1.5 }}
                                        >
                                          Change Image
                                        </AppButton>
                                        <AppButton
                                          size="small"
                                          variant="outlined"
                                          color="error"
                                          startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 13 }} />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQrFieldChange("qrImage", null);
                                            toast.info(`Uploaded QR image for ${selectedQrEventType} removed.`);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                          }}
                                          sx={{ fontSize: "0.7rem", height: 26, px: 1.5 }}
                                        >
                                          Remove
                                        </AppButton>
                                      </Box>
                                    </Box>
                                  ) : (
                                    <>
                                      <CloudUploadOutlinedIcon sx={{ fontSize: 28, color: "#4a3f6b" }} />
                                      <Typography variant="body2" sx={{ display: "block", fontWeight: 700, fontSize: "0.78rem", mt: 0.5 }}>
                                        Click to upload custom QR code image for {selectedQrEventType}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                                        PNG or JPG format (up to 2MB)
                                      </Typography>
                                    </>
                                  )}
                                </Box>
                              </Box>
                            </Box>

                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <AppInput
                                  label={`Account Label (Optional)`}
                                  value={currentQrConfig.accountLabel || ""}
                                  maxLength={SETTINGS_VALIDATION_LIMITS.ACCOUNT_LABEL_MAX_LENGTH}
                                  onChange={(e) => handleQrFieldChange("accountLabel", e.target.value.slice(0, SETTINGS_VALIDATION_LIMITS.ACCOUNT_LABEL_MAX_LENGTH))}
                                  placeholder={`e.g. ${selectedQrEventType} Account`}
                                  size="small"
                                />
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <AppInput
                                  label={`Remarks (Optional)`}
                                  value={currentQrConfig.remarks || ""}
                                  maxLength={SETTINGS_VALIDATION_LIMITS.REMARKS_MAX_LENGTH}
                                  onChange={(e) => handleQrFieldChange("remarks", e.target.value.slice(0, SETTINGS_VALIDATION_LIMITS.REMARKS_MAX_LENGTH))}
                                  placeholder="e.g. Scan with any UPI app"
                                  size="small"
                                />
                              </Grid>
                            </Grid>
                          </Stack>
                        )}
                      </Stack>
                    </Box>

                    {/* Save Button for Payment QR Settings */}
                    <Box sx={{ mt: 2.5, pt: 1.5, borderTop: (t) => `1px solid ${t.palette.divider}`, display: "flex", justifyContent: "center" }}>
                      <AppButton
                        variant="contained"
                        onClick={handleSavePaymentQr}
                        sx={{
                          px: 3.5,
                          fontWeight: 700,
                        }}
                      >
                        Save
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
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            bgcolor: "rgba(74, 63, 107, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#4a3f6b",
                          }}
                        >
                          <QrCodeScannerOutlinedIcon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800}>
                            Live QR Preview
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                            {isUploadedMode ? "Uploaded Custom Mode" : "Dynamic UPI Mode"}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={selectedQrEventType || "Select Event"}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                      />
                    </Box>

                    <Divider sx={{ mb: 2.5 }} />

                    <Stack spacing={2.2} alignItems="center" sx={{ textAlign: "center" }}>
                      {/* Dynamic Mode: Receiver Name */}
                      {!isUploadedMode && (
                        <Box sx={{ width: "100%" }}>
                          <Typography variant="caption" fontWeight={750} sx={{ color: "text.secondary", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em", display: "block" }}>
                            RECEIVER NAME{selectedQrEventType ? ` (${selectedQrEventType.toUpperCase()})` : ""}
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.2, color: "text.primary" }}>
                            {currentQrConfig.receiverName || (
                              <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: "0.85rem" }}>
                                -- Not Configured --
                              </span>
                            )}
                          </Typography>
                        </Box>
                      )}

                      {/* Uploaded Mode: Label Header */}
                      {isUploadedMode && (
                        <Box sx={{ width: "100%" }}>
                          <Typography variant="caption" fontWeight={750} sx={{ color: "text.secondary", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em", display: "block" }}>
                            UPLOADED CUSTOM QR{selectedQrEventType ? ` (${selectedQrEventType.toUpperCase()})` : ""}
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.2, color: "text.primary" }}>
                            {currentQrConfig.accountLabel || selectedQrEventType || "--"}
                          </Typography>
                        </Box>
                      )}

                      {/* Prominent QR Code Image */}
                      <Box
                        sx={{
                          p: 1.2,
                          bgcolor: "#ffffff",
                          borderRadius: "16px",
                          border: isUploadedMode ? "2px solid #16a34a" : "2px solid #0284c7",
                          boxShadow: isUploadedMode ? "0 6px 20px rgba(22, 163, 74, 0.18)" : "0 6px 20px rgba(2, 132, 199, 0.18)",
                          display: "inline-block",
                          transition: "transform 0.2s ease",
                          "&:hover": { transform: "scale(1.02)" },
                        }}
                      >
                        {isCurrentConfigured ? (
                          <Box
                            component="img"
                            src={isUploadedMode ? currentQrConfig.qrImage : dynamicQrUrl}
                            alt={`Payment QR Code - ${selectedQrEventType}`}
                            sx={{
                              width: 170,
                              height: 170,
                              display: "block",
                              borderRadius: "10px",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 170,
                              height: 170,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "10px",
                              bgcolor: "#f8fafc",
                              p: 1.5,
                              textAlign: "center",
                            }}
                          >
                            <QrCodeScannerOutlinedIcon sx={{ fontSize: 44, color: "#cbd5e1", mb: 0.5 }} />
                            <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 700, fontSize: "0.72rem", lineHeight: 1.3 }}>
                              {isUploadedMode
                                ? "Please upload a QR code image."
                                : "Payment QR is not configured for this event type."}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Dynamic Mode: UPI ID Display & Copy Button */}
                      {!isUploadedMode && (
                        <>
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
                              UPI ID ({selectedQrEventType})
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={750}
                              sx={{
                                fontFamily: "monospace",
                                color: isCurrentConfigured ? "#0284c7" : "#ef4444",
                                fontSize: "0.84rem",
                                wordBreak: "break-all",
                                mt: 0.2,
                              }}
                            >
                              {currentQrConfig.upiId || "Payment QR is not configured for this event type."}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1} sx={{ width: "100%", justifyContent: "center" }}>
                            <AppButton
                              size="small"
                              variant="outlined"
                              disabled={!isCurrentConfigured}
                              startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />}
                              onClick={() => copyToClipboard(currentQrConfig.upiId, `UPI ID (${selectedQrEventType})`)}
                              sx={{ flex: 1, fontSize: "0.72rem", height: 32 }}
                            >
                              Copy UPI
                            </AppButton>
                          </Stack>
                        </>
                      )}

                      {/* Uploaded Mode: Status Notice */}
                      {isUploadedMode && (
                        <Box
                          sx={{
                            width: "100%",
                            p: 1.2,
                            borderRadius: "10px",
                            bgcolor: isCurrentConfigured
                              ? (isDark ? "rgba(22, 163, 74, 0.1)" : "rgba(22, 163, 74, 0.08)")
                              : (isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)"),
                            border: "1px solid",
                            borderColor: isCurrentConfigured ? "rgba(22, 163, 74, 0.25)" : "rgba(239, 68, 68, 0.25)",
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{
                              color: isCurrentConfigured ? "#16a34a" : "#dc2626",
                              fontSize: "0.74rem",
                              display: "block",
                            }}
                          >
                            {isCurrentConfigured ? "Payment QR uploaded manually" : "No custom QR uploaded"}
                          </Typography>
                          {currentQrConfig.remarks && (
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.2, display: "block" }}>
                              {currentQrConfig.remarks}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Grid>
              </Grid>

              {/* ── Payment QR Directory Table Grid (Common AppDataTable Component) ── */}
              <Box sx={{ mt: 1 }}>
                <AppDataTable
                  title="Event Types & UPI Payment Settings"
                  columns={qrTableColumns}
                  data={qrTableData}
                  loading={false}
                />
              </Box>
            </Stack>
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

      {/* Delete Payment QR Confirmation Dialog */}
      <AppConfirmDialog
        open={Boolean(deleteQrEventType)}
        onClose={() => setDeleteQrEventType(null)}
        onConfirm={handleConfirmDeleteQr}
        title="Confirm"
        content={`Are you sure you want to delete the payment QR configuration for "${deleteQrEventType}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
      />
    </div>
  );
}
