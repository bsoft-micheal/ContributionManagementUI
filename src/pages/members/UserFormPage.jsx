import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Paper,
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
  PersonRounded as PersonRoundedIcon,
  PersonOutlineRounded as PersonOutlineRoundedIcon,
  MailOutlineRounded as MailOutlineRoundedIcon,
  PhoneOutlined as PhoneOutlinedIcon,
  WcRounded as WcRoundedIcon,
  CalendarMonthRounded as CalendarMonthRoundedIcon,
  BusinessCenterRounded as BusinessCenterRoundedIcon,
  GroupsRounded as GroupsRoundedIcon,
  ShieldOutlined as ShieldOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
} from "@mui/icons-material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppMultiSelect from "../../components/common/AppMultiSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
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
  secondaryRoles: [],
  newPassword: "",
  confirmPassword: "",
  isActive: true,
};

function FormSectionCard({ icon, title, subtitle, children, sx = {} }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? "divider" : "#e8e5f2",
        borderRadius: "10px",
        p: { xs: 1.5, sm: 1.8 },
        mb: 1.5,
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.015)"
            : "#ffffff",
        ...sx,
      }}
    >
      {/* Section Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.4 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.08)"
                : "#1e1b4b",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              fontSize: "0.88rem",
              color: (theme) =>
                theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e",
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                display: "block",
                mt: 0.2,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Section Content */}
      {children}
    </Box>
  );
}

