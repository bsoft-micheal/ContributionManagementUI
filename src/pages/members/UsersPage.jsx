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
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Description as ExcelIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import dayjs from "dayjs";
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import ExcelImportDialog from "../../components/common/ExcelImportDialog";
import { validateForm } from "../../utils/validation";
import { GetUsersAsync, CreateUserAsync, UpdateUserAsync, DeleteUserAsync, CreateUsersBulkAsync } from "../../services/userService";

// ─── Role color map ───────────────────────────────────────────────────────────
const ROLE_COLORS = {
  Admin: { bg: "rgba(239,68,68,0.10)", darkBg: "rgba(239,68,68,0.20)", color: "#dc2626", darkColor: "#fca5a5" },
  Manager: { bg: "rgba(234,179,8,0.12)", darkBg: "rgba(234,179,8,0.22)", color: "#b45309", darkColor: "#fde047" },
  User: { bg: "rgba(74,63,107,0.10)", darkBg: "rgba(124,58,237,0.20)", color: "#4a3f6b", darkColor: "#c4b5fd" },
  Member: { bg: "rgba(74,63,107,0.08)", darkBg: "rgba(124,58,237,0.15)", color: "#4a3f6b", darkColor: "#c4b5fd" },
};
const getRoleStyle = (roleName = "") =>
  ROLE_COLORS[roleName] ?? { bg: "rgba(74,63,107,0.08)", darkBg: "rgba(124,58,237,0.15)", color: "#4a3f6b", darkColor: "#c4b5fd" };

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
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const templateValidations = {
    "Role": {
      type: "list",
      formulae: ['"Admin,Manager,User,Member"'],
      error: "Please select a role from the list."
    }
  };

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
      const usersData = await GetUsersAsync();
      setUsers(usersData);
    } catch {
      toast.error("Failed to load users");
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

    // Check duplicate email and username
    const emailLower = form.email.trim().toLowerCase();
    const usernameLower = form.username.trim().toLowerCase();
    if (!form.userId) {
      if (users.some((u) => u.email && u.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered");
        return;
      }
      if (users.some((u) => u.username && u.username.trim().toLowerCase() === usernameLower)) {
        setErrors((prev) => ({ ...prev, username: "This username is already taken" }));
        toast.error("This username is already taken");
        return;
      }
    } else {
      if (users.some((u) => u.userId !== form.userId && u.email && u.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered");
        return;
      }
      if (users.some((u) => u.userId !== form.userId && u.username && u.username.trim().toLowerCase() === usernameLower)) {
        setErrors((prev) => ({ ...prev, username: "This username is already taken" }));
        toast.error("This username is already taken");
        return;
      }
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
        await UpdateUserAsync(form.userId, payload);
        toast.success("Saved successfully");
      } else {
        await CreateUserAsync(payload);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      const rawMsg = err.response?.data?.message || (typeof err.response?.data === "string" ? err.response?.data : "") || err.message || "";
      if (rawMsg.toLowerCase().includes("inner exception") || rawMsg.toLowerCase().includes("unique") || rawMsg.toLowerCase().includes("duplicate")) {
        toast.error("A user with this username or email already exists.");
      } else {
        toast.error(err.response?.data?.message ?? "Failed to save");
      }
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
      await DeleteUserAsync(userToDelete);
      toast.success("Deleted successfully");
      loadData();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  }

  async function handleToggleStatus(row) {
    try {
      const payload = {
        username: row.username,
        email: row.email,
        roleName: row.roleName,
        isActive: !row.isActive,
      };
      await UpdateUserAsync(row.userId, payload);
      toast.success(`User status updated successfully`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to update status");
    }
  }

  function handleToggleStatusRequest(row) {
    setUserToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!userToToggle) return;
    try {
      const payload = {
        username: userToToggle.username,
        email: userToToggle.email,
        roleName: userToToggle.roleName,
        isActive: !userToToggle.isActive,
      };
      await UpdateUserAsync(userToToggle.userId, payload);
      toast.success("User status updated successfully");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to update status");
    } finally {
      setStatusConfirmOpen(false);
      setUserToToggle(null);
    }
  }

  const validateRow = (row, rowNum, allRows) => {
    const username = row["username"] !== undefined && row["username"] !== null ? String(row["username"]).trim() : "";
    const email = row["email"] !== undefined && row["email"] !== null ? String(row["email"]).trim() : "";
    const roleName = row["role"] !== undefined && row["role"] !== null ? String(row["role"]).trim() : (row["rolename"] !== undefined && row["rolename"] !== null ? String(row["rolename"]).trim() : "");
    const password = row["password"] !== undefined && row["password"] !== null ? String(row["password"]).trim() : "";

    if (!username) return { error: `Row ${rowNum}: Username is required` };
    if (!/^[a-zA-Z0-9]{3,30}$/.test(username)) {
      return { error: `Row ${rowNum}: Username must be alphanumeric (3-30 characters)` };
    }

    const usernameLower = username.toLowerCase();
    const existingUser = users.find((u) => u.username && u.username.trim().toLowerCase() === usernameLower);
    if (existingUser) {
      return { error: `Row ${rowNum}: Username '${username}' already exists in system` };
    }

    if (allRows && Array.isArray(allRows)) {
      const firstUserIndex = allRows.findIndex((r) => {
        const rUser = r["username"] !== undefined && r["username"] !== null ? String(r["username"]).trim().toLowerCase() : "";
        return rUser === usernameLower;
      });
      if (firstUserIndex !== -1 && firstUserIndex < (rowNum - 2)) {
        return { error: `Row ${rowNum}: Duplicate username '${username}' in Excel (Row ${firstUserIndex + 2})` };
      }
    }

    if (!email) return { error: `Row ${rowNum}: Email is required` };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: `Row ${rowNum}: Invalid email format` };

    const emailLower = email.toLowerCase();
    const existingEmail = users.find((u) => u.email && u.email.trim().toLowerCase() === emailLower);
    if (existingEmail) {
      return { error: `Row ${rowNum}: Email '${email}' already exists in system` };
    }

    if (allRows && Array.isArray(allRows)) {
      const firstEmailIndex = allRows.findIndex((r) => {
        const rEmail = r["email"] !== undefined && r["email"] !== null ? String(r["email"]).trim().toLowerCase() : "";
        return rEmail === emailLower;
      });
      if (firstEmailIndex !== -1 && firstEmailIndex < (rowNum - 2)) {
        return { error: `Row ${rowNum}: Duplicate email '${email}' in Excel (Row ${firstEmailIndex + 2})` };
      }
    }

    // Match role case-insensitively
    const matchedRole = USER_ROLES.find(r => r.value.toLowerCase() === roleName.toLowerCase());
    if (!matchedRole) {
      return { error: `Row ${rowNum}: Invalid role '${roleName}'. Allowed: Admin, Manager, User, Member` };
    }

    if (password && password.length < 6) {
      return { error: `Row ${rowNum}: Password must be at least 6 characters` };
    }

    return {
      error: null,
      parsed: {
        username,
        email,
        roleName: matchedRole.value,
        isActive: true,
        password: password || "Welcome@123", // secure temp default password
      }
    };
  };

  const handleBulkImport = async (validData) => {
    if (!validData || validData.length === 0) return;
    setLoading(true);
    try {
      await CreateUsersBulkAsync(validData);
      toast.success(`Successfully imported all ${validData.length} user(s)!`);
      loadData();
    } catch (err) {
      const rawMsg = err.response?.data?.message || (typeof err.response?.data === "string" ? err.response?.data : "") || err.message || "";
      if (rawMsg.toLowerCase().includes("inner exception") || rawMsg.toLowerCase().includes("unique") || rawMsg.toLowerCase().includes("duplicate")) {
        toast.error("One or more records contain a username or email that already exists in the database.");
      } else {
        toast.error(rawMsg || "Failed to import users");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fieldChange(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      label: "Action",
      sx: { width: 120 },
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
          <Tooltip title={hasWriteAccess ? (row.isActive ? "Deactivate User" : "Activate User") : ""}>
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
              bgcolor: (theme) => (theme.palette.mode === "dark" ? style.darkBg : style.bg),
              color: (theme) => (theme.palette.mode === "dark" ? style.darkColor : style.color),
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
      render: (row) => formatGridDate(row.createdOn || row.CreatedOn || row.createdAt || row.CreatedAt),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      {/* ── Data Table ────────────────────────────────────────────────────── */}
      <AppDataTable
        title="User"
        columns={columns}
        data={filteredUsers}
        loading={loading}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="outlined"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<ExcelIcon />}
              onClick={() => setImportDialogOpen(true)}
              sx={{
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(74, 63, 107, 0.3)",
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                "&:hover": {
                  borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.04)",
                },
              }}
            >
              Import Excel
            </AppButton>
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<PersonAddIcon />}
              onClick={openCreate}
            >
              Add User
            </AppButton>
          </Stack>
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
                  placeholder="Select Role"
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                  }}
                  options={[{ label: "All Roles", value: "" }, ...USER_ROLES]}
                  size="small"
                  required
                  fullWidth
                />
              </Box>

              {/* Status filter */}
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label="Filter by Status"
                  placeholder="Select Status"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                  }}
                  options={[
                    { label: "All Statuses", value: "" },
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ]}
                  size="small"
                  required
                  fullWidth
                />
              </Box>

              {/* Filter button */}
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setAppliedRole(filterRole);
                  setAppliedStatus(filterStatus);
                  toast.success("Filters applied");
                }}
                sx={{
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
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
                  toast.success("Filters cleared");
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239,68,68,0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
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
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
              onClick={handleSubmit}
              sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}
            >
              {saving ? "Saving…" : "Save"}
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

          {/* Is Active — only shown in edit mode */}
          {form.userId && (
            <Grid size={{ xs: 12, md: 6 }}
              sx={{ display: "flex", alignItems: "flex-end", pb: 0.5 }}
            >
              <AppSwitch
                label={form.isActive ? "Active Account" : "Inactive Account"}
                checked={form.isActive}
                onChange={(e) => fieldChange("isActive", e.target.checked)}
              />
            </Grid>
          )}

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
                  {formatViewDateTime(form.createdOn, "—")}
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

      {/* ── Status Confirm ────────────────────────────────────────────────── */}
      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${userToToggle?.isActive ? "deactivate" : "activate"} this user account?`}
      />

      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleBulkImport}
        title="Import Users"
        templateHeaders={["Username", "Email", "Role", "Password"]}
        templateValidations={templateValidations}
        validateRow={validateRow}
      />
    </div>
  );
}
