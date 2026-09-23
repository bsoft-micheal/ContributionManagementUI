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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import { formatViewDate } from "../../utils/dateHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import apiClient from "../../services/apiClient";
import { GetMembersAsync } from "../../services/memberService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import EventFormDialog from "../../components/events/EventFormDialog";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";
import { launchPaperBlast } from "../../components/common/PaperBlast";
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

export default function CalendarPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const hasWriteAccess = useMemo(() => {
    return getRightsForPage("Calendar", authState?.role).write;
  }, [authState?.role]);

  const [filters, setFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
  });
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);

  // Modals for Create, View, and Birthday Celebration
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bdayCelebrationOpen, setBdayCelebrationOpen] = useState(false);
  const [hasShownCelebration, setHasShownCelebration] = useState(false);

  const loadCalendarData = async () => {
    try {
      const apiParams = {
        month: filters.month === 0 ? null : filters.month,
        year: filters.year === 0 ? null : filters.year,
      };
      const { data: resData } = await apiClient.get("/events/getAllEventAsync", {
        params: apiParams,
      });
      const data = resData && resData.data !== undefined ? resData.data : resData;
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [filters]);

  useEffect(() => {
    async function loadEventTypesAndMembers() {
      try {
        const [types, mems] = await Promise.all([
          GetEventTypesAsync(),
          GetMembersAsync(),
        ]);
        setEventTypes(types || []);
        setMembers(mems || []);
      } catch (error) {
        console.error("Error loading static calendar data:", error);
      }
    }
    loadEventTypesAndMembers();
  }, []);

  // Filter events by Category and Search Text
  const filteredEvents = useMemo(() => {
    let list = events;

    if (categoryFilter !== "ALL") {
      const filterLower = categoryFilter.toLowerCase();
      list = list.filter((e) => {
        const typeName = (e.eventTypeName || "").toLowerCase();
        return (
          typeName === filterLower ||
          typeName.includes(filterLower) ||
          filterLower.includes(typeName)
        );
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => {
        const nameMatch = (e.eventName || "").toLowerCase().includes(q);
        const typeMatch = (e.eventTypeName || "").toLowerCase().includes(q);
        const descMatch = (e.description || "").toLowerCase().includes(q);
        return nameMatch || typeMatch || descMatch;
      });
    }

    return list;
  }, [events, categoryFilter, searchQuery]);

  // Extract celebrants for birthday events
  const getCelebrantsForEvent = (eventItem) => {
    const isBirthday =
      eventItem.eventTypeName?.toLowerCase().includes("birthday") ||
      eventItem.eventName?.toLowerCase().includes("birthday");

    if (!isBirthday) return [];

    const eventMonth = dayjs(eventItem.eventDate).month();
    const activeMembersInMonth = members.filter((m) => {
      const dob = parseMemberDob(m.dateOfBirth);
      return dob && dob.month() === eventMonth;
    });

    const participantIds = (eventItem.participants || []).map(
      (p) => p.memberId || p.id
    );
    let matchedCelebrants = [];

    if (participantIds.length > 0) {
      const pMembers = members.filter(
        (m) => participantIds.includes(m.memberId) && parseMemberDob(m.dateOfBirth)
      );
      const monthMatches = pMembers.filter(
        (m) => parseMemberDob(m.dateOfBirth).month() === eventMonth
      );
      matchedCelebrants = monthMatches.length > 0 ? monthMatches : pMembers;
    }

    const textToSearch = `${eventItem.eventName || ""} ${
      eventItem.description || ""
    }`.toLowerCase();
    const nameMatches = members.filter((m) => {
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
      filters.month === 0 ? dayjs().month() + 1 : filters.month;
    const targetYear = filters.year === 0 ? dayjs().year() : filters.year;
    const startOfMonth = dayjs(
      `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`
    );
    const startDay = startOfMonth.startOf("week");
    return Array.from({ length: 35 }, (_, index) => startDay.add(index, "day"));
  }, [filters]);

  const monthOptions = [
    { label: "All Months", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    })),
  ];

  const currentYear = dayjs().year();
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

    // 1. From eventTypes loaded from backend API
    (eventTypes || []).forEach((t) => {
      const name = t.eventTypeName || t.typeName || t.name || t.nameEn;
      if (name && !set.has(name.toLowerCase())) {
        set.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });

    // 2. Also ensure any category present in loaded events is included
    (events || []).forEach((e) => {
      const name = e.eventTypeName;
      if (name && !set.has(name.toLowerCase())) {
        set.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });

    // 3. Fallback defaults if none were populated yet
    if (list.length === 1) {
      ["Birthday", "Farewell"].forEach((fallback) => {
        if (!set.has(fallback.toLowerCase())) {
          set.add(fallback.toLowerCase());
          list.push({ label: fallback, value: fallback });
        }
      });
    }

    return list;
  }, [eventTypes, events]);

  // Stepper handlers
  const handlePrevMonth = () => {
    setFilters((prev) => {
      const m = prev.month === 0 ? dayjs().month() + 1 : prev.month;
      const y = prev.year === 0 ? dayjs().year() : prev.year;
      if (m === 1) {
        return { month: 12, year: y - 1 };
      }
      return { month: m - 1, year: y };
    });
  };

  const handleNextMonth = () => {
    setFilters((prev) => {
      const m = prev.month === 0 ? dayjs().month() + 1 : prev.month;
      const y = prev.year === 0 ? dayjs().year() : prev.year;
      if (m === 12) {
        return { month: 1, year: y + 1 };
      }
      return { month: m + 1, year: y };
    });
  };

  const handleGoToToday = () => {
    setFilters({
      month: dayjs().month() + 1,
      year: dayjs().year(),
    });
  };

  const displayedMonthName =
    filters.month === 0
      ? "All Months"
      : dayjs().month(filters.month - 1).format("MMMM");

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

    return items;
  };

  // Compile Birthday Members List for the 25% sidebar panel with status (Completed, Today, Upcoming)
  const birthdayMembers = useMemo(() => {
    const targetMonth =
      filters.month === 0 ? dayjs().month() + 1 : filters.month;
    const targetYear = filters.year === 0 ? dayjs().year() : filters.year;
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
      const bdayMonth = filters.month === 0 ? dob.month() + 1 : targetMonth;
      const bdayDate = dayjs(
        `${targetYear}-${String(bdayMonth).padStart(2, "0")}-${String(dob.date()).padStart(2, "0")}`
      ).startOf("day");

      if (bdayDate.isBefore(today, "day")) return "completed";
      if (bdayDate.isSame(today, "day")) return "today";
      return "upcoming";
    };

    // 1. From members list based on DOB
    for (const mem of members) {
      const dob = parseMemberDob(mem.dateOfBirth);
      if (!dob) continue;

      if (filters.month === 0 || dob.month() + 1 === targetMonth) {
        const key = getDedupeKey(mem, dob);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          list.push({
            memberId: mem.memberId,
            name: mem.name || mem.memberName || "Unknown",
            dateOfBirth: mem.dateOfBirth,
            formattedDate: dob.format("DD MMM"),
            dayOfMonth: dob.date(),
            type: mem.type || mem.memberType || "Member",
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
          if (filters.month === 0 || dob.month() + 1 === targetMonth) {
            const key = getDedupeKey(c, dob);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              list.push({
                memberId: c.memberId,
                name: c.name || "Unknown",
                dateOfBirth: c.dateOfBirth,
                formattedDate: dob.format("DD MMM"),
                dayOfMonth: dob.date(),
                type: c.type || c.memberType || "Member",
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
  }, [members, filteredEvents, filters]);

  // Today's celebrants
  const todayCelebrants = useMemo(() => {
    return birthdayMembers.filter((m) => m.status === "today");
  }, [birthdayMembers]);

  // Automatic festive celebration: Trigger big pop up modal & paper blast confetti when there is a birthday today!
  useEffect(() => {
    if (todayCelebrants.length > 0 && !hasShownCelebration) {
      const timer = setTimeout(() => {
        setBdayCelebrationOpen(true);
        setHasShownCelebration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [todayCelebrants, hasShownCelebration]);

  // Compute stat counts for badges
  const statCounts = useMemo(() => {
    let farewells = 0;
    let pending = 0;

    for (const ev of filteredEvents) {
      const cat = (ev.eventTypeName || "").toLowerCase();
      if (cat.includes("farewell")) farewells++;

      const isDone =
        ev.isReminderSent ||
        dayjs(ev.eventDate).isBefore(dayjs().startOf("day"));
      if (!isDone) pending++;
    }

    return {
      birthdays: birthdayMembers.length,
      farewells: farewells,
      total: filteredEvents.length,
      pending: pending,
    };
  }, [birthdayMembers, filteredEvents]);

  const handleDateClick = (day) => {
    if (!hasWriteAccess) return;
    setSelectedEvent({ eventDate: day });
    setDialogOpen(true);
  };

  const handleEventClick = (eventItem) => {
    setSelectedEvent(eventItem);
    setViewDialogOpen(true);
  };

  return (
    <div className="page-shell">
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
        <Box
          sx={{
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(90deg, #171b2d 0%, #1d2338 100%)"
                : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
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
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "0.74rem",
                display: "block",
                lineHeight: 1.2,
                mt: 0.1,
              }}
            >
            </Typography>
          </Box>

          {hasWriteAccess && (
            <AppButton
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedEvent({ eventDate: dayjs() });
                setDialogOpen(true);
              }}
              sx={{
                bgcolor: "#ffffff !important",
                color: "#4a3f6b !important",
                fontWeight: 700,
                fontSize: "0.8rem",
                borderRadius: "8px",
                px: 1.8,
                py: 0.5,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                "&:hover": { bgcolor: "#f3f0f7 !important" },
              }}
            >
              Create Event
            </AppButton>
          )}
        </Box>

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
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <AppSelect
                  size="small"
                  label="Month"
                  value={filters.month}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      month: Number(e.target.value),
                    }))
                  }
                  options={monthOptions}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <AppSelect
                  size="small"
                  label="Year"
                  value={filters.year}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      year: Number(e.target.value),
                    }))
                  }
                  options={yearOptions}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AppSelect
                  size="small"
                  label="Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={categoryOptions}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 12, md: 5 }}>
                <AppInput
                  size="small"
                  label="Search"
                  placeholder="Search Events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon
                            sx={{ fontSize: "1.1rem", color: "text.secondary" }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Stat Badges row */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.2,
                mt: 2,
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 1.4,
                  py: 0.5,
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(236, 72, 153, 0.15)"
                      : "rgba(236, 72, 153, 0.08)",
                  border: "1px solid rgba(236, 72, 153, 0.25)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#fbcfe8" : "#be185d",
                }}
              >
                <span>🎂</span>
                <span>
                  {statCounts.birthdays} Birthday
                  {statCounts.birthdays === 1 ? "" : "s"}
                </span>
              </Box>

              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 1.4,
                  py: 0.5,
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#fde68a" : "#b45309",
                }}
              >
                <span>👏</span>
                <span>
                  {statCounts.farewells} Farewell
                  {statCounts.farewells === 1 ? "" : "s"}
                </span>
              </Box>

              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 1.4,
                  py: 0.5,
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#bfdbfe" : "#1d4ed8",
                }}
              >
                <span>📅</span>
                <span>
                  {statCounts.total} Total Event
                  {statCounts.total === 1 ? "" : "s"}
                </span>
              </Box>

              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 1.4,
                  py: 0.5,
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#fca5a5" : "#b91c1c",
                }}
              >
                <span>⏰</span>
                <span>{statCounts.pending} Pending</span>
              </Box>
            </Box>
          </Box>

          {/* 75% / 25% Split: 75% Calendar + 25% Birthday Members List */}
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
                      border: "1px solid rgba(124, 58, 237, 0.25)",
                      borderRadius: "8px",
                      p: 0.5,
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
                      color: "text.primary",
                    }}
                  >
                    {displayedMonthName}{" "}
                    {filters.year === 0 ? dayjs().year() : filters.year}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={handleNextMonth}
                    sx={{
                      border: "1px solid rgba(124, 58, 237, 0.25)",
                      borderRadius: "8px",
                      p: 0.5,
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
                    borderColor: "rgba(124, 58, 237, 0.35)",
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
                        color: "text.secondary",
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
                    const isDifferentMonth =
                      filters.month !== 0 && day.month() + 1 !== filters.month;
                    const isToday = day.isSame(dayjs(), "day");

                    return (
                      <Paper
                        key={day.toString()}
                        elevation={0}
                        onClick={() => handleDateClick(day)}
                        sx={{
                          p: 0.8,
                          minHeight: 82, // Reduced calendar size
                          border: (theme) =>
                            isToday
                              ? "2px solid #7c3aed"
                              : theme.palette.mode === "dark"
                              ? "1px solid rgba(124, 58, 237, 0.2)"
                              : "1px solid rgba(124, 58, 237, 0.15)",
                          borderRadius: "10px",
                          opacity: isDifferentMonth ? 0.35 : 1,
                          bgcolor: isToday
                            ? (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(124, 58, 237, 0.1)"
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
                            mb: 0.5,
                          }}
                        >
                          {isToday ? (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                bgcolor: "primary.main",
                                color: "#ffffff",
                                borderRadius: "6px",
                                px: 0.7,
                                py: 0.15,
                                fontSize: "0.64rem",
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
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                color: isDifferentMonth
                                  ? "text.disabled"
                                  : "text.secondary",
                                lineHeight: 1,
                              }}
                            >
                              {day.format("DD")}
                            </Typography>
                          )}
                        </Box>

                        {/* Day event cards: Icon + Name, and Category label */}
                        <Stack spacing={0.4} sx={{ flex: 1 }}>
                          {dayItems.map((item) => {
                            const typeInfo = getEventTypeInfo(item.colorType);
                            const isBirthdayItem = item.colorType?.toLowerCase().includes("birthday");
                            const isTodayDay = day.isSame(dayjs(), "day");
                            const isPastDay = day.isBefore(dayjs().startOf("day"), "day");

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
                                      launchPaperBlast(e.clientX, e.clientY);
                                    }
                                    handleEventClick(item.eventItem);
                                  }}
                                  sx={{
                                    p: "3px 6px",
                                    borderRadius: "6px",
                                    bgcolor: (theme) =>
                                      isBirthdayItem && isTodayDay
                                        ? theme.palette.mode === "dark"
                                          ? "rgba(236, 72, 153, 0.22)"
                                          : "rgba(236, 72, 153, 0.12)"
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
                                    transition:
                                      "transform 0.12s ease, box-shadow 0.12s ease",
                                    "&:hover": {
                                      transform: "translateY(-1px)",
                                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                                      borderColor: typeInfo.color,
                                    },
                                  }}
                                >
                                  {/* Line 1: Icon + Name */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      component="span"
                                      sx={{ fontSize: "0.74rem", lineHeight: 1 }}
                                    >
                                      {isBirthdayItem && isTodayDay ? "🎂" : typeInfo.emoji}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        color: (theme) =>
                                          theme.palette.mode === "dark"
                                            ? typeInfo.darkText
                                            : typeInfo.text,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {item.displayName}
                                    </Typography>
                                    {isBirthdayItem && isTodayDay && (
                                      <Typography
                                        component="span"
                                        sx={{
                                          fontSize: "0.7rem",
                                          display: "inline-block",
                                          animation: "bouncePopper 1.5s infinite ease-in-out",
                                        }}
                                      >
                                        🎉
                                      </Typography>
                                    )}
                                  </Box>

                                  {/* Line 2: Category & Status label */}
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, pl: "1.1rem", mt: 0.2 }}>
                                    <Typography
                                      sx={{
                                        fontSize: "0.62rem",
                                        fontWeight: isBirthdayItem && isTodayDay ? 800 : 600,
                                        color: (theme) =>
                                          isBirthdayItem && isTodayDay
                                            ? "#db2777"
                                            : isBirthdayItem && isPastDay
                                            ? "#16a34a"
                                            : theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.65)"
                                            : "text.secondary",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        lineHeight: 1.1,
                                      }}
                                    >
                                      {isBirthdayItem
                                        ? isTodayDay
                                          ? "Today 🎉"
                                          : isPastDay
                                          ? "Completed ✓"
                                          : "Upcoming"
                                        : item.categoryLabel}
                                    </Typography>
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
              {/* Sidebar Header: Birthday Members List */}
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
                  <CakeRoundedIcon
                    sx={{ color: "#ec4899", fontSize: "1.25rem" }}
                  />
                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    sx={{
                      color: "text.primary",
                      fontSize: "0.92rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Birthday Members List
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    color: "#ffffff",
                    borderRadius: "10px",
                    px: 1,
                    py: 0.2,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                  }}
                >
                  {birthdayMembers.length}
                </Box>
              </Box>

              {/* Birthday Members Item List (Clean name and date, no reminder, no view) */}
              <Box sx={{ p: 2, flex: 1, overflowY: "auto", maxH: { lg: 580 } }}>
                {birthdayMembers.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                    <Typography sx={{ fontSize: "2rem", mb: 1 }}>🎂</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: "text.primary", fontSize: "0.85rem" }}
                    >
                      No birthdays in {displayedMonthName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5, fontSize: "0.75rem" }}
                    >
                      Member birthdays for this month will appear here automatically
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    {birthdayMembers.map((mem) => {
                      const isToday = mem.status === "today";
                      const isCompleted = mem.status === "completed";
                      const isUpcoming = mem.status === "upcoming";

                      return (
                        <Paper
                          key={mem.memberId}
                          elevation={0}
                          onClick={(e) => {
                            if (isToday) {
                              launchPaperBlast(e.clientX, e.clientY);
                            }
                          }}
                          sx={{
                            p: 1.2,
                            px: 1.4,
                            borderRadius: "10px",
                            border: (theme) =>
                              isToday
                                ? "2px solid #ec4899"
                                : theme.palette.mode === "dark"
                                ? "1.5px solid rgba(124, 58, 237, 0.25)"
                                : "1.5px solid rgba(124, 58, 237, 0.18)",
                            bgcolor: (theme) =>
                              isToday
                                ? theme.palette.mode === "dark"
                                  ? "rgba(236, 72, 153, 0.12)"
                                  : "rgba(236, 72, 153, 0.05)"
                                : "background.paper",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "all 0.15s ease",
                            cursor: isToday ? "pointer" : "default",
                            animation: isToday ? "festiveGlow 3s infinite ease-in-out" : "none",
                            opacity: isCompleted ? 0.88 : 1,
                            "&:hover": {
                              borderColor: isToday ? "#ec4899" : "primary.main",
                              transform: "translateY(-1px)",
                              boxShadow: isToday
                                ? "0 4px 14px rgba(236, 72, 153, 0.3)"
                                : "0 3px 8px rgba(124, 58, 237, 0.12)",
                            },
                          }}
                        >
                          {/* Member Initial Avatar + Name + Type */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.1, minWidth: 0 }}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                bgcolor: isToday ? "rgba(236, 72, 153, 0.2)" : "rgba(236, 72, 153, 0.12)",
                                color: "#db2777",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "0.82rem",
                                border: isToday
                                  ? "1.5px solid #ec4899"
                                  : "1px solid rgba(236, 72, 153, 0.25)",
                                flexShrink: 0,
                              }}
                            >
                              {isToday ? "🎂" : mem.name.charAt(0).toUpperCase()}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  sx={{
                                    color: "text.primary",
                                    fontSize: "0.84rem",
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {mem.name}
                                </Typography>
                                {isToday && (
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
                              {mem.type && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.7rem", display: "block" }}
                                >
                                  {mem.type}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          {/* Right Side: Birth Date Pill & Status Badge */}
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.4, flexShrink: 0 }}>
                            {/* Birth Date Pill */}
                            <Box
                              sx={{
                                bgcolor: (theme) =>
                                  isToday
                                    ? "rgba(236, 72, 153, 0.15)"
                                    : theme.palette.mode === "dark"
                                    ? "rgba(124, 58, 237, 0.15)"
                                    : "rgba(124, 58, 237, 0.08)",
                                color: isToday ? "#db2777" : "primary.main",
                                border: (theme) =>
                                  isToday
                                    ? "1px solid rgba(236, 72, 153, 0.35)"
                                    : "1px solid rgba(124, 58, 237, 0.2)",
                                borderRadius: "6px",
                                px: 0.9,
                                py: 0.15,
                                fontWeight: 800,
                                fontSize: "0.72rem",
                                whiteSpace: "nowrap",
                                lineHeight: 1.2,
                              }}
                            >
                              {mem.formattedDate}
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
                                    sx={{ fontSize: "0.75rem !important", color: "#7c3aed !important" }}
                                  />
                                }
                                label="Upcoming"
                                sx={{
                                  height: 20,
                                  fontSize: "0.64rem",
                                  fontWeight: 700,
                                  bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(124, 58, 237, 0.18)"
                                      : "rgba(124, 58, 237, 0.08)",
                                  color: "#7c3aed",
                                  border: "1px solid rgba(124, 58, 237, 0.28)",
                                  "& .MuiChip-label": { px: 0.5 },
                                  "& .MuiChip-icon": { ml: 0.4, mr: -0.3 },
                                }}
                              />
                            )}

                            {isToday && (
                              <Tooltip title="Today's Birthday! Click to blast confetti! 🎊" arrow placement="left">
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
                                    e.stopPropagation();
                                    launchPaperBlast(e.clientX, e.clientY);
                                    setBdayCelebrationOpen(true);
                                  }}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                                    color: "#ffffff",
                                    boxShadow: "0 2px 6px rgba(236, 72, 153, 0.45)",
                                    cursor: "pointer",
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
        </CardContent>
      </Card>

      {/* Modal Dialog for Create Event */}
      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent}
        eventTypes={eventTypes}
        members={members}
        onSaveSuccess={loadCalendarData}
      />

      {/* Modal Dialog for View Event Details */}
      <EventDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        event={selectedEvent}
        members={members}
      />

      {/* Big Celebratory Birthday Pop-up Modal with Paper Blast Confetti & Auto-Hide */}
      <BirthdayCelebrationModal
        open={bdayCelebrationOpen}
        onClose={() => setBdayCelebrationOpen(false)}
        celebrants={todayCelebrants}
        autoCloseSeconds={5}
      />
    </div>
  );
}
