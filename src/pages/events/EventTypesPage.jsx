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
import { GetEventTypesAsync, CreateEventTypeAsync, UpdateEventTypeAsync, DeleteEventTypeAsync } from "../../services/eventTypeService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";

const formatBaseAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "");
  if (!cleanVal) return "";
  return Number(cleanVal).toLocaleString("en-US");
};

const initialForm = {
  eventTypeName: "",
  isActive: true,
  baseAmount: "",
  hasTenureRule: false,
  tenureThresholdYears: 1,
  newEntrantSharePercentage: 50,
  standardSharePercentage: 100,
  ruleDescription: "",
};

export default function EventTypesPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Event Types", authState?.role);
  const hasWriteAccess = rights.write;

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
    const data = await GetEventTypesAsync();
    setTypes(data);
    setLoading(false);
  }

  async function handleSubmit() {
    const filed = "This field is required";
    const schema = {
      eventTypeName: { required: true, type: "letteronly", min: 2, max: 50, label: filed },
      baseAmount: { 
        required: true, 
        type: "numberonly", 
        label: filed,
        customValidate: (val) => {
          const num = Number(String(val).replace(/[^0-9]/g, ""));
          if (val === "" || val === undefined || val === null || num <= 0) {
            return filed;
          }
          if (num > 1000000) {
            return "Base amount cannot exceed 1,000,000";
          }
          return "";
        }
      }
    };
    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      const payload = {
        ...form,
        baseAmount: Number(String(form.baseAmount).replace(/[^0-9]/g, "") || 0),
        hasTenureRule: Boolean(form.hasTenureRule),
        tenureThresholdYears: Number(form.tenureThresholdYears) || 1,
        newEntrantSharePercentage: Number(form.newEntrantSharePercentage) || 50,
        standardSharePercentage: Number(form.standardSharePercentage) || 100,
        ruleDescription: form.ruleDescription?.trim() || (form.hasTenureRule ? `${form.newEntrantSharePercentage || 50}% (< ${form.tenureThresholdYears || 1} yr)` : "Equal Share")
      };
      if (form.eventTypeId) {
        await UpdateEventTypeAsync(form.eventTypeId, payload);
        toast.success("Saved successfully");
      } else {
        await CreateEventTypeAsync(payload);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save");
    }
  }

  function handleDeleteRequest(id) {
    setTypeToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (typeToDelete) {
      try {
        await DeleteEventTypeAsync(typeToDelete);
        toast.success("Deleted successfully");
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete");
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
      await UpdateEventTypeAsync(typeToToggle.eventTypeId, payload);
      toast.success("Category status updated successfully");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to update status");
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
          <Tooltip title={hasWriteAccess ? "Edit Category" : ""}>
            <span>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => handleOpenEditDialog(row)}>
                <EditIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#cbd5e1") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete Category" : ""}>
            <span>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => handleDeleteRequest(row.eventTypeId)}>
                <DeleteIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#cbd5e1") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? (row.isActive ? "Deactivate Category" : "Activate Category") : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon sx={{ fontSize: "1.25rem", color: hasWriteAccess ? "#10b981" : "#cbd5e1" }} />
                ) : (
                  <ToggleOffIcon sx={{ fontSize: "1.25rem", color: hasWriteAccess ? "#ef4444" : "#cbd5e1" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
    { label: "Category Name", key: "eventTypeName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventTypeName}</Typography> },
    {
      label: "Base Amount",
      key: "baseAmount",
      align: "right",
      render: (row) => <Typography variant="body2" fontWeight={700}>₹{(row.baseAmount ?? 0).toLocaleString()}</Typography>
    },
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
      label: "Status",
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
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      )
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
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
            Add
          </AppButton>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.eventTypeId ? "Edit Event Type" : "Add Event Type"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>Save</AppButton>
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
          <AppInput
            label="Base Amount"
            placeholder="Enter base amount (₹)"
            fullWidth
            value={formatBaseAmount(form.baseAmount)}
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "");
              setForm(f => ({ ...f, baseAmount: rawVal === "" ? "" : Number(rawVal) }));
              if (errors.baseAmount) {
                setErrors(prev => ({ ...prev, baseAmount: "" }));
              }
            }}
            maxLength={15}
            error={!!errors.baseAmount}
            helperText={errors.baseAmount}
            required
          />

          {/* Dynamic Contribution Calculation Rule Settings */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)",
              borderColor: (theme) => theme.palette.divider,
            }}
          >
            <AppSwitch
              label="Enable Dynamic Tenure Calculation Rule"
              checked={form.hasTenureRule}
              onChange={(e) => setForm(f => ({ ...f, hasTenureRule: e.target.checked }))}
            />

            {form.hasTenureRule && (
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Configure custom contribution split percentages based on employee tenure / joining date for this event category.
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Tenure Criteria (Years)"
                      placeholder="e.g. 1"
                      fullWidth
                      value={form.tenureThresholdYears}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setForm(f => ({ ...f, tenureThresholdYears: val }));
                      }}
                      helperText="Threshold in years (e.g., 1 yr)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="New Entrant Share (%)"
                      placeholder="e.g. 50"
                      fullWidth
                      value={form.newEntrantSharePercentage}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setForm(f => ({ ...f, newEntrantSharePercentage: val }));
                      }}
                      helperText="Discounted share percentage"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Standard Share (%)"
                      placeholder="e.g. 100"
                      fullWidth
                      value={form.standardSharePercentage}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setForm(f => ({ ...f, standardSharePercentage: val }));
                      }}
                      helperText="Standard share percentage"
                    />
                  </Grid>
                </Grid>

                <AppInput
                  label="Rule Description / Note"
                  placeholder="e.g. 50% for new entrants with less than 1 year tenure"
                  fullWidth
                  value={form.ruleDescription}
                  onChange={(e) => setForm(f => ({ ...f, ruleDescription: e.target.value }))}
                  maxLength={100}
                />
              </Box>
            )}
          </Paper>

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
        title="Confirm"
        content="Are you sure you want to delete this record?"
      />

      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${typeToToggle?.isActive ? "deactivate" : "activate"} this category?`}
      />
    </div>
  );
}
