import React, { useState, useEffect, useMemo } from "react";
import {
  Grid,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  CircularProgress,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormHelperText,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import {
  Save as SaveIcon,
  ArrowBackRounded as ArrowBackIcon,
  EventRounded as EventIcon,
  CalendarMonthRounded as CalendarIcon,
  CakeRounded as CakeIcon,
  TuneRounded as SettingsIcon,
  PeopleAltOutlined as PeopleIcon,
  GroupsRounded as GroupsIcon,
  GroupRounded as GroupIcon,
  ApartmentRounded as OfficeIcon,
  HomeRounded as HomeIcon,
  HomeRounded as WfhIcon,
  BarChartRounded as BarChartIcon,
  InfoOutlined as InfoIcon,
  PersonAddAlt1Rounded as PersonAddIcon,
  AccountBalanceWalletRounded as WalletIcon,
  PaidRounded as PaidIcon,
  CalculateRounded as CalculateIcon,
  FastfoodRounded as SnackIcon,
  CardGiftcardRounded as GiftIcon,
  LocalDrinkRounded as DrinkIcon,
  ReceiptLongRounded as ReceiptIcon,
  PersonOutlineRounded as ProfileIcon,
  CategoryRounded as CategoryIcon,
  CloseRounded as CloseRoundedIcon,
  AddRounded as AddIcon,
  RestartAltRounded as ResetIcon,
  LayersRounded as MultiIcon,
  AutoAwesomeRounded as SparklesIcon,
} from "@mui/icons-material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppMultiSelect from "../../components/common/AppMultiSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import { validateForm } from "../../utils/validation";
import { useAppToast } from "../../components/common/AppToast";
import {
  createEventAsync,
  updateEventAsync,
  getEventByIdAsync,
} from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import { getBudgetCalculationsAsync } from "../../services/budgetCalculationService";
import {
  getSystemSettingsAsync,
  updateSystemSettings,
} from "../../services/settingsService";
import {
  getPaymentQrConfig,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
} from "../../utils/upiQrHelper";
import { TOAST_MESSAGES } from "../../constants";

import useAccessByLocation from "../../hooks/useAccessByLocation";
import { useAuth } from "../../contexts/AuthContext";
import { hasActionPermission } from "../../utils/rightsHelper";

// Standard calculation rules for Birthday events loaded dynamically from backend
const RULES = {
  cakeRate: 0,
  puffsRate: 0,
  giftRate: 0,
  rounding: 1,
  puffsBasis: "office",
};

const sanitizeDecimalAmount = (value) => {
  if (value === undefined || value === null) return "";
  let clean = String(value).replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  if (parts.length > 2) {
    clean = parts[0] + "." + parts.slice(1).join("");
  }
  if (clean.includes(".")) {
    const [whole, decimal] = clean.split(".");
    clean = whole + "." + decimal.slice(0, 2);
  }
  if (clean.length > 10) {
    clean = clean.slice(0, 10);
  }
  return clean;
};

const sanitizeEventName = (value) => {
  if (!value) return "";
  return String(value).replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
};

const initialForm = {
  eventName: "",
  eventTypeId: "",
  eventTypeIds: [],
  eventDate: dayjs(),
  description: "",
  status: "Planned",
  baseAmount: "",
  participantIds: [],
};

const getDefaultBirthdayExempt = () => {
  try {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.birthdayMembersExempt !== undefined) {
        return Boolean(parsed.birthdayMembersExempt);
      }
    }
  } catch {
    // Setting read error ignored
  }
  return false;
};

const getAllowMultipleEventsSetting = () => {
  try {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.allowedMultipleEvent !== undefined) {
        return Boolean(parsed.allowedMultipleEvent);
      }
      if (parsed.allowMultipleEvents !== undefined) {
        return Boolean(parsed.allowMultipleEvents);
      }
    }
  } catch {
    // Setting read error ignored
  }
  return false;
};

// ─── Custom Green Switch matching User Management Switch style ─────────────
const CustomSwitch = styled(Switch)(({ theme }) => ({
  width: 48,
  height: 26,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 3,
    "&.Mui-checked": {
      transform: "translateX(22px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: "#16a34a",
      },
    },
  },
  "& .MuiSwitch-thumb": {
    width: 20,
    height: 20,
    borderRadius: "50%",
    boxShadow: "0 2px 4px 0 rgba(0, 35, 11, 0.2)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 13,
    opacity: 1,
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(74, 63, 107, 0.18)",
    boxSizing: "border-box",
  },
}));

// Helper for row icon styling in budget breakdown table
const getItemStyle = (name = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("cake")) {
    return {
      icon: <CakeIcon sx={{ color: "#fff", fontSize: "1.05rem" }} />,
      bg: "#8b5cf6", // Purple
    };
  }
  if (
    lower.includes("snack") ||
    lower.includes("puff") ||
    lower.includes("roll") ||
    lower.includes("food") ||
    lower.includes("chicken") ||
    lower.includes("lunch") ||
    lower.includes("dinner") ||
    lower.includes("meal") ||
    lower.includes("catering")
  ) {
    return {
      icon: <SnackIcon sx={{ color: "#fff", fontSize: "1.05rem" }} />,
      bg: "#f59e0b", // Amber/Orange
    };
  }
  if (
    lower.includes("gift") ||
    lower.includes("present") ||
    lower.includes("voucher") ||
    lower.includes("memento") ||
    lower.includes("prize") ||
    lower.includes("award")
  ) {
    return {
      icon: <GiftIcon sx={{ color: "#fff", fontSize: "1.05rem" }} />,
      bg: "#10b981", // Emerald
    };
  }
  if (
    lower.includes("juice") ||
    lower.includes("drink") ||
    lower.includes("beverage") ||
    lower.includes("water") ||
    lower.includes("tea") ||
    lower.includes("coffee")
  ) {
    return {
      icon: <DrinkIcon sx={{ color: "#fff", fontSize: "1.05rem" }} />,
      bg: "#06b6d4", // Cyan
    };
  }
  return {
    icon: <ReceiptIcon sx={{ color: "#fff", fontSize: "1.05rem" }} />,
    bg: "#6366f1", // Indigo
  };
};

