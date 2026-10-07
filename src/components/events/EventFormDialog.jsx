import React, { useState, useEffect, useMemo } from "react";
import {
  Grid,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Checkbox,
  Button,
} from "@mui/material";
import {
  Save as SaveIcon,
  CakeRounded as CakeIcon,
  FastfoodRounded as SnackIcon,
  CardGiftcardRounded as GiftIcon,
  LocalCafeRounded as DrinkIcon,
  ReceiptRounded as ReceiptIcon,
  PeopleRounded as PeopleIcon,
  RestartAltRounded as ResetIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppMultiSelect from "../common/AppMultiSelect";
import AppTextArea from "../common/AppTextArea";
import AppButton from "../common/AppButton";
import AppDialog from "../common/AppDialog";
import { validateForm } from "../../utils/validation";
import { useAppToast } from "../common/AppToast";
import {
  createEventAsync,
  updateEventAsync,
  getEventByIdAsync,
} from "../../services/eventService";
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

// Dynamic calculation rules for Birthday events loaded from backend
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
  eventId: "",
  eventName: "",
  eventTypeId: "",
  eventTypeIds: [],
  eventDate: dayjs(),
  description: "",
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

export default function EventFormDialog({
  open,
  onClose,
  event,
  eventTypes = [],
  members = [],
  onSaveSuccess,
}) {
  const isEdit = Boolean(event?.eventId);
  const [form, setForm] = useState(initialForm);
  const [otherEventAmounts, setOtherEventAmounts] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowMultipleEvents, setAllowMultipleEvents] = useState(getAllowMultipleEventsSetting);

  const [budgetItemsList, setBudgetItemsList] = useState([]);
  const [officeBirthdays, setOfficeBirthdays] = useState(0);
  const [wfhBirthdays, setWfhBirthdays] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [officeMembers, setOfficeMembers] = useState(0);
  const [wfhMembers, setWfhMembers] = useState(0);
  const [exempt, setExempt] = useState(getDefaultBirthdayExempt);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  const toast = useAppToast();

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

  const activeMembers = useMemo(
    () => (members || []).filter(isMemberActive),
    [members]
  );

  // Selected event types list
  const selectedTypes = useMemo(() => {
    if (allowMultipleEvents && form.eventTypeIds && form.eventTypeIds.length > 0) {
      return (eventTypes || []).filter((t) => form.eventTypeIds.includes(t.eventTypeId));
    }
    const single = (eventTypes || []).find((t) => t.eventTypeId === form.eventTypeId);
    return single ? [single] : [];
  }, [allowMultipleEvents, form.eventTypeIds, form.eventTypeId, eventTypes]);

  const isBirthday = useMemo(
    () => selectedTypes.some((t) => t.eventTypeName?.toLowerCase().includes("birthday")),
    [selectedTypes]
  );

  const nonBirthdaySelectedTypes = useMemo(
    () => selectedTypes.filter((t) => !t.eventTypeName?.toLowerCase().includes("birthday")),
    [selectedTypes]
  );

  const handleOtherEventAmountChange = (typeId, value) => {
    const cleanVal = String(value).replace(/[^0-9]/g, "");
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

  // Selected participants for non-birthday events
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

  // Handler to deselect/remove a member from non-birthday event
  const handleRemoveParticipant = (memberId) => {
    if (isBirthday) return;
    if (selectedParticipantIds.length <= 1) {
      toast.warning("At least 1 participating member is required.");
      return;
    }
    setSelectedParticipantIds((prev) => prev.filter((id) => id !== memberId));
  };

  const handleSelectAllParticipants = () => {
    setSelectedParticipantIds(activeMembers.map((m) => m.memberId));
  };

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

  // Comma-separated birthday dates of all celebrants
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

  // Compute budget calculation items dynamically
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
          calcText =
            office > 0
              ? `${office} Office Celebrants × ₹${rate.toLocaleString("en-IN")}`
              : "No Office Celebrants";
          calcFormula =
            office > 0
              ? `Office Celebrants × ₹${rate.toLocaleString("en-IN")}`
              : "Office Celebrants × ₹0";
          amount = office * rate;
          formulaPart = `Cake (${office} Office Celebrants × ₹${rate.toLocaleString(
            "en-IN"
          )})`;
        } else if (name.includes("snack") || name.includes("puff") || name.includes("roll")) {
          const isOfficeOnly = (item.applicableFor || "").toLowerCase().includes("office");
          if (isOfficeOnly) {
            calcText =
              office > 0
                ? `${office} Office Celebrants × ₹${rate.toLocaleString(
                  "en-IN"
                )} × ${puffsFactor}`
                : "No Office Celebrants";
            calcFormula =
              office > 0
                ? `Office Celebrants × ₹${rate.toLocaleString(
                  "en-IN"
                )}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""}`
                : "Office Celebrants × ₹0";
            amount = office * rate * puffsFactor;
          } else {
            calcText =
              office > 0
                ? `${total} Active Members × ₹${rate.toLocaleString(
                  "en-IN"
                )} × ${puffsFactor}`
                : "No Office Celebrants";
            calcFormula =
              office > 0
                ? `Active Members × ₹${rate.toLocaleString(
                  "en-IN"
                )}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""}`
                : "Active Members × ₹0";
            amount = total * rate * puffsFactor;
          }
          formulaPart = `${item.expenseItem} (${total} Active Members × ₹${rate.toLocaleString(
            "en-IN"
          )}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""})`;
        } else if (name.includes("gift")) {
          calcText = `${bdays} Total Celebrants (Office + WFH) × ₹${rate.toLocaleString(
            "en-IN"
          )}`;
          calcFormula = `Total Celebrants × ₹${rate.toLocaleString("en-IN")}`;
          amount = bdays * rate;
          formulaPart = `Gift (${bdays} Celebrants × ₹${rate.toLocaleString("en-IN")})`;
        } else {
          if (office > 0) {
            calcText = `${total} Active Members × ₹${rate.toLocaleString(
              "en-IN"
            )}${puffsFactor > 1 ? ` × ${puffsFactor}` : ""
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

    // 2. Non-Birthday Event items
    nonBirthdaySelectedTypes.forEach((type) => {
      const typeName = type.eventTypeName || "Event";
      const rawVal = otherEventAmounts[type.eventTypeId] !== undefined
        ? otherEventAmounts[type.eventTypeId]
        : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
      const totalAmount = Number(String(rawVal).replace(/[^0-9]/g, "")) || 0;
      const splitPerPerson = total > 0 && totalAmount > 0 ? Math.ceil(totalAmount / total) : 0;

      const calcText = totalAmount > 0
        ? `₹${totalAmount.toLocaleString("en-IN")} Total ÷ ${total} Members = ₹${splitPerPerson.toLocaleString("en-IN")}/person`
        : "Enter Total Event Budget";

      const calcFormula = totalAmount > 0
        ? `Active Members × ₹${splitPerPerson.toLocaleString("en-IN")}`
        : "₹0";

      const formulaPart = totalAmount > 0
        ? `${typeName} (₹${totalAmount.toLocaleString("en-IN")} ÷ ${total} Members = ₹${splitPerPerson.toLocaleString("en-IN")}/person)`
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
  const birthdaySharePerPerson = birthdayEligibleCount > 0 ? Math.ceil(bdayBudget / birthdayEligibleCount) : 0;
  const otherEventsSharePerPerson = total > 0 ? Math.ceil(otherEventsBudget / total) : 0;

  const plannedBudget = computedBudgetItems.reduce((acc, curr) => acc + curr.amount, 0);

  const contributionPerMember = useMemo(() => {
    if (isBirthday && exempt && celebrantCount > 0) {
      return birthdaySharePerPerson + otherEventsSharePerPerson;
    }
    return total > 0 ? Math.ceil((plannedBudget / total) / RULES.rounding) * RULES.rounding : 0;
  }, [isBirthday, exempt, celebrantCount, birthdaySharePerPerson, otherEventsSharePerPerson, plannedBudget, total]);

  const expectedCollection = useMemo(() => {
    if (isBirthday && exempt && celebrantCount > 0) {
      return (birthdayEligibleCount * birthdaySharePerPerson) + (total * otherEventsSharePerPerson);
    }
    return contributionPerMember * (isBirthday ? eligible : total);
  }, [isBirthday, exempt, celebrantCount, birthdayEligibleCount, birthdaySharePerPerson, total, otherEventsSharePerPerson, contributionPerMember, eligible]);

  // Dialog open & initialization
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function initDialogData() {
      setLoading(true);
      try {
        const [budgetData, settingsData] = await Promise.all([
          getBudgetCalculationsAsync().catch(() => []),
          getSystemSettingsAsync().catch(() => null),
        ]);

        if (!isMounted) return;

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

        const offTotal = activeMembers.filter(
          (m) => (m.workType || m.memberType || "Office").toLowerCase() === "office"
        ).length;
        const wfhTotal = activeMembers.filter(
          (m) => (m.workType || m.memberType || "Office").toLowerCase() === "wfh"
        ).length;

        setOfficeMembers(offTotal);
        setWfhMembers(wfhTotal);
        setTotalMembers(activeMembers.length);

        const allActiveIds = activeMembers.map((m) => m.memberId);

        if (event && event.eventId) {
          // Editing an existing event
          const detailedEvent = await getEventByIdAsync(event.eventId);
          if (!isMounted) return;

          const pIds =
            detailedEvent.participantIds ||
            (detailedEvent.participants ? detailedEvent.participants.map((p) => p.memberId) : allActiveIds);

          const currentEventDate = detailedEvent.eventDate ? dayjs(detailedEvent.eventDate) : dayjs();
          const targetMonth = currentEventDate.month();
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
          setTotalMembers(activeMembers.length);
          setExempt(true);
          setSelectedParticipantIds(pIds.length > 0 ? pIds : allActiveIds);

          const eventTypeIdsList =
            detailedEvent.eventTypeIds && detailedEvent.eventTypeIds.length > 0
              ? detailedEvent.eventTypeIds
              : detailedEvent.eventTypeId
                ? [detailedEvent.eventTypeId]
                : [];

          let initialBaseAmount = "";
          if (detailedEvent.baseAmount) {
            initialBaseAmount = String(detailedEvent.baseAmount);
          }

          setForm({
            eventId: detailedEvent.eventId || event.eventId,
            eventName: detailedEvent.eventName || "",
            eventTypeId: detailedEvent.eventTypeId || "",
            eventTypeIds: eventTypeIdsList,
            eventDate: currentEventDate,
            description: detailedEvent.description || "",
            baseAmount: initialBaseAmount,
            participantIds: pIds,
          });
        } else {
          // Adding a new event
          const defaultDate = dayjs();
          const targetMonth = defaultDate.month();
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
          setTotalMembers(activeMembers.length);
          setExempt(getDefaultBirthdayExempt());
          setSelectedParticipantIds(allActiveIds);

          setForm({
            eventId: "",
            eventName: "",
            eventTypeId: "",
            eventTypeIds: [],
            eventDate: defaultDate,
            description: "",
            baseAmount: "",
            participantIds: allActiveIds,
          });
        }
      } catch {
        toast.error("Failed to initialize event configuration");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initDialogData();
    return () => {
      isMounted = false;
    };
  }, [open, event, activeMembers]);

  // Handle date change
  const handleDateChange = (newDate) => {
    if (!newDate) return;
    const oldMonth = dayjs(form.eventDate).month();
    const newMonth = dayjs(newDate).month();

    let newEventName = form.eventName;
    if (
      !form.eventId &&
      (form.eventName.includes("Birthday Celebration") || !form.eventName.trim())
    ) {
      newEventName = `${dayjs(newDate).format("MMMM")} Birthday Celebration`;
    }

    setForm((current) => ({
      ...current,
      eventDate: newDate,
      eventName: newEventName,
    }));

    if (oldMonth !== newMonth) {
      const celebrantsInMonth = activeMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === newMonth
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
  };

  // Toggle multiple events setting
  const handleToggleAllowMultipleEvents = async (newValue) => {
    setAllowMultipleEvents(newValue);
    try {
      localStorage.setItem(
        "cm_system_settings",
        JSON.stringify({
          ...JSON.parse(localStorage.getItem("cm_system_settings") || "{}"),
          allowedMultipleEvent: newValue,
          allowMultipleEvents: newValue,
        })
      );
      await updateSystemSettings({
        allowedMultipleEvent: newValue,
        allowMultipleEvents: newValue,
      });
    } catch {
      // Ignored
    }

    if (newValue) {
      if (form.eventTypeId && (!form.eventTypeIds || form.eventTypeIds.length === 0)) {
        setForm((prev) => ({
          ...prev,
          eventTypeIds: [form.eventTypeId],
        }));
      }
    } else {
      const singleId =
        form.eventTypeIds && form.eventTypeIds.length > 0
          ? form.eventTypeIds[0]
          : form.eventTypeId;
      handleTypeChange(singleId || "");
    }
  };

  // Handle single event type switch
  const handleTypeChange = (newTypeId) => {
    const newType = (eventTypes || []).find((t) => t.eventTypeId === newTypeId);
    const newTypeName = newType?.eventTypeName || "";
    const isNewBday = newTypeName.toLowerCase().includes("birthday");

    let updatedName = form.eventName;
    if (!isEdit) {
      const monthStr = dayjs(form.eventDate).format("MMMM");
      if (newTypeId) {
        updatedName = isNewBday
          ? `${monthStr} Birthday Celebration`
          : `${monthStr} ${newTypeName} Celebration`;
      } else {
        updatedName = "";
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
    const selectedTypesList = (eventTypes || []).filter((t) => newTypeIds.includes(t.eventTypeId));
    const hasBday = selectedTypesList.some((t) =>
      t.eventTypeName?.toLowerCase().includes("birthday")
    );

    let updatedName = form.eventName;
    if (!isEdit) {
      const monthStr = dayjs(form.eventDate).format("MMMM");
      if (selectedTypesList.length === 0) {
        updatedName = "";
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
      eventTypeIds: newTypeIds,
      eventTypeId: newTypeIds[0] || "",
      eventName: updatedName,
      participantIds: allActiveIds,
    }));
    if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
  };

  // Submit Handler
  const handleSubmit = async () => {
    const filed = "This field is required";
    const schema = {
      eventName: { required: true, min: 3, max: 100, label: filed },
      eventDate: { required: true, label: filed },
    };

    if (allowMultipleEvents) {
      schema.eventTypeIds = {
        required: true,
        label: filed,
        customValidate: (val) => {
          if (!val || val.length === 0) return filed;
          return "";
        },
      };
    } else {
      schema.eventTypeId = { required: true, label: filed };
    }

    if (nonBirthdaySelectedTypes.length > 0) {
      nonBirthdaySelectedTypes.forEach((type) => {
        const val = otherEventAmounts[type.eventTypeId] !== undefined
          ? otherEventAmounts[type.eventTypeId]
          : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : "");
        const num = Number(String(val).replace(/[^0-9]/g, ""));
        if (!val || num <= 0) {
          schema[`baseAmount_${type.eventTypeId}`] = {
            required: true,
            label: `${type.eventTypeName} amount is required`,
            customValidate: () => `${type.eventTypeName} budget amount is required`,
          };
        }
      });
    }

    const validationPayload = {
      ...form,
      ...Object.fromEntries(
        nonBirthdaySelectedTypes.map((t) => [
          `baseAmount_${t.eventTypeId}`,
          otherEventAmounts[t.eventTypeId] !== undefined
            ? otherEventAmounts[t.eventTypeId]
            : (nonBirthdaySelectedTypes.length === 1 ? form.baseAmount : ""),
        ])
      ),
    };

    const newErrors = validateForm(validationPayload, schema);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill required field");
      return;
    }

    setSaving(true);
    try {
      let payload;
      const allActiveParticipantIds = activeMembers.map((m) => m.memberId);
      const chosenParticipantIds = isBirthday
        ? allActiveParticipantIds
        : (selectedParticipantIds.length > 0 ? selectedParticipantIds : allActiveParticipantIds);

      const resolvedEventTypeIds = allowMultipleEvents
        ? form.eventTypeIds
        : form.eventTypeId ? [form.eventTypeId] : [];

      const primaryTypeId = resolvedEventTypeIds[0] || form.eventTypeId || "";

      if (isBirthday) {
        const celebrantIds = monthCelebrants.map((m) => m.memberId);
        const contributionOverrides = [];

        chosenParticipantIds.forEach((id) => {
          const isCelebrant = celebrantIds.includes(id);
          if (isCelebrant && exempt) {
            contributionOverrides.push({
              memberId: id,
              amount: otherEventsSharePerPerson,
            });
          } else {
            contributionOverrides.push({
              memberId: id,
              amount: contributionPerMember,
            });
          }
        });

        const celebrantsSummary = monthCelebrants
          .map((c) => `${c.name} (${dayjs(c.dateOfBirth).format("D MMM")})`)
          .join(", ");

        payload = {
          eventName: form.eventName.trim(),
          eventTypeId: primaryTypeId,
          eventTypeIds: resolvedEventTypeIds,
          eventDate: dayjs(form.eventDate).hour(12).toISOString(),
          eventDates: celebrantDatesCsv || null,
          description:
            form.description?.trim() ||
            `Birthday celebration (${office} Office, ${wfh} WFH)${celebrantsSummary ? ` for ${celebrantsSummary}` : ""
            }. Planned Budget: ₹${plannedBudget.toLocaleString(
              "en-IN"
            )}, Contribution/member: ₹${contributionPerMember}`,
          baseAmount: plannedBudget > 0 ? plannedBudget : 0,
          participantIds: chosenParticipantIds,
          contributionOverrides: contributionOverrides,
        };
      } else {
        const overrides = chosenParticipantIds.map((mId) => ({
          memberId: mId,
          amount: contributionPerMember,
        }));

        payload = {
          ...form,
          eventName: form.eventName.trim(),
          eventTypeId: primaryTypeId,
          eventTypeIds: resolvedEventTypeIds,
          baseAmount: plannedBudget > 0 ? plannedBudget : Number(String(form.baseAmount).replace(/[^0-9]/g, "") || 0),
          participantIds: chosenParticipantIds,
          contributionOverrides: overrides,
          eventDate: dayjs(form.eventDate).hour(12).toISOString(),
          eventDates: null,
          description: form.description?.trim() || "",
        };
      }

      if (form.eventId) {
        await updateEventAsync(form.eventId, payload);
        toast.success("Saved successfully");
      } else {
        // Sync dynamic QR code with per-member contribution amount
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
          // QR sync warning ignored
        }

        await createEventAsync(payload);
        toast.success("Event created successfully! Notification emails dispatched to contributors.");
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }
      onClose();
    } catch (error) {
      let errMsg = error.response?.data?.message;
      if (!errMsg && error.response?.data?.errors) {
        const errValues = Object.values(error.response.data.errors);
        errMsg = Array.isArray(errValues) ? errValues.flat().join(", ") : String(error.response.data.errors);
      }
      if (!errMsg) {
        errMsg = error.response?.data?.title || error.message || "Failed to save event";
      }
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = (eventTypes || []).map((t) => ({
    label: t.eventTypeName,
    value: t.eventTypeId,
  }));

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={form.eventId ? "Edit Event" : "Add Event"}
      maxWidth="lg"
      fullWidth
      actions={
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            width: "100%",
            py: 0.5,
          }}
        >
          <AppButton
            variant="outlined"
            onClick={onClose}
            disabled={saving || loading}
            sx={{
              minWidth: 120,
              borderRadius: "8px",
              px: 3.5,
              py: 0.85,
              minHeight: 40,
              fontWeight: 600,
              fontSize: "0.88rem",
            }}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            startIcon={<SaveIcon sx={{ fontSize: "1.1rem" }} />}
            onClick={handleSubmit}
            disabled={saving || loading}
            sx={{
              bgcolor: "#342b54 !important",
              color: "#ffffff !important",
              "&:hover": { bgcolor: "#241d3b !important" },
              minWidth: 130,
              borderRadius: "8px",
              px: 3.8,
              py: 0.85,
              minHeight: 40,
              fontWeight: 600,
              fontSize: "0.88rem",
            }}
          >
            {saving ? "Saving..." : loading ? "Loading..." : form.eventId ? "Update" : "Save"}
          </AppButton>
        </Box>
      }
    >
      <Box sx={{ p: { xs: 1, sm: 1.5 } }}>
        <Grid container spacing={2} alignItems="stretch">
          {/* Left Panel: Event Configuration (~65% width) */}
          <Grid size={{ xs: 12, lg: 7.8 }}>
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
                      const numVal = Number(String(rawVal).replace(/[^0-9]/g, "")) || 0;
                      const splitPerPerson = total > 0 && numVal > 0 ? Math.ceil(numVal / total) : 0;
                      const fieldError =
                        errors[`baseAmount_${type.eventTypeId}`] ||
                        (nonBirthdaySelectedTypes.length === 1 ? errors.baseAmount : "");

                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={type.eventTypeId}>
                          <AppInput
                            label={`${type.eventTypeName} Total Budget (₹)`}
                            placeholder="Enter total amount"
                            required
                            fullWidth
                            value={formatBaseAmount(rawVal)}
                            onChange={(e) => handleOtherEventAmountChange(type.eventTypeId, e.target.value)}
                            startAdornment={
                              <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>
                                ₹
                              </Typography>
                            }
                            endAdornment={
                              numVal > 0 && total > 0 ? (
                                <Chip
                                  label={`₹${splitPerPerson.toLocaleString("en-IN")}/person`}
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
                            helperText={
                              fieldError ||
                              (numVal > 0 && total > 0
                                ? `Total ₹${numVal.toLocaleString("en-IN")} split equally across ${total} members (₹${splitPerPerson.toLocaleString("en-IN")} each)`
                                : `Total ${type.eventTypeName} budget to be divided among eligible members.`)
                            }
                          />
                        </Grid>
                      );
                    })}
                  </>
                )}
              </Grid>

              {/* Identified Celebrants (for Birthday) or Active Participants (for other Events) */}
              {isBirthday ? (
                monthCelebrants.length > 0 && (
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
                )
              ) : (
                activeMembers.length > 0 && (
                  <Box
                    sx={{
                      mt: 1.8,
                      p: 1.4,
                      borderRadius: "8px",
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
                        mb: 0.8,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <PeopleIcon sx={{ color: "#7c3aed", fontSize: "1.1rem" }} />
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            fontSize: "0.8rem",
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
                          startIcon={<ResetIcon sx={{ fontSize: "0.9rem !important" }} />}
                          onClick={handleSelectAllParticipants}
                          sx={{
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            textTransform: "none",
                            py: 0.2,
                            px: 0.8,
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

                    {/* Participating Member Chips */}
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px 8px",
                        maxHeight: 90,
                        overflowY: "auto",
                        p: 0.4,
                      }}
                    >
                      {participatingMembers.map((m) => {
                        const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
                        return (
                          <Chip
                            key={m.memberId}
                            label={`${m.name} (${isWfh ? "WFH" : "Office"})`}
                            size="small"
                            onDelete={() => handleRemoveParticipant(m.memberId)}
                            deleteIcon={
                              <Tooltip title="Remove member from this event">
                                <CloseIcon sx={{ fontSize: "0.85rem !important" }} />
                              </Tooltip>
                            }
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 24,
                              borderRadius: "6px",
                              bgcolor: isWfh ? "#f5f3ff" : "#f0f9ff",
                              color: isWfh ? "#6d28d9" : "#0369a1",
                              border: "1px solid",
                              borderColor: isWfh ? "#ddd6fe" : "#bae6fd",
                              "& .MuiChip-deleteIcon": {
                                color: isWfh ? "#8b5cf6" : "#0284c7",
                                "&:hover": {
                                  color: "#ef4444",
                                },
                              },
                            }}
                          />
                        );
                      })}
                    </Box>

                    {/* Excluded Members list */}
                    {excludedMembers.length > 0 && (
                      <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed rgba(0,0,0,0.08)" }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.72rem",
                            color: "text.secondary",
                            fontWeight: 600,
                            display: "block",
                            mb: 0.4,
                          }}
                        >
                          Not Participating ({excludedMembers.length}):
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                          {excludedMembers.map((m) => {
                            const isWfh = (m.workType || m.memberType || "Office").toLowerCase() === "wfh";
                            return (
                              <Chip
                                key={m.memberId}
                                label={`+ ${m.name} (${isWfh ? "WFH" : "Office"})`}
                                size="small"
                                onClick={() => {
                                  setSelectedParticipantIds((prev) => [...prev, m.memberId]);
                                }}
                                sx={{
                                  fontWeight: 500,
                                  fontSize: "0.7rem",
                                  height: 20,
                                  cursor: "pointer",
                                  bgcolor: "rgba(0,0,0,0.04)",
                                  color: "text.secondary",
                                  border: "1px dashed #cbd5e1",
                                  "&:hover": {
                                    bgcolor: "#f1f5f9",
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

          {/* Right Panel: Calculated Event Summary (~35% width) */}
          <Grid size={{ xs: 12, lg: 4.2 }}>
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
                      ₹{plannedBudget.toLocaleString("en-IN")}
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
                          Celebrants: ₹{otherEventsSharePerPerson.toLocaleString("en-IN")}
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: "0.98rem", fontWeight: 800, color: "#0284c7" }}>
                      ₹{contributionPerMember.toLocaleString("en-IN")}
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
                      ₹{expectedCollection.toLocaleString("en-IN")}
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
                      fontSize: "0.8rem",
                      mb: 1.2,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    CALCULATION SUMMARY
                  </Typography>

                  {/* 3-Column Table */}
                  <Box sx={{ width: "100%", mb: 1.2 }}>
                    {/* Header Row */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "35% 45% 20%",
                        gap: 1.2,
                        pb: 0.8,
                        borderBottom: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? "divider" : "#e2e8f0",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "#64748b",
                        alignItems: "center",
                      }}
                    >
                      <Box>Expense</Box>
                      <Box>Calculation</Box>
                      <Box sx={{ textAlign: "right" }}>Total</Box>
                    </Box>

                    {/* Table Rows */}
                    {computedBudgetItems.length === 0 ? (
                      <Box sx={{ py: 2.5, textAlign: "center" }}>
                        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                          Select an event type to view calculation details
                        </Typography>
                      </Box>
                    ) : (
                      computedBudgetItems.map((item, idx) => (
                        <Box
                          key={item.budgetCalculationId || item.expenseItem || idx}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "35% 45% 20%",
                            gap: 1.2,
                            py: 0.8,
                            minHeight: 34,
                            borderBottom: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "#f1f5f9",
                            fontSize: "0.82rem",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              color: (theme) => (theme.palette.mode === "dark" ? "#e2e8f0" : "#1e293b"),
                              fontSize: "0.82rem",
                              lineHeight: 1.3,
                            }}
                          >
                            {item.expenseItem}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#475569"),
                              fontSize: "0.8rem",
                              lineHeight: 1.3,
                            }}
                          >
                            {item.calcFormula || item.calcText || `₹${item.amount}`}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                              fontSize: "0.84rem",
                              textAlign: "right",
                            }}
                          >
                            ₹{(item.amount || 0).toLocaleString("en-IN")}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
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
                    ₹{plannedBudget.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </AppDialog>
  );
}
