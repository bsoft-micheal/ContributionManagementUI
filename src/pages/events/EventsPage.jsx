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
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const getEventCategories = (row) => {
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

  const name = String(row.eventName || "").toLowerCase();
  if (name.includes("birthday")) set.add("Birthday");
  if (name.includes("farewell")) set.add("Farewell");
  if (name.includes("outing") || name.includes("team outing")) set.add("Team Outing");

  const list = Array.from(set);
  return list.length > 0 ? list : ["General"];
};

const getCategoryChipConfig = (catName) => {
  const norm = String(catName || "").toLowerCase().trim();
  if (norm.includes("birthday")) {
    return {
      label: "Birthday",
      color: "#7c3aed",
      bgcolor: "rgba(124, 58, 237, 0.12)",
      borderColor: "rgba(124, 58, 237, 0.3)",
    };
  }
  if (norm.includes("farewell")) {
    return {
      label: "Farewell",
      color: "#0284c7",
      bgcolor: "rgba(2, 132, 199, 0.12)",
      borderColor: "rgba(2, 132, 199, 0.3)",
    };
  }
  if (norm.includes("outing")) {
    return {
      label: "Team Outing",
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
  const [expenseDetailsDialogOpen, setExpenseDetailsDialogOpen] = useState(false);
  const [expenseEvent, setExpenseEvent] = useState(null);
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
        const remainingAmt = expectedAmt - expAmount;

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
      const exp = Number(e.totalExpectedAmount) > 0 ? Number(e.totalExpectedAmount) : Number(e.baseAmount || 0);
      return sum + exp;
    }, 0);
    const totalCollected = (displayedEvents || []).reduce((sum, e) => {
      return sum + Number(e.collectedAmount ?? e.totalPaidAmount ?? 0);
    }, 0);
    const totalPending = (displayedEvents || []).reduce((sum, e) => {
      const exp = Number(e.totalExpectedAmount) > 0 ? Number(e.totalExpectedAmount) : Number(e.baseAmount || 0);
      const col = Number(e.collectedAmount ?? e.totalPaidAmount ?? 0);
      const pen = Number(e.pendingAmount !== undefined ? e.pendingAmount : (exp - col));
      return sum + pen;
    }, 0);
    const totalExpenses = (displayedEvents || []).reduce((sum, e) => {
      return sum + Number(e.expenseAmount || 0);
    }, 0);
    const totalBalance = totalExpected - totalExpenses;

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
      sx: { width: 215, minWidth: 215 },
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
          {canDeleteEvent && Number(row.totalPaidAmount || row.paidAmount || 0) === 0 && (
            <Tooltip title="Delete Event">
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon sx={{ fontSize: "1.1rem", color: actionIconColor }} />
              </IconButton>
            </Tooltip>
          )}
          {canAddPhotos && (
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
          )}
          {canViewPhotos && (
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
          )}
          {canAddExpense && (
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
          )}
          {canViewExpense && (
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
          )}
        </Box>
      )
    },
    {
      label: "Event Name", key: "eventName", render: (row) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "primary.main" }}>{row.eventName}</Typography>
      )
    },
    {
      label: "Event Type/Event Date",
      key: "eventTypeName",
      render: (row) => {
        let dateDisplay = "";
        if (!row.eventDates) {
          dateDisplay = formatGridDate(row.eventDate);
        } else {
          const rawList = String(row.eventDates)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const countsMap = new Map();
          rawList.forEach((d) => {
            countsMap.set(d, (countsMap.get(d) || 0) + 1);
          });

          const formattedParts = Array.from(countsMap.entries()).map(([dateStr, count]) =>
            count > 1 ? `${dateStr} (${count})` : dateStr
          );
          dateDisplay = formattedParts.join(", ");
        }

        const categories = getEventCategories(row);

        return (
          <Box sx={{ py: 0.2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.4 }}>
              {categories.map((cat, idx) => {
                const cfg = getCategoryChipConfig(cat);
                return (
                  <Chip
                    key={idx}
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
                    }}
                  />
                );
              })}
            </Box>
            {dateDisplay && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
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
      },
    },

    {
      label: "Expected Collection",
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
        data={displayedEvents}
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
              <Box sx={{ width: { xs: "100%", sm: 100 } }}>
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
              <Box sx={{ width: { xs: "100%", sm: 130 } }}>
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
              <Box sx={{ width: { xs: "100%", sm: 155 } }}>
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
              <Box sx={{ width: { xs: "100%", sm: 175 } }}>
                <AppSelect
                  label="Event"
                  value={filterEvent}
                  onChange={(event) => {
                    setFilterEvent(event.target.value);
                  }}
                  options={eventOptions}
                  placeholder="Select Event"
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
                    bgcolor: "#6366f1 !important",
                    "&:hover": { bgcolor: "#4f46e5 !important" },
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
                  lg: isMember ? "repeat(4, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
                },
                gap: 1.5,
                pt: 0.5,
              }}
            >
              <MetricCard
                label="TOTAL EXPECTED"
                value={`₹${summaryTotals.totalExpected.toLocaleString("en-IN")}`}
                helper="Filtered events target"
                accent="#6366f1"
              />
              {!isMember && (
                <MetricCard
                  label="TOTAL COLLECTIONS"
                  value={`₹${summaryTotals.totalCollected.toLocaleString("en-IN")}`}
                  helper="Amount collected"
                  accent="#10b981"
                />
              )}
              <MetricCard
                label="TOTAL PENDING"
                value={`₹${summaryTotals.totalPending.toLocaleString("en-IN")}`}
                helper="Outstanding dues"
                accent="#f43f5e"
              />
              <MetricCard
                label="TOTAL EXPENSES"
                value={`₹${summaryTotals.totalExpenses.toLocaleString("en-IN")}`}
                helper="Recorded expenses"
                accent="#f59e0b"
              />
              <MetricCard
                label="BALANCE AMOUNT"
                value={`₹${summaryTotals.totalBalance.toLocaleString("en-IN")}`}
                helper={summaryTotals.totalBalance >= 0 ? "Budget Surplus" : "Budget Deficit"}
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
          loadData();
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
