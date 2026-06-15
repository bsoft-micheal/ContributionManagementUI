import React, { useEffect, useState } from "react";
import { FormControlLabel, Checkbox, Typography, Box, IconButton, Tooltip } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon } from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { GetEventTypes, CreateEventType, UpdateEventType } from "../../services/eventTypeService";
import { validateForm } from "../../utils/validation";

const initialForm = { eventTypeName: "", isActive: true };

export default function EventTypesPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Event Types", authState?.role);
  const hasWriteAccess = rights.write;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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
      eventTypeName: { required: true, type: "letteronly", min: 2, max: 50, label: filed }
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

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Tooltip title={hasWriteAccess ? "Edit Category" : ""}>
          <span>
            <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => { setForm(row); setErrors({}); setDialogOpen(true); }}>
              <EditIcon sx={{ fontSize: "1.1rem", color: hasWriteAccess ? "#4a3f6b" : "#cbd5e1" }} />
            </IconButton>
          </span>
        </Tooltip>
      )
    },
    { label: "Category Name", key: "eventTypeName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventTypeName}</Typography> },
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
            textTransform: "uppercase",
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
    </div>
  );
}
