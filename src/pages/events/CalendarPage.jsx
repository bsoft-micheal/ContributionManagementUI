import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Grid, Stack, Typography, Paper, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
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
import { FilterList as FilterListIcon } from "@mui/icons-material";

const eventColors = {
  Birthday: { main: "#c026d3", bg: "rgba(192, 38, 211, 0.08)", border: "rgba(192, 38, 211, 0.2)", text: "#c026d3" },
  "Team Dinner": { main: "#2563eb", bg: "rgba(37, 99, 235, 0.08)", border: "rgba(37, 99, 235, 0.2)", text: "#2563eb" },
  Farewell: { main: "#ea580c", bg: "rgba(234, 88, 12, 0.08)", border: "rgba(234, 88, 12, 0.2)", text: "#ea580c" },
  "Custom Event": { main: "#059669", bg: "rgba(5, 150, 105, 0.08)", border: "rgba(5, 150, 105, 0.2)", text: "#059669" },
};

const getEventColor = (typeName) => {
  if (!typeName) {
    return { main: "#475569", bg: "rgba(71, 85, 105, 0.05)", border: "rgba(71, 85, 105, 0.1)", text: "#475569" };
  }
  
  if (eventColors[typeName]) {
    return eventColors[typeName];
  }
  
  // Dynamic color generation based on string hashing
  let hash = 0;
  for (let i = 0; i < typeName.length; i++) {
    hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  
  return {
    main: `hsl(${hue}, 70%, 45%)`,
    bg: `hsl(${hue}, 70%, 97%)`,
    border: `hsl(${hue}, 70%, 90%)`,
    text: `hsl(${hue}, 70%, 35%)`
  };
};

export default function CalendarPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const hasWriteAccess = useMemo(() => {
    return getRightsForPage("Calendar", authState?.role).write;
  }, [authState?.role]);

  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const toast = useAppToast();

  // Event Details State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadCalendarData = async () => {
    try {
      const apiParams = {
        month: filters.month === 0 ? null : filters.month,
        year: filters.year === 0 ? null : filters.year,
      };
      const { data: resData } = await apiClient.get("/events/getAllEventAsync", { params: apiParams });
      const data = (resData && resData.data !== undefined) ? resData.data : resData;
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
        setEventTypes(types);
        setMembers(mems);
      } catch (error) {
        console.error("Error loading static calendar data:", error);
      }
    }
    loadEventTypesAndMembers();
  }, []);

  const calendarDays = useMemo(() => {
    const targetMonth = filters.month === 0 ? dayjs().month() + 1 : filters.month;
    const targetYear = filters.year === 0 ? dayjs().year() : filters.year;
    const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2, "0")}-01`);
    const startDay = startOfMonth.startOf("week");
    return Array.from({ length: 35 }, (_, index) => startDay.add(index, "day"));
  }, [filters]);

  const monthOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ 
      label: dayjs().month(i).format("MMMM"), 
      value: i + 1 
    }))
  ];

  const currentYear = dayjs().year();
  const yearOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 11 }, (_, i) => {
      const y = currentYear - 5 + i;
      return { label: String(y), value: y };
    })
  ];

  const handleDateClick = (day) => {
    if (!hasWriteAccess) {
      return;
    }
    setSelectedEvent({ eventDate: day });
    setDialogOpen(true);
  };

  const handleEventClick = (eventItem) => {
    setSelectedEvent(eventItem);
    setViewDialogOpen(true);
  };

  const getCelebrantsForEvent = (eventItem) => {
    const isBirthday = 
      eventItem.eventTypeName?.toLowerCase().includes("birthday") ||
      eventItem.eventName?.toLowerCase().includes("birthday");

    if (!isBirthday) return [];

    const eventMonth = dayjs(eventItem.eventDate).month();
    const activeMembersInMonth = members.filter(
      (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === eventMonth
    );

    // 1. Check if participants are explicitly attached to eventItem
    const participantIds = (eventItem.participants || []).map((p) => p.memberId || p.id);
    let matchedCelebrants = [];

    if (participantIds.length > 0) {
      const pMembers = members.filter((m) => participantIds.includes(m.memberId) && m.dateOfBirth);
      const monthMatches = pMembers.filter((m) => dayjs(m.dateOfBirth).month() === eventMonth);
      if (monthMatches.length > 0) {
        matchedCelebrants = monthMatches;
      } else {
        matchedCelebrants = pMembers;
      }
    }

    // 2. Also check if member names appear in eventName or description
    const textToSearch = `${eventItem.eventName || ""} ${eventItem.description || ""}`.toLowerCase();
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

    // 3. Fallback: if still empty, but this is a birthday event for this month, map to active celebrants of the month
    if (map.size === 0 && activeMembersInMonth.length > 0) {
      activeMembersInMonth.forEach((c) => map.set(c.memberId, c));
    }

    return Array.from(map.values());
  };

  const getDayItems = (day) => {
    const dayStr = day.format("YYYY-MM-DD");
    const dayMonth = day.month();
    const dayDate = day.date();

    const items = [];
    const handledCelebrantIds = new Set();

    for (const eventItem of events) {
      const isBirthday = 
        eventItem.eventTypeName?.toLowerCase().includes("birthday") ||
        eventItem.eventName?.toLowerCase().includes("birthday");

      if (!isBirthday) {
        if (dayjs(eventItem.eventDate).format("YYYY-MM-DD") === dayStr) {
          items.push({
            key: `event-${eventItem.eventId}`,
            eventItem,
            title: eventItem.eventName || eventItem.eventTypeName || "Scheduled Event",
            subtitle: `${eventItem.eventName || eventItem.eventTypeName} (${formatViewDate(eventItem.eventDate)})`,
            colorType: eventItem.eventTypeName,
            isBirthdayCelebrant: false,
          });
        }
        continue;
      }

      // Birthday event: map each celebrant using their DOB from the member table
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
                title: `${celebrant.name}`,
                subtitle: `${celebrant.name}'s Birthday (${dob.format("D MMM")}) • ${eventItem.eventName}`,
                colorType: "Birthday",
                isBirthdayCelebrant: true,
              });
            }
          }
        }
      } else {
        // Fallback: If no celebrants could be extracted, show on eventDate
        if (dayjs(eventItem.eventDate).format("YYYY-MM-DD") === dayStr) {
          items.push({
            key: `event-${eventItem.eventId}`,
            eventItem,
            title: eventItem.eventName || "Birthday",
            subtitle: `${eventItem.eventName} (${formatViewDate(eventItem.eventDate)})`,
            colorType: "Birthday",
            isBirthdayCelebrant: false,
          });
        }
      }
    }

    return items;
  };

  return (
    <div className="page-shell">
      <Card sx={{ overflow: "hidden" }}>
        <Box sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1d2338" : "#4a3f6b",
          color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#ffffff",
          px: 2.5,
          py: 1.2,
          minHeight: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "inherit", fontSize: "0.9rem" }}>
            Event Calendar
          </Typography>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: theme.palette.mode === "dark" ? "#171b2d" : "#faf9fd", px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <AppSelect
                  size="small"
                  label="Month"
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(Number(event.target.value))}
                  options={monthOptions}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <AppSelect
                  size="small"
                  label="Year"
                  value={filterYear}
                  onChange={(event) => setFilterYear(Number(event.target.value))}
                  options={yearOptions}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }} sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: { xs: 0, md: 2.2 } }}>
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setFilters({ month: filterMonth, year: filterYear });
                    toast.success("Filters applied");
                  }}
                  sx={{
                    height: 34,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
                  }}
                >
                  Filter
                </AppButton>
                <AppButton
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const defaultMonth = dayjs().month() + 1;
                    const defaultYear = dayjs().year();
                    setFilterMonth(defaultMonth);
                    setFilterYear(defaultYear);
                    setFilters({ month: defaultMonth, year: defaultYear });
                    toast.success("Filters cleared");
                  }}
                  sx={{
                    color: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    height: 34,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
                    "&:hover": {
                      borderColor: "#ef4444",
                      bgcolor: "rgba(239, 68, 68, 0.05)"
                    }
                  }}
                >
                  Clear Filter
                </AppButton>
              </Grid>
              <Grid size={{ xs: 12, md: 4.5 }}>
                 <Stack direction="column" justifyContent="center" sx={{ height: "100%", ml: { md: 2 } }}>
                   <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "0.02em", mb: 0.5, fontSize: "0.95rem" }}>
                    Current Month's Event Status
                   </Typography>
                   <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                      {Object.entries(
                        events.reduce((acc, curr) => {
                          acc[curr.eventTypeName] = (acc[curr.eventTypeName] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([type, count]) => {
                        const palette = getEventColor(type);
                        return (
                          <Box key={type} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: palette.main }} />
                            <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ fontSize: "0.9rem" }}>
                              {count} {type}{count > 1 ? "s" : ""}
                            </Typography>
                          </Box>
                        );
                      })}
                      {events.length === 0 && (
                        <Typography variant="body2" fontWeight={800} color="text.secondary">No active scheduled events</Typography>
                      )}
                   </Box>
                 </Stack>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ p: 2 }}>
            {filters.month === 0 ? (
              <Stack spacing={2} sx={{ maxH: 600, overflowY: "auto", p: 1 }}>
                {events.map((eventItem) => {
                  const palette = getEventColor(eventItem.eventTypeName);
                  return (
                    <Paper
                      key={eventItem.eventId}
                      onClick={() => handleEventClick(eventItem)}
                      sx={{
                        p: 2,
                        borderLeft: `5px solid ${palette.main}`,
                        bgcolor: theme.palette.background.paper,
                        cursor: "pointer",
                        "&:hover": { bgcolor: theme.palette.action.hover },
                        borderRadius: 1.5,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800}>{eventItem.eventName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatViewDate(eventItem.eventDate)} | {eventItem.eventTypeName}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                          ₹{Number(eventItem.totalExpectedAmount).toLocaleString()}
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
                {events.length === 0 && (
                  <Typography variant="body2" sx={{ textAlign: "center", py: 4 }} color="text.secondary">
                    No active scheduled events
                  </Typography>
                )}
              </Stack>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: "repeat(7, 1fr)",
                }}
              >
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
                  <Typography key={d} variant="caption" fontWeight={900} sx={{ textAlign: "center", mb: 0.5, opacity: 0.4, letterSpacing: "0.1em", fontSize: "0.65rem" }}>{d}</Typography>
                ))}

                {calendarDays.map((day) => {
                  const dayItems = getDayItems(day);
                  const isDifferentMonth = day.month() + 1 !== filters.month;

                  return (
                    <Paper 
                      key={day.toString()} 
                      elevation={0}
                      onClick={() => handleDateClick(day)}
                      sx={{ 
                        p: 1,
                        minHeight: 80,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
                        opacity: isDifferentMonth ? 0.3 : 1,
                        bgcolor: day.isSame(dayjs(), "day")
                          ? (theme.palette.mode === "dark" ? "rgba(141,150,184,0.12)" : "rgba(74,63,107,0.06)")
                          : theme.palette.background.paper,
                        cursor: hasWriteAccess ? "pointer" : "default",
                        transition: "all 0.15s ease",
                        "&:hover": hasWriteAccess ? { 
                          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                          transform: "translateY(-1px)",
                          boxShadow: theme.palette.mode === "dark" ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 4px -1px rgba(0,0,0,0.05)"
                        } : {}
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={day.isSame(dayjs(), "day") ? 900 : 700} 
                          sx={{ 
                            fontSize: "0.85rem",
                            color: day.isSame(dayjs(), "day")
                              ? (theme.palette.mode === "dark" ? "#d6dbef" : "#4a3f6b")
                              : "text.secondary"
                          }}
                        >
                          {day.format("DD")}
                        </Typography>
                        {day.isSame(dayjs(), "day") && (
                          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "primary.main" }} />
                        )}
                      </Box>
                      
                      <Stack spacing={0.4}>
                        {dayItems.map((item) => {
                          const palette = getEventColor(item.colorType);
                          return (
                            <Tooltip
                              key={item.key}
                              title={item.subtitle || item.title}
                              arrow
                              placement="top"
                            >
                              <Box
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(item.eventItem);
                                }}
                                sx={{
                                  px: 0.8,
                                  py: 0.4,
                                  borderRadius: 0.8,
                                  bgcolor: palette.main,
                                  color: theme.palette.getContrastText(palette.main),
                                  lineHeight: 1,
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                  transition: "transform 0.1s ease",
                                  "&:hover": {
                                    transform: "scale(1.03)"
                                  }
                                }}
                              >
                                <Typography sx={{ fontSize: "0.55rem", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {item.title}
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
            )}
          </Box>
        </CardContent>
      </Card>

      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent}
        eventTypes={eventTypes}
        members={members}
        onSaveSuccess={loadCalendarData}
      />

      <EventDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        event={selectedEvent}
        members={members}
      />
    </div>
  );
}
