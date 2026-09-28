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
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import {
  getBudgetCalculationsAsync,
  createBudgetCalculationAsync,
  updateBudgetCalculationAsync,
  deleteBudgetCalculationAsync,
} from "../../services/budgetCalculationService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { COMMON_STRINGS } from "../../constants";

const formatRateAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "");
  if (!cleanVal) return "";
  return Number(cleanVal).toLocaleString("en-US");
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
      const [budgetData, typesData] = await Promise.all([
        getBudgetCalculationsAsync(),
        getEventTypesAsync().catch(() => []),
      ]);
      setItems(Array.isArray(budgetData) ? budgetData : []);
      setEventTypes(Array.isArray(typesData) ? typesData : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load budget calculations");
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
    return items.filter((item) => {
      const cat = item.category || "Birthday";
      return cat.toLowerCase() === appliedCategory.toLowerCase();
    });
  }, [items, appliedCategory]);

  async function handleSubmit() {
    const fieldRequired = "This field is required";
    const schema = {
      category: { required: true, label: fieldRequired },
      expenseItem: { required: true, min: 2, max: 100, label: fieldRequired },
      rate: {
        required: true,
        label: fieldRequired,
        customValidate: (val) => {
          const num = Number(String(val).replace(/[^0-9]/g, ""));
          if (val === "" || val === undefined || val === null || isNaN(num) || num < 0) {
            return fieldRequired;
          }
          if (num > 1000000) {
            return "Rate cannot exceed 1,000,000";
          }
          return "";
        },
      },
    };

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      const selectedCategory =
        form.category?.trim() || eventTypes[0]?.eventTypeName || "Birthday";
      const payload = {
        ...form,
        category: selectedCategory,
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
      toast.error(error.response?.data?.message || "Failed to save");
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
        toast.success("Deleted successfully");
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete");
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
      toast.success("Status updated successfully");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to update status");
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
          <Tooltip title={hasWriteAccess ? "Edit Expense Item" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setForm({
                    ...row,
                    category: row.category || "Birthday",
                  });
                  setErrors({});
                  setDialogOpen(true);
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete Expense Item" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row.budgetCalculationId)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.1rem",
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
                      color: hasWriteAccess ? "#10b981" : "#cbd5e1",
                    }}
                  />
                ) : (
                  <ToggleOffIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#ef4444" : "#cbd5e1",
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
        <Typography variant="body2" fontWeight={700}>
          {row.expenseItem}
        </Typography>
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
          {row.category || "Birthday"}
        </Typography>
      ),
    },
    {
      label: "Rate",
      key: "rate",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          ₹{(row.rate ?? 0).toLocaleString("en-IN")}
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
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{ xs: 12, md: 8 }}
              sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
            >
              <Box sx={{ minWidth: 200 }}>
                <AppSelect
                  label="Select Event Type"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  options={categoryFilterOptions}
                  size="small"
                  placeholder="Select Event Type"
                  required
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => setAppliedCategory(filterCategory)}
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
                  setFilterCategory("ALL");
                  setAppliedCategory("ALL");
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
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={() => {
              setForm({
                ...initialForm,
                category: eventTypes[0]?.eventTypeName || "Birthday",
              });
              setErrors({});
              setDialogOpen(true);
            }}
          >
            Add
          </AppButton>
        }
      />

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
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              sx={{
                bgcolor: "#4a3f6b !important",
                "&:hover": { bgcolor: "#3b325c !important" },
              }}
            >
              Save
            </AppButton>
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
              setForm((f) => ({ ...f, category: e.target.value }));
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
            placeholder="Enter expense item name (e.g. ½ kg Cake)"
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
            placeholder="Enter rate (₹)"
            fullWidth
            value={formatRateAmount(form.rate)}
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "");
              setForm((f) => ({
                ...f,
                rate: rawVal === "" ? "" : Number(rawVal),
              }));
              if (errors.rate) {
                setErrors((prev) => ({ ...prev, rate: "" }));
              }
            }}
            maxLength={15}
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
