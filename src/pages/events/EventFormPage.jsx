import React, { useState, useEffect, useMemo, useRef } from "react";
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
  roundToWhole,
  formatWholeCurrency,
  formatWholeNumber,
  distributeRoundedTotal,
} from "../../utils/roundingHelper";
import {
  createEventAsync,
  updateEventAsync,
  getEventByIdAsync,
  getAvailableAmountInHandAsync,
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
import { TOAST_MESSAGES, MENU_FEATURE_IDS } from "../../constants";

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
  return String(value).replace(/[^a-zA-Z\s]/g, "").trimStart().slice(0, 250);
};

const initialForm = {
  eventName: "",
  eventTypeId: "",
  eventTypeIds: [],
  eventDate: null,
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

function extractContribAmounts(description) {
  if (!description) return { cleanDesc: "", amounts: null, celebrants: null };
  let cleanDesc = description;
  let amounts = null;
  let celebrants = null;

  const matchContrib = description.match(/<!--contrib:(.*?)-->/);
  if (matchContrib) {
    try {
      amounts = JSON.parse(matchContrib[1]);
      cleanDesc = cleanDesc.replace(/<!--contrib:.*?-->/g, "").trim();
    } catch {
      // Ignore parse error
    }
  }

  const matchCelebrants = description.match(/<!--celebrants:(.*?)-->/);
  if (matchCelebrants) {
    try {
      celebrants = JSON.parse(matchCelebrants[1]);
      cleanDesc = cleanDesc.replace(/<!--celebrants:.*?-->/g, "").trim();
    } catch {
      // Ignore parse error
    }
  }

  return { cleanDesc, amounts, celebrants };
}

function formatDescriptionWithContrib(userDesc, amountsObj, celebrantsObj) {
  let clean = (userDesc || "")
    .replace(/<!--contrib:.*?-->/g, "")
    .replace(/<!--celebrants:.*?-->/g, "")
    .trim();

  const tags = [];
  if (amountsObj && Object.keys(amountsObj).length > 0) {
    tags.push(`<!--contrib:${JSON.stringify(amountsObj)}-->`);
  }
  if (celebrantsObj && (celebrantsObj.marriage?.length > 0 || celebrantsObj.sendOff?.length > 0)) {
    tags.push(`<!--celebrants:${JSON.stringify(celebrantsObj)}-->`);
  }

  if (tags.length > 0) {
    return `${clean}${clean ? " " : ""}${tags.join(" ")}`;
  }
  return clean;
}

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

  const activeRole = authState?.role || authState?.roleName;

  // Granular Action Permissions evaluated via MENU_FEATURE_IDS and role rights
  const canAddEvent = hasActionPermission("Add Event", MENU_FEATURE_IDS.EVENT_ADD, activeRole).canExecute;
  const canEditEvent = hasActionPermission("Edit Event", MENU_FEATURE_IDS.EVENT_EDIT, activeRole).canExecute;

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
  const [customItemAmounts, setCustomItemAmounts] = useState({});
  const [extraExpenseItems, setExtraExpenseItems] = useState([]);
  const [marriageCelebrantIds, setMarriageCelebrantIds] = useState([]);
  const [sendOffMemberIds, setSendOffMemberIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [budgetItemsList, setBudgetItemsList] = useState([]);
  const [allowMultipleEvents, setAllowMultipleEvents] = useState(false);
  const [hasPayments, setHasPayments] = useState(false);
  const [isCustomEventName, setIsCustomEventName] = useState(false);
  const [useAvailableBalance, setUseAvailableBalance] = useState(false);
  const [availableAmountInHand, setAvailableAmountInHand] = useState(0);
  const [allocatedAmount, setAllocatedAmount] = useState(0);
  const [selectedDeductionType, setSelectedDeductionType] = useState("available");
  const [customDeductionAmount, setCustomDeductionAmount] = useState("");

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
        const [typesData, usersData, budgetData, settingsData, amountInHandData] = await Promise.all([
          (propEventTypes && propEventTypes.length > 0)
            ? Promise.resolve(propEventTypes)
            : getEventTypesAsync(isEdit),
          (propMembers && propMembers.length > 0)
            ? Promise.resolve(propMembers)
            : getUsersAsync().catch(() => getMembersAsync()),
          getBudgetCalculationsAsync().catch(() => []),
          getSystemSettingsAsync().catch(() => null),
          getAvailableAmountInHandAsync().catch(() => null),
        ]);

        if (!isMounted) return;

        const handAmt = amountInHandData?.availableAmountInHand ?? amountInHandData?.data?.availableAmountInHand ?? 0;
        setAvailableAmountInHand(Number(handAmt) || 0);

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

          let savedBaseAmount = Math.round(Number(detailedEvent.baseAmount || 0));
          let initialBaseAmount = savedBaseAmount > 0 ? String(savedBaseAmount) : "";

          const { cleanDesc, amounts: savedContribAmounts, celebrants: savedCelebrants } = extractContribAmounts(detailedEvent.description);
          if (savedCelebrants) {
            if (Array.isArray(savedCelebrants.marriage)) setMarriageCelebrantIds(savedCelebrants.marriage);
            if (Array.isArray(savedCelebrants.sendOff)) setSendOffMemberIds(savedCelebrants.sendOff);
          }

          const editNonBdays = (typesData || []).filter(
            (t) => eventTypeIdsList.includes(t.eventTypeId) && !t.eventTypeName?.toLowerCase().includes("birthday")
          );

          if (savedContribAmounts && Object.keys(savedContribAmounts).length > 0) {
            setOtherEventAmounts(savedContribAmounts);
            if (editNonBdays.length === 1 && savedContribAmounts[editNonBdays[0].eventTypeId] !== undefined) {
              initialBaseAmount = String(savedContribAmounts[editNonBdays[0].eventTypeId]);
            }
          } else if (editNonBdays.length === 1 && savedBaseAmount > 0) {
            const type = editNonBdays[0];
            const typeName = type.eventTypeName || "Event";
            const typeMasterItems = activeBudgetItems.filter((b) => {
              if (b.isActive === false) return false;
              if (type.eventTypeId && b.eventTypeId && b.eventTypeId.toLowerCase() === type.eventTypeId.toLowerCase()) {
                return true;
              }
              const cat = (b.category || "").toLowerCase().trim();
              return cat === typeName.toLowerCase() || cat.includes(typeName.toLowerCase());
            });

            const masterTotal = typeMasterItems.reduce((sum, item) => {
              const rate = Number(item.rate) || 0;
              return sum + rate;
            }, 0);

            let netContribAmount = savedBaseAmount;
            if (masterTotal > 0 && savedBaseAmount > masterTotal) {
              netContribAmount = Math.max(0, savedBaseAmount - masterTotal);
            }
            const expectedVal = netContribAmount;
            setOtherEventAmounts({
              [type.eventTypeId]: String(expectedVal),
            });
            initialBaseAmount = String(expectedVal);
          } else if (editNonBdays.length > 1 && savedBaseAmount > 0) {
            const splitPerType = Math.round(savedBaseAmount / editNonBdays.length);
            const initialMap = {};
            editNonBdays.forEach((t) => {
              initialMap[t.eventTypeId] = String(splitPerType);
            });
            setOtherEventAmounts(initialMap);
          }

          const paidAmount = Number(
            detailedEvent.totalPaidAmount ||
            detailedEvent.collectedAmount ||
            detailedEvent.paidAmount ||
            0
          );
          const hasAnyPaid =
            detailedEvent.hasPaidContributions === true ||
            Number(detailedEvent.paidContributionsCount || 0) > 0 ||
            paidAmount > 0 ||
            (detailedEvent.contributions || []).some((c) => {
              const pStatus = String(c.paymentStatus || "").toLowerCase();
              const sName = String(c.statusName || c.status || "").toLowerCase();
              const hasCash = Number(c.cashAmount || 0) > 0;
              const hasUpi = Number(c.upiAmount || 0) > 0;
              const hasPaidAmt = Number(c.paidAmount || c.amountPaid || 0) > 0;
              const hasPaymentDate = Boolean(c.paymentDate);
              const isPaidStatus = pStatus === "paid" || Number(c.paymentStatus) === 2 || ["paid", "verified", "closed", "completed", "approved"].some((st) => sName.includes(st));
              return hasCash || hasUpi || hasPaidAmt || hasPaymentDate || isPaidStatus;
            });
          setHasPayments(Boolean(hasAnyPaid));

          if (isEdit && hasAnyPaid) {
            toast.warning("This event cannot be edited because one or more members have already paid their contributions.");
            if (isDialog && onClose) {
              onClose();
            } else {
              navigate("/events", { replace: true });
            }
            return;
          }

          setIsCustomEventName(Boolean(detailedEvent.eventName));
          const hasBal = Boolean(detailedEvent.useAvailableBalance);
          const savedAlloc = Number(detailedEvent.allocatedAmount) || 0;
          setUseAvailableBalance(hasBal);
          setAllocatedAmount(savedAlloc);
          if (hasBal) {
            const availAmt = Number(amountInHandData?.availableAmountInHand ?? amountInHandData?.data?.availableAmountInHand ?? 0);
            if (savedAlloc > 0 && Math.abs(savedAlloc - availAmt) > 0.01) {
              setSelectedDeductionType("custom");
              setCustomDeductionAmount(String(savedAlloc));
            } else {
              setSelectedDeductionType("available");
              setCustomDeductionAmount("");
            }
          }
          setForm({
            eventId: detailedEvent.eventId || id,
            eventName: detailedEvent.eventName || "",
            eventTypeId: detailedEvent.eventTypeId || defaultTypeId,
            eventTypeIds: eventTypeIdsList,
            eventDate: currentEventDate,
            description: (cleanDesc && !cleanDesc.startsWith("Birthday celebration (") && !cleanDesc.includes("Planned Budget:"))
              ? cleanDesc
              : "",
            status: detailedEvent.status || "Planned",
            baseAmount: initialBaseAmount,
            participantIds: pIds,
          });
          setSelectedParticipantIds(pIds);
          participantsInitializedRef.current = true;
        } else {
          // Creating a new event
          const defaultDate = propEvent?.eventDate ? dayjs(propEvent.eventDate) : dayjs();
          const targetMonth = defaultDate && defaultDate.isValid() ? defaultDate.month() : -1;
          const celebrantsInMonth = targetMonth >= 0
            ? activeMems.filter(
                (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
              )
            : [];
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
          setIsCustomEventName(false);
          setUseAvailableBalance(false);
          setAllocatedAmount(0);
          setSelectedDeductionType("available");
          setCustomDeductionAmount("");
          setMarriageCelebrantIds([]);
          setSendOffMemberIds([]);

          const isDefaultBday = Boolean(bdayType && defaultTypeId === bdayType.eventTypeId);
          const defaultTypeName = (typesData || []).find((t) => t.eventTypeId === defaultTypeId)?.eventTypeName || "";
          const monthStr = defaultDate && defaultDate.isValid() ? defaultDate.format("MMMM") : "";
          let initialEventName = "";
          if (isDefaultBday) {
            initialEventName = monthStr ? `${monthStr} Birthday Celebration` : "Birthday Celebration";
          } else if (defaultTypeName) {
            initialEventName = monthStr ? `${monthStr} ${defaultTypeName} Celebration` : `${defaultTypeName} Celebration`;
          }

          setForm({
            eventName: sanitizeEventName(initialEventName),
            eventTypeId: defaultTypeId,
            eventTypeIds: defaultTypeId ? [defaultTypeId] : [],
            eventDate: defaultDate,
            description: "",
            baseAmount: "",
            participantIds: [],
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

  const hasMarriageSelected = useMemo(
    () =>
      selectedTypes.some((t) => {
        const name = (t.eventTypeName || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return name.includes("marriage") || cat.includes("marriage") || name.includes("wedding") || cat.includes("wedding");
      }),
    [selectedTypes]
  );

  const hasSendOffSelected = useMemo(
    () =>
      selectedTypes.some((t) => {
        const name = (t.eventTypeName || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return (
          name.includes("send-off") ||
          name.includes("send off") ||
          name.includes("sendoff") ||
          name.includes("farewell") ||
          name.includes("relieving") ||
          cat.includes("send-off") ||
          cat.includes("send off") ||
          cat.includes("farewell") ||
          cat.includes("relieving")
        );
      }),
    [selectedTypes]
  );

  // Event types that do NOT have configured expense items (require manual contribution amount)
  const typesWithoutExpenseItems = useMemo(() => {
    return nonBirthdaySelectedTypes.filter((type) => {
      const typeMasterItems = budgetItemsList.filter((b) => {
        if (b.isActive === false) return false;
        if (type.eventTypeId && b.eventTypeId && b.eventTypeId.toLowerCase() === type.eventTypeId.toLowerCase()) {
          return true;
        }
        const cat = (b.category || "").toLowerCase().trim();
        return cat === (type.eventTypeName || "").toLowerCase() || cat.includes((type.eventTypeName || "").toLowerCase());
      });
      return typeMasterItems.length === 0;
    });
  }, [nonBirthdaySelectedTypes, budgetItemsList]);

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
  const participantsInitializedRef = useRef(false);

  useEffect(() => {
    if (!participantsInitializedRef.current && activeMembers.length > 0 && isEdit) {
      if (form.participantIds && form.participantIds.length > 0) {
        setSelectedParticipantIds(form.participantIds);
        participantsInitializedRef.current = true;
      }
    }
  }, [activeMembers, form.participantIds, isEdit]);

  // Handle Marriage Celebrants change
  const handleMarriageCelebrantsChange = (e) => {
    const val = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
    const newIds = (val || []).filter(Boolean);
    const removedCelebrantIds = marriageCelebrantIds.filter((id) => !newIds.includes(id));

    setMarriageCelebrantIds(newIds);
    if (errors.marriageCelebrantIds) {
      setErrors((prev) => ({ ...prev, marriageCelebrantIds: "" }));
    }

    // Automatically remove chosen marriage celebrants from participating members (they cannot contribute)
    setSelectedParticipantIds((prev) => {
      const allExempt = new Set([...newIds, ...sendOffMemberIds]);
      let updated = prev.filter((id) => !allExempt.has(id));
      removedCelebrantIds.forEach((id) => {
        if (!allExempt.has(id) && !updated.includes(id)) {
          updated.push(id);
        }
      });
      setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
      return updated;
    });
  };

  // Handle Send-off / Relieving Members change
  const handleSendOffMembersChange = (e) => {
    const val = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
    const newIds = (val || []).filter(Boolean);
    const removedSendOffIds = sendOffMemberIds.filter((id) => !newIds.includes(id));

    setSendOffMemberIds(newIds);
    if (errors.sendOffMemberIds) {
      setErrors((prev) => ({ ...prev, sendOffMemberIds: "" }));
    }

    // Automatically remove chosen send-off members from participating members (they cannot contribute)
    setSelectedParticipantIds((prev) => {
      const allExempt = new Set([...marriageCelebrantIds, ...newIds]);
      let updated = prev.filter((id) => !allExempt.has(id));
      removedSendOffIds.forEach((id) => {
        if (!allExempt.has(id) && !updated.includes(id)) {
          updated.push(id);
        }
      });
      setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
      return updated;
    });
  };

  // Auto-clean celebrants and restore participants when their corresponding event type is deselected
  useEffect(() => {
    if (!hasMarriageSelected && marriageCelebrantIds.length > 0) {
      setSelectedParticipantIds((prev) => {
        const toAdd = marriageCelebrantIds.filter((id) => !prev.includes(id));
        const updated = [...prev, ...toAdd];
        setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
        return updated;
      });
      setMarriageCelebrantIds([]);
    }
  }, [hasMarriageSelected, marriageCelebrantIds]);

  useEffect(() => {
    if (!hasSendOffSelected && sendOffMemberIds.length > 0) {
      setSelectedParticipantIds((prev) => {
        const toAdd = sendOffMemberIds.filter((id) => !prev.includes(id));
        const updated = [...prev, ...toAdd];
        setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
        return updated;
      });
      setSendOffMemberIds([]);
    }
  }, [hasSendOffSelected, sendOffMemberIds]);

  // All active members options for celebrant multi-selects
  const allActiveMemberOptions = useMemo(
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

  // Options for Participating Members AppMultiSelect (exempt celebrants are marked and disabled)
  const memberOptions = useMemo(() => {
    const exemptLookup = new Map();
    marriageCelebrantIds.forEach((id) => exemptLookup.set(id, "Celebrating Marriage - Exempt"));
    sendOffMemberIds.forEach((id) => exemptLookup.set(id, "Send-off - Exempt"));

    return activeMembers.map((m) => {
      const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
      const exemptReason = exemptLookup.get(m.memberId);
      return {
        label: exemptReason
          ? `${m.name} (${isWfh ? "WFH" : "Office"}) - [${exemptReason}]`
          : `${m.name} (${isWfh ? "WFH" : "Office"})`,
        value: m.memberId,
        disabled: Boolean(exemptReason),
      };
    });
  }, [activeMembers, marriageCelebrantIds, sendOffMemberIds]);

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
    setSelectedParticipantIds((prev) => {
      const updated = prev.filter((id) => id !== memberId);
      setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
      return updated;
    });
  };

  // Handler to add back a deselected member
  const handleAddParticipant = (memberId) => {
    const allExempt = new Set([...marriageCelebrantIds, ...sendOffMemberIds]);
    if (allExempt.has(memberId)) return;
    setSelectedParticipantIds((prev) => {
      const updated = prev.includes(memberId) ? prev : [...prev, memberId];
      setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
      return updated;
    });
  };

  // Handler to reset/select all members (excluding exempt celebrants)
  const handleSelectAllParticipants = () => {
    const allExempt = new Set([...marriageCelebrantIds, ...sendOffMemberIds]);
    const updated = activeMembers.filter((m) => !allExempt.has(m.memberId)).map((m) => m.memberId);
    setSelectedParticipantIds(updated);
    setForm((formPrev) => ({ ...formPrev, participantIds: updated }));
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

  // Office birthday celebrants
  const officeCelebrants = useMemo(() => {
    return monthCelebrants.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
    );
  }, [monthCelebrants]);

  // Unique celebration dates among office celebrants (members born on same day celebrate simultaneously)
  const uniqueOfficeCelebrationDates = useMemo(() => {
    const dates = new Set();
    officeCelebrants.forEach((m) => {
      if (m.dateOfBirth) {
        dates.add(dayjs(m.dateOfBirth).format("DD-MM"));
      }
    });
    return Array.from(dates);
  }, [officeCelebrants]);

  // If two or three members celebrate on the same date, cake and snacks are considered as ONE for that date
  const officeCakeAndSnacksCount = useMemo(() => {
    if (uniqueOfficeCelebrationDates.length > 0) {
      return uniqueOfficeCelebrationDates.length;
    }
    return office > 0 ? office : 0;
  }, [uniqueOfficeCelebrationDates, office]);

  const puffsFactor = officeCakeAndSnacksCount;

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

      const effectiveBdayItems = bdayMasterItems;

      effectiveBdayItems.forEach((item) => {
        const itemKey = `bday_${item.budgetCalculationId || item.expenseItem}`;
        const name = (item.expenseItem || "").toLowerCase();
        const rate = Number(item.rate) || 0;
        let calcText = "";
        let calcFormula = "";
        let autoAmount = 0;
        let formulaPart = "";

        if (name.includes("cake")) {
          const cakeCount = officeCakeAndSnacksCount;
          calcText = cakeCount > 0 ? `${cakeCount} × ₹${formatWholeNumber(rate)}` : "₹0";
          calcFormula = cakeCount > 0
            ? (office > cakeCount
                ? `${cakeCount} Cake${cakeCount > 1 ? "s" : ""} (${office} Celebrants on same date) × ₹${formatWholeNumber(rate)}`
                : `Office Celebrations (${cakeCount}) × ₹${formatWholeNumber(rate)}`)
            : "No office celebrants";
          autoAmount = cakeCount * rate;
          formulaPart = `Cake (${cakeCount} × ₹${formatWholeNumber(rate)})`;
        } else if (
          name.includes("gift") ||
          name.includes("present") ||
          name.includes("voucher") ||
          name.includes("memento")
        ) {
          calcText = `${bdays} × ₹${formatWholeNumber(rate)}`;
          calcFormula = `Total Celebrants (${bdays}) × ₹${formatWholeNumber(rate)}`;
          autoAmount = bdays * rate;
          formulaPart = `Gift (${bdays} Celebrants × ₹${formatWholeNumber(rate)})`;
        } else {
          if (puffsFactor > 0) {
            calcText = `${total} × ₹${formatWholeNumber(rate)}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""}`;
            calcFormula = puffsFactor > 1
              ? `Active Members (${total}) × ₹${formatWholeNumber(rate)} × ${puffsFactor} Celebrations`
              : (office > 1 && puffsFactor === 1
                  ? `Active Members (${total}) × ₹${formatWholeNumber(rate)} (${office} Celebrants on same date)`
                  : `Active Members (${total}) × ₹${formatWholeNumber(rate)}`);
            autoAmount = total * rate * puffsFactor;
          } else {
            calcText = "WFH only → Not provided";
            calcFormula = "WFH only → Not provided";
            autoAmount = 0;
          }
          formulaPart = `${item.expenseItem} (Total Active Members × ₹${formatWholeNumber(rate)}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""})`;
        }

        const isManual = customItemAmounts[itemKey] !== undefined && customItemAmounts[itemKey] !== "";
        const amount = isManual ? (Number(customItemAmounts[itemKey]) || 0) : autoAmount;

        items.push({
          ...item,
          key: itemKey,
          category: "Birthday",
          rate,
          autoAmount,
          amount,
          isManual,
          calcText,
          calcFormula,
          formulaPart: isManual ? `${item.expenseItem} (Manual: ₹${formatWholeNumber(amount)})` : formulaPart,
        });
      });
    }

    // 2. Non-Birthday Event items (each other selected event type)
    nonBirthdaySelectedTypes.forEach((type) => {
      const typeName = type.eventTypeName || "Event";
      const typeMasterItems = budgetItemsList.filter((b) => {
        if (b.isActive === false) return false;
        if (type.eventTypeId && b.eventTypeId && b.eventTypeId.toLowerCase() === type.eventTypeId.toLowerCase()) {
          return true;
        }
        const cat = (b.category || "").toLowerCase().trim();
        return cat === typeName.toLowerCase() || cat.includes(typeName.toLowerCase());
      });

      // 1. Add all master items configured for this event type
      if (typeMasterItems.length > 0) {
        typeMasterItems.forEach((item) => {
          const itemKey = `type_${type.eventTypeId}_${item.budgetCalculationId || item.expenseItem}`;
          const rate = Number(item.rate) || 0;
          const isGift = (item.expenseItem || "").toLowerCase().includes("gift") ||
                         (item.expenseItem || "").toLowerCase().includes("memento") ||
                         (item.expenseItem || "").toLowerCase().includes("present");
          const isMarriageType = typeName.toLowerCase().includes("marriage");
          const isSendOffType = typeName.toLowerCase().includes("send") || typeName.toLowerCase().includes("farewell");

          const celebrantMultiplier = isMarriageType && marriageCelebrantIds.length > 1
            ? marriageCelebrantIds.length
            : (isSendOffType && sendOffMemberIds.length > 1
                ? sendOffMemberIds.length
                : 1);

          const autoAmount = isGift ? rate * celebrantMultiplier : rate;
          const isManual = customItemAmounts[itemKey] !== undefined && customItemAmounts[itemKey] !== "";
          const amount = isManual ? (Number(customItemAmounts[itemKey]) || 0) : autoAmount;
          const formattedAmount = formatWholeNumber(amount);
          const splitPerPerson = total > 0 ? roundToWhole(amount / total) : 0;
          let calcFormula = total > 0
            ? `₹${formattedAmount} ÷ ${total} Members`
            : `₹${formattedAmount}`;
          if (isGift && celebrantMultiplier > 1) {
            calcFormula = `${celebrantMultiplier} Celebrants × ₹${formatWholeNumber(rate)} = ₹${formattedAmount}${total > 0 ? ` (₹${formatWholeNumber(splitPerPerson)}/member)` : ""}`;
          }
          const calcText = total > 0
            ? `₹${formattedAmount} ÷ ${total}`
            : `₹${formattedAmount}`;

          items.push({
            ...item,
            key: itemKey,
            category: typeName,
            rate,
            autoAmount,
            amount,
            isManual,
            calcText,
            calcFormula,
            formulaPart: isManual
              ? `${item.expenseItem} (Manual: ₹${formattedAmount})`
              : (isGift && celebrantMultiplier > 1
                  ? `${item.expenseItem} (${celebrantMultiplier} Celebrants × ₹${formatWholeNumber(rate)})`
                  : `${item.expenseItem} (₹${formattedAmount})`),
            isOtherEvent: true,
            splitPerPerson,
          });
        });
      }

      // 2. Add the Event Contribution Amount entered in the form ONLY IF NO CONFIGURED EXPENSE ITEMS
      if (typeMasterItems.length === 0) {
        const rawVal = otherEventAmounts[type.eventTypeId] !== undefined
          ? otherEventAmounts[type.eventTypeId]
          : (nonBirthdaySelectedTypes.length === 1 && typeMasterItems.length === 0 ? form.baseAmount : "");
        const numVal = parseFloat(String(rawVal)) || 0;

        const itemKey = `type_${type.eventTypeId}_contrib`;
        const isManual = customItemAmounts[itemKey] !== undefined && customItemAmounts[itemKey] !== "";
        const enteredAmount = isManual ? (Number(customItemAmounts[itemKey]) || 0) : numVal;
        const amount = enteredAmount;
        const splitPerPerson = total > 0 ? roundToWhole(amount / total) : 0;

        const formattedTotal = formatWholeNumber(amount);
        const formattedSplit = formatWholeNumber(splitPerPerson);

        const calcText = amount > 0
          ? (total > 0 ? `₹${formattedTotal} ÷ ${total}` : `₹${formattedTotal}`)
          : "Enter Expected Amount";

        const calcFormula = amount > 0
          ? (total > 0 ? `₹${formattedTotal} ÷ ${total} Members` : `₹${formattedTotal}`)
          : "₹0";

        const displayName = typesWithoutExpenseItems.length === 1
          ? "Expected Amount"
          : `${typeName} Expected Amount`;

        const formulaPart = amount > 0
          ? `${displayName} (₹${formattedTotal})`
          : `${displayName}: ₹0`;

        items.push({
          id: `${type.eventTypeId}_contrib`,
          key: itemKey,
          expenseItem: displayName,
          category: typeName,
          rate: amount,
          autoAmount: numVal,
          amount,
          isManual,
          calcText,
          calcFormula,
          formulaPart,
          isOtherEvent: true,
          splitPerPerson,
        });
      }
    });

    // 3. Extra custom items added by user
    extraExpenseItems.forEach((extra) => {
      const itemKey = `extra_${extra.id}`;
      const amount = customItemAmounts[itemKey] !== undefined && customItemAmounts[itemKey] !== ""
        ? (Number(customItemAmounts[itemKey]) || 0)
        : (Number(extra.amount) || 0);

      items.push({
        id: extra.id,
        key: itemKey,
        expenseItem: extra.name,
        category: "Custom",
        rate: amount,
        autoAmount: Number(extra.amount) || 0,
        amount,
        isManual: true,
        isCustom: true,
        calcText: `Custom Expense: ₹${formatWholeNumber(amount)}`,
        calcFormula: "Custom Expense",
        formulaPart: `${extra.name} (₹${formatWholeNumber(amount)})`,
        isOtherEvent: true,
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
    officeCakeAndSnacksCount,
    marriageCelebrantIds,
    sendOffMemberIds,
    otherEventAmounts,
    form.baseAmount,
    customItemAmounts,
    extraExpenseItems,
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

  const plannedBudget = roundToWhole(computedBudgetItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));

  const effectiveDeduction = useMemo(() => {
    if (!useAvailableBalance) return 0;
    if (selectedDeductionType === "custom") {
      const customVal = parseFloat(customDeductionAmount);
      return isNaN(customVal) || customVal < 0 ? 0 : roundToWhole(customVal);
    }
    return roundToWhole(availableAmountInHand);
  }, [useAvailableBalance, selectedDeductionType, customDeductionAmount, availableAmountInHand]);

  const remainingBudgetToCollect = useMemo(() => {
    if (!useAvailableBalance) return plannedBudget;
    return Math.max(0, plannedBudget - effectiveDeduction);
  }, [useAvailableBalance, plannedBudget, effectiveDeduction]);

  const contributionPerMember = useMemo(() => {
    if (isBirthday && exempt && celebrantCount > 0) {
      const scaleFactor = plannedBudget > 0 ? remainingBudgetToCollect / plannedBudget : 0;
      const bdayPart = birthdaySharePerPerson * scaleFactor;
      const otherPart = otherEventsSharePerPerson * scaleFactor;
      return roundToWhole(bdayPart + otherPart);
    }
    return total > 0 ? roundToWhole(remainingBudgetToCollect / total) : 0;
  }, [
    isBirthday,
    exempt,
    celebrantCount,
    birthdaySharePerPerson,
    otherEventsSharePerPerson,
    plannedBudget,
    remainingBudgetToCollect,
    total,
  ]);

  const expectedCollection = remainingBudgetToCollect;

  const balanceValidationError = useMemo(() => {
    if (!useAvailableBalance) return null;
    if (selectedDeductionType === "custom") {
      const customNum = parseFloat(customDeductionAmount);
      if (isNaN(customNum) || customNum <= 0) {
        return "Please enter a valid deduction amount greater than ₹0.";
      }
      if (customNum > availableAmountInHand) {
        return `Deduction amount (${formatWholeCurrency(customNum)}) exceeds available Amount In Hand (${formatWholeCurrency(availableAmountInHand)}).`;
      }
      if (customNum > plannedBudget) {
        return `Deduction amount (${formatWholeCurrency(customNum)}) cannot exceed the planned budget (${formatWholeCurrency(plannedBudget)}).`;
      }
    } else {
      if (availableAmountInHand <= 0) {
        return "No available Amount In Hand to deduct.";
      }
      if (availableAmountInHand > plannedBudget) {
        return `Available balance (${formatWholeCurrency(availableAmountInHand)}) exceeds the planned budget (${formatWholeCurrency(plannedBudget)}). Please select Custom Amount to deduct up to ${formatWholeCurrency(plannedBudget)}.`;
      }
    }
    return null;
  }, [useAvailableBalance, selectedDeductionType, customDeductionAmount, availableAmountInHand, plannedBudget]);

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
    if (!isEdit && !isCustomEventName) {
      const monthStr = form.eventDate && dayjs(form.eventDate).isValid()
        ? dayjs(form.eventDate).format("MMMM")
        : "";
      if (monthStr) {
        updatedName = isNewBday
          ? `${monthStr} Birthday Celebration`
          : `${monthStr} ${newTypeName} Celebration`;
      } else {
        updatedName = isNewBday
          ? `Birthday Celebration`
          : (newTypeName ? `${newTypeName} Celebration` : "");
      }
      updatedName = sanitizeEventName(updatedName);
    }

    const initialParticipants = isEdit ? (selectedParticipantIds.length > 0 ? selectedParticipantIds : (form.participantIds || [])) : [];
    if (!isEdit) {
      setSelectedParticipantIds([]);
    }

    const offTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
    ).length;
    const wfhTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
    ).length;

    if (isNewBday) {
      const targetMonth = form.eventDate && dayjs(form.eventDate).isValid()
        ? dayjs(form.eventDate).month()
        : -1;
      const celebrantsInMonth = targetMonth >= 0
        ? activeMembers.filter(
            (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
          )
        : [];
      const offCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount);
      setWfhBirthdays(wfhCount);
      setTotalMembers(activeMembers.length);
      setOfficeMembers(offTotal);
      setWfhMembers(wfhTotal);
    } else {
      const currParticipants = isEdit ? initialParticipants : [];
      const pMembers = activeMembers.filter((m) => currParticipants.includes(m.memberId));
      setTotalMembers(pMembers.length);
      const offCount = pMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = pMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeMembers(offCount);
      setWfhMembers(wfhCount);
    }

    const hasItems = budgetItemsList.some((b) => {
      if (b.isActive === false) return false;
      if (newTypeId && b.eventTypeId && b.eventTypeId.toLowerCase() === newTypeId.toLowerCase()) return true;
      const cat = (b.category || "").toLowerCase().trim();
      return cat === newTypeName.toLowerCase() || cat.includes(newTypeName.toLowerCase());
    });

    if (hasItems) {
      setOtherEventAmounts((prev) => ({
        ...prev,
        [newTypeId]: "",
      }));
    }

    setForm((prev) => ({
      ...prev,
      eventTypeId: newTypeId,
      eventTypeIds: newTypeId ? [newTypeId] : [],
      eventName: updatedName,
      baseAmount: hasItems ? "" : (prev.baseAmount || ""),
      participantIds: isEdit ? initialParticipants : [],
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
    if (!isEdit && !isCustomEventName) {
      const monthStr = form.eventDate && dayjs(form.eventDate).isValid()
        ? dayjs(form.eventDate).format("MMMM")
        : "";
      if (selectedTypesList.length === 0) {
        updatedName = monthStr ? `${monthStr} Celebration` : "Celebration";
      } else if (selectedTypesList.length === 1) {
        updatedName = hasBday
          ? (monthStr ? `${monthStr} Birthday Celebration` : "Birthday Celebration")
          : (monthStr ? `${monthStr} ${selectedTypesList[0].eventTypeName} Celebration` : `${selectedTypesList[0].eventTypeName} Celebration`);
      } else {
        const names = selectedTypesList.map((t) => t.eventTypeName);
        updatedName = monthStr ? `${monthStr} ${names.join(" and ")} Celebration` : `${names.join(" and ")} Celebration`;
      }
      updatedName = sanitizeEventName(updatedName);
    }

    const initialParticipants = isEdit ? (selectedParticipantIds.length > 0 ? selectedParticipantIds : (form.participantIds || [])) : [];
    if (!isEdit) {
      setSelectedParticipantIds([]);
    }

    const offTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
    ).length;
    const wfhTotal = activeMembers.filter(
      (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
    ).length;

    if (hasBday) {
      const targetMonth = form.eventDate && dayjs(form.eventDate).isValid()
        ? dayjs(form.eventDate).month()
        : -1;
      const celebrantsInMonth = targetMonth >= 0
        ? activeMembers.filter(
            (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
          )
        : [];
      const offCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInMonth.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount);
      setWfhBirthdays(wfhCount);
      setTotalMembers(activeMembers.length);
      setOfficeMembers(offTotal);
      setWfhMembers(wfhTotal);
    } else {
      const currParticipants = isEdit ? initialParticipants : [];
      const pMembers = activeMembers.filter((m) => currParticipants.includes(m.memberId));
      setTotalMembers(pMembers.length);
      const offCount = pMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = pMembers.filter(
        (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeMembers(offCount);
      setWfhMembers(wfhCount);
    }

    setForm((prev) => ({
      ...prev,
      eventTypeId: newTypeIds[0] || "",
      eventTypeIds: newTypeIds,
      eventName: updatedName,
      baseAmount: prev.baseAmount || "",
      participantIds: isEdit ? initialParticipants : [],
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
  const handleDateChange = (newDate, customErr) => {
    const validDate = newDate && dayjs(newDate).isValid() ? newDate : null;
    const today = dayjs().startOf("day");

    // Strictly restrict previous date when typing manually or picking in Add mode
    if (!isEdit && ((validDate && dayjs(validDate).isBefore(today)) || customErr)) {
      setErrors((p) => ({ ...p, eventDate: "Cannot create an event for a past date" }));
      toast.error("Cannot create an event for a past date. Please select today or a future date.");
      setForm((c) => ({
        ...c,
        eventDate: today,
      }));
      return;
    }

    const oldMonth = form.eventDate && dayjs(form.eventDate).isValid() ? dayjs(form.eventDate).month() : -1;
    const newMonth = validDate ? dayjs(validDate).month() : -1;

    let newEventName = form.eventName;
    if (!isEdit && !isCustomEventName && validDate) {
      const monthStr = dayjs(validDate).format("MMMM");
      if (selectedTypes.length <= 1) {
        newEventName = isBirthday
          ? `${monthStr} Birthday Celebration`
          : `${monthStr} ${selectedTypeNames[0] || "Event"} Celebration`;
      } else {
        newEventName = `${monthStr} ${selectedTypeNames.join(" and ")} Celebration`;
      }
      newEventName = sanitizeEventName(newEventName);
    }

    if (validDate && oldMonth !== newMonth) {
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
      eventDate: validDate,
      eventName: newEventName,
    }));
    setErrors((p) => ({ ...p, eventDate: validDate ? "" : "This field is required" }));
  };

  const handleSubmit = async () => {
    if (isEdit ? !canEditEvent : !canAddEvent) {
      toast.error(isEdit ? "Access Denied: You do not have permission to edit events." : "Access Denied: You do not have permission to add events.");
      return;
    }

    const requiredMsg = "This field is required";
    const newErrors = {};

    // 1. Mandatory Event Type Validation
    if (allowMultipleEvents) {
      if (!form.eventTypeIds || form.eventTypeIds.length === 0) {
        newErrors.eventTypeId = requiredMsg;
      } else if (form.eventTypeIds.length < 2) {
        newErrors.eventTypeId = "Please select at least 2 Event types";
      }
    } else {
      if (!form.eventTypeId) {
        newErrors.eventTypeId = requiredMsg;
      }
    }

    // 2. Mandatory Event Name Validation
    const rawName = String(form.eventName ?? "").trim();
    if (!rawName) {
      newErrors.eventName = requiredMsg;
    } else if (rawName.length < 3) {
      newErrors.eventName = "Event Name must be at least 3 characters";
    } else if (rawName.length > 250) {
      newErrors.eventName = "Event Name cannot exceed 250 characters";
    }

    // 3. Mandatory Event Date Validation
    if (!form.eventDate || !dayjs(form.eventDate).isValid()) {
      newErrors.eventDate = requiredMsg;
    } else if (!isEdit && dayjs(form.eventDate).isBefore(dayjs().startOf("day"))) {
      newErrors.eventDate = "Cannot create an event for a past date";
    }

    // 3a. Mandatory Celebrant Validation for Marriage and Send-off
    if (hasMarriageSelected && marriageCelebrantIds.length === 0) {
      newErrors.marriageCelebrantIds = "Please select at least one marriage celebrant";
    }
    if (hasSendOffSelected && sendOffMemberIds.length === 0) {
      newErrors.sendOffMemberIds = "Please select at least one send-off / relieving member";
    }

    // 4. Participant validation for non-birthday events if an event type is chosen
    if (!isBirthday && (form.eventTypeId || form.eventTypeIds?.length > 0) && selectedParticipantIds.length === 0) {
      newErrors.participantIds = "Please select at least one participating member";
    }

    // 5. Types without expense items amount validation
    if (typesWithoutExpenseItems.length > 0 && (form.eventTypeId || form.eventTypeIds?.length > 0)) {
      typesWithoutExpenseItems.forEach((t) => {
        const val = otherEventAmounts[t.eventTypeId] !== undefined
          ? otherEventAmounts[t.eventTypeId]
          : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
        const num = parseFloat(String(val)) || 0;

        if (!val || String(val).trim() === "" || num <= 0) {
          const fieldName = typesWithoutExpenseItems.length === 1 ? "Expected amount" : `${t.eventTypeName} expected amount`;
          const errMsg = `${fieldName} is required and cannot be ₹0`;
          newErrors[`baseAmount_${t.eventTypeId}`] = errMsg;
          if (nonBirthdaySelectedTypes.length === 1) {
            newErrors.baseAmount = errMsg;
          }
        }
      });
    }

    // CRITICAL: Block submission and display inline errors on ALL mandatory fields first!
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    // Check budget calculation only after mandatory required fields are valid
    if (plannedBudget <= 0) {
      toast.error("Event cannot be saved with ₹0. Please enter a valid contribution amount or configure budget items.");
      return;
    }

    if (useAvailableBalance) {
      if (balanceValidationError) {
        toast.error(balanceValidationError);
        return;
      }
      if (effectiveDeduction > plannedBudget) {
        toast.error(`Deduction amount (${formatWholeCurrency(effectiveDeduction)}) cannot exceed the planned budget (${formatWholeCurrency(plannedBudget)}).`);
        return;
      }
      if (effectiveDeduction > availableAmountInHand) {
        toast.error(`Deduction amount (${formatWholeCurrency(effectiveDeduction)}) exceeds available Amount In Hand (${formatWholeCurrency(availableAmountInHand)}).`);
        return;
      }
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
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const otherEventsBudget = computedBudgetItems
        .filter((i) => i.category !== "Birthday")
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const celebrantIds = monthCelebrants.map((m) => m.memberId);
      const birthdayEligibleCount = isBirthday
        ? (exempt ? Math.max(0, finalParticipantIds.length - celebrantIds.length) : finalParticipantIds.length)
        : 0;
      const birthdaySharePerPerson = birthdayEligibleCount > 0 ? bdayBudget / birthdayEligibleCount : 0;
      const otherEventsSharePerPerson = finalParticipantIds.length > 0 ? otherEventsBudget / finalParticipantIds.length : 0;

      if (isBirthday && exempt && celebrantIds.length > 0) {
        const scaleFactor = plannedBudget > 0 ? remainingBudgetToCollect / plannedBudget : 0;
        const rawShares = finalParticipantIds.map((mId) =>
          celebrantIds.includes(mId)
            ? otherEventsSharePerPerson * scaleFactor
            : (birthdaySharePerPerson + otherEventsSharePerPerson) * scaleFactor
        );
        const roundedShares = distributeRoundedTotal(remainingBudgetToCollect, rawShares);
        finalParticipantIds.forEach((mId, idx) => {
          contributionOverrides.push({
            memberId: mId,
            amount: roundedShares[idx],
          });
        });
      } else {
        // For non-birthday events, let backend calculate tenure and standard shares dynamically
        // using the exact same calculation engine that powers the preview.
      }

      const celebrantsSummary = isBirthday
        ? monthCelebrants
          .map((c) => `${c.name} (${dayjs(c.dateOfBirth).format("D MMM")})`)
          .join(", ")
        : "";

      const defaultDesc = isBirthday
        ? `Birthday celebration (${office} Office, ${wfh} WFH)${celebrantsSummary ? ` for ${celebrantsSummary}` : ""
        }${nonBirthdaySelectedTypes.length > 0 ? ` + ${nonBirthdaySelectedTypes.map(t => t.eventTypeName).join(" & ")}` : ""}. Planned Budget: ₹${formatWholeNumber(plannedBudget)}, Contribution/member: ₹${formatWholeNumber(contributionPerMember)}`
        : `${selectedTypeNames.join(" & ") || "Event"} celebration for ${total} members. Planned Budget: ₹${formatWholeNumber(plannedBudget)}, Contribution/member: ₹${formatWholeNumber(contributionPerMember)}`;

      const finalTypeIds = allowMultipleEvents && form.eventTypeIds?.length > 0
        ? form.eventTypeIds
        : form.eventTypeId
          ? [form.eventTypeId]
          : [];

      const finalDescription = formatDescriptionWithContrib(
        form.description?.trim(),
        otherEventAmounts,
        { marriage: marriageCelebrantIds, sendOff: sendOffMemberIds }
      );

      const payload = {
        eventName: form.eventName.trim(),
        eventTypeId: finalTypeIds[0] || form.eventTypeId,
        eventTypeIds: finalTypeIds,
        eventDate: dayjs(form.eventDate).hour(12).toISOString(),
        eventDates: isBirthday ? (celebrantDatesCsv || null) : null,
        description: finalDescription,
        status: form.status || "Planned",
        baseAmount: plannedBudget,
        useAvailableBalance: Boolean(useAvailableBalance),
        allocatedAmount: useAvailableBalance ? Number(effectiveDeduction) : 0,
        participantIds: finalParticipantIds,
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
        <Grid container spacing={2}>
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
                      onBlur={() => {
                        if (!form.eventTypeId) {
                          setErrors((p) => ({ ...p, eventTypeId: "This field is required" }));
                        }
                      }}
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
                      const cleanVal = filtered.trim();
                      setForm((c) => ({ ...c, eventName: filtered }));
                      setIsCustomEventName(Boolean(cleanVal));
                      let nameErr = "";
                      if (!cleanVal) {
                        nameErr = "This field is required";
                      } else if (cleanVal.length < 3) {
                        nameErr = "Event Name must be at least 3 characters";
                      } else if (cleanVal.length > 250) {
                        nameErr = "Event Name cannot exceed 250 characters";
                      }
                      setErrors((p) => ({ ...p, eventName: nameErr }));
                    }}
                    onBlur={() => {
                      const cleanVal = String(form.eventName ?? "").trim();
                      if (!cleanVal) {
                        setErrors((p) => ({ ...p, eventName: "This field is required" }));
                      }
                    }}
                    inputProps={{ maxLength: 250 }}
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
                        (form.eventDate && dayjs(form.eventDate).isValid()
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
                      clearable
                      value={form.eventDate}
                      disablePast={!isEdit}
                      minDate={!isEdit ? dayjs().startOf("day") : undefined}
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

                {/* Subsection: Additional Event Contributions (Only for event types without configured expense items) */}
                {typesWithoutExpenseItems.length > 0 && (
                  <>

                    {typesWithoutExpenseItems.map((type) => {
                      const rawVal =
                        otherEventAmounts[type.eventTypeId] !== undefined
                          ? otherEventAmounts[type.eventTypeId]
                          : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
                      const fieldError =
                        errors[`baseAmount_${type.eventTypeId}`] ||
                        (nonBirthdaySelectedTypes.length === 1 ? errors.baseAmount : "");

                      const inputLabel =
                        typesWithoutExpenseItems.length === 1
                          ? "Expected Amount"
                          : `${type.eventTypeName} Expected Amount`;

                      const inputPlaceholder =
                        typesWithoutExpenseItems.length === 1
                          ? "Enter total expected amount (e.g. 5000)"
                          : `Enter ${type.eventTypeName.toLowerCase()} expected amount (₹)`;

                      return (
                        <Grid
                          size={{ xs: 12, sm: typesWithoutExpenseItems.length > 1 ? 6 : 6 }}
                          key={type.eventTypeId}
                        >
                          <AppInput
                            label={inputLabel}
                            placeholder={inputPlaceholder}
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
                            error={!!fieldError}
                            helperText={fieldError}
                          />
                        </Grid>
                      );
                    })}
                  </>
                )}

                {/* Dynamically load celebrant fields ONLY for selected event types */}
                {hasMarriageSelected && (
                  <Grid size={{ xs: 12, sm: hasSendOffSelected ? 6 : 6 }}>
                    <AppMultiSelect
                      label="Marriage Celebrants"
                      placeholder="Select members celebrating marriage"
                      value={marriageCelebrantIds}
                      onChange={handleMarriageCelebrantsChange}
                      options={allActiveMemberOptions}
                      maxHeight={145}
                      required
                      error={!!errors.marriageCelebrantIds}
                      helperText={
                        errors.marriageCelebrantIds ||
                        (marriageCelebrantIds.length > 0
                          ? `${marriageCelebrantIds.length} celebrant${marriageCelebrantIds.length > 1 ? "s" : ""} (exempt from contributing)`
                          : "")
                      }
                    />
                  </Grid>
                )}

                {hasSendOffSelected && (
                  <Grid size={{ xs: 12, sm: hasMarriageSelected ? 6 : 6 }}>
                    <AppMultiSelect
                      label="Send-off / Relieving Members"
                      placeholder="Select members having send-off"
                      value={sendOffMemberIds}
                      onChange={handleSendOffMembersChange}
                      options={allActiveMemberOptions}
                      maxHeight={145}
                      required
                      error={!!errors.sendOffMemberIds}
                      helperText={
                        errors.sendOffMemberIds ||
                        (sendOffMemberIds.length > 0
                          ? `${sendOffMemberIds.length} member${sendOffMemberIds.length > 1 ? "s" : ""} (exempt from contributing)`
                          : "")
                      }
                    />
                  </Grid>
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
                        const allExempt = new Set([...marriageCelebrantIds, ...sendOffMemberIds]);
                        const filteredVal = (val || []).filter((id) => !allExempt.has(id));
                        setSelectedParticipantIds(filteredVal);
                        setForm((prev) => ({ ...prev, participantIds: filteredVal }));
                        if (errors.participantIds) {
                          setErrors((prev) => ({ ...prev, participantIds: "" }));
                        }
                      }}
                      options={memberOptions}
                      maxHeight={145}
                      required
                      error={!!errors.participantIds}
                      helperText={errors.participantIds}
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
                    Identified Celebrants in {form.eventDate && dayjs(form.eventDate).isValid() ? dayjs(form.eventDate).format("MMMM") : ""} ({monthCelebrants.length}):
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
                display: "flex",
                flexDirection: "column",
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
                      ₹{formatWholeNumber(plannedBudget)}
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
                        Contribution Per Member
                      </Typography>
                      {isBirthday && exempt && celebrantCount > 0 && nonBirthdaySelectedTypes.length > 0 && (
                        <Typography sx={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 600 }}>
                          Celebrants: ₹{formatWholeNumber(otherEventsSharePerPerson)}
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: "0.98rem", fontWeight: 800, color: "#0284c7" }}>
                      ₹{formatWholeNumber(contributionPerMember)}
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
                      ₹{formatWholeNumber(expectedCollection)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Use Available Amount In Hand Section */}
              <Box
                sx={{
                  mt: 2,
                  p: { xs: 1.8, sm: 2 },
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.25)" : "#e0e7ff",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.04)" : "#f8faff",
                }}
              >
                {/* Checkbox & Header */}
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Checkbox
                    checked={useAvailableBalance}
                    onChange={(e) => setUseAvailableBalance(e.target.checked)}
                    sx={{
                      p: 0,
                      mt: "2px",
                      color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#4a3f6b"),
                      "&.Mui-checked": {
                        color: (theme) => (theme.palette.mode === "dark" ? "#818cf8" : "#342b54"),
                      },
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => setUseAvailableBalance(!useAvailableBalance)}
                    >
                      Use Available Amount In Hand
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.74rem",
                        color: "#64748b",
                        mt: 0.25,
                        lineHeight: 1.3,
                      }}
                    >
                      Select the amount in hand to calculate the remaining amount in hand.
                    </Typography>
                  </Box>
                </Box>

                {useAvailableBalance && (
                  <Box sx={{ mt: 2 }}>
                    {/* Dropdown for Amount In Hand */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#475569"),
                          mb: 0.6,
                        }}
                      >
                        Amount In Hand
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={selectedDeductionType}
                          onChange={(e) => setSelectedDeductionType(e.target.value)}
                          sx={{
                            borderRadius: "8px",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "background.paper" : "#ffffff",
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1",
                            },
                          }}
                        >
                          <MenuItem value="available" sx={{ fontSize: "0.84rem", fontWeight: 600 }}>
                            ₹{formatWholeNumber(availableAmountInHand)} (Available Amount In Hand)
                          </MenuItem>
                          <MenuItem value="custom" sx={{ fontSize: "0.84rem", fontWeight: 600 }}>
                            Custom Amount...
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {selectedDeductionType === "custom" && (
                      <Box sx={{ mb: 1.8 }}>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#64748b"),
                            mb: 0.5,
                          }}
                        >
                          Deduction Amount (₹)
                        </Typography>
                        <OutlinedInput
                          size="small"
                          fullWidth
                          type="number"
                          placeholder="Enter amount to deduct"
                          value={customDeductionAmount}
                          onChange={(e) => setCustomDeductionAmount(sanitizeDecimalAmount(e.target.value))}
                          startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                          endAdornment={
                            <InputAdornment position="end">
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                                Max: ₹{formatWholeNumber(Math.min(availableAmountInHand, plannedBudget))}
                              </Typography>
                            </InputAdornment>
                          }
                          sx={{
                            borderRadius: "8px",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "background.paper" : "#ffffff",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    )}

                    {/* Calculation Strip */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.08)" : "#f0fdf4",
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.3)" : "#bbf7d0",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.2,
                      }}
                    >
                      {/* Amount In Hand Kitty Impact */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        {/* Previous Amount In Hand */}
                        <Box sx={{ textAlign: "left" }}>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500, mb: 0.2 }}>
                            Previous Amount In Hand
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#0f172a"),
                            }}
                          >
                            ₹{formatWholeNumber(availableAmountInHand)}
                          </Typography>
                        </Box>

                        <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#94a3b8", px: 0.5 }}>
                          -
                        </Typography>

                        {/* Deducted Amount */}
                        <Box sx={{ textAlign: "center" }}>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500, mb: 0.2 }}>
                            Deducted for Event
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#0f172a"),
                            }}
                          >
                            ₹{formatWholeNumber(effectiveDeduction)}
                          </Typography>
                        </Box>

                        <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#94a3b8", px: 0.5 }}>
                          =
                        </Typography>

                        {/* Remaining Amount In Hand */}
                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: availableAmountInHand - effectiveDeduction >= 0 ? "#16a34a" : "#dc2626",
                              mb: 0.2,
                            }}
                          >
                            Remaining Amount In Hand
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: availableAmountInHand - effectiveDeduction >= 0 ? "#16a34a" : "#dc2626",
                            }}
                          >
                            ₹{formatWholeNumber(Math.max(0, availableAmountInHand - effectiveDeduction))}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Event Budget Remaining Breakdown */}
                      <Box
                        sx={{
                          pt: 1,
                          borderTop: "1px dashed",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#bbf7d0",
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.4,
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                            Remaining to Collect:
                          </Typography>
                          <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "#0284c7" }}>
                            ₹{formatWholeNumber(remainingBudgetToCollect)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                            Split across {total} active members:
                          </Typography>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#16a34a" }}>
                            ₹{formatWholeNumber(contributionPerMember)} / member
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Insufficient balance alert */}
                    {balanceValidationError && (
                      <Alert
                        severity="error"
                        sx={{
                          mt: 1.5,
                          py: 0.5,
                          fontSize: "0.76rem",
                          borderRadius: "6px",
                          "& .MuiAlert-message": { lineHeight: 1.3 },
                        }}
                      >
                        {balanceValidationError}
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>

              {/* Calculation Summary Details Section */}
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
                  display: "flex",
                  flexDirection: "column",
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
                              {hasSelectedType
                                ? "No budget calculation items configured for this event type"
                                : "Select an event type to view calculation details"}
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
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span>{item.expenseItem}</span>
                                  {item.isCustom && (
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setExtraExpenseItems((prev) => prev.filter((x) => x.id !== item.id));
                                        setCustomItemAmounts((prev) => {
                                          const copy = { ...prev };
                                          delete copy[item.key];
                                          return copy;
                                        });
                                      }}
                                      sx={{ p: 0.2, color: "#ef4444" }}
                                    >
                                      <CloseRoundedIcon sx={{ fontSize: "0.95rem" }} />
                                    </IconButton>
                                  )}
                                </Box>
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
                                  py: 0.5,
                                  px: 1.5,
                                  textAlign: "left",
                                  color: (theme) =>
                                    theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                      color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                                    }}
                                  >
                                    ₹
                                  </Typography>
                                  <OutlinedInput
                                    size="small"
                                    value={
                                      customItemAmounts[item.key] !== undefined
                                        ? customItemAmounts[item.key]
                                        : (item.amount !== undefined ? item.amount : "")
                                    }
                                    readOnly={true}
                                    disabled={true}
                                    placeholder="0"
                                    sx={{
                                      width: "100%",
                                      maxWidth: 95,
                                      height: 28,
                                      bgcolor: (theme) =>
                                        theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f1f5f9",
                                      borderRadius: "4px",
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      cursor: "not-allowed",
                                      "& input": {
                                        py: 0.2,
                                        px: 0.8,
                                        textAlign: "right",
                                        cursor: "not-allowed",
                                        color: (theme) =>
                                          theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                                        WebkitTextFillColor: (theme) =>
                                          theme.palette.mode === "dark" ? "#ffffff !important" : "#0f172a !important",
                                        opacity: "1 !important",
                                      },
                                      "& fieldset": {
                                        borderColor: item.isManual
                                          ? "#8b5cf6"
                                          : (theme) =>
                                            theme.palette.mode === "dark"
                                              ? "rgba(255,255,255,0.2)"
                                              : "rgba(74,63,107,0.25)",
                                        borderWidth: item.isManual ? "1.5px" : "1px",
                                      },
                                    }}
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Table Sub-actions: Reset if manual override */}
                  {Object.keys(customItemAmounts).length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        mb: 0.5,
                        px: 0.5,
                      }}
                    >
                      <Button
                        size="small"
                        startIcon={<ResetIcon sx={{ fontSize: "0.85rem" }} />}
                        onClick={() => {
                          setCustomItemAmounts({});
                        }}
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#94a3b8",
                          p: 0,
                          textTransform: "none",
                          "&:hover": { color: "#ef4444", bgcolor: "transparent" },
                        }}
                      >
                        Reset Calculations
                      </Button>
                    </Box>
                  )}
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
                    ₹{formatWholeNumber(plannedBudget)}
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
          {(isEdit ? canEditEvent : canAddEvent) && canEdit && (
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
