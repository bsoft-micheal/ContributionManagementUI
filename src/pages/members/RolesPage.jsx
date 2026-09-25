import React, { useEffect, useState } from "react";
import { Grid, Typography, IconButton, Tooltip, Box } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon } from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { GetRolesAsync, CreateRoleAsync, UpdateRoleAsync, DeleteRoleAsync } from "../../services/roleService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const initialForm = { roleName: "" };

export default function RolesPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Roles", authState?.role);
  const hasWriteAccess = rights.write;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await GetRolesAsync();
      setRoles(data || []);
    } catch (error) {
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const requiredLabel = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD;
    const schema = {
      roleName: { required: true, type: "letteronly", min: 2, max: 50, label: requiredLabel },
    };
    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        ...form,
        roleName: form.roleName.trim(),
        defaultContributionAmount: form.defaultContributionAmount ? Number(form.defaultContributionAmount) : 0
      };
      if (form.roleId) {
        await UpdateRoleAsync(form.roleId, payload);
        toast.success(TOAST_MESSAGES.ROLES.SAVED_SUCCESS);
      } else {
        await CreateRoleAsync(payload);
        toast.success(TOAST_MESSAGES.ROLES.SAVED_SUCCESS);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleDeleteRequest(id) {
    setRoleToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (roleToDelete) {
      try {
        await DeleteRoleAsync(roleToDelete);
        toast.success(TOAST_MESSAGES.ROLES.DELETED_SUCCESS);
        loadData();
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.response?.data?.title || error.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED;
        toast.error(errorMsg);
      } finally {
        setDeleteConfirmOpen(false);
        setRoleToDelete(null);
      }
    }
  }

  const columns = [
    {
      label: COMMON_STRINGS.TABLE.ACTION_COL,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Role" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => { setForm(row); setErrors({}); setDialogOpen(true); }}
              >
                <EditIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#cbd5e1") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete Role" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row.roleId ?? row.RoleId ?? row.id)}
              >
                <DeleteIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#cbd5e1") }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
    {
      label: "Role Name",
      key: "roleName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.roleName}
        </Typography>
      )
    },
    {
      label: COMMON_STRINGS.TABLE.CREATED_BY_COL,
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || COMMON_STRINGS.DEFAULTS.EMPTY_VALUE,
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
        title="Roles "
        columns={columns}
        data={roles}
        loading={loading}
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={() => { setForm(initialForm); setErrors({}); setDialogOpen(true); }}
          >
            {COMMON_STRINGS.ACTIONS.ADD}
          </AppButton>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.roleId ? "Edit Role" : "Add Role"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>{COMMON_STRINGS.ACTIONS.CANCEL}</AppButton>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>{COMMON_STRINGS.ACTIONS.SAVE}</AppButton>
          </>
        }
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <AppInput
              label="Role"
              placeholder="Enter role name"
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
        </Grid>
      </AppDialog>

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />
    </div>
  );
}

