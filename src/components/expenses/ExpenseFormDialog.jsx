import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  CloudUploadOutlined as CloudUploadIcon,
  Visibility as ViewIcon,
  FileDownload as DownloadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppTextArea from "../common/AppTextArea";
import AppButton, { AppCancelButton, AppSaveButton } from "../common/AppButton";
import AppConfirmDialog from "../common/AppConfirmDialog";
import { roundToWhole, formatWholeCurrency } from "../../utils/roundingHelper";
import { useAppToast } from "../common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import {
  createExpenseAsync,
  updateExpenseAsync,
  getExpensesAsync,
} from "../../services/expenseService";
import { getEventsAsync } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const initialFormState = {
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

export default function ExpenseFormDialog({
  open,
  onClose,
  onSaved,
  editingExpense = null,
  initialEvent = null,
  events: propEvents,
  eventTypes: propEventTypes,
  members: propMembers,
}) {
  const toast = useAppToast();
  const { authState } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialFormState);
  const [additionalExpenses, setAdditionalExpenses] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [internalEvents, setInternalEvents] = useState([]);
  const [internalEventTypes, setInternalEventTypes] = useState([]);
  const [internalMembers, setInternalMembers] = useState([]);
  const [existingExpenses, setExistingExpenses] = useState([]);

  const [previewImageModal, setPreviewImageModal] = useState({
    open: false,
    url: "",
    title: "",
  });
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const savedFormRef = useRef(initialFormState);

  // Resolved lists
  const eventsList = propEvents && propEvents.length > 0 ? propEvents : internalEvents;
  const eventTypesList = propEventTypes && propEventTypes.length > 0 ? propEventTypes : internalEventTypes;
  const membersList = propMembers && propMembers.length > 0 ? propMembers : internalMembers;

  const loggedInUserName = useMemo(() => {
    return (
      authState?.fullName ||
      authState?.name ||
      authState?.user?.fullName ||
      authState?.user?.name ||
      authState?.username ||
      ""
    ).trim();
  }, [authState]);

  // Load supporting data if not provided via props
  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    async function loadData() {
      try {
        const promises = [getExpensesAsync().catch(() => [])];
        if (!propEvents || propEvents.length === 0) {
          promises.push(getEventsAsync().catch(() => []));
        }
        if (!propEventTypes || propEventTypes.length === 0) {
          promises.push(getEventTypesAsync().catch(() => []));
        }
        if (!propMembers || propMembers.length === 0) {
          promises.push(
            Promise.all([
              getMembersAsync().catch(() => []),
              getUsersAsync().catch(() => []),
            ])
          );
        }

        const results = await Promise.all(promises);
        if (!isMounted) return;

        let resIdx = 0;
        const expensesRes = results[resIdx++];
        setExistingExpenses(Array.isArray(expensesRes) ? expensesRes : []);

        if (!propEvents || propEvents.length === 0) {
          const evRes = results[resIdx++];
          setInternalEvents(Array.isArray(evRes) ? evRes : []);
        }

        if (!propEventTypes || propEventTypes.length === 0) {
          const etRes = results[resIdx++];
          setInternalEventTypes(Array.isArray(etRes) ? etRes : []);
        }

        if (!propMembers || propMembers.length === 0) {
          const [mRes, uRes] = results[resIdx++] || [[], []];
          const combined = Array.isArray(mRes) ? [...mRes] : [];
          const existingIds = new Set(
            combined.map((m) => String(m.memberId || m.id || m.userId).toLowerCase()).filter(Boolean)
          );
          if (Array.isArray(uRes)) {
            uRes.forEach((u) => {
              const uid = String(u.userId || u.id || "").toLowerCase();
              if (uid && !existingIds.has(uid)) {
                existingIds.add(uid);
                combined.push({
                  memberId: u.userId || u.id,
                  name: u.fullName || u.name,
                  roleName: u.roleName || "Member",
                });
              }
            });
          }
          setInternalMembers(combined);
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [open, propEvents, propEventTypes, propMembers]);

  // Initialize or reset form state whenever dialog opens
  useEffect(() => {
    if (!open) {
      setForm(initialFormState);
      setAdditionalExpenses([]);
      setErrors({});
      setSaving(false);
      setConfirmDiscardOpen(false);
      return;
    }

    if (editingExpense) {
      const cleanDesc = (editingExpense.description || "")
        .replace(/<!--[\s\S]*?-->/gi, "")
        .replace(/\[Additional Expenses:.*?\]/gi, "")
        .trim();

      const rawBudget =
        editingExpense.budgetAmount !== undefined && editingExpense.budgetAmount !== null
          ? String(editingExpense.budgetAmount)
          : (editingExpense.extraAmount > 0
              ? String(Math.max(0, Number(editingExpense.amount || 0) - Number(editingExpense.extraAmount || 0)))
              : (editingExpense.amount !== undefined && editingExpense.amount !== null ? String(editingExpense.amount) : ""));

      const initialData = {
        eventId: editingExpense.eventId || "",
        eventName: editingExpense.eventName || "",
        category: editingExpense.category || "",
        amount: rawBudget,
        expenseDate: editingExpense.expenseDate ? dayjs(editingExpense.expenseDate) : dayjs(),
        description: cleanDesc === "No description provided." ? "" : cleanDesc,
        submittedBy: editingExpense.submittedBy || loggedInUserName,
        status: editingExpense.status || "Pending",
        attachment: editingExpense.fileData || editingExpense.fileName || "",
        attachmentName: editingExpense.fileName || "",
      };

      const extras = Array.isArray(editingExpense.additionalExpenses)
        ? editingExpense.additionalExpenses.map((it, idx) => ({
            id: it.id || `extra-${idx}-${Date.now()}`,
            reason: it.reason || "",
            amount: it.amount !== undefined && it.amount !== null ? String(it.amount) : "",
          }))
        : [];

      setForm(initialData);
      setAdditionalExpenses(extras);
      savedFormRef.current = { ...initialData, additionalExpenses: extras };
      setErrors({});
      return;
    }

    if (initialEvent) {
      const initialCat =
        initialEvent.eventTypeName ||
        initialEvent.category ||
        initialEvent.categoryName ||
        (Array.isArray(initialEvent.eventTypeNames) && initialEvent.eventTypeNames[0]) ||
        "";
      const initialDate = initialEvent.eventDate ? dayjs(initialEvent.eventDate) : dayjs();

      const initialData = {
        ...initialFormState,
        eventId: initialEvent.eventId || initialEvent.id || "",
        eventName: initialEvent.eventName || initialEvent.name || "",
        category: initialCat,
        expenseDate: initialDate.isValid() ? initialDate : dayjs(),
        submittedBy: loggedInUserName,
      };
      setForm(initialData);
      setAdditionalExpenses([]);
      savedFormRef.current = { ...initialData, additionalExpenses: [] };
      setErrors({});
      return;
    }

    const defaultData = {
      ...initialFormState,
      submittedBy: loggedInUserName,
      expenseDate: dayjs(),
    };
    setForm(defaultData);
    setAdditionalExpenses([]);
    savedFormRef.current = { ...defaultData, additionalExpenses: [] };
    setErrors({});
  }, [open, editingExpense, initialEvent, loggedInUserName]);

  // Category / Event Type options for the dropdown
  const formEventTypeOptions = useMemo(() => {
    const set = new Set();
    (eventTypesList || []).forEach((et) => {
      const name = et.eventTypeName || et.typeName || et.name;
      if (name) set.add(name);
    });
    (eventsList || []).forEach((ev) => {
      const cat = ev.eventTypeName || ev.category;
      if (cat) set.add(cat);
    });
    (existingExpenses || []).forEach((ex) => {
      if (ex.category) set.add(ex.category);
    });
    if (form.category) set.add(form.category);
    const items = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [
      { label: "Select Event Type", value: "" },
      ...items.map((c) => ({ label: c, value: c })),
    ];
  }, [eventTypesList, eventsList, existingExpenses, form.category]);

  // Event Name options cascaded by selected Event Type (form.category)
  const formEventOptions = useMemo(() => {
    let filtered = eventsList || [];
    if (form.category) {
      filtered = filtered.filter((e) => {
        const eventCat =
          e.eventTypeName ||
          e.category ||
          (eventTypesList || []).find((t) => (t.eventTypeId || t.id) === e.eventTypeId)?.eventTypeName;
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

    if (form.eventName && !unique.has(form.eventName)) {
      list.push({ label: form.eventName, value: form.eventName });
    }

    return list;
  }, [eventsList, eventTypesList, form.category, form.eventName]);

  // Member dropdown options for "Submitted By"
  const memberOptions = useMemo(() => {
    const list = [{ label: "Select Member", value: "" }];
    const unique = new Set();

    (membersList || []).forEach((m) => {
      const name = m.name || m.fullName || m.memberName;
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

  // Dynamically compute selected event budget and remaining limit
  const selectedEventBudget = useMemo(() => {
    if (!form.eventName && !form.eventId) return null;
    const ev = (eventsList || []).find((e) => {
      if (form.eventId && (e.eventId === form.eventId || e.id === form.eventId)) return true;
      const matchName =
        (e.name || e.eventName || "").trim().toLowerCase() ===
        (form.eventName || "").trim().toLowerCase();
      if (!matchName) return false;
      if (form.category) {
        const cat = e.eventTypeName || e.category || "";
        return cat.trim().toLowerCase() === form.category.trim().toLowerCase();
      }
      return true;
    });

    if (!ev && !initialEvent) return null;
    const targetEv = ev || initialEvent;

    const expected = roundToWhole(
      Number(
        targetEv.totalExpectedAmount ??
        targetEv.expectedAmount ??
        targetEv.expectedCollection ??
        targetEv.baseAmount ??
        0
      )
    );

    const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;
    const targetName = (form.eventName || targetEv.eventName || targetEv.name || "").trim().toLowerCase();

    const spent = roundToWhole(
      (existingExpenses || [])
        .filter((ex) => {
          const exName = (ex.eventName || "").trim().toLowerCase();
          const isNotSame = !currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId);
          return exName === targetName && isNotSame && (ex.status || "").toLowerCase() !== "rejected";
        })
        .reduce((sum, ex) => sum + (Number(ex.budgetAmount ?? ex.amount) || 0), 0)
    );

    const remaining = Math.max(0, expected - spent);
    const extraSpent = Math.max(0, spent - expected);
    return { expected, spent, remaining, extraSpent };
  }, [form.eventName, form.eventId, form.category, eventsList, existingExpenses, editingExpense, initialEvent]);

  // Live calculation of main budget, additional expenses, and total expense
  const mainBudgetAmount = Number(form.amount) || 0;
  const extraExpensesSum = useMemo(() => {
    return roundToWhole(
      additionalExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    );
  }, [additionalExpenses]);
  const totalCalculatedExpense = roundToWhole(mainBudgetAmount + extraExpensesSum);

  const isMainAmountExceedingBudget = useMemo(() => {
    if (!selectedEventBudget || selectedEventBudget.expected <= 0) return false;
    return mainBudgetAmount > selectedEventBudget.remaining;
  }, [selectedEventBudget, mainBudgetAmount]);

  const handleAddAdditionalExpenseRow = () => {
    setAdditionalExpenses((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        reason: "",
        amount: "",
      },
    ]);
  };

  const handleRemoveAdditionalExpenseRow = (id) => {
    setAdditionalExpenses((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`extra_reason_${id}`];
      delete next[`extra_amount_${id}`];
      return next;
    });
  };

  const handleAdditionalExpenseChange = (id, field, value) => {
    setAdditionalExpenses((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "amount") {
          const sanitized = value.replace(/[^0-9]/g, "").slice(0, 6);
          return { ...r, amount: sanitized };
        }
        return { ...r, [field]: value };
      })
    );
    setErrors((prev) => {
      const errorKey = `extra_${field}_${id}`;
      if (prev[errorKey]) {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      }
      return prev;
    });
  };

  const isFormDirty = () => {
    const saved = savedFormRef.current;
    if (!saved) return false;
    const basicDirty =
      (form.eventName || "") !== (saved.eventName || "") ||
      (form.category || "") !== (saved.category || "") ||
      String(form.amount || "") !== String(saved.amount || "") ||
      (form.description || "") !== (saved.description || "") ||
      (form.attachment || "") !== (saved.attachment || "");
    if (basicDirty) return true;

    const savedExtras = saved.additionalExpenses || [];
    if (additionalExpenses.length !== savedExtras.length) return true;
    for (let i = 0; i < additionalExpenses.length; i++) {
      if (
        additionalExpenses[i].reason !== savedExtras[i].reason ||
        String(additionalExpenses[i].amount) !== String(savedExtras[i].amount)
      ) {
        return true;
      }
    }
    return false;
  };

  const handleCloseAttempt = () => {
    if (isFormDirty()) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
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
    const newErrors = {};
    if (!form.eventName) newErrors.eventName = "This field is required";
    if (!form.category) newErrors.category = "This field is required";

    const numAmount = Number(form.amount) || 0;
    const hasRemainingBudget = selectedEventBudget && selectedEventBudget.expected > 0;
    const maxBudgetLimit = hasRemainingBudget ? selectedEventBudget.remaining : 1000000;

    if (hasRemainingBudget) {
      if (numAmount > maxBudgetLimit) {
        newErrors.amount = `Main Budget Amount cannot exceed remaining budget (${formatWholeCurrency(maxBudgetLimit)})`;
      } else if (numAmount === 0 && additionalExpenses.length === 0) {
        newErrors.amount = "This field is required";
      }
    } else {
      if (!form.amount || !String(form.amount).trim() || numAmount <= 0 || isNaN(numAmount)) {
        if (additionalExpenses.length === 0) {
          newErrors.amount = "This field is required";
        }
      } else if (String(form.amount).length > 6) {
        newErrors.amount = "Amount cannot exceed 6 digits";
      }
    }

    // Validate additional expenses
    additionalExpenses.forEach((extra) => {
      if (!extra.reason || !extra.reason.trim()) {
        newErrors[`extra_reason_${extra.id}`] = "This field is required";
      }
      if (!extra.amount || Number(extra.amount) <= 0 || isNaN(Number(extra.amount))) {
        newErrors[`extra_amount_${extra.id}`] = "Amount must be greater than ₹0";
      } else if (String(extra.amount).length > 6) {
        newErrors[`extra_amount_${extra.id}`] = "Amount cannot exceed 6 digits";
      }
    });

    const totalExpense = roundToWhole(numAmount + extraExpensesSum);
    if (totalExpense <= 0) {
      if (!newErrors.amount) {
        newErrors.amount = "Total expense amount must be greater than ₹0";
      }
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

    setSaving(true);
    try {
      const matchedEv = (eventsList || []).find((ev) => {
        if (form.eventId && (ev.eventId === form.eventId || ev.id === form.eventId)) return true;
        return (
          (ev.name || ev.eventName || "").trim().toLowerCase() ===
          (form.eventName || "").trim().toLowerCase()
        );
      }) || initialEvent;

      const payload = {
        eventId: matchedEv ? (matchedEv.eventId || matchedEv.id) : (form.eventId || undefined),
        eventName: form.eventName,
        category: form.category,
        budgetAmount: numAmount,
        amount: totalExpense,
        additionalExpenses: additionalExpenses
          .filter((r) => r.reason.trim() || Number(r.amount) > 0)
          .map((r) => ({
            reason: r.reason.trim(),
            amount: Number(r.amount) || 0,
          })),
        expenseDate: form.expenseDate ? form.expenseDate.toISOString() : new Date().toISOString(),
        status: editingExpense ? (editingExpense.status || "Pending") : (form.status || "Pending"),
        submittedBy: form.submittedBy || loggedInUserName,
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
        toast.success(TOAST_MESSAGES.EXPENSES.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
      } else {
        await createExpenseAsync(payload);
        toast.success(TOAST_MESSAGES.EXPENSES.CREATED_SUCCESS || TOAST_MESSAGES.GENERAL.CREATED_SUCCESS);
      }

      onClose();
      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      if (err?.isRateLimit || err?.response?.status === 429) return;
      toast.error(err, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppDialog
        open={open}
        onClose={handleCloseAttempt}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {extraExpensesSum > 0 && (
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.75rem" }}
              >
                Includes {formatWholeCurrency(extraExpensesSum)} in additional expenses
              </Typography>
            )}
            <AppCancelButton onClick={handleCloseAttempt} disabled={saving} />
            <AppSaveButton onClick={handleSaveExpense} disabled={saving}>
              {saving ? "Saving..." : editingExpense ? "Update" : "Save"}
            </AppSaveButton>
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
                  const matchingEvents = (eventsList || []).filter((ev) => {
                    const eventCat =
                      ev.eventTypeName ||
                      ev.category ||
                      (eventTypesList || []).find((t) => (t.eventTypeId || t.id) === ev.eventTypeId)?.eventTypeName;
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
                    eventId: stillMatches ? c.eventId : "",
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

          {/* 2. Event Name NEXT (filtered by selected Event Type) */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              placeholder={form.category ? "Select Event Name" : "Select Event Type first"}
              value={form.eventName}
              onChange={(e) => {
                const selectedEventName = e.target.value;
                setForm((c) => {
                  let autoCategory = c.category;
                  const matchedEv = (eventsList || []).find((ev) => {
                    const nameMatch =
                      (ev.name || ev.eventName || "").trim().toLowerCase() ===
                      (selectedEventName || "").trim().toLowerCase();
                    if (!nameMatch) return false;
                    if (autoCategory) {
                      const cat = ev.eventTypeName || ev.category || "";
                      return cat.trim().toLowerCase() === autoCategory.trim().toLowerCase();
                    }
                    return true;
                  });

                  if (!autoCategory && matchedEv) {
                    autoCategory =
                      matchedEv.eventTypeName ||
                      matchedEv.category ||
                      (eventTypesList || []).find((t) => (t.eventTypeId || t.id) === matchedEv.eventTypeId)?.eventTypeName ||
                      "";
                  }

                  return {
                    ...c,
                    eventId: matchedEv ? (matchedEv.eventId || matchedEv.id || "") : "",
                    eventName: selectedEventName,
                    category: autoCategory || c.category,
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
                  bgcolor: (t) =>
                    t.palette.mode === "dark"
                      ? "rgba(124, 58, 237, 0.08)"
                      : "rgba(124, 58, 237, 0.04)",
                  border: (t) =>
                    `1px solid ${t.palette.mode === "dark"
                      ? "rgba(124, 58, 237, 0.25)"
                      : "rgba(124, 58, 237, 0.18)"
                    }`,
                }}
              >
                <Grid container spacing={1.5} alignItems="center">
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      {COMMON_STRINGS.EXPENSES?.EXPECTED_BUDGET || "Expected Budget"}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                      {formatWholeCurrency(selectedEventBudget.expected)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      {COMMON_STRINGS.EXPENSES?.TOTAL_SPENT || "Total Spent"}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "info.main" }}>
                      {formatWholeCurrency(selectedEventBudget.spent)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      {COMMON_STRINGS.EXPENSES?.REMAINING_BUDGET || "Remaining Budget"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        color: selectedEventBudget.remaining > 0 ? "success.main" : "text.secondary",
                      }}
                    >
                      {formatWholeCurrency(selectedEventBudget.remaining)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      {COMMON_STRINGS.EXPENSES?.EXTRA_AMOUNT_SPENT || "Extra Amount Spent"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        color: selectedEventBudget.extraSpent > 0 ? "error.main" : "text.secondary",
                      }}
                    >
                      {formatWholeCurrency(selectedEventBudget.extraSpent)}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Notice if remaining budget is 0 or event exceeded budget */}
                {selectedEventBudget.remaining === 0 ? (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? "rgba(239, 68, 68, 0.12)"
                          : "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: (t) => (t.palette.mode === "dark" ? "#fca5a5" : "#b91c1c"),
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    >
                      Budget Limit Reached: The expected budget for this event is fully exhausted. Any additional expenses should be added using "+ Add Row" below.
                    </Typography>
                  </Box>
                ) : selectedEventBudget.extraSpent > 0 ? (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? "rgba(99, 102, 241, 0.12)"
                          : "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: (t) => (t.palette.mode === "dark" ? "#a5b4fc" : "#4338ca"),
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    >
                      Note: This event has previously recorded {formatWholeCurrency(selectedEventBudget.extraSpent)} in additional expenses.
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </Grid>
          )}

          {/* Main Budget Amount Input */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label={selectedEventBudget ? "Main Budget Amount (₹)" : "Amount (₹)"}
              placeholder={
                selectedEventBudget && selectedEventBudget.remaining === 0
                  ? "₹ 0 (Budget exhausted)"
                  : "₹ Enter budget amount"
              }
              value={form.amount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setForm((c) => ({ ...c, amount: "" }));
                  setErrors((p) => ({ ...p, amount: "" }));
                  return;
                }
                if (raw.length > 6) return;

                const num = Number(raw);
                if (selectedEventBudget && num > selectedEventBudget.remaining) {
                  setForm((c) => ({ ...c, amount: raw }));
                  setErrors((p) => ({
                    ...p,
                    amount: `Cannot exceed remaining budget (${formatWholeCurrency(selectedEventBudget.remaining)}). Use "+ Add Row" below for additional expenses.`,
                  }));
                  return;
                }

                setForm((c) => ({ ...c, amount: raw }));
                if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
              }}
              maxLength={6}
              inputProps={{ maxLength: 6 }}
              restrictType="numberonly"
              error={!!errors.amount || isMainAmountExceedingBudget}
              helperText={
                errors.amount ||
                (isMainAmountExceedingBudget
                  ? `Exceeds remaining budget (${formatWholeCurrency(selectedEventBudget.remaining)}). Please use "+ Add Row" below.`
                  : selectedEventBudget
                  ? `Max allowed from budget: ${formatWholeCurrency(selectedEventBudget.remaining)}`
                  : undefined)
              }
              required={additionalExpenses.length === 0}
            />
          </Grid>

          {/* Expense Date */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateInput
              label="Expense Date"
              value={form.expenseDate}
              onChange={(newVal) => {
                setForm((c) => ({ ...c, expenseDate: newVal }));
                if (errors.expenseDate) setErrors((p) => ({ ...p, expenseDate: "" }));
              }}
              disableFuture
              maxDate={dayjs()}
              error={!!errors.expenseDate}
              helperText={errors.expenseDate}
              required
            />
          </Grid>

          {/* Submitted By */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Submitted By"
              placeholder="Select Member"
              value={form.submittedBy || loggedInUserName}
              disabled
              allowClear={false}
              clearable={false}
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

          {/* Attachment Bar */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ color: (t) => (t.palette.mode === "dark" ? "#e2e8f0" : "#334155") }}
                >
                  Attachment (1 Image, Max 6MB)
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
                      : ((t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)")),
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
                      : ((t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)")),
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: errors.attachment
                        ? "#dc2626"
                        : ((t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b")),
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(74,63,107,0.07)",
                    },
                  }}
                >
                  <CloudUploadIcon
                    sx={{
                      fontSize: 20,
                      color: errors.attachment
                        ? "#ef4444"
                        : ((t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b")),
                    }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{ color: errors.attachment ? "#ef4444" : "text.secondary" }}
                  >
                    Click to attach image (Max 6MB)
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
                    bgcolor: (t) =>
                      t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                    minHeight: 46,
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", overflow: "hidden" }}
                    onClick={() =>
                      setPreviewImageModal({
                        open: true,
                        url: form.attachment,
                        title: form.attachmentName || "Attached Receipt",
                      })
                    }
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
                      <Tooltip title={form.attachmentName || "Attached Image"} arrow placement="top">
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 140,
                            cursor: "pointer",
                          }}
                        >
                          {form.attachmentName || "Attached Image"}
                        </Typography>
                      </Tooltip>
                      <Typography
                        variant="caption"
                        sx={{ color: "#0284c7", fontSize: "0.66rem", display: "block" }}
                      >
                        Click to preview
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={0.3}>
                    <Tooltip title="Preview">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setPreviewImageModal({
                            open: true,
                            url: form.attachment,
                            title: form.attachmentName || "Attached Receipt",
                          })
                        }
                      >
                        <ViewIcon
                          sx={{
                            fontSize: 17,
                            color: (t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleDownloadImage(
                            form.attachment,
                            form.attachmentName || "expense_attachment.png"
                          )
                        }
                      >
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
              maxLength={500}
              showCount
              required
            />
          </Grid>

          {/* Additional Expenses Breakdown Section */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: (t) => `1px solid ${t.palette.divider}`,
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(248, 250, 252, 0.7)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: additionalExpenses.length > 0 ? 1.5 : 0,
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: (t) => (t.palette.mode === "dark" ? "#e2e8f0" : "#334155"),
                    }}
                  >
                    Additional Expenses Breakdown
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Record extra expenses exceeding the expected budget with itemized reasons and amounts.
                  </Typography>
                </Box>
                <AppButton
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                  onClick={handleAddAdditionalExpenseRow}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Add Row
                </AppButton>
              </Box>

              {additionalExpenses.length === 0 ? (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 2,
                    textAlign: "center",
                    border: "1px dashed",
                    borderColor: (t) =>
                      t.palette.mode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                    borderRadius: 1.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    No additional expenses added. Click <strong>+ Add Row</strong> if spending exceeds the budget or needs extra itemization.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {additionalExpenses.map((extra, index) => (
                    <Box
                      key={extra.id || index}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: (t) =>
                          t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#ffffff",
                        border: (t) => `1px solid ${t.palette.divider}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      <Grid container spacing={1.5} alignItems="flex-start">
                        <Grid size={{ xs: 12, sm: 6.5 }}>
                          <AppInput
                            label={`Reason #${index + 1}`}
                            placeholder="e.g. Venue extension, extra supplies, emergency fuel"
                            value={extra.reason}
                            onChange={(e) =>
                              handleAdditionalExpenseChange(extra.id, "reason", e.target.value)
                            }
                            error={Boolean(errors[`extra_reason_${extra.id}`])}
                            helperText={errors[`extra_reason_${extra.id}`]}
                            maxLength={100}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 9, sm: 4.5 }}>
                          <AppInput
                            label="Extra Amount (₹)"
                            placeholder="₹ 0"
                            value={extra.amount}
                            onChange={(e) =>
                              handleAdditionalExpenseChange(extra.id, "amount", e.target.value)
                            }
                            error={Boolean(errors[`extra_amount_${extra.id}`])}
                            helperText={errors[`extra_amount_${extra.id}`]}
                            maxLength={6}
                            restrictType="numberonly"
                            required
                          />
                        </Grid>
                        <Grid
                          size={{ xs: 3, sm: 1 }}
                          sx={{ display: "flex", justifyContent: "center", pt: { sm: 3.5, xs: 1 } }}
                        >
                          <Tooltip title="Delete Row">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveAdditionalExpenseRow(extra.id)}
                              sx={{
                                color: "error.main",
                                "&:hover": {
                                  bgcolor: (t) =>
                                    t.palette.mode === "dark"
                                      ? "rgba(239, 68, 68, 0.15)"
                                      : "rgba(239, 68, 68, 0.08)",
                                },
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Grid>

          {/* Dynamic Financial Summary Card */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (t) =>
                  t.palette.mode === "dark"
                    ? "rgba(99, 102, 241, 0.1)"
                    : "rgba(99, 102, 241, 0.05)",
                border: (t) =>
                  `1px solid ${
                    t.palette.mode === "dark"
                      ? "rgba(99, 102, 241, 0.3)"
                      : "rgba(99, 102, 241, 0.2)"
                  }`,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Main Budget Amount:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatWholeCurrency(mainBudgetAmount)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    (+) Additional Expenses:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: extraExpensesSum > 0 ? "warning.main" : "text.primary",
                    }}
                  >
                    {formatWholeCurrency(extraExpensesSum)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    (=) Total Expense:
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: (t) => (t.palette.mode === "dark" ? "#a5b4fc" : "#4338ca"),
                    }}
                  >
                    {formatWholeCurrency(totalCalculatedExpense)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </AppDialog>

      {/* Discard Changes Confirmation */}
      <AppConfirmDialog
        open={confirmDiscardOpen}
        onClose={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onClose();
        }}
        title="Discard Changes"
        content="You have unsaved changes. Are you sure you want to discard them and close?"
        confirmText="Discard"
        confirmColor="warning"
      />

      {/* Lightbox / Full Receipt Preview Dialog */}
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
              onClick={() =>
                handleDownloadImage(
                  previewImageModal.url,
                  `${(previewImageModal.title || "receipt").replace(/[^a-zA-Z0-9_-]/g, "_")}.png`
                )
              }
            >
              Download
            </AppButton>
            <IconButton size="small" onClick={() => setPreviewImageModal({ open: false, url: "", title: "" })}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "#f8fafc"),
            borderRadius: "10px",
          }}
        >
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
    </>
  );
}
