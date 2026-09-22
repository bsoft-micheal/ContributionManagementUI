import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useAppToast } from "../../components/common/AppToast";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import { GetEvents, DeleteEvent } from "../../services/eventService";
import { GetEventTypes } from "../../services/eventTypeService";
import { GetMembers } from "../../services/memberService";
import AppDataTable from "../../components/common/AppDataTable";
import EventFormDialog from "../../components/events/EventFormDialog";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";

export default function EventsPage() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filters, setFilters] = useState({ month: filterMonth, year: filterYear });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const { authState } = useAuth();
  const rights = getRightsForPage("Events", authState?.role);
  const hasWriteAccess = rights.write;
  const navigate = useNavigate();
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  async function loadData() {
    const [events, types, members] = await Promise.all([
      GetEvents(filters),
      GetEventTypes(),
      GetMembers(),
    ]);
    setEvents(events);
    setEventTypes(types);
    setMembers(members);
  }

  useEffect(() => {
    loadData();
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

  const handleDeleteRequest = (eventItem) => {
    setEventToDelete(eventItem);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete) {
      try {
        await DeleteEvent(eventToDelete.eventId);
        toast.success("Event deleted successfully");
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete event");
      } finally {
        setDeleteConfirmOpen(false);
        setEventToDelete(null);
      }
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title="View Details">
            <IconButton size="small" sx={{ p: 0.3 }}
              onClick={() => {
                setSelectedEvent(row);
                setViewDialogOpen(true);
              }}
            >
              <ViewIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
            </IconButton>
          </Tooltip>
          {hasWriteAccess && (
            <>
              <Tooltip title="Edit Event">
                <IconButton size="small" sx={{ p: 0.3 }}
                  onClick={() => {
                    setSelectedEvent(row);
                    setDialogOpen(true);
                  }}
                >
                  <EditIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Event">
                <IconButton size="small" sx={{ p: 0.3 }}
                  onClick={() => handleDeleteRequest(row)}
                >
                  <DeleteIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    },
    {
      label: "Event Name", key: "eventName", render: (row) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "primary.main" }}>{row.eventName}</Typography>
      )
    },
    { label: "Category", key: "eventTypeName", render: (row) => <Typography variant="body2">{row.eventTypeName}</Typography> },
    { label: "Event Date", key: "eventDate", render: (row) => dayjs(row.eventDate).format("DD/MM/YYYY") },

    {
      label: "Valuation",
      key: "totalExpectedAmount",
      align: "right",
      render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.totalExpectedAmount}</Typography>
    }
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Manage Events"
        columns={columns}
        data={events}
        actions={
          hasWriteAccess && (
            <AppButton
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setSelectedEvent(null); setDialogOpen(true); }}
            >
              Add
            </AppButton>
          )
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 150 }}>
                <AppSelect
                  label="Month"
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(Number(event.target.value))}
                  options={monthOptions}
                />
              </Box>
              <Box sx={{ minWidth: 120 }}>
                <AppSelect
                  label="Year"
                  value={filterYear}
                  onChange={(event) => setFilterYear(Number(event.target.value))}
                  options={yearOptions}
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                onClick={() => {
                  setFilters({ month: filterMonth, year: filterYear });

                }}
                sx={{
                  bgcolor: "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: "#3b325c !important" }
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
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)"
                  }
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: "0.65rem" }}>Expected Amount</Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "primary.main" }} display="block">₹{events.reduce((sum, e) => sum + e.totalExpectedAmount, 0)}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        }
      />

      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent}
        eventTypes={eventTypes}
        members={members}
        onSaveSuccess={loadData}
      />

      <EventDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        event={selectedEvent}
      />

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm"
        content="Are you sure you want to delete this record?"
      />
    </div>
  );
}
