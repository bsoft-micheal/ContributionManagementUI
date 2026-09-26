import React, { useEffect, useState } from "react";
import { Typography, Box, IconButton, Tooltip } from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import {
  GetStatusesAsync,
  CreateStatusAsync,
  UpdateStatusAsync,
  DeleteStatusAsync,
} from "../../services/statusService";
import {
  GetPrioritiesAsync,
  CreatePriorityAsync,
  UpdatePriorityAsync,
  DeletePriorityAsync,
} from "../../services/priorityService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const initialStatusForm = {
  statusName: "",
  isActive: true,
};

const initialPriorityForm = {
  priorityName: "",
  isActive: true,
};

export default function StatusPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Status", authState?.role);
  const hasWriteAccess = rights.write;
  const toast = useAppToast();

  // ==================== Status State ====================
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState(null);
  const [form, setForm] = useState(initialStatusForm);
  const [errors, setErrors] = useState({});

  // ==================== Priority State ====================
  const [priorities, setPriorities] = useState([]);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [priorityDeleteConfirmOpen, setPriorityDeleteConfirmOpen] = useState(false);
  const [priorityToDelete, setPriorityToDelete] = useState(null);
  const [priorityStatusConfirmOpen, setPriorityStatusConfirmOpen] = useState(false);
  const [priorityToToggle, setPriorityToToggle] = useState(null);
  const [priorityForm, setPriorityForm] = useState(initialPriorityForm);
  const [priorityErrors, setPriorityErrors] = useState({});

  useEffect(() => {
    loadData();
    loadPriorities();
  }, []);

  // ==================== Status Handlers ====================
  async function loadData() {
    setLoading(true);
    try {
      const data = await GetStatusesAsync();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load statuses");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED;
    const schema = {
      statusName: { required: true, min: 2, max: 100, label: fieldRequired },
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
        isActive: form.isActive !== undefined ? form.isActive : true,
      };

      if (form.statusId) {
        await UpdateStatusAsync(form.statusId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await CreateStatusAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleDeleteRequest(id) {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (itemToDelete) {
      try {
        await DeleteStatusAsync(itemToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
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
        isActive: !itemToToggle.isActive,
      };
      await UpdateStatusAsync(itemToToggle.statusId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setStatusConfirmOpen(false);
      setItemToToggle(null);
    }
  }

  // ==================== Priority Handlers ====================
  async function loadPriorities() {
    setPrioritiesLoading(true);
    try {
      const data = await GetPrioritiesAsync();
      setPriorities(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load priorities");
    } finally {
      setPrioritiesLoading(false);
    }
  }

  async function handlePrioritySubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED;
    const schema = {
      priorityName: { required: true, min: 2, max: 100, label: fieldRequired },
    };

    const newErrors = validateForm(priorityForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setPriorityErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        priorityName: priorityForm.priorityName.trim(),
        isActive: priorityForm.isActive !== undefined ? priorityForm.isActive : true,
      };

      if (priorityForm.priorityId) {
        await UpdatePriorityAsync(priorityForm.priorityId, payload);
        toast.success("Priority updated successfully!");
      } else {
        await CreatePriorityAsync(payload);
        toast.success("Priority created successfully!");
      }
      setPriorityDialogOpen(false);
      loadPriorities();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handlePriorityDeleteRequest(id) {
    setPriorityToDelete(id);
    setPriorityDeleteConfirmOpen(true);
  }

  async function handleConfirmPriorityDelete() {
    if (priorityToDelete) {
      try {
        await DeletePriorityAsync(priorityToDelete);
        toast.success("Priority deleted successfully!");
        loadPriorities();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
      } finally {
        setPriorityDeleteConfirmOpen(false);
        setPriorityToDelete(null);
      }
    }
  }

  function handlePriorityToggleStatusRequest(row) {
    setPriorityToToggle(row);
    setPriorityStatusConfirmOpen(true);
  }

  async function handleConfirmPriorityStatusToggle() {
    if (!priorityToToggle) return;
    try {
      const payload = {
        priorityName: priorityToToggle.priorityName,
        isActive: !priorityToToggle.isActive,
      };
      await UpdatePriorityAsync(priorityToToggle.priorityId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadPriorities();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setPriorityStatusConfirmOpen(false);
      setPriorityToToggle(null);
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
          <Tooltip title={hasWriteAccess ? "Delete Status" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row.statusId)}
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

  // ==================== Priority Columns ====================
  const priorityColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Priority" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setPriorityForm({
                    priorityId: row.priorityId,
                    priorityName: row.priorityName || "",
                    isActive: row.isActive ?? true,
                  });
                  setPriorityErrors({});
                  setPriorityDialogOpen(true);
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
          <Tooltip title={hasWriteAccess ? "Delete Priority" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handlePriorityDeleteRequest(row.priorityId)}
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
                  ? "Deactivate Priority"
                  : "Activate Priority"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handlePriorityToggleStatusRequest(row)}
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
      label: "Priority",
      key: "priorityName",
      render: (row) => {
        const isHigh = row.priorityName === "High" || row.priorityName === "Urgent";
        const isMedium = row.priorityName === "Medium";
        return (
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              color: isHigh ? "#ef4444" : isMedium ? "#f59e0b" : "#3b82f6",
            }}
          >
            {row.priorityName}
          </Typography>
        );
      },
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
    <div className="page-shell" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Manage Status */}
      <AppDataTable
        title="Manage Status"
        columns={statusColumns}
        data={items}
        loading={loading}
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={() => {
              setForm(initialStatusForm);
              setErrors({});
              setDialogOpen(true);
            }}
          >
            Add
          </AppButton>
        }
      />

      {/* 2. Manage Priority */}
      <AppDataTable
        title="Manage Priority"
        columns={priorityColumns}
        data={priorities}
        loading={prioritiesLoading}
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={() => {
              setPriorityForm(initialPriorityForm);
              setPriorityErrors({});
              setPriorityDialogOpen(true);
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <AppInput
            label="Status Name"
            placeholder="Enter status name (e.g. Open, In Progress)"
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

      {/* ==================== Priority Dialog ==================== */}
      <AppDialog
        open={priorityDialogOpen}
        onClose={() => setPriorityDialogOpen(false)}
        title={priorityForm.priorityId ? "Edit Priority" : "Add Priority"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setPriorityDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handlePrioritySubmit}
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
          <AppInput
            label="Priority Name"
            placeholder="Enter priority name (e.g. High, Medium, Low, Urgent)"
            fullWidth
            value={priorityForm.priorityName}
            onChange={(e) => {
              setPriorityForm((f) => ({ ...f, priorityName: e.target.value }));
              if (priorityErrors.priorityName) {
                setPriorityErrors((prev) => ({ ...prev, priorityName: "" }));
              }
            }}
            maxLength={100}
            error={!!priorityErrors.priorityName}
            helperText={priorityErrors.priorityName}
            required
          />
          {priorityForm.priorityId && (
            <AppSwitch
              label="Active Or Inactive"
              checked={priorityForm.isActive}
              onChange={(e) =>
                setPriorityForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
          )}
        </Box>
      </AppDialog>

      {/* Priority Delete Confirmation */}
      <AppConfirmDialog
        open={priorityDeleteConfirmOpen}
        onClose={() => setPriorityDeleteConfirmOpen(false)}
        onConfirm={handleConfirmPriorityDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Priority Toggle Confirmation */}
      <AppConfirmDialog
        open={priorityStatusConfirmOpen}
        onClose={() => setPriorityStatusConfirmOpen(false)}
        onConfirm={handleConfirmPriorityStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${
          priorityToToggle?.isActive ? "deactivate" : "activate"
        } this priority?`}
      />
    </div>
  );
}
