import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, FilterList as FilterListIcon } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import { useAppToast } from "../../components/common/AppToast";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { GetEventsAsync, DeleteEventAsync } from "../../services/eventService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import { GetMembersAsync } from "../../services/memberService";
import AppDataTable from "../../components/common/AppDataTable";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

export default function EventsPage() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filters, setFilters] = useState({ month: filterMonth, year: filterYear });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;
  const navigate = useNavigate();
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  async function loadData() {
    const [events, types, members] = await Promise.all([
      GetEventsAsync(filters),
      GetEventTypesAsync(),
      GetMembersAsync(),
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
        await DeleteEventAsync(eventToDelete.eventId);
        toast.success(TOAST_MESSAGES.EVENTS.DELETED_SUCCESS || TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
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
                  onClick={() => navigate(`/events/edit/${row.eventId}`)}
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
    { label: "Event Date", key: "eventDate", render: (row) => formatGridDate(row.eventDate) },

    {
      label: "Valuation",
      key: "totalExpectedAmount",
      align: "right",
      render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.totalExpectedAmount}</Typography>
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Events Details"
        columns={columns}
        data={events}
        actions={
          hasWriteAccess && (
            <AppButton
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/events/add")}
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
                  onChange={(event) => {
                    setFilterMonth(Number(event.target.value));
                  }}
                  options={monthOptions}
                  placeholder="Select Month"
                  required
                />
              </Box>
              <Box sx={{ minWidth: 120 }}>
                <AppSelect
                  label="Year"
                  value={filterYear}
                  onChange={(event) => {
                    setFilterYear(Number(event.target.value));
                  }}
                  options={yearOptions}
                  placeholder="Select Year"
                  required
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setFilters({ month: filterMonth, year: filterYear });
                }}
                sx={{
                  height: 34,
                  mt: 2.2,
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
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
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


      <EventDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        event={selectedEvent}
        members={members}
      />

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />
    </div>
  );
}
