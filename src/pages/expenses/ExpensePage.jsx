import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  CloudUploadOutlined as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  DeleteOutline as DeleteOutlineIcon,
  FilterList as FilterListIcon,
  OpenInNew as OpenInNewIcon,
  ZoomIn as ZoomInIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Image as ImageIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon,
  AssignmentTurnedIn as StatusActionIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { useLocation } from "react-router-dom";
import { formatGridDate, formatViewDate } from "../../utils/dateHelper";
import { roundToWhole, formatWholeCurrency } from "../../utils/roundingHelper";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { getRightsForPage, hasActionPermission } from "../../utils/rightsHelper";
import { getImageUrl } from "../../services/apiClient";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import ExpenseFormDialog from "../../components/expenses/ExpenseFormDialog";
import {
  getExpensesAsync,
  createExpenseAsync,
  updateExpenseAsync,
  deleteExpenseAsync,
} from "../../services/expenseService";
import { getEventsAsync } from "../../services/eventService";
import { getMembersAsync } from "../../services/memberService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getStatusesAsync } from "../../services/statusService";
import { TOAST_MESSAGES, COMMON_STRINGS, MENU_FEATURE_IDS } from "../../constants";

const resolveAttachmentUrl = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("data:") || filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  if (filePath.startsWith("/expense_attachments/") || filePath.startsWith("expense_attachments/")) {
    return getImageUrl(filePath);
  }
  if (filePath.startsWith("/")) {
    return getImageUrl(filePath);
  }
  return getImageUrl(`/expense_attachments/${filePath}`);
};

const getAttachmentDisplayName = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("data:")) return "Uploaded Receipt Image";
  const name = filePath.split("/").pop() || filePath;
  const cleaned = name.replace(/^\d{8}_\d{6}_/, "");
  return cleaned || name;
};

const isImageFile = (filePath) => {
  if (!filePath) return false;
  if (filePath.startsWith("data:image/")) return true;
  const lower = filePath.toLowerCase().split("?")[0];
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg")
  );
};

const isPdfFile = (filePath) => {
  if (!filePath) return false;
  if (filePath.startsWith("data:application/pdf")) return true;
  const lower = filePath.toLowerCase().split("?")[0];
  return lower.endsWith(".pdf");
};

/**
 * Parses raw expense description to extract clean description
 * and separate verified message / remarks notes.
 */
const parseExpenseDescription = (rawDesc = "") => {
  if (!rawDesc) {
    return {
      cleanDescription: "No description provided.",
      verifiedNote: null,
      verifiedMeta: null,
    };
  }

  // Regex matching status note pattern:
  // e.g. "fgsdgdfs [Status Note - Verify (20 Oct 2026, 02:19 PM) by Daniel A]: ok"
  // or "fgsdgdfs\n[Status Note - Verify (20 Oct 2026, 02:19 PM) by Daniel A]: ok"
  const regex = /^(.*?)(?:[\r\n\s]*\[Status Note\s*-\s*([^\]]+)\]\s*:\s*([\s\S]*))$/s;
  const match = rawDesc.match(regex);

  if (match) {
    const clean = (match[1] || "").trim();
    const meta = (match[2] || "").trim();
    const note = (match[3] || "").trim();
    return {
      cleanDescription: clean || "No description provided.",
      verifiedNote: note || null,
      verifiedMeta: meta ? `Note - ${meta}` : null,
    };
  }

  // Fallback for marker: "--- Verification Note ---"
  const fallback = /^(.*?)(?:[\r\n\s]*---\s*Verification (?:Note|Remarks)\s*---\s*([\s\S]*))$/s;
  const fbMatch = rawDesc.match(fallback);
  if (fbMatch) {
    const clean = (fbMatch[1] || "").trim();
    const note = (fbMatch[2] || "").trim();
    return {
      cleanDescription: clean || "No description provided.",
      verifiedNote: note,
      verifiedMeta: null,
    };
  }

  return {
    cleanDescription: rawDesc.trim() || "No description provided.",
    verifiedNote: null,
    verifiedMeta: null,
  };
};

const initialForm = {
  eventId: "",
  eventName: "",
  category: "",
  amount: "",
  expenseDate: dayjs(),
  description: "",
  submittedBy: "",
  status: "Pending",
  attachment: "",
  attachmentName: "",
};

