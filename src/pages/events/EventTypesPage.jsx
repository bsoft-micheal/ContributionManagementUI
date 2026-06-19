import React, { useEffect, useState } from "react";
import { FormControlLabel, Checkbox, Typography, Box, IconButton, Tooltip } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon } from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { GetEventTypes, CreateEventType, UpdateEventType, DeleteEventType } from "../../services/eventTypeService";
import { validateForm } from "../../utils/validation";

const formatBaseAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "");
  if (!cleanVal) return "";
  return Number(cleanVal).toLocaleString("en-US");
};

const initialForm = { eventTypeName: "", isActive: true, baseAmount: 0 };

export default function EventTypesPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Event Types", authState?.role);
  const hasWriteAccess = rights.write;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await GetEventTypes();
    setTypes(data);
    setLoading(false);
  }

  async function handleSubmit() {
    const filed = "This field is required"
    const schema = {
      eventTypeName: { required: true, type: "letteronly", min: 2, max: 50, label: filed },
      baseAmount: { required: true, type: "numberonly", min: 0, max: 1000000, label: filed }
    };
    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      if (form.eventTypeId) {
        await UpdateEventType(form.eventTypeId, form);
        toast.success("Saved successfully");
      } else {
        await CreateEventType(form);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Failed to save");
    }
  }

  function handleDeleteRequest(id) {
    setTypeToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (typeToDelete) {
      try {
        await DeleteEventType(typeToDelete);
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

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Category" : ""}>
            <span>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => { setForm(row); setErrors({}); setDialogOpen(true); }}>
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
            onClick={() => { setForm(initialForm); setErrors({}); setDialogOpen(true); }}
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
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>Save</AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <AppInput 
            label="Event Type" 
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
            fullWidth 
            value={formatBaseAmount(form.baseAmount)} 
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "");
              setForm(f => ({ ...f, baseAmount: rawVal ? Number(rawVal) : 0 }));
              if (errors.baseAmount) {
                setErrors(prev => ({ ...prev, baseAmount: "" }));
              }
            }} 
            maxLength={15}
            error={!!errors.baseAmount}
            helperText={errors.baseAmount}
            required
          />
          <FormControlLabel
            labelPlacement="start"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              m: 0,
              gap: 2,
            }}
            control={
              <Checkbox 
                checked={form.isActive} 
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} 
                sx={{
                  color: "rgba(74, 63, 107, 0.4)",
                  "&.Mui-checked": {
                    color: "#4a3f6b",
                  },
                }}
              />
            }
            label={<Typography variant="body2" fontWeight={700} sx={{ color: "#4a3f6b" }}>Active Or InActive types</Typography>}
          />
        </Box>
      </AppDialog>

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm"
        content="Are you sure you want to delete this record?"
      />
    </div>
  );
}
