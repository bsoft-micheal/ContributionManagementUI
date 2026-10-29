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
import AppConfirmDialog from "../common/AppConfirmDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppTextArea from "../common/AppTextArea";
import AppButton, { AppCancelButton, AppSaveButton } from "../common/AppButton";
import { roundToWhole, formatWholeCurrency } from "../../utils/roundingHelper";
import {
  sanitizeAmountInput,
  validateAmountInput,
  calculateLiveRemainingBudget,
  calculateLiveTotalSpent,
  calculateLiveExtraAmountSpent,
  calculateTotalExpense,
  canAddAdditionalExpenseRow,
  MAX_ADDITIONAL_EXPENSE_ROWS,
  MAX_AMOUNT_DIGITS,
  MAX_AMOUNT_VALUE,
} from "../../utils/expenseBudgetCalculations";
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
  const [deleteRowId, setDeleteRowId] = useState(null);
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
      return;
    }

    if (editingExpense) {
      const cleanDesc = (editingExpense.description || "")
        .replace(/<!--[\s\S]*?-->/gi, "")
        .replace(/\[Additional Expenses:.*?\]/gi, "")
        .trim();

      let parsedExtras = [];
      if (Array.isArray(editingExpense.additionalExpenses)) {
        parsedExtras = editingExpense.additionalExpenses;
      } else if (typeof editingExpense.additionalExpenses === "string" && editingExpense.additionalExpenses.trim()) {
        try {
          parsedExtras = JSON.parse(editingExpense.additionalExpenses);
        } catch {
          parsedExtras = [];
        }
      } else if (editingExpense.description && editingExpense.description.includes("EXTRA_EXPENSES")) {
        const descMatch = editingExpense.description.match(/<!--\s*EXTRA_EXPENSES:\s*(\{[\s\S]*?\})\s*-->/i);
        if (descMatch) {
          try {
            const extraObj = JSON.parse(descMatch[1]);
            parsedExtras = extraObj.items || [];
          } catch { }
        }
      }

      const extras = Array.isArray(parsedExtras)
        ? parsedExtras.map((it, idx) => ({
          id: it.id || `extra-${idx}-${Date.now()}`,
          reason: it.reason || it.r || "",
          amount: it.amount !== undefined && it.amount !== null ? String(it.amount) : (it.a !== undefined && it.a !== null ? String(it.a) : ""),
        }))
        : [];

      let rawBudget = "";
      if (editingExpense.budgetAmount !== undefined && editingExpense.budgetAmount !== null) {
        rawBudget = String(editingExpense.budgetAmount);
      } else if (Number(editingExpense.extraAmount) > 0) {
        rawBudget = String(Math.max(0, Number(editingExpense.amount || 0) - Number(editingExpense.extraAmount || 0)));
      } else if (editingExpense.description && editingExpense.description.includes("EXTRA_EXPENSES")) {
        const descMatch = editingExpense.description.match(/<!--\s*EXTRA_EXPENSES:\s*(\{[\s\S]*?\})\s*-->/i);
        if (descMatch) {
          try {
            const extraObj = JSON.parse(descMatch[1]);
            const b = extraObj.b ?? extraObj.budget;
            if (b !== undefined && b !== null) rawBudget = String(b);
          } catch { }
        }
      }
      if (!rawBudget && editingExpense.amount !== undefined && editingExpense.amount !== null) {
        rawBudget = String(editingExpense.amount);
      }

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

  // Dynamically compute selected event budget baseline from DB
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
        targetEv.originalPlannedBudget ??
        targetEv.baseAmount ??
        targetEv.totalExpectedAmount ??
        targetEv.expectedAmount ??
        targetEv.expectedCollection ??
        0
      )
    );

    const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;
    const targetName = (form.eventName || targetEv.eventName || targetEv.name || "").trim().toLowerCase();

    // Sum of amounts spent by other historical expenses for this event
    const basePriorSpent = roundToWhole(
      (existingExpenses || [])
        .filter((ex) => {
          const exName = (ex.eventName || "").trim().toLowerCase();
          const isNotSame = !currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId);
          return exName === targetName && isNotSame && (ex.status || "").toLowerCase() !== "rejected";
        })
        .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0)
    );

    const baseRemaining = Math.max(0, expected - basePriorSpent);
    const baseExtraSpent = Math.max(0, basePriorSpent - expected);

    return {
      expected,
      basePriorSpent,
      baseRemaining,
      baseExtraSpent,
    };
  }, [form.eventName, form.eventId, form.category, eventsList, existingExpenses, editingExpense, initialEvent]);

  // Determine if a main budget has already been recorded for this event
  const hasExistingBudget = useMemo(() => {
    if (!form.eventName && !form.eventId) return false;
    const targetName = (form.eventName || "").trim().toLowerCase();
    const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;

    return (existingExpenses || []).some((ex) => {
      const exName = (ex.eventName || "").trim().toLowerCase();
      const isNotSame = !currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId);
      const isNotRejected = (ex.status || "").toLowerCase() !== "rejected";
      const budgetVal = Number(ex.budgetAmount !== undefined && ex.budgetAmount !== null ? ex.budgetAmount : ex.amount) || 0;
      return isNotSame && exName === targetName && isNotRejected && budgetVal > 0;
    });
  }, [form.eventName, form.eventId, existingExpenses, editingExpense]);

  // A main budget is only considered exhausted/disabled when:
  // 1) An expected budget exists and baseRemaining <= 0 (all budget spent across prior entries)
  // When baseRemaining > 0 (e.g. ₹3,300 remaining out of ₹7,800), the user is allowed to make multiple entries!
  const isBudgetExhausted = Boolean(
    selectedEventBudget &&
    selectedEventBudget.expected > 0 &&
    selectedEventBudget.baseRemaining <= 0
  );

  const isMainBudgetDisabled = Boolean(
    !editingExpense && isBudgetExhausted
  );

  // Existing recorded main budget amount for this event
  const recordedBudgetAmount = useMemo(() => {
    // When budget is exhausted, display the event's total Expected Budget amount (e.g. ₹7,800) instead of the last individual entry amount
    if (selectedEventBudget && selectedEventBudget.expected > 0) {
      return selectedEventBudget.expected;
    }

    if (!form.eventName && !form.eventId) return 0;
    const targetName = (form.eventName || "").trim().toLowerCase();
    const currentExpenseId = editingExpense ? (editingExpense.expenseId || editingExpense.id) : null;

    const existingMatch = (existingExpenses || []).find((ex) => {
      const exName = (ex.eventName || "").trim().toLowerCase();
      const isNotSame = !currentExpenseId || (ex.expenseId !== currentExpenseId && ex.id !== currentExpenseId);
      const isNotRejected = (ex.status || "").toLowerCase() !== "rejected";
      const budgetVal = Number(ex.budgetAmount !== undefined && ex.budgetAmount !== null ? ex.budgetAmount : ex.amount) || 0;
      return isNotSame && exName === targetName && isNotRejected && budgetVal > 0;
    });

    if (existingMatch) {
      return Number(existingMatch.budgetAmount !== undefined && existingMatch.budgetAmount !== null ? existingMatch.budgetAmount : existingMatch.amount) || 0;
    }
    return selectedEventBudget?.basePriorSpent || selectedEventBudget?.expected || 0;
  }, [form.eventName, form.eventId, existingExpenses, editingExpense, selectedEventBudget]);

  // Live calculation of main budget, additional expenses, and total expense
  const mainBudgetAmount = Number(sanitizeAmountInput(form.amount)) || 0;

  const extraExpensesSum = useMemo(() => {
    return roundToWhole(
      additionalExpenses.reduce((sum, item) => sum + (Number(sanitizeAmountInput(item.amount)) || 0), 0)
    );
  }, [additionalExpenses]);

  // Total Expense = Main Budget Amount + sum of additional expense amounts
  const totalCalculatedExpense = calculateTotalExpense(mainBudgetAmount, extraExpensesSum);

  // Live budget metrics updating immediately without waiting for Save:
  const liveBudgetMetrics = useMemo(() => {
    const expected = selectedEventBudget?.expected || 0;
    const priorSpent = selectedEventBudget?.basePriorSpent || 0;

    // Remaining Budget = max(Expected Budget - Main Budget Amount, 0)
    const remaining = calculateLiveRemainingBudget(expected, priorSpent, mainBudgetAmount);

    // Total Spent consistent with dashboard business logic
    const totalSpent = calculateLiveTotalSpent(priorSpent, mainBudgetAmount, extraExpensesSum);

    // Extra Amount Spent
    const extraSpent = calculateLiveExtraAmountSpent(expected, priorSpent, mainBudgetAmount, extraExpensesSum);

    return {
      expected,
      totalSpent,
      remaining,
      extraSpent,
    };
  }, [selectedEventBudget, mainBudgetAmount, extraExpensesSum]);

  // Disallow adding next row without entering value (reason and amount > 0) in current row(s)
  const hasIncompleteAdditionalRow = useMemo(() => {
    if (additionalExpenses.length === 0) return false;
    return additionalExpenses.some((r) => {
      const reasonEmpty = !r.reason || !r.reason.trim();
      const amountNum = Number(r.amount);
      const amountEmpty = !r.amount || !String(r.amount).trim() || isNaN(amountNum) || amountNum <= 0;
      return reasonEmpty || amountEmpty;
    });
  }, [additionalExpenses]);

  // Add Row gating rule:
  // 1) Disabled until Main Budget Amount reaches Expected Budget and Remaining Budget is zero.
  // 2) Without entering values (reason and amount > 0) in current row(s), do not allow adding another row.
  // 3) After valid row is entered, allow subsequent rows up to 10 rows.
  const canAddRow = useMemo(() => {
    if (hasIncompleteAdditionalRow) {
      return false;
    }
    return canAddAdditionalExpenseRow({
      eventSelected: Boolean(form.eventName),
      expectedBudget: selectedEventBudget?.expected || 0,
      priorSpent: selectedEventBudget?.basePriorSpent || 0,
      mainBudgetAmount,
      rows: additionalExpenses,
      currentRowsCount: additionalExpenses.length,
      maxRows: MAX_ADDITIONAL_EXPENSE_ROWS,
    });
  }, [form.eventName, selectedEventBudget, mainBudgetAmount, additionalExpenses, hasIncompleteAdditionalRow]);

  const isAddRowDisabled = !canAddRow || hasIncompleteAdditionalRow || additionalExpenses.length >= MAX_ADDITIONAL_EXPENSE_ROWS;

  // Auto-clamp main budget amount whenever selected event changes or updates
  useEffect(() => {
    if (selectedEventBudget && selectedEventBudget.expected > 0) {
      const currentNum = Number(sanitizeAmountInput(form.amount)) || 0;
      if (selectedEventBudget.baseRemaining <= 0) {
        if (form.amount !== "" && form.amount !== "0") {
          setForm((c) => ({ ...c, amount: "0" }));
        }
      } else if (currentNum > selectedEventBudget.baseRemaining) {
        setForm((c) => ({ ...c, amount: String(selectedEventBudget.baseRemaining) }));
      }
    }
  }, [selectedEventBudget?.baseRemaining, selectedEventBudget?.expected]);

  // Amount keydown filter: strictly digits 0-9 only, maximum 5 digits
  const handleAmountKeyDown = (e) => {
    const isControlKey =
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey;

    if (!isControlKey && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    if (!isControlKey) {
      const input = e.target;
      const hasSelection =
        input.selectionStart !== null &&
        input.selectionEnd !== null &&
        input.selectionStart !== input.selectionEnd;
      const currentVal = (input.value || "").replace(/[^0-9]/g, "");
      if (currentVal.length >= MAX_AMOUNT_DIGITS && !hasSelection) {
        e.preventDefault();
      }
    }
  };

  const handleMainAmountPaste = (e) => {
    e.preventDefault();
    const pasteText = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const digitsOnly = pasteText.replace(/[^0-9]/g, "");
    const input = e.target;
    const current = (input.value || "").replace(/[^0-9]/g, "");
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    let nextVal = (current.slice(0, start) + digitsOnly + current.slice(end)).slice(0, MAX_AMOUNT_DIGITS);
    if (selectedEventBudget && selectedEventBudget.baseRemaining != null) {
      const num = Number(nextVal) || 0;
      if (num > selectedEventBudget.baseRemaining) {
        nextVal = String(selectedEventBudget.baseRemaining);
      }
    }
    setForm((c) => ({ ...c, amount: nextVal }));
    if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
  };

  const handleMainAmountChange = (e) => {
    if (isMainBudgetDisabled) return;
    const raw = sanitizeAmountInput(e.target.value);
    let finalVal = raw;
    if (selectedEventBudget && selectedEventBudget.baseRemaining != null) {
      const num = Number(raw) || 0;
      if (num > selectedEventBudget.baseRemaining) {
        finalVal = String(selectedEventBudget.baseRemaining);
      }
    }
    setForm((c) => ({ ...c, amount: finalVal }));
    if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
  };

  const handleAddAdditionalExpenseRow = () => {
    if (isAddRowDisabled || hasIncompleteAdditionalRow) {
      if (hasIncompleteAdditionalRow) {
        toast.warning("Please enter Reason and Extra Amount for the current row before adding another row.");
      }
      return;
    }
    setAdditionalExpenses((prev) => {
      if (prev.length >= MAX_ADDITIONAL_EXPENSE_ROWS) return prev;
      return [
        ...prev,
        {
          id: `extra-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          reason: "",
          amount: "",
        },
      ];
    });
  };

  const handleRemoveAdditionalExpenseRow = (id) => {
    const row = additionalExpenses.find((r) => r.id === id);
    const hasValues = row && ((row.reason && row.reason.trim()) || (row.amount && Number(row.amount) > 0));
    if (hasValues) {
      setDeleteRowId(id);
    } else {
      executeRemoveAdditionalExpenseRow(id);
    }
  };

  const executeRemoveAdditionalExpenseRow = (id) => {
    setAdditionalExpenses((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`extra_reason_${id}`];
      delete next[`extra_amount_${id}`];
      return next;
    });
    setDeleteRowId(null);
  };

  const handleAdditionalExpenseChange = (id, field, value) => {
    setAdditionalExpenses((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "amount") {
          const sanitized = sanitizeAmountInput(value);
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

  const handleAdditionalExpensePaste = (id) => (e) => {
    e.preventDefault();
    const pasteText = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const digitsOnly = pasteText.replace(/[^0-9]/g, "");
    const input = e.target;
    const current = (input.value || "").replace(/[^0-9]/g, "");
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    const nextVal = (current.slice(0, start) + digitsOnly + current.slice(end)).slice(0, MAX_AMOUNT_DIGITS);
    handleAdditionalExpenseChange(id, "amount", nextVal);
  };

  const handleCloseAttempt = () => {
    onClose();
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

    const rawAmount = String(form.amount || "").trim();
    const numAmount = isMainBudgetDisabled ? 0 : (Number(rawAmount) || 0);
    const hasRemainingBudget = selectedEventBudget && selectedEventBudget.expected > 0;
    const maxBudgetLimit = hasRemainingBudget ? selectedEventBudget.baseRemaining : MAX_AMOUNT_VALUE;

    if (!isMainBudgetDisabled) {
      if (!rawAmount && additionalExpenses.length === 0) {
        newErrors.amount = "This field is required";
      } else if (rawAmount) {
        const validated = validateAmountInput(rawAmount, {
          required: additionalExpenses.length === 0,
          minAmount: 0,
          fieldName: "Main Budget Amount",
        });
        if (!validated.isValid) {
          newErrors.amount = validated.error;
        } else if (hasRemainingBudget && numAmount > maxBudgetLimit) {
          newErrors.amount = `Main Budget Amount cannot exceed remaining budget (${formatWholeCurrency(maxBudgetLimit)}). Use "+ Add Row" below for additional expenses.`;
        }
      }
    } else {
      if (additionalExpenses.length === 0) {
        newErrors.amount = "At least one additional expense is required because main budget is already recorded.";
      }
    }

    // Gating rule enforcement before saving:
    // If additional rows are present and expected budget exists, enforce that Main Budget Amount has reached the expected budget
    if (additionalExpenses.length > 0 && hasRemainingBudget && !isMainBudgetDisabled) {
      if (numAmount < maxBudgetLimit) {
        newErrors.amount = `Main Budget Amount must reach Expected Budget (${formatWholeCurrency(maxBudgetLimit)}) before adding additional expenses.`;
      }
    }

    // Validate additional expenses
    additionalExpenses.forEach((extra) => {
      if (!extra.reason || !extra.reason.trim()) {
        newErrors[`extra_reason_${extra.id}`] = "This field is required";
      }
      const rawExtra = String(extra.amount || "").trim();
      if (!rawExtra) {
        newErrors[`extra_amount_${extra.id}`] = "This field is required";
      } else {
        const validated = validateAmountInput(rawExtra, {
          required: true,
          minAmount: 1,
          fieldName: "Extra Amount",
        });
        if (!validated.isValid) {
          newErrors[`extra_amount_${extra.id}`] = validated.error;
        }
      }
    });

    const totalExpense = calculateTotalExpense(numAmount, extraExpensesSum);
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
        extraAmount: extraExpensesSum,
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
                      {COMMON_STRINGS.EXPENSES?.EXPECTED_BUDGET || "Total Amount"}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                      {formatWholeCurrency(liveBudgetMetrics.expected)}
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
                      {formatWholeCurrency(liveBudgetMetrics.totalSpent)}
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
                        color: liveBudgetMetrics.remaining > 0 ? "success.main" : "text.secondary",
                      }}
                    >
                      {formatWholeCurrency(liveBudgetMetrics.remaining)}
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
                        color: liveBudgetMetrics.extraSpent > 0 ? "error.main" : "text.secondary",
                      }}
                    >
                      {formatWholeCurrency(liveBudgetMetrics.extraSpent)}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Notice if remaining budget is 0 or event exceeded budget */}
                {liveBudgetMetrics.remaining === 0 ? (
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
                      Budget limit reached. Use "Add Row" below for additional expenses.
                    </Typography>
                  </Box>
                ) : liveBudgetMetrics.extraSpent > 0 ? (
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
                      Note: Extra spending of {formatWholeCurrency(liveBudgetMetrics.extraSpent)} recorded beyond the expected budget.
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
                selectedEventBudget && selectedEventBudget.baseRemaining === 0
                  ? "₹ 0 (Remaining: ₹0)"
                  : selectedEventBudget && selectedEventBudget.baseRemaining > 0
                  ? `Enter amount (Remaining: ${formatWholeCurrency(selectedEventBudget.baseRemaining)})`
                  : "₹ Enter budget amount (max 5 digits)"
              }
              value={isMainBudgetDisabled ? String(recordedBudgetAmount || "") : form.amount}
              disabled={isMainBudgetDisabled}
              onChange={handleMainAmountChange}
              onKeyDown={handleAmountKeyDown}
              onPaste={handleMainAmountPaste}
              restrictType="numberonly"
              maxLength={MAX_AMOUNT_DIGITS}
              error={!isMainBudgetDisabled && !!errors.amount}
              helperText={errors.amount || ""}
              required={!isMainBudgetDisabled && additionalExpenses.length === 0}
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
                </Box>
                <Tooltip
                  title={
                    !form.eventName
                      ? "Please select an event first"
                      : additionalExpenses.length >= MAX_ADDITIONAL_EXPENSE_ROWS
                      ? `Maximum ${MAX_ADDITIONAL_EXPENSE_ROWS} additional expense rows allowed`
                      : hasIncompleteAdditionalRow
                      ? "Please enter Reason and Extra Amount for the current row before adding another row"
                      : !canAddRow
                      ? `Main Budget Amount must reach Expected Budget (${formatWholeCurrency(selectedEventBudget?.baseRemaining || 0)}) and Remaining Budget must be ₹0 before adding additional rows`
                      : `Add an additional expense row (up to ${MAX_ADDITIONAL_EXPENSE_ROWS} rows)`
                  }
                >
                  <span>
                    <AppButton
                      variant="outlined"
                      size="small"
                      disabled={isAddRowDisabled}
                      startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                      onClick={handleAddAdditionalExpenseRow}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: "none",
                        fontWeight: 700,
                      }}
                    >
                      Add Row {additionalExpenses.length > 0 ? `(${additionalExpenses.length}/${MAX_ADDITIONAL_EXPENSE_ROWS})` : ""}
                    </AppButton>
                  </span>
                </Tooltip>
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
                            onKeyDown={handleAmountKeyDown}
                            onPaste={handleAdditionalExpensePaste(extra.id)}
                            error={Boolean(errors[`extra_amount_${extra.id}`])}
                            helperText={errors[`extra_amount_${extra.id}`]}
                            maxLength={MAX_AMOUNT_DIGITS}
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
                  `1px solid ${t.palette.mode === "dark"
                    ? "rgba(99, 102, 241, 0.3)"
                    : "rgba(99, 102, 241, 0.2)"
                  }`,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {isMainBudgetDisabled ? "Main Budget (Recorded):" : "Main Budget Amount:"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatWholeCurrency(isMainBudgetDisabled ? recordedBudgetAmount : mainBudgetAmount)}
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

      {/* Confirmation Dialog before deleting an additional expense row */}
      <AppConfirmDialog
        open={Boolean(deleteRowId)}
        onClose={() => setDeleteRowId(null)}
        onConfirm={() => {
          if (deleteRowId) {
            executeRemoveAdditionalExpenseRow(deleteRowId);
          }
        }}
        title="Delete Additional Expense Row"
        content="Are you sure want to Delete ?"
        confirmText="Delete"
        confirmColor="error"
      />
    </>
  );
}
