import React, { useEffect, useState, useMemo } from "react";
import { Typography, Box, IconButton, Tooltip, Grid, Chip } from "@mui/material";
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
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import {
  getStatusesAsync,
  getModulesAsync,
  createStatusAsync,
  updateStatusAsync,
  deleteStatusAsync,
} from "../../services/statusService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

export const DEFAULT_MODULES = [
  "Support Ticket",
  "Expense",
  "Events",
  "Contributions / Payments",
  "Members",
  "Exit Process",
  "Budget Calculations",
  "General",
];

const initialStatusForm = {
  statusName: "",
  module: "Support Ticket",
  isActive: true,
};

export default function StatusPage() {
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;
  const toast = useAppToast();

  // ==================== Status State ====================
  const [items, setItems] = useState([]);
  const [dbModules, setDbModules] = useState(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState(null);

  // Module filter state
  const [filterModule, setFilterModule] = useState("ALL");
  const [appliedModule, setAppliedModule] = useState("ALL");

  const [form, setForm] = useState(initialStatusForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  // ==================== Status Handlers ====================
  async function loadData() {
    setLoading(true);
    try {
      const [statusData, modulesData] = await Promise.all([
        getStatusesAsync(),
        getModulesAsync().catch(() => []),
      ]);
      setItems(Array.isArray(statusData) ? statusData : []);
      if (Array.isArray(modulesData) && modulesData.length > 0) {
        setDbModules(modulesData);
      }
    } catch (error) {
      toast.error(error, "Failed to load statuses");
    } finally {
      setLoading(false);
    }
  }

  // Combined dynamic modules list
  const availableModules = useMemo(() => {
    const set = new Set(DEFAULT_MODULES);
    (dbModules || []).forEach((m) => m && set.add(m));
    (items || []).forEach((s) => s.module && set.add(s.module));
    return Array.from(set).sort();
  }, [dbModules, items]);

  // Filter dropdown options
  const moduleFilterOptions = useMemo(() => [
    { label: "All Modules", value: "ALL" },
    ...availableModules.map((m) => ({ label: m, value: m })),
  ], [availableModules]);

  // Form dropdown options
  const formModuleOptions = useMemo(() => {
    return availableModules.map((m) => ({ label: m, value: m }));
  }, [availableModules]);

  // Filtered rows based on applied module filter
  const filteredItems = useMemo(() => {
    if (appliedModule === "ALL") return items;
    return items.filter((item) => {
      const mod = item.module || "General";
      return mod.toLowerCase() === appliedModule.toLowerCase();
    });
  }, [items, appliedModule]);

  async function handleSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD || "This field is required";
    const schema = {
      statusName: { required: true, min: 2, max: 100, label: fieldRequired },
      module: { required: true, label: "Module is required" },
    };

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        statusName: form.statusName.trim(),
        module: form.module ? form.module.trim() : "General",
        isActive: form.isActive !== undefined ? form.isActive : true,
      };

      if (form.statusId) {
        await updateStatusAsync(form.statusId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await createStatusAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleDeleteRequest(id) {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (itemToDelete) {
      try {
        await deleteStatusAsync(itemToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadData();
      } catch (error) {
        toast.error(error, TOAST_MESSAGES.GENERAL.DELETE_FAILED);
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
        statusName: itemToToggle.statusName,
        module: itemToToggle.module || "General",
        isActive: !itemToToggle.isActive,
      };
      await updateStatusAsync(itemToToggle.statusId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadData();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setStatusConfirmOpen(false);
      setItemToToggle(null);
    }
  }

  // ==================== Status Columns ====================
  const statusColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Status" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setForm({
                    statusId: row.statusId,
                    statusName: row.statusName || "",
                    module: row.module || "Support Ticket",
                    isActive: row.isActive ?? true,
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
          <Tooltip title={row.isReferred || row.IsReferred ? "Cannot delete: this status is assigned to tickets, expenses, transactions, or events" : (hasWriteAccess ? "Delete Status" : "")}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)}
                onClick={() => handleDeleteRequest(row.statusId)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.1rem",
                    color: (theme) =>
                      hasWriteAccess && !(row.isReferred || row.IsReferred)
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
                  ? "Deactivate Status"
                  : "Activate Status"
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
      label: "Status",
      key: "statusName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.statusName}
        </Typography>
      ),
    },
    {
      label: "Module",
      key: "module",
      render: (row) => (
        <Chip
          label={row.module || "General"}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            bgcolor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(196, 181, 253, 0.12)"
                : "rgba(74, 63, 107, 0.08)",
            color: (t) =>
              t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
            border: (t) =>
              `1px solid ${
                t.palette.mode === "dark"
                  ? "rgba(196, 181, 253, 0.25)"
                  : "rgba(74, 63, 107, 0.2)"
              }`,
          }}
        />
      ),
    },
    {
      label: "Active Status",
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
      {/* 1. Manage Status with Module Filter */}
      <AppDataTable
        title="Module Wise Status "
        columns={statusColumns}
        data={filteredItems}
        loading={loading}
        filterPanel={
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <AppSelect
                label="Select Module"
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                options={moduleFilterOptions}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: "auto" }} sx={{ display: "flex", gap: 1, mt: { xs: 0, sm: 2.5 } }}>
              <AppButton
                variant="contained"
                startIcon={<FilterListIcon />}
                onClick={() => setAppliedModule(filterModule)}
              >
                Filter
              </AppButton>
              <AppButton
                variant="outlined"
                color="error"
                onClick={() => {
                  setFilterModule("ALL");
                  setAppliedModule("ALL");
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
                ...initialStatusForm,
                module: appliedModule !== "ALL" ? appliedModule : "Support Ticket",
              });
              setErrors({});
              setDialogOpen(true);
            }}
          >
            Add
          </AppButton>
        }
      />

      {/* ==================== Status Dialog ==================== */}
      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.statusId ? "Edit Status" : "Add Status"}
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <AppSelect
            label="Module"
            placeholder="Select Module"
            fullWidth
            value={form.module}
            onChange={(e) => {
              setForm((f) => ({ ...f, module: e.target.value }));
              if (errors.module) {
                setErrors((prev) => ({ ...prev, module: "" }));
              }
            }}
            options={formModuleOptions}
            error={!!errors.module}
            helperText={errors.module}
            required
          />

          <AppInput
            label="Status Name"
            placeholder="Enter status name (e.g. Open, In Progress, Closed)"
            fullWidth
            value={form.statusName}
            onChange={(e) => {
              setForm((f) => ({ ...f, statusName: e.target.value }));
              if (errors.statusName) {
                setErrors((prev) => ({ ...prev, statusName: "" }));
              }
            }}
            maxLength={100}
            error={!!errors.statusName}
            helperText={errors.statusName}
            required
          />

          {form.statusId && (
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

      {/* Status Delete Confirmation */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Status Toggle Confirmation */}
      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${
          itemToToggle?.isActive ? "deactivate" : "activate"
        } this status?`}
      />
    </div>
  );
}
