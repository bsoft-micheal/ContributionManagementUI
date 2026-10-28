import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Paper,
  Tooltip,
  IconButton,
  InputAdornment,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddIcon from "@mui/icons-material/Add";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { formatViewDate } from "../../utils/dateHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton, { AppClearFilterButton } from "../../components/common/AppButton";
import apiClient from "../../services/apiClient";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getEventByIdAsync, getEventsAsync } from "../../services/eventService";
import {
  getContributionsAsync,
  getContributionsByEventAsync,
} from "../../services/contributionService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage, getRightsForFeatureId } from "../../utils/rightsHelper";
import { MENU_FEATURE_IDS } from "../../constants";
import FilterListIcon from "@mui/icons-material/FilterList";
import EventFormDialog from "../../components/events/EventFormDialog";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";
import { useAppToast } from "../../components/common/AppToast";
import { launchPaperBlast, launchCelebrationBlast } from "../../components/common/PaperBlast";
import BirthdayCelebrationModal from "../../components/common/BirthdayCelebrationModal";

/**
 * Safely parse date of birth (supports DD/MM/YYYY and standard ISO)
 */
function parseMemberDob(val) {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split("/").map(Number);
      const parsed = dayjs(new Date(y, m - 1, d));
      if (parsed.isValid()) return parsed;
    }
    const parsed = dayjs(trimmed);
    if (parsed.isValid()) return parsed;
  }
  return null;
}

/**
 * Returns icon, display label, and color palette tailored for event categories
 */
const getEventTypeInfo = (typeName = "") => {
  const lower = (typeName || "").toLowerCase();
  if (lower.includes("birthday")) {
    return {
      emoji: "🎂",
      label: "Birthday",
      color: "#ec4899",
      bg: "rgba(236, 72, 153, 0.08)",
      border: "rgba(236, 72, 153, 0.25)",
      text: "#be185d",
      darkBg: "rgba(236, 72, 153, 0.18)",
      darkText: "#fbcfe8",
    };
  }
  if (lower.includes("farewell")) {
    return {
      emoji: "👏",
      label: "Farewell",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.25)",
      text: "#b45309",
      darkBg: "rgba(245, 158, 11, 0.18)",
      darkText: "#fde68a",
    };
  }
  if (lower.includes("dinner") || lower.includes("lunch")) {
    return {
      emoji: "🍽️",
      label: typeName || "Team Dinner",
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.08)",
      border: "rgba(59, 130, 246, 0.25)",
      text: "#1d4ed8",
      darkBg: "rgba(59, 130, 246, 0.18)",
      darkText: "#bfdbfe",
    };
  }
  if (lower.includes("meet") || lower.includes("gathering")) {
    return {
      emoji: "👥",
      label: typeName || "Meeting",
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.08)",
      border: "rgba(139, 92, 246, 0.25)",
      text: "#6d28d9",
      darkBg: "rgba(139, 92, 246, 0.18)",
      darkText: "#ddd6fe",
    };
  }
  return {
    emoji: "🎉",
    label: typeName || "Event",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.25)",
    text: "#047857",
    darkBg: "rgba(16, 185, 129, 0.18)",
    darkText: "#a7f3d0",
  };
};