export default function ExpensePage() {
  const location = useLocation();
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;
  const toast = useAppToast();
  const fileInputRef = useRef(null);

  // Granular Action Permissions configured via User Rights
  const canViewExpense = hasActionPermission("view", MENU_FEATURE_IDS.EXPENSE_VIEW, authState?.role).canView || hasActionPermission("View details", MENU_FEATURE_IDS.EXPENSE_VIEW, authState?.role).canView;
  const canAddExpense = hasActionPermission("Add", MENU_FEATURE_IDS.EXPENSE_ADD, authState?.role).canExecute || hasActionPermission("Add Expense", MENU_FEATURE_IDS.EXPENSE_ADD, authState?.role).canExecute;
  const canEditExpense = hasActionPermission("edit/verify", MENU_FEATURE_IDS.EXPENSE_EDIT, authState?.role).canExecute || hasActionPermission("Edit", MENU_FEATURE_IDS.EXPENSE_EDIT, authState?.role).canExecute;
  const canDeleteExpense = hasActionPermission("Delete", MENU_FEATURE_IDS.EXPENSE_DELETE, authState?.role).canExecute;
  const canVerifyExpense = hasActionPermission("verify", MENU_FEATURE_IDS.EXPENSE_VERIFY, authState?.role).canExecute || hasActionPermission("Verify", MENU_FEATURE_IDS.EXPENSE_VERIFY, authState?.role).canExecute;
  const canExportExpense = hasActionPermission("Export Expense", MENU_FEATURE_IDS.EXPENSE_VIEW, authState?.role).canExecute || canViewExpense;

  const [expenses, setExpenses] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [statusesList, setStatusesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState({ open: false, url: "", title: "" });

  // Dynamically resolve logged-in user's member display name
  const loggedInUserName = useMemo(() => {
    const rawName = (
      authState?.fullName ||
      authState?.name ||
      authState?.user?.fullName ||
      authState?.user?.name ||
      authState?.username ||
      ""
    ).trim();

    const matched = membersList.find(
      (m) =>
        (m.name && rawName && m.name.toLowerCase() === rawName.toLowerCase()) ||
        (m.memberName && rawName && m.memberName.toLowerCase() === rawName.toLowerCase()) ||
        (m.email && authState?.email && m.email.toLowerCase() === authState.email.toLowerCase()) ||
        (m.username && authState?.username && m.username.toLowerCase() === authState.username.toLowerCase())
    );

    return matched?.name || matched?.memberName || rawName || "";
  }, [authState, membersList]);

  // Dedicated Status Update / Approval dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusExpense, setStatusExpense] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusErrors, setStatusErrors] = useState({});

  const [form, setForm] = useState(initialForm);
  const [formImageError, setFormImageError] = useState(false);
  const [errors, setErrors] = useState({});

  const savedFormRef = useRef(null);

  const isFormDirty = React.useCallback(() => {
    if (!dialogOpen || !savedFormRef.current) return false;
    const s = savedFormRef.current;

    if ((form.category || "").trim() !== (s.category || "").trim()) return true;
    if ((form.eventName || "").trim() !== (s.eventName || "").trim()) return true;
    if (String(form.amount ?? "").trim() !== String(s.amount ?? "").trim()) return true;
    if ((form.submittedBy || "").trim() !== (s.submittedBy || "").trim()) return true;
    if ((form.description || "").trim() !== (s.description || "").trim()) return true;

    // Compare dates
    const dateCur = form.expenseDate ? dayjs(form.expenseDate).format("YYYY-MM-DD") : "";
    const dateSaved = s.expenseDate ? dayjs(s.expenseDate).format("YYYY-MM-DD") : "";
    if (dateCur !== dateSaved) return true;

    // Compare attachment
    if ((form.attachment || "") !== (s.attachment || "")) return true;
    if ((form.attachmentName || "") !== (s.attachmentName || "")) return true;

    return false;
  }, [dialogOpen, form]);

  const handleCloseDialog = React.useCallback(() => {
    setDialogOpen(false);
    setEditingExpense(null);
    setErrors({});
    savedFormRef.current = null;
  }, []);

  const { handleCancelRequest, UnsavedChangesDialog } = useUnsavedChanges({
    isDirty: isFormDirty,
    onQuit: handleCloseDialog,
  });

  // Filter state inside AppDataTable filterPanel
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [appliedEvent, setAppliedEvent] = useState("ALL");
  const [appliedCategory, setAppliedCategory] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");

  const fetchExpensesFromDb = async () => {
    try {
      setLoading(true);
      const data = await getExpensesAsync();
      if (Array.isArray(data)) {
        const mapped = data.map((item, idx) => ({
          id: item.expenseId
            ? `EXP-${String(idx + 1).padStart(3, "0")}`
            : item.id || `EXP-${String(idx + 1).padStart(3, "0")}`,
          expenseId: item.expenseId || item.id,
          eventName: item.eventName || "",
          category: item.category || "",
          amount: item.amount || 0,
          rawExpenseDate: item.expenseDate,
          expenseDate: item.expenseDate ? dayjs(item.expenseDate).format("YYYY-MM-DD") : "",
          status: item.status || "Pending",
          submittedBy: item.submittedBy || "",
          approvedBy: item.approvedBy || "-",
          description: item.description || "",
          fileName: item.fileName || "",
          fileUrl: item.fileUrl || item.fileName || "",
          attachment: item.fileUrl || item.fileName || "",
          createdBy: item.createdBy || item.CreatedBy || "--",
          createdOn: item.createdOn || item.CreatedOn || item.createdAt || item.CreatedAt || null,
          createdAt: item.createdAt || item.CreatedAt || item.createdOn || item.CreatedOn || null,
          modifiedOn: item.modifiedOn || item.ModifiedOn || null,
        }));
        setExpenses(mapped);
      } else {
        setExpenses([]);
      }
    } catch {
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [eventsRes, membersRes, eventTypesRes, statusesRes] = await Promise.all([
        getEventsAsync().catch(() => []),
        getMembersAsync().catch(() => []),
        getEventTypesAsync().catch(() => []),
        getStatusesAsync(true, "Expense").catch(() => []),
      ]);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(membersRes)) setMembersList(membersRes);
      if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);

      let finalStatuses = Array.isArray(statusesRes) ? statusesRes : [];
      if (finalStatuses.length === 0) {
        const allStatuses = await getStatusesAsync(true).catch(() => []);
        if (Array.isArray(allStatuses) && allStatuses.length > 0) {
          finalStatuses = allStatuses;
        }
      }
      // Strictly only "Pending" and "Verified" for expenses
      finalStatuses = finalStatuses.filter((s) => {
        const name = (s.statusName || "").trim().toLowerCase();
        return name === "pending" || name === "verified";
      });
      const existingMap = new Map();
      finalStatuses.forEach((s) => existingMap.set((s.statusName || "").trim().toLowerCase(), s));
      const cleanList = [];
      if (existingMap.has("pending")) {
        cleanList.push(existingMap.get("pending"));
      } else {
        cleanList.push({ statusId: "pending", statusName: "Pending", isActive: true });
      }
      if (existingMap.has("verified")) {
        cleanList.push(existingMap.get("verified"));
      } else {
        cleanList.push({ statusId: "verified", statusName: "Verified", isActive: true });
      }
      setStatusesList(cleanList);
    } catch {
      toast.error("Failed to load lookup data.");
    }
  };

  useEffect(() => {
    fetchExpensesFromDb();
    fetchLookupData();
  }, []);

  // Handle navigation from EventsPage (Add Expense or View Expense for specific event)
  useEffect(() => {
    if (location.state) {
      if (location.state.filterEvent) {
        setFilterEvent(location.state.filterEvent);
        setAppliedEvent(location.state.filterEvent);
      }
      if (location.state.filterCategory) {
        setFilterCategory(location.state.filterCategory);
        setAppliedCategory(location.state.filterCategory);
      }
      if (location.state.openAddExpense) {
        if (location.state.eventName) {
          setFilterEvent(location.state.eventName);
          setAppliedEvent(location.state.eventName);
        }
        if (location.state.category) {
          setFilterCategory(location.state.category);
          setAppliedCategory(location.state.category);
        }
        const currentUserName = loggedInUserName || authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "";
        setEditingExpense(null);
        setFormImageError(false);
        setForm({
          ...initialForm,
          eventName: location.state.eventName || "",
          category: location.state.category || "",
          submittedBy: currentUserName,
        });
        setErrors({});
        setDialogOpen(true);
      }
    }
  }, [location.state, membersList, authState, loggedInUserName]);

  // Filter panel status options (Only "All Statuses", "Pending", "Verified")
  const statusOptions = useMemo(() => {
    return [
      { label: "All Statuses", value: "ALL" },
      { label: "Pending", value: "Pending" },
      { label: "Verified", value: "Verified" },
    ];
  }, []);

  // Form status options for Add/Edit dialog (Only Pending and Verified)
  const dynamicStatusOptions = useMemo(() => {
    return [
      { label: "Pending", value: "Pending" },
      { label: "Verified", value: "Verified" },
    ];
  }, []);

  // Dedicated status options for the Verify / Status dialog (Only Pending and Verified)
  const verificationStatusOptions = useMemo(() => {
    return [
      { label: "Select Status", value: "" },
      { label: "Verified", value: "Verified" },
      { label: "Pending", value: "Pending" },
    ];
  }, []);

  // Event Type options for the Add/Edit form
  const formEventTypeOptions = useMemo(() => {
    const set = new Set();
    eventTypesList.forEach((et) => {
      if (et.eventTypeName) set.add(et.eventTypeName);
    });
    expenses.forEach((ex) => {
      if (ex.category) set.add(ex.category);
    });
    const items = Array.from(set);
    return [
      { label: "Select Event Type", value: "" },
      ...items.map((c) => ({ label: c, value: c })),
    ];
  }, [eventTypesList, expenses]);

  // Cascading Event options for the Add/Edit form filtered by selected Event Type (form.category)
  const formEventOptions = useMemo(() => {
    let filtered = eventsList;
    if (form.category) {
      filtered = eventsList.filter((e) => {
        const eventCat =
          e.eventTypeName ||
          e.category ||
          eventTypesList.find((t) => t.eventTypeId === e.eventTypeId)?.eventTypeName;
        return (
          eventCat &&
          eventCat.trim().toLowerCase() === form.category.trim().toLowerCase()
        );
      });
    }

    const list = [{ label: form.category ? "Select Event Name" : "Select Event Type first", value: "" }];
    const unique = new Set();
    filtered.forEach((e) => {
      const name = e.name || e.eventName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({ label: name, value: name });
      }
    });

    // Keep existing event name if editing a record with a custom/historical event
    if (form.eventName && !unique.has(form.eventName)) {
      list.push({ label: form.eventName, value: form.eventName });
    }

    return list;
  }, [eventsList, eventTypesList, form.category, form.eventName]);

  // Dynamically calculate selected event budget and remaining limit
  const selectedEventBudget = useMemo(() => {
    if (!form.eventName && !form.eventId) return null;
    const ev = eventsList.find((e) => {
      if (form.eventId && (e.eventId === form.eventId || e.id === form.eventId)) return true;
      const matchName = (e.name || e.eventName || "").trim().toLowerCase() === (form.eventName || "").trim().toLowerCase();
      if (!matchName) return false;
      if (form.category) {
        const cat = e.eventTypeName || e.category || "";
        return cat.trim().toLowerCase() === form.category.trim().toLowerCase();
      }
      return true;
    });
    if (!ev) return null;

    const expected = roundToWhole(Number(ev.totalExpectedAmount ?? ev.expectedAmount ?? ev.expectedCollection ?? ev.baseAmount ?? 0));
    const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;
    const spent = roundToWhole(expenses
      .filter((ex) =>
        (ex.eventName || "").trim().toLowerCase() === (form.eventName || "").trim().toLowerCase() &&
        (!currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId)) &&
        (ex.status || "").toLowerCase() !== "rejected"
      )
      .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0));

    const remaining = Math.max(0, expected - spent);
    const extraSpent = Math.max(0, spent - expected);
    return { expected, spent, remaining, extraSpent };
  }, [form.eventName, form.eventId, form.category, eventsList, expenses, editingExpense]);

  // Live projection calculations based on amount entered
  const enteredAmount = Number(form.amount) || 0;
  const projectedTotalSpent = selectedEventBudget ? selectedEventBudget.spent + enteredAmount : 0;
  const projectedExtraSpent = selectedEventBudget ? Math.max(0, projectedTotalSpent - selectedEventBudget.expected) : 0;
  const isOverBudget =
    selectedEventBudget !== null &&
    selectedEventBudget.expected > 0 &&
    enteredAmount > 0 &&
    projectedTotalSpent > selectedEventBudget.expected;

  // Dynamic budget tracking summary for the main Expense page based on applied filtered event or all events
  const pageBudgetSummary = useMemo(() => {
    const targetEventName = appliedEvent !== "ALL" ? appliedEvent : null;
    if (!targetEventName) {
      let validEvents = eventsList.filter((e) => e && (e.totalExpectedAmount || e.expectedAmount || e.baseAmount));
      if (appliedCategory !== "ALL") {
        validEvents = validEvents.filter((e) => {
          const cat = e.eventTypeName || e.category;
          return cat && cat.trim().toLowerCase() === appliedCategory.trim().toLowerCase();
        });
      }
      const expected = roundToWhole(validEvents.reduce(
        (sum, e) => sum + Number(e.totalExpectedAmount ?? e.expectedAmount ?? e.baseAmount ?? 0),
        0
      ));
      const spent = roundToWhole(expenses
        .filter((ex) => {
          if ((ex.status || "").toLowerCase() === "rejected") return false;
          if (appliedCategory !== "ALL" && (ex.category || "").trim().toLowerCase() !== appliedCategory.trim().toLowerCase()) return false;
          return true;
        })
        .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0));
      const remaining = Math.max(0, expected - spent);
      const extraSpent = Math.max(0, spent - expected);
      return {
        title: appliedCategory !== "ALL" ? `${appliedCategory}` : "All Events",
        expected,
        spent,
        remaining,
        extraSpent,
        isSpecificEvent: appliedCategory !== "ALL",
      };
    }

    const ev = eventsList.find((e) => (e.name || e.eventName || "").trim().toLowerCase() === targetEventName.trim().toLowerCase());
    const expected = ev ? roundToWhole(Number(ev.totalExpectedAmount ?? ev.expectedAmount ?? ev.baseAmount ?? 0)) : 0;
    const spent = roundToWhole(expenses
      .filter(
        (ex) =>
          (ex.eventName || "").trim().toLowerCase() === targetEventName.trim().toLowerCase() &&
          (ex.status || "").toLowerCase() !== "rejected"
      )
      .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0));

    const remaining = Math.max(0, expected - spent);
    const extraSpent = Math.max(0, spent - expected);
    return {
      title: targetEventName,
      expected,
      spent,
      remaining,
      extraSpent,
      isSpecificEvent: true,
    };
  }, [appliedEvent, appliedCategory, eventsList, expenses]);

  // Event options for the filter panel (cascaded by filterCategory)
  const eventOptions = useMemo(() => {
    let filtered = eventsList;
    if (filterCategory && filterCategory !== "ALL") {
      filtered = eventsList.filter((e) => {
        const eventCat =
          e.eventTypeName ||
          e.category ||
          eventTypesList.find((t) => t.eventTypeId === e.eventTypeId)?.eventTypeName;
        return (
          eventCat &&
          eventCat.trim().toLowerCase() === filterCategory.trim().toLowerCase()
        );
      });
    }

    const list = [{ label: "All Events", value: "ALL" }];
    const unique = new Set();
    filtered.forEach((e) => {
      const name = e.name || e.eventName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({ label: name, value: name });
      }
    });
    expenses.forEach((ex) => {
      if (filterCategory === "ALL" || !filterCategory || ex.category === filterCategory) {
        if (ex.eventName && !unique.has(ex.eventName)) {
          unique.add(ex.eventName);
          list.push({ label: ex.eventName, value: ex.eventName });
        }
      }
    });
    return list;
  }, [eventsList, eventTypesList, expenses, filterCategory]);

  // Dynamically derive member options from DB members table
  const memberOptions = useMemo(() => {
    const list = [{ label: "Select Member", value: "" }];
    const unique = new Set();
    membersList.forEach((m) => {
      const name = m.name || m.memberName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({
          label: `${name}${m.roleName ? ` (${m.roleName})` : ""}`,
          value: name,
        });
      }
    });
    if (loggedInUserName && !unique.has(loggedInUserName)) {
      list.push({
        label: `${loggedInUserName}${authState?.role ? ` (${authState.role})` : ""}`,
        value: loggedInUserName,
      });
    }
    return list;
  }, [membersList, loggedInUserName, authState?.role]);

  // Dynamically derive category options from DB event_types table and recorded expenses
  const categoryOptions = useMemo(() => {
    const set = new Set();
    eventTypesList.forEach((et) => {
      if (et.eventTypeName) set.add(et.eventTypeName);
    });
    expenses.forEach((ex) => {
      if (ex.category) set.add(ex.category);
    });
    const items = Array.from(set);
    return [
      { label: "All Event Types", value: "ALL" },
      ...items.map((c) => ({ label: c, value: c })),
    ];
  }, [eventTypesList, expenses]);

  // Filtered expenses with deterministic recency sorting
  const filteredExpenses = useMemo(() => {
    const list = expenses.filter((item) => {
      if (appliedEvent !== "ALL" && item.eventName !== appliedEvent) return false;
      if (appliedCategory !== "ALL" && item.category !== appliedCategory) return false;
      if (appliedStatus !== "ALL" && item.status !== appliedStatus) return false;
      return true;
    });

    return list.slice().sort((a, b) => {
      const dateA = a.rawExpenseDate ? new Date(a.rawExpenseDate).getTime() : 0;
      const dateB = b.rawExpenseDate ? new Date(b.rawExpenseDate).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;

      const modA = a.modifiedOn ? new Date(a.modifiedOn).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const modB = b.modifiedOn ? new Date(b.modifiedOn).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return modB - modA;
    });
  }, [expenses, appliedEvent, appliedCategory, appliedStatus]);

  const openImagePreview = (src, title = "Attached Receipt Preview") => {
    if (!src) return;
    setPreviewImageModal({
      open: true,
      url: src,
      title: title,
    });
  };

  const handleEditExpense = (row) => {
    if (!canEditExpense) {
      toast.error("You do not have permission to edit expenses.");
      return;
    }
    const s = (row.status || "").toLowerCase();
    if (s.includes("verif") || s.includes("approv") || s.includes("paid")) {
      toast.warning("Verified expense cannot be edited.");
      return;
    }
    setEditingExpense(row);
    setFormImageError(false);
    const rawFile = row.fileName || row.fileUrl || "";
    const resolvedUrl = resolveAttachmentUrl(rawFile);
    const displayName = rawFile.startsWith("data:")
      ? `${row.id || "EXP"}_attachment.png`
      : getAttachmentDisplayName(rawFile) || `${row.id || "EXP"}_attachment.png`;

    const { cleanDescription } = parseExpenseDescription(row.description || "");
    const editFormData = {
      eventName: row.eventName || "",
      category: row.category || "",
      amount: row.amount || "",
      expenseDate: row.expenseDate ? dayjs(row.expenseDate) : dayjs(),
      description: cleanDescription === "No description provided." ? "" : cleanDescription,
      submittedBy: row.submittedBy || "",
      status: row.status || "Pending",
      attachment: resolvedUrl || rawFile,
      attachmentName: displayName,
    };
    setForm(editFormData);
    savedFormRef.current = editFormData;
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteRequest = (row) => {
    if (!canDeleteExpense) {
      toast.error("You do not have permission to delete expenses.");
      return;
    }
    const s = (row.status || "").toLowerCase();
    if (s.includes("verif") || s.includes("approv") || s.includes("paid")) {
      toast.warning("Verified expense cannot be deleted.");
      return;
    }
    setExpenseToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDeleteExpense) {
      toast.error("You do not have permission to delete expenses.");
      return;
    }
    if (!expenseToDelete) return;
    const expenseId = expenseToDelete.expenseId || expenseToDelete.id;

    try {
      await deleteExpenseAsync(expenseId);
      toast.success(TOAST_MESSAGES.EXPENSES.DELETED_SUCCESS || TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
      await fetchExpensesFromDb();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.DELETE_FAILED);
      await fetchExpensesFromDb();
    } finally {
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleImageChange = (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
        return;
      }

      const MAX_SIZE = 6 * 1024 * 1024; // 6MB limit
      if (file.size > MAX_SIZE) {
        toast.error("Image size exceeds maximum limit of 6 MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        setForm((c) => ({
          ...c,
          attachment: uploadEvt.target.result,
          attachmentName: file.name,
        }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.attachment;
          return next;
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to process attachment");
    }
  };

  const handleRemoveAttachment = (e) => {
    if (e) e.stopPropagation();
    setForm((c) => ({
      ...c,
      attachment: "",
      attachmentName: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadImage = (dataUrl, fileName = "expense_receipt.png") => {
    if (!dataUrl) return;
    try {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image downloaded successfully!");
    } catch {
      toast.error("Could not download image");
    }
  };

  const handleSaveExpense = async () => {
    if (editingExpense && !canEditExpense) {
      toast.error("You do not have permission to edit expenses.");
      return;
    }
    if (!editingExpense && !canAddExpense) {
      toast.error("You do not have permission to add expenses.");
      return;
    }
    const newErrors = {};
    if (!form.eventName) newErrors.eventName = "This field is required";
    if (!form.category) newErrors.category = "This field is required";
    if (!form.amount || !String(form.amount).trim() || Number(form.amount) <= 0 || isNaN(Number(form.amount))) {
      newErrors.amount = "This field is required";
    } else if (String(form.amount).length > 6) {
      newErrors.amount = "Amount cannot exceed 6 digits";
    }
    if (!form.expenseDate) {
      newErrors.expenseDate = "This field is required";
    } else if (dayjs(form.expenseDate).isAfter(dayjs(), "day")) {
      newErrors.expenseDate = "Future date is not allowed";
    }
    if (!form.submittedBy) newErrors.submittedBy = "This field is required";
    if (!form.description || !form.description.trim()) newErrors.description = "This field is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        eventId: form.eventId || undefined,
        eventName: form.eventName,
        category: form.category,
        amount: Number(form.amount),
        expenseDate: form.expenseDate ? form.expenseDate.toISOString() : new Date().toISOString(),
        status: editingExpense ? (editingExpense.status || "Pending") : (form.status || "Pending"),
        submittedBy: form.submittedBy,
        approvedBy: editingExpense ? (editingExpense.approvedBy || "-") : "-",
        description: form.description.trim(),
        fileName: form.attachmentName || (editingExpense ? (editingExpense.fileName || "") : ""),
        fileData: form.attachment || (editingExpense ? (editingExpense.fileName?.startsWith("data:") ? editingExpense.fileName : null) : null),
      };

      if (editingExpense) {
        const expenseId = editingExpense.expenseId || editingExpense.id;
        await updateExpenseAsync(expenseId, {
          ...payload,
          modifiedOn: editingExpense.modifiedOn || null,
        });
        if (isOverBudget) {
          toast.success(`Expense updated. Note: Exceeds expected budget by ${formatWholeCurrency(projectedExtraSpent)}`);
        } else {
          toast.success(TOAST_MESSAGES.EXPENSES.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
        }
      } else {
        await createExpenseAsync(payload);
        if (isOverBudget) {
          toast.success(`Expense added. Note: Exceeds expected budget by ${formatWholeCurrency(projectedExtraSpent)}`);
        } else {
          toast.success(TOAST_MESSAGES.EXPENSES.CREATED_SUCCESS || TOAST_MESSAGES.GENERAL.CREATED_SUCCESS);
        }
      }

      setDialogOpen(false);
      setEditingExpense(null);
      setForm(initialForm);
      savedFormRef.current = null;
      setErrors({});
      await fetchExpensesFromDb();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
      if (err?.response?.status === 404 || err?.response?.status === 409) {
        setDialogOpen(false);
        setEditingExpense(null);
        setForm(initialForm);
        savedFormRef.current = null;
        setErrors({});
        await fetchExpensesFromDb();
      }
    }
  };

  const handleOpenStatusDialog = (row) => {
    if (!canVerifyExpense) {
      toast.error("You do not have permission to verify expenses.");
      return;
    }
    const s = (row.status || "").toLowerCase();
    if (s.includes("verif") || s.includes("approv") || s.includes("paid")) {
      toast.info("This expense has already been verified.");
      return;
    }
    setStatusExpense(row);
    // Do not auto select status - user must select explicitly
    setNewStatus("");
    setStatusErrors({});

    const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "Admin";
    setReviewerName(row.approvedBy && row.approvedBy !== "-" ? row.approvedBy : currentUserName);
    setStatusRemarks("");
    setStatusDialogOpen(true);
  };

  const handleUpdateExpenseStatus = async () => {
    if (!canVerifyExpense) {
      toast.error("You do not have permission to verify expenses.");
      return;
    }
    if (!statusExpense) return;
    if (!newStatus || !newStatus.trim()) {
      setStatusErrors({ status: "Decision / Status is required" });
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }
    const expenseId = statusExpense.expenseId || statusExpense.id;
    try {
      const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "Admin";
      const isPendingState = newStatus.trim().toLowerCase() === "pending";
      const approvedByVal = isPendingState ? "-" : (reviewerName.trim() || currentUserName);
      const { cleanDescription } = parseExpenseDescription(statusExpense.description || "");
      const baseDesc = cleanDescription === "No description provided." ? "" : cleanDescription;
      let updatedDescription = baseDesc;
      if (statusRemarks && statusRemarks.trim()) {
        const timestamp = dayjs().format("DD MMM YYYY, hh:mm A");
        const userTag = approvedByVal && approvedByVal !== "-" ? approvedByVal : currentUserName;
        updatedDescription = baseDesc
          ? `${baseDesc}\n[Status Note - ${newStatus} (${timestamp}) by ${userTag}]: ${statusRemarks.trim()}`
          : `[Status Note - ${newStatus} (${timestamp}) by ${userTag}]: ${statusRemarks.trim()}`;
      }

      const safeExpenseDate = statusExpense.rawExpenseDate || (statusExpense.expenseDate ? `${statusExpense.expenseDate}T00:00:00.000Z` : new Date().toISOString());

      await updateExpenseAsync(expenseId, {
        eventName: statusExpense.eventName,
        category: statusExpense.category,
        amount: Number(statusExpense.amount),
        expenseDate: safeExpenseDate,
        status: newStatus,
        submittedBy: statusExpense.submittedBy,
        approvedBy: approvedByVal,
        description: updatedDescription,
        fileName: statusExpense.fileName || "",
        fileData: statusExpense.fileName?.startsWith("data:") ? statusExpense.fileName : null,
        modifiedOn: statusExpense.modifiedOn || null,
      });

      // Optimistically update table data so status and reviewer change immediately
      const nowIso = new Date().toISOString();
      setExpenses((prev) =>
        prev.map((item) =>
          (item.expenseId === expenseId || item.id === expenseId)
            ? {
              ...item,
              status: newStatus,
              approvedBy: approvedByVal,
              description: updatedDescription,
              modifiedOn: nowIso,
            }
            : item
        )
      );

      if (!isPendingState) {
        toast.success(`Expense ${newStatus.toLowerCase().includes("verif") ? "verified" : "updated"} successfully!`);
      } else {
        toast.success(`Expense status updated to ${newStatus}!`);
      }
      setStatusDialogOpen(false);
      setStatusExpense(null);
      setStatusRemarks("");
      await fetchExpensesFromDb();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
      if (err?.response?.status === 404 || err?.response?.status === 409) {
        setStatusDialogOpen(false);
        setStatusExpense(null);
        setStatusRemarks("");
        await fetchExpensesFromDb();
      }
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => {
        const statusLower = (row.status || "").toLowerCase();
        const isVerified = statusLower.includes("verif") || statusLower.includes("approv") || statusLower.includes("paid");

        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title={canViewExpense ? "View Details" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewExpense ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3, opacity: !canViewExpense ? 0.38 : 1 }}
                  disabled={!canViewExpense}
                  onClick={() => {
                    if (!canViewExpense) return;
                    setSelectedExpense(row);
                    setViewDialogOpen(true);
                  }}
                >
                  <ViewIcon
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) =>
                        canViewExpense
                          ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")
                          : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8"),
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isVerified ? "Expense already verified" : canVerifyExpense ? "Verify" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: (!canVerifyExpense || isVerified) ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3, opacity: (!canVerifyExpense || isVerified) ? 0.38 : 1 }}
                  disabled={!canVerifyExpense || isVerified}
                  onClick={() => handleOpenStatusDialog(row)}
                >
                  <StatusActionIcon
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) =>
                        canVerifyExpense && !isVerified
                          ? theme.palette.mode === "dark"
                            ? "#ffffff"
                            : "#4a3f6b"
                          : theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.45)"
                            : "#94a3b8",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isVerified ? "Verified expense cannot be edited" : canEditExpense ? "Edit" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: (!canEditExpense || isVerified) ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3, opacity: (!canEditExpense || isVerified) ? 0.38 : 1 }}
                  disabled={!canEditExpense || isVerified}
                  onClick={() => handleEditExpense(row)}
                >
                  <EditIcon
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) =>
                        canEditExpense && !isVerified
                          ? theme.palette.mode === "dark"
                            ? "#ffffff"
                            : "#4a3f6b"
                          : theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.45)"
                            : "#94a3b8",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isVerified ? "Verified expense cannot be deleted" : canDeleteExpense ? "Delete" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: (!canDeleteExpense || isVerified) ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3, opacity: (!canDeleteExpense || isVerified) ? 0.38 : 1 }}
                  disabled={!canDeleteExpense || isVerified}
                  onClick={() => handleDeleteRequest(row)}
                >
                  <DeleteIcon
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) =>
                        canDeleteExpense && !isVerified
                          ? theme.palette.mode === "dark"
                            ? "#ffffff"
                            : "#4a3f6b"
                          : theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.45)"
                            : "#94a3b8",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      label: "Expense ID",
      key: "id",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
          {row.id}
        </Typography>
      ),
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>
          {row.eventName}
        </Typography>
      ),
    },
    {
      label: "Category",
      key: "category",
    },
    {
      label: "Amount",
      key: "amount",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {formatWholeCurrency(row.amount)}
        </Typography>
      ),
    },
    {
      label: "Expense Date",
      key: "expenseDate",
      render: (row) => formatGridDate(row.expenseDate),
    },
    {
      label: "Status",
      key: "status",
      render: (row) => {
        const s = (row.status || "").toLowerCase();
        const isApprovedOrVerified = s.includes("verif") || s.includes("approv") || s.includes("paid");
        const isPending = s.includes("pending");
        return (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              bgcolor: isApprovedOrVerified
                ? "rgba(22, 163, 74, 0.1)"
                : isPending
                  ? "rgba(234, 179, 8, 0.12)"
                  : "rgba(220, 38, 38, 0.1)",
              color: isApprovedOrVerified ? "#16a34a" : isPending ? "#d97706" : "#dc2626",
              border: isApprovedOrVerified
                ? "1px solid rgba(22, 163, 74, 0.25)"
                : isPending
                  ? "1px solid rgba(234, 179, 8, 0.25)"
                  : "1px solid rgba(220, 38, 38, 0.25)",
              px: 1.2,
              py: 0.3,
              borderRadius: "12px",
              fontSize: "0.75rem",
              display: "inline-block",
            }}
          >
            {row.status}
          </Typography>
        );
      },
    },
    {
      label: "Attachment",
      key: "attachment",
      render: (row) => {
        const rawFile = row.attachment || row.fileName || row.fileUrl;
        if (!rawFile) {
          return (
            <Typography variant="body2" color="text.secondary">
              --
            </Typography>
          );
        }
        const url = resolveAttachmentUrl(rawFile);
        const displayName = getAttachmentDisplayName(rawFile) || `${row.id || "EXP"}_receipt.png`;
        const isPdf = isPdfFile(rawFile);

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Tooltip title={isPdf ? "Click to view PDF" : "Click to preview image"}>
              <Box
                onClick={() => {
                  if (isPdf) {
                    window.open(url, "_blank");
                  } else {
                    openImagePreview(url, `${row.id || "Expense"} - Receipt Attachment`);
                  }
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {isPdf ? (
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "6px",
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      "&:hover": { transform: "scale(1.1)" },
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 18, color: "#ef4444" }} />
                  </Box>
                ) : (
                  <Box
                    component="img"
                    src={url}
                    alt="Receipt"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "6px",
                      objectFit: "cover",
                      border: "1px solid rgba(0,0,0,0.15)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      "&:hover": { transform: "scale(1.15)", boxShadow: "0 3px 8px rgba(0,0,0,0.2)" },
                      transition: "all 0.15s ease",
                    }}
                  />
                )}
              </Box>
            </Tooltip>
            <Tooltip title="Download Receipt">
              <IconButton
                size="small"
                sx={{ p: 0.2 }}
                onClick={() => handleDownloadImage(url, displayName)}
              >
                <DownloadIcon sx={{ fontSize: 16, color: "#0284c7" }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      label: "Submitted By",
      key: "submittedBy",
    },
    {
      label: "Approved By",
      key: "approvedBy",
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.approvedBy || "--"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.createdBy || row.CreatedBy || "--"}
        </Typography>
      ),
    },
    {
      label: "Created On",
      key: "createdOn",
      render: (row) => formatGridDate(row.createdOn || row.CreatedOn || row.createdAt || row.CreatedAt),
    },
  ];

  return (
    <div className="page-shell">
      {/* Event Budget Tracking Summary Widget */}
      {pageBudgetSummary && (
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            borderRadius: 2.5,
            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(30, 41, 59, 0.7)" : "#ffffff",
            border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(226, 232, 240, 0.8)"}`,
            boxShadow: (t) => t.palette.mode === "dark" ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 2px 12px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.875rem", color: "text.primary" }}>
              Budget Tracking Summary {pageBudgetSummary.isSpecificEvent ? `— ${pageBudgetSummary.title}` : `(All Events)`}
            </Typography>
            {pageBudgetSummary.extraSpent > 0 && (
              <Chip
                size="small"
                label={`Budget Exceeded by ${formatWholeCurrency(pageBudgetSummary.extraSpent)}`}
                sx={{
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(124, 58, 237, 0.1)" : "rgba(124, 58, 237, 0.04)", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
                  {COMMON_STRINGS.EXPENSES?.EXPECTED_BUDGET || "Expected Budget"}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.1rem" }}>
                  {formatWholeCurrency(pageBudgetSummary.expected)}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(2, 132, 199, 0.1)" : "rgba(2, 132, 199, 0.04)", border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
                  {COMMON_STRINGS.EXPENSES?.TOTAL_SPENT || "Total Spent"}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "info.main", fontSize: "1.1rem" }}>
                  {formatWholeCurrency(pageBudgetSummary.spent)}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
                  {COMMON_STRINGS.EXPENSES?.REMAINING_BUDGET || "Remaining Budget"}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: pageBudgetSummary.remaining > 0 ? "success.main" : "text.secondary", fontSize: "1.1rem" }}>
                  {formatWholeCurrency(pageBudgetSummary.remaining)}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => pageBudgetSummary.extraSpent > 0 ? (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.05)") : (t.palette.mode === "dark" ? "rgba(100, 116, 139, 0.1)" : "rgba(100, 116, 139, 0.04)"), border: (t) => pageBudgetSummary.extraSpent > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(100, 116, 139, 0.2)" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
                  {COMMON_STRINGS.EXPENSES?.EXTRA_AMOUNT_SPENT || "Extra Amount Spent"}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: pageBudgetSummary.extraSpent > 0 ? "error.main" : "text.secondary", fontSize: "1.1rem" }}>
                  {formatWholeCurrency(pageBudgetSummary.extraSpent)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
      <AppDataTable
        title="Expense Details"
        columns={columns}
        data={filteredExpenses}
        loading={loading}
        allowExport={canExportExpense}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="contained"
              size="small"
              disabled={!canAddExpense}
              startIcon={<AddIcon />}
              onClick={() => {
                if (!canAddExpense) {
                  toast.error("You do not have permission to add expenses.");
                  return;
                }
                const currentUserName = loggedInUserName || authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "";
                const addFormData = {
                  ...initialForm,
                  submittedBy: currentUserName,
                };
                setEditingExpense(null);
                setForm(addFormData);
                savedFormRef.current = addFormData;
                setErrors({});
                setDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          </Stack>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 180 }}>
                <AppSelect
                  label="Select Event Type"
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value || "ALL");
                    setFilterEvent("ALL");
                  }}
                  onClear={() => {
                    setFilterCategory("ALL");
                    setFilterEvent("ALL");
                  }}
                  options={categoryOptions}
                  size="small"
                  placeholder="Select Event Type"
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <AppSelect
                  label="Select Event Name"
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value || "ALL");
                  }}
                  onClear={() => setFilterEvent("ALL")}
                  options={eventOptions}
                  size="small"
                  placeholder="Select Event Name"
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label="Select Status"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value || "ALL");
                  }}
                  onClear={() => setFilterStatus("ALL")}
                  options={statusOptions}
                  size="small"
                  placeholder="Select Status"
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setAppliedEvent(filterEvent);
                  setAppliedCategory(filterCategory);
                  setAppliedStatus(filterStatus);
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
                  setFilterEvent("ALL");
                  setFilterCategory("ALL");
                  setFilterStatus("ALL");
                  setAppliedEvent("ALL");
                  setAppliedCategory("ALL");
                  setAppliedStatus("ALL");
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
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                  },
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
          </Grid>
        }
      />

      {/* Add / Edit Expense Dialog (Shared Component) */}
      <ExpenseFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSaved={fetchExpensesFromDb}
        editingExpense={editingExpense}
        events={eventsList}
        eventTypes={eventTypesList}
        members={membersList}
      />

      {/* Confirm Delete Dialog */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Expense"
        content={
          expenseToDelete
            ? `Are you sure you want to delete this expense record (${expenseToDelete.id || expenseToDelete.expenseId})?`
            : "Are you sure you want to delete this expense record?"
        }
        confirmText="Delete"
        confirmColor="error"
      />

      {/* View Expense Details Dialog */}
      <AppDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedExpense(null);
        }}
        title="Expense Details"
        maxWidth="sm"
        actions={
          <AppButton variant="contained" onClick={() => setViewDialogOpen(false)}>
            Close
          </AppButton>
        }
      >
        {selectedExpense && (() => {
          const parsed = parseExpenseDescription(selectedExpense.description);
          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pb: 1.5,
                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Expense ID
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    color={(t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")}
                  >
                    {selectedExpense.id}
                  </Typography>
                </Box>
                <Chip
                  label={selectedExpense.status}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    bgcolor: (() => {
                      const s = (selectedExpense.status || "").toLowerCase();
                      if (s.includes("verif") || s.includes("approv") || s.includes("paid")) return "rgba(22, 163, 74, 0.12)";
                      if (s.includes("pending")) return "rgba(234, 179, 8, 0.12)";
                      return "rgba(220, 38, 38, 0.12)";
                    })(),
                    color: (() => {
                      const s = (selectedExpense.status || "").toLowerCase();
                      if (s.includes("verif") || s.includes("approv") || s.includes("paid")) return "#16a34a";
                      if (s.includes("pending")) return "#d97706";
                      return "#dc2626";
                    })(),
                    border: (() => {
                      const s = (selectedExpense.status || "").toLowerCase();
                      if (s.includes("verif") || s.includes("approv") || s.includes("paid")) return "1px solid rgba(22, 163, 74, 0.25)";
                      if (s.includes("pending")) return "1px solid rgba(234, 179, 8, 0.25)";
                      return "1px solid rgba(220, 38, 38, 0.25)";
                    })(),
                  }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.3 }}>
                    Event Type
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.875rem" }}>
                    {selectedExpense.category || selectedExpense.eventTypeName || "--"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.3 }}>
                    Event Name
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.875rem" }}>
                    {selectedExpense.eventName || "--"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.3 }}>
                    Amount
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    sx={{ color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#1e293b"), fontSize: "1.05rem" }}
                  >
                    {formatWholeCurrency(selectedExpense.amount)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.3 }}>
                    Expense Date
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.875rem" }}>
                    {formatViewDate(selectedExpense.expenseDate)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.3 }}>
                    Submitted By
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.875rem" }}>
                    {selectedExpense.submittedBy || "--"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.3 }}>
                    Approved By
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary", fontSize: "0.875rem" }}>
                    {selectedExpense.approvedBy && selectedExpense.approvedBy !== "-" ? selectedExpense.approvedBy : "--"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                    Description
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      p: 1.25,
                      borderRadius: "10px",
                      border: (t) => `1px solid ${t.palette.divider}`,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "text.primary",
                      fontSize: "0.85rem",
                    }}
                  >
                    {parsed.cleanDescription}
                  </Typography>
                </Grid>
                {parsed.verifiedNote && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                      Remarks
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        bgcolor: (t) =>
                          t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                        p: 1.25,
                        borderRadius: "10px",
                        border: (t) => `1px solid ${t.palette.divider}`,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "text.primary",
                        fontSize: "0.85rem",
                      }}
                    >
                      {parsed.verifiedNote}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          );
        })()}
      </AppDialog>

      {/* Image Preview / Lightbox Modal */}
      <Dialog
        open={previewImageModal.open}
        onClose={() => setPreviewImageModal({ open: false, url: "", title: "" })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
            bgcolor: "background.paper",
            p: 1.5,
          },
        }}
      >
        <DialogTitle sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {previewImageModal.title || "Receipt Attachment Preview"}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <AppButton
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={() => handleDownloadImage(previewImageModal.url, `${(previewImageModal.title || "receipt").replace(/[^a-zA-Z0-9_-]/g, "_")}.png`)}
            >
              Download
            </AppButton>
            <IconButton size="small" onClick={() => setPreviewImageModal({ open: false, url: "", title: "" })}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "#f8fafc", borderRadius: "10px" }}>
          {previewImageModal.url && (
            <Box
              component="img"
              src={previewImageModal.url}
              alt="Full Preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dedicated Verify Expense Modal */}
      <AppDialog
        open={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setStatusExpense(null);
          setStatusRemarks("");
        }}
        title="Verify"
        maxWidth="sm"
        actions={
          <Stack direction="row" spacing={1.5}>
            <AppButton
              variant="outlined"
              onClick={() => {
                setStatusDialogOpen(false);
                setStatusExpense(null);
                setStatusRemarks("");
              }}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              onClick={handleUpdateExpenseStatus}
            >
              {newStatus.toLowerCase().includes("verif")
                ? "Verify Expense"
                : newStatus.toLowerCase().includes("approv")
                  ? "Approve Expense"
                  : "Save Status"}
            </AppButton>
          </Stack>
        }
      >
        {statusExpense && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Expense Summary Card */}
            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                border: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Event Name
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {statusExpense.eventName || "--"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Current Status
                  </Typography>
                  <Box sx={{ mt: 0.2 }}>
                    <Chip
                      label={statusExpense.status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: (() => {
                          const s = (statusExpense.status || "").toLowerCase();
                          if (s.includes("verif") || s.includes("approv") || s.includes("paid")) return "rgba(22, 163, 74, 0.12)";
                          if (s.includes("pending")) return "rgba(234, 179, 8, 0.15)";
                          return "rgba(220, 38, 38, 0.12)";
                        })(),
                        color: (() => {
                          const s = (statusExpense.status || "").toLowerCase();
                          if (s.includes("verif") || s.includes("approv") || s.includes("paid")) return "#16a34a";
                          if (s.includes("pending")) return "#d97706";
                          return "#dc2626";
                        })(),
                      }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: "#16a34a" }}>
                    {formatWholeCurrency(statusExpense.amount || 0)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Submitted By
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {statusExpense.submittedBy || "--"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppSelect
                  label="Decision / Status"
                  placeholder="Select Status"
                  value={newStatus}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setNewStatus(chosen);
                    if (statusErrors.status) setStatusErrors((prev) => ({ ...prev, status: "" }));
                    if (chosen && chosen !== "Pending" && (!reviewerName || reviewerName === "-")) {
                      const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "Admin";
                      setReviewerName(currentUserName);
                    }
                  }}
                  options={verificationStatusOptions}
                  error={!!statusErrors.status}
                  helperText={statusErrors.status}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppInput
                  label="Verified By / Reviewer"
                  value={reviewerName}
                  disabled
                  placeholder="Reviewer name"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AppTextArea
                  label="Remarks / Verification Notes"
                  placeholder="Enter remarks or verification notes (optional)..."
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  minRows={3}
                  maxLength={500}
                  showCount
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </AppDialog>
      <UnsavedChangesDialog />
    </div>
  );
}

