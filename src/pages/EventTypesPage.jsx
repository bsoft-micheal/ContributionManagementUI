import React, { useEffect, useState } from "react";
import { FormControlLabel, Switch, Typography, Box, IconButton, Tooltip } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon } from "@mui/icons-material";

import { useAppToast } from "../components/common/AppToast";
import AppInput from "../components/common/AppInput";
import AppButton from "../components/common/AppButton";
import AppDataTable from "../components/common/AppDataTable";
import AppDialog from "../components/common/AppDialog";
import { GetEventTypes, CreateEventType, UpdateEventType } from "../services/eventTypeService";

const initialForm = { eventTypeName: "", isActive: true };

export default function EventTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
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
    try {
      if (form.eventTypeId) {
        await UpdateEventType(form.eventTypeId, form);
        toast.success("Strategic category updated");
      } else {
        await CreateEventType(form);
        toast.success("New operational category established");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Failed to synchronize category records");
    }
  }

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Tooltip title="Edit Category">
          <IconButton size="small" sx={{ p: 0.3 }} onClick={() => { setForm(row); setDialogOpen(true); }}>
            <EditIcon sx={{ fontSize: "1.1rem", color: "#4a3f6b" }} />
          </IconButton>
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
          {row.isActive ? "Active" : "Archived"}
        </Typography>
      )
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Event Classification Registry"
        columns={columns}
        data={types}
        loading={loading}
        actions={
          <AppButton
            size="small"
            variant="contained"
            onClick={() => { setForm(initialForm); setDialogOpen(true); }}
          >
            Add
          </AppButton>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.eventTypeId ? "Modify Category" : "Add Strategic Category"}
        actions={
          <>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}>Save Changes</AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <AppInput 
            label="Event Type Name" 
            fullWidth 
            value={form.eventTypeName} 
            onChange={(e) => setForm(f => ({ ...f, eventTypeName: e.target.value }))} 
          />
          <FormControlLabel
            control={
              <Switch 
                checked={form.isActive} 
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} 
              />
            }
            label={<Typography variant="body2" fontWeight={700}>Visible in Selection Menus</Typography>}
          />
        </Box>
      </AppDialog>
    </div>
  );
}