export default function CalendarPage({ isEmbedded = false }) {
  const theme = useTheme();
  const toast = useAppToast();
  const { authState } = useAuth();
  const currentMonth = dayjs().month() + 1;
  const currentYear = dayjs().year();

  // Rights & Permissions (Feature ID 5 - Calendar)
  const activeRole = authState?.role;
  const calendarRights = useMemo(() => {
    return getRightsForFeatureId(MENU_FEATURE_IDS.CALENDAR, activeRole);
  }, [activeRole]);

  const canView = !calendarRights.deny && (calendarRights.read || calendarRights.write);
  const hasWriteAccess = !calendarRights.deny && calendarRights.write;

  // Draft filter states (bound to input fields)
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSearch, setFilterSearch] = useState("");
  const [hasAppliedFilter, setHasAppliedFilter] = useState(true);
  const [filterLookupEvents, setFilterLookupEvents] = useState([]);

  // Applied filter state (drives data fetching, calendar grid & sidebar)
  const [appliedFilters, setAppliedFilters] = useState({
    month: currentMonth,
    year: currentYear,
    category: "ALL",
    search: "",
  });

  const categoryFilter = appliedFilters.category;
  const searchQuery = appliedFilters.search;

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);

  // Automatically fetch events available in selected month and year for cascading dropdowns
  useEffect(() => {
    let cancelled = false;
    async function fetchLookupEvents() {
      try {
        const m = Number(filterMonth);
        const y = Number(filterYear);
        const data = await getEventsAsync({
          month: m > 0 ? m : undefined,
          year: y > 0 ? y : undefined,
        });
        if (!cancelled && Array.isArray(data)) {
          setFilterLookupEvents(data.filter((e) => !e.isDeleted));
        }
      } catch {
        if (!cancelled) setFilterLookupEvents([]);
      }
    }
    fetchLookupEvents();
    return () => {
      cancelled = true;
    };
  }, [filterMonth, filterYear]);

  // Strictly filter to active, non-exited, non-deleted member accounts
  const activeMembers = useMemo(() => {
    return (members || []).filter(
      (m) => m.isActive !== false && !m.isDeleted
    );
  }, [members]);

  // Modals for Create and View
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bdayCelebrationOpen, setBdayCelebrationOpen] = useState(false);
  const [celebrantsForCelebration, setCelebrantsForCelebration] = useState([]);

  const loadCalendarData = async (activeFilters = appliedFilters) => {
    try {
      const apiParams = {
        month: activeFilters.month === 0 ? null : activeFilters.month,
        year: activeFilters.year === 0 ? null : activeFilters.year,
      };
      const [{ data: resData }, contribsData] = await Promise.all([
        apiClient.get("/events/getAllEventAsync", {
          params: apiParams,
        }),
        getContributionsAsync().catch(() => []),
      ]);
      const data = resData && resData.data !== undefined ? resData.data : resData;
      setEvents(Array.isArray(data) ? data.filter((e) => !e.isDeleted) : []);
      setContributions(Array.isArray(contribsData) ? contribsData : []);
    } catch {
      toast.error("Failed to load calendar events.");
    }
  };

  const handleApplyFilter = () => {
    const next = {
      month: filterMonth,
      year: filterYear,
      category: filterCategory,
      search: filterSearch.trim(),
    };
    setAppliedFilters(next);
    setHasAppliedFilter(true);
    loadCalendarData(next);
  };

  const handleClearFilter = () => {
    setFilterYear(0);
    setFilterMonth(0);
    setFilterCategory("ALL");
    setFilterSearch("");
    const reset = {
      month: 0,
      year: 0,
      category: "ALL",
      search: "",
    };
    setAppliedFilters(reset);
    setEvents([]);
    setHasAppliedFilter(false);
  };

  const handleEventDeleted = (deletedEventId) => {
    setEvents((prev) => prev.filter((e) => e.eventId !== deletedEventId));
    setDetailedEventsMap((prev) => {
      const copy = { ...prev };
      delete copy[deletedEventId];
      return copy;
    });
    setViewDialogOpen(false);
    setSelectedEvent(null);
    loadCalendarData(appliedFilters);
  };

  // Initial load: Load calendar data automatically on mount with default month and year
  useEffect(() => {
    loadCalendarData(appliedFilters);
  }, []);

  useEffect(() => {
    async function loadEventTypesAndMembers() {
      try {
        const [types, rawMems] = await Promise.all([
          getEventTypesAsync(),
          getUsersAsync().catch(() => getMembersAsync()),
        ]);
        const normalized = (rawMems || []).map((u) => ({
          ...u,
          memberId: u.memberId || u.userId || u.id,
          name: u.name || u.fullName || u.username,
          workType: u.workType || u.memberType || "Office",
          isActive: u.isActive !== false && !u.isDeleted,
          isExited: Boolean(u.isExited),
        }));
        setEventTypes(types || []);
        setMembers(normalized);
      } catch {
        toast.error("Failed to load event types and members.");
      }
    }
    loadEventTypesAndMembers();
  }, []);

  // Filter events by Category and Search Text
  const filteredEvents = useMemo(() => {
    let list = (events || []).filter((e) => !e.isDeleted);

    if (appliedFilters.category !== "ALL") {
      const filterLower = appliedFilters.category.toLowerCase();
      list = list.filter((e) => {
        const typeName = (e.eventTypeName || "").toLowerCase();
        return (
          typeName === filterLower ||
          typeName.includes(filterLower) ||
          filterLower.includes(typeName)
        );
      });
    }

    if (appliedFilters.search.trim()) {
      const q = appliedFilters.search.toLowerCase().trim();
      list = list.filter((e) => {
        const nameMatch = (e.eventName || "").toLowerCase().includes(q);
        const typeMatch = (e.eventTypeName || "").toLowerCase().includes(q);
        const descMatch = (e.description || "").toLowerCase().includes(q);
        return nameMatch || typeMatch || descMatch;
      });
    }

    return list;
  }, [events, appliedFilters.category, appliedFilters.search]);

  // Extract celebrants for birthday events
  const getCelebrantsForEvent = (eventItem) => {
    const isBirthday =
      eventItem.eventTypeName?.toLowerCase().includes("birthday") ||
      eventItem.eventName?.toLowerCase().includes("birthday");

    if (!isBirthday) return [];

    const eventMonth = dayjs(eventItem.eventDate).month();
    const activeMembersInMonth = activeMembers.filter((m) => {
      const dob = parseMemberDob(m.dateOfBirth);
      return dob && dob.month() === eventMonth;
    });

    const participantIds = (eventItem.participants || []).map(
      (p) => p.memberId || p.id
    );
    let matchedCelebrants = [];

    if (participantIds.length > 0) {
      const pMembers = activeMembers.filter(
        (m) => participantIds.includes(m.memberId) && parseMemberDob(m.dateOfBirth)
      );
      const monthMatches = pMembers.filter(
        (m) => parseMemberDob(m.dateOfBirth).month() === eventMonth
      );
      matchedCelebrants = monthMatches.length > 0 ? monthMatches : pMembers;
    }

    const textToSearch = `${eventItem.eventName || ""} ${eventItem.description || ""
      }`.toLowerCase();
    const nameMatches = activeMembers.filter((m) => {
      if (!m.name || !m.dateOfBirth) return false;
      const lowerName = m.name.toLowerCase().trim();
      if (textToSearch.includes(lowerName)) return true;
      const parts = lowerName.split(/\s+/).filter((p) => p.length >= 3);
      return parts.length > 0 && parts.some((p) => textToSearch.includes(p));
    });

    const map = new Map();
    const addCelebrant = (c) => {
      const normName = (c.name || "").toLowerCase().trim();
      const dob = parseMemberDob(c.dateOfBirth);
      const dobKey = dob ? dob.format("YYYY-MM-DD") : "";
      const dedupeKey = normName && dobKey ? `${normName}|${dobKey}` : `id:${c.memberId}`;
      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, c);
      }
    };

    matchedCelebrants.forEach(addCelebrant);
    nameMatches.forEach(addCelebrant);

    if (map.size === 0 && activeMembersInMonth.length > 0) {
      activeMembersInMonth.forEach(addCelebrant);
    }

    return Array.from(map.values());
  };

  // Calendar 7x5 days grid
  const calendarDays = useMemo(() => {
    const targetMonth =
      appliedFilters.month === 0 ? dayjs().month() + 1 : appliedFilters.month;
    const targetYear =
      appliedFilters.year === 0 ? dayjs().year() : appliedFilters.year;
    const startOfMonth = dayjs(
      `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`
    );
    const startDay = startOfMonth.startOf("week");
    return Array.from({ length: 35 }, (_, index) => startDay.add(index, "day"));
  }, [appliedFilters.month, appliedFilters.year]);

  const monthOptions = [
    { label: "All Months", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    })),
  ];

  const yearOptions = [
    { label: "All Years", value: 0 },
    ...Array.from({ length: 11 }, (_, i) => {
      const y = currentYear - 5 + i;
      return { label: String(y), value: y };
    }),
  ];

  const categoryOptions = useMemo(() => {
    const set = new Set();
    const list = [{ label: "All Events", value: "ALL" }];

    (filterLookupEvents || []).forEach((e) => {
      const name = (e.eventTypeName || e.category || "").trim();
      if (name && !set.has(name.toLowerCase())) {
        set.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });

    return list;
  }, [filterLookupEvents]);

  // Keep filterCategory valid if options change
  useEffect(() => {
    if (categoryOptions.length > 0 && filterCategory !== "ALL") {
      const exists = categoryOptions.some(
        (opt) => opt.value.toLowerCase() === filterCategory.toLowerCase()
      );
      if (!exists) {
        setFilterCategory("ALL");
      }
    }
  }, [categoryOptions, filterCategory]);

  // Stepper handlers
  const handlePrevMonth = () => {
    const curM = appliedFilters.month === 0 ? dayjs().month() + 1 : appliedFilters.month;
    const curY = appliedFilters.year === 0 ? dayjs().year() : appliedFilters.year;
    const nextMonth = curM === 1 ? 12 : curM - 1;
    const nextYear = curM === 1 ? curY - 1 : curY;

    setFilterMonth(nextMonth);
    setFilterYear(nextYear);
    const next = {
      ...appliedFilters,
      month: nextMonth,
      year: nextYear,
    };
    setAppliedFilters(next);
    loadCalendarData(next);
  };

  const handleNextMonth = () => {
    const curM = appliedFilters.month === 0 ? dayjs().month() + 1 : appliedFilters.month;
    const curY = appliedFilters.year === 0 ? dayjs().year() : appliedFilters.year;
    const nextMonth = curM === 12 ? 1 : curM + 1;
    const nextYear = curM === 12 ? curY + 1 : curY;

    setFilterMonth(nextMonth);
    setFilterYear(nextYear);
    const next = {
      ...appliedFilters,
      month: nextMonth,
      year: nextYear,
    };
    setAppliedFilters(next);
    loadCalendarData(next);
  };

  const handleGoToToday = () => {
    const nextMonth = dayjs().month() + 1;
    const nextYear = dayjs().year();

    setFilterMonth(nextMonth);
    setFilterYear(nextYear);
    const next = {
      ...appliedFilters,
      month: nextMonth,
      year: nextYear,
    };
    setAppliedFilters(next);
    loadCalendarData(next);
  };

  const displayedMonthName =
    appliedFilters.month === 0
      ? "All Months"
      : dayjs().month(appliedFilters.month - 1).format("MMMM");

  // Helper to determine if an event or member has pending payment (strictly based on unpaid amount > 0)
  const isItemPaymentPending = (item) => {
    // 1. Identify the event associated with this item
    let targetEvent = item.eventItem;

    if (!targetEvent) {
      if (item.colorType?.toLowerCase().includes("birthday")) {
        const itemMonth = item.celebrant
          ? parseMemberDob(item.celebrant.dateOfBirth)?.month()
          : (appliedFilters.month === 0 ? dayjs().month() : appliedFilters.month - 1);

        targetEvent = events.find((e) => {
          const isBday =
            e.eventTypeName?.toLowerCase().includes("birthday") ||
            e.eventName?.toLowerCase().includes("birthday");
          if (!isBday) return false;
          return dayjs(e.eventDate).month() === itemMonth;
        });
      }
    }

    // 2. If no event exists yet, there is no unpaid balance
    if (!targetEvent) return false;

    // 3. Compute total expected, total paid, and unpaid amount for this event
    const totalExpected = Number(targetEvent.totalExpectedAmount) || 0;
    let totalPaid = Number(targetEvent.totalPaidAmount) || 0;

    // Check contributions matching this specific event
    const eventContribs = contributions.filter(
      (c) => String(c.eventId) === String(targetEvent.eventId)
    );

    if (eventContribs.length > 0) {
      const paidFromContribs = eventContribs
        .filter(
          (c) =>
            c.paymentStatus === "Paid" ||
            c.paymentStatus === "Verified" ||
            c.paymentStatus === "Completed"
        )
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      totalPaid = Math.max(totalPaid, paidFromContribs);
    }

    const unpaidAmount = Math.max(0, totalExpected - totalPaid);

    // If unpaid amount is 0, remove Payment Pending!
    if (unpaidAmount <= 0) {
      return false;
    }

    // Only if unpaid amount is strictly greater than 0, return true
    return unpaidAmount > 0;
  };

  // Get items for a particular day on the grid
  const getDayItems = (day) => {
    const dayStr = day.format("YYYY-MM-DD");
    const dayMonth = day.month();
    const dayDate = day.date();

    const items = [];
    const handledCelebrantIds = new Set();

    for (const eventItem of filteredEvents) {
      const isBirthday =
        eventItem.eventTypeName?.toLowerCase().includes("birthday") ||
        eventItem.eventName?.toLowerCase().includes("birthday");

      if (!isBirthday) {
        if (dayjs(eventItem.eventDate).format("YYYY-MM-DD") === dayStr) {
          items.push({
            key: `event-${eventItem.eventId}`,
            eventItem,
            displayName:
              eventItem.eventName || eventItem.eventTypeName || "Scheduled Event",
            categoryLabel: eventItem.eventTypeName || "Event",
            colorType: eventItem.eventTypeName,
          });
        }
        continue;
      }

      // Birthday event: map celebrants
      const celebrants = getCelebrantsForEvent(eventItem);
      if (celebrants.length > 0) {
        for (const celebrant of celebrants) {
          const dob = parseMemberDob(celebrant.dateOfBirth);
          if (!dob) continue;
          if (dob.month() === dayMonth && dob.date() === dayDate) {
            if (!handledCelebrantIds.has(celebrant.memberId)) {
              handledCelebrantIds.add(celebrant.memberId);
              items.push({
                key: `bday-${celebrant.memberId}-${eventItem.eventId}`,
                eventItem,
                celebrant,
                displayName: celebrant.name,
                categoryLabel: "Birthday",
                colorType: "Birthday",
              });
            }
          }
        }
      } else {
        if (dayjs(eventItem.eventDate).format("YYYY-MM-DD") === dayStr) {
          items.push({
            key: `event-${eventItem.eventId}`,
            eventItem,
            displayName: eventItem.eventName || "Birthday",
            categoryLabel: "Birthday",
            colorType: "Birthday",
          });
        }
      }
    }

    // Birthday member DOBs directly on calendar grid cells
    if (appliedFilters.category === "ALL" || appliedFilters.category.toLowerCase().includes("birthday")) {
      for (const member of activeMembers) {
        const dob = parseMemberDob(member.dateOfBirth);
        if (!dob) continue;
        if (dob.month() === dayMonth && dob.date() === dayDate) {
          if (!handledCelebrantIds.has(member.memberId)) {
            handledCelebrantIds.add(member.memberId);
            items.push({
              key: `member-bday-${member.memberId}-${dayStr}`,
              eventItem: null,
              celebrant: member,
              displayName: `${member.name}'s Birthday`,
              categoryLabel: "Birthday",
              colorType: "Birthday",
            });
          }
        }
      }
    }

    return items;
  };

  // Compile Birthday Members List for the 25% sidebar panel with status (Completed, Today, Upcoming)
  const birthdayMembers = useMemo(() => {
    const targetMonth =
      appliedFilters.month === 0 ? dayjs().month() + 1 : appliedFilters.month;
    const targetYear =
      appliedFilters.year === 0 ? dayjs().year() : appliedFilters.year;
    const today = dayjs().startOf("day");

    const seenKeys = new Set();
    const list = [];

    const getDedupeKey = (mem, dob) => {
      const normName = (mem.name || mem.memberName || "").toLowerCase().trim();
      const dobStr = dob ? dob.format("YYYY-MM-DD") : "";
      return normName && dobStr ? `${normName}|${dobStr}` : `id:${mem.memberId}`;
    };

    const calculateStatus = (dob) => {
      if (!dob) return "upcoming";
      const bdayMonth = appliedFilters.month === 0 ? dob.month() + 1 : targetMonth;
      const bdayDate = dayjs(
        `${targetYear}-${String(bdayMonth).padStart(2, "0")}-${String(dob.date()).padStart(2, "0")}`
      ).startOf("day");

      if (bdayDate.isBefore(today, "day")) return "completed";
      if (bdayDate.isSame(today, "day")) return "today";
      return "upcoming";
    };

    // 1. From activeMembers list based on DOB
    for (const mem of activeMembers) {
      const dob = parseMemberDob(mem.dateOfBirth);
      if (!dob) continue;

      if (appliedFilters.month === 0 || dob.month() + 1 === targetMonth) {
        const key = getDedupeKey(mem, dob);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          list.push({
            memberId: mem.memberId,
            name: mem.name || mem.memberName || "Unknown",
            dateOfBirth: mem.dateOfBirth,
            formattedDate: dob.format("DD MMM"),
            dayOfMonth: dob.date(),
            type: mem.workType || mem.type || mem.memberType || "Member",
            status: calculateStatus(dob),
          });
        }
      }
    }

    // 2. Also include any celebrants attached to loaded birthday events
    for (const ev of filteredEvents) {
      const isBirthday =
        ev.eventTypeName?.toLowerCase().includes("birthday") ||
        ev.eventName?.toLowerCase().includes("birthday");

      if (isBirthday) {
        const celebrants = getCelebrantsForEvent(ev);
        for (const c of celebrants) {
          const dob = parseMemberDob(c.dateOfBirth);
          if (!dob) continue;
          if (appliedFilters.month === 0 || dob.month() + 1 === targetMonth) {
            const key = getDedupeKey(c, dob);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              list.push({
                memberId: c.memberId,
                name: c.name || "Unknown",
                dateOfBirth: c.dateOfBirth,
                formattedDate: dob.format("DD MMM"),
                dayOfMonth: dob.date(),
                type: c.workType || c.type || c.memberType || "Member",
                status: calculateStatus(dob),
              });
            }
          }
        }
      }
    }

    // Sort chronologically by day of month (1st to 31st)
    list.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    return list;
  }, [activeMembers, filteredEvents, appliedFilters.month, appliedFilters.year]);

  // Cache for detailed event details and contributions
  const [detailedEventsMap, setDetailedEventsMap] = useState({});

  useEffect(() => {
    if (filteredEvents.length > 0) {
      filteredEvents.forEach(async (ev) => {
        if (!ev.eventId) return;
        if (detailedEventsMap[ev.eventId]) return;

        try {
          const [detail, contribs] = await Promise.all([
            getEventByIdAsync(ev.eventId).catch(() => null),
            getContributionsByEventAsync(ev.eventId).catch(() => []),
          ]);

          const combined = {
            ...(detail || ev),
            contributions: Array.isArray(contribs) ? contribs : [],
          };

          setDetailedEventsMap((prev) => ({
            ...prev,
            [ev.eventId]: combined,
          }));
        } catch {
          // Event details load error ignored
        }
      });
    }
  }, [filteredEvents, detailedEventsMap]);

  // Helper to extract active participants for non-birthday events
  const getParticipantsForNonBirthdayEvent = (ev, detailed) => {
    const list = [];
    const seen = new Set();

    const addParticipant = (memberObj) => {
      if (!memberObj) return;
      const memId = memberObj.memberId || memberObj.id;
      const memName = (
        memberObj.name ||
        memberObj.memberName ||
        ""
      ).trim();
      if (!memName && !memId) return;

      // Strictly ACTIVE accounts only!
      const matchedMaster = (members || []).find(
        (m) =>
          (memId && String(m.memberId) === String(memId)) ||
          (m.name && m.name.toLowerCase().trim() === memName.toLowerCase())
      );

      if (matchedMaster) {
        if (matchedMaster.isActive === false || matchedMaster.isDeleted) {
          return;
        }
      } else {
        if (memberObj.isActive === false || memberObj.isDeleted) {
          return;
        }
      }

      const dedupeKey = memId ? `id:${memId}` : memName.toLowerCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        const fullMem = activeMembers.find(
          (m) =>
            (memId && String(m.memberId) === String(memId)) ||
            (m.name && m.name.toLowerCase().trim() === memName.toLowerCase())
        );

        list.push({
          memberId: memId || fullMem?.memberId || dedupeKey,
          name: fullMem?.name || memName,
          type: fullMem?.workType || fullMem?.type || fullMem?.memberType || memberObj.workType || memberObj.type || memberObj.roleName || "Member",
        });
      }
    };

    // 1. From detailed.participants array
    if (Array.isArray(detailed?.participants) && detailed.participants.length > 0) {
      for (const p of detailed.participants) {
        if (typeof p === "object" && p !== null) {
          addParticipant(p);
        } else if (typeof p === "number" || typeof p === "string") {
          const m = activeMembers.find((mem) => String(mem.memberId) === String(p));
          if (m) addParticipant(m);
        }
      }
    }

    // 2. From detailed.participantIds array
    if (Array.isArray(detailed?.participantIds) && detailed.participantIds.length > 0) {
      for (const pId of detailed.participantIds) {
        const m = activeMembers.find((mem) => String(mem.memberId) === String(pId));
        if (m) addParticipant(m);
      }
    }

    // 3. From contributions
    if (Array.isArray(detailed?.contributions) && detailed.contributions.length > 0) {
      for (const c of detailed.contributions) {
        const m = activeMembers.find((mem) => String(mem.memberId) === String(c.memberId));
        if (m) {
          addParticipant(m);
        } else if (c.memberName || c.name) {
          addParticipant(c);
        }
      }
    }

    // 4. Any name matches from description or eventName (e.g. "Farewell for Michael")
    const textToScan = `${detailed?.eventName || ev?.eventName || ""} ${detailed?.description || ev?.description || ""}`.toLowerCase();
    for (const m of activeMembers) {
      if (!m.name) continue;
      const lowerName = m.name.toLowerCase().trim();
      if (textToScan.includes(lowerName)) {
        addParticipant(m);
      }
    }

    return list;
  };

  // Compile Unified Sidebar Items (Birthdays + All Scheduled Events & Participants)
  const unifiedSidebarItems = useMemo(() => {
    const today = dayjs().startOf("day");
    const targetMonth = appliedFilters.month === 0 ? dayjs().month() + 1 : appliedFilters.month;
    const targetYear = appliedFilters.year === 0 ? dayjs().year() : appliedFilters.year;

    const calculateEventStatus = (dateStr) => {
      if (!dateStr) return "upcoming";
      const evDate = dayjs(dateStr).startOf("day");
      if (evDate.isBefore(today, "day")) return "completed";
      if (evDate.isSame(today, "day")) return "today";
      return "upcoming";
    };

    const isAll = !appliedFilters.category || appliedFilters.category === "ALL";
    const isOnlyBirthday = !isAll && (appliedFilters.category || "").toLowerCase().includes("birthday");

    const items = [];
    const seenItemKeys = new Set();

    // 1. Birthday celebrants (if ALL or Birthday category)
    if (isAll || isOnlyBirthday) {
      birthdayMembers.forEach((mem) => {
        const itemKey = `bday-${mem.memberId}-${mem.dayOfMonth}`;
        if (!seenItemKeys.has(itemKey)) {
          seenItemKeys.add(itemKey);
          items.push({
            id: itemKey,
            memberId: mem.memberId,
            name: mem.name,
            type: mem.type,
            category: "Birthday",
            categoryLabel: "Birthday",
            formattedDate: mem.formattedDate,
            dayOfMonth: mem.dayOfMonth,
            status: mem.status,
            isBirthday: true,
            celebrant: mem,
          });
        }
      });
    }

    // 2. Non-Birthday events & participants (if ALL or specific non-birthday category)
    if (!isOnlyBirthday) {
      filteredEvents.forEach((ev) => {
        const isBday =
          ev.eventTypeName?.toLowerCase().includes("birthday") ||
          ev.eventName?.toLowerCase().includes("birthday");
        if (isBday) return;

        const evDate = dayjs(ev.eventDate);
        if (appliedFilters.month !== 0 && evDate.month() + 1 !== targetMonth) return;
        if (appliedFilters.year !== 0 && evDate.year() !== targetYear) return;

        const detailed = detailedEventsMap[ev.eventId] || ev;
        const eventCategory = ev.eventTypeName || ev.eventName || "Event";
        const dayOfMonth = evDate.date();
        const formattedDate = evDate.format("DD MMM");
        const status = calculateEventStatus(ev.eventDate);

        // Extract participants for this non-birthday event
        const participants = getParticipantsForNonBirthdayEvent(ev, detailed);

        if (participants.length > 0) {
          participants.forEach((p) => {
            const itemKey = `event-part-${ev.eventId}-${p.memberId}`;
            if (!seenItemKeys.has(itemKey)) {
              seenItemKeys.add(itemKey);
              items.push({
                id: itemKey,
                memberId: p.memberId,
                name: p.name,
                type: p.type || "Member",
                eventName: ev.eventName || eventCategory,
                category: eventCategory,
                categoryLabel: eventCategory,
                formattedDate,
                dayOfMonth,
                status,
                isBirthday: false,
                eventItem: detailed || ev,
              });
            }
          });
        } else {
          // If no specific participant members found, display the event itself
          const itemKey = `event-${ev.eventId}`;
          if (!seenItemKeys.has(itemKey)) {
            seenItemKeys.add(itemKey);
            items.push({
              id: itemKey,
              name: ev.eventName || eventCategory,
              type: eventCategory,
              eventName: ev.eventName || eventCategory,
              category: eventCategory,
              categoryLabel: eventCategory,
              formattedDate,
              dayOfMonth,
              status,
              isBirthday: false,
              eventItem: detailed || ev,
            });
          }
        }
      });
    }

    // Sort all items chronologically by day of month (1st to 31st)
    items.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    return items;
  }, [appliedFilters.category, birthdayMembers, filteredEvents, detailedEventsMap, appliedFilters.month, appliedFilters.year, members, activeMembers]);

  const handleDateClick = (day) => {
    if (!hasWriteAccess) return;
    if (dayjs(day).isBefore(dayjs().startOf("day"))) {
      toast.error("Cannot create an event for a past date");
      return;
    }
    setSelectedEvent({ eventDate: day });
    setDialogOpen(true);
  };

  const handleEventClick = (eventItem) => {
    setSelectedEvent(eventItem);
    setViewDialogOpen(true);
  };

  if (!canView) {
    if (isEmbedded) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
            You do not have permission to view the Event Calendar.
          </Typography>
        </Box>
      );
    }
    return (
      <div className="page-shell">
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="error" fontWeight={700}>
            Access Restricted
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You do not have permission to view the Event Calendar.
          </Typography>
        </Box>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? undefined : "page-shell"}>
      {/* Outer Card with Sleek Purple Border */}
      <Card
        sx={{
          overflow: "hidden",
          borderRadius: "12px",
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1.5px solid rgba(124, 58, 237, 0.5)"
              : "1.5px solid rgba(74, 63, 107, 0.35)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(0, 0, 0, 0.4)"
              : "0 4px 20px rgba(74, 63, 107, 0.1)",
        }}
      >
        {/* ── Top Header Bar (Matching Members Details / AppDataTable) ──── */}
        {!isEmbedded && (
          <Box
            sx={{
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(90deg, #372e54 0%, #4a3f6b 100%)"
                  : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
              borderBottom: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
              color: "#ffffff",
              px: { xs: 2.5, sm: 3 },
              py: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 48,
            }}
          >
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  fontSize: "0.95rem",
                  letterSpacing: "0.02em",
                  color: "#ffffff",
                }}
              >
                Event Calendar
              </Typography>
            </Box>
          </Box>
        )}

        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {/* Filter Bar & Stat Badges */}
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: (theme) =>
                theme.palette.mode === "dark"
                  ? "1.5px solid rgba(124, 58, 237, 0.22)"
                  : "1.5px solid rgba(124, 58, 237, 0.15)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#181524" : "#faf9fd",
            }}
          >
            {/* Filter controls row */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: 1.5,
                width: "100%",
              }}
            >
              <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 110px", md: "1 1 125px" }, minWidth: { sm: 110 } }}>
                <AppSelect
                  size="small"
                  label="Year"
                  value={filterYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterYear(val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
                  }}
                  onClear={() => setFilterYear(0)}
                  options={yearOptions}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 130px", md: "1 1 145px" }, minWidth: { sm: 130 } }}>
                <AppSelect
                  size="small"
                  label="Month"
                  value={filterMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterMonth(val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
                  }}
                  onClear={() => setFilterMonth(0)}
                  options={monthOptions}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: { xs: "1 1 100%", sm: "1.2 1 170px", md: "1.2 1 190px" }, minWidth: { sm: 170 } }}>
                <AppSelect
                  size="small"
                  label="Event Type"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  onClear={() => setFilterCategory("ALL")}
                  options={categoryOptions}
                  fullWidth
                />
              </Box>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  height: 34,
                  flexShrink: 0,
                }}
              >
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                  onClick={handleApplyFilter}
                  disabled={!canView}
                  sx={{
                    height: 34,
                    minHeight: 34,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
                    whiteSpace: "nowrap",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
                    border: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
                    "&:hover": { bgcolor: (theme) => theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important" },
                  }}
                >
                  Filter
                </AppButton>
                <AppClearFilterButton
                  disabled={!canView ? true : undefined}
                  filters={{
                    year: filterYear,
                    month: filterMonth,
                    category: filterCategory,
                    search: filterSearch,
                  }}
                  onClick={handleClearFilter}
                />
              </Box>
            </Box>
          </Box>

          {/* 75% / 25% Split: 75% Calendar + 25% Birthday Members List */}
          {!hasAppliedFilter ? (
            <Box
              sx={{
                py: 8,
                px: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 1.5,
                borderTop: (theme) => `1px dashed ${theme.palette.divider}`,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
              }}
            >
              <FilterListIcon sx={{ fontSize: 44, color: "text.disabled" }} />
              <Typography variant="h6" fontWeight={600} color="text.primary">
                No Calendar Data Displayed
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450 }}>
                Please select your filter criteria above and click <strong>Filter</strong> to view calendar events and celebrants.
              </Typography>
            </Box>
          ) : (
            <Grid container>
              {/* 75% Calendar Area */}
              <Grid
                size={{ xs: 12, lg: 9 }}
                sx={{
                  borderRight: {
                    lg: (theme) =>
                      theme.palette.mode === "dark"
                        ? "1.5px solid rgba(124, 58, 237, 0.25)"
                        : "1.5px solid rgba(124, 58, 237, 0.2)",
                  },
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Month Stepper & Today Action */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: { xs: 2, sm: 3 },
                    py: 1.2,
                    borderBottom: (theme) =>
                      theme.palette.mode === "dark"
                        ? "1.5px solid rgba(124, 58, 237, 0.18)"
                        : "1.5px solid rgba(124, 58, 237, 0.12)",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(0, 0, 0, 0.01)",
                  }}
                >
                  <Box sx={{ width: 60 }} />

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <IconButton
                      size="small"
                      onClick={handlePrevMonth}
                      sx={{
                        border: (theme) =>
                          theme.palette.mode === "dark"
                            ? "1px solid rgba(255, 255, 255, 0.2)"
                            : "1px solid rgba(124, 58, 237, 0.25)",
                        borderRadius: "8px",
                        p: 0.5,
                        color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "text.primary"),
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      <ChevronLeftRoundedIcon fontSize="small" />
                    </IconButton>

                    <Typography
                      variant="subtitle1"
                      fontWeight={800}
                      sx={{
                        minWidth: 160,
                        textAlign: "center",
                        fontSize: "1rem",
                        letterSpacing: "-0.01em",
                        color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "text.primary"),
                      }}
                    >
                      {displayedMonthName}{!appliedFilters.year || appliedFilters.year === 0 ? "" : ` ${appliedFilters.year}`}
                    </Typography>

                    <IconButton
                      size="small"
                      onClick={handleNextMonth}
                      sx={{
                        border: (theme) =>
                          theme.palette.mode === "dark"
                            ? "1px solid rgba(255, 255, 255, 0.2)"
                            : "1px solid rgba(124, 58, 237, 0.25)",
                        borderRadius: "8px",
                        p: 0.5,
                        color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "text.primary"),
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      <ChevronRightRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <AppButton
                    variant="outlined"
                    size="small"
                    onClick={handleGoToToday}
                    sx={{
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      px: 1.6,
                      py: 0.35,
                      minHeight: 28,
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.25)"
                          : "rgba(124, 58, 237, 0.35)",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "primary.main"),
                    }}
                  >
                    Today
                  </AppButton>
                </Box>

                {/* Calendar Grid View (Compact Size) */}
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                  {/* Weekdays header */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: 1,
                      mb: 1,
                      pb: 0.8,
                      borderBottom: (theme) =>
                        theme.palette.mode === "dark"
                          ? "1.5px solid rgba(124, 58, 237, 0.18)"
                          : "1.5px solid rgba(124, 58, 237, 0.12)",
                    }}
                  >
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                      <Typography
                        key={d}
                        variant="caption"
                        fontWeight={800}
                        sx={{
                          textAlign: "center",
                          color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "text.secondary"),
                          letterSpacing: "0.06em",
                          fontSize: "0.7rem",
                        }}
                      >
                        {d}
                      </Typography>
                    ))}
                  </Box>

                  {/* Calendar Days Cells */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: { xs: 0.6, sm: 0.8 },
                    }}
                  >
                    {calendarDays.map((day) => {
                      const dayItems = getDayItems(day);
                      const isCurrentMonth = appliedFilters.month === 0 || day.month() + 1 === appliedFilters.month;
                      const isDifferentMonth = !isCurrentMonth;
                      const isToday = day.isSame(dayjs(), "day");

                      return (
                        <Paper
                          key={day.toString()}
                          elevation={0}
                          onClick={() => handleDateClick(day)}
                          sx={{
                            p: 0.6,
                            height: 98,
                            maxHeight: 98,
                            minHeight: 98,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            border: (theme) =>
                              isToday
                                ? "2px solid #7c3aed"
                                : theme.palette.mode === "dark"
                                  ? "1px solid rgba(255, 255, 255, 0.10)"
                                  : "1px solid rgba(124, 58, 237, 0.15)",
                            borderRadius: "10px",
                            opacity: isDifferentMonth ? 0.35 : 1,
                            bgcolor: isToday
                              ? (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(124, 58, 237, 0.15)"
                                  : "rgba(124, 58, 237, 0.05)"
                              : "background.paper",
                            cursor: hasWriteAccess ? "pointer" : "default",
                            display: "flex",
                            flexDirection: "column",
                            transition: "all 0.15s ease",
                            "&:hover": hasWriteAccess
                              ? {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.04)"
                                    : "#f8fafc",
                                borderColor: "#7c3aed",
                              }
                              : {},
                          }}
                        >
                          {/* Day number header */}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 0.4,
                              flexShrink: 0,
                            }}
                          >
                            {isToday ? (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  bgcolor: (theme) =>
                                    theme.palette.mode === "dark" ? "#7c3aed" : "primary.main",
                                  color: "#ffffff",
                                  borderRadius: "6px",
                                  px: 0.6,
                                  py: 0.1,
                                  fontSize: "0.62rem",
                                  fontWeight: 800,
                                  lineHeight: 1.2,
                                  boxShadow: "0 2px 4px rgba(124, 58, 237, 0.3)",
                                }}
                              >
                                {day.format("D")} Today
                              </Box>
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: isDifferentMonth
                                    ? "text.disabled"
                                    : (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "text.secondary"),
                                  lineHeight: 1,
                                }}
                              >
                                {day.format("DD")}
                              </Typography>
                            )}
                          </Box>

                          {/* Day event cards: scrollable within fixed height cell */}
                          <Stack
                            spacing={0.35}
                            sx={{
                              flex: 1,
                              minHeight: 0,
                              overflowY: "auto",
                              overflowX: "hidden",
                              pr: 0.2,
                              "&::-webkit-scrollbar": {
                                width: "3px",
                              },
                              "&::-webkit-scrollbar-track": {
                                background: "transparent",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                background: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.22)"
                                    : "rgba(124, 58, 237, 0.35)",
                                borderRadius: "3px",
                              },
                              "&::-webkit-scrollbar-thumb:hover": {
                                background: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.45)"
                                    : "rgba(124, 58, 237, 0.7)",
                              },
                            }}
                          >
                            {dayItems.map((item) => {
                              const typeInfo = getEventTypeInfo(item.colorType);
                              const isBirthdayItem = item.colorType?.toLowerCase().includes("birthday");
                              const isTodayDay = day.isSame(dayjs(), "day");
                              const isPastDay = day.isBefore(dayjs().startOf("day"), "day");
                              const isPaymentPending = isItemPaymentPending(item);

                              let statusText = item.categoryLabel;
                              if (isBirthdayItem) {
                                if (isTodayDay) statusText = "Today 🎉";
                                else if (isPastDay) statusText = "Completed ✓";
                                else statusText = "Upcoming";
                              }

                              return (
                                <Tooltip
                                  key={item.key}
                                  title={`${item.displayName} • ${statusText}`}
                                  arrow
                                  placement="top"
                                >
                                  <Box
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isBirthdayItem && isTodayDay) {
                                        launchPaperBlast(e.clientX, e.clientY, 100);
                                        setCelebrantsForCelebration([item.celebrant || { name: item.displayName }]);
                                        setBdayCelebrationOpen(true);
                                      } else if (item.eventItem) {
                                        handleEventClick(item.eventItem);
                                      }
                                    }}
                                    sx={{
                                      p: "4px 6px",
                                      borderRadius: "8px",
                                      bgcolor: (theme) =>
                                        isBirthdayItem && isTodayDay
                                          ? theme.palette.mode === "dark"
                                            ? "rgba(236, 72, 153, 0.2)"
                                            : "rgba(236, 72, 153, 0.08)"
                                          : theme.palette.mode === "dark"
                                            ? typeInfo.darkBg
                                            : typeInfo.bg,
                                      border: (theme) =>
                                        isBirthdayItem && isTodayDay
                                          ? "1.5px solid #ec4899"
                                          : `1px solid ${typeInfo.border}`,
                                      boxShadow:
                                        isBirthdayItem && isTodayDay
                                          ? "0 2px 8px rgba(236, 72, 153, 0.25)"
                                          : "none",
                                      cursor: "pointer",
                                      transition: "transform 0.12s ease, box-shadow 0.12s ease",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 0.35,
                                      "&:hover": {
                                        transform: "translateY(-1px)",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                        borderColor: isBirthdayItem && isTodayDay ? "#ec4899" : typeInfo.color,
                                      },
                                    }}
                                  >
                                    {/* Top Row: Avatar Box + (Name & Status Pill) */}
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                      {/* Avatar Box */}
                                      <Box
                                        sx={{
                                          width: 24,
                                          height: 24,
                                          minWidth: 24,
                                          borderRadius: "6px",
                                          bgcolor: (theme) =>
                                            isBirthdayItem && isTodayDay
                                              ? "rgba(236, 72, 153, 0.22)"
                                              : "rgba(14, 165, 233, 0.14)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "0.8rem",
                                          lineHeight: 1,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {isBirthdayItem && isTodayDay ? "🎂" : isBirthdayItem ? "🎂" : typeInfo.emoji}
                                      </Box>

                                      {/* Name & Status Pill */}
                                      <Box sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 0.15 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                                          <Typography
                                            sx={{
                                              fontSize: "0.74rem",
                                              fontWeight: 800,
                                              color: (theme) =>
                                                theme.palette.mode === "dark"
                                                  ? typeInfo.darkText
                                                  : "#312e81",
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              lineHeight: 1.15,
                                            }}
                                          >
                                            {item.displayName}
                                          </Typography>
                                          {isBirthdayItem && isTodayDay && (
                                            <Typography
                                              component="span"
                                              sx={{
                                                fontSize: "0.68rem",
                                                display: "inline-block",
                                                animation: "bouncePopper 1.5s infinite ease-in-out",
                                              }}
                                            >
                                              🎉
                                            </Typography>
                                          )}
                                        </Box>

                                        {/* Status Pill */}
                                        <Box sx={{ display: "inline-flex" }}>
                                          <Box
                                            sx={{
                                              bgcolor: (theme) =>
                                                isBirthdayItem && isTodayDay
                                                  ? "rgba(236, 72, 153, 0.15)"
                                                  : isBirthdayItem && isPastDay
                                                    ? "rgba(34, 197, 94, 0.15)"
                                                    : "rgba(124, 58, 237, 0.1)",
                                              color: (theme) =>
                                                isBirthdayItem && isTodayDay
                                                  ? "#db2777"
                                                  : isBirthdayItem && isPastDay
                                                    ? "#16a34a"
                                                    : "#7c3aed",
                                              border: (theme) =>
                                                isBirthdayItem && isTodayDay
                                                  ? "1px solid rgba(236, 72, 153, 0.3)"
                                                  : isBirthdayItem && isPastDay
                                                    ? "1px solid rgba(34, 197, 94, 0.25)"
                                                    : "1px solid rgba(124, 58, 237, 0.2)",
                                              borderRadius: "10px",
                                              px: 0.6,
                                              py: "1px",
                                              fontSize: "0.62rem",
                                              fontWeight: 700,
                                              lineHeight: 1.1,
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {isBirthdayItem
                                              ? isTodayDay
                                                ? "Today 🎉"
                                                : isPastDay
                                                  ? "Completed ✓"
                                                  : "Upcoming"
                                              : item.categoryLabel}
                                          </Box>
                                        </Box>
                                      </Box>
                                    </Box>

                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              </Grid>

              {/* 25% Birthday Members List Area */}
              <Grid
                size={{ xs: 12, lg: 3 }}
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(124, 58, 237, 0.04)"
                      : "rgba(124, 58, 237, 0.015)",
                  display: "flex",
                  flexDirection: "column",
                  borderTop: {
                    xs: (theme) =>
                      theme.palette.mode === "dark"
                        ? "1.5px solid rgba(124, 58, 237, 0.25)"
                        : "1.5px solid rgba(124, 58, 237, 0.2)",
                    lg: "none",
                  },
                }}
              >
                {/* Sidebar Header: Dynamic based on Category filter */}
                <Box
                  sx={{
                    p: 2,
                    px: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: (theme) =>
                      theme.palette.mode === "dark"
                        ? "1.5px solid rgba(124, 58, 237, 0.22)"
                        : "1.5px solid rgba(124, 58, 237, 0.15)",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(124, 58, 237, 0.09)"
                        : "rgba(124, 58, 237, 0.04)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {!appliedFilters.category || appliedFilters.category === "ALL" ? (
                      <CalendarMonthRoundedIcon
                        sx={{ color: "#7c3aed", fontSize: "1.25rem" }}
                      />
                    ) : (appliedFilters.category || "").toLowerCase().includes("birthday") ? (
                      <CakeRoundedIcon
                        sx={{ color: "#ec4899", fontSize: "1.25rem" }}
                      />
                    ) : (
                      <Typography component="span" sx={{ fontSize: "1.2rem", lineHeight: 1 }}>
                        {getEventTypeInfo(appliedFilters.category).emoji || "👏"}
                      </Typography>
                    )}
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{
                        color: "text.primary",
                        fontSize: "0.92rem",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {!appliedFilters.category || appliedFilters.category === "ALL"
                        ? "Event Members List"
                        : (appliedFilters.category || "").toLowerCase().includes("birthday")
                          ? "Birthday Members List"
                          : `${getEventTypeInfo(appliedFilters.category).label || appliedFilters.category} Members List`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: (theme) =>
                        !appliedFilters.category || appliedFilters.category === "ALL"
                          ? "primary.main"
                          : (appliedFilters.category || "").toLowerCase().includes("birthday")
                            ? theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.15)"
                              : "primary.main"
                            : getEventTypeInfo(appliedFilters.category).color || "primary.main",
                      color: "#ffffff",
                      borderRadius: "10px",
                      px: 1,
                      py: 0.2,
                      fontSize: "0.72rem",
                      fontWeight: 800,
                    }}
                  >
                    {unifiedSidebarItems.length}
                  </Box>
                </Box>

                {/* Sidebar Items: Chronologically Sorted All/Category Members */}
                <Box
                  sx={{
                    p: 2,
                    flex: 1,
                    overflowY: "auto",
                    maxHeight: { lg: 580 },
                    "&::-webkit-scrollbar": {
                      width: "4px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "rgba(124, 58, 237, 0.25)",
                      borderRadius: "4px",
                    },
                  }}
                >
                  {unifiedSidebarItems.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                      <Typography sx={{ fontSize: "2rem", mb: 1 }}>
                        {!categoryFilter || categoryFilter === "ALL"
                          ? "🗓️"
                          : (categoryFilter || "").toLowerCase().includes("birthday")
                            ? "🎂"
                            : getEventTypeInfo(categoryFilter).emoji || "👏"}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: "text.primary", fontSize: "0.85rem" }}
                      >
                        {!categoryFilter || categoryFilter === "ALL"
                          ? `No events or birthdays in ${displayedMonthName}`
                          : (categoryFilter || "").toLowerCase().includes("birthday")
                            ? `No birthdays in ${displayedMonthName}`
                            : `No ${categoryFilter} members in ${displayedMonthName}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5, fontSize: "0.75rem" }}
                      >
                        {!categoryFilter || categoryFilter === "ALL"
                          ? "Events and birthdays for this month will appear here automatically"
                          : `Members and events for ${categoryFilter} will appear here`}
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.2}>
                      {unifiedSidebarItems.map((item) => {
                        const isToday = item.status === "today";
                        const isCompleted = item.status === "completed";
                        const isUpcoming = item.status === "upcoming";
                        const isBirthday = item.isBirthday;
                        const catInfo = getEventTypeInfo(item.category);

                        return (
                          <Paper
                            key={item.id}
                            elevation={0}
                            onClick={(e) => {
                              if (isBirthday && isToday && item.celebrant) {
                                launchPaperBlast(e.clientX, e.clientY, 100);
                                setCelebrantsForCelebration([item.celebrant]);
                                setBdayCelebrationOpen(true);
                              } else if (item.eventItem) {
                                handleEventClick(item.eventItem);
                              }
                            }}
                            sx={{
                              p: 1.2,
                              px: 1.4,
                              borderRadius: "10px",
                              border: (theme) =>
                                isBirthday && isToday
                                  ? "2px solid #ec4899"
                                  : theme.palette.mode === "dark"
                                    ? "1.5px solid rgba(255, 255, 255, 0.12)"
                                    : isBirthday
                                      ? "1.5px solid rgba(124, 58, 237, 0.18)"
                                      : `1.5px solid ${catInfo.border || "rgba(245, 158, 11, 0.3)"}`,
                              bgcolor: (theme) =>
                                isBirthday && isToday
                                  ? theme.palette.mode === "dark"
                                    ? "rgba(236, 72, 153, 0.12)"
                                    : "rgba(236, 72, 153, 0.05)"
                                  : "background.paper",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.15s ease",
                              cursor: (isBirthday && isToday) || item.eventItem ? "pointer" : "default",
                              animation: isBirthday && isToday ? "festiveGlow 3s infinite ease-in-out" : "none",
                              opacity: isCompleted ? 0.88 : 1,
                              "&:hover": {
                                borderColor: isBirthday && isToday ? "#ec4899" : catInfo.color || "primary.main",
                                transform: "translateY(-1px)",
                                boxShadow:
                                  isBirthday && isToday
                                    ? "0 4px 14px rgba(236, 72, 153, 0.3)"
                                    : theme.palette.mode === "dark"
                                      ? "0 3px 12px rgba(0, 0, 0, 0.3)"
                                      : "0 3px 8px rgba(124, 58, 237, 0.12)",
                              },
                            }}
                          >
                            {/* Member Initial / Icon Avatar + Name + Subtitle */}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: "50%",
                                  bgcolor: (theme) =>
                                    isBirthday
                                      ? isToday
                                        ? "rgba(236, 72, 153, 0.2)"
                                        : theme.palette.mode === "dark"
                                          ? "rgba(255, 255, 255, 0.08)"
                                          : "rgba(236, 72, 153, 0.12)"
                                      : theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.08)"
                                        : catInfo.bg || "rgba(245, 158, 11, 0.1)",
                                  color: (theme) =>
                                    isBirthday
                                      ? isToday
                                        ? "#db2777"
                                        : theme.palette.mode === "dark"
                                          ? "#ffffff"
                                          : "#db2777"
                                      : theme.palette.mode === "dark"
                                        ? "#ffffff"
                                        : catInfo.color || "primary.main",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: "0.82rem",
                                  border: (theme) =>
                                    isBirthday
                                      ? isToday
                                        ? "1.5px solid #ec4899"
                                        : theme.palette.mode === "dark"
                                          ? "1px solid rgba(255, 255, 255, 0.18)"
                                          : "1px solid rgba(236, 72, 153, 0.25)"
                                      : theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.18)"
                                        : `1px solid ${catInfo.border || "rgba(245, 158, 11, 0.3)"}`,
                                  flexShrink: 0,
                                }}
                              >
                                {isBirthday
                                  ? isToday
                                    ? "🎂"
                                    : item.name.charAt(0).toUpperCase()
                                  : item.name
                                    ? item.name.charAt(0).toUpperCase()
                                    : catInfo.emoji || "💐"}
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{
                                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "text.primary"),
                                      fontSize: "0.84rem",
                                      lineHeight: 1.2,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {item.name}
                                  </Typography>
                                  {isBirthday && isToday && (
                                    <Typography
                                      component="span"
                                      sx={{
                                        fontSize: "0.85rem",
                                        display: "inline-block",
                                        animation: "bouncePopper 1.5s infinite ease-in-out",
                                      }}
                                    >
                                      🎉
                                    </Typography>
                                  )}
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.7rem", display: "block", lineHeight: 1.2, mt: 0.1 }}
                                >
                                  {!categoryFilter || categoryFilter === "ALL"
                                    ? isBirthday
                                      ? `${item.type || "Member"}`
                                      : `${item.type || "Member"} • ${catInfo.emoji || ""} ${item.category}`
                                    : item.type || item.eventName || item.category}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Right Side: Date Pill & Status Badge */}
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.4, flexShrink: 0 }}>
                              {/* Date Pill */}
                              <Box
                                sx={{
                                  bgcolor: (theme) =>
                                    isToday
                                      ? "rgba(236, 72, 153, 0.15)"
                                      : theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.12)"
                                        : isBirthday
                                          ? "rgba(124, 58, 237, 0.08)"
                                          : catInfo.bg || "rgba(245, 158, 11, 0.08)",
                                  color: (theme) =>
                                    isToday
                                      ? "#db2777"
                                      : theme.palette.mode === "dark"
                                        ? "#ffffff"
                                        : isBirthday
                                          ? "#4a3f6b"
                                          : catInfo.color || "text.primary",
                                  border: (theme) =>
                                    isToday
                                      ? "1px solid rgba(236, 72, 153, 0.35)"
                                      : theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.2)"
                                        : isBirthday
                                          ? "1px solid rgba(124, 58, 237, 0.2)"
                                          : `1px solid ${catInfo.border || "rgba(245, 158, 11, 0.3)"}`,
                                  borderRadius: "6px",
                                  px: 0.9,
                                  py: 0.15,
                                  fontWeight: 800,
                                  fontSize: "0.72rem",
                                  whiteSpace: "nowrap",
                                  lineHeight: 1.2,
                                }}
                              >
                                {item.formattedDate}
                              </Box>

                              {/* Status Chip: Completed / Today 🎉 / Upcoming */}
                              {isCompleted && (
                                <Chip
                                  size="small"
                                  icon={
                                    <CheckCircleRoundedIcon
                                      sx={{ fontSize: "0.75rem !important", color: "#16a34a !important" }}
                                    />
                                  }
                                  label="Completed"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.64rem",
                                    fontWeight: 700,
                                    bgcolor: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "rgba(22, 163, 74, 0.18)"
                                        : "rgba(22, 163, 74, 0.08)",
                                    color: "#16a34a",
                                    border: "1px solid rgba(22, 163, 74, 0.28)",
                                    "& .MuiChip-label": { px: 0.5 },
                                    "& .MuiChip-icon": { ml: 0.4, mr: -0.3 },
                                  }}
                                />
                              )}

                              {isUpcoming && (
                                <Chip
                                  size="small"
                                  icon={
                                    <ScheduleRoundedIcon
                                      sx={{
                                        fontSize: "0.75rem !important",
                                        color: (theme) =>
                                          theme.palette.mode === "dark" ? "#c4b5fd !important" : "#7c3aed !important",
                                      }}
                                    />
                                  }
                                  label={!categoryFilter || categoryFilter === "ALL" || isBirthday ? "Upcoming" : item.categoryLabel}
                                  sx={{
                                    height: 20,
                                    fontSize: "0.64rem",
                                    fontWeight: 700,
                                    bgcolor: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "rgba(124, 58, 237, 0.22)"
                                        : "rgba(124, 58, 237, 0.08)",
                                    color: (theme) => (theme.palette.mode === "dark" ? "#c4b5fd" : "#7c3aed"),
                                    border: (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "1px solid rgba(196, 181, 253, 0.3)"
                                        : "1px solid rgba(124, 58, 237, 0.28)",
                                    "& .MuiChip-label": { px: 0.5 },
                                    "& .MuiChip-icon": { ml: 0.4, mr: -0.3 },
                                  }}
                                />
                              )}

                              {isToday && (
                                <Tooltip title={isBirthday ? "Today's Birthday! Click to blast confetti! 🎊" : "Event is Today! 🎯"} arrow placement="left">
                                  <Chip
                                    size="small"
                                    icon={
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          display: "inline-block",
                                          animation: "bouncePopper 1.2s infinite ease-in-out",
                                        }}
                                      >
                                        🎉
                                      </span>
                                    }
                                    label="Today"
                                    onClick={(e) => {
                                      if (isBirthday && item.celebrant) {
                                        e.stopPropagation();
                                        launchPaperBlast(e.clientX, e.clientY, 100);
                                        setCelebrantsForCelebration([item.celebrant]);
                                        setBdayCelebrationOpen(true);
                                      }
                                    }}
                                    sx={{
                                      height: 22,
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                      background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                                      color: "#ffffff",
                                      boxShadow: "0 2px 6px rgba(236, 72, 153, 0.45)",
                                      cursor: isBirthday ? "pointer" : "default",
                                      animation: "pulseToday 2s infinite ease-in-out",
                                      "& .MuiChip-label": { px: 0.6 },
                                      "& .MuiChip-icon": { ml: 0.5, mr: -0.2 },
                                      "&:hover": {
                                        transform: "scale(1.06)",
                                      },
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for Create Event */}
      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent}
        eventTypes={eventTypes}
        members={activeMembers}
        onSaveSuccess={loadCalendarData}
      />

      {/* Modal Dialog for View Event Details */}
      <EventDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        event={selectedEvent}
        members={activeMembers}
        onDeleteSuccess={handleEventDeleted}
      />

      {/* Big Celebratory Birthday Pop-up Modal */}
      <BirthdayCelebrationModal
        open={bdayCelebrationOpen}
        onClose={() => setBdayCelebrationOpen(false)}
        celebrants={celebrantsForCelebration}
        autoCloseSeconds={5}
      />

    </div>
  );
}
