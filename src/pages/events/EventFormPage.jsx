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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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

const formatBaseAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "");
  if (!cleanVal) return "";
  return Number(cleanVal).toLocaleString("en-US");
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
  return true;
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

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const toast = useAppToast();
  const { authState } = useAuth();
  const { canEdit, readOnly } = useAccessByLocation();

  const isEdit = Boolean(id);

  // Granular Action Permissions
  const canAddEvent = hasActionPermission("Add Event", 31, authState?.role).canExecute && canEdit;
  const canEditEvent = hasActionPermission("Edit Event", 32, authState?.role).canExecute && canEdit;

  useEffect(() => {
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
  }, [isEdit, canAddEvent, canEditEvent]);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [budgetItemsList, setBudgetItemsList] = useState([]);
  const [allowMultipleEvents, setAllowMultipleEvents] = useState(getAllowMultipleEventsSetting);

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
    let isMounted = true;
    async function initData() {
      setLoading(true);
      try {
        const [typesData, usersData, budgetData, settingsData] = await Promise.all([
          getEventTypesAsync(),
          getUsersAsync().catch(() => getMembersAsync()),
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

        // Update allowMultipleEvents from backend setting if returned
        let isMultipleAllowed = getAllowMultipleEventsSetting();
        if (settingsData) {
          if (settingsData.allowedMultipleEvent !== undefined) {
            isMultipleAllowed = Boolean(settingsData.allowedMultipleEvent);
          } else if (settingsData.allowMultipleEvents !== undefined) {
            isMultipleAllowed = Boolean(settingsData.allowMultipleEvents);
          }
        }
        setAllowMultipleEvents(isMultipleAllowed);

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
          const detailedEvent = await getEventByIdAsync(id);
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
          setExempt(true);

          const eventTypeIdsList = detailedEvent.eventTypeIds && detailedEvent.eventTypeIds.length > 0
            ? detailedEvent.eventTypeIds
            : detailedEvent.eventTypeId
              ? [detailedEvent.eventTypeId]
              : defaultTypeId
                ? [defaultTypeId]
                : [];

          setForm({
            eventId: detailedEvent.eventId || id,
            eventName: detailedEvent.eventName || "",
            eventTypeId: detailedEvent.eventTypeId || defaultTypeId,
            eventTypeIds: eventTypeIdsList,
            eventDate: currentEventDate,
            description: detailedEvent.description || "",
            status: detailedEvent.status || "Planned",
            baseAmount:
              detailedEvent.baseAmount !== undefined &&
                detailedEvent.baseAmount !== null &&
                Number(detailedEvent.baseAmount) > 0
                ? String(detailedEvent.baseAmount)
                : "",
            participantIds: pIds,
          });
        } else {
          // Creating a new event
          const defaultDate = dayjs();
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
          setExempt(getDefaultBirthdayExempt());

          const initialTypeName = bdayType?.eventTypeName || typesData?.[0]?.eventTypeName || "Event";
          const isInitialBday = initialTypeName.toLowerCase().includes("birthday");

          setForm({
            eventName: isInitialBday
              ? `${defaultDate.format("MMMM")} Birthday Celebration`
              : `${defaultDate.format("MMMM")} ${initialTypeName} Celebration`,
            eventTypeId: defaultTypeId,
            eventTypeIds: defaultTypeId ? [defaultTypeId] : [],
            eventDate: defaultDate,
            description: "",
            baseAmount: "",
            participantIds: activeMems.map((m) => m.memberId),
          });
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
  }, [id, location.pathname, location.key]);

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

  const isBirthday = useMemo(
    () => selectedTypes.some((t) => t.eventTypeName?.toLowerCase().includes("birthday")),
    [selectedTypes]
  );

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

  // Comma-separated birthday dates of all celebrants in the target month (sorted ascending by date)
  const celebrantDatesCsv = useMemo(() => {
    if (!monthCelebrants || monthCelebrants.length === 0) return "";
    const sorted = [...monthCelebrants]
      .filter((m) => m.dateOfBirth)
      .sort((a, b) => dayjs(a.dateOfBirth).date() - dayjs(b.dateOfBirth).date());

    return sorted.map((m) => dayjs(m.dateOfBirth).format("D MMM")).join(", ");
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

    selectedTypes.forEach((type) => {
      const typeName = type?.eventTypeName || "";
      const typeNameLower = typeName.toLowerCase().trim();
      const isThisBday = typeNameLower.includes("birthday");

      // 1. Filter active master items matching this Event Type
      const categoryItems = budgetItemsList.filter((b) => {
        if (b.isActive === false) return false;
        if (type.eventTypeId && b.eventTypeId && b.eventTypeId.toLowerCase() === type.eventTypeId.toLowerCase()) {
          return true;
        }
        const cat = (b.category || "").toLowerCase().trim();
        return cat === typeNameLower;
      });

      if (isThisBday) {
        categoryItems.forEach((item) => {
          const name = (item.expenseItem || "").toLowerCase();
          const rate = Number(item.rate) || 0;
          let calcText = "";
          let amount = 0;
          let formulaPart = "";

          if (name.includes("cake")) {
            calcText = `${office} × ₹${rate.toLocaleString("en-IN")}`;
            amount = office * rate;
            formulaPart = `Cake (Office Celebrants × ₹${rate.toLocaleString("en-IN")})`;
          } else if (
            name.includes("gift") ||
            name.includes("present") ||
            name.includes("voucher") ||
            name.includes("memento")
          ) {
            calcText = `${bdays} × ₹${rate.toLocaleString("en-IN")}`;
            amount = bdays * rate;
            formulaPart = `Gift (Total Birthday Celebrants × ₹${rate.toLocaleString("en-IN")})`;
          } else {
            if (puffsFactor > 0) {
              calcText = `${total} × ₹${rate.toLocaleString("en-IN")}${
                puffsFactor > 1 ? ` × ${puffsFactor}` : ""
              }`;
              amount = total * rate * puffsFactor;
            } else {
              calcText = "WFH only → Not provided";
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
            amount,
            formulaPart,
          });
        });
      } else {
        // Non-Birthday Event Type
        if (categoryItems.length > 0) {
          categoryItems.forEach((item) => {
            const rate = Number(item.rate) || 0;
            const calcText = `${total} × ₹${rate.toLocaleString("en-IN")}`;
            const amount = total * rate;
            const formulaPart = `${item.expenseItem} (${typeName}: Total Members × ₹${rate.toLocaleString(
              "en-IN"
            )})`;

            items.push({
              ...item,
              category: typeName,
              rate,
              calcText,
              amount,
              formulaPart,
            });
          });
        } else {
          // Fallback to baseAmount if configured or form.baseAmount
          const typeBase = Number(type.baseAmount) || 0;
          const manualBase = Number(String(form.baseAmount).replace(/[^0-9]/g, "")) || 0;
          const effectiveBase = typeBase > 0 ? typeBase : manualBase;

          if (effectiveBase > 0) {
            const perPersonRate = eligible > 0 ? Math.ceil(effectiveBase / eligible) : 0;
            items.push({
              expenseItem: `${typeName} Base Amount`,
              category: typeName,
              rate: perPersonRate,
              calcText:
                eligible > 0
                  ? `₹${effectiveBase.toLocaleString("en-IN")} ÷ ${eligible} Members`
                  : `₹${effectiveBase.toLocaleString("en-IN")}`,
              amount: effectiveBase,
              formulaPart: `${typeName} Base (₹${effectiveBase.toLocaleString("en-IN")})`,
            });
          } else {
            items.push({
              expenseItem: `${typeName} Celebration`,
              category: typeName,
              rate: 0,
              calcText: "Enter Base Amount",
              amount: 0,
              formulaPart: `${typeName}: ₹0`,
            });
          }
        }
      }
    });

    return items;
  }, [
    selectedTypes,
    budgetItemsList,
    office,
    bdays,
    total,
    eligible,
    puffsFactor,
    form.baseAmount,
  ]);

  const plannedBudget = computedBudgetItems.reduce((acc, curr) => acc + curr.amount, 0);
  const rawPerMember = eligible > 0 ? plannedBudget / eligible : 0;
  const contributionPerMember =
    eligible > 0 ? Math.ceil(rawPerMember / RULES.rounding) * RULES.rounding : 0;
  const expectedCollection = contributionPerMember * eligible;

  const dynamicFormulaText = computedBudgetItems
    .map((i) => i.formulaPart)
    .filter(Boolean)
    .join(" + ");

  // Handle single event type switch
  const handleTypeChange = (newTypeId) => {
    const newType = eventTypes.find((t) => t.eventTypeId === newTypeId);
    const newTypeName = newType?.eventTypeName || "";
    const isNewBday = newTypeName.toLowerCase().includes("birthday");

    let updatedName = form.eventName;
    if (!isEdit) {
      const monthStr = dayjs(form.eventDate).format("MMMM");
      updatedName = isNewBday
        ? `${monthStr} Birthday Celebration`
        : `${monthStr} ${newTypeName} Celebration`;
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
      baseAmount: !isNewBday && newType?.baseAmount > 0 ? String(newType.baseAmount) : "",
      participantIds: allActiveIds,
    }));
    if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
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
        updatedName = `${monthStr} ${names.join(" & ")} Celebration`;
      }
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
      participantIds: allActiveIds,
    }));

    if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
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
        newEventName = `${monthStr} ${selectedTypeNames.join(" & ")} Celebration`;
      }
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
      eventName: { required: true, min: 3, max: 100, label: filed },
      eventDate: { required: true, label: filed },
    };

    const newErrors = validateForm(form, schema);

    if (allowMultipleEvents) {
      if (!form.eventTypeIds || form.eventTypeIds.length === 0) {
        newErrors.eventTypeId = "Please select at least one event type";
      }
    } else {
      if (!form.eventTypeId) {
        newErrors.eventTypeId = filed;
      }
    }

    if (!isBirthday && computedBudgetItems.length === 1 && computedBudgetItems[0].amount === 0) {
      const cleanBase = Number(String(form.baseAmount).replace(/[^0-9]/g, "")) || 0;
      if (cleanBase <= 0) {
        newErrors.baseAmount = "Base amount must be greater than 0";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    setSaving(true);
    try {
      const finalParticipantIds = isBirthday
        ? activeMembers.map((m) => m.memberId)
        : participatingMembers.map((m) => m.memberId);
      const contributionOverrides = [];

      if (isBirthday) {
        const celebrantIds = monthCelebrants.map((m) => m.memberId);
        if (exempt) {
          celebrantIds.forEach((cId) => {
            contributionOverrides.push({ memberId: cId, amount: 0 });
          });
          finalParticipantIds.forEach((mId) => {
            if (!celebrantIds.includes(mId)) {
              contributionOverrides.push({
                memberId: mId,
                amount: contributionPerMember,
              });
            }
          });
        } else {
          finalParticipantIds.forEach((mId) => {
            contributionOverrides.push({
              memberId: mId,
              amount: contributionPerMember,
            });
          });
        }
      } else {
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
        ? `Birthday celebration (${office} Office, ${wfh} WFH)${
            celebrantsSummary ? ` for ${celebrantsSummary}` : ""
          }. Planned Budget: ₹${plannedBudget.toLocaleString(
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
        description: form.description?.trim() || defaultDesc,
        status: form.status || "Planned",
        baseAmount: effectiveBase,
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
        toast.success("Event created successfully! Notification emails dispatched to contributors.");
      }

      navigate("/events");
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

  const typeOptions = eventTypes.map((t) => ({
    label: t.eventTypeName,
    value: t.eventTypeId,
  }));

  if (loading) {
    return (
      <div className="page-shell">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress sx={{ color: "#45386d" }} />
            <Typography variant="body2" color="text.secondary">
              Loading event configuration...
            </Typography>
          </Stack>
        </Box>
      </div>
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
            <Tooltip title="Back to Events">
              <IconButton
                size="small"
                onClick={() => navigate("/events")}
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
        </Box>

        {/* Main Body with Unified 3-Card Layout for ALL Event Types */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2.5}>
            {/* Top-Left Card: Event Configuration */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Box
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "#ffffff"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#e8e5f2"),
                  borderRadius: "14px",
                  p: { xs: 2, sm: 2.5 },
                  boxShadow: "0 4px 18px rgba(74, 63, 107, 0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Card Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e"),
                    }}
                  >
                    Event Configuration
                  </Typography>
                  {isBirthday && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(124, 58, 237, 0.1)"
                            : "#f5f3ff",
                        px: 1.5,
                        py: 0.4,
                        borderRadius: "20px",
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(124, 58, 237, 0.2)"
                            : "#ede9fe",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#c4b5fd" : "#6d28d9",
                        }}
                      >
                        Birthday Members Exempt:
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.76rem",
                          fontWeight: 800,
                          color: exempt ? "#10b981" : "#ef4444",
                        }}
                      >
                        {exempt ? "Yes" : "No"}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Form Grid */}
                <Grid container spacing={2}>
                  {/* Row 1: Event Type(s) & Event Name */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {allowMultipleEvents ? (
                      <FormControl fullWidth size="small" error={!!errors.eventTypeId}>
                        <InputLabel
                          id="event-types-multi-label"
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "text.secondary",
                            "&.Mui-focused": { color: "#7c3aed" },
                          }}
                        >
                          Event Types *
                        </InputLabel>
                        <Select
                          labelId="event-types-multi-label"
                          multiple
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
                          input={<OutlinedInput label="Event Types *" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                              {selected.map((val) => {
                                const typeObj = eventTypes.find((t) => t.eventTypeId === val);
                                const label = typeObj?.eventTypeName || val;
                                return (
                                  <Chip
                                    key={val}
                                    label={label}
                                    size="small"
                                    onDelete={(e) => {
                                      e.stopPropagation();
                                      const remaining = (form.eventTypeIds || []).filter(
                                        (id) => id !== val
                                      );
                                      handleMultiTypeChange(remaining);
                                    }}
                                    sx={{
                                      height: 24,
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                          ? "rgba(124, 58, 237, 0.2)"
                                          : "#f5f3ff",
                                      color: (theme) =>
                                        theme.palette.mode === "dark" ? "#c4b5fd" : "#6d28d9",
                                      border: "1px solid",
                                      borderColor: (theme) =>
                                        theme.palette.mode === "dark"
                                          ? "rgba(124, 58, 237, 0.4)"
                                          : "#ddd6fe",
                                      "& .MuiChip-deleteIcon": {
                                        color: "#7c3aed",
                                        fontSize: "14px",
                                        "&:hover": { color: "#ef4444" },
                                      },
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          )}
                          sx={{
                            borderRadius: "8px",
                            minHeight: 40,
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#7c3aed",
                            },
                          }}
                        >
                          {eventTypes.map((type) => {
                            const isSelected = (form.eventTypeIds || []).includes(type.eventTypeId);
                            return (
                              <MenuItem
                                key={type.eventTypeId}
                                value={type.eventTypeId}
                                sx={{
                                  py: 0.8,
                                  px: 1.5,
                                  fontSize: "0.85rem",
                                  fontWeight: isSelected ? 700 : 500,
                                  bgcolor: isSelected
                                    ? "rgba(124, 58, 237, 0.08) !important"
                                    : "transparent",
                                  "&:hover": { bgcolor: "rgba(124, 58, 237, 0.04)" },
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  size="small"
                                  sx={{
                                    p: 0.5,
                                    mr: 1,
                                    color: "#94a3b8",
                                    "&.Mui-checked": { color: "#7c3aed" },
                                  }}
                                />
                                <ListItemText
                                  primary={type.eventTypeName}
                                  primaryTypographyProps={{
                                    fontSize: "0.85rem",
                                    fontWeight: isSelected ? 700 : 500,
                                  }}
                                />
                              </MenuItem>
                            );
                          })}
                        </Select>
                        {errors.eventTypeId && (
                          <FormHelperText sx={{ color: "#ef4444", fontSize: "0.75rem", mt: 0.5 }}>
                            {errors.eventTypeId}
                          </FormHelperText>
                        )}
                      </FormControl>
                    ) : (
                      <AppSelect
                        label="Event Type"
                        value={form.eventTypeId}
                        onChange={(e) => handleTypeChange(e.target.value)}
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
                      value={form.eventName}
                      onChange={(e) => {
                        setForm((c) => ({ ...c, eventName: e.target.value }));
                        if (errors.eventName) setErrors((p) => ({ ...p, eventName: "" }));
                      }}
                      error={!!errors.eventName}
                      helperText={errors.eventName}
                    />
                  </Grid>

                  {/* Row 2: Event Date & Total Active Members (Read Only / Auto-calculated) */}
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
                            minHeight: 34,
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
                            lineHeight: 1.45,
                            maxHeight: 52,
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

                  {/* Row 3: Office Members & WFH Members (Read Only / Auto-calculated) */}
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
                </Grid>

                {/* Row 4: Identified Celebrants (for Birthday) or Active Participants (for other Events) */}
                {isBirthday ? (
                  monthCelebrants.length > 0 && (
                    <Box
                      sx={{
                        mt: 2.5,
                        p: 2,
                        borderRadius: "10px",
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
                          fontSize: "0.82rem",
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#38bdf8" : "#0f172a",
                          display: "block",
                          mb: 1.2,
                        }}
                      >
                        Identified Celebrants in {dayjs(form.eventDate).format("MMMM")} ({monthCelebrants.length}):
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {monthCelebrants.map((m) => {
                          const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
                          return (
                            <Chip
                              key={m.memberId}
                              label={`${m.name} (${isWfh ? "WFH" : "Office"}) - ${
                                m.dateOfBirth ? dayjs(m.dateOfBirth).format("D MMM") : ""
                              }`}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.76rem",
                                borderRadius: "16px",
                                py: 0.5,
                                px: 0.5,
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
                  )
                ) : (
                  activeMembers.length > 0 && (
                    <Box
                      sx={{
                        mt: 2.5,
                        p: 2,
                        borderRadius: "10px",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(124, 58, 237, 0.06)"
                            : "#f8fafd",
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(124, 58, 237, 0.2)"
                            : "#e2e8f0",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 1,
                          mb: 1.2,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                          <PeopleIcon sx={{ color: "#7c3aed", fontSize: "1.15rem" }} />
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{
                              fontSize: "0.82rem",
                              color: (theme) =>
                                theme.palette.mode === "dark" ? "#c4b5fd" : "#0f172a",
                            }}
                          >
                            Participating Members ({participatingMembers.length} of {activeMembers.length}):
                          </Typography>
                        </Box>

                        {excludedMembers.length > 0 && (
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<ResetIcon sx={{ fontSize: "0.95rem !important" }} />}
                            onClick={handleSelectAllParticipants}
                            sx={{
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              textTransform: "none",
                              py: 0.2,
                              px: 1,
                              color: "#7c3aed",
                              borderRadius: "6px",
                              "&:hover": {
                                bgcolor: "rgba(124, 58, 237, 0.08)",
                              },
                            }}
                          >
                            Select All
                          </Button>
                        )}
                      </Box>

                      {/* Participating Member Chips with Remove Icon */}
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          maxHeight: 140,
                          overflowY: "auto",
                          p: 0.5,
                        }}
                      >
                        {participatingMembers.length === 0 ? (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontStyle: "italic", py: 1 }}
                          >
                            No members selected. Click on excluded members below or click "Select All".
                          </Typography>
                        ) : (
                          participatingMembers.map((m) => {
                            const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
                            return (
                              <Chip
                                key={m.memberId}
                                icon={
                                  isWfh ? (
                                    <WfhIcon sx={{ fontSize: "0.9rem !important", color: "#9333ea !important" }} />
                                  ) : (
                                    <OfficeIcon sx={{ fontSize: "0.9rem !important", color: "#0284c7 !important" }} />
                                  )
                                }
                                label={`${m.name} (${isWfh ? "WFH" : "Office"})`}
                                size="small"
                                onDelete={() => handleRemoveParticipant(m.memberId)}
                                deleteIcon={
                                  <CloseRoundedIcon
                                    sx={{
                                      fontSize: "0.95rem !important",
                                      color: isWfh ? "#9333ea !important" : "#0284c7 !important",
                                      "&:hover": { color: "#ef4444 !important" },
                                    }}
                                  />
                                }
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.76rem",
                                  borderRadius: "16px",
                                  py: 0.5,
                                  px: 0.5,
                                  bgcolor: isWfh ? "#f5f3ff" : "#f0f9ff",
                                  color: isWfh ? "#7c3aed" : "#0369a1",
                                  border: "1px solid",
                                  borderColor: isWfh ? "#ddd6fe" : "#bae6fd",
                                }}
                              />
                            );
                          })
                        )}
                      </Box>

                      {/* Excluded Members (Click to add back) */}
                      {excludedMembers.length > 0 && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed #cbd5e1" }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.74rem",
                              color: "#64748b",
                              fontWeight: 600,
                              display: "block",
                              mb: 0.8,
                            }}
                          >
                            Excluded Members ({excludedMembers.length}) — Click to add back:
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.8,
                              maxHeight: 90,
                              overflowY: "auto",
                            }}
                          >
                            {excludedMembers.map((m) => {
                              const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
                              return (
                                <Chip
                                  key={m.memberId}
                                  icon={<AddIcon sx={{ fontSize: "0.85rem !important", color: "#64748b !important" }} />}
                                  label={`${m.name} (${isWfh ? "WFH" : "Office"})`}
                                  size="small"
                                  onClick={() => handleAddParticipant(m.memberId)}
                                  sx={{
                                    fontWeight: 500,
                                    fontSize: "0.74rem",
                                    borderRadius: "6px",
                                    py: 0.4,
                                    bgcolor: "rgba(148, 163, 184, 0.1)",
                                    color: "#64748b",
                                    border: "1px dashed #cbd5e1",
                                    cursor: "pointer",
                                    "&:hover": {
                                      bgcolor: "rgba(124, 58, 237, 0.12)",
                                      color: "#7c3aed",
                                      borderColor: "#7c3aed",
                                    },
                                  }}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )
                )}

                {/* Non-Birthday Event or Fallback: Base Amount */}
                {!isBirthday && computedBudgetItems.length === 1 && computedBudgetItems[0].amount === 0 && (
                  <Box sx={{ mt: 2.5 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <AppInput
                          label="Base Amount"
                          placeholder="Enter base amount (₹)"
                          fullWidth
                          value={formatBaseAmount(form.baseAmount)}
                          onChange={(e) => {
                            const rawVal = e.target.value.replace(/[^0-9]/g, "");
                            setForm((f) => ({ ...f, baseAmount: rawVal }));
                            if (errors.baseAmount) {
                              setErrors((prev) => ({ ...prev, baseAmount: "" }));
                            }
                          }}
                          startAdornment={
                            <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>
                              ₹
                            </Typography>
                          }
                          error={!!errors.baseAmount}
                          helperText={errors.baseAmount}
                          required
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Optional Description */}
                <Box sx={{ mt: 2.5 }}>
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
                    rows={3}
                    fullWidth
                    helperText={`${form.description?.length || 0}/500 characters`}
                  />
                </Box>
              </Box>
            </Grid>

            {/* Top-Right Card: Calculated Event Summary */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Box
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "#ffffff"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#e8e5f2"),
                  borderRadius: "14px",
                  p: { xs: 2, sm: 2.5 },
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Card Header */}
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e"),
                    mb: 1.5,
                  }}
                >
                  Calculated Event Summary
                </Typography>

                {/* 6-Row Vertical Metric List */}
                <Box sx={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-around" }}>
                  {/* Row 1: Birthday Members / Total Members */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.2,
                      borderBottom: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                    }}
                  >
                    <Typography sx={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
                      {isBirthday ? "Birthday Members" : "Total Members"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                      }}
                    >
                      {isBirthday ? bdays : total}
                    </Typography>
                  </Box>

                  {/* Row 2: Office / WFH */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.2,
                      borderBottom: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                    }}
                  >
                    <Typography sx={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
                      Office / WFH
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                      }}
                    >
                      {isBirthday ? `${office} / ${wfh}` : `${officeMembers} / ${wfhMembers}`}
                    </Typography>
                  </Box>

                  {/* Row 3: Eligible Contributors */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.2,
                      borderBottom: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                    }}
                  >
                    <Typography sx={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
                      Eligible Contributors
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                      }}
                    >
                      {eligible}
                    </Typography>
                  </Box>

                  {/* Row 4: Planned Budget */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.2,
                      borderBottom: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                    }}
                  >
                    <Typography sx={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
                      Planned Budget
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                      }}
                    >
                      ₹{plannedBudget.toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  {/* Row 5: Contribution / Member */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.2,
                      borderBottom: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f1f5f9"),
                    }}
                  >
                    <Typography sx={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
                      Contribution / Member
                    </Typography>
                    <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: "#0284c7" }}>
                      ₹{contributionPerMember.toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  {/* Row 6: Expected Collection */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.2,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 500 }}>
                      Expected Collection
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                      }}
                    >
                      ₹{expectedCollection.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Bottom Card: Budget Calculations */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "background.paper" : "#ffffff"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#e8e5f2"),
                  borderRadius: "14px",
                  p: { xs: 2, sm: 2.5 },
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
                }}
              >
                {/* Top Section */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    mb: 1.2,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e"),
                    }}
                  >
                    Budget Calculations
                  </Typography>

                  {/* Right Summary Pill Badge */}
                  <Box
                    sx={{
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                      border: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
                      borderRadius: "16px",
                      px: 1.5,
                      py: 0.4,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#475569",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                      }}
                    >
                      ₹{plannedBudget.toLocaleString("en-IN")} Total Budget ÷ {eligible} Members = ₹{contributionPerMember}/person
                    </Typography>
                  </Box>
                </Box>

                {/* Formula Text */}
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "#64748b",
                    mb: 2,
                    lineHeight: 1.5,
                  }}
                >
                  Calculation: {dynamicFormulaText ? `${dynamicFormulaText}. ` : ""}
                  Total planned budget is divided equally among eligible contributing members.
                </Typography>

                {/* Table Content */}
                <Box sx={{ width: "100%" }}>
                  {/* Header Row */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1.4fr 1.6fr 1fr 1fr", sm: "1.8fr 2.2fr 1fr 1.2fr" },
                      gap: 2,
                      pb: 1.2,
                      borderBottom: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? "divider" : "#f1f5f9",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      color: "#64748b",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ textAlign: "left" }}>Expense Item</Box>
                    <Box sx={{ textAlign: "left" }}>Calculation</Box>
                    <Box sx={{ textAlign: "left" }}>Rate</Box>
                    <Box sx={{ textAlign: "right" }}>Amount</Box>
                  </Box>

                  {/* Table Rows */}
                  {computedBudgetItems.map((item, idx) => (
                    <Box
                      key={item.budgetCalculationId || item.expenseItem || idx}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1.4fr 1.6fr 1fr 1fr", sm: "1.8fr 2.2fr 1fr 1.2fr" },
                        gap: 2,
                        py: 1.4,
                        borderBottom: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? "divider" : "#f8fafc",
                        alignItems: "center",
                      }}
                    >
                      {/* Expense Item with Category Tag */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
                            fontSize: "0.86rem",
                          }}
                        >
                          {item.expenseItem}
                        </Typography>
                        {selectedTypes.length > 1 && item.category && (
                          <Chip
                            label={item.category}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              bgcolor: "rgba(124, 58, 237, 0.08)",
                              color: "#7c3aed",
                              border: "1px solid rgba(124, 58, 237, 0.2)",
                            }}
                          />
                        )}
                      </Box>

                      {/* Calculation */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#94a3b8" : "#475569",
                          fontSize: "0.85rem",
                          textAlign: "left",
                          fontWeight: 500,
                        }}
                      >
                        {item.calcText}
                      </Typography>

                      {/* Rate */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#94a3b8" : "#475569",
                          fontSize: "0.85rem",
                          textAlign: "left",
                          fontWeight: 500,
                        }}
                      >
                        ₹{item.rate.toLocaleString("en-IN")}
                      </Typography>

                      {/* Amount */}
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          textAlign: "right",
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#f8fafc" : "#1e293b",
                          fontSize: "0.9rem",
                        }}
                      >
                        ₹{item.amount.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  ))}

                  {/* Total Amount Right-Aligned Footer */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 1.5,
                      pt: 2.5,
                      pb: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                      }}
                    >
                      Total Amount:
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
                      }}
                    >
                      ₹{plannedBudget.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Bottom Action Footer */}
          <Divider sx={{ my: 3, borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#e8e5f2") }} />
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
            <AppButton
              variant="outlined"
              onClick={() => navigate("/events")}
              disabled={saving}
              sx={{ minWidth: 110, borderRadius: "8px" }}
            >
              {readOnly ? "Back to Events" : "Cancel"}
            </AppButton>
            {canEdit && (
              <AppButton
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={saving}
                sx={{
                  bgcolor: "#45386d !important",
                  "&:hover": { bgcolor: "#372c57 !important" },
                  minWidth: 120,
                  borderRadius: "8px",
                  fontWeight: 700,
                }}
              >
                {saving ? "Saving..." : isEdit ? "Update" : "Save"}
              </AppButton>
            )}
          </Box>
        </Box>
      </Paper>
    </div>
  );
}
