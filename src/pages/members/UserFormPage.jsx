import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Save as SaveIcon,
  ArrowBackRounded as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import AppSwitch from "../../components/common/AppSwitch";
import { useAppToast } from "../../components/common/AppToast";
import { validateForm } from "../../utils/validation";
import {
  getUsersAsync,
  createUserAsync,
  updateUserAsync,
} from "../../services/userService";
import { getRolesAsync } from "../../services/roleService";
import { getWorkTypesAsync } from "../../services/workTypeService";

const GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
];

const initialForm = {
  userId: "",
  fullName: "",
  username: "",
  email: "",
  phone: "",
  gender: "",
  workType: "",
  dateOfBirth: dayjs().subtract(18, "year"),
  joiningDate: dayjs(),
  createMemberProfile: false,
  enableMultipleRoles: false,
  roleName: "",
  primaryRole: "",
  secondaryRole: "",
  newPassword: "",
  confirmPassword: "",
  isActive: true,
};

export default function UserFormPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const toast = useAppToast();

  const isEdit = Boolean(id);

  const [roles, setRoles] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const userRolesList = React.useMemo(() => {
    return (roles || []).map((r) => ({
      label: r.roleName || r.name,
      value: r.roleName || r.name,
    }));
  }, [roles]);

  const typeOptions = React.useMemo(() => {
    if (workTypes && workTypes.length > 0) {
      return workTypes.map((t) => ({
        label: t.workTypeName || t.typeName || t.name,
        value: t.workTypeName || t.typeName || t.name,
      }));
    }
    return [
      { label: "Office", value: "Office" },
      { label: "WFH", value: "WFH" },
    ];
  }, [workTypes]);

  function getRoleNameById(roleId) {
    const found = roles.find((r) => r.roleId === roleId || r.id === roleId);
    return found ? found.roleName || found.name : "";
  }

  useEffect(() => {
    loadMasterData();
  }, [id]);

  async function loadMasterData() {
    setLoading(true);
    try {
      const [rData, wData, uData] = await Promise.all([
        getRolesAsync(),
        getWorkTypesAsync(true),
        getUsersAsync(),
      ]);
      setRoles(rData || []);
      setWorkTypes(wData || []);
      setUsers(uData || []);

      if (id) {
        const row = (uData || []).find((u) => String(u.userId) === String(id));
        if (row) {
          populateFormForEdit(row, rData, wData);
        } else {
          toast.error("User not found.");
          navigate("/users");
        }
      }
    } catch (error) {
      toast.error("Failed to load user form data.");
    } finally {
      setLoading(false);
    }
  }

  function populateFormForEdit(row, loadedRoles = [], loadedWorkTypes = []) {
    const hasAccess = row.hasMemberProfile !== false;
    const hasMultiple = Boolean(
      row.enableMultipleRoles ||
      (row.roles && row.roles.length > 1) ||
      (row.secondaryRoles && row.secondaryRoles.length > 0)
    );

    let pRole = "";
    let sRole = "";

    const rList = (loadedRoles || []).map((r) => r.roleName || r.name);

    if (Array.isArray(row.primaryRoleIds) && row.primaryRoleIds.length > 0) {
      pRole = getRoleNameById(row.primaryRoleIds[0]);
    } else if (Array.isArray(row.primaryRoles) && row.primaryRoles.length > 0) {
      pRole = row.primaryRoles[0];
    } else if (row.roleId) {
      pRole = getRoleNameById(row.roleId);
    } else if (row.roleName) {
      pRole = row.roleName;
    }

    if (Array.isArray(row.secondaryRoleIds) && row.secondaryRoleIds.length > 0) {
      sRole = getRoleNameById(row.secondaryRoleIds[0]);
    } else if (Array.isArray(row.secondaryRoles) && row.secondaryRoles.length > 0) {
      sRole = row.secondaryRoles[0];
    }

    if (!pRole && rList.length > 0) {
      pRole = rList[0];
    }
    if (pRole === sRole) {
      sRole = rList.find((r) => r !== pRole) || "";
    }

    const singleRole = pRole || row.roleName || rList[0] || "Member";

    setForm({
      userId: row.userId,
      fullName: row.fullName || row.FullName || "",
      username: row.username ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      gender: row.gender ?? "Male",
      workType: row.workType || (loadedWorkTypes.length > 0 ? loadedWorkTypes[0].workTypeName : "Office"),
      dateOfBirth: row.dateOfBirth ? dayjs(row.dateOfBirth) : dayjs().subtract(18, "year"),
      joiningDate: row.joiningDate ? dayjs(row.joiningDate) : dayjs(),
      createMemberProfile: hasAccess,
      enableMultipleRoles: hasMultiple,
      roleName: singleRole,
      primaryRole: pRole,
      secondaryRole: sRole,
      newPassword: "",
      confirmPassword: "",
      isActive: row.isActive ?? true,
    });
  }

  function fieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function handleToggleMultipleRoles(checked) {
    setForm((prev) => {
      if (checked) {
        const pRole = prev.primaryRole || prev.roleName || userRolesList[0]?.value || "Admin";
        let sRole = prev.secondaryRole;
        if (!sRole || sRole === pRole) {
          const alternate = userRolesList.find((r) => r.value !== pRole)?.value || "Member";
          sRole = alternate;
        }
        return {
          ...prev,
          enableMultipleRoles: true,
          primaryRole: pRole,
          secondaryRole: sRole,
        };
      } else {
        const singleRole = prev.primaryRole || prev.roleName || (userRolesList[0]?.value || "Member");
        return {
          ...prev,
          enableMultipleRoles: false,
          roleName: singleRole,
        };
      }
    });
    setErrors((prev) => ({
      ...prev,
      primaryRole: "",
      secondaryRole: "",
      roleName: "",
    }));
  }

  function validate() {
    const schema = {
      fullName: { required: true, type: "letteronly", min: 2, max: 100, label: "Full Name" },
      email: { required: true, email: true, label: "Email" },
      phone: { required: true, type: "numberonly", min: 10, max: 10, label: "Phone Number" },
      gender: { required: true, label: "Gender" },
      workType: { required: true, label: "Work Type" },
      dateOfBirth: { required: true, label: "Date of Birth" },
      joiningDate: { required: true, label: "Joining Date" },
    };

    if (!form.enableMultipleRoles) {
      schema.roleName = { required: true, label: "User Role" };
    }

    const e = validateForm(form, schema);

    if (form.enableMultipleRoles) {
      if (!form.primaryRole) {
        e.primaryRole = "Primary Role is required";
      }
      if (!form.secondaryRole) {
        e.secondaryRole = "Secondary Role is required";
      }
      if (form.primaryRole && form.secondaryRole && form.primaryRole === form.secondaryRole) {
        e.secondaryRole = "Secondary Role must be different from Primary Role";
      }
    }

    if (form.createMemberProfile) {
      if (!form.userId && !form.newPassword) {
        e.newPassword = "Password is required";
      }
      if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
        e.confirmPassword = "Passwords do not match";
      }
    }

    const cleanPhone = String(form.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      e.phone = "Mobile number must be exactly 10 digits";
    }

    if (form.dateOfBirth) {
      const dobDay = dayjs(form.dateOfBirth);
      if (!dobDay.isValid()) {
        e.dateOfBirth = "Invalid date of birth";
      } else if (dayjs().diff(dobDay, "year") < 18) {
        e.dateOfBirth = "User must be at least 18 years old";
      }
    }

    if (form.joiningDate && form.dateOfBirth) {
      const dobDay = dayjs(form.dateOfBirth);
      const joinDay = dayjs(form.joiningDate);
      if (!joinDay.isValid()) {
        e.joiningDate = "Invalid joining date";
      } else if (joinDay.isBefore(dobDay) || joinDay.isSame(dobDay)) {
        e.joiningDate = "Joining Date must be after Date of Birth";
      } else if (joinDay.diff(dobDay, "year") < 18) {
        e.joiningDate = "Joining Date must be at least 18 years after Date of Birth";
      }
    }

    return e;
  }

  async function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix all validation errors before saving");
      return;
    }

    const emailLower = form.email.trim().toLowerCase();
    const isAccess = Boolean(form.createMemberProfile);
    const resolvedUsername = isAccess && form.username
      ? form.username.trim()
      : form.username?.trim() || null;
    const cleanPhone = String(form.phone || "").replace(/\D/g, "");

    if (!form.userId) {
      if (users.some((u) => u.email && u.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered");
        return;
      }
      if (
        isAccess &&
        resolvedUsername &&
        users.some((u) => u.username && u.username.trim().toLowerCase() === resolvedUsername.toLowerCase())
      ) {
        setErrors((prev) => ({ ...prev, username: "This username is already taken" }));
        toast.error("This username is already taken");
        return;
      }
      if (cleanPhone && users.some((u) => u.phone && String(u.phone).replace(/\D/g, "") === cleanPhone)) {
        setErrors((prev) => ({ ...prev, phone: "This mobile number is already registered" }));
        toast.error("This mobile number is already registered");
        return;
      }
    } else {
      if (users.some((u) => u.userId !== form.userId && u.email && u.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered");
        return;
      }
      if (
        isAccess &&
        resolvedUsername &&
        users.some(
          (u) =>
            u.userId !== form.userId &&
            u.username &&
            u.username.trim().toLowerCase() === resolvedUsername.toLowerCase()
        )
      ) {
        setErrors((prev) => ({ ...prev, username: "This username is already taken" }));
        toast.error("This username is already taken");
        return;
      }
      if (
        cleanPhone &&
        users.some(
          (u) => u.userId !== form.userId && u.phone && String(u.phone).replace(/\D/g, "") === cleanPhone
        )
      ) {
        setErrors((prev) => ({ ...prev, phone: "This mobile number is already registered" }));
        toast.error("This mobile number is already registered");
        return;
      }
    }

    setSaving(true);
    try {
      const isMultiple = Boolean(form.enableMultipleRoles);
      const primaryRolesList = isMultiple
        ? [form.primaryRole].filter(Boolean)
        : [form.roleName].filter(Boolean);
      const secondaryRolesList = isMultiple
        ? [form.secondaryRole].filter(Boolean)
        : [];
      const combinedRolesList = isMultiple
        ? Array.from(new Set([...primaryRolesList, ...secondaryRolesList]))
        : [form.roleName].filter(Boolean);

      const payload = {
        fullName: form.fullName.trim(),
        username: resolvedUsername,
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        workType: form.workType,
        dateOfBirth: form.dateOfBirth ? dayjs(form.dateOfBirth).format("YYYY-MM-DD") : null,
        joiningDate: form.joiningDate ? dayjs(form.joiningDate).format("YYYY-MM-DD") : null,
        createMemberProfile: isAccess,
        enableMultipleRoles: isMultiple,
        roleName: isMultiple ? form.primaryRole : form.roleName,
        primaryRoles: primaryRolesList,
        secondaryRoles: secondaryRolesList,
        roles: combinedRolesList,
        isActive: Boolean(form.isActive),
      };

      if (isAccess && form.newPassword) {
        payload.password = form.newPassword;
      }

      if (form.userId) {
        await updateUserAsync(form.userId, payload);
        toast.success("User updated successfully");
      } else {
        await createUserAsync(payload);
        toast.success("User created successfully");
      }
      navigate("/users");
    } catch (err) {
      toast.error(err, "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      {/* ── Page Title Bar ────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <IconButton
          onClick={() => navigate("/users")}
          sx={{
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(74, 63, 107, 0.08)",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(74, 63, 107, 0.15)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: (theme) =>
                theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              letterSpacing: "-0.01em",
            }}
          >
            {isEdit ? "Edit User" : "Add User"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit
              ? "Update user profile details, roles, and access settings"
              : "Create a new user account with role assignments"}
          </Typography>
        </Box>
      </Box>

      {/* ── Main Form Paper Container ──────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: "14px",
          border: "2px solid #4a3f6b",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#1b2033" : "#ffffff",
        }}
      >
        <Grid container spacing={2.5}>
          {/* Row 1: Full Name & User Role */}
          <Grid size={{ xs: 12, md: form.enableMultipleRoles ? 12 : 6 }}>
            <AppInput
              label="Full Name"
              placeholder="Enter full name"
              value={form.fullName}
              onChange={(e) => fieldChange("fullName", e.target.value)}
              restrictType="letteronly"
              maxLength={100}
              error={!!errors.fullName}
              helperText={errors.fullName}
              required
            />
          </Grid>

          {!form.enableMultipleRoles && (
            <Grid size={{ xs: 12, md: 6 }}>
              <AppSelect
                label="User Role"
                placeholder="Select user role"
                value={form.roleName}
                onChange={(e) => fieldChange("roleName", e.target.value)}
                options={userRolesList}
                error={!!errors.roleName}
                helperText={errors.roleName}
                required
              />
            </Grid>
          )}

          {/* Row 2 (When Enable Multiple Roles = ON): Primary & Secondary Role */}
          {form.enableMultipleRoles && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppSelect
                  label="Primary Role"
                  placeholder="Select primary role"
                  value={form.primaryRole}
                  onChange={(e) => {
                    const newPrimary = e.target.value;
                    fieldChange("primaryRole", newPrimary);
                    if (form.secondaryRole === newPrimary) {
                      fieldChange("secondaryRole", "");
                    }
                  }}
                  options={userRolesList.map((r) => ({
                    ...r,
                    disabled: r.value === form.secondaryRole,
                  }))}
                  error={!!errors.primaryRole}
                  helperText={errors.primaryRole}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppSelect
                  label="Secondary Role"
                  placeholder="Select secondary role"
                  value={form.secondaryRole}
                  onChange={(e) => fieldChange("secondaryRole", e.target.value)}
                  options={userRolesList.map((r) => ({
                    ...r,
                    disabled: r.value === form.primaryRole,
                  }))}
                  error={!!errors.secondaryRole}
                  helperText={errors.secondaryRole}
                  required
                />
              </Grid>
            </>
          )}

          {/* Row: Email & Phone Number */}
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
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput
              label="Phone Number"
              placeholder="Enter 10-digit phone number"
              value={form.phone}
              onChange={(e) => fieldChange("phone", e.target.value)}
              restrictType="numberonly"
              maxLength={10}
              error={!!errors.phone}
              helperText={errors.phone}
              required
            />
          </Grid>

          {/* Row: Gender & Work Type */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="Gender"
              placeholder="Select gender"
              value={form.gender}
              onChange={(e) => fieldChange("gender", e.target.value)}
              options={GENDER_OPTIONS}
              error={!!errors.gender}
              helperText={errors.gender}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="Work Type"
              placeholder="Select work type"
              value={form.workType}
              onChange={(e) => fieldChange("workType", e.target.value)}
              options={typeOptions}
              error={!!errors.workType}
              helperText={errors.workType}
              required
            />
          </Grid>

          {/* Row: Date of Birth & Joining Date */}
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput
              label="Date of Birth"
              value={form.dateOfBirth}
              onChange={(newVal) => fieldChange("dateOfBirth", newVal)}
              error={!!errors.dateOfBirth}
              helperText={errors.dateOfBirth}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput
              label="Joining Date"
              value={form.joiningDate}
              onChange={(newVal) => fieldChange("joiningDate", newVal)}
              error={!!errors.joiningDate}
              helperText={errors.joiningDate}
              required
            />
          </Grid>

          {/* Bottom Checkboxes: Create Login Account & Enable Multiple Roles */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              onClick={() => fieldChange("createMemberProfile", !form.createMemberProfile)}
              sx={{
                p: 1,
                px: 2,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: (theme) =>
                  form.createMemberProfile
                    ? "#4a3f6b"
                    : theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(74, 63, 107, 0.14)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.03)"
                    : "#f8f7fc",
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                minHeight: 38,
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#4a3f6b",
                },
              }}
            >
              <Checkbox
                checked={Boolean(form.createMemberProfile)}
                onChange={(e) => fieldChange("createMemberProfile", e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{
                  p: 0,
                  color: "#4a3f6b",
                  "&.Mui-checked": {
                    color: "#4a3f6b",
                  },
                }}
              />
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e",
                  fontSize: "0.82rem",
                }}
              >
                Create Login Account
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              onClick={() => handleToggleMultipleRoles(!form.enableMultipleRoles)}
              sx={{
                p: 1,
                px: 2,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: (theme) =>
                  form.enableMultipleRoles
                    ? "#4a3f6b"
                    : theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(74, 63, 107, 0.14)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.03)"
                    : "#f8f7fc",
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                minHeight: 38,
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#4a3f6b",
                },
              }}
            >
              <Checkbox
                checked={Boolean(form.enableMultipleRoles)}
                onChange={(e) => handleToggleMultipleRoles(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{
                  p: 0,
                  color: "#4a3f6b",
                  "&.Mui-checked": {
                    color: "#4a3f6b",
                  },
                }}
              />
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e",
                  fontSize: "0.82rem",
                }}
              >
                Enable Multiple Roles
              </Typography>
            </Box>
          </Grid>

          {/* Conditional User Access Fields */}
          {form.createMemberProfile && (
            <>
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
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: { xs: "none", md: "block" } }} />

              <Grid size={{ xs: 12, md: 6 }}>
                <AppInput
                  label={isEdit ? "New Password (leave blank to keep current)" : "Password"}
                  placeholder="Enter password (min 6 characters)"
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => fieldChange("newPassword", e.target.value)}
                  maxLength={50}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword}
                  required={!isEdit}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOff sx={{ fontSize: "1.1rem" }} />
                          ) : (
                            <Visibility sx={{ fontSize: "1.1rem" }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppInput
                  label={isEdit ? "Confirm New Password" : "Confirm Password"}
                  placeholder="Re-enter password"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => fieldChange("confirmPassword", e.target.value)}
                  maxLength={50}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required={!isEdit || !!form.newPassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirm((v) => !v)}
                          edge="end"
                        >
                          {showConfirm ? (
                            <VisibilityOff sx={{ fontSize: "1.1rem" }} />
                          ) : (
                            <Visibility sx={{ fontSize: "1.1rem" }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </>
          )}

          {isEdit && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  borderRadius: "10px",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.03)"
                      : "#f8f7fc",
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    Account Status
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active users can access the system according to their assigned roles.
                  </Typography>
                </Box>
                <AppSwitch
                  checked={form.isActive}
                  onChange={(e) => fieldChange("isActive", e.target.checked)}
                />
              </Box>
            </Grid>
          )}
        </Grid>

        {/* ── Bottom Action Buttons ────────────────────────────────────────── */}
        <Divider sx={{ my: 3, borderColor: "rgba(74, 63, 107, 0.15)" }} />

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <AppButton
            variant="outlined"
            onClick={() => navigate("/users")}
            disabled={saving}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
            onClick={handleSubmit}
            sx={{
              bgcolor: "#4a3f6b !important",
              "&:hover": { bgcolor: "#3b325c !important" },
            }}
          >
            {saving ? "Saving…" : "Save User"}
          </AppButton>
        </Stack>
      </Paper>
    </div>
  );
}
