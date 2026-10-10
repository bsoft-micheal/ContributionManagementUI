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

  // Dedicated Status Update / Approval dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusExpense, setStatusExpense] = useState(null);
  const [newStatus, setNewStatus] = useState("Pending");
  const [reviewerName, setReviewerName] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");

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

      let finalStatuses = Array.isArray(statusesRes) && statusesRes.length > 0 ? statusesRes : [];
      if (finalStatuses.length === 0) {
        // Fallback: fetch active statuses and filter locally for module === "Expense"
        const allStatuses = await getStatusesAsync(true).catch(() => []);
        if (Array.isArray(allStatuses)) {
          finalStatuses = allStatuses.filter(
            (s) => s.module && s.module.trim().toLowerCase() === "expense"
          );
        }
      }
      setStatusesList(finalStatuses);
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
        const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "";
        const matched = membersList.find((m) => {
          const mName = (m.name || m.memberName || "").trim().toLowerCase();
          return mName === currentUserName.trim().toLowerCase();
        });
        setEditingExpense(null);
        setFormImageError(false);
        setForm({
          ...initialForm,
          eventName: location.state.eventName || "",
          category: location.state.category || "",
          submittedBy: matched ? (matched.name || matched.memberName) : currentUserName,
        });
        setErrors({});
        setDialogOpen(true);
      }
    }
  }, [location.state, membersList, authState]);

  // Filter panel status options (including "All Statuses")
  const statusOptions = useMemo(() => {
    const list = (statusesList || []).map((s) => s.statusName);
    const base = list.length > 0 ? list : ["Pending", "Verify"];
    const set = new Set(["ALL", ...base]);
    return Array.from(set).map((s) => ({
      label: s === "ALL" ? "All Statuses" : s,
      value: s,
    }));
  }, [statusesList]);

  // Form status options for Add/Edit dialog
  const dynamicStatusOptions = useMemo(() => {
    const list = (statusesList || []).map((s) => s.statusName);
    const base = list.length > 0 ? list : ["Pending", "Verify"];
    const set = new Set(base);
    if (form.status) set.add(form.status);
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [statusesList, form.status]);

  // Dedicated status options for the Verify / Status dialog
  const verificationStatusOptions = useMemo(() => {
    const list = (statusesList || []).map((s) => s.statusName);
    const base = list.length > 0 ? list : ["Verify", "Pending"];
    const set = new Set(base);
    if (newStatus) set.add(newStatus);
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [statusesList, newStatus]);

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

    const expected = Number(ev.totalExpectedAmount ?? ev.expectedAmount ?? ev.baseAmount ?? 0);
    const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;
    const spent = expenses
      .filter((ex) =>
        (ex.eventName || "").trim().toLowerCase() === (form.eventName || "").trim().toLowerCase() &&
        (!currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId)) &&
        (ex.status || "").toLowerCase() !== "rejected"
      )
      .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);

    const remaining = Math.max(0, expected - spent);
    return { expected, spent, remaining };
  }, [form.eventName, form.eventId, form.category, eventsList, expenses, editingExpense]);

  // True when a budget is set AND entered amount exceeds the remaining limit
  const isOverBudget =
    selectedEventBudget !== null &&
    selectedEventBudget.expected > 0 &&
    Number(form.amount) > 0 &&
    Number(form.amount) > selectedEventBudget.remaining;

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
    return list;
  }, [membersList]);

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
    setEditingExpense(row);
    setFormImageError(false);
    const rawFile = row.fileName || row.fileUrl || "";
    const resolvedUrl = resolveAttachmentUrl(rawFile);
    const displayName = rawFile.startsWith("data:")
      ? `${row.id || "EXP"}_attachment.png`
      : getAttachmentDisplayName(rawFile) || `${row.id || "EXP"}_attachment.png`;

    const editFormData = {
      eventName: row.eventName || "",
      category: row.category || "",
      amount: row.amount || "",
      expenseDate: row.expenseDate ? dayjs(row.expenseDate) : dayjs(),
      description: row.description || "",
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
    } catch {
      toast.error(TOAST_MESSAGES.GENERAL.DELETE_FAILED);
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

      const MAX_SIZE = 3 * 1024 * 1024; // 3MB limit
      if (file.size > MAX_SIZE) {
        toast.error("Image size exceeds maximum limit of 3 MB");
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
        toast.success(`Image "${file.name}" attached successfully!`);
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
    if (!form.eventName) newErrors.eventName = "Event Name is required";
    if (!form.category) newErrors.category = "Event Type is required";
    if (!form.amount || Number(form.amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    } else if (
      selectedEventBudget &&
      selectedEventBudget.expected > 0 &&
      Number(form.amount) > selectedEventBudget.remaining
    ) {
      newErrors.amount = `Amount exceeds balance limit. Max allowable: ₹${selectedEventBudget.remaining.toLocaleString("en-IN")}`;
    }
    if (!form.submittedBy) newErrors.submittedBy = "Submitted by is required";
    if (!form.attachment && (!editingExpense || (!editingExpense.fileName && !editingExpense.fileUrl))) {
      newErrors.attachment = "Attachment (1 Image) is required";
    }
    if (!form.description || !form.description.trim()) newErrors.description = "Description is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.amount && selectedEventBudget && Number(form.amount) > selectedEventBudget.remaining) {
        toast.error(newErrors.amount);
      } else {
        toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      }
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
        await updateExpenseAsync(expenseId, payload);
        toast.success(TOAST_MESSAGES.EXPENSES.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
      } else {
        await createExpenseAsync(payload);
        toast.success(TOAST_MESSAGES.EXPENSES.CREATED_SUCCESS || TOAST_MESSAGES.GENERAL.CREATED_SUCCESS);
      }

      setDialogOpen(false);
      setEditingExpense(null);
      setForm(initialForm);
      savedFormRef.current = null;
      setErrors({});
      await fetchExpensesFromDb();
    } catch (err) {
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  };

  const handleOpenStatusDialog = (row) => {
    if (!canVerifyExpense) {
      toast.error("You do not have permission to verify expenses.");
      return;
    }
    setStatusExpense(row);

    // Determine target verification status from the dynamic Expense module statuses (e.g. "Verify")
    const nonPendingStatus = (statusesList || [])
      .map((s) => s.statusName)
      .find((name) => name && name.toLowerCase() !== "pending") || "Verify";

    const isCurrentPending = !row.status || row.status.trim().toLowerCase() === "pending";
    setNewStatus(isCurrentPending ? nonPendingStatus : row.status);

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
    const expenseId = statusExpense.expenseId || statusExpense.id;
    try {
      const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "Admin";
      const isPendingState = newStatus.trim().toLowerCase() === "pending";
      const approvedByVal = isPendingState ? "-" : (reviewerName.trim() || currentUserName);
      let updatedDescription = statusExpense.description || "";
      if (statusRemarks && statusRemarks.trim()) {
        const timestamp = dayjs().format("DD MMM YYYY, hh:mm A");
        const userTag = approvedByVal && approvedByVal !== "-" ? approvedByVal : currentUserName;
        updatedDescription = updatedDescription
          ? `${updatedDescription}\n[Status Note - ${newStatus} (${timestamp}) by ${userTag}]: ${statusRemarks.trim()}`
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
        toast.success(`Expense ${newStatus.toLowerCase().includes("verify") ? "verified" : "updated"} successfully!`);
      } else {
        toast.success(`Expense status updated to ${newStatus}!`);
      }
      setStatusDialogOpen(false);
      setStatusExpense(null);
      setStatusRemarks("");
      await fetchExpensesFromDb();
    } catch (err) {
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={canViewExpense ? "View Details" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canViewExpense ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
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
          <Tooltip title={canVerifyExpense ? "Verify" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canVerifyExpense ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canVerifyExpense}
                onClick={() => handleOpenStatusDialog(row)}
              >
                <StatusActionIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canVerifyExpense
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
          <Tooltip title={canEditExpense ? "Edit" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canEditExpense ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canEditExpense}
                onClick={() => handleEditExpense(row)}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canEditExpense
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
          <Tooltip title={canDeleteExpense ? "Delete" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canDeleteExpense ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canDeleteExpense}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canDeleteExpense
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
      ),
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
          ₹{Number(row.amount).toLocaleString("en-IN")}
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
        const isApprovedOrVerified = s.includes("verify") || s.includes("approved") || s.includes("paid");
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
                const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "";
                const matched = membersList.find((m) => {
                  const mName = (m.name || m.memberName || "").trim().toLowerCase();
                  return mName === currentUserName.trim().toLowerCase();
                });
                const addFormData = {
                  ...initialForm,
                  submittedBy: matched ? (matched.name || matched.memberName) : currentUserName,
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
                    setFilterCategory(e.target.value);
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
                    setFilterEvent(e.target.value);
                  }}
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
                    setFilterStatus(e.target.value);
                  }}
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

      {/* Add / Edit Expense Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => handleCancelRequest(handleCloseDialog)}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isOverBudget && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700, fontSize: "0.75rem" }}>
                ⚠ Amount exceeds balance limit (₹{selectedEventBudget.remaining.toLocaleString("en-IN")})
              </Typography>
            )}
            <AppButton
              variant="outlined"
              onClick={() => handleCancelRequest(handleCloseDialog)}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              onClick={handleSaveExpense}
              disabled={isOverBudget}
              sx={isOverBudget ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              {editingExpense ? "Update" : "Save"}
            </AppButton>
          </Stack>
        }
      >
        <Grid container spacing={2}>
          {/* 1. Event Type FIRST */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Type"
              placeholder="Select Event Type"
              value={form.category}
              onChange={(e) => {
                const selectedType = e.target.value;
                setForm((c) => {
                  const matchingEvents = eventsList.filter((ev) => {
                    const eventCat =
                      ev.eventTypeName ||
                      ev.category ||
                      eventTypesList.find((t) => t.eventTypeId === ev.eventTypeId)?.eventTypeName;
                    return (
                      eventCat &&
                      eventCat.trim().toLowerCase() === selectedType.trim().toLowerCase()
                    );
                  });
                  const stillMatches = matchingEvents.some(
                    (ev) => (ev.name || ev.eventName) === c.eventName
                  );
                  return {
                    ...c,
                    category: selectedType,
                    eventName: stillMatches ? c.eventName : "",
                  };
                });
                if (errors.category) setErrors((p) => ({ ...p, category: "" }));
              }}
              options={formEventTypeOptions}
              error={!!errors.category}
              helperText={errors.category}
              required
            />
          </Grid>

          {/* 2. Event NEXT (loaded/filtered against selected Event Type) */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              placeholder={form.category ? "Select Event Name" : "Select Event Type first"}
              value={form.eventName}
              onChange={(e) => {
                const selectedEventName = e.target.value;
                setForm((c) => {
                  let autoCategory = c.category;
                  if (!autoCategory) {
                    const matchedEv = eventsList.find(
                      (ev) => (ev.name || ev.eventName) === selectedEventName
                    );
                    if (matchedEv) {
                      autoCategory =
                        matchedEv.eventTypeName ||
                        matchedEv.category ||
                        eventTypesList.find((t) => t.eventTypeId === matchedEv.eventTypeId)
                          ?.eventTypeName ||
                        "";
                    }
                  }
                  let clampedAmount = c.amount;
                  const matchedEv = eventsList.find((ev) => {
                    const nameMatch = (ev.name || ev.eventName || "").trim().toLowerCase() === (selectedEventName || "").trim().toLowerCase();
                    if (!nameMatch) return false;
                    if (autoCategory) {
                      const cat = ev.eventTypeName || ev.category || "";
                      return cat.trim().toLowerCase() === autoCategory.trim().toLowerCase();
                    }
                    return true;
                  });

                  if (c.amount && matchedEv) {
                    const expAmt = Number(matchedEv.totalExpectedAmount ?? matchedEv.expectedAmount ?? matchedEv.baseAmount ?? 0);
                    if (expAmt > 0) {
                      const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;
                      const spentAmt = expenses
                        .filter((ex) =>
                          (ex.eventName || "").trim().toLowerCase() === (selectedEventName || "").trim().toLowerCase() &&
                          (!currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId)) &&
                          (ex.status || "").toLowerCase() !== "rejected"
                        )
                        .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);
                      const remAmt = Math.max(0, expAmt - spentAmt);
                      if (Number(c.amount) > remAmt) {
                        clampedAmount = remAmt > 0 ? String(remAmt) : "";
                      }
                    }
                  }

                  return {
                    ...c,
                    eventId: matchedEv ? (matchedEv.eventId || matchedEv.id || "") : "",
                    eventName: selectedEventName,
                    category: autoCategory,
                    amount: clampedAmount,
                  };
                });
                if (errors.eventName) setErrors((p) => ({ ...p, eventName: "" }));
              }}
              options={formEventOptions}
              error={!!errors.eventName}
              helperText={errors.eventName}
              required
            />
          </Grid>

          {/* Budget Info Card for Selected Event */}
          {selectedEventBudget && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(124, 58, 237, 0.08)" : "rgba(124, 58, 237, 0.04)",
                  border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(124, 58, 237, 0.25)" : "rgba(124, 58, 237, 0.18)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    {COMMON_STRINGS.EXPENSES?.EXPECTED_BUDGET || "Expected Budget"}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                    ₹{selectedEventBudget.expected.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    {COMMON_STRINGS.EXPENSES?.ALREADY_SPENT || "Already Spent"}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "warning.main" }}>
                    ₹{selectedEventBudget.spent.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    {COMMON_STRINGS.EXPENSES?.BALANCE_LIMIT || "Balance Limit"}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: selectedEventBudget.remaining > 0 ? "success.main" : "error.main" }}>
                    ₹{selectedEventBudget.remaining.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Amount"
              placeholder="₹ Enter amount"
              value={form.amount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setForm((c) => ({ ...c, amount: "" }));
                  setErrors((p) => ({ ...p, amount: "" }));
                  return;
                }

                const numVal = Number(raw);
                const hasBudgetLimit = selectedEventBudget && selectedEventBudget.expected > 0;

                if (hasBudgetLimit) {
                  if (selectedEventBudget.remaining <= 0) {
                    setForm((c) => ({ ...c, amount: "" }));
                    setErrors((p) => ({
                      ...p,
                      amount: "Budget fully spent — ₹0 balance remaining for this event",
                    }));
                    return;
                  }

                  if (numVal > selectedEventBudget.remaining) {
                    // Strictly clamp to maximum allowable remaining budget
                    setForm((c) => ({ ...c, amount: String(selectedEventBudget.remaining) }));
                    setErrors((p) => ({
                      ...p,
                      amount: `Exceeds balance limit — max allowable ₹${selectedEventBudget.remaining.toLocaleString("en-IN")}`,
                    }));
                    return;
                  }
                }

                setForm((c) => ({ ...c, amount: raw }));
                setErrors((p) => ({ ...p, amount: "" }));
              }}
              restrictType="numberonly"
              error={isOverBudget || !!errors.amount}
              helperText={
                errors.amount ||
                (selectedEventBudget && selectedEventBudget.expected > 0
                  ? `Max allowable: ₹${selectedEventBudget.remaining.toLocaleString("en-IN")}`
                  : undefined)
              }
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateInput
              label="Expense Date"
              value={form.expenseDate}
              onChange={(newVal) => {
                setForm((c) => ({ ...c, expenseDate: newVal }));
                if (errors.expenseDate) setErrors((p) => ({ ...p, expenseDate: "" }));
              }}
              required
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <AppSelect
              label="Submitted By"
              placeholder="Select Member"
              value={form.submittedBy}
              onChange={(e) => {
                setForm((c) => ({ ...c, submittedBy: e.target.value }));
                if (errors.submittedBy) setErrors((p) => ({ ...p, submittedBy: "" }));
              }}
              options={memberOptions}
              error={!!errors.submittedBy}
              helperText={errors.submittedBy}
              required
            />
          </Grid>

          {/* Attachment Bar - Identical to Support Tickets */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: (t) => t.palette.mode === "dark" ? "#e2e8f0" : "#334155" }}>
                  Attachment (1 Image, Max 3MB) <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                {form.attachment && (
                  <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 700, fontSize: "0.7rem" }}>
                    ✓ Image Attached
                  </Typography>
                )}
              </Box>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: "none" }}
              />

              {!form.attachment ? (
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: errors.attachment ? "1.5px dashed #ef4444" : "1.5px dashed",
                    borderColor: errors.attachment
                      ? "#ef4444"
                      : ((t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)"),
                    borderRadius: "10px",
                    p: 1.1,
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    cursor: "pointer",
                    bgcolor: errors.attachment
                      ? "rgba(239, 68, 68, 0.05)"
                      : ((t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)"),
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: errors.attachment
                        ? "#dc2626"
                        : ((t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
                      bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.07)",
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 20, color: errors.attachment ? "#ef4444" : ((t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b") }} />
                  <Typography variant="caption" fontWeight={600} sx={{ color: errors.attachment ? "#ef4444" : "text.secondary" }}>
                    Click to attach image (Max 3MB)
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 0.6,
                    px: 1,
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: "10px",
                    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                    minHeight: 46,
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", overflow: "hidden" }}
                    onClick={() => openImagePreview(form.attachment, form.attachmentName || `${editingExpense?.id || "EXP"}_attachment.png`)}
                  >
                    <Box
                      component="img"
                      src={form.attachment}
                      alt="Preview"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fb = e.currentTarget.nextSibling;
                        if (fb) fb.style.display = "flex";
                      }}
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "6px",
                        objectFit: "cover",
                        border: "1px solid rgba(0,0,0,0.1)",
                        flexShrink: 0,
                      }}
                    />
                    <Box
                      sx={{
                        display: "none",
                        width: 34,
                        height: 34,
                        borderRadius: "6px",
                        bgcolor: "rgba(74,63,107,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 20, color: "#4a3f6b" }} />
                    </Box>
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="caption" fontWeight={700} sx={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                        {form.attachmentName || "Attached Image"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#0284c7", fontSize: "0.66rem", display: "block" }}>
                        Click to preview
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={0.3}>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => openImagePreview(form.attachment, form.attachmentName || `${editingExpense?.id || "EXP"}_attachment.png`)}>
                        <ViewIcon sx={{ fontSize: 17, color: (t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => handleDownloadImage(form.attachment, form.attachmentName || `${editingExpense?.id || "EXP"}_attachment.png`)}>
                        <DownloadIcon sx={{ fontSize: 17, color: "#0284c7" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Change">
                      <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                        <CloudUploadIcon sx={{ fontSize: 17, color: "#d97706" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={handleRemoveAttachment}>
                        <DeleteIcon sx={{ fontSize: 17, color: "#ef4444" }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              )}
              {errors.attachment && (
                <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 600, mt: 0.3, px: 0.5 }}>
                  {errors.attachment}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Description */}
          <Grid size={{ xs: 12 }}>
            <AppTextArea
              label="Description"
              placeholder="Enter expense description..."
              value={form.description}
              onChange={(e) => {
                setForm((c) => ({ ...c, description: e.target.value }));
                if (errors.description) setErrors((p) => ({ ...p, description: "" }));
              }}
              error={!!errors.description}
              helperText={errors.description}
              minRows={3}
              required
            />
          </Grid>
        </Grid>
      </AppDialog>

      {/* Confirm Delete Dialog */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
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
        {selectedExpense && (
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
                  bgcolor:
                    selectedExpense.status === "Approved"
                      ? "rgba(22, 163, 74, 0.12)"
                      : selectedExpense.status === "Pending"
                        ? "rgba(234, 179, 8, 0.12)"
                        : "rgba(220, 38, 38, 0.12)",
                  color:
                    selectedExpense.status === "Approved"
                      ? "#16a34a"
                      : selectedExpense.status === "Pending"
                        ? "#d97706"
                        : "#dc2626",
                }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Name
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedExpense.eventName}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedExpense.category}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Amount
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  color={(t) => (t.palette.mode === "dark" ? "#ffffff" : "#1e293b")}
                >
                  ₹{Number(selectedExpense.amount).toLocaleString("en-IN")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Expense Date
                </Typography>
                <Typography variant="body2">
                  {formatViewDate(selectedExpense.expenseDate)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Submitted By
                </Typography>
                <Typography variant="body2">{selectedExpense.submittedBy}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Approved By
                </Typography>
                <Typography variant="body2">{selectedExpense.approvedBy || "--"}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: (t) =>
                      t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                    p: 1.5,
                    borderRadius: "8px",
                    border: (t) => `1px solid ${t.palette.divider}`,
                  }}
                >
                  {selectedExpense.description || "No description provided."}
                </Typography>
              </Grid>
              {selectedExpense.fileName && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                    Receipt Attachment
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: "10px",
                      bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
                      onClick={() => openImagePreview(resolveAttachmentUrl(selectedExpense.fileName), `${selectedExpense.id} - Receipt Attachment`)}
                    >
                      <Box
                        component="img"
                        src={resolveAttachmentUrl(selectedExpense.fileName)}
                        alt="Receipt preview"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fb = e.currentTarget.nextSibling;
                          if (fb) fb.style.display = "flex";
                        }}
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: "1px solid rgba(0,0,0,0.12)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          bgcolor: "#fff",
                          "&:hover": { transform: "scale(1.05)" },
                          transition: "transform 0.2s ease",
                        }}
                      />
                      <Box
                        sx={{
                          display: "none",
                          width: 48,
                          height: 48,
                          borderRadius: "8px",
                          bgcolor: "rgba(74,63,107,0.1)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 24, color: "#4a3f6b" }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {getAttachmentDisplayName(selectedExpense.fileName) || "Receipt Attachment"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#0284c7" }}>
                          Click to view enlarged preview
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <AppButton
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon sx={{ fontSize: 16 }} />}
                        onClick={() => openImagePreview(resolveAttachmentUrl(selectedExpense.fileName), `${selectedExpense.id} - Receipt Attachment`)}
                      >
                        Preview
                      </AppButton>
                      <AppButton
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleDownloadImage(resolveAttachmentUrl(selectedExpense.fileName), `${selectedExpense.id}_receipt.png`)}
                      >
                        Download
                      </AppButton>
                    </Stack>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
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
              {newStatus.toLowerCase().includes("verify")
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
                          if (s.includes("verify") || s.includes("approved") || s.includes("paid")) return "rgba(22, 163, 74, 0.12)";
                          if (s.includes("pending")) return "rgba(234, 179, 8, 0.15)";
                          return "rgba(220, 38, 38, 0.12)";
                        })(),
                        color: (() => {
                          const s = (statusExpense.status || "").toLowerCase();
                          if (s.includes("verify") || s.includes("approved") || s.includes("paid")) return "#16a34a";
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
                    ₹{Number(statusExpense.amount || 0).toLocaleString("en-IN")}
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
                    if (chosen !== "Pending" && (!reviewerName || reviewerName === "-")) {
                      const currentUserName = authState?.fullName || authState?.name || authState?.user?.fullName || authState?.user?.name || authState?.username || "Admin";
                      setReviewerName(currentUserName);
                    }
                  }}
                  options={verificationStatusOptions}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppInput
                  label="Verified By / Reviewer"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Enter reviewer name"
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

