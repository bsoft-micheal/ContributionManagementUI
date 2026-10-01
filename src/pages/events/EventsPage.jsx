import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  PhotoLibrary as PhotoLibraryIcon,
  PostAdd as PostAddIcon,
  ReceiptLong as ReceiptLongIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import { useAppToast } from "../../components/common/AppToast";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";
import { getEventsAsync, deleteEventAsync, sendRemindersForEventAsync } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import AppDataTable from "../../components/common/AppDataTable";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";
import EventPhotoDetailsDialog from "../../components/events/EventPhotoDetailsDialog";
import EventExpensesDialog from "../../components/events/EventExpensesDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

export default function EventsPage() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filters, setFilters] = useState({ month: filterMonth, year: filterYear });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [photoDetailsDialogOpen, setPhotoDetailsDialogOpen] = useState(false);
  const [photoEvent, setPhotoEvent] = useState(null);
  const [expenseDetailsDialogOpen, setExpenseDetailsDialogOpen] = useState(false);
  const [expenseEvent, setExpenseEvent] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  // Granular Action Permissions
  const canAddEvent = hasActionPermission("Add Event", 32, authState?.role).canExecute && hasWriteAccess;
  const canEditEvent = hasActionPermission("Edit Event", 33, authState?.role).canExecute && hasWriteAccess;
  const canDeleteEvent = hasActionPermission("Delete Event", 34, authState?.role).canExecute && hasWriteAccess;
  const canViewEvent = hasActionPermission("View Event", 31, authState?.role).canView;

  const navigate = useNavigate();
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  async function loadData() {
    try {
      const [eventsData, types, membersData, usersData] = await Promise.all([
        getEventsAsync(filters),
        getEventTypesAsync(),
        getMembersAsync(),
        getUsersAsync().catch(() => []),
      ]);
      const combinedMembers = Array.isArray(membersData) ? [...membersData] : [];
      const existingIds = new Set(
        combinedMembers.map((m) => String(m.memberId || m.id || m.userId).toLowerCase()).filter(Boolean)
      );
      const existingNames = new Set(
        combinedMembers.map((m) => (m.name || m.fullName || "").toLowerCase().trim()).filter(Boolean)
      );

      if (Array.isArray(usersData)) {
        usersData.forEach((u) => {
          const uid = String(u.userId || u.id || "").toLowerCase();
          const uname = (u.fullName || u.name || "").toLowerCase().trim();
          if (uid && !existingIds.has(uid) && (!uname || !existingNames.has(uname))) {
            existingIds.add(uid);
            combinedMembers.push({
              memberId: u.userId || u.id,
              id: u.userId || u.id,
              name: u.fullName || u.name,
              fullName: u.fullName || u.name,
              email: u.email,
              phone: u.phone,
              workType: u.workType || "Office",
              dateOfBirth: u.dateOfBirth,
              joiningDate: u.joiningDate,
              gender: u.gender,
              isActive: u.isActive !== false,
              isExited: Boolean(u.isExited),
              roleName: u.roleName || "Member",
            });
          }
        });
      }

      setEventTypes(types || []);
      setMembers(combinedMembers);
      setUsers(usersData || []);

      const userMap = {};
      (usersData || []).forEach((u) => {
        const id = String(u.userId || u.id || "").toLowerCase();
        const name = u.fullName || u.name || u.username;
        if (id && name) userMap[id] = name;
      });

      const isGuid = (val) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          String(val || "").trim()
        );

      const mappedEvents = (eventsData || []).map((e) => {
        let name = e.createdByName;
        const rawCreatedBy = String(e.createdBy || e.CreatedBy || "").toLowerCase();
        const rawCreatedByName = String(e.createdByName || "").toLowerCase();

        if (!name || isGuid(name)) {
          if (userMap[rawCreatedByName]) {
            name = userMap[rawCreatedByName];
          } else if (userMap[rawCreatedBy]) {
            name = userMap[rawCreatedBy];
          } else if (authState?.user?.userId && (rawCreatedBy === String(authState.user.userId).toLowerCase() || rawCreatedByName === String(authState.user.userId).toLowerCase())) {
            name = authState.user.fullName || authState.user.name || authState.user.username;
          }
        }

        const resolvedDisplay = name && !isGuid(name)
          ? name
          : userMap[rawCreatedBy] || (e.createdBy && !isGuid(e.createdBy) ? e.createdBy : "--");

        return {
          ...e,
          createdByName: resolvedDisplay,
          createdBy: resolvedDisplay,
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load events data");
    }
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
        await deleteEventAsync(eventToDelete.eventId);
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

  const handleSendEventReminders = async (eventItem) => {
    try {
      await sendRemindersForEventAsync(eventItem.eventId);
      toast.success(`Reminder emails enqueued for '${eventItem.eventName}' via Hangfire!`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to trigger reminder emails.");
    }
  };

  const columns = [
    {
      label: "Action",
      sx: { width: 265, minWidth: 265 },
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.4, alignItems: "center" }}>
          {canViewEvent && (
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
          )}
          {canEditEvent && (
            <Tooltip title="Edit Event">
              <IconButton size="small" sx={{ p: 0.3 }}
                onClick={() => navigate(`/events/edit/${row.eventId}`)}
              >
                <EditIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
              </IconButton>
            </Tooltip>
          )}
          {canDeleteEvent && (
            <Tooltip title="Delete Event">
              <IconButton size="small" sx={{ p: 0.3 }}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Send Reminders (Hangfire)">
            <IconButton size="small" sx={{ p: 0.3 }}
              onClick={() => handleSendEventReminders(row)}
            >
              <NotificationsActiveIcon sx={{ fontSize: "1.1rem", color: "#f59e0b" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Photos">
            <IconButton size="small" sx={{ p: 0.3 }}
              onClick={() =>
                navigate("/gallery", {
                  state: {
                    openAddPhoto: true,
                    eventName: row.eventName,
                    category: row.eventTypeName,
                    eventDate: row.eventDate,
                    eventId: row.eventId,
                  },
                })
              }
            >
              <AddPhotoAlternateIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Photos">
            <IconButton size="small" sx={{ p: 0.3 }}
              onClick={() => {
                setPhotoEvent(row);
                setPhotoDetailsDialogOpen(true);
              }}
            >
              <PhotoLibraryIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Expense">
            <IconButton size="small" sx={{ p: 0.3 }}
              onClick={() =>
                navigate("/expense", {
                  state: {
                    openAddExpense: true,
                    eventName: row.eventName,
                    category: row.eventTypeName,
                    eventDate: row.eventDate,
                    eventId: row.eventId,
                  },
                })
              }
            >
              <PostAddIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Expense">
            <IconButton size="small" sx={{ p: 0.3 }}
              onClick={() => {
                setExpenseEvent(row);
                setExpenseDetailsDialogOpen(true);
              }}
            >
              <ReceiptLongIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
    {
      label: "Event Name", key: "eventName", render: (row) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "primary.main" }}>{row.eventName}</Typography>
      )
    },
    { label: "Category", key: "eventTypeName", render: (row) => <Typography variant="body2">{row.eventTypeName}</Typography> },
    {
      label: "Event Date",
      key: "eventDate",
      render: (row) => (
        <Typography variant="body2" sx={{ maxWidth: 220, whiteSpace: "normal", wordBreak: "break-word" }}>
          {row.eventDates || formatGridDate(row.eventDate)}
        </Typography>
      ),
    },

    {
      label: "Valuation",
      key: "totalExpectedAmount",
      align: "right",
      render: (row) => {
        const val = Number(row.totalExpectedAmount) > 0
          ? Number(row.totalExpectedAmount)
          : Number(row.baseAmount || 0);
        return <Typography variant="body2" fontWeight={700}>₹{val.toLocaleString("en-IN")}</Typography>;
      }
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
          canAddEvent && (
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
                  <Typography variant="body2" fontWeight={800} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "primary.main" }} display="block">₹{events.reduce((sum, e) => sum + (Number(e.totalExpectedAmount) > 0 ? Number(e.totalExpectedAmount) : (Number(e.baseAmount) || 0)), 0).toLocaleString("en-IN")}</Typography>
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

      <EventPhotoDetailsDialog
        open={photoDetailsDialogOpen}
        onClose={() => {
          setPhotoDetailsDialogOpen(false);
          setPhotoEvent(null);
        }}
        event={photoEvent}
        onAddPhotosClick={(ev) => {
          navigate("/gallery", {
            state: {
              openAddPhoto: true,
              eventName: ev.eventName,
              category: ev.eventTypeName,
              eventDate: ev.eventDate,
              eventId: ev.eventId,
            },
          });
        }}
      />

      <EventExpensesDialog
        open={expenseDetailsDialogOpen}
        onClose={() => {
          setExpenseDetailsDialogOpen(false);
          setExpenseEvent(null);
        }}
        event={expenseEvent}
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
