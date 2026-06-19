import React, { useEffect, useState } from "react";
import { Grid, Typography, IconButton, Tooltip } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon } from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { GetRoles, CreateRole, UpdateRole } from "../../services/roleService";
import { validateForm } from "../../utils/validation";

const initialForm = { roleName: "", defaultContributionAmount: 0 };

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
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
    try {
      const data = await GetRoles();
      setRoles(data);
    } catch (error) {
      toast.error("Failed to load role catalog");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const filed = "This field is required"
    const schema = {
      roleName: { required: true, type: "letteronly", min: 2, max: 50, label: filed },
      defaultContributionAmount: { required: true, type: "numberonly", min: 0, max: 100000, label: filed }
    };
    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      if (form.roleId) {
        await UpdateRole(form.roleId, form);
        toast.success("Saved successfully");
      } else {
        await CreateRole(form);
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
        <Tooltip title="Edit Role">
          <IconButton size="small" sx={{ p: 0.3 }} onClick={() => { setForm(row); setErrors({}); setDialogOpen(true); }}>
            <EditIcon sx={{ fontSize: "1.1rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
          </IconButton>
        </Tooltip>
      )
    },
    { label: "Role Name", key: "roleName" },
    {
      label: "Default Contribution",
      key: "defaultContributionAmount",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">
          ₹{row.defaultContributionAmount || 0}
        </Typography>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Manage Employer Role"
        columns={columns}
        data={roles}
        loading={loading}
        actions={
          <AppButton
            size="small"
            variant="contained"
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
        title={form.roleId ? "Edit Role" : "Add Role"}
        actions={
          <>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>Save</AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
          </>
        }
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <AppInput 
              label="Role" 
              fullWidth 
              value={form.roleName} 
              onChange={(e) => {
                setForm(f => ({ ...f, roleName: e.target.value }));
                if (errors.roleName) {
                  setErrors(prev => ({ ...prev, roleName: "" }));
                }
              }} 
              restrictType="letteronly"
              maxLength={50}
              error={!!errors.roleName}
              helperText={errors.roleName}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <AppInput 
              label="Contribution" 
              fullWidth 
              value={form.defaultContributionAmount} 
              onChange={(e) => {
                setForm(f => ({ ...f, defaultContributionAmount: e.target.value }));
                if (errors.defaultContributionAmount) {
                  setErrors(prev => ({ ...prev, defaultContributionAmount: "" }));
                }
              }} 
              restrictType="numberonly"
              maxLength={10}
              error={!!errors.defaultContributionAmount}
              helperText={errors.defaultContributionAmount}
              required
            />
          </Grid>
        </Grid>
      </AppDialog>
    </div>
  );
}
