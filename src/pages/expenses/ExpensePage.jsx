import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
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
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatGridDate, formatViewDate } from "../../utils/dateHelper";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import { getImageUrl } from "../../services/apiClient";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import {
  getExpensesAsync,
  createExpenseAsync,
  updateExpenseAsync,
  deleteExpenseAsync,
} from "../../services/expenseService";
import { GetEventsAsync } from "../../services/eventService";
import { GetMembersAsync } from "../../services/memberService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import { GetStatusesAsync } from "../../services/statusService";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

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
  eventName: "",
  category: "",
  amount: "",
  expenseDate: dayjs(),
  description: "",
  submittedBy: "",
  status: "Pending",
  fileName: "",
  filePreview: "",
};

const statusOptions = [
  { label: "All Statuses", value: "ALL" },
  { label: "Approved", value: "Approved" },
  { label: "Pending", value: "Pending" },
  { label: "Rejected", value: "Rejected" },
];

export default function ExpensePage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Expense", authState?.role);
  const hasWriteAccess = rights?.write !== undefined ? rights.write : true;
  const toast = useAppToast();
  const fileInputRef = useRef(null);

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

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

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
          expenseDate: item.expenseDate ? dayjs(item.expenseDate).format("YYYY-MM-DD") : "",
          status: item.status || "Pending",
          submittedBy: item.submittedBy || "",
          approvedBy: item.approvedBy || "-",
          description: item.description || "",
          fileName: item.fileName || "",
          fileUrl: item.fileUrl || item.fileName || "",
          createdBy: item.createdBy || item.CreatedBy || "--",
          createdOn: item.createdOn || item.CreatedOn || item.createdAt || item.CreatedAt || null,
          createdAt: item.createdAt || item.CreatedAt || item.createdOn || item.CreatedOn || null,
        }));
        setExpenses(mapped);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error("Failed to load expenses from database:", err);
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [eventsRes, membersRes, eventTypesRes, statusesRes] = await Promise.all([
        GetEventsAsync().catch(() => []),
        GetMembersAsync().catch(() => []),
        GetEventTypesAsync().catch(() => []),
        GetStatusesAsync().catch(() => []),
      ]);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(membersRes)) setMembersList(membersRes);
      if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
      if (Array.isArray(statusesRes)) setStatusesList(statusesRes);
    } catch (err) {
      console.warn("Failed to load events or members lookup data:", err);
    }
  };

  useEffect(() => {
    fetchExpensesFromDb();
    fetchLookupData();
  }, []);

  const dynamicStatusOptions = useMemo(() => {
    if (statusesList && statusesList.length > 0) {
      return statusesList.map((s) => ({ label: s.statusName, value: s.statusName }));
    }
    return [
      { label: "Pending Approval", value: "Pending" },
      { label: "Approved", value: "Approved" },
      { label: "Rejected", value: "Rejected" },
    ];
  }, [statusesList]);

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

    const list = [{ label: form.category ? "Select Event" : "Select Event Type first", value: "" }];
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

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (appliedEvent !== "ALL" && item.eventName !== appliedEvent) return false;
      if (appliedCategory !== "ALL" && item.category !== appliedCategory) return false;
      if (appliedStatus !== "ALL" && item.status !== appliedStatus) return false;
      return true;
    });
  }, [expenses, appliedEvent, appliedCategory, appliedStatus]);

  const handleEditExpense = (row) => {
    setEditingExpense(row);
    const resolvedUrl = resolveAttachmentUrl(row.fileName || row.fileUrl);
    setForm({
      eventName: row.eventName || "",
      category: row.category || "",
      amount: row.amount || "",
      expenseDate: row.expenseDate ? dayjs(row.expenseDate) : dayjs(),
      description: row.description || "",
      submittedBy: row.submittedBy || "",
      status: row.status || "Pending",
      fileName: row.fileName || "",
      filePreview: isImageFile(row.fileName || row.fileUrl)
        ? resolvedUrl
        : row.fileName?.startsWith("data:")
          ? row.fileName
          : "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteRequest = (row) => {
    setExpenseToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    const expenseId = expenseToDelete.expenseId || expenseToDelete.id;

    try {
      await deleteExpenseAsync(expenseId);
      toast.success(TOAST_MESSAGES.EXPENSES.DELETED_SUCCESS || TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
      await fetchExpensesFromDb();
    } catch (err) {
      console.error("Backend delete call failed:", err);
      toast.error(TOAST_MESSAGES.GENERAL.DELETE_FAILED);
    } finally {
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        setForm((c) => ({
          ...c,
          fileName: file.name,
          filePreview: uploadEvt.target.result,
        }));
        if (file.type.startsWith("image/")) {
          toast.success(TOAST_MESSAGES.EXPENSES.RECEIPT_UPLOADED || `Image "${file.name}" attached successfully!`);
        } else {
          toast.info(`Attachment "${file.name}" attached.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveExpense = async () => {
    const newErrors = {};
    if (!form.eventName) newErrors.eventName = "Event is required";
    if (!form.category) newErrors.category = "Category is required";
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = "Valid amount is required";
    if (!form.description || !form.description.trim()) newErrors.description = "Description is required";
    if (!form.submittedBy) newErrors.submittedBy = "Submitted by is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    const currentUserName = authState?.fullName || authState?.username || authState?.user?.name || authState?.user?.username || authState?.name || "";

    try {
      if (editingExpense) {
        const expenseId = editingExpense.expenseId || editingExpense.id;
        await updateExpenseAsync(expenseId, {
          eventName: form.eventName,
          category: form.category,
          amount: Number(form.amount),
          expenseDate: form.expenseDate ? form.expenseDate.toISOString() : new Date().toISOString(),
          status: form.status,
          submittedBy: form.submittedBy,
          approvedBy: form.status === "Approved" ? currentUserName : "-",
          description: form.description,
          fileName: form.fileName || editingExpense.fileName || "",
          fileData: form.filePreview || (editingExpense.fileName?.startsWith("data:") ? editingExpense.fileName : null),
        });
        toast.success(TOAST_MESSAGES.EXPENSES.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
      } else {
        await createExpenseAsync({
          eventName: form.eventName,
          category: form.category,
          amount: Number(form.amount),
          expenseDate: form.expenseDate ? form.expenseDate.toISOString() : new Date().toISOString(),
          status: form.status,
          submittedBy: form.submittedBy,
          approvedBy: form.status === "Approved" ? currentUserName : "-",
          description: form.description,
          fileName: form.fileName || "",
          fileData: form.filePreview || null,
        });
        toast.success(TOAST_MESSAGES.EXPENSES.CREATED_SUCCESS || TOAST_MESSAGES.GENERAL.CREATED_SUCCESS);
      }
      setDialogOpen(false);
      setEditingExpense(null);
      setForm(initialForm);
      setErrors({});
      await fetchExpensesFromDb();
    } catch (err) {
      console.error("Failed to save expense:", err);
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => {
                setSelectedExpense(row);
                setViewDialogOpen(true);
              }}
            >
              <ViewIcon
                sx={{
                  fontSize: "1.05rem",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Edit" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleEditExpense(row)}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      hasWriteAccess
                        ? theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "#4a3f6b"
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.3)"
                          : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      hasWriteAccess
                        ? theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "#4a3f6b"
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.3)"
                          : "#cbd5e1",
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
        const isApproved = row.status === "Approved";
        const isPending = row.status === "Pending";
        return (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              bgcolor: isApproved
                ? "rgba(22, 163, 74, 0.1)"
                : isPending
                  ? "rgba(234, 179, 8, 0.12)"
                  : "rgba(220, 38, 38, 0.1)",
              color: isApproved ? "#16a34a" : isPending ? "#d97706" : "#dc2626",
              border: isApproved
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
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingExpense(null);
                setForm(initialForm);
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
                  required
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <AppSelect
                  label="Select Event"
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value);
                  }}
                  options={eventOptions}
                  size="small"
                  placeholder="Select Event"
                  required
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
                  required
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
        onClose={() => {
          setDialogOpen(false);
          setEditingExpense(null);
          setErrors({});
        }}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5}>
            <AppButton
              variant="outlined"
              onClick={() => {
                setDialogOpen(false);
                setEditingExpense(null);
                setErrors({});
              }}
            >
              Cancel
            </AppButton>
            <AppButton variant="contained" onClick={handleSaveExpense}>
              {editingExpense ? "Update" : "Save"}
            </AppButton>
          </Stack>
        }
      >
        <Grid container spacing={2}>
          {/* 1. Event Type FIRST */}
          <Grid size={{ xs: 12, md: 6 }}>
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
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="Event"
              placeholder={form.category ? "Select Event" : "Select Event Type first"}
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
                  return {
                    ...c,
                    eventName: selectedEventName,
                    category: autoCategory,
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

          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput
              label="Amount"
              placeholder="₹ Enter amount"
              value={form.amount}
              onChange={(e) => {
                setForm((c) => ({ ...c, amount: e.target.value }));
                if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
              }}
              restrictType="numberonly"
              error={!!errors.amount}
              helperText={errors.amount}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
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
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="Status"
              placeholder="Select Status"
              value={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
              options={dynamicStatusOptions}
              required
            />
          </Grid>

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

          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5, display: "block" }}>
              Bill / Receipt Attachment
            </Typography>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <Box
              sx={{
                border: "1.5px dashed",
                borderColor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)",
                borderRadius: "12px",
                p: form.filePreview ? 1.5 : 2,
                textAlign: "center",
                cursor: form.filePreview ? "default" : "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#4a3f6b",
                  bgcolor: (t) =>
                    t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.04)",
                },
              }}
              onClick={() => {
                if (!form.filePreview) fileInputRef.current?.click();
              }}
            >
              {form.filePreview ? (
                <Box sx={{ width: "100%", position: "relative" }}>
                  <Box
                    component="img"
                    src={form.filePreview}
                    alt="Receipt preview"
                    sx={{
                      maxHeight: 180,
                      maxWidth: "100%",
                      borderRadius: "8px",
                      objectFit: "contain",
                      display: "block",
                      margin: "0 auto",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      bgcolor: "#00000008",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontWeight: 700,
                      color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                      mt: 1,
                    }}
                  >
                    {form.fileName}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mt: 1,
                    }}
                  >
                    <AppButton
                      size="small"
                      variant="outlined"
                      startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      sx={{ fontSize: "0.75rem", height: 28 }}
                    >
                      Change File
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((c) => ({ ...c, fileName: "", filePreview: "" }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      sx={{ fontSize: "0.75rem", height: 28 }}
                    >
                      Remove
                    </AppButton>
                  </Box>
                </Box>
              ) : form.fileName ? (
                <Box sx={{ py: 0.5 }}>
                  <AttachFileIcon sx={{ fontSize: 28, color: "#4a3f6b", mb: 0.5 }} />
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                    Selected: {form.fileName}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mt: 1 }}>
                    <AppButton
                      size="small"
                      variant="outlined"
                      startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      sx={{ fontSize: "0.75rem", height: 28 }}
                    >
                      Change File
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((c) => ({ ...c, fileName: "", filePreview: "" }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      sx={{ fontSize: "0.75rem", height: 28 }}
                    >
                      Remove
                    </AppButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <CloudUploadIcon sx={{ fontSize: 28, color: "#4a3f6b", mb: 0.5 }} />
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                    Choose bill file from your device
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                    PDF, PNG, JPG (Max 5MB)
                  </Typography>
                </>
              )}
            </Box>
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Receipt / Bill Attachment
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={getAttachmentDisplayName(selectedExpense.fileName)}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          maxWidth: 200,
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      />
                      {isImageFile(selectedExpense.fileName) && (
                        <Tooltip title="View Full Size">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setPreviewImageModal({
                                open: true,
                                url: resolveAttachmentUrl(selectedExpense.fileName),
                                title: getAttachmentDisplayName(selectedExpense.fileName),
                              })
                            }
                            sx={{ color: "#4a3f6b", p: 0.5 }}
                          >
                            <ZoomInIcon sx={{ fontSize: "1.15rem" }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Open in New Tab">
                        <IconButton
                          size="small"
                          component="a"
                          href={resolveAttachmentUrl(selectedExpense.fileName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#4a3f6b", p: 0.5 }}
                        >
                          <OpenInNewIcon sx={{ fontSize: "1rem" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {isImageFile(selectedExpense.fileName) ? (
                    <Box
                      onClick={() =>
                        setPreviewImageModal({
                          open: true,
                          url: resolveAttachmentUrl(selectedExpense.fileName),
                          title: getAttachmentDisplayName(selectedExpense.fileName),
                        })
                      }
                      sx={{
                        position: "relative",
                        width: "100%",
                        minHeight: 180,
                        maxHeight: 280,
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: (t) =>
                          `1.5px solid ${
                            t.palette.mode === "dark"
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(74,63,107,0.2)"
                          }`,
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.03)"
                            : "#f8fafc",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.25s ease",
                        "&:hover": {
                          borderColor: "#4a3f6b",
                          boxShadow: "0 6px 20px rgba(74,63,107,0.15)",
                          "& .preview-overlay": {
                            opacity: 1,
                          },
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={resolveAttachmentUrl(selectedExpense.fileName)}
                        alt={getAttachmentDisplayName(selectedExpense.fileName)}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = document.getElementById(
                            `fallback-${selectedExpense.id}`
                          );
                          if (fallback) fallback.style.display = "flex";
                        }}
                        sx={{
                          width: "100%",
                          maxHeight: 280,
                          objectFit: "contain",
                          display: "block",
                          p: 1,
                          borderRadius: "10px",
                        }}
                      />
                      <Box
                        id={`fallback-${selectedExpense.id}`}
                        sx={{
                          display: "none",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 3,
                          gap: 1,
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">
                          {getAttachmentDisplayName(selectedExpense.fileName)}
                        </Typography>
                      </Box>
                      <Box
                        className="preview-overlay"
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(0,0,0,0.38)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          color: "#ffffff",
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        <ZoomInIcon sx={{ fontSize: 24 }} />
                        <Typography variant="body2" fontWeight={700}>
                          Click to expand full size
                        </Typography>
                      </Box>
                    </Box>
                  ) : isPdfFile(selectedExpense.fileName) ? (
                    <Box
                      component="a"
                      href={resolveAttachmentUrl(selectedExpense.fileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        borderRadius: "12px",
                        border: (t) => `1.5px solid ${t.palette.divider}`,
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.03)"
                            : "#f8fafc",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "#ef4444",
                          bgcolor: (t) =>
                            t.palette.mode === "dark"
                              ? "rgba(239, 68, 68, 0.08)"
                              : "rgba(239, 68, 68, 0.04)",
                        },
                      }}
                    >
                      <PictureAsPdfIcon sx={{ fontSize: 36, color: "#ef4444" }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {getAttachmentDisplayName(selectedExpense.fileName)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Click to view PDF document in new tab
                        </Typography>
                      </Box>
                      <OpenInNewIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    </Box>
                  ) : (
                    <Box
                      component="a"
                      href={resolveAttachmentUrl(selectedExpense.fileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        borderRadius: "12px",
                        border: (t) => `1.5px solid ${t.palette.divider}`,
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.03)"
                            : "#f8fafc",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "#4a3f6b",
                        },
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 32, color: "#4a3f6b" }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {getAttachmentDisplayName(selectedExpense.fileName)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Click to open attachment
                        </Typography>
                      </Box>
                      <OpenInNewIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    </Box>
                  )}
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </AppDialog>

      {/* Lightbox Full Size Image Preview Dialog */}
      <AppDialog
        open={previewImageModal.open}
        onClose={() => setPreviewImageModal({ open: false, url: "", title: "" })}
        title={previewImageModal.title || "Receipt Attachment Preview"}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              component="a"
              href={previewImageModal.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in New Tab
            </AppButton>
            <AppButton
              variant="contained"
              onClick={() => setPreviewImageModal({ open: false, url: "", title: "" })}
            >
              Close
            </AppButton>
          </Stack>
        }
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 1.5,
            bgcolor: (t) => (t.palette.mode === "dark" ? "#0f172a" : "#0f172a08"),
            borderRadius: "12px",
            minHeight: 250,
            maxHeight: "72vh",
            overflow: "auto",
          }}
        >
          <Box
            component="img"
            src={previewImageModal.url}
            alt={previewImageModal.title || "Attachment"}
            sx={{
              maxWidth: "100%",
              maxHeight: "68vh",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            }}
          />
        </Box>
      </AppDialog>
    </div>
  );
}

