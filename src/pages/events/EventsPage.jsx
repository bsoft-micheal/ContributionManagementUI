import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Chip,
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
  ReceiptLong as ReceiptLongIcon,
  PostAdd as AddExpenseIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import { useAppToast } from "../../components/common/AppToast";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { MENU_FEATURE_IDS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";
import { getEventsAsync, deleteEventAsync, sendRemindersForEventAsync } from "../../services/eventService";
import { getExpensesAsync } from "../../services/expenseService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import AppDataTable from "../../components/common/AppDataTable";
import MetricCard from "../../components/MetricCard";
import EventDetailsDialog from "../../components/events/EventDetailsDialog";
import EventPhotoDetailsDialog from "../../components/events/EventPhotoDetailsDialog";
import EventExpensesDialog from "../../components/events/EventExpensesDialog";
import EventAddExpenseDialog from "../../components/events/EventAddExpenseDialog";
import EventAddPhotoDialog from "../../components/events/EventAddPhotoDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const getEventCategories = (row, allEventTypes = []) => {
  const set = new Set();

  const primaryType = row.eventTypeName || row.category || row.categoryName || row.eventType;
  if (primaryType) {
    String(primaryType)
      .split(/[,&/]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((cat) => set.add(cat));
  }

  if (Array.isArray(row.eventTypeNames)) {
    row.eventTypeNames.forEach((t) => t && set.add(String(t).trim()));
  }
  if (Array.isArray(row.categories)) {
    row.categories.forEach((c) => c && set.add(String(c).trim()));
  }

  // If multiple events were created, match event types against allEventTypes using eventName
  if (Array.isArray(allEventTypes) && allEventTypes.length > 0 && row.eventName) {
    const eventNameLower = String(row.eventName).toLowerCase();
    allEventTypes.forEach((typeObj) => {
      const typeName = (typeObj.eventTypeName || typeObj.name || "").trim();
      if (!typeName) return;
      const typeNameLower = typeName.toLowerCase();
      if (eventNameLower.includes(typeNameLower)) {
        set.add(typeName);
      }
    });
  }

  // Fallback only if no explicit event type was provided
  if (set.size === 0) {
    const name = String(row.eventName || "").toLowerCase();
    if (name.includes("birthday")) set.add("Birthday");
    if (name.includes("farewell")) set.add("Farewell");
    if (name.includes("christmas outing")) set.add("Christmas Outing");
    else if (name.includes("outing")) set.add("Outing");
    if (set.size === 0) set.add("General");
  }

  return Array.from(set);
};

const getCategoryChipConfig = (catName) => {
  const norm = String(catName || "").toLowerCase().trim();
  if (norm.includes("birthday")) {
    return {
      label: catName,
      color: "#7c3aed",
      bgcolor: "rgba(124, 58, 237, 0.12)",
      borderColor: "rgba(124, 58, 237, 0.3)",
    };
  }
  if (norm.includes("farewell")) {
    return {
      label: catName,
      color: "#0284c7",
      bgcolor: "rgba(2, 132, 199, 0.12)",
      borderColor: "rgba(2, 132, 199, 0.3)",
    };
  }
  if (norm.includes("outing")) {
    return {
      label: catName,
      color: "#059669",
      bgcolor: "rgba(5, 150, 105, 0.12)",
      borderColor: "rgba(5, 150, 105, 0.3)",
    };
  }
  return {
    label: catName,
    color: "#4a3f6b",
    bgcolor: "rgba(74, 63, 107, 0.12)",
    borderColor: "rgba(74, 63, 107, 0.3)",
  };
};

export default function EventsPage() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filters, setFilters] = useState({
    year: dayjs().year(),
    month: dayjs().month() + 1,
    eventType: "ALL",
    event: "ALL",
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [photoDetailsDialogOpen, setPhotoDetailsDialogOpen] = useState(false);
  const [photoEvent, setPhotoEvent] = useState(null);
  const [addPhotoDialogOpen, setAddPhotoDialogOpen] = useState(false);
  const [addPhotoEvent, setAddPhotoEvent] = useState(null);
  const [expenseDetailsDialogOpen, setExpenseDetailsDialogOpen] = useState(false);
  const [expenseEvent, setExpenseEvent] = useState(null);
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [addExpenseEvent, setAddExpenseEvent] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const activeRole = authState?.role || authState?.roleName;
  const isMember = String(activeRole || "").toLowerCase() === "member";

  // Granular Action Permissions
  const canAddEvent = hasActionPermission("Add Event", MENU_FEATURE_IDS.EVENT_ADD, activeRole).canExecute;
  const canEditEvent = hasActionPermission("Edit Event", MENU_FEATURE_IDS.EVENT_EDIT, activeRole).canExecute;
  const canDeleteEvent = hasActionPermission("Delete Event", MENU_FEATURE_IDS.EVENT_DELETE, activeRole).canExecute;
  const canViewEvent = hasActionPermission("View Event", MENU_FEATURE_IDS.EVENT_VIEW, activeRole).canView;

  const canAddPhotos = hasActionPermission("Add Photos", MENU_FEATURE_IDS.EVENT_ADD_PHOTOS, activeRole).canExecute;
  const canViewPhotos = hasActionPermission("view Photos", MENU_FEATURE_IDS.EVENT_VIEW_PHOTOS, activeRole).canView;
  const canAddExpense = hasActionPermission("Add Expense", MENU_FEATURE_IDS.EVENT_ADD_EXPENSE, activeRole).canExecute;
  const canViewExpense = hasActionPermission("view Expense", MENU_FEATURE_IDS.EVENT_VIEW_EXPENSE, activeRole).canView;

  const navigate = useNavigate();
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  async function loadData(targetFilters) {
    const activeFilters = targetFilters || filters;
    try {
      const [eventsData, types, membersData, usersData, expensesData] = await Promise.all([
        getEventsAsync({ month: activeFilters.month, year: activeFilters.year }),
        getEventTypesAsync(),
        getMembersAsync(),
        getUsersAsync().catch(() => []),
        getExpensesAsync().catch(() => []),
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

        const matchedExpenses = (expensesData || []).filter((exp) =>
          String(exp.eventName || "").trim().toLowerCase() === String(e.eventName || "").trim().toLowerCase()
        );
        const eventExpenseTotal = matchedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

        const expAmount = Number(e.expenseAmount) > 0 ? Number(e.expenseAmount) : eventExpenseTotal;
        const expectedAmt = Number(e.totalExpectedAmount) > 0 ? Number(e.totalExpectedAmount) : Number(e.baseAmount || 0);
        const paidAmt = Number(e.collectedAmount ?? e.totalPaidAmount ?? 0);
        const pendingAmt = Number(e.pendingAmount !== undefined ? e.pendingAmount : (expectedAmt - paidAmt));
        const remainingAmt = paidAmt - expAmount;

        return {
          ...e,
          expenseAmount: expAmount,
          remainingAmount: remainingAmt,
          pendingAmount: pendingAmt,
          totalPaidAmount: paidAmt,
          collectedAmount: paidAmt,
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
  }, [filters.year, filters.month]);

  const currentYear = dayjs().year();
  const yearOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 11 }, (_, i) => {
      const y = currentYear - 5 + i;
      return { label: String(y), value: y };
    }),
  ];

  const monthOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    })),
  ];

  const eventTypeOptions = useMemo(() => {
    const list = [{ label: "All Event Types", value: "ALL" }];
    const seen = new Set();
    (eventTypes || []).forEach((t) => {
      const name = t.eventTypeName || t.typeName || t.name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });
    (events || []).forEach((e) => {
      const cat = e.eventTypeName || e.category;
      if (cat && !seen.has(cat.toLowerCase())) {
        seen.add(cat.toLowerCase());
        list.push({ label: cat, value: cat });
      }
    });
    return list;
  }, [eventTypes, events]);

  const eventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const seen = new Set();
    (events || []).forEach((e) => {
      const name = e.eventName || e.name;
      if (!name || seen.has(name.toLowerCase())) return;
      const cat = (e.eventTypeName || e.category || "").toLowerCase();
      if (filterEventType !== "ALL" && cat !== filterEventType.toLowerCase()) {
        return;
      }
      seen.add(name.toLowerCase());
      list.push({ label: name, value: name });
    });
    return list;
  }, [events, filterEventType]);

  const handleEventTypeChange = (newType) => {
    setFilterEventType(newType);
    if (newType !== "ALL" && filterEvent !== "ALL") {
      const isStillValid = (events || []).some((e) => {
        const name = e.eventName || e.name;
        const cat = (e.eventTypeName || e.category || "").toLowerCase();
        return name?.toLowerCase() === filterEvent.toLowerCase() && cat === newType.toLowerCase();
      });
      if (!isStillValid) {
        setFilterEvent("ALL");
      }
    }
  };

  const handleApplyFilter = () => {
    const nextFilters = {
      year: filterYear,
      month: filterMonth,
      eventType: filterEventType,
      event: filterEvent,
    };
    setFilters(nextFilters);
    loadData(nextFilters);
  };

  const handleClearFilter = () => {
    const defaultMonth = dayjs().month() + 1;
    const defaultYear = dayjs().year();
    setFilterYear(defaultYear);
    setFilterMonth(defaultMonth);
    setFilterEventType("ALL");
    setFilterEvent("ALL");
    const resetFilters = {
      year: defaultYear,
      month: defaultMonth,
      eventType: "ALL",
      event: "ALL",
    };
    setFilters(resetFilters);
    loadData(resetFilters);
  };

  const displayedEvents = useMemo(() => {
    return (events || []).filter((e) => {
      if (filters.eventType && filters.eventType !== "ALL") {
        const cat = (e.eventTypeName || e.category || "").trim().toLowerCase();
        if (cat !== filters.eventType.trim().toLowerCase()) return false;
      }
      if (filters.event && filters.event !== "ALL") {
        const name = (e.eventName || e.name || "").trim().toLowerCase();
        if (name !== filters.event.trim().toLowerCase()) return false;
      }
      return true;
    });
  }, [events, filters]);

  const summaryTotals = useMemo(() => {
    const totalExpected = (displayedEvents || []).reduce((sum, e) => {
      const exp = Math.max(Number(e.baseAmount || 0), Number(e.totalExpectedAmount || 0));
      return sum + Math.round(exp);
    }, 0);
    const totalCollected = (displayedEvents || []).reduce((sum, e) => {
      return sum + Math.round(Number(e.collectedAmount ?? e.totalPaidAmount ?? 0));
    }, 0);
    const totalPending = (displayedEvents || []).reduce((sum, e) => {
      const exp = Math.max(Number(e.baseAmount || 0), Number(e.totalExpectedAmount || 0));
      const col = Number(e.collectedAmount ?? e.totalPaidAmount ?? 0);
      const pen = Number(e.pendingAmount !== undefined ? e.pendingAmount : (exp - col));
      return sum + Math.round(pen);
    }, 0);
    const totalExpenses = (displayedEvents || []).reduce((sum, e) => {
      return sum + Math.round(Number(e.expenseAmount || 0));
    }, 0);
    const totalBalance = totalCollected - totalExpenses;

    return {
      totalExpected,
      totalCollected,
      totalPending,
      totalExpenses,
      totalBalance,
    };
  }, [displayedEvents]);

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
      sx: { width: 245, minWidth: 245 },
      render: (row) => {
        const paidAmount = Number(row.totalPaidAmount || row.collectedAmount || row.paidAmount || 0);
        const hasPaidAmount = paidAmount > 0;
        const isEditable = canEditEvent && !hasPaidAmount;
        const isDeletable = canDeleteEvent && !hasPaidAmount;
        return (
          <Box sx={{ display: "flex", gap: 0.4, alignItems: "center" }}>
            <Tooltip title={canViewEvent ? "View Details" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewEvent ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canViewEvent}
                  onClick={() => {
                    setSelectedEvent(row);
                    setViewDialogOpen(true);
                  }}
                >
                  <ViewIcon sx={{ fontSize: "1.1rem", color: canViewEvent ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                !canEditEvent
                  ? "Disabled"
                  : hasPaidAmount
                  ? "Cannot edit event after payments have been received"
                  : "Edit Event"
              }
            >
              <span style={{ display: "inline-flex", cursor: !isEditable ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!isEditable}
                  onClick={() => navigate(`/events/edit/${row.eventId}`)}
                >
                  <EditIcon sx={{ fontSize: "1.1rem", color: isEditable ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                !canDeleteEvent
                  ? "Disabled"
                  : hasPaidAmount
                  ? "Cannot delete event after payments have been received"
                  : "Delete Event"
              }
            >
              <span style={{ display: "inline-flex", cursor: !isDeletable ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!isDeletable}
                  onClick={() => handleDeleteRequest(row)}
                >
                  <DeleteIcon sx={{ fontSize: "1.1rem", color: isDeletable ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canAddPhotos ? "Add Photos" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canAddPhotos ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canAddPhotos}
                  onClick={() => {
                    setAddPhotoEvent(row);
                    setAddPhotoDialogOpen(true);
                  }}
                >
                  <AddPhotoAlternateIcon sx={{ fontSize: "1.1rem", color: canAddPhotos ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canViewPhotos ? "View Photos" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewPhotos ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canViewPhotos}
                  onClick={() => {
                    setPhotoEvent(row);
                    setPhotoDetailsDialogOpen(true);
                  }}
                >
                  <PhotoLibraryIcon sx={{ fontSize: "1.1rem", color: canViewPhotos ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canAddExpense ? "Add Expense" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canAddExpense ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canAddExpense}
                  onClick={() => {
                    setAddExpenseEvent(row);
                    setAddExpenseDialogOpen(true);
                  }}
                >
                  <AddExpenseIcon sx={{ fontSize: "1.1rem", color: canAddExpense ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canViewExpense ? "View Expense" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewExpense ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canViewExpense}
                  onClick={() => {
                    setExpenseEvent(row);
                    setExpenseDetailsDialogOpen(true);
                  }}
                >
                  <ReceiptLongIcon sx={{ fontSize: "1.1rem", color: canViewExpense ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (row) => row.eventName || "--",
    },
    {
      label: "Event Type / Event Date",
      key: "eventTypeName",
      render: (row) => {
        const categories = getEventCategories(row, eventTypes);

        return (
          <Box sx={{ py: 0.3, display: "flex", flexDirection: "column", gap: 0.8 }}>
            {categories.map((cat, idx) => {
              const cfg = getCategoryChipConfig(cat);
              const isBirthdayCat = String(cat || "").toLowerCase().includes("birthday");

              let dateDisplay = "";
              if (isBirthdayCat && row.eventDates) {
                const rawList = String(row.eventDates)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);

                const countsMap = new Map();
                rawList.forEach((d) => {
                  const match = d.match(/^(.*?)(?:\s*\((\d+)\))?$/);
                  const datePart = match && match[1] ? match[1].trim() : d;
                  const count = match && match[2] ? Number(match[2]) : 1;
                  countsMap.set(datePart, (countsMap.get(datePart) || 0) + count);
                });

                const formattedParts = Array.from(countsMap.entries()).map(([dateStr, count]) =>
                  count > 1 ? `${dateStr} (${count})` : dateStr
                );
                dateDisplay = formattedParts.join(", ");
              } else {
                dateDisplay = formatGridDate(row.eventDate);
              }

              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 0.8,
                  }}
                >
                  <Chip
                    size="small"
                    label={cfg.label}
                    sx={{
                      height: 22,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: cfg.color,
                      bgcolor: cfg.bgcolor,
                      border: `1px solid ${cfg.borderColor}`,
                      "& .MuiChip-label": { px: 0.8 },
                      flexShrink: 0,
                    }}
                  />
                  {dateDisplay && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.75)" : "#475569",
                        display: "block",
                        maxWidth: 220,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        lineHeight: 1.35,
                      }}
                    >
                      {dateDisplay}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        );
      },
    },

    {
      label: "Expected Collection",
      key: "totalExpectedAmount",
      align: "right",
      render: (row) => {
        const val = Math.max(Number(row.baseAmount || 0), Number(row.totalExpectedAmount || 0));
        return `₹${Math.round(val).toLocaleString("en-IN")}`;
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
        data={displayedEvents}
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!canAddEvent}
            startIcon={<AddIcon />}
            onClick={() => navigate("/events/add")}
          >
            Add
          </AppButton>
        }
        filterPanel={
          <Stack spacing={2} sx={{ width: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: 1.2,
                width: "100%",
              }}
            >
              <Box sx={{ width: { xs: "100%", sm: 125, md: 135 } }}>
                <AppSelect
                  label="Year"
                  value={filterYear}
                  onChange={(event) => {
                    setFilterYear(Number(event.target.value));
                  }}
                  options={yearOptions}
                  placeholder="Select Year"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 165, md: 175 } }}>
                <AppSelect
                  label="Month"
                  value={filterMonth}
                  onChange={(event) => {
                    setFilterMonth(Number(event.target.value));
                  }}
                  options={monthOptions}
                  placeholder="Select Month"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 190, md: 210 } }}>
                <AppSelect
                  label="Event Type"
                  value={filterEventType}
                  onChange={(event) => {
                    handleEventTypeChange(event.target.value);
                  }}
                  options={eventTypeOptions}
                  placeholder="Select Event Type"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 190, md: 210 } }}>
                <AppSelect
                  label="Event Name"
                  value={filterEvent}
                  onChange={(event) => {
                    setFilterEvent(event.target.value);
                  }}
                  options={eventOptions}
                  placeholder="Select Event Name"
                />
              </Box>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                  onClick={handleApplyFilter}
                  sx={{
                    height: 36,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 1.8,
                    whiteSpace: "nowrap",
                    bgcolor: "#4a3f6b !important",
                    "&:hover": { bgcolor: "#3b325c !important" },
                  }}
                >
                  Filter
                </AppButton>
                <AppButton
                  variant="outlined"
                  size="small"
                  onClick={handleClearFilter}
                  sx={{
                    color: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    height: 36,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 1.8,
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: "#ef4444",
                      bgcolor: "rgba(239, 68, 68, 0.05)",
                    },
                  }}
                >
                  Clear Filter
                </AppButton>
              </Box>
            </Box>

            {/* 5 Summary KPI Cards Under the Filter */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(5, minmax(0, 1fr))",
                },
                gap: 1.5,
                pt: 0.5,
              }}
            >
              <MetricCard
                label="Total Expected"
                value={`₹${summaryTotals.totalExpected.toLocaleString("en-IN")}`}
                accent="#6366f1"
              />
              <MetricCard
                label="Total Collections"
                value={`₹${summaryTotals.totalCollected.toLocaleString("en-IN")}`}
                accent="#10b981"
              />
              <MetricCard
                label="Total Pending"
                value={`₹${summaryTotals.totalPending.toLocaleString("en-IN")}`}
                accent="#f43f5e"
              />
              <MetricCard
                label="Total Expenses"
                value={`₹${summaryTotals.totalExpenses.toLocaleString("en-IN")}`}
                accent="#f59e0b"
              />
              <MetricCard
                label="Balance Amount"
                value={`₹${summaryTotals.totalBalance.toLocaleString("en-IN")}`}
                accent={summaryTotals.totalBalance >= 0 ? "#06b6d4" : "#f43f5e"}
              />
            </Box>
          </Stack>
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
          setAddPhotoEvent(ev);
          setAddPhotoDialogOpen(true);
        }}
      />

      <EventAddPhotoDialog
        open={addPhotoDialogOpen}
        onClose={() => {
          setAddPhotoDialogOpen(false);
          setAddPhotoEvent(null);
        }}
        event={addPhotoEvent}
        onPhotosSaved={() => loadData()}
      />

      <EventAddExpenseDialog
        open={addExpenseDialogOpen}
        onClose={() => {
          setAddExpenseDialogOpen(false);
          setAddExpenseEvent(null);
        }}
        event={addExpenseEvent}
        onExpenseSaved={() => loadData()}
      />

      <EventExpensesDialog
        open={expenseDetailsDialogOpen}
        onClose={() => {
          setExpenseDetailsDialogOpen(false);
          setExpenseEvent(null);
          loadData();
        }}
        event={expenseEvent}
        onAddExpenseClick={(ev) => {
          setAddExpenseEvent(ev);
          setAddExpenseDialogOpen(true);
        }}
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
