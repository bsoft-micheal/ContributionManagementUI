import React, { useEffect, useState, useMemo } from "react";
import { Typography, Box, IconButton, Tooltip, Grid } from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  FilterList as FilterListIcon,
  HistoryRounded as HistoryRoundedIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton, { AppAddButton, AppCancelButton, AppSaveButton, AppClearFilterButton } from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import RateUpdateModal from "../../components/events/RateUpdateModal";
import RateHistoryModal from "../../components/events/RateHistoryModal";
import {
  getBudgetCalculationsAsync,
  createBudgetCalculationAsync,
  updateBudgetCalculationAsync,
  deleteBudgetCalculationAsync,
} from "../../services/budgetCalculationService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getExpensesAsync } from "../../services/expenseService";
import { getEventsAsync } from "../../services/eventService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { formatWholeCurrency, formatWholeNumber } from "../../utils/roundingHelper";
import { COMMON_STRINGS, TOAST_MESSAGES } from "../../constants";

const formatRateAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "").slice(0, 5);
  if (!cleanVal) return "";
  return formatWholeNumber(cleanVal);
};

const initialForm = {
  expenseItem: "",
  rate: "",
  category: "",
  isActive: true,
};

export default function BudgetCalculationsPage() {
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const [items, setItems] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rateUpdateModalOpen, setRateUpdateModalOpen] = useState(false);
  const [rateUpdateItem, setRateUpdateItem] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState(null);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [appliedCategory, setAppliedCategory] = useState("ALL");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [budgetData, typesData, expensesData, eventsData] = await Promise.all([
        getBudgetCalculationsAsync(),
        getEventTypesAsync().catch(() => []),
        getExpensesAsync().catch(() => []),
        getEventsAsync().catch(() => []),
      ]);

      const expenseList = Array.isArray(expensesData) ? expensesData : [];
      const eventList = Array.isArray(eventsData) ? eventsData : [];
      const eventTypeList = Array.isArray(typesData) ? typesData : [];

      const processedItems = (Array.isArray(budgetData) ? budgetData : []).map((item) => {
        const itemClean = (item.expenseItem || "").trim().toLowerCase();
        const catClean = (item.category || "").trim().toLowerCase();
        const typeIdClean = (item.eventTypeId || "").trim().toLowerCase();

        // 1. Check if used in Expenses
        const inExpenses = expenseList.some((ex) => {
          const desc = (ex.description || "").toLowerCase();
          const cat = (ex.category || "").toLowerCase();
          const eventName = (ex.eventName || "").toLowerCase();
          return (
            (itemClean && desc.includes(itemClean)) ||
            (catClean && cat === catClean && eventName.includes(itemClean))
          );
        });

        // 2. Check if used in Events (by matching EventType or event description/name)
        const inEvents = eventList.some((ev) => {
          if (!ev || ev.isDeleted) return false;
          // Match by eventTypeId
          if (typeIdClean && (
            (ev.eventTypeId && String(ev.eventTypeId).toLowerCase() === typeIdClean) ||
            (Array.isArray(ev.eventTypeIds) && ev.eventTypeIds.some((id) => String(id).toLowerCase() === typeIdClean))
          )) {
            return true;
          }
          // Match by EventType name
          const evTypeName = (ev.eventTypeName || ev.eventType?.eventTypeName || "").toLowerCase();
          if (catClean && evTypeName && (evTypeName === catClean || evTypeName.includes(catClean) || catClean.includes(evTypeName))) {
            return true;
          }
          // Match by item in event description or name
          const evDesc = (ev.description || "").toLowerCase();
          const evName = (ev.eventName || "").toLowerCase();
          return (itemClean && (evDesc.includes(itemClean) || evName.includes(itemClean)));
        });

        const isReferred = Boolean(item.isReferred || item.IsReferred || inExpenses || inEvents);

        return {
          ...item,
          isReferred,
          IsReferred: isReferred,
        };
      });

      setItems(processedItems);
      setEventTypes(Array.isArray(typesData) ? typesData : []);
    } catch (error) {
      toast.error(error, "Failed to load budget calculations");
    } finally {
      setLoading(false);
    }
  }

  // Filter panel Event Type dropdown options
  const categoryFilterOptions = useMemo(() => {
    return [
      { label: "All Event Types", value: "ALL" },
      ...(eventTypes || []).map((t) => ({
        label: t.eventTypeName,
        value: t.eventTypeName,
      })),
    ];
  }, [eventTypes]);

  // Form Event Type dropdown options for Add/Edit dialog
  const formCategoryOptions = useMemo(() => {
    const list = (eventTypes || []).map((t) => ({
      label: t.eventTypeName,
      value: t.eventTypeName,
    }));
    if (
      form.category &&
      !list.some((o) => o.value.toLowerCase() === form.category.toLowerCase())
    ) {
      list.unshift({ label: form.category, value: form.category });
    }
    return list;
  }, [eventTypes, form.category]);

  // Filtered rows based on applied Event Type filter
  const filteredItems = useMemo(() => {
    if (appliedCategory === "ALL") return items;
    const appliedLower = appliedCategory.toLowerCase();
    const matchedType = eventTypes.find(
      (t) => t.eventTypeName.toLowerCase() === appliedLower
    );
    const targetTypeId = matchedType?.eventTypeId;

    return items.filter((item) => {
      if (targetTypeId && item.eventTypeId && item.eventTypeId.toLowerCase() === targetTypeId.toLowerCase()) {
        return true;
      }
      const cat = item.category || "";
      return cat.toLowerCase() === appliedLower;
    });
  }, [items, appliedCategory, eventTypes]);

  async function handleSubmit() {
    const fieldRequired = "This field is required";
    const schema = {
      category: { required: true, label: fieldRequired },
      expenseItem: { required: true, min: 2, max: 100, label: fieldRequired },
      rate: {
        required: true,
        label: fieldRequired,
        customValidate: (val) => {
          if (val === "" || val === undefined || val === null || String(val).trim() === "") {
            return fieldRequired;
          }
          const num = Number(String(val).replace(/[^0-9]/g, ""));
          if (isNaN(num) || num <= 0) {
            return "Rate must be greater than 0";
          }
          if (String(num).length > 5 || num > 99999) {
            return "Rate cannot exceed 5 characters";
          }
          return "";
        },
      },
    };

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill required field");
      return;
    }

    const selectedCategory =
      form.category?.trim() || eventTypes[0]?.eventTypeName || "Birthday";
    const matchedType = eventTypes.find(
      (t) =>
        (form.eventTypeId && t.eventTypeId === form.eventTypeId) ||
        t.eventTypeName.toLowerCase() === selectedCategory.toLowerCase()
    );
    const categoryName = matchedType ? matchedType.eventTypeName : selectedCategory;
    const targetItemName = form.expenseItem?.trim().toLowerCase();

    const isDuplicate = items.some(
      (it) =>
        it.expenseItem &&
        it.expenseItem.trim().toLowerCase() === targetItemName &&
        (it.category || "").trim().toLowerCase() === categoryName.toLowerCase() &&
        (!form.budgetCalculationId || it.budgetCalculationId !== form.budgetCalculationId)
    );
    if (isDuplicate) {
      setErrors((prev) => ({ ...prev, expenseItem: "Expense item already exists for this event type" }));
      toast.error("Expense item already exists for this event type");
      return;
    }
    try {
      const payload = {
        ...form,
        category: matchedType ? matchedType.eventTypeName : selectedCategory,
        eventTypeId: matchedType ? matchedType.eventTypeId : form.eventTypeId || null,
        expenseItem: form.expenseItem.trim(),
        rate: Number(String(form.rate).replace(/[^0-9]/g, "") || 0),
        isActive: form.isActive !== undefined ? form.isActive : true,
      };

      if (form.budgetCalculationId) {
        await updateBudgetCalculationAsync(form.budgetCalculationId, payload);
        toast.success("Saved successfully");
      } else {
        await createBudgetCalculationAsync(payload);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error, "Failed to save");
    }
  }

  function handleDeleteRequest(id) {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (itemToDelete) {
      try {
        await deleteBudgetCalculationAsync(itemToDelete);
        toast.success(TOAST_MESSAGES.BUDGET.DELETED_SUCCESS);
        loadData();
      } catch (error) {
        const rawMsg = error.response?.data?.message || error.response?.data?.title || error.message || "";
        if (/in use|referenced|associated|assigned|constraint|foreign key|cannot delete/i.test(rawMsg)) {
          toast.error(TOAST_MESSAGES.GENERAL.RECORD_IN_USE);
        } else {
          toast.error(TOAST_MESSAGES.GENERAL.DELETE_FAILED);
        }
      } finally {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
      }
    }
  }

  function handleToggleStatusRequest(row) {
    setItemToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!itemToToggle) return;
    try {
      const payload = {
        ...itemToToggle,
        isActive: !itemToToggle.isActive,
      };
      await updateBudgetCalculationAsync(itemToToggle.budgetCalculationId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadData();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setStatusConfirmOpen(false);
      setItemToToggle(null);
    }
  }

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Rate" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setRateUpdateItem(row);
                  setRateUpdateModalOpen(true);
                }}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.1rem",
                    color: (theme) =>
                      hasWriteAccess
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

          <Tooltip title="View Rate History">
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                onClick={() => {
                  setHistoryItem(row);
                  setHistoryModalOpen(true);
                }}
              >
                <HistoryRoundedIcon
                  sx={{
                    fontSize: "1.15rem",
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>

          {(() => {
            const isReferred = Boolean(row.isReferred || row.IsReferred);
            const isDeleteDisabled = !hasWriteAccess || isReferred;
            const tooltipTitle = isReferred
              ? (TOAST_MESSAGES.GENERAL.RECORD_IN_USE || "Refered")
              : (hasWriteAccess ? "Delete Expense Item" : "Disabled");

            return (
              <Tooltip title={tooltipTitle}>
                <span style={{ display: "inline-flex", cursor: isDeleteDisabled ? "not-allowed" : "pointer" }}>
                  <IconButton
                    size="small"
                    sx={{ p: 0.3 }}
                    disabled={isDeleteDisabled}
                    onClick={() => handleDeleteRequest(row.budgetCalculationId)}
                  >
                    <DeleteIcon
                      sx={{
                        fontSize: "1.1rem",
                        color: (theme) =>
                          !isDeleteDisabled
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
            );
          })()}
          <Tooltip
            title={
              hasWriteAccess
                ? row.isActive
                  ? "Deactivate Expense Item"
                  : "Activate Expense Item"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#10b981" : "#94a3b8",
                    }}
                  />
                ) : (
                  <ToggleOffIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#ef4444" : "#94a3b8",
                    }}
                  />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    {
      label: "Expense Item",
      key: "expenseItem",
      render: (row) => (
        <Tooltip title={row.expenseItem && row.expenseItem.length > 25 ? row.expenseItem : ""} arrow>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              maxWidth: 240,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: row.expenseItem && row.expenseItem.length > 25 ? "pointer" : "default",
            }}
          >
            {row.expenseItem && row.expenseItem.length > 25
              ? `${row.expenseItem.slice(0, 25)}...`
              : row.expenseItem || "--"}
          </Typography>
        </Tooltip>
      ),
    },
    {
      label: "Event Type",
      key: "category",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            color: (theme) => (theme.palette.mode === "dark" ? "#e2e8f0" : "#334155"),
          }}
        >
          {row.category || "--"}
        </Typography>
      ),
    },
    {
      label: "Rate",
      key: "rate",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {formatWholeCurrency(row.rate ?? 0)}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{
            color: row.isActive ? "#16a34a" : "#64748b",
            bgcolor: row.isActive ? "rgba(22,163,74,0.08)" : "rgba(100,116,139,0.08)",
            px: 1.2,
            py: 0.3,
            borderRadius: "3px",
            fontSize: "0.7rem",
            letterSpacing: "0.04em",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) =>
        formatGridDate(
          row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn
        ),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Manage Budget Calculations"
        columns={columns}
        data={filteredItems}
        loading={loading}
        filterPanel={
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 1.25,
              width: "100%",
            }}
          >
            <Box sx={{ width: { xs: "100%", sm: 200, md: 230 } }}>
              <AppSelect
                label="Select Event Type"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value || "ALL")}
                onClear={() => setFilterCategory("ALL")}
                options={categoryFilterOptions}
                size="small"
                placeholder="Select Event Type"
                fullWidth
              />
            </Box>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                onClick={() => setAppliedCategory(filterCategory)}
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
              <AppClearFilterButton
                filters={{
                  category: filterCategory,
                }}
                onClick={() => {
                  setFilterCategory("ALL");
                  setAppliedCategory("ALL");
                }}
              />
            </Box>
          </Box>
        }
        actions={
          <AppAddButton
            disabled={!hasWriteAccess}
            onClick={() => {
              const defaultCat =
                filterCategory && filterCategory !== "ALL"
                  ? filterCategory
                  : eventTypes[0]?.eventTypeName || "Birthday";
              const matchedType = eventTypes.find(
                (t) => t.eventTypeName.toLowerCase() === defaultCat.toLowerCase()
              );
              setForm({
                ...initialForm,
                category: defaultCat,
                eventTypeId: matchedType?.eventTypeId || "",
              });
              setErrors({});
              setDialogOpen(true);
            }}
          />
        }
      />

      {/* Add New Budget Calculation Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          form.budgetCalculationId
            ? "Edit Budget Calculation"
            : "Add Budget Calculation"
        }
        actions={
          <>
            <AppCancelButton onClick={() => setDialogOpen(false)} />
            <AppSaveButton onClick={handleSubmit}>
              {form.budgetCalculationId ? "Update" : "Save"}
            </AppSaveButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <AppSelect
            label="Event Type"
            placeholder="Select Event Type"
            options={formCategoryOptions}
            value={form.category}
            onChange={(e) => {
              const val = e.target.value;
              const matched = eventTypes.find(
                (t) => t.eventTypeName.toLowerCase() === val.toLowerCase()
              );
              setForm((f) => ({
                ...f,
                category: val,
                eventTypeId: matched?.eventTypeId || "",
              }));
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: "" }));
              }
            }}
            error={!!errors.category}
            helperText={errors.category}
            required
            fullWidth
          />
          <AppInput
            label="Expense Item"
            placeholder="Enter Expense Item"
            fullWidth
            value={form.expenseItem}
            onChange={(e) => {
              setForm((f) => ({ ...f, expenseItem: e.target.value }));
              if (errors.expenseItem) {
                setErrors((prev) => ({ ...prev, expenseItem: "" }));
              }
            }}
            maxLength={100}
            error={!!errors.expenseItem}
            helperText={errors.expenseItem}
            required
          />
          <AppInput
            label="Rate"
            placeholder="Enter Rate"
            fullWidth
            value={formatRateAmount(form.rate)}
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
              setForm((f) => ({
                ...f,
                rate: rawVal === "" ? "" : Number(rawVal),
              }));
              if (errors.rate) {
                setErrors((prev) => ({ ...prev, rate: "" }));
              }
            }}
            maxLength={6}
            error={!!errors.rate}
            helperText={errors.rate}
            required
          />
          {form.budgetCalculationId && (
            <AppSwitch
              label="Active Or Inactive"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
          )}
        </Box>
      </AppDialog>

      {/* Update Rate Modal */}
      <RateUpdateModal
        open={rateUpdateModalOpen}
        onClose={() => {
          setRateUpdateModalOpen(false);
          setRateUpdateItem(null);
        }}
        item={rateUpdateItem}
        onSuccess={loadData}
      />

      {/* Rate History Modal */}
      <RateHistoryModal
        open={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryItem(null);
        }}
        item={historyItem}
      />

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${
          itemToToggle?.isActive ? "deactivate" : "activate"
        } this budget calculation item?`}
      />
    </div>
  );
}
