import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import dayjs from "dayjs";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { validateForm } from "../../utils/validation";
import { GetUsers, CreateUser, UpdateUser, DeleteUser } from "../../services/userService";

// ─── Role color map ───────────────────────────────────────────────────────────
const ROLE_COLORS = {
  Admin: { bg: "rgba(239,68,68,0.10)", color: "#dc2626" },
  Manager: { bg: "rgba(234,179,8,0.12)", color: "#b45309" },
  User: { bg: "rgba(74,63,107,0.10)", color: "#4a3f6b" },
  Member: { bg: "rgba(74,63,107,0.08)", color: "#4a3f6b" },
};
const getRoleStyle = (roleName = "") =>
  ROLE_COLORS[roleName] ?? { bg: "rgba(74,63,107,0.08)", color: "#4a3f6b" };

// ─── User Roles enum options ──────────────────────────────────────────────────
const USER_ROLES = [
  { label: "Admin", value: "Admin" },
  { label: "Manager", value: "Manager" },
  { label: "User", value: "User" },
  { label: "Member", value: "Member" },
];

// ─── Initial form state ───────────────────────────────────────────────────────
const initialForm = {
  username: "",
  email: "",
  newPassword: "",
  confirmPassword: "",
  roleName: "",
  isActive: true,
};

