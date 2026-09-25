import React, { useEffect, useState } from "react";
import { Typography, Box, IconButton, Tooltip, Stack } from "@mui/material";
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
  GetTicketTypesAsync,
  CreateTicketTypeAsync,
  UpdateTicketTypeAsync,
  DeleteTicketTypeAsync,
} from "../../services/ticketTypeService";
import {
  GetWorkTypesAsync,
  CreateWorkTypeAsync,
  UpdateWorkTypeAsync,
  DeleteWorkTypeAsync,
} from "../../services/workTypeService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const initialTicketTypeForm = {
  typeName: "",
  isActive: true,
};

const initialWorkTypeForm = {
  workTypeName: "",
  isActive: true,
};

export default function TypesPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Types", authState?.role) || getRightsForPage("Ticket Types", authState?.role);
  const hasWriteAccess = rights?.write ?? (authState?.role === "Admin" || authState?.role === "Manager");

  const toast = useAppToast();

  // ==================== Ticket Types State ====================
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketTypesLoading, setTicketTypesLoading] = useState(true);
  const [ticketTypeDialogOpen, setTicketTypeDialogOpen] = useState(false);
  const [ticketTypeDeleteConfirmOpen, setTicketTypeDeleteConfirmOpen] = useState(false);
  const [ticketTypeToDelete, setTicketTypeToDelete] = useState(null);
  const [ticketTypeStatusConfirmOpen, setTicketTypeStatusConfirmOpen] = useState(false);
  const [ticketTypeToToggle, setTicketTypeToToggle] = useState(null);
  const [ticketTypeForm, setTicketTypeForm] = useState(initialTicketTypeForm);
  const [ticketTypeErrors, setTicketTypeErrors] = useState({});

  // ==================== Work Types State ====================
  const [workTypes, setWorkTypes] = useState([]);
  const [workTypesLoading, setWorkTypesLoading] = useState(true);
  const [workTypeDialogOpen, setWorkTypeDialogOpen] = useState(false);
  const [workTypeDeleteConfirmOpen, setWorkTypeDeleteConfirmOpen] = useState(false);
  const [workTypeToDelete, setWorkTypeToDelete] = useState(null);
  const [workTypeStatusConfirmOpen, setWorkTypeStatusConfirmOpen] = useState(false);
  const [workTypeToToggle, setWorkTypeToToggle] = useState(null);
  const [workTypeForm, setWorkTypeForm] = useState(initialWorkTypeForm);
  const [workTypeErrors, setWorkTypeErrors] = useState({});

  useEffect(() => {
    loadTicketTypes();
    loadWorkTypes();
  }, []);

  // -------------------- Ticket Types Operations --------------------
  async function loadTicketTypes() {
    setTicketTypesLoading(true);
    try {
      const data = await GetTicketTypesAsync();
      setTicketTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load ticket types");
    } finally {
      setTicketTypesLoading(false);
    }
  }

  async function handleTicketTypeSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED;
    const schema = {
      typeName: { required: true, min: 2, max: 150, label: fieldRequired },
    };

    const newErrors = validateForm(ticketTypeForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setTicketTypeErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        typeName: ticketTypeForm.typeName.trim(),
        isActive: ticketTypeForm.isActive !== undefined ? ticketTypeForm.isActive : true,
      };

      if (ticketTypeForm.ticketTypeId) {
        await UpdateTicketTypeAsync(ticketTypeForm.ticketTypeId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await CreateTicketTypeAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setTicketTypeDialogOpen(false);
      loadTicketTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleTicketTypeDeleteRequest(id) {
    setTicketTypeToDelete(id);
    setTicketTypeDeleteConfirmOpen(true);
  }

  async function handleConfirmTicketTypeDelete() {
    if (ticketTypeToDelete) {
      try {
        await DeleteTicketTypeAsync(ticketTypeToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadTicketTypes();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
      } finally {
        setTicketTypeDeleteConfirmOpen(false);
        setTicketTypeToDelete(null);
      }
    }
  }

  function handleTicketTypeToggleStatusRequest(row) {
    setTicketTypeToToggle(row);
    setTicketTypeStatusConfirmOpen(true);
  }

  async function handleConfirmTicketTypeStatusToggle() {
    if (!ticketTypeToToggle) return;
    try {
      const payload = {
        typeName: ticketTypeToToggle.typeName,
        isActive: !ticketTypeToToggle.isActive,
      };
      await UpdateTicketTypeAsync(ticketTypeToToggle.ticketTypeId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadTicketTypes();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setTicketTypeStatusConfirmOpen(false);
      setTicketTypeToToggle(null);
    }
  }

  // -------------------- Work Types Operations --------------------
  async function loadWorkTypes() {
    setWorkTypesLoading(true);
    try {
      const data = await GetWorkTypesAsync();
      setWorkTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setWorkTypesLoading(false);
    }
  }

  async function handleWorkTypeSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED;
    const schema = {
      workTypeName: { required: true, min: 2, max: 100, label: fieldRequired },
    };

    const newErrors = validateForm(workTypeForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setWorkTypeErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        workTypeName: workTypeForm.workTypeName.trim(),
        isActive: workTypeForm.isActive !== undefined ? workTypeForm.isActive : true,
      };

      if (workTypeForm.workTypeId) {
        await UpdateWorkTypeAsync(workTypeForm.workTypeId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await CreateWorkTypeAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setWorkTypeDialogOpen(false);
      loadWorkTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleWorkTypeDeleteRequest(id) {
    setWorkTypeToDelete(id);
    setWorkTypeDeleteConfirmOpen(true);
  }

  async function handleConfirmWorkTypeDelete() {
    if (workTypeToDelete) {
      try {
        await DeleteWorkTypeAsync(workTypeToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadWorkTypes();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
      } finally {
        setWorkTypeDeleteConfirmOpen(false);
        setWorkTypeToDelete(null);
      }
    }
  }

  function handleWorkTypeToggleStatusRequest(row) {
    setWorkTypeToToggle(row);
    setWorkTypeStatusConfirmOpen(true);
  }

  async function handleConfirmWorkTypeStatusToggle() {
    if (!workTypeToToggle) return;
    try {
      const payload = {
        workTypeName: workTypeToToggle.workTypeName,
        isActive: !workTypeToToggle.isActive,
      };
      await UpdateWorkTypeAsync(workTypeToToggle.workTypeId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadWorkTypes();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setWorkTypeStatusConfirmOpen(false);
      setWorkTypeToToggle(null);
    }
  }

  // ==================== Ticket Types Table Columns ====================
  const ticketTypeColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Ticket Type" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setTicketTypeForm({
                    ticketTypeId: row.ticketTypeId,
                    typeName: row.typeName || "",
                    isActive: row.isActive ?? true,
                  });
                  setTicketTypeErrors({});
                  setTicketTypeDialogOpen(true);
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
          <Tooltip title={hasWriteAccess ? "Delete Ticket Type" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleTicketTypeDeleteRequest(row.ticketTypeId)}
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
                  ? "Deactivate Ticket Type"
                  : "Activate Ticket Type"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleTicketTypeToggleStatusRequest(row)}
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
      label: "Ticket Type",
      key: "typeName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.typeName}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: row.isActive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: row.isActive ? "#10b981" : "#ef4444",
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
            display: "inline-block",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.createdOn),
    },
  ];

  // ==================== Work Types Table Columns ====================
  const workTypeColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Work Type" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setWorkTypeForm({
                    workTypeId: row.workTypeId,
                    workTypeName: row.workTypeName || "",
                    isActive: row.isActive ?? true,
                  });
                  setWorkTypeErrors({});
                  setWorkTypeDialogOpen(true);
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
          <Tooltip title={hasWriteAccess ? "Delete Work Type" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleWorkTypeDeleteRequest(row.workTypeId)}
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
                  ? "Deactivate Work Type"
                  : "Activate Work Type"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleWorkTypeToggleStatusRequest(row)}
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
      label: "Work Type",
      key: "workTypeName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.workTypeName}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: row.isActive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: row.isActive ? "#10b981" : "#ef4444",
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
            display: "inline-block",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.createdOn),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, pb: 4 }}>
      {/* 1. Ticket Types Table */}
      <AppDataTable
        title="Ticket Types"
        columns={ticketTypeColumns}
        data={ticketTypes}
        loading={ticketTypesLoading}
        actions={
          <AppButton
            variant="contained"
            size="small"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={() => {
              setTicketTypeForm(initialTicketTypeForm);
              setTicketTypeErrors({});
              setTicketTypeDialogOpen(true);
            }}
          >
            Add
          </AppButton>
        }
      />

      {/* 2. Work Types Table */}
      <AppDataTable
        title="Work Types"
        columns={workTypeColumns}
        data={workTypes}
        loading={workTypesLoading}
        actions={
          <AppButton
            variant="contained"
            size="small"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={() => {
              setWorkTypeForm(initialWorkTypeForm);
              setWorkTypeErrors({});
              setWorkTypeDialogOpen(true);
            }}
          >
            Add
          </AppButton>
        }
      />

      {/* ==================== Ticket Type Dialog ==================== */}
      <AppDialog
        open={ticketTypeDialogOpen}
        onClose={() => setTicketTypeDialogOpen(false)}
        title={ticketTypeForm.ticketTypeId ? "Edit Ticket Type" : "Add Ticket Type"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setTicketTypeDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleTicketTypeSubmit}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <AppInput
            label="Ticket Type"
            placeholder="Enter ticket type"
            value={ticketTypeForm.typeName}
            onChange={(e) => {
              setTicketTypeForm((prev) => ({ ...prev, typeName: e.target.value }));
              if (ticketTypeErrors.typeName) {
                setTicketTypeErrors((prev) => ({ ...prev, typeName: "" }));
              }
            }}
            maxLength={150}
            error={!!ticketTypeErrors.typeName}
            helperText={ticketTypeErrors.typeName}
            required
            fullWidth
          />

          <AppSwitch
            label="Status"
            checked={ticketTypeForm.isActive}
            onChange={(e) =>
              setTicketTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
        </Box>
      </AppDialog>

      {/* Ticket Type Delete Confirmation */}
      <AppConfirmDialog
        open={ticketTypeDeleteConfirmOpen}
        onClose={() => setTicketTypeDeleteConfirmOpen(false)}
        onConfirm={handleConfirmTicketTypeDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Ticket Type Status Toggle Confirmation */}
      <AppConfirmDialog
        open={ticketTypeStatusConfirmOpen}
        onClose={() => setTicketTypeStatusConfirmOpen(false)}
        onConfirm={handleConfirmTicketTypeStatusToggle}
        title="Confirm Status Change"
        content={`Are you sure you want to ${
          ticketTypeToToggle?.isActive ? "deactivate" : "activate"
        } this ticket type?`}
      />

      {/* ==================== Work Type Dialog ==================== */}
      <AppDialog
        open={workTypeDialogOpen}
        onClose={() => setWorkTypeDialogOpen(false)}
        title={workTypeForm.workTypeId ? "Edit Work Type" : "Add Work Type"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setWorkTypeDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleWorkTypeSubmit}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <AppInput
            label="Work Type"
            placeholder="Enter work type (e.g. Office, WFH, Hybrid)"
            value={workTypeForm.workTypeName}
            onChange={(e) => {
              setWorkTypeForm((prev) => ({ ...prev, workTypeName: e.target.value }));
              if (workTypeErrors.workTypeName) {
                setWorkTypeErrors((prev) => ({ ...prev, workTypeName: "" }));
              }
            }}
            maxLength={100}
            error={!!workTypeErrors.workTypeName}
            helperText={workTypeErrors.workTypeName}
            required
            fullWidth
          />

          <AppSwitch
            label="Status"
            checked={workTypeForm.isActive}
            onChange={(e) =>
              setWorkTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
        </Box>
      </AppDialog>

      {/* Work Type Delete Confirmation */}
      <AppConfirmDialog
        open={workTypeDeleteConfirmOpen}
        onClose={() => setWorkTypeDeleteConfirmOpen(false)}
        onConfirm={handleConfirmWorkTypeDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Work Type Status Toggle Confirmation */}
      <AppConfirmDialog
        open={workTypeStatusConfirmOpen}
        onClose={() => setWorkTypeStatusConfirmOpen(false)}
        onConfirm={handleConfirmWorkTypeStatusToggle}
        title="Confirm Status Change"
        content={`Are you sure you want to ${
          workTypeToToggle?.isActive ? "deactivate" : "activate"
        } this work type?`}
      />
    </Box>
  );
}
