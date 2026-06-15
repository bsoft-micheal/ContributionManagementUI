import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Grid, Stack, Typography, Paper } from "@mui/material";
import dayjs from "dayjs";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import apiClient from "../../services/apiClient";
import { GetMembers } from "../../services/memberService";
import { GetEventTypes } from "../../services/eventTypeService";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import EventFormDialog from "../../components/events/EventFormDialog";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";

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
  const { authState } = useAuth();
  const hasWriteAccess = useMemo(() => {
    return getRightsForPage("Calendar", authState?.role).write;
  }, [authState?.role]);

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
      const { data } = await apiClient.get("/events", { params: filters });
      setEvents(data);
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
          GetEventTypes(),
          GetMembers(),
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
    const startOfMonth = dayjs(`${filters.year}-${String(filters.month).padStart(2, "0")}-01`);
    const startDay = startOfMonth.startOf("week");
    return Array.from({ length: 35 }, (_, index) => startDay.add(index, "day"));
  }, [filters]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ 
    label: dayjs().month(i).format("MMMM"), 
    value: i + 1 
  }));

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

  return (
    <div className="page-shell">
      <Card sx={{ border: "none", boxShadow: "0 2px 8px rgba(74,63,107,0.1)", borderRadius: "6px", overflow: "hidden" }}>
        <Box sx={{
          bgcolor: "#4a3f6b",
          color: "#ffffff",
          px: 2.5,
          py: 1.2,
          minHeight: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#ffffff", fontSize: "0.9rem" }}>
            Event Calendar
          </Typography>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: "#faf9fd", px: 2.5, py: 2, borderBottom: "1px solid rgba(74,63,107,0.1)" }}>
            <Grid container spacing={4} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <AppSelect
                  size="small"
                  label="Month"
                  value={filters.month}
                  onChange={(event) => setFilters((current) => ({ ...current, month: Number(event.target.value) }))}
                  options={monthOptions}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <AppInput
                  size="small"
                  label="Year"
                  type="number"
                  value={filters.year}
                  onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                 <Stack direction="column" justifyContent="center" sx={{ height: "100%", ml: { md: 2 } }}>
                   <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.2 }}>
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
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: palette.main }} />
                            <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ fontSize: "0.8rem" }}>
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
                const dayEvents = events.filter((eventItem) =>
                  dayjs(eventItem.eventDate).format("YYYY-MM-DD") === day.format("YYYY-MM-DD")
                );
                const isDifferentMonth = day.month() + 1 !== filters.month;

                return (
                  <Paper 
                    key={day.toString()} 
                    elevation={0}
                    onClick={() => handleDateClick(day)}
                    sx={{ 
                      p: 1,
                      minHeight: 80,
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 1.5,
                      opacity: isDifferentMonth ? 0.3 : 1,
                      bgcolor: day.isSame(dayjs(), "day") ? "rgba(74,63,107,0.06)" : "white",
                      cursor: hasWriteAccess ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      "&:hover": hasWriteAccess ? { 
                        bgcolor: "#f8fafc",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)"
                      } : {}
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        fontWeight={day.isSame(dayjs(), "day") ? 900 : 700} 
                        sx={{ 
                          fontSize: "0.85rem",
                          color: day.isSame(dayjs(), "day") ? "#4a3f6b" : "text.secondary"
                        }}
                      >
                        {day.format("DD")}
                      </Typography>
                      {day.isSame(dayjs(), "day") && (
                        <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "primary.main" }} />
                      )}
                    </Box>
                    
                    <Stack spacing={0.4}>
                      {dayEvents.map((eventItem) => {
                        const palette = getEventColor(eventItem.eventTypeName);
                        return (
                          <Box
                            key={eventItem.eventId}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening the Add Event modal!
                              handleEventClick(eventItem);
                            }}
                            sx={{
                              px: 0.8,
                              py: 0.4,
                              borderRadius: 0.8,
                              bgcolor: palette.main,
                              color: "#ffffff",
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
                              {eventItem.eventName || eventItem.eventTypeName || eventItem.description || "Scheduled Event"}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
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
      />
    </div>
  );
}