export default function UsersPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const rights = getRightsForPage("Users", authState?.role);
  const hasWriteAccess = rights.write;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [appliedRole, setAppliedRole] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  const filteredUsers = useMemo(() => {
    let result = users;
    if (appliedRole) result = result.filter((u) => u.roleName === appliedRole);
    if (appliedStatus !== "")
      result = result.filter((u) => String(u.isActive) === appliedStatus);
    return result;
  }, [users, appliedRole, appliedStatus]);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const usersData = await GetUsers();
      setUsers(usersData);
    } catch {
      toast.error("Failed to load user directory");
    } finally {
      setLoading(false);
    }
  }

  // ── Open dialog ────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(initialForm);
    setErrors({});
    setShowPassword(false);
    setShowConfirm(false);
    setDialogOpen(true);
  }

  function openEdit(row) {
    setForm({
      userId: row.userId,
      username: row.username ?? "",
      email: row.email ?? "",
      newPassword: "",
      confirmPassword: "",
      roleName: row.roleName ?? "",
      isActive: row.isActive ?? true,
      createdOn: row.createdOn,
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirm(false);
    setDialogOpen(true);
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const filed = "This field is required"
    const schema = {
      username: { required: true, type: "letterandnumber", min: 3, max: 30, label: filed },
      email: { required: true, email: true, label: filed },
      roleName: { required: true, label: filed },
    };
    const e = validateForm(form, schema);

    // Password required only on create; optional on edit (change password)
    if (!form.userId) {
      if (!form.newPassword) e.newPassword = "Password is required";
      else if (form.newPassword.length < 6)
        e.newPassword = "Minimum 6 characters";
      if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
      else if (form.newPassword !== form.confirmPassword)
        e.confirmPassword = "Passwords do not match";
    } else {
      // Edit mode – password change is optional; validate only if filled
      if (form.newPassword) {
        if (form.newPassword.length < 6)
          e.newPassword = "Minimum 6 characters";
        if (form.newPassword !== form.confirmPassword)
          e.confirmPassword = "Passwords do not match";
      }
    }
    return e;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        roleName: form.roleName,
        isActive: form.isActive,
        ...(form.newPassword ? { password: form.newPassword } : {}),
      };

      if (form.userId) {
        await UpdateUser(form.userId, payload);
        toast.success("Saved successfully");
      } else {
        await CreateUser(payload);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function handleDeleteRequest(id) {
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    try {
      await DeleteUser(userToDelete);
      toast.success("Deleted successfully");
      loadData();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fieldChange(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      label: "Action",
      sx: { width: 90 },
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit User" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => openEdit(row)}
              >
                <EditIcon sx={{ fontSize: "1.05rem", color: hasWriteAccess ? actionIconColor : "#cbd5e1" }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete User" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row.userId)}
              >
                <DeleteIcon sx={{ fontSize: "1.05rem", color: hasWriteAccess ? actionIconColor : "#cbd5e1" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    {
      label: "Username",
      key: "username",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="text.primary">
          {row.username}
        </Typography>
      ),
    },
    { label: "Email", key: "email" },
    {
      label: "Role",
      key: "roleName",
      render: (row) => {
        const style = getRoleStyle(row.roleName);
        return (
          <Chip
            label={row.roleName ?? "—"}
            size="small"
            sx={{
              bgcolor: style.bg,
              color: style.color,
              fontWeight: 700,
              fontSize: "0.72rem",
              height: 22,
              borderRadius: "4px",
            }}
          />
        );
      },
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) =>
        row.isActive ? (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: "#16a34a",
              bgcolor: "rgba(22,163,74,0.08)",
              px: 1.2, py: 0.3,
              borderRadius: "3px",
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
            }}
          >
            Active
          </Typography>
        ) : (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: "#ef4444",
              bgcolor: "rgba(239,68,68,0.08)",
              px: 1.2, py: 0.3,
              borderRadius: "3px",
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
            }}
          >
            Inactive
          </Typography>
        ),
    },
    {
      label: "Created On",
      key: "createdOn",
      render: (row) =>
        row.createdOn ? dayjs(row.createdOn).format("DD/MM/YYYY") : "—",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      {/* ── Data Table ────────────────────────────────────────────────────── */}
      <AppDataTable
        title="User Directory"
        columns={columns}
        data={filteredUsers}
        loading={loading}
        actions={
          <AppButton
            variant="contained"
            size="small"
            disabled={!hasWriteAccess}
            startIcon={<PersonAddIcon />}
            onClick={openCreate}
          >
            Add User
          </AppButton>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}
              sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
            >
              {/* Role filter */}
              <Box sx={{ minWidth: 180 }}>
                <AppSelect
                  label="Filter by Role"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  options={[{ label: "All Roles", value: "" }, ...USER_ROLES]}
                  size="small"
                  fullWidth
                />
              </Box>

              {/* Status filter */}
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label="Filter by Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { label: "All Statuses", value: "" },
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ]}
                  size="small"
                  fullWidth
                />
              </Box>

              {/* Apply button */}
              <AppButton
                variant="contained"
                size="small"
                onClick={() => {
                  setAppliedRole(filterRole);
                  setAppliedStatus(filterStatus);

                }}
                sx={{
                  bgcolor: "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: "#3b325c !important" },
                }}
              >
                Filter
              </AppButton>

              {/* Clear button */}
              <AppButton
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilterRole("");
                  setFilterStatus("");
                  setAppliedRole("");
                  setAppliedStatus("");

                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239,68,68,0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239,68,68,0.05)",
                  },
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
          </Grid>
        }
      />

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.userId ? "Edit User" : "Add User"}
        actions={
          <>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
              onClick={handleSubmit}
              sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
            >
              {saving ? "Saving…" : "Save"}
            </AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>
              Cancel
            </AppButton>
          </>
        }
      >
        <Grid container spacing={3}>
          {/* Username */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput
              label="Username"
              placeholder="Enter username"
              value={form.username}
              onChange={(e) => fieldChange("username", e.target.value)}
              restrictType="letterandnumber"
              maxLength={30}
              error={!!errors.username}
              helperText={errors.username}
              required
            />
          </Grid>

          {/* Email */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput
              label="Email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => fieldChange("email", e.target.value)}
              maxLength={100}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>

          {/* New Password */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput
              label={form.userId ? "New Password (leave blank to keep)" : "New Password"}
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              value={form.newPassword}
              onChange={(e) => fieldChange("newPassword", e.target.value)}
              maxLength={50}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              required={!form.userId}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                    >
                      {showPassword
                        ? <VisibilityOff sx={{ fontSize: "1.1rem" }} />
                        : <Visibility sx={{ fontSize: "1.1rem" }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Confirm Password */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput
              label="Confirm Password"
              placeholder="Re-enter password"
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => fieldChange("confirmPassword", e.target.value)}
              maxLength={50}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              required={!form.userId || !!form.newPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowConfirm((v) => !v)}
                      edge="end"
                    >
                      {showConfirm
                        ? <VisibilityOff sx={{ fontSize: "1.1rem" }} />
                        : <Visibility sx={{ fontSize: "1.1rem" }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Role */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="User Role"
              placeholder="Select role…"
              value={form.roleName}
              onChange={(e) => fieldChange("roleName", e.target.value)}
              options={USER_ROLES}
              error={!!errors.roleName}
              helperText={errors.roleName}
              required
            />
          </Grid>

          {/* Is Active */}
          <Grid size={{ xs: 12, md: 6 }}
            sx={{ display: "flex", alignItems: "flex-end", pb: 0.5 }}
          >
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
                  onChange={(e) => fieldChange("isActive", e.target.checked)}
                  sx={{
                    color: "rgba(74, 63, 107, 0.4)",
                    "&.Mui-checked": {
                      color: "#4a3f6b",
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={700} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                  {form.isActive ? "Active Account" : "Inactive Account"}
                </Typography>
              }
            />
          </Grid>

          {/* Created On — shown in edit mode only */}
          {form.userId && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  bgcolor: "rgba(74,63,107,0.04)",
                  border: "1px solid rgba(74,63,107,0.12)",
                  borderRadius: "8px",
                  px: 2,
                  py: 1,
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600 }}>
                  Created On:
                </Typography>
                <Typography variant="caption" sx={{ color: "#1e1a2e", fontWeight: 700 }}>
                  {form.createdOn ? dayjs(form.createdOn).format("DD/MM/YYYY hh:mm A") : "—"}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </AppDialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
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
