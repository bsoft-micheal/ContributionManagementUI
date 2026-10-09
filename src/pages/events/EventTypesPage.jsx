import React, { useEffect, useState } from "react";
import { FormControlLabel, Checkbox, Typography, Box, IconButton, Tooltip, Chip, Paper, Grid } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon, ToggleOn as ToggleOnIcon, ToggleOff as ToggleOffIcon, Calculate as CalculateIcon } from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import { getEventTypesAsync, createEventTypeAsync, updateEventTypeAsync, deleteEventTypeAsync } from "../../services/eventTypeService";
import { validateForm } from "../../utils/validation";
import { formatGridDate, formatCreatedBy } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";
import useAccessByLocation from "../../hooks/useAccessByLocation";

const initialForm = {
  eventTypeName: "",
  isActive: true,
  hasTenureRule: false,
  tenureThresholdYears: 1,
  newEntrantSharePercentage: 50,
  standardSharePercentage: 100,
  ruleDescription: "",
};

export default function EventTypesPage() {
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [typeToToggle, setTypeToToggle] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getEventTypesAsync(true);
      setTypes(data || []);
    } catch (error) {
      toast.error(error, "Failed to load event types");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const requiredLabel = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD;
    const schema = {
      eventTypeName: { required: true, type: "letteronly", min: 2, max: 50, label: requiredLabel }
    };

    if (form.hasTenureRule) {
      schema.tenureThresholdYears = {
        required: true,
        label: requiredLabel,
      };
    }

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    const trimmedName = form.eventTypeName?.trim().toLowerCase();
    const isDuplicate = types.some(
      (t) =>
        t.eventTypeName &&
        t.eventTypeName.trim().toLowerCase() === trimmedName &&
        (!form.eventTypeId || t.eventTypeId !== form.eventTypeId)
    );
    if (isDuplicate) {
      setErrors((prev) => ({ ...prev, eventTypeName: "Category Name already exists" }));
      toast.error("A category with this name already exists");
      return;
    }

    try {
      const payload = {
        ...form,
        hasTenureRule: Boolean(form.hasTenureRule),
        tenureThresholdYears: Number(form.tenureThresholdYears) || 1,
        newEntrantSharePercentage: Number(form.newEntrantSharePercentage) || 50,
        standardSharePercentage: Number(form.standardSharePercentage) || 100,
        ruleDescription: form.ruleDescription?.trim() || (form.hasTenureRule ? `${form.newEntrantSharePercentage || 50}% (< ${form.tenureThresholdYears || 1} yr)` : "Equal Share")
      };
      if (form.eventTypeId) {
        await updateEventTypeAsync(form.eventTypeId, payload);
        toast.success(TOAST_MESSAGES.EVENT_TYPES.SAVED_SUCCESS);
      } else {
        await createEventTypeAsync(payload);
        toast.success(TOAST_MESSAGES.EVENT_TYPES.SAVED_SUCCESS);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleDeleteRequest(id) {
    setTypeToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (typeToDelete) {
      try {
        await deleteEventTypeAsync(typeToDelete);
        toast.success(TOAST_MESSAGES.EVENT_TYPES.DELETED_SUCCESS);
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
        setTypeToDelete(null);
      }
    }
  }

  function handleToggleStatusRequest(row) {
    setTypeToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!typeToToggle) return;
    try {
      const payload = {
        ...typeToToggle,
        isActive: !typeToToggle.isActive,
      };
      await updateEventTypeAsync(typeToToggle.eventTypeId, payload);
      toast.success(TOAST_MESSAGES.EVENT_TYPES.STATUS_UPDATED);
      loadData();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.EVENT_TYPES.STATUS_UPDATE_FAILED);
    } finally {
      setStatusConfirmOpen(false);
      setTypeToToggle(null);
    }
  }

  const handleOpenAddDialog = () => {
    setForm(initialForm);
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (row) => {
    setForm({
      ...row,
      hasTenureRule: Boolean(row.hasTenureRule),
      tenureThresholdYears: row.tenureThresholdYears ?? 1,
      newEntrantSharePercentage: row.newEntrantSharePercentage ?? 50,
      standardSharePercentage: row.standardSharePercentage ?? 100,
      ruleDescription: row.ruleDescription ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Category" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !hasWriteAccess ? "not-allowed" : "pointer" }}>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => handleOpenEditDialog(row)}>
                <EditIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? TOAST_MESSAGES.GENERAL.RECORD_IN_USE : (hasWriteAccess ? "Delete Category" : "Disabled")}>
            <span style={{ display: "inline-flex", cursor: (!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)) ? "not-allowed" : "pointer" }}>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)} onClick={() => handleDeleteRequest(row.eventTypeId)}>
                <DeleteIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess && !(row.isReferred || row.IsReferred) ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? (row.isActive ? "Deactivate Category" : "Activate Category") : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !hasWriteAccess ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon sx={{ fontSize: "1.25rem", color: hasWriteAccess ? "#10b981" : "#94a3b8" }} />
                ) : (
                  <ToggleOffIcon sx={{ fontSize: "1.25rem", color: hasWriteAccess ? "#ef4444" : "#94a3b8" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
    { label: "Category Name", key: "eventTypeName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventTypeName}</Typography> },
    {
      label: "Calculation Rule",
      key: "hasTenureRule",
      render: (row) => {
        if (row.hasTenureRule) {
          return (
            <Chip
              size="small"
              icon={<CalculateIcon sx={{ fontSize: "0.9rem !important" }} />}
              label={`New Entrant: ${row.newEntrantSharePercentage ?? 50}% (< ${row.tenureThresholdYears ?? 1} yr)`}
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 800, fontSize: "0.7rem", px: 0.5 }}
            />
          );
        }
        return (
          <Chip
            size="small"
            label="Equal Share (100%)"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: "0.7rem" }}
          />
        );
      }
    },
    {
      label: COMMON_STRINGS.TABLE.STATUS_COL,
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{
            color: row.isActive ? "#16a34a" : "#64748b",
            bgcolor: row.isActive ? "rgba(22,163,74,0.08)" : "rgba(100,116,139,0.08)",
            px: 1.2, py: 0.3,
            borderRadius: "3px",
            fontSize: "0.7rem",
            letterSpacing: "0.04em"
          }}
        >
          {row.isActive ? COMMON_STRINGS.TABLE.ACTIVE : COMMON_STRINGS.TABLE.INACTIVE}
        </Typography>
      )
    },
    {
      label: COMMON_STRINGS.TABLE.CREATED_BY_COL,
      key: "createdBy",
      render: (row) => formatCreatedBy(row.createdBy || row.CreatedBy),
    },
    {
      label: COMMON_STRINGS.TABLE.CREATED_ON_COL,
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Manage Event Type"
        columns={columns}
        data={types}
        loading={loading}
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            {COMMON_STRINGS.ACTIONS.ADD}
          </AppButton>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.eventTypeId ? "Edit Event Type" : "Add Event Type"}
        actions={
          <>
            <AppButton
              variant="outlined"
              onClick={() => setDialogOpen(false)}
              sx={{
                borderRadius: "8px",
                px: 3,
                fontWeight: 700,
                textTransform: "none",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(74, 63, 107, 0.4)",
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                "&:hover": {
                  borderColor: "#4a3f6b",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74, 63, 107, 0.04)"
                }
              }}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              sx={{
                borderRadius: "8px",
                px: 3,
                fontWeight: 700,
                textTransform: "none",
                bgcolor: "#4a3f6b !important",
                "&:hover": { bgcolor: "#3b325c !important" }
              }}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <AppInput
            label="Event Type"
            placeholder="Enter event type name"
            fullWidth
            value={form.eventTypeName}
            onChange={(e) => {
              setForm(f => ({ ...f, eventTypeName: e.target.value }));
              if (errors.eventTypeName) {
                setErrors(prev => ({ ...prev, eventTypeName: "" }));
              }
            }}
            restrictType="letteronly"
            maxLength={50}
            error={!!errors.eventTypeName}
            helperText={errors.eventTypeName}
            required
          />

          {/* Dynamic Contribution Calculation Rule Flag / Checkbox Container */}
          {/* Dynamic Contribution Calculation Rule Checkbox */}
          <Box
            onClick={() => setForm((f) => ({ ...f, hasTenureRule: !f.hasTenureRule }))}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              userSelect: "none",
              py: 0.2,
              mt: 0.5,
              width: "fit-content",
            }}
          >
            <Checkbox
              checked={form.hasTenureRule}
              onChange={(e) => setForm((f) => ({ ...f, hasTenureRule: e.target.checked }))}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{
                p: 0.1,
                transform: "scale(0.8)",
                color: "#4a3f6b",
                "&.Mui-checked": {
                  color: "#4a3f6b",
                },
              }}
            />
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{
                color: (theme) => (theme.palette.mode === "dark" ? "#e2e8f0" : "#334155"),
                fontSize: "0.8rem",
              }}
            >
              Enable Dynamic Calculation
            </Typography>
          </Box>

            {form.hasTenureRule && (
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 2, pt: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <AppInput
                      label="Criteria (Years)"
                      placeholder="e.g. 1"
                      fullWidth
                      required={form.hasTenureRule}
                      maxLength={2}
                      value={form.tenureThresholdYears}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                        setForm((f) => ({ ...f, tenureThresholdYears: val }));
                        if (errors.tenureThresholdYears) {
                          setErrors((prev) => ({ ...prev, tenureThresholdYears: "" }));
                        }
                      }}
                      error={Boolean(errors.tenureThresholdYears)}
                      helperText={errors.tenureThresholdYears}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label="New Share (%)"
                      placeholder="e.g. 50"
                      fullWidth
                      value={form.newEntrantSharePercentage}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setForm((f) => ({ ...f, newEntrantSharePercentage: val }));
                      }}
                      helperText="Discounted share percentage"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AppInput
                      label="Standard Share (%)"
                      placeholder="e.g. 100"
                      fullWidth
                      value={form.standardSharePercentage}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setForm((f) => ({ ...f, standardSharePercentage: val }));
                      }}
                      helperText="Standard share percentage"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

          {form.eventTypeId && (
            <AppSwitch
              label="Active Or InActive types"
              checked={form.isActive}
              onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
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
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.STATUS_CONFIRM_MSG(typeToToggle?.isActive ? "deactivate" : "activate", "category")}
      />
    </div>
  );
}