export default function UserFormPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const toast = useAppToast();
  const { authState, fetchProfile } = useAuth();

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
      (row.secondaryRoles && row.secondaryRoles.length > 0) ||
      (row.secondaryRoleIds && row.secondaryRoleIds.length > 0)
    );

    let pRole = "";
    let sRolesList = [];

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
      sRolesList = row.secondaryRoleIds.map((rid) => getRoleNameById(rid)).filter(Boolean);
    } else if (Array.isArray(row.secondaryRoles) && row.secondaryRoles.length > 0) {
      sRolesList = [...row.secondaryRoles];
    } else if (Array.isArray(row.roles) && row.roles.length > 0) {
      sRolesList = [...row.roles];
    }

    if (pRole && !sRolesList.includes(pRole)) {
      sRolesList.push(pRole);
    }

    if (!pRole && sRolesList.length > 0) {
      pRole = sRolesList[0];
    }

    if (hasMultiple && sRolesList.length === 0) {
      sRolesList = [...rList];
      if (!pRole) pRole = rList[0] || "Member";
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
      secondaryRole: sRolesList.find((r) => r !== pRole) || "",
      secondaryRoles: sRolesList,
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

  function handleSecondaryRolesChange(newSecondaryRoles) {
    const updatedRoles = Array.isArray(newSecondaryRoles) ? newSecondaryRoles : [];
    setForm((prev) => {
      let nextPrimary = prev.primaryRole;
      if (!updatedRoles.includes(nextPrimary)) {
        nextPrimary = updatedRoles[0] || "";
      }
      return {
        ...prev,
        secondaryRoles: updatedRoles,
        primaryRole: nextPrimary,
      };
    });
    setErrors((prev) => ({
      ...prev,
      secondaryRoles: "",
      primaryRole: "",
    }));
  }

  function handleToggleMultipleRoles(checked) {
    setForm((prev) => {
      if (checked) {
        const allRoleValues = userRolesList.map((r) => r.value);
        const defaultSRoles = prev.secondaryRoles && prev.secondaryRoles.length > 0
          ? [...prev.secondaryRoles]
          : allRoleValues;
        let pRole = prev.primaryRole && defaultSRoles.includes(prev.primaryRole)
          ? prev.primaryRole
          : (prev.roleName && defaultSRoles.includes(prev.roleName) ? prev.roleName : defaultSRoles[0] || "Member");

        if (pRole && !defaultSRoles.includes(pRole)) {
          defaultSRoles.push(pRole);
        }

        return {
          ...prev,
          enableMultipleRoles: true,
          primaryRole: pRole,
          secondaryRoles: defaultSRoles,
        };
      } else {
        const singleRole = prev.primaryRole || prev.secondaryRoles[0] || prev.roleName || (userRolesList[0]?.value || "Member");
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
      secondaryRoles: "",
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
      schema.roleName = { required: true, label: "Primary Role" };
    }

    const e = validateForm(form, schema);

    if (form.enableMultipleRoles) {
      if (!form.secondaryRoles || form.secondaryRoles.length === 0) {
        e.secondaryRoles = "At least one role must be selected in Secondary Roles";
      }
      if (!form.primaryRole) {
        e.primaryRole = "Primary Role is required";
      } else if (form.secondaryRoles && !form.secondaryRoles.includes(form.primaryRole)) {
        e.primaryRole = "Primary Role must be one of the selected Secondary Roles";
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
      toast.error("Please fill required field");
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
        ? (form.secondaryRoles || []).filter((r) => r !== form.primaryRole)
        : [];
      const combinedRolesList = isMultiple
        ? form.secondaryRoles || []
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
        secondaryRole: (form.secondaryRoles || []).join(", "),
        secondaryRolesCsv: (form.secondaryRoles || []).join(", "),
        roles: combinedRolesList,
        rolesCsv: (form.secondaryRoles || []).join(", "),
        isActive: Boolean(form.isActive),
      };

      if (isAccess && form.newPassword) {
        payload.password = form.newPassword;
      }

      if (form.userId) {
        await updateUserAsync(form.userId, payload);
        if (authState?.userId && String(form.userId) === String(authState.userId)) {
          if (fetchProfile) await fetchProfile().catch(() => { });
        }
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
      <Paper
        elevation={0}
        sx={{
          border:
            theme.palette.mode === "dark"
              ? `1px solid ${theme.palette.divider}`
              : "1px solid rgba(74, 63, 107, 0.08)",
          borderRadius: "14px",
          overflow: "hidden",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "background.paper" : "#ffffff",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* ── 1. Page Header Bar ────────────────────────────────────────── */}
        <Box
          sx={{
            bgcolor: "#45386d",
            color: "#ffffff",
            px: { xs: 2, sm: 3 },
            py: 1.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 52,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Tooltip title="Back to Users">
              <IconButton
                size="small"
                onClick={() => navigate("/users")}
                sx={{
                  color: "#ffffff",
                  p: 0.5,
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: "1.25rem" }} />
              </IconButton>
            </Tooltip>
            {isEdit ? (
              <EditIcon sx={{ fontSize: "1.2rem", color: "#ffffff" }} />
            ) : (
              <PersonAddIcon sx={{ fontSize: "1.2rem", color: "#ffffff" }} />
            )}
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ fontSize: "1.05rem", letterSpacing: "0.01em", color: "#ffffff" }}
            >
              {isEdit ? "Edit User" : "Add User"}
            </Typography>
          </Box>
        </Box>

        {/* ── Main Form Body Container ──────────────────────────────────── */}
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>

          {/* ── SECTION 1 — Basic Information ──────────────────────────── */}
          <FormSectionCard
            icon={<PersonRoundedIcon sx={{ fontSize: "1.1rem" }} />}
            title="Basic Information"
          >
            <Grid container spacing={1.6}>
              {/* Row 1 */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppInput
                  label="Full Name"
                  placeholder="Enter full name"
                  value={form.fullName}
                  onChange={(e) => fieldChange("fullName", e.target.value)}
                  restrictType="letteronly"
                  maxLength={100}
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                  startAdornment={
                    <PersonOutlineRoundedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppInput
                  label="Email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => fieldChange("email", e.target.value)}
                  maxLength={100}
                  error={!!errors.email}
                  helperText={errors.email}
                  startAdornment={
                    <MailOutlineRoundedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppInput
                  label="Phone Number"
                  placeholder="Enter 10-digit phone number"
                  value={form.phone}
                  onChange={(e) => fieldChange("phone", e.target.value)}
                  restrictType="numberonly"
                  maxLength={10}
                  error={!!errors.phone}
                  helperText={errors.phone}
                  startAdornment={
                    <PhoneOutlinedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>

              {/* Row 2 */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppSelect
                  label="Gender"
                  placeholder="Select gender"
                  value={form.gender}
                  onChange={(e) => fieldChange("gender", e.target.value)}
                  options={GENDER_OPTIONS}
                  error={!!errors.gender}
                  helperText={errors.gender}
                  startAdornment={
                    <WcRoundedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppDateInput
                  label="Date of Birth"
                  value={form.dateOfBirth}
                  onChange={(newVal) => fieldChange("dateOfBirth", newVal)}
                  maxDate={dayjs().subtract(18, "year")}
                  error={!!errors.dateOfBirth}
                  helperText={errors.dateOfBirth}
                  startAdornment={
                    <CalendarMonthRoundedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppDateInput
                  label="Joining Date"
                  value={form.joiningDate}
                  onChange={(newVal) => fieldChange("joiningDate", newVal)}
                  error={!!errors.joiningDate}
                  helperText={errors.joiningDate}
                  startAdornment={
                    <CalendarMonthRoundedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>
            </Grid>
          </FormSectionCard>

          {/* ── SECTION 2 — Work Details ──────────────────────────────── */}
          <FormSectionCard
            icon={<BusinessCenterRoundedIcon sx={{ fontSize: "1.1rem" }} />}
            title="Work Details"
          >
            <Grid container spacing={1.6}>
              {/* Left Column: Work Type (reduced to 1/3 width) */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppSelect
                  label="Work Type"
                  placeholder="Select work type"
                  value={form.workType}
                  onChange={(e) => fieldChange("workType", e.target.value)}
                  options={typeOptions}
                  error={!!errors.workType}
                  helperText={errors.workType}
                  startAdornment={
                    <GroupsRoundedIcon
                      sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                    />
                  }
                  required
                />
              </Grid>

              {/* Right Column: Checkboxes aligned horizontally */}
              <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: { xs: 1.5, sm: 3 },
                    height: "100%",
                    pt: { xs: 0.5, md: 2.4 },
                  }}
                >
                  {/* Create Login Account */}
                  <Box
                    onClick={() =>
                      fieldChange("createMemberProfile", !form.createMemberProfile)
                    }
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      cursor: "pointer",
                      userSelect: "none",
                      width: "fit-content",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(form.createMemberProfile)}
                      onChange={(e) =>
                        fieldChange("createMemberProfile", e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      sx={{
                        p: 0,
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.4)"
                            : "#4a3f6b",
                        "&.Mui-checked": {
                          color: "#4a3f6b",
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "#e2e8f0" : "#1e293b",
                        fontSize: "0.82rem",
                      }}
                    >
                      Create Login Account
                    </Typography>
                  </Box>

                  {/* Enable Multiple Roles */}
                  <Box
                    onClick={() =>
                      handleToggleMultipleRoles(!form.enableMultipleRoles)
                    }
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      cursor: "pointer",
                      userSelect: "none",
                      width: "fit-content",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(form.enableMultipleRoles)}
                      onChange={(e) =>
                        handleToggleMultipleRoles(e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      sx={{
                        p: 0,
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.4)"
                            : "#4a3f6b",
                        "&.Mui-checked": {
                          color: "#4a3f6b",
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "#e2e8f0" : "#1e293b",
                        fontSize: "0.82rem",
                      }}
                    >
                      Enable Multiple Roles
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </FormSectionCard>

          {/* ── SECTION 3 — Role Assignment ──────────────────────────── */}
          <FormSectionCard
            icon={<ShieldOutlinedIcon sx={{ fontSize: "1.1rem" }} />}
            title="Role Assignment"
          >
            <Grid container spacing={1.6}>
              {form.enableMultipleRoles ? (
                <>
                  {/* Secondary Role Multiselect with Purple Chips */}
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <AppMultiSelect
                      label="Secondary Role"
                      placeholder="Select secondary roles"
                      value={form.secondaryRoles}
                      onChange={(e) => handleSecondaryRolesChange(e.target.value)}
                      options={userRolesList}
                      error={!!errors.secondaryRoles}
                      helperText={errors.secondaryRoles}
                      required
                    />
                  </Grid>

                  {/* Primary Role Dropdown */}
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <AppSelect
                      label="Primary Role"
                      placeholder="Select primary role"
                      value={form.primaryRole}
                      onChange={(e) => fieldChange("primaryRole", e.target.value)}
                      options={
                        form.secondaryRoles && form.secondaryRoles.length > 0
                          ? form.secondaryRoles.map((r) => ({
                            label: r,
                            value: r,
                          }))
                          : [
                            {
                              label: "Select Secondary Roles First",
                              value: "",
                              disabled: true,
                            },
                          ]
                      }
                      error={!!errors.primaryRole}
                      helperText={errors.primaryRole}
                      startAdornment={
                        <ShieldOutlinedIcon
                          sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                        />
                      }
                      required
                    />
                  </Grid>
                </>
              ) : (
                /* Single Role Mode (reduced to 1/3 width) */
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AppSelect
                    label="Primary Role"
                    placeholder="Select primary role"
                    value={form.roleName}
                    onChange={(e) => fieldChange("roleName", e.target.value)}
                    options={userRolesList}
                    error={!!errors.roleName}
                    helperText={errors.roleName}
                    startAdornment={
                      <ShieldOutlinedIcon
                        sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                      />
                    }
                    required
                  />
                </Grid>
              )}
            </Grid>
          </FormSectionCard>

          {/* ── SECTION 4 — Login Credentials ────────────────────────── */}
          {form.createMemberProfile && (
            <FormSectionCard
              icon={<LockOutlinedIcon sx={{ fontSize: "1.1rem" }} />}
              title="Login Credentials"
            >
              <Grid container spacing={1.6}>
                {/* Username */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AppInput
                    label="Username"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={(e) => fieldChange("username", e.target.value)}
                    restrictType="letterandnumber"
                    maxLength={30}
                    error={!!errors.username}
                    helperText={errors.username}
                    startAdornment={
                      <PersonOutlineRoundedIcon
                        sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                      />
                    }
                    required
                  />
                </Grid>

                {/* Password */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AppInput
                    label={
                      isEdit
                        ? "New Password (leave blank to keep current)"
                        : "Password"
                    }
                    placeholder={
                      isEdit
                        ? "Enter new password (optional)"
                        : "Enter password (min 6 characters)"
                    }
                    type={showPassword ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) => fieldChange("newPassword", e.target.value)}
                    maxLength={50}
                    error={!!errors.newPassword}
                    helperText={errors.newPassword}
                    required={!isEdit}
                    startAdornment={
                      <LockOutlinedIcon
                        sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                      />
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            sx={{ color: "#94a3b8" }}
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

                {/* Confirm Password */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AppInput
                    label={
                      isEdit ? "Confirm New Password" : "Confirm Password"
                    }
                    placeholder="Re-enter password"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      fieldChange("confirmPassword", e.target.value)
                    }
                    maxLength={50}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    required={!isEdit || !!form.newPassword}
                    startAdornment={
                      <LockOutlinedIcon
                        sx={{ color: "#94a3b8", fontSize: "1.1rem" }}
                      />
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowConfirm((v) => !v)}
                            edge="end"
                            sx={{ color: "#94a3b8" }}
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
              </Grid>
            </FormSectionCard>
          )}

          {/* ── 5. Bottom Action Buttons ──────────────────────────────── */}
          <Stack
            direction="row"
            spacing={1.5}
            justifyContent="center"
            sx={{ mt: 1.5 }}
          >
            <AppButton
              variant="outlined"
              onClick={() => navigate("/users")}
              disabled={saving}
              sx={{
                px: 3,
                py: 0.8,
                borderRadius: "8px",
                borderColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.2)"
                    : "#d8d8e5",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#cbd5e1" : "#334155",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "transparent" : "#ffffff",
                fontWeight: 600,
                fontSize: "0.85rem",
                "&:hover": {
                  borderColor: "#4a3f6b",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "#f8fafc",
                },
              }}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon sx={{ fontSize: "1.15rem" }} />}
              disabled={saving}
              onClick={handleSubmit}
              sx={{
                px: 3.5,
                py: 0.8,
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                bgcolor: "#342b54 !important",
                color: "#ffffff !important",
                "&:hover": { bgcolor: "#241d3b !important" },
              }}
            >
              {saving ? "Saving…" : "Save"}
            </AppButton>
          </Stack>
        </Box>
      </Paper>
    </div>
  );
}
