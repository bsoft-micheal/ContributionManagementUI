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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddIcon from "@mui/icons-material/Add";
import { formatViewDate } from "../../utils/dateHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import apiClient from "../../services/apiClient";
import { GetMembersAsync } from "../../services/memberService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import EventFormDialog from "../../components/events/EventFormDialog";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";

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
      border: "rgba(236, 72, 153, 0.22)",
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
      border: "rgba(245, 158, 11, 0.22)",
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
      border: "rgba(59, 130, 246, 0.22)",
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
      border: "rgba(139, 92, 246, 0.22)",
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
    border: "rgba(16, 185, 129, 0.22)",
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

  // Modals for Create and View
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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
      list = list.filter((e) => {
        const typeName = (e.eventTypeName || "").toLowerCase();
        return typeName === categoryFilter.toLowerCase();
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
    const activeMembersInMonth = members.filter(
      (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === eventMonth
    );

    const participantIds = (eventItem.participants || []).map(
      (p) => p.memberId || p.id
    );
    let matchedCelebrants = [];

    if (participantIds.length > 0) {
      const pMembers = members.filter(
        (m) => participantIds.includes(m.memberId) && m.dateOfBirth
      );
      const monthMatches = pMembers.filter(
        (m) => dayjs(m.dateOfBirth).month() === eventMonth
      );
      if (monthMatches.length > 0) {
        matchedCelebrants = monthMatches;
      } else {
        matchedCelebrants = pMembers;
      }
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
    matchedCelebrants.forEach((c) => map.set(c.memberId, c));
    nameMatches.forEach((c) => map.set(c.memberId, c));

    if (map.size === 0 && activeMembersInMonth.length > 0) {
      activeMembersInMonth.forEach((c) => map.set(c.memberId, c));
    }

    return Array.from(map.values());
  };

  // Calendar 7x5 / 7x6 days grid
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
    return [
      { label: "All Events", value: "ALL" },
      ...eventTypes.map((t) => ({
        label: t.name || t.typeName || t.nameEn,
        value: t.name || t.typeName || t.nameEn,
      })),
    ];
  }, [eventTypes]);

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
          if (!celebrant.dateOfBirth) continue;
          const dob = dayjs(celebrant.dateOfBirth);
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

  // Compile Upcoming Events list
  const upcomingList = useMemo(() => {
    const list = [];
    const targetMonth =
      filters.month === 0 ? dayjs().month() + 1 : filters.month;
    const targetYear = filters.year === 0 ? dayjs().year() : filters.year;

    for (const eventItem of filteredEvents) {
      const isBirthday =
        eventItem.eventTypeName?.toLowerCase().includes("birthday") ||
        eventItem.eventName?.toLowerCase().includes("birthday");

      if (isBirthday) {
        const celebrants = getCelebrantsForEvent(eventItem);
        if (celebrants.length > 0) {
          for (const celebrant of celebrants) {
            if (!celebrant.dateOfBirth) continue;
            const dob = dayjs(celebrant.dateOfBirth);
            const dateThisYear = dayjs(
              `${targetYear}-${String(dob.month() + 1).padStart(2, "0")}-${String(
                dob.date()
              ).padStart(2, "0")}`
            );
            list.push({
              key: `up-bday-${celebrant.memberId}-${eventItem.eventId}`,
              name: celebrant.name,
              category: "Birthday",
              date: dateThisYear,
              eventItem,
            });
          }
        } else {
          list.push({
            key: `up-event-${eventItem.eventId}`,
            name: eventItem.eventName || "Birthday Event",
            category: "Birthday",
            date: dayjs(eventItem.eventDate),
            eventItem,
          });
        }
      } else {
        list.push({
          key: `up-event-${eventItem.eventId}`,
          name: eventItem.eventName || eventItem.eventTypeName || "Event",
          category: eventItem.eventTypeName || "Event",
          date: dayjs(eventItem.eventDate),
          eventItem,
        });
      }
    }

    list.sort((a, b) => a.date.valueOf() - b.date.valueOf());
    return list;
  }, [filteredEvents, members, filters]);

  // Compute stat chip counts
  const statCounts = useMemo(() => {
    let bdays = 0;
    let farewells = 0;
    let pending = 0;

    for (const item of upcomingList) {
      const cat = (item.category || "").toLowerCase();
      if (cat.includes("birthday")) bdays++;
      if (cat.includes("farewell")) farewells++;

      const isDone =
        item.eventItem?.isReminderSent ||
        item.date.isBefore(dayjs().startOf("day"));
      if (!isDone) pending++;
    }

    return {
      birthdays: bdays,
      farewells: farewells,
      total: upcomingList.length,
      pending: pending,
    };
  }, [upcomingList]);

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
      <Card sx={{ overflow: "hidden", borderRadius: "16px", border: `1px solid ${theme.palette.divider}` }}>
        {/* Header: Title + Subtitle and [+ Create Event] action */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#1e1b2e" : "#fcfbfe",
          }}
        >
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ color: "text.primary", fontSize: "1.15rem", letterSpacing: "-0.01em" }}
            >
              Event Calendar
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.2, fontSize: "0.82rem" }}
            >
              Manage birthdays, farewells and other member events
            </Typography>
          </Box>

          {hasWriteAccess && (
            <AppButton
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedEvent({ eventDate: dayjs() });
                setDialogOpen(true);
              }}
              size="small"
              sx={{
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.8rem",
                px: 2,
                py: 0.7,
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
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
              borderBottom: `1px solid ${theme.palette.divider}`,
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
                <span>{statCounts.birthdays} Birthday{statCounts.birthdays === 1 ? "" : "s"}</span>
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
                <span>{statCounts.farewells} Farewell{statCounts.farewells === 1 ? "" : "s"}</span>
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
                <span>{statCounts.total} Total Event{statCounts.total === 1 ? "" : "s"}</span>
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

          {/* Month Stepper & Today Action */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: { xs: 2, sm: 3 },
              py: 1.4,
              borderBottom: `1px solid ${theme.palette.divider}`,
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
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "8px",
                  p: 0.6,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ChevronLeftRoundedIcon fontSize="small" />
              </IconButton>

              <Typography
                variant="subtitle1"
                fontWeight={800}
                sx={{
                  minWidth: 170,
                  textAlign: "center",
                  fontSize: "1.05rem",
                  letterSpacing: "-0.01em",
                  color: "text.primary",
                }}
              >
                {displayedMonthName} {filters.year === 0 ? dayjs().year() : filters.year}
              </Typography>

              <IconButton
                size="small"
                onClick={handleNextMonth}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "8px",
                  p: 0.6,
                  "&:hover": { bgcolor: "action.hover" },
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
                px: 1.8,
                py: 0.4,
                minHeight: 30,
              }}
            >
              Today
            </AppButton>
          </Box>

          {/* Calendar Grid View */}
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* Weekdays header */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
                mb: 1.2,
                pb: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
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
                    fontSize: "0.72rem",
                  }}
                >
                  {d}
                </Typography>
              ))}
            </Box>

            {/* Calendar Days */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: { xs: 0.8, sm: 1.2 },
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
                      p: 1,
                      minHeight: 110,
                      border: `1px solid ${
                        isToday
                          ? theme.palette.primary.main
                          : theme.palette.divider
                      }`,
                      borderRadius: "12px",
                      opacity: isDifferentMonth ? 0.35 : 1,
                      bgcolor: isToday
                        ? theme.palette.mode === "dark"
                          ? "rgba(124, 58, 237, 0.08)"
                          : "rgba(124, 58, 237, 0.04)"
                        : "background.paper",
                      cursor: hasWriteAccess ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.15s ease",
                      "&:hover": hasWriteAccess
                        ? {
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.04)"
                                : "#f8fafc",
                            borderColor: theme.palette.primary.main,
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
                        mb: 0.8,
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
                            px: 0.8,
                            py: 0.2,
                            fontSize: "0.68rem",
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
                            fontSize: "0.78rem",
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
                    <Stack spacing={0.6} sx={{ flex: 1 }}>
                      {dayItems.map((item) => {
                        const typeInfo = getEventTypeInfo(item.colorType);
                        return (
                          <Tooltip
                            key={item.key}
                            title={`${item.displayName} • ${item.categoryLabel}`}
                            arrow
                            placement="top"
                          >
                            <Box
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(item.eventItem);
                              }}
                              sx={{
                                p: "5px 8px",
                                borderRadius: "8px",
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? typeInfo.darkBg
                                    : typeInfo.bg,
                                border: `1px solid ${typeInfo.border}`,
                                cursor: "pointer",
                                transition:
                                  "transform 0.15s ease, box-shadow 0.15s ease",
                                "&:hover": {
                                  transform: "translateY(-1px)",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                                  borderColor: typeInfo.color,
                                },
                              }}
                            >
                              {/* Line 1: Icon + Name (e.g. 🎂 Dani) */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.6,
                                }}
                              >
                                <Typography
                                  component="span"
                                  sx={{ fontSize: "0.85rem", lineHeight: 1 }}
                                >
                                  {typeInfo.emoji}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.78rem",
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
                              </Box>

                              {/* Line 2: Category label (e.g. Birthday) */}
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  color: (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(255,255,255,0.7)"
                                      : "text.secondary",
                                  pl: "1.2rem",
                                  mt: 0.25,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  lineHeight: 1.1,
                                }}
                              >
                                {item.categoryLabel}
                              </Typography>
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

          {/* Upcoming Events Section */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.01)"
                  : "rgba(0, 0, 0, 0.01)",
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ mb: 1.5, fontSize: "0.95rem", color: "text.primary" }}
            >
              Upcoming Events
            </Typography>

            {upcomingList.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 3, textAlign: "center" }}
              >
                No upcoming events scheduled for this period
              </Typography>
            ) : (
              <Stack spacing={1}>
                {upcomingList.map((item) => {
                  const typeInfo = getEventTypeInfo(item.category);
                  const isPastOrSent =
                    item.eventItem?.isReminderSent ||
                    item.date.isBefore(dayjs().startOf("day"));

                  return (
                    <Paper
                      key={item.key}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        px: 2,
                        borderRadius: "10px",
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: { xs: "wrap", sm: "nowrap" },
                        bgcolor: "background.paper",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.03)"
                              : "rgba(0, 0, 0, 0.015)",
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      {/* Col 1: Icon + Name */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          minWidth: 160,
                        }}
                      >
                        <Typography sx={{ fontSize: "1.1rem", lineHeight: 1 }}>
                          {typeInfo.emoji}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: "text.primary" }}
                        >
                          {item.name}
                        </Typography>
                      </Box>

                      {/* Col 2: Event Type */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 600,
                          minWidth: 110,
                          fontSize: "0.82rem",
                        }}
                      >
                        {item.category}
                      </Typography>

                      {/* Col 3: Date */}
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          color: "text.primary",
                          minWidth: 90,
                          fontSize: "0.82rem",
                        }}
                      >
                        {item.date.format("DD MMM")}
                      </Typography>

                      {/* Col 4: Reminder Status */}
                      <Box sx={{ minWidth: 160 }}>
                        {isPastOrSent ? (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              bgcolor: "rgba(16, 185, 129, 0.1)",
                              color: "#059669",
                              border: "1px solid rgba(16, 185, 129, 0.25)",
                              borderRadius: "6px",
                              px: 1,
                              py: 0.3,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                            }}
                          >
                            ✓ Reminder Sent
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              bgcolor: "rgba(245, 158, 11, 0.1)",
                              color: "#d97706",
                              border: "1px solid rgba(245, 158, 11, 0.25)",
                              borderRadius: "6px",
                              px: 1,
                              py: 0.3,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                            }}
                          >
                            ⌛ Reminder Pending
                          </Box>
                        )}
                      </Box>

                      {/* Col 5: Action [View] */}
                      <AppButton
                        variant="outlined"
                        size="small"
                        onClick={() => handleEventClick(item.eventItem)}
                        sx={{
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          px: 1.8,
                          py: 0.35,
                          minHeight: 28,
                        }}
                      >
                        View
                      </AppButton>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Modal Dialog for Create Event (no navigation away needed) */}
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
    </div>
  );
}