export default function EventFormPage({
  isDialog = false,
  open = true,
  onClose,
  event: propEvent,
  eventTypes: propEventTypes,
  members: propMembers,
  onSaveSuccess,
}) {
  const routeParams = useParams();
  const routeId = routeParams?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const toast = useAppToast();
  const { authState } = useAuth();
  const { canEdit, readOnly } = useAccessByLocation();

  const id = isDialog ? (propEvent?.eventId || propEvent?.id || null) : routeId;
  const isEdit = Boolean(id);

  // Granular Action Permissions
  const canAddEvent = hasActionPermission("Add Event", 32, authState?.role).canExecute && canEdit;
  const canEditEvent = hasActionPermission("Edit Event", 33, authState?.role).canExecute && canEdit;

  useEffect(() => {
    if (isDialog) return;
    if (!isEdit && !canAddEvent) {
      toast.error("Access Denied: You do not have permission to add events.");
      navigate("/events");
      return;
    }
    if (isEdit && !canEditEvent) {
      toast.error("Access Denied: You do not have permission to edit events.");
      navigate("/events");
      return;
    }
  }, [isDialog, isEdit, canAddEvent, canEditEvent]);

  const [form, setForm] = useState(initialForm);
  const [otherEventAmounts, setOtherEventAmounts] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [budgetItemsList, setBudgetItemsList] = useState([]);
  const [allowMultipleEvents, setAllowMultipleEvents] = useState(false);
  const [hasPayments, setHasPayments] = useState(false);

  const isMemberActive = (m) => {
    const active =
      m.isActive === true ||
      m.isActive === 1 ||
      String(m.isActive).toLowerCase() === "true" ||
      m.status === "Active" ||
      m.isActive === undefined;
    const exited =
      m.isExited === true ||
      m.isExited === 1 ||
      String(m.isExited).toLowerCase() === "true";
    return active && !exited;
  };

  // Active members count
  const activeMembers = useMemo(
    () => members.filter(isMemberActive),
    [members]
  );

  // Member counts
  const totalActiveCount = activeMembers.length;
  const totalOfficeCount = useMemo(
    () =>
      activeMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length,
    [activeMembers]
  );
  const totalWfhCount = useMemo(
    () =>
      activeMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length,
    [activeMembers]
  );

  // Configuration counts states
  const [officeBirthdays, setOfficeBirthdays] = useState(0);
  const [wfhBirthdays, setWfhBirthdays] = useState(0);
  const [totalMembers, setTotalMembers] = useState(totalActiveCount || 0);
  const [officeMembers, setOfficeMembers] = useState(totalOfficeCount || 0);
  const [wfhMembers, setWfhMembers] = useState(totalWfhCount || 0);
  const [exempt, setExempt] = useState(getDefaultBirthdayExempt);

  // Load initial dropdown data and event details if in edit mode
  useEffect(() => {
    if (isDialog && !open) return;
    let isMounted = true;
    async function initData() {
      setLoading(true);
      try {
        const [typesData, usersData, budgetData, settingsData] = await Promise.all([
          (propEventTypes && propEventTypes.length > 0)
            ? Promise.resolve(propEventTypes)
            : getEventTypesAsync(isEdit),
          (propMembers && propMembers.length > 0)
            ? Promise.resolve(propMembers)
            : getUsersAsync().catch(() => getMembersAsync()),
          getBudgetCalculationsAsync().catch(() => []),
          getSystemSettingsAsync().catch(() => null),
        ]);

        if (!isMounted) return;

        const normalizedMembers = (usersData || []).map((u) => ({
          ...u,
          memberId: u.memberId || u.userId || u.id,
          name: u.name || u.fullName || u.username,
          workType: u.workType || u.memberType || "Office",
          isActive: u.isActive !== false && !u.isDeleted,
          isExited: Boolean(u.isExited),
        }));

        const activeMems = normalizedMembers.filter((m) => m.isActive && !m.isExited);
        setEventTypes(typesData || []);
        setMembers(normalizedMembers);

        const activeBudgetItems = Array.isArray(budgetData)
          ? budgetData.filter((b) => b.isActive !== false)
          : [];
        setBudgetItemsList(activeBudgetItems);

        const bdayType = (typesData || []).find((t) =>
          t.eventTypeName?.toLowerCase().includes("birthday")
        );
        const defaultTypeId = bdayType ? bdayType.eventTypeId : typesData?.[0]?.eventTypeId || "";

        const offTotal = activeMems.filter(
          (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
        ).length;
        const wfhTotal = activeMems.filter(
          (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
        ).length;

        setOfficeMembers(offTotal);
        setWfhMembers(wfhTotal);
        setTotalMembers(activeMems.length);

        if (id) {
          // Edit existing event
          const detailedEvent = propEvent?.eventName && propEvent?.eventId === id
            ? propEvent
            : await getEventByIdAsync(id);
          if (!isMounted) return;

          const pIds =
            detailedEvent.participantIds ||
            (detailedEvent.participants ? detailedEvent.participants.map((p) => p.memberId) : []);

          const currentEventDate = detailedEvent.eventDate ? dayjs(detailedEvent.eventDate) : dayjs();
          const targetMonth = currentEventDate.month();
          const celebrantsInMonth = activeMems.filter(
            (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
          );
          const offCount = celebrantsInMonth.filter(
            (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
          ).length;
          const wfhCount = celebrantsInMonth.filter(
            (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
          ).length;

          setOfficeBirthdays(offCount);
          setWfhBirthdays(wfhCount);
          setTotalMembers(activeMems.length);
          setExempt(settingsData?.birthdayMembersExempt !== undefined ? Boolean(settingsData.birthdayMembersExempt) : getDefaultBirthdayExempt());

          const eventTypeIdsList = detailedEvent.eventTypeIds && detailedEvent.eventTypeIds.length > 0
            ? detailedEvent.eventTypeIds
            : detailedEvent.eventTypeId
              ? [detailedEvent.eventTypeId]
              : defaultTypeId
                ? [defaultTypeId]
                : [];

          setAllowMultipleEvents(eventTypeIdsList.length > 1);

          const isEditBday = (detailedEvent.eventTypeName || "").toLowerCase().includes("birthday") ||
            (typesData || []).some(
              (t) => eventTypeIdsList.includes(t.eventTypeId) && t.eventTypeName?.toLowerCase().includes("birthday")
            );

          let initialBaseAmount = "";
          if (!isEditBday) {
            if (detailedEvent.contributions && detailedEvent.contributions.length > 0 && detailedEvent.contributions[0].amount > 0) {
              initialBaseAmount = String(detailedEvent.contributions[0].amount);
            } else if (
              detailedEvent.baseAmount !== undefined &&
              detailedEvent.baseAmount !== null &&
              Number(detailedEvent.baseAmount) > 0
            ) {
              const pCount = pIds.length || 1;
              initialBaseAmount = String(
                pCount > 1 && detailedEvent.baseAmount > 1000
                  ? Math.round(detailedEvent.baseAmount / pCount)
                  : detailedEvent.baseAmount
              );
            }
          }

          const editNonBdays = (typesData || []).filter(
            (t) => eventTypeIdsList.includes(t.eventTypeId) && !t.eventTypeName?.toLowerCase().includes("birthday")
          );
          if (editNonBdays.length === 1 && (detailedEvent.baseAmount || initialBaseAmount)) {
            setOtherEventAmounts({
              [editNonBdays[0].eventTypeId]: String(detailedEvent.baseAmount || initialBaseAmount),
            });
          }

          const paidAmount = Number(
            detailedEvent.totalPaidAmount ||
            detailedEvent.collectedAmount ||
            detailedEvent.paidAmount ||
            0
          );
          const hasAnyPaid =
            paidAmount > 0 ||
            (detailedEvent.contributions || []).some(
              (c) =>
                Number(c.paidAmount || 0) > 0 ||
                Number(c.amountPaid || 0) > 0 ||
                String(c.paymentStatus || "").toLowerCase() === "paid" ||
                String(c.status || "").toLowerCase() === "paid" ||
                Boolean(c.paymentDate)
            );
          if (hasAnyPaid) {
            setHasPayments(true);
          }

          setForm({
            eventId: detailedEvent.eventId || id,
            eventName: detailedEvent.eventName || "",
            eventTypeId: detailedEvent.eventTypeId || defaultTypeId,
            eventTypeIds: eventTypeIdsList,
            eventDate: currentEventDate,
            description: (detailedEvent.description && !detailedEvent.description.startsWith("Birthday celebration (") && !detailedEvent.description.includes("Planned Budget:"))
              ? detailedEvent.description
              : "",
            status: detailedEvent.status || "Planned",
            baseAmount: initialBaseAmount,
            participantIds: pIds,
          });
        } else {
          // Creating a new event
          const defaultDate = propEvent?.eventDate ? dayjs(propEvent.eventDate) : dayjs();
          const targetMonth = defaultDate.month();
          const celebrantsInMonth = activeMems.filter(
            (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
          );
          const offCount = celebrantsInMonth.filter(
            (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
          ).length;
          const wfhCount = celebrantsInMonth.filter(
            (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
          ).length;

          setOfficeBirthdays(offCount);
          setWfhBirthdays(wfhCount);
          setTotalMembers(activeMems.length);
          setExempt(settingsData?.birthdayMembersExempt !== undefined ? Boolean(settingsData.birthdayMembersExempt) : getDefaultBirthdayExempt());

          setForm({
            eventName: "",
            eventTypeId: "",
            eventTypeIds: [],
            eventDate: defaultDate,
            description: "",
            baseAmount: "",
            participantIds: activeMems.map((m) => m.memberId),
          });
          setOtherEventAmounts({});
          setErrors({});
          setHasPayments(false);
        }
      } catch {
        toast.error("Failed to load event details");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initData();
    return () => {
      isMounted = false;
    };
  }, [id, isDialog, open, location?.pathname, location?.key, propEvent]);

  // Selected event types list
  const selectedTypes = useMemo(() => {
    if (allowMultipleEvents && form.eventTypeIds && form.eventTypeIds.length > 0) {
      return eventTypes.filter((t) => form.eventTypeIds.includes(t.eventTypeId));
    }
    const single = eventTypes.find((t) => t.eventTypeId === form.eventTypeId);
    return single ? [single] : [];
  }, [allowMultipleEvents, form.eventTypeIds, form.eventTypeId, eventTypes]);

  const selectedTypeNames = useMemo(
    () => selectedTypes.map((t) => t.eventTypeName),
    [selectedTypes]
  );

  const hasSelectedType = useMemo(
    () => selectedTypes.length > 0,
    [selectedTypes]
  );

  const isBirthday = useMemo(
    () => selectedTypes.some((t) => t.eventTypeName?.toLowerCase().includes("birthday")),
    [selectedTypes]
  );

  const nonBirthdaySelectedTypes = useMemo(
    () => selectedTypes.filter((t) => !t.eventTypeName?.toLowerCase().includes("birthday")),
    [selectedTypes]
  );

  const handleOtherEventAmountChange = (typeId, value) => {
    const cleanVal = sanitizeDecimalAmount(value);
    setOtherEventAmounts((prev) => ({
      ...prev,
      [typeId]: cleanVal,
    }));
    setForm((prev) => ({
      ...prev,
      baseAmount: cleanVal,
    }));
    if (errors[`baseAmount_${typeId}`] || errors.baseAmount) {
      setErrors((prev) => ({
        ...prev,
        [`baseAmount_${typeId}`]: "",
        baseAmount: "",
      }));
    }
  };

  // Selected participants for non-birthday events (allows deselecting members)
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  useEffect(() => {
    if (activeMembers.length > 0) {
      if (form.participantIds && form.participantIds.length > 0 && isEdit) {
        setSelectedParticipantIds(form.participantIds);
      } else {
        setSelectedParticipantIds(activeMembers.map((m) => m.memberId));
      }
    }
  }, [activeMembers, form.participantIds, isEdit]);

  // Participating members for the event
  const participatingMembers = useMemo(() => {
    if (isBirthday) {
      return activeMembers;
    }
    return activeMembers.filter((m) => selectedParticipantIds.includes(m.memberId));
  }, [isBirthday, activeMembers, selectedParticipantIds]);

  const nonBdayTotal = participatingMembers.length;
  const nonBdayOffice = useMemo(
    () =>
      participatingMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length,
    [participatingMembers]
  );
  const nonBdayWfh = useMemo(
    () =>
      participatingMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length,
    [participatingMembers]
  );

  // Options for Participating Members AppMultiSelect
  const memberOptions = useMemo(
    () =>
      activeMembers.map((m) => {
        const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
        return {
          label: `${m.name} (${isWfh ? "WFH" : "Office"})`,
          value: m.memberId,
        };
      }),
    [activeMembers]
  );

  // Auto-sync active member counts and monthly celebrant counts
  useEffect(() => {
    if (activeMembers.length > 0) {
      if (isBirthday) {
        setTotalMembers(activeMembers.length);
        const offTotal = activeMembers.filter(
          (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
        ).length;
        const wfhTotal = activeMembers.filter(
          (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
        ).length;
        setOfficeMembers(offTotal);
        setWfhMembers(wfhTotal);
      } else {
        setTotalMembers(nonBdayTotal);
        setOfficeMembers(nonBdayOffice);
        setWfhMembers(nonBdayWfh);
      }
    }
  }, [isBirthday, activeMembers, nonBdayTotal, nonBdayOffice, nonBdayWfh]);

  useEffect(() => {
    if (form.eventDate && activeMembers.length > 0 && isBirthday) {
      const targetMonth = dayjs(form.eventDate).month();
      const celebrantsInMonth = activeMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
      );
      const offCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount);
      setWfhBirthdays(wfhCount);
    }
  }, [isBirthday, form.eventDate, activeMembers]);

  // Handler to deselect/remove a member from non-birthday event
  const handleRemoveParticipant = (memberId) => {
    setSelectedParticipantIds((prev) => prev.filter((id) => id !== memberId));
  };

  // Handler to add back a deselected member
  const handleAddParticipant = (memberId) => {
    setSelectedParticipantIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
  };

  // Handler to reset/select all members
  const handleSelectAllParticipants = () => {
    setSelectedParticipantIds(activeMembers.map((m) => m.memberId));
  };

  // Excluded (not attending) members for non-birthday events
  const excludedMembers = useMemo(() => {
    if (isBirthday) return [];
    return activeMembers.filter((m) => !selectedParticipantIds.includes(m.memberId));
  }, [isBirthday, activeMembers, selectedParticipantIds]);

  // Detect month celebrants from active members
  const monthCelebrants = useMemo(() => {
    if (!form.eventDate) return [];
    const targetMonth = dayjs(form.eventDate).month();
    const seen = new Set();
    const list = [];
    for (const m of activeMembers) {
      if (!m.dateOfBirth) continue;
      const dob = dayjs(m.dateOfBirth);
      if (dob.month() !== targetMonth) continue;
      const normName = (m.name || "").toLowerCase().trim();
      const dobStr = dob.format("YYYY-MM-DD");
      const key = normName && dobStr ? `${normName}|${dobStr}` : `id:${m.memberId}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(m);
      }
    }
    return list;
  }, [form.eventDate, activeMembers]);

  // Comma-separated birthday dates of all celebrants in target month (sorted ascending by day, unique dates with counts)
  const celebrantDatesCsv = useMemo(() => {
    if (!monthCelebrants || monthCelebrants.length === 0) return "";
    const sorted = [...monthCelebrants]
      .filter((m) => m.dateOfBirth)
      .sort((a, b) => dayjs(a.dateOfBirth).date() - dayjs(b.dateOfBirth).date());

    const dateCounts = new Map();
    for (const m of sorted) {
      const formattedDate = dayjs(m.dateOfBirth).format("D MMM");
      dateCounts.set(formattedDate, (dateCounts.get(formattedDate) || 0) + 1);
    }

    return Array.from(dateCounts.entries())
      .map(([dateStr, count]) => (count > 1 ? `${dateStr} (${count})` : dateStr))
      .join(", ");
  }, [monthCelebrants]);


  // Calculation counts
  const total = isBirthday ? activeMembers.length : nonBdayTotal;
  const office = isBirthday ? Math.max(0, Number(officeBirthdays) || 0) : nonBdayOffice;
  const wfh = isBirthday ? Math.max(0, Number(wfhBirthdays) || 0) : nonBdayWfh;
  const bdays = isBirthday ? office + wfh : 0;
  const eligible = isBirthday ? Math.max(0, total - (exempt ? bdays : 0)) : nonBdayTotal;
  const puffsFactor = office > 0 ? office : 0;

  // Compute budget calculation items dynamically based on selected Event Types from Master
  const computedBudgetItems = useMemo(() => {
    const items = [];

    // 1. Birthday items (if Birthday is selected)
    const bdayType = selectedTypes.find((t) => t.eventTypeName?.toLowerCase().includes("birthday"));
    if (bdayType) {
      const bdayMasterItems = budgetItemsList.filter((b) => {
        if (b.isActive === false) return false;
        if (bdayType.eventTypeId && b.eventTypeId && b.eventTypeId.toLowerCase() === bdayType.eventTypeId.toLowerCase()) {
          return true;
        }
        const cat = (b.category || "").toLowerCase().trim();
        return cat === "birthday" || cat.includes("birthday");
      });

      bdayMasterItems.forEach((item) => {
        const name = (item.expenseItem || "").toLowerCase();
        const rate = Number(item.rate) || 0;
        let calcText = "";
        let calcFormula = "";
        let amount = 0;
        let formulaPart = "";

        if (name.includes("cake")) {
          calcText = `${office} × ₹${rate.toLocaleString("en-IN")}`;
          calcFormula = `Office Celebrants × ₹${rate.toLocaleString("en-IN")}`;
          amount = office * rate;
          formulaPart = `Cake (Office Celebrants × ₹${rate.toLocaleString("en-IN")})`;
        } else if (
          name.includes("gift") ||
          name.includes("present") ||
          name.includes("voucher") ||
          name.includes("memento")
        ) {
          calcText = `${bdays} × ₹${rate.toLocaleString("en-IN")}`;
          calcFormula = `Total Celebrants × ₹${rate.toLocaleString("en-IN")}`;
          amount = bdays * rate;
          formulaPart = `Gift (Total Birthday Celebrants × ₹${rate.toLocaleString("en-IN")})`;
        } else {
          if (puffsFactor > 0) {
            calcText = `${total} × ₹${rate.toLocaleString("en-IN")}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""
              }`;
            calcFormula = `Active Members × ₹${rate.toLocaleString("en-IN")}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""}`;
            amount = total * rate * puffsFactor;
          } else {
            calcText = "WFH only → Not provided";
            calcFormula = "WFH only → Not provided";
            amount = 0;
          }
          formulaPart = `${item.expenseItem} (Total Active Members × ₹${rate.toLocaleString(
            "en-IN"
          )})`;
        }

        items.push({
          ...item,
          category: "Birthday",
          rate,
          calcText,
          calcFormula,
          amount,
          formulaPart,
        });
      });
    }

    // 2. Non-Birthday Event items (each other selected event type has its own total budget)
    nonBirthdaySelectedTypes.forEach((type) => {
      const typeName = type.eventTypeName || "Event";
      const rawVal = otherEventAmounts[type.eventTypeId] !== undefined
        ? otherEventAmounts[type.eventTypeId]
        : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
      const totalAmount = parseFloat(String(rawVal)) || 0;
      const splitPerPerson = total > 0 && totalAmount > 0 ? (totalAmount / total) : 0;

      const formattedTotal = totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      const formattedSplit = splitPerPerson.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

      const calcText = totalAmount > 0
        ? `₹${formattedTotal} Total ÷ ${total} Members = ₹${formattedSplit}/person`
        : "Enter Total Event Budget";

      const calcFormula = totalAmount > 0
        ? `Active Members × ₹${formattedSplit}`
        : "₹0";

      const formulaPart = totalAmount > 0
        ? `${typeName} (₹${formattedTotal} ÷ ${total} Members = ₹${formattedSplit}/person)`
        : `${typeName}: ₹0`;

      items.push({
        id: type.eventTypeId,
        expenseItem: `${typeName} Celebration (Total Budget)`,
        category: typeName,
        rate: totalAmount,
        calcText,
        calcFormula,
        amount: totalAmount,
        formulaPart,
        isOtherEvent: true,
        splitPerPerson,
      });
    });

    return items;
  }, [
    selectedTypes,
    nonBirthdaySelectedTypes,
    budgetItemsList,
    office,
    bdays,
    total,
    eligible,
    puffsFactor,
    otherEventAmounts,
    form.baseAmount,
  ]);

  const bdayBudget = useMemo(
    () =>
      computedBudgetItems
        .filter((i) => i.category === "Birthday")
        .reduce((sum, i) => sum + i.amount, 0),
    [computedBudgetItems]
  );
  const otherEventsBudget = useMemo(
    () =>
      computedBudgetItems
        .filter((i) => i.category !== "Birthday")
        .reduce((sum, i) => sum + i.amount, 0),
    [computedBudgetItems]
  );

  const celebrantCount = isBirthday ? bdays : 0;
  const birthdayEligibleCount = isBirthday ? (exempt ? Math.max(0, total - celebrantCount) : total) : 0;
  const birthdaySharePerPerson = birthdayEligibleCount > 0 ? (bdayBudget / birthdayEligibleCount) : 0;
  const otherEventsSharePerPerson = total > 0 ? (otherEventsBudget / total) : 0;

  const plannedBudget = computedBudgetItems.reduce((acc, curr) => acc + curr.amount, 0);

  const contributionPerMember = useMemo(() => {
    if (isBirthday && exempt && celebrantCount > 0) {
      return birthdaySharePerPerson + otherEventsSharePerPerson;
    }
    return total > 0 ? (plannedBudget / total) : 0;
  }, [isBirthday, exempt, celebrantCount, birthdaySharePerPerson, otherEventsSharePerPerson, plannedBudget, total]);

  const expectedCollection = useMemo(() => {
    if (isBirthday && exempt && celebrantCount > 0) {
      return (birthdayEligibleCount * birthdaySharePerPerson) + (total * otherEventsSharePerPerson);
    }
    return plannedBudget;
  }, [isBirthday, exempt, celebrantCount, birthdayEligibleCount, birthdaySharePerPerson, total, otherEventsSharePerPerson, plannedBudget]);

  const dynamicFormulaText = computedBudgetItems
    .map((i) => i.formulaPart)
    .filter(Boolean)
    .join(" + ");

  // Handle single event type switch
  const handleTypeChange = (newTypeId) => {
    if (!newTypeId) {
      setForm((prev) => ({
        ...prev,
        eventTypeId: "",
        eventTypeIds: [],
        eventName: !isEdit ? "" : prev.eventName,
        baseAmount: "",
      }));
      setOfficeBirthdays(0);
      setWfhBirthdays(0);
      return;
    }

    const newType = eventTypes.find((t) => t.eventTypeId === newTypeId);
    const newTypeName = newType?.eventTypeName || "";
    const isNewBday = newTypeName.toLowerCase().includes("birthday");

    let updatedName = form.eventName;
    if (!isEdit) {
      const monthStr = dayjs(form.eventDate).format("MMMM");
      updatedName = isNewBday
        ? `${monthStr} Birthday Celebration`
        : `${monthStr} ${newTypeName} Celebration`;
      updatedName = sanitizeEventName(updatedName);
    }

    const allActiveIds = activeMembers.map((m) => m.memberId);
    setSelectedParticipantIds(allActiveIds);

    const offTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
    ).length;
    const wfhTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
    ).length;

    if (isNewBday) {
      const targetMonth = dayjs(form.eventDate).month();
      const celebrantsInMonth = activeMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
      );
      const offCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount);
      setWfhBirthdays(wfhCount);
    }

    setTotalMembers(activeMembers.length);
    setOfficeMembers(offTotal);
    setWfhMembers(wfhTotal);

    setForm((prev) => ({
      ...prev,
      eventTypeId: newTypeId,
      eventTypeIds: newTypeId ? [newTypeId] : [],
      eventName: updatedName,
      baseAmount: prev.baseAmount || "",
      participantIds: allActiveIds,
    }));
    if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
    if (errors.baseAmount) setErrors((p) => ({ ...p, baseAmount: "" }));
  };

  // Handle multiple event types selection
  const handleMultiTypeChange = (newTypeIds) => {
    const selectedTypesList = eventTypes.filter((t) => newTypeIds.includes(t.eventTypeId));
    const hasBday = selectedTypesList.some((t) =>
      t.eventTypeName?.toLowerCase().includes("birthday")
    );

    let updatedName = form.eventName;
    if (!isEdit) {
      const monthStr = dayjs(form.eventDate).format("MMMM");
      if (selectedTypesList.length === 0) {
        updatedName = `${monthStr} Celebration`;
      } else if (selectedTypesList.length === 1) {
        updatedName = hasBday
          ? `${monthStr} Birthday Celebration`
          : `${monthStr} ${selectedTypesList[0].eventTypeName} Celebration`;
      } else {
        const names = selectedTypesList.map((t) => t.eventTypeName);
        updatedName = `${monthStr} ${names.join(" and ")} Celebration`;
      }
      updatedName = sanitizeEventName(updatedName);
    }

    const allActiveIds = activeMembers.map((m) => m.memberId);
    setSelectedParticipantIds(allActiveIds);

    const offTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
    ).length;
    const wfhTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
    ).length;

    if (hasBday) {
      const targetMonth = dayjs(form.eventDate).month();
      const celebrantsInMonth = activeMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
      );
      const offCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount);
      setWfhBirthdays(wfhCount);
    }

    setTotalMembers(activeMembers.length);
    setOfficeMembers(offTotal);
    setWfhMembers(wfhTotal);

    setForm((prev) => ({
      ...prev,
      eventTypeId: newTypeIds[0] || "",
      eventTypeIds: newTypeIds,
      eventName: updatedName,
      baseAmount: prev.baseAmount || "",
      participantIds: allActiveIds,
    }));

    if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
    if (errors.baseAmount) setErrors((p) => ({ ...p, baseAmount: "" }));
  };

  // Handle toggle for allowing multiple events
  const handleToggleAllowMultipleEvents = async (checked) => {
    setAllowMultipleEvents(checked);

    if (checked) {
      const currentTypes =
        form.eventTypeIds && form.eventTypeIds.length > 0
          ? form.eventTypeIds
          : form.eventTypeId
            ? [form.eventTypeId]
            : [];
      setForm((prev) => ({
        ...prev,
        eventTypeIds: currentTypes,
      }));
      if (currentTypes.length > 0) {
        handleMultiTypeChange(currentTypes);
      }
    } else {
      const singleId =
        form.eventTypeIds && form.eventTypeIds.length > 0
          ? form.eventTypeIds[0]
          : form.eventTypeId;
      setForm((prev) => ({
        ...prev,
        eventTypeId: singleId || "",
        eventTypeIds: singleId ? [singleId] : [],
      }));
      if (singleId) {
        handleTypeChange(singleId);
      }
    }
  };

  // Handle date change
  const handleDateChange = (newDate) => {
    if (!newDate) return;
    const oldMonth = dayjs(form.eventDate).month();
    const newMonth = dayjs(newDate).month();

    let newEventName = form.eventName;
    if (!isEdit) {
      const monthStr = dayjs(newDate).format("MMMM");
      if (selectedTypes.length <= 1) {
        newEventName = isBirthday
          ? `${monthStr} Birthday Celebration`
          : `${monthStr} ${selectedTypeNames[0] || "Event"} Celebration`;
      } else {
        newEventName = `${monthStr} ${selectedTypeNames.join(" and ")} Celebration`;
      }
      newEventName = sanitizeEventName(newEventName);
    }

    if (oldMonth !== newMonth) {
      const celebrantsInNewMonth = activeMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === newMonth
      );
      const offCount = celebrantsInNewMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInNewMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount > 0 ? offCount : 1);
      setWfhBirthdays(wfhCount);
    }

    setForm((c) => ({
      ...c,
      eventDate: newDate,
      eventName: newEventName,
    }));
    if (errors.eventDate) setErrors((p) => ({ ...p, eventDate: "" }));
  };

  const handleSubmit = async () => {
    const filed = "This field is required";
    const schema = {
      eventName: {
        required: true,
        type: "letteronly",
        min: 3,
        max: 50,
        label: "Event Name",
      },
      eventDate: { required: true, label: filed },
    };

    const newErrors = validateForm(form, schema);

    if (allowMultipleEvents) {
      if (!form.eventTypeIds || form.eventTypeIds.length < 2) {
        newErrors.eventTypeId = "Please select at least 2 Event types";
        toast.error("Please select at least 2 Event types");
        setErrors(newErrors);
        return;
      }
    } else {
      if (!form.eventTypeId) {
        newErrors.eventTypeId = filed;
      }
    }

    if (nonBirthdaySelectedTypes.length > 0) {
      nonBirthdaySelectedTypes.forEach((t) => {
        const val = otherEventAmounts[t.eventTypeId] !== undefined
          ? otherEventAmounts[t.eventTypeId]
          : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
        const num = parseFloat(String(val)) || 0;
        if (num <= 0) {
          newErrors[`baseAmount_${t.eventTypeId}`] = `Contribution amount is required for ${t.eventTypeName}`;
        }
      });
    }

    if (isBirthday) {
      const bdayBudgetAmount = computedBudgetItems
        .filter((i) => i.category === "Birthday")
        .reduce((sum, i) => sum + i.amount, 0);

      if (plannedBudget <= 0 || bdayBudgetAmount <= 0) {
        toast.error("Birthday event cannot be saved with ₹0. Please configure budget calculation rates or add valid expenses.");
        return;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    if (isEdit && hasPayments) {
      toast.error("Cannot edit event because payments have already been received.");
      return;
    }

    setSaving(true);
    try {
      const finalParticipantIds = isBirthday
        ? activeMembers.map((m) => m.memberId)
        : participatingMembers.map((m) => m.memberId);
      const contributionOverrides = [];

      const bdayBudget = computedBudgetItems
        .filter((i) => i.category === "Birthday")
        .reduce((sum, i) => sum + i.amount, 0);
      const otherEventsBudget = computedBudgetItems
        .filter((i) => i.category !== "Birthday")
        .reduce((sum, i) => sum + i.amount, 0);

      const celebrantIds = monthCelebrants.map((m) => m.memberId);
      const birthdayEligibleCount = isBirthday
        ? (exempt ? Math.max(0, finalParticipantIds.length - celebrantIds.length) : finalParticipantIds.length)
        : 0;
      const birthdaySharePerPerson = birthdayEligibleCount > 0 ? Math.ceil(bdayBudget / birthdayEligibleCount) : 0;
      const otherEventsSharePerPerson = finalParticipantIds.length > 0 ? Math.ceil(otherEventsBudget / finalParticipantIds.length) : 0;

      if (isBirthday && exempt && celebrantIds.length > 0) {
        finalParticipantIds.forEach((mId) => {
          if (celebrantIds.includes(mId)) {
            // Celebrant is exempt from birthday portion, but pays for other events (e.g. Farewell, Dinner)
            contributionOverrides.push({
              memberId: mId,
              amount: otherEventsSharePerPerson,
            });
          } else {
            // Non-celebrant pays birthday share + other events share
            contributionOverrides.push({
              memberId: mId,
              amount: birthdaySharePerPerson + otherEventsSharePerPerson,
            });
          }
        });
      } else {
        // Everyone pays total contribution per member
        finalParticipantIds.forEach((mId) => {
          contributionOverrides.push({
            memberId: mId,
            amount: contributionPerMember,
          });
        });
      }

      const celebrantsSummary = isBirthday
        ? monthCelebrants
          .map((c) => `${c.name} (${dayjs(c.dateOfBirth).format("D MMM")})`)
          .join(", ")
        : "";

      const defaultDesc = isBirthday
        ? `Birthday celebration (${office} Office, ${wfh} WFH)${celebrantsSummary ? ` for ${celebrantsSummary}` : ""
        }${nonBirthdaySelectedTypes.length > 0 ? ` + ${nonBirthdaySelectedTypes.map(t => t.eventTypeName).join(" & ")}` : ""}. Planned Budget: ₹${plannedBudget.toLocaleString(
          "en-IN"
        )}, Contribution/member: ₹${contributionPerMember}`
        : `${selectedTypeNames.join(" & ") || "Event"} celebration for ${total} members. Planned Budget: ₹${plannedBudget.toLocaleString(
          "en-IN"
        )}, Contribution/member: ₹${contributionPerMember}`;

      const finalTypeIds = allowMultipleEvents && form.eventTypeIds?.length > 0
        ? form.eventTypeIds
        : form.eventTypeId
          ? [form.eventTypeId]
          : [];

      const payload = {
        eventName: form.eventName.trim(),
        eventTypeId: finalTypeIds[0] || form.eventTypeId,
        eventTypeIds: finalTypeIds,
        eventDate: dayjs(form.eventDate).hour(12).toISOString(),
        eventDates: isBirthday ? (celebrantDatesCsv || null) : null,
        description: form.description?.trim() || "",
        status: form.status || "Planned",
        baseAmount: plannedBudget,
        participantIds:
          finalParticipantIds.length > 0 ? finalParticipantIds : form.participantIds,
        contributionOverrides: contributionOverrides,
      };

      if (isEdit) {
        await updateEventAsync(id, payload);
        toast.success(TOAST_MESSAGES.EVENTS.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
      } else {
        // Sync dynamic QR code with per-member contribution amount to backend settings before event creation
        try {
          const qrConfig = getPaymentQrConfig();
          const targetAmount = contributionPerMember > 0 ? contributionPerMember : undefined;

          const eventUpiUri = buildUpiPaymentUri({
            upiId: qrConfig.qrUpiId,
            receiverName: qrConfig.qrReceiverName,
            amount: targetAmount,
            note: `Contribution for ${payload.eventName}`,
          });

          const eventQrImage = getQrCodeApiUrl(eventUpiUri, 300);

          if (eventQrImage) {
            await updateSystemSettings({
              ...qrConfig,
              qrImage: eventQrImage,
            });
          }
        } catch {
          // Dynamic QR sync fallback
        }

        await createEventAsync(payload);
        toast.success("Event created successfully");
      }

      if (isDialog) {
        if (onSaveSuccess) onSaveSuccess();
        if (onClose) onClose();
      } else {
        navigate("/events");
      }
    } catch (error) {
      let errMsg = error.response?.data?.message;
      if (!errMsg && error.response?.data?.errors) {
        const errValues = Object.values(error.response.data.errors);
        errMsg = Array.isArray(errValues) ? errValues.flat().join(", ") : String(error.response.data.errors);
      }
      if (!errMsg) {
        errMsg = error.response?.data?.title || error.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED;
      }
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDialog) {
      if (onClose) onClose();
    } else {
      navigate("/events");
    }
  };

  const typeOptions = eventTypes.map((t) => ({
    label: t.eventTypeName,
    value: t.eventTypeId,
  }));

  if (loading) {
    if (isDialog) {
      return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
          <Box sx={{ p: 5, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <CircularProgress size={32} sx={{ color: "#4a3f6b" }} />
          </Box>
        </Dialog>
      );
    }
    return <div className="page-shell" />;
  }

  const formContent = (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Top Header Banner */}
      <Box
        sx={{
          bgcolor: "#45386d",
          color: "#ffffff",
          px: { xs: 2, sm: 3 },
          py: 1.4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 52,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title={isDialog ? "Close" : "Back to Events"}>
            <IconButton
              size="small"
              onClick={handleCancel}
              sx={{
                color: "#ffffff",
                p: 0.5,
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: "1.25rem" }} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ fontSize: "1.05rem", letterSpacing: "0.01em", color: "#ffffff" }}
          >
            {isEdit ? "Edit Event" : "Add Event"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {allowMultipleEvents && (
            <Chip
              icon={<MultiIcon sx={{ fontSize: "0.85rem !important", color: "#ffffff !important" }} />}
              label={`Multiple Events Mode (${selectedTypes.length} Selected)`}
              size="small"
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.75rem",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            />
          )}
          {isDialog && (
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: "#ffffff",
                p: 0.5,
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: "1.25rem" }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Main Body with Balanced 2-Column Enterprise Layout */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          maxHeight: isDialog ? "calc(90vh - 60px)" : "none",
          overflowY: isDialog ? "auto" : "visible",
        }}
      >
          <Grid container spacing={2} alignItems="stretch">
            {/* Left Panel: Event Configuration */}
            <Grid size={{ xs: 12, lg: 7.4 }}>
              <Box
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "#ffffff"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#e8e5f2"),
                  borderRadius: "12px",
                  p: { xs: 2, sm: 2.4 },
                  boxShadow: "0 2px 12px rgba(74, 63, 107, 0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Panel Header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.8,
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e"),
                      letterSpacing: "0.01em",
                    }}
                  >
                    Event Configuration
                  </Typography>

                  <Box
                    onClick={() => handleToggleAllowMultipleEvents(!allowMultipleEvents)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(allowMultipleEvents)}
                      onChange={(e) => handleToggleAllowMultipleEvents(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      sx={{
                        p: 0.2,
                        transform: "scale(0.85)",
                        color: "#4a3f6b",
                        "&.Mui-checked": {
                          color: "#4a3f6b",
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "#e2e8f0" : "#334155",
                        fontSize: "0.82rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Allow Multiple Events
                    </Typography>
                  </Box>
                </Box>

                {/* Form Grid */}
                <Grid container spacing={1.75}>
                  {/* Row 1: Event Type(s) & Event Name */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {allowMultipleEvents ? (
                      <AppMultiSelect
                        label="Event Types"
                        placeholder="Select EventType"
                        value={
                          form.eventTypeIds && form.eventTypeIds.length > 0
                            ? form.eventTypeIds
                            : form.eventTypeId
                              ? [form.eventTypeId]
                              : []
                        }
                        onChange={(e) => {
                          const val =
                            typeof e.target.value === "string"
                              ? e.target.value.split(",")
                              : e.target.value;
                          handleMultiTypeChange(val);
                        }}
                        options={typeOptions}
                        error={!!errors.eventTypeId}
                        helperText={errors.eventTypeId}
                        required
                      />
                    ) : (
                      <AppSelect
                        label="Event Type"
                        placeholder="Select EventType"
                        value={form.eventTypeId}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        clearable
                        options={typeOptions}
                        error={!!errors.eventTypeId}
                        helperText={errors.eventTypeId}
                        required
                      />
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label="Event Name"
                      placeholder="Enter event name"
                      required
                      fullWidth
                      value={form.eventName}
                      onChange={(e) => {
                        const filtered = sanitizeEventName(e.target.value);
                        setForm((c) => ({ ...c, eventName: filtered }));
                        if (errors.eventName) setErrors((p) => ({ ...p, eventName: "" }));
                      }}
                      inputProps={{ maxLength: 50 }}
                      error={!!errors.eventName}
                      helperText={errors.eventName}
                    />
                  </Grid>

                  {/* Row 2: Event Date & Total Active Members */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isBirthday && selectedTypes.length === 1 ? (
                      <AppInput
                        label="Event Date"
                        required
                        value={
                          celebrantDatesCsv ||
                          (form.eventDate
                            ? `${dayjs(form.eventDate).format("MMMM YYYY")} (No Celebrants)`
                            : "Auto calculated")
                        }
                        disabled
                        multiline
                        minRows={1}
                        maxRows={2}
                        placeholder="Auto calculated"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            minHeight: 38,
                            height: "auto",
                            py: 0.6,
                            px: 1,
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "#f8fafd",
                          },
                          "& textarea": {
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            lineHeight: 1.4,
                            maxHeight: 48,
                            overflowY: "auto !important",
                            cursor: "default",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
                            "&::-webkit-scrollbar": {
                              width: "4px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              backgroundColor: "rgba(124, 58, 237, 0.35)",
                              borderRadius: "4px",
                            },
                          },
                        }}
                      />
                    ) : (
                      <AppDateInput
                        label="Event Date"
                        required
                        value={form.eventDate}
                        onChange={handleDateChange}
                        error={!!errors.eventDate}
                        helperText={errors.eventDate}
                      />
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label="Total Active Members"
                      placeholder="Auto calculated"
                      type="text"
                      value={totalMembers}
                      disabled
                    />
                  </Grid>

                  {/* Row 3: Office Members & WFH Members */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label={isBirthday ? "Office Birthday Members" : "Office Members"}
                      placeholder="Auto calculated"
                      type="text"
                      value={isBirthday ? officeBirthdays : officeMembers}
                      disabled
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label={isBirthday ? "WFH Birthday Members" : "WFH Members"}
                      placeholder="Auto calculated"
                      type="text"
                      value={isBirthday ? wfhBirthdays : wfhMembers}
                      disabled
                    />
                  </Grid>

                  {/* Subsection: Additional Event Contributions */}
                  {nonBirthdaySelectedTypes.length > 0 && (
                    <>
                      <Grid size={{ xs: 12 }}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            display: "block",
                            fontSize: "0.8rem",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            mt: 0.5,
                          }}
                        >
                          Additional Event Contributions
                        </Typography>
                      </Grid>

                      {nonBirthdaySelectedTypes.map((type) => {
                        const rawVal =
                          otherEventAmounts[type.eventTypeId] !== undefined
                            ? otherEventAmounts[type.eventTypeId]
                            : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
                        const numVal = parseFloat(String(rawVal)) || 0;
                        const splitPerPerson = total > 0 && numVal > 0 ? (numVal / total) : 0;
                        const fieldError =
                          errors[`baseAmount_${type.eventTypeId}`] ||
                          (nonBirthdaySelectedTypes.length === 1 ? errors.baseAmount : "");

                        return (
                          <Grid
                            size={{ xs: 12, sm: nonBirthdaySelectedTypes.length > 1 ? 6 : 6 }}
                            key={type.eventTypeId}
                          >
                            <AppInput
                              label={`${type.eventTypeName} Contribution Amount`}
                              placeholder={`Enter total ${type.eventTypeName.toLowerCase()} budget (₹)`}
                              required
                              fullWidth
                              value={rawVal}
                              onChange={(e) => handleOtherEventAmountChange(type.eventTypeId, e.target.value)}
                              inputProps={{
                                maxLength: 10,
                                inputMode: "decimal",
                              }}
                              startAdornment={
                                <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>
                                  ₹
                                </Typography>
                              }
                              endAdornment={
                                numVal > 0 && total > 0 ? (
                                  <Chip
                                    label={`₹${splitPerPerson.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/person`}
                                    size="small"
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: "0.72rem",
                                      height: 22,
                                      bgcolor: "rgba(14, 165, 233, 0.1)",
                                      color: "#0284c7",
                                      border: "1px solid rgba(14, 165, 233, 0.25)",
                                    }}
                                  />
                                ) : null
                              }
                              error={!!fieldError}
                              helperText={fieldError || ""}
                            />
                          </Grid>
                        );
                      })}
                    </>
                  )}

                  {/* Participating Members MultiSelect (for non-birthday events or multiple event mode) */}
                  {hasSelectedType && !isBirthday && (
                    <Grid size={{ xs: 12 }}>
                      <AppMultiSelect
                        label="Participating Members"
                        placeholder="Select Participating Members"
                        value={selectedParticipantIds}
                        onChange={(e) => {
                          const val =
                            typeof e.target.value === "string"
                              ? e.target.value.split(",")
                              : e.target.value;
                          setSelectedParticipantIds(val);
                        }}
                        options={memberOptions}
                        maxHeight={145}
                        required
                      />
                    </Grid>
                  )}
                </Grid>

                {/* Identified Celebrants (for Birthday events) */}
                {hasSelectedType && isBirthday && monthCelebrants.length > 0 && (
                  <Box
                    sx={{
                      mt: 1.8,
                      p: 1.4,
                      borderRadius: "8px",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(14, 165, 233, 0.06)"
                          : "#f8fafd",
                      border: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(14, 165, 233, 0.2)"
                          : "#e2e8f0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{
                        fontSize: "0.8rem",
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "#38bdf8" : "#0f172a",
                        display: "block",
                        mb: 0.6,
                      }}
                    >
                      Identified Celebrants in {dayjs(form.eventDate).format("MMMM")} ({monthCelebrants.length}):
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                      {monthCelebrants.map((m) => {
                        const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
                        return (
                          <Chip
                            key={m.memberId}
                            label={`${m.name} (${isWfh ? "WFH" : "Office"}) - ${m.dateOfBirth ? dayjs(m.dateOfBirth).format("D MMM") : ""}`}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 24,
                              borderRadius: "6px",
                              py: 0.3,
                              px: 0.4,
                              bgcolor: isWfh ? "#ede9fe" : "#e0f2fe",
                              color: isWfh ? "#7c3aed" : "#0284c7",
                              border: "1px solid",
                              borderColor: isWfh
                                ? "rgba(124, 58, 237, 0.25)"
                                : "rgba(2, 132, 199, 0.25)",
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* Description */}
                <Box sx={{ mt: 1.8 }}>
                  <AppTextArea
                    label="Description"
                    placeholder="Enter optional description..."
                    value={form.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setForm((f) => ({ ...f, description: e.target.value }));
                      }
                    }}
                    maxLength={500}
                    minRows={2}
                    maxRows={3}
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        p: 0.8,
                        "& .MuiOutlinedInput-input": {
                          py: 0.2,
                          px: 0.4,
                          pb: 1.8,
                          minHeight: 38,
                          maxHeight: 52,
                          fontSize: "0.82rem",
                          lineHeight: 1.35,
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            {/* Right Panel: Calculated Event Summary */}
            <Grid size={{ xs: 12, lg: 4.6 }}>
              <Box
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "#ffffff"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#e8e5f2"),
                  borderRadius: "12px",
                  p: { xs: 2, sm: 2.2 },
                  boxShadow: "0 2px 12px rgba(74, 63, 107, 0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  {/* Panel Header */}
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      fontSize: "1.02rem",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e"),
                      mb: 1,
                      letterSpacing: "0.01em",
                    }}
                  >
                    Calculated Event Summary
                  </Typography>

                  {/* Summary Metric Rows */}
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {/* Row 1 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 36,
                        py: 0.6,
                        borderBottom: "1px solid",
                        borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                      }}
                    >
                      <Typography sx={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 500 }}>
                        {isBirthday ? "Birthday Members" : "Total Members"}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                        }}
                      >
                        {isBirthday ? bdays : total}
                      </Typography>
                    </Box>

                    {/* Row 2 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 36,
                        py: 0.6,
                        borderBottom: "1px solid",
                        borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                      }}
                    >
                      <Typography sx={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 500 }}>
                        Office / WFH
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                        }}
                      >
                        {isBirthday ? `${office} / ${wfh}` : `${officeMembers} / ${wfhMembers}`}
                      </Typography>
                    </Box>

                    {/* Row 3 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 36,
                        py: 0.6,
                        borderBottom: "1px solid",
                        borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                      }}
                    >
                      <Typography sx={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 500 }}>
                        Eligible Contributors
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                        }}
                      >
                        {eligible}
                      </Typography>
                    </Box>

                    {/* Row 4 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 36,
                        py: 0.6,
                        borderBottom: "1px solid",
                        borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                      }}
                    >
                      <Typography sx={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 500 }}>
                        Planned Budget
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                        }}
                      >
                        ₹{plannedBudget.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Row 5 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 38,
                        py: 0.6,
                        borderBottom: "1px solid",
                        borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 500 }}>
                          Contribution / Member
                        </Typography>
                        {isBirthday && exempt && celebrantCount > 0 && nonBirthdaySelectedTypes.length > 0 && (
                          <Typography sx={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 600 }}>
                            Celebrants: ₹{otherEventsSharePerPerson.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: "0.98rem", fontWeight: 800, color: "#0284c7" }}>
                        ₹{contributionPerMember.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Row 6 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 36,
                        py: 0.6,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 500 }}>
                        Expected Collection
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                        }}
                      >
                        ₹{expectedCollection.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Calculation Summary Details Section - Extended Box Size */}
                <Box
                  sx={{
                    mt: 2,
                    p: { xs: 1.8, sm: 2.2 },
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "divider" : "#e2e8f0",
                    borderRadius: "10px",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontWeight: 800,
                        color: (theme) => (theme.palette.mode === "dark" ? "#38bdf8" : "#0284c7"),
                        fontSize: "0.82rem",
                        mb: 1.2,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      CALCULATION SUMMARY
                    </Typography>

                    {/* Calculation Summary Table */}
                    <TableContainer
                      sx={{
                        width: "100%",
                        mb: 1.2,
                        borderRadius: "6px",
                        border: (theme) =>
                          theme.palette.mode === "dark"
                            ? "1px solid rgba(255, 255, 255, 0.1)"
                            : "1px solid rgba(224, 224, 224, 0.9)",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "background.paper" : "#ffffff",
                        overflowX: "auto",
                      }}
                    >
                      <Table size="small" aria-label="calculation summary table">
                        <TableHead>
                          <TableRow
                            sx={{
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "#eef4f8",
                            }}
                          >
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
                                py: 1,
                                px: 1.5,
                                width: "30%",
                                borderRight: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.08)"
                                    : "1px solid rgba(224, 224, 224, 0.8)",
                                borderBottom: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                    : "1px solid rgba(224, 224, 224, 1)",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>Expense</span>
                                <Typography variant="caption" sx={{ fontSize: "0.85rem", color: "inherit", opacity: 0.5 }}>⋮</Typography>
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
                                py: 1,
                                px: 1.5,
                                width: "45%",
                                borderRight: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.08)"
                                    : "1px solid rgba(224, 224, 224, 0.8)",
                                borderBottom: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                    : "1px solid rgba(224, 224, 224, 1)",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>Calculation</span>
                                <Typography variant="caption" sx={{ fontSize: "0.85rem", color: "inherit", opacity: 0.5 }}>⋮</Typography>
                              </Box>
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
                                py: 1,
                                px: 1.5,
                                width: "25%",
                                textAlign: "left",
                                borderRight: "none",
                                borderBottom: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                    : "1px solid rgba(224, 224, 224, 1)",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>Total</span>
                                <Typography variant="caption" sx={{ fontSize: "0.85rem", color: "inherit", opacity: 0.5 }}>⋮</Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {computedBudgetItems.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                align="center"
                                sx={{
                                  py: 2.5,
                                  fontSize: "0.8rem",
                                  color: "text.secondary",
                                  borderBottom: "none",
                                }}
                              >
                                Select an event type to view calculation details
                              </TableCell>
                            </TableRow>
                          ) : (
                            computedBudgetItems.map((item, idx) => (
                              <TableRow
                                key={item.budgetCalculationId || item.expenseItem || idx}
                                sx={{
                                  bgcolor: (theme) =>
                                    idx % 2 === 1
                                      ? theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.015)"
                                        : "#fafafa"
                                      : theme.palette.mode === "dark"
                                      ? "rgba(255,255,255,0.03)"
                                      : "#ffffff",
                                  "&:hover": {
                                    bgcolor: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "#f5f7fa",
                                  },
                                  "& td": {
                                    borderRight: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.08)"
                                        : "1px solid rgba(224, 224, 224, 0.8)",
                                    borderBottom: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.08)"
                                        : "1px solid rgba(224, 224, 224, 0.8)",
                                  },
                                  "& td:last-child": { borderRight: "none" },
                                }}
                              >
                                <TableCell
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.78rem",
                                    py: 0.85,
                                    px: 1.5,
                                    color: (theme) =>
                                      theme.palette.mode === "dark" ? "#e2e8f0" : "#334155",
                                  }}
                                >
                                  {item.expenseItem}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontSize: "0.78rem",
                                    py: 0.85,
                                    px: 1.5,
                                    color: (theme) =>
                                      theme.palette.mode === "dark" ? "#94a3b8" : "#475569",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {item.calcFormula || item.calcText || `₹${item.amount}`}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    py: 0.85,
                                    px: 1.5,
                                    textAlign: "left",
                                    color: (theme) =>
                                      theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
                                  }}
                                >
                                  ₹{(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Total Planned Budget Footer */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      pt: 1.2,
                      mt: 1,
                      borderTop: "1px dashed",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? "divider" : "#cbd5e1",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#334155"),
                      }}
                    >
                      Total Planned Budget
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.98rem",
                        color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
                      }}
                    >
                      ₹{plannedBudget.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  {isBirthday && (plannedBudget <= 0 || bdayBudget <= 0) && (
                    <Alert
                      severity="warning"
                      sx={{
                        mt: 1.5,
                        py: 0.5,
                        fontSize: "0.78rem",
                        borderRadius: "8px",
                        "& .MuiAlert-message": { lineHeight: 1.4 },
                      }}
                    >
                      Birthday event budget is ₹0. Please configure rates in Settings &gt; Budget Calculations before saving.
                    </Alert>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Bottom Action Footer Centered */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              mt: 2,
              pt: 1.75,
              pb: 0.5,
              borderTop: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "divider" : "#e8e5f2",
            }}
          >
            <AppButton
              variant="outlined"
              onClick={handleCancel}
              disabled={saving}
              sx={{
                minWidth: 120,
                borderRadius: "8px",
                px: 3.5,
                py: 0.85,
                minHeight: 40,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#d8d8e5",
                color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#334155"),
                fontWeight: 600,
                fontSize: "0.88rem",
                "&:hover": {
                  borderColor: "#4a3f6b",
                },
              }}
            >
              {readOnly ? (isDialog ? "Close" : "Back to Events") : "Cancel"}
            </AppButton>
            {canEdit && (
              <Tooltip title={isEdit && hasPayments ? "Cannot edit event after payments have been received" : ""}>
                <span>
                  <AppButton
                    variant="contained"
                    startIcon={<SaveIcon sx={{ fontSize: "1.1rem" }} />}
                    onClick={handleSubmit}
                    disabled={saving || (isEdit && hasPayments)}
                    sx={{
                      bgcolor: isEdit && hasPayments ? "#94a3b8 !important" : "#342b54 !important",
                      color: "#ffffff !important",
                      "&:hover": { bgcolor: isEdit && hasPayments ? "#94a3b8 !important" : "#241d3b !important" },
                      minWidth: 130,
                      borderRadius: "8px",
                      px: 3.8,
                      py: 0.85,
                      minHeight: 40,
                      fontWeight: 600,
                      fontSize: "0.88rem",
                    }}
                  >
                    {saving ? "Saving..." : isEdit ? "Update" : "Save"}
                  </AppButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
  );

  if (isDialog) {
    if (!open) return null;
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e1a2e" : "#f8f7fc"),
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            m: { xs: 1, sm: 2 },
            maxHeight: "92vh",
          },
        }}
      >
        {formContent}
      </Dialog>
    );
  }

  return (
    <div className="page-shell">
      <Paper
        elevation={0}
        sx={{
          border:
            theme.palette.mode === "dark"
              ? `1px solid ${theme.palette.divider}`
              : "1px solid rgba(74, 63, 107, 0.08)",
          borderRadius: "14px",
          overflow: "hidden",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "#f8f7fc"),
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
        }}
      >
        {formContent}
      </Paper>
    </div>
  );
}
