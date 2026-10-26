import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
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
  CalculateRounded as CalculateRoundedIcon,
  PublishRounded as PublishIcon,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { formatGridDate } from "../../utils/dateHelper";
import { formatWholeCurrency, roundToWhole } from "../../utils/roundingHelper";
import { useAppToast } from "../../components/common/AppToast";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton, { AppAddButton } from "../../components/common/AppButton";
import { MENU_FEATURE_IDS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission, getRightsForFeatureId } from "../../utils/rightsHelper";
import { getEventsAsync, deleteEventAsync, publishEventAsync, sendRemindersForEventAsync } from "../../services/eventService";
import { getExpensesAsync } from "../../services/expenseService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import { getGalleryPhotosAsync } from "../../services/galleryService";
import { extractImages } from "../gallery/GalleryPage";
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
  const [hasAppliedFilter, setHasAppliedFilter] = useState(true);
  const [filterLookupEvents, setFilterLookupEvents] = useState([]);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filters, setFilters] = useState({
    year: dayjs().year(),
    month: dayjs().month() + 1,
    eventType: "ALL",
    event: "ALL",
    status: "ALL",
  });

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
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [eventToPublish, setEventToPublish] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const activeRole = authState?.role || authState?.roleName;

  // Granular Action Permissions evaluated via MENU_FEATURE_IDS and role rights
  const canViewEvent = hasActionPermission("View Event", MENU_FEATURE_IDS.EVENT_VIEW, activeRole).canView;
  const canAddEvent = hasActionPermission("Add Event", MENU_FEATURE_IDS.EVENT_ADD, activeRole).canExecute;
  const canEditEvent = hasActionPermission("Edit Event", MENU_FEATURE_IDS.EVENT_EDIT, activeRole).canExecute;
  const canDeleteEvent = hasActionPermission("Delete Event", MENU_FEATURE_IDS.EVENT_DELETE, activeRole).canExecute;
  const canExportEvent = hasActionPermission("Export Event", MENU_FEATURE_IDS.EVENT_EXPORT, activeRole).canExecute;

  const canAddPhotos = hasActionPermission("Add Photos", MENU_FEATURE_IDS.EVENT_ADD_PHOTOS, activeRole).canExecute;
  const canViewPhotos = hasActionPermission("View Photos", MENU_FEATURE_IDS.EVENT_VIEW_PHOTOS, activeRole).canView;
  const canAddExpense = hasActionPermission("Add Expense", MENU_FEATURE_IDS.EVENT_ADD_EXPENSE, activeRole).canExecute;
  const canViewExpense = hasActionPermission("View Expense", MENU_FEATURE_IDS.EVENT_VIEW_EXPENSE, activeRole).canView;
  const canViewShareRules = getRightsForFeatureId(MENU_FEATURE_IDS.CALCULATION, activeRole).read !== false;

  const navigate = useNavigate();
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  async function loadData(targetFilters) {
    const activeFilters = targetFilters || filters;
    try {
      const [eventsData, types, membersData, usersData, expensesData, galleryPhotosData] = await Promise.all([
        getEventsAsync({ month: activeFilters.month, year: activeFilters.year }),
        getEventTypesAsync(),
        getMembersAsync(),
        getUsersAsync().catch(() => []),
        getExpensesAsync().catch(() => []),
        getGalleryPhotosAsync().catch(() => []),
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

        const targetEventId = String(e.eventId || e.id || "").toLowerCase();
        const targetEventName = String(e.eventName || e.name || "").trim().toLowerCase();

        const matchedExpenses = (expensesData || []).filter((exp) => {
          if ((exp.status || "").toLowerCase() === "rejected") return false;
          const expEventId = String(exp.eventId || "").toLowerCase();
          const expEventName = String(exp.eventName || "").trim().toLowerCase();
          if (expEventId && targetEventId && expEventId === targetEventId) return true;
          return expEventName && targetEventName && expEventName === targetEventName;
        });
        const eventExpenseTotal = matchedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

        // Dynamically compute photos count for this event
        const matchedPhotos = (galleryPhotosData || []).filter((item) => {
          const itemEvent = (item.eventName || "").trim().toLowerCase();
          const itemId = String(item.eventId || "").trim().toLowerCase();
          return (
            (targetEventName && itemEvent === targetEventName) ||
            (targetEventId && itemId && itemId === targetEventId)
          );
        });
        let totalPhotosCount = 0;
        matchedPhotos.forEach((entry) => {
          const imgs = entry.images?.length > 0 ? entry.images : extractImages(entry.imageUrl);
          totalPhotosCount += (imgs?.length || 1);
        });

        const expAmount = Math.max(Number(e.expenseAmount || 0), eventExpenseTotal);
        const allocatedAmt = e.useAvailableBalance ? Number(e.allocatedAmount || 0) : 0;
        const rawBudget = Math.max(Number(e.baseAmount || 0), Number(e.totalExpectedAmount || 0));
        // If event was funded from Amount in Hand, member collection expected is reduced by allocatedAmt
        const expectedAmt = allocatedAmt > 0 && Number(e.totalExpectedAmount || 0) <= (rawBudget - allocatedAmt)
          ? Number(e.totalExpectedAmount)
          : (allocatedAmt > 0 ? Math.max(0, rawBudget - allocatedAmt) : (Number(e.totalExpectedAmount) || rawBudget));
        const paidAmt = Number(e.collectedAmount ?? e.totalPaidAmount ?? 0);
        const pendingAmt = Number(e.pendingAmount !== undefined ? e.pendingAmount : Math.max(0, expectedAmt - paidAmt));
        const remainingAmt = paidAmt - expAmount;
        const extraAmountSpent = Math.max(0, expAmount - rawBudget);

        const hasPaidContrib = Boolean(
          e.hasPaidContributions ||
          e.HasPaidContributions ||
          Number(e.paidContributionsCount || e.PaidContributionsCount || 0) > 0 ||
          paidAmt > 0
        );

        return {
          ...e,
          baseAmount: Number(e.baseAmount || 0) || rawBudget,
          useAvailableBalance: Boolean(e.useAvailableBalance),
          allocatedAmount: allocatedAmt,
          totalExpectedAmount: expectedAmt,
          expectedAmount: expectedAmt,
          hasPaidContributions: hasPaidContrib,
          paidContributionsCount: Number(e.paidContributionsCount || e.PaidContributionsCount || 0),
          expenseAmount: expAmount,
          expensesCount: matchedExpenses.length,
          photosCount: totalPhotosCount,
          remainingAmount: remainingAmt,
          pendingAmount: pendingAmt,
          totalPaidAmount: paidAmt,
          collectedAmount: paidAmt,
          extraAmountSpent: extraAmountSpent,
          createdByName: resolvedDisplay,
          createdBy: resolvedDisplay,
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load events data");
    }
  }

  // Initial load: Load data automatically on mount with default filters
  useEffect(() => {
    loadData(filters);
  }, []);

  const yearOptions = useMemo(() => {
    const curYear = dayjs().year();
    const yearsSet = new Set();
    for (let i = curYear - 5; i <= curYear + 5; i++) {
      yearsSet.add(i);
    }
    (filterLookupEvents || []).forEach((e) => {
      const d = e.eventDate || e.createdOn || e.date;
      if (d) {
        const y = dayjs(d).year();
        if (y && !isNaN(y)) {
          yearsSet.add(y);
        }
      }
    });
    const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
    return [
      { label: "All", value: 0 },
      ...sortedYears.map((y) => ({ label: String(y), value: y })),
    ];
  }, [filterLookupEvents]);

  const monthOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    })),
  ];

  // Cascading Event Types available only in selected month & year
  const eventTypeOptions = useMemo(() => {
    const list = [{ label: "All Event Types", value: "ALL" }];
    const seen = new Set();
    (filterLookupEvents || []).forEach((e) => {
      const cat = (e.eventTypeName || e.category || "").trim();
      if (cat && !seen.has(cat.toLowerCase())) {
        seen.add(cat.toLowerCase());
        list.push({ label: cat, value: cat });
      }
    });
    return list;
  }, [filterLookupEvents]);

  // Reset invalid dependent Event Type and Event Name when eventTypeOptions change
  useEffect(() => {
    if (filterEventType && filterEventType !== "ALL") {
      const isValid = eventTypeOptions.some(
        (opt) => opt.value.toLowerCase() === filterEventType.toLowerCase()
      );
      if (!isValid) {
        setFilterEventType("ALL");
        setFilterEvent("ALL");
      }
    }
  }, [eventTypeOptions, filterEventType]);

  // Cascading Event Names available in selected month, year & event type
  const eventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const seen = new Set();
    const matching =
      !filterEventType || filterEventType === "ALL"
        ? filterLookupEvents
        : filterLookupEvents.filter(
          (e) => (e.eventTypeName || e.category || "").toLowerCase() === filterEventType.toLowerCase()
        );

    matching.forEach((e) => {
      const name = e.eventName || e.name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });
    return list;
  }, [filterLookupEvents, filterEventType]);

  // Reset invalid dependent Event Name when eventOptions change
  useEffect(() => {
    if (filterEvent && filterEvent !== "ALL") {
      const isValid = eventOptions.some(
        (opt) => opt.value.toLowerCase() === filterEvent.toLowerCase()
      );
      if (!isValid) {
        setFilterEvent("ALL");
      }
    }
  }, [eventOptions, filterEvent]);

  const handleEventTypeChange = (newType) => {
    const normalizedType = newType || "ALL";
    setFilterEventType(normalizedType);
  };

  const handleApplyFilter = () => {
    const nextFilters = {
      year: filterYear,
      month: filterMonth,
      eventType: filterEventType,
      event: filterEvent,
      status: filterStatus,
    };
    setFilters(nextFilters);
    setHasAppliedFilter(true);
    loadData(nextFilters);
  };

  const handleClearFilter = () => {
    setFilterYear(0);
    setFilterMonth(0);
    setFilterEventType("ALL");
    setFilterEvent("ALL");
    setFilterStatus("ALL");
    const resetFilters = {
      year: 0,
      month: 0,
      eventType: "ALL",
      event: "ALL",
      status: "ALL",
    };
    setFilters(resetFilters);
    setHasAppliedFilter(true);
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
      if (filters.status && filters.status !== "ALL") {
        const rowStatus = String(e.status || "").trim().toLowerCase();
        const targetStatus = filters.status.trim().toLowerCase();
        if (targetStatus === "published") {
          if (rowStatus !== "published" && rowStatus !== "planned" && rowStatus !== "active" && rowStatus !== "2" && rowStatus !== "3" && rowStatus !== "6") {
            return false;
          }
        } else if (targetStatus === "draft") {
          if (rowStatus !== "draft" && rowStatus !== "1") {
            return false;
          }
        } else if (targetStatus === "completed") {
          if (rowStatus !== "completed" && rowStatus !== "4") {
            return false;
          }
        } else if (targetStatus === "cancelled") {
          if (rowStatus !== "cancelled" && rowStatus !== "5") {
            return false;
          }
        } else if (rowStatus !== targetStatus) {
          return false;
        }
      }
      return true;
    });
  }, [events, filters]);

  const summaryTotals = useMemo(() => {
    const totalCollected = (displayedEvents || []).reduce((sum, e) => {
      return sum + roundToWhole(Number(e.collectedAmount ?? e.totalPaidAmount ?? 0));
    }, 0);

    const totalAllocated = (displayedEvents || []).reduce((sum, e) => {
      const allocated = e.useAvailableBalance ? Number(e.allocatedAmount || 0) : 0;
      return sum + roundToWhole(allocated);
    }, 0);

    const totalRecoveredDeficit = (displayedEvents || []).reduce((sum, e) => {
      const isDeficit = Boolean(e.usePreviousEventBalance) &&
        (e.previousEventAdjustmentType === "DeficitRecovery" || e.PreviousEventAdjustmentType === "DeficitRecovery");
      const adj = Number(e.previousEventAdjustment ?? e.PreviousEventAdjustment ?? 0);
      return sum + (isDeficit ? roundToWhole(adj) : 0);
    }, 0);

    const totalExpected = (displayedEvents || []).reduce((sum, e) => {
      const allocated = e.useAvailableBalance ? Number(e.allocatedAmount || 0) : 0;
      const raw = Math.max(Number(e.baseAmount || 0), Number(e.totalExpectedAmount || 0));
      const exp = allocated > 0 ? Math.max(0, (Number(e.baseAmount || 0) || raw) - allocated) : (Number(e.totalExpectedAmount) || Number(e.baseAmount) || 0);
      return sum + roundToWhole(exp);
    }, 0);

    const totalPending = (displayedEvents || []).reduce((sum, e) => {
      const allocated = e.useAvailableBalance ? Number(e.allocatedAmount || 0) : 0;
      const raw = Math.max(Number(e.baseAmount || 0), Number(e.totalExpectedAmount || 0));
      const exp = allocated > 0 ? Math.max(0, (Number(e.baseAmount || 0) || raw) - allocated) : (Number(e.totalExpectedAmount) || Number(e.baseAmount) || 0);
      const col = Number(e.collectedAmount ?? e.totalPaidAmount ?? 0);
      const pen = Number(e.pendingAmount !== undefined ? e.pendingAmount : Math.max(0, exp - col));
      return sum + roundToWhole(pen);
    }, 0);

    const totalExpenses = (displayedEvents || []).reduce((sum, e) => {
      return sum + roundToWhole(Number(e.expenseAmount || 0));
    }, 0);

    const rawBalance = totalCollected - totalExpenses - totalAllocated;
    // Amount In Hand = rawBalance + recoveredDeficits (do NOT clamp to zero).
    // A negative result is a real uncovered shortfall and must be shown to the user.
    // Example: rawBalance = -2600, recovered = 100 → totalBalance = -2500 ✓
    // Dynamic: when ₹100 pending is collected → rawBalance becomes -2500 → totalBalance = -2400 ✓
    const totalBalance = (rawBalance < 0 && totalRecoveredDeficit > 0)
      ? rawBalance + totalRecoveredDeficit
      : rawBalance;

    return {
      totalExpected,
      totalCollected,
      totalPending,
      totalExpenses,
      totalAllocated,
      totalRecoveredDeficit,
      totalBalance,
    };
  }, [displayedEvents]);

  const handleDeleteRequest = (eventItem) => {
    const hasPaid = Boolean(
      eventItem?.hasPaidContributions ||
      eventItem?.HasPaidContributions ||
      Number(eventItem?.paidContributionsCount || eventItem?.PaidContributionsCount || 0) > 0 ||
      Number(eventItem?.totalPaidAmount || eventItem?.TotalPaidAmount || eventItem?.collectedAmount || eventItem?.CollectedAmount || eventItem?.paidAmount || 0) > 0
    );
    if (hasPaid) {
      toast.error("Cannot delete event because payments have already been received.");
      return;
    }
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

  const handlePublishRequest = (eventItem) => {
    setEventToPublish(eventItem);
    setPublishConfirmOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!eventToPublish) return;
    setPublishing(true);
    try {
      await publishEventAsync(eventToPublish.eventId);
      toast.success("Event published successfully. Member notifications are being processed.");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish event.");
    } finally {
      setPublishing(false);
      setPublishConfirmOpen(false);
      setEventToPublish(null);
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
      sx: { width: 280, minWidth: 280 },
      render: (row) => {
        const hasPaid = Boolean(
          row.hasPaidContributions ||
          row.HasPaidContributions ||
          Number(row.paidContributionsCount || row.PaidContributionsCount || 0) > 0 ||
          Number(row.totalPaidAmount || row.TotalPaidAmount || row.collectedAmount || row.CollectedAmount || row.paidAmount || 0) > 0
        );
        const isEditable = canEditEvent && !hasPaid;
        const isDeletable = canDeleteEvent && !hasPaid;
        const statusStr = String(row.status || "").trim().toLowerCase();
        const isDraft = statusStr === "draft" || statusStr === "1";
        const canPublishEvent = (canEditEvent || canAddEvent) && isDraft;

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
            {isDraft && (
              <Tooltip title={canPublishEvent ? "Publish Event" : "Disabled"}>
                <span style={{ display: "inline-flex", cursor: !canPublishEvent ? "not-allowed" : "pointer" }}>
                  <IconButton
                    size="small"
                    sx={{ p: 0.3 }}
                    disabled={!canPublishEvent}
                    onClick={() => handlePublishRequest(row)}
                  >
                    <PublishIcon sx={{ fontSize: "1.1rem", color: canPublishEvent ? actionIconColor : "#94a3b8" }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip
              title={
                !canEditEvent
                  ? "Disabled"
                  : hasPaid
                    ? "Cannot edit event after payments have been received"
                    : "Edit Event"
              }
            >
              <span style={{ display: "inline-flex", cursor: !isEditable ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0.3,
                    opacity: isEditable ? 1 : 0.38,
                    cursor: !isEditable ? "not-allowed !important" : "pointer",
                    pointerEvents: !isEditable ? "none" : "auto",
                  }}
                  disabled={!isEditable}
                  onClick={() => {
                    if (!isEditable) {
                      toast.warning("Cannot edit event after payments have been received.");
                      return;
                    }
                    navigate(`/events/edit/${row.eventId}`);
                  }}
                >
                  <EditIcon sx={{ fontSize: "1.1rem", color: isEditable ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                !canDeleteEvent
                  ? "Disabled"
                  : hasPaid
                    ? "Cannot delete event after payments have been received"
                    : "Delete Event"
              }
            >
              <span style={{ display: "inline-flex", cursor: !isDeletable ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0.3,
                    opacity: isDeletable ? 1 : 0.38,
                    cursor: !isDeletable ? "not-allowed !important" : "pointer",
                    pointerEvents: !isDeletable ? "none" : "auto",
                  }}
                  disabled={!isDeletable}
                  onClick={() => {
                    if (!isDeletable) {
                      toast.warning("Cannot delete event after payments have been received.");
                      return;
                    }
                    handleDeleteRequest(row);
                  }}
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
            {(() => {
              const hasPhotos = Number(row.photosCount || 0) > 0;
              const isPhotoViewable = canViewPhotos && hasPhotos;
              return (
                <Tooltip
                  title={
                    !canViewPhotos
                      ? "Disabled"
                      : !hasPhotos
                        ? "No photos available"
                        : "View Photos"
                  }
                >
                  <span style={{ display: "inline-flex", cursor: !isPhotoViewable ? "not-allowed" : "pointer" }}>
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.3,
                        opacity: isPhotoViewable ? 1 : 0.38,
                        cursor: !isPhotoViewable ? "not-allowed !important" : "pointer",
                        pointerEvents: !isPhotoViewable ? "none" : "auto",
                      }}
                      disabled={!isPhotoViewable}
                      onClick={() => {
                        if (!isPhotoViewable) return;
                        setPhotoEvent(row);
                        setPhotoDetailsDialogOpen(true);
                      }}
                    >
                      <PhotoLibraryIcon sx={{ fontSize: "1.1rem", color: isPhotoViewable ? actionIconColor : "#94a3b8" }} />
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })()}
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
            {(() => {
              const hasExpenses = Number(row.expensesCount || 0) > 0 || Number(row.expenseAmount || 0) > 0;
              const isExpenseViewable = canViewExpense && hasExpenses;
              return (
                <Tooltip
                  title={
                    !canViewExpense
                      ? "Disabled"
                      : !hasExpenses
                        ? "No expenses recorded"
                        : "View Expense"
                  }
                >
                  <span style={{ display: "inline-flex", cursor: !isExpenseViewable ? "not-allowed" : "pointer" }}>
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.3,
                        opacity: isExpenseViewable ? 1 : 0.38,
                        cursor: !isExpenseViewable ? "not-allowed !important" : "pointer",
                        pointerEvents: !isExpenseViewable ? "none" : "auto",
                      }}
                      disabled={!isExpenseViewable}
                      onClick={() => {
                        if (!isExpenseViewable) return;
                        setExpenseEvent(row);
                        setExpenseDetailsDialogOpen(true);
                      }}
                    >
                      <ReceiptLongIcon sx={{ fontSize: "1.1rem", color: isExpenseViewable ? actionIconColor : "#94a3b8" }} />
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })()}
            <Tooltip title={canViewShareRules ? (COMMON_STRINGS.CONTRIBUTION_CALCULATION?.TITLE || "Contribution Share Rules") : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewShareRules ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canViewShareRules}
                  onClick={() => {
                    navigate(`/contribution-calculation?eventId=${row.eventId}`, {
                      state: { eventId: row.eventId },
                    });
                  }}
                >
                  <CalculateRoundedIcon sx={{ fontSize: "1.1rem", color: canViewShareRules ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      label: "Status",
      key: "status",
      align: "center",
      render: (row) => {
        const raw = String(row.status || "").trim().toLowerCase();
        let label = "Published";
        let color = "#16a34a";
        let bgcolor = "rgba(22, 163, 74, 0.12)";
        let borderColor = "rgba(22, 163, 74, 0.3)";

        if (raw === "draft" || raw === "1") {
          label = "Draft";
          color = "#64748b";
          bgcolor = "rgba(100, 116, 139, 0.12)";
          borderColor = "#cbd5e1";
        } else if (raw === "completed" || raw === "4") {
          label = "Completed";
          color = "#2563eb";
          bgcolor = "rgba(37, 99, 235, 0.12)";
          borderColor = "rgba(37, 99, 235, 0.3)";
        } else if (raw === "cancelled" || raw === "5") {
          label = "Cancelled";
          color = "#dc2626";
          bgcolor = "rgba(220, 38, 38, 0.12)";
          borderColor = "rgba(220, 38, 38, 0.3)";
        } else if (raw === "active" || raw === "3") {
          label = "Active";
          color = "#059669";
          bgcolor = "rgba(5, 150, 105, 0.12)";
          borderColor = "rgba(5, 150, 105, 0.3)";
        } else if (raw === "published" || raw === "planned" || raw === "2" || raw === "6") {
          label = "Published";
          color = "#16a34a";
          bgcolor = "rgba(22, 163, 74, 0.12)";
          borderColor = "rgba(22, 163, 74, 0.3)";
        } else if (row.status) {
          label = String(row.status);
        }

        return (
          <Chip
            size="small"
            label={label}
            sx={{
              height: 22,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: color,
              bgcolor: bgcolor,
              border: `1px solid ${borderColor}`,
              borderRadius: "6px",
              "& .MuiChip-label": { px: 1 },
            }}
          />
        );
      },
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "inherit" }}>
            {row.eventName || "--"}
          </Typography>
          {row.useAvailableBalance && (
            <Tooltip title={`Funded from Amount In Hand: ${formatWholeCurrency(row.allocatedAmount || row.baseAmount || 0)}`}>
              <Chip
                size="small"
                label="Amount In Hand"
                sx={{
                  height: 18,
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  bgcolor: "rgba(22, 163, 74, 0.12)",
                  color: "#16a34a",
                  borderRadius: "4px",
                  "& .MuiChip-label": { px: 0.6 },
                }}
              />
            </Tooltip>
          )}
          {row.usePreviousEventBalance && row.previousEventAdjustmentType === "DeficitRecovery" && (
            <Tooltip title={`Deficit Recovery: +${formatWholeCurrency(row.previousEventAdjustment || 0)} added from previous event overspend (Planned Budget: ${formatWholeCurrency(row.originalPlannedBudget || (row.baseAmount - row.previousEventAdjustment))})`}>
              <Chip
                size="small"
                label="Deficit Recovered"
                sx={{
                  height: 18,
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  color: "#d97706",
                  borderRadius: "4px",
                  "& .MuiChip-label": { px: 0.6 },
                }}
              />
            </Tooltip>
          )}
          {row.usePreviousEventBalance && row.previousEventAdjustmentType === "SurplusCredit" && (
            <Tooltip title={`Surplus Credit: -${formatWholeCurrency(row.previousEventAdjustment || 0)} applied from previous event balance`}>
              <Chip
                size="small"
                label="Surplus Credited"
                sx={{
                  height: 18,
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  bgcolor: "rgba(16, 185, 129, 0.15)",
                  color: "#059669",
                  borderRadius: "4px",
                  "& .MuiChip-label": { px: 0.6 },
                }}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      label: "Event Type / Event Date",
      key: "eventTypeName",
      render: (row) => {
        const categories = getEventCategories(row, eventTypes);

        // Parse eventDates if stored as JSON dictionary of dates
        let datesByType = null;
        if (row.eventDates && typeof row.eventDates === "string" && row.eventDates.trim().startsWith("{")) {
          try {
            datesByType = JSON.parse(row.eventDates);
          } catch {
            datesByType = null;
          }
        } else if (row.eventTypeDates && typeof row.eventTypeDates === "object") {
          datesByType = row.eventTypeDates;
        }

        if (!datesByType && row.description && row.description.includes("<!--eventDates:")) {
          const match = row.description.match(/<!--eventDates:(.*?)-->/);
          if (match) {
            try {
              datesByType = JSON.parse(match[1]);
            } catch { }
          }
        }

        return (
          <Box sx={{ py: 0.3, display: "flex", flexDirection: "column", gap: 0.8 }}>
            {categories.map((cat, idx) => {
              const cfg = getCategoryChipConfig(cat);
              const catLower = String(cat || "").toLowerCase().trim();
              const isBirthdayCat = catLower.includes("birthday");

              let dateDisplay = "";

              if (datesByType) {
                const matchKey = Object.keys(datesByType).find((k) => {
                  const kLow = k.toLowerCase().trim();
                  return kLow === catLower || catLower.includes(kLow) || kLow.includes(catLower);
                });
                if (matchKey && datesByType[matchKey]) {
                  const val = datesByType[matchKey];
                  if (typeof val === "object" && val !== null) {
                    const distinctDates = Array.from(new Set(Object.values(val).filter(Boolean)));
                    dateDisplay = distinctDates.map((d) => formatGridDate(d)).join(", ");
                  } else if (dayjs(val).isValid()) {
                    dateDisplay = formatGridDate(val);
                  } else {
                    dateDisplay = String(val);
                  }
                }
              }

              if (!dateDisplay) {
                if (isBirthdayCat && row.eventDates && !row.eventDates.trim().startsWith("{")) {
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
      label: "Expected Amount",
      key: "totalExpectedAmount",
      align: "right",
      exportValue: (row) => {
        const allocated = row.useAvailableBalance ? Number(row.allocatedAmount || 0) : 0;
        const raw = Math.max(Number(row.baseAmount || 0), Number(row.totalExpectedAmount || 0));
        return roundToWhole(allocated > 0 ? Math.max(0, raw - allocated) : raw);
      },
      render: (row) => {
        const allocated = row.useAvailableBalance ? Number(row.allocatedAmount || 0) : 0;
        const raw = Math.max(Number(row.baseAmount || 0), Number(row.totalExpectedAmount || 0));
        const val = allocated > 0 ? Math.max(0, raw - allocated) : raw;
        return (
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatWholeCurrency(val)}
            </Typography>
            {allocated > 0 && (
              <Typography variant="caption" sx={{ color: "#16a34a", fontSize: "0.7rem", display: "block" }}>
                (Budget: {formatWholeCurrency(raw)} - {formatWholeCurrency(allocated)} from Hand)
              </Typography>
            )}
            {row.usePreviousEventBalance && row.previousEventAdjustmentType === "DeficitRecovery" && (
              <Typography variant="caption" sx={{ color: "#d97706", fontSize: "0.7rem", display: "block" }}>
                (Planned: {formatWholeCurrency(row.originalPlannedBudget || (row.baseAmount - (row.previousEventAdjustment || 0)))} + {formatWholeCurrency(row.previousEventAdjustment || 0)} Deficit)
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      label: "Collection Amount",
      key: "collectedAmount",
      align: "right",
      exportValue: (row) => roundToWhole(Number(row.collectedAmount ?? row.totalPaidAmount ?? row.paidAmount ?? 0)),
      render: (row) => {
        const val = Number(row.collectedAmount ?? row.totalPaidAmount ?? row.paidAmount ?? 0);
        return formatWholeCurrency(val);
      }
    },
    {
      label: "Extra Amount Spent",
      key: "extraAmountSpent",
      align: "right",
      exportValue: (row) => {
        const exp = Math.max(Number(row.baseAmount || 0), Number(row.totalExpectedAmount || 0));
        const spent = Number(row.expenseAmount || 0);
        const extra = row.extraAmountSpent !== undefined ? Number(row.extraAmountSpent) : Math.max(0, spent - exp);
        return roundToWhole(extra);
      },
      render: (row) => {
        const exp = Math.max(Number(row.baseAmount || 0), Number(row.totalExpectedAmount || 0));
        const spent = Number(row.expenseAmount || 0);
        const extra = row.extraAmountSpent !== undefined ? Number(row.extraAmountSpent) : Math.max(0, spent - exp);
        const isOver = extra > 0;
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: isOver ? 700 : 500,
              color: isOver ? "#ef4444" : "text.secondary",
              display: "inline-block",
              fontSize: "0.85rem",
            }}
          >
            {extra > 0 ? formatWholeCurrency(extra) : "₹0"}
          </Typography>
        );
      },
    },
    {
      label: "Support Tickets Raised",
      key: "supportTicketRaisedCount",
      align: "center",
      exportValue: (row) => Number(row.supportTicketRaisedCount ?? row.SupportTicketRaisedCount ?? 0),
      render: (row) => {
        const count = Number(row.supportTicketRaisedCount ?? row.SupportTicketRaisedCount ?? 0);
        if (count > 0) {
          return (
            <Tooltip title={`View ${count} support ticket${count > 1 ? "s" : ""} for ${row.eventName || "this event"}`}>
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/support-tickets", {
                    state: {
                      eventId: row.eventId,
                      eventName: row.eventName,
                      relatedEvent: row.eventName,
                    },
                  });
                }}
                sx={{
                  minWidth: 44,
                  height: 28,
                  px: 1.5,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: "14px",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#7c3aed" : "#4a3f6b",
                  color: "#ffffff",
                  boxShadow: "0 2px 6px rgba(74, 63, 107, 0.3)",
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#6d28d9" : "#3b3156",
                    boxShadow: "0 4px 10px rgba(74, 63, 107, 0.45)",
                  },
                }}
              >
                {count}
              </Button>
            </Tooltip>
          );
        }
        return (
          <Button
            variant="outlined"
            size="small"
            disabled
            sx={{
              minWidth: 44,
              height: 28,
              px: 1.5,
              fontWeight: 600,
              fontSize: "0.8rem",
              borderRadius: "14px",
              color: "text.secondary !important",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)",
              bgcolor: "transparent",
              textTransform: "none",
              cursor: "not-allowed",
            }}
          >
            0
          </Button>
        );
      },
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
        data={hasAppliedFilter ? displayedEvents : []}
        emptyMessage={!hasAppliedFilter ? "Please select filters and click Filter to view events." : undefined}
        allowExport={canExportEvent}
        searchPlaceholder="Search by event name..."
        actions={
          <AppAddButton
            disabled={!canAddEvent}
            onClick={() => navigate("/events/add")}
          />
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
                    const val = event.target.value;
                    setFilterYear(val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
                  }}
                  onClear={() => setFilterYear(0)}
                  options={yearOptions}
                  placeholder="Select Year"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 165, md: 175 } }}>
                <AppSelect
                  label="Month"
                  value={filterMonth}
                  onChange={(event) => {
                    const val = event.target.value;
                    setFilterMonth(val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val));
                  }}
                  onClear={() => setFilterMonth(0)}
                  options={monthOptions}
                  placeholder="Select Month"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 190, md: 210 } }}>
                <AppSelect
                  label="Event Type"
                  value={filterEventType}
                  onChange={(event) => {
                    handleEventTypeChange(event.target.value || "ALL");
                  }}
                  onClear={() => handleEventTypeChange("ALL")}
                  options={eventTypeOptions}
                  placeholder="Select Event Type"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 190, md: 210 } }}>
                <AppSelect
                  label="Event Name"
                  value={filterEvent}
                  onChange={(event) => {
                    setFilterEvent(event.target.value || "ALL");
                  }}
                  onClear={() => setFilterEvent("ALL")}
                  options={eventOptions}
                  placeholder="Select Event Name"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 150, md: 165 } }}>
                <AppSelect
                  label="Event Status"
                  value={filterStatus}
                  onChange={(event) => {
                    setFilterStatus(event.target.value || "ALL");
                  }}
                  onClear={() => setFilterStatus("ALL")}
                  options={[
                    { label: "All Statuses", value: "ALL" },
                    { label: "Draft", value: "Draft" },
                    { label: "Published", value: "Published" },
                    { label: "Completed", value: "Completed" },
                    { label: "Cancelled", value: "Cancelled" },
                  ]}
                  placeholder="Select Status"
                />
              </Box>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                  onClick={handleApplyFilter}
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
                <AppButton
                  variant="outlined"
                  size="small"
                  onClick={handleClearFilter}
                  sx={{
                    color: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    height: 34,
                    minHeight: 34,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
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
            {hasAppliedFilter && (
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
                  label="Expected Amount"
                  value={formatWholeCurrency(summaryTotals.totalExpected)}
                  accent="#6366f1"
                />
                <MetricCard
                  label="Collection Amount"
                  value={formatWholeCurrency(summaryTotals.totalCollected)}
                  accent="#10b981"
                />
                <MetricCard
                  label="Total Pending"
                  value={formatWholeCurrency(summaryTotals.totalPending)}
                  accent="#f43f5e"
                />
                <MetricCard
                  label="Total Expenses"
                  value={formatWholeCurrency(summaryTotals.totalExpenses)}
                  accent="#f59e0b"
                />
                <MetricCard
                  label="Amount In Hand"
                  value={formatWholeCurrency(summaryTotals.totalBalance)}
                  accent={summaryTotals.totalBalance >= 0 ? "#06b6d4" : "#f43f5e"}
                />
              </Box>
            )}
          </Stack>
        }
      />


      <EventDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        event={selectedEvent}
        members={members}
      />

      {photoDetailsDialogOpen && photoEvent && (
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
      )}

      {addPhotoDialogOpen && addPhotoEvent && (
        <EventAddPhotoDialog
          open={addPhotoDialogOpen}
          onClose={() => {
            setAddPhotoDialogOpen(false);
            setAddPhotoEvent(null);
          }}
          event={addPhotoEvent}
          onPhotosSaved={() => loadData()}
        />
      )}

      {addExpenseDialogOpen && addExpenseEvent && (
        <EventAddExpenseDialog
          open={addExpenseDialogOpen}
          onClose={() => {
            setAddExpenseDialogOpen(false);
            setAddExpenseEvent(null);
          }}
          event={addExpenseEvent}
          onExpenseSaved={() => loadData()}
        />
      )}

      {expenseDetailsDialogOpen && expenseEvent && (
        <EventExpensesDialog
          open={expenseDetailsDialogOpen}
          onClose={() => {
            setExpenseDetailsDialogOpen(false);
            setExpenseEvent(null);
            loadData();
          }}
          event={expenseEvent}
        />
      )}

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      <AppConfirmDialog
        open={publishConfirmOpen}
        onClose={() => {
          if (!publishing) {
            setPublishConfirmOpen(false);
            setEventToPublish(null);
          }
        }}
        onConfirm={handleConfirmPublish}
        title="Publish Event?"
        content="Are you sure you want to publish this event? Once published, the event will be visible to eligible members and notifications will be sent."
        confirmText="Confirm & Publish"
        cancelText="Cancel"
      />
    </div>
  );
}
