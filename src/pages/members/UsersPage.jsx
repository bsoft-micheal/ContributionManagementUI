import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
  Stack,
  Alert,
  Switch,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Description as ExcelIcon,
  FilterList as FilterListIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import dayjs from "dayjs";
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import AppSwitch from "../../components/common/AppSwitch";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import ExcelImportDialog from "../../components/common/ExcelImportDialog";
import UserDetailsDialog from "../../components/members/UserDetailsDialog";
import SwitchRoleDialog from "../../components/members/SwitchRoleDialog";
import { validateForm } from "../../utils/validation";
import {
  getUsersAsync,
  createUserAsync,
  updateUserAsync,
  deleteUserAsync,
  createUsersBulkAsync,
} from "../../services/userService";
import { getRolesAsync } from "../../services/roleService";
import { getWorkTypesAsync } from "../../services/workTypeService";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";

// ─── Multi-Role Select with Removable Chips ────────────────────────────────
function AppMultiRoleSelect({
  label,
  placeholder,
  value = [],
  onChange,
  options = [],
  disabledOptions = [],
  error,
  helperText,
  required,
}) {
  const theme = useTheme();

  const handleSelectChange = (event) => {
    const selected =
      typeof event.target.value === "string"
        ? event.target.value.split(",")
        : event.target.value;
    onChange(selected);
  };

  const handleDelete = (roleToDelete) => {
    onChange(value.filter((r) => r !== roleToDelete));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: error ? "error.main" : "text.secondary",
          fontSize: "0.8rem",
          display: "block",
          mb: 0.6,
        }}
      >
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </Typography>
      <Select
        multiple
        fullWidth
        displayEmpty
        value={value}
        onChange={handleSelectChange}
        error={Boolean(error)}
        renderValue={(selected) => {
          if (!selected || selected.length === 0) {
            return (
              <Typography
                variant="body2"
                sx={{ color: "text.disabled", fontSize: "0.85rem" }}
              >
                {placeholder || "Select roles…"}
              </Typography>
            );
          }
          return (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.3 }}>
              {selected.map((val) => (
                <Chip
                  key={val}
                  label={val}
                  size="small"
                  onDelete={(e) => {
                    e.stopPropagation();
                    handleDelete(val);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{
                    height: 24,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(124, 58, 237, 0.25)"
                        : "rgba(124, 58, 237, 0.12)",
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "#c4b5fd" : "#6d28d9",
                    "& .MuiChip-deleteIcon": {
                      fontSize: "0.95rem",
                      color: "inherit",
                      "&:hover": {
                        color: "#ef4444",
                      },
                    },
                  }}
                />
              ))}
            </Box>
          );
        }}
        sx={{
          minHeight: 44,
          borderRadius: "8px",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.04)"
              : "#ffffff",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: (theme) =>
              error
                ? theme.palette.error.main
                : theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(74, 63, 107, 0.2)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? theme.palette.error.main : "#7c3aed",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? theme.palette.error.main : "#7c3aed",
            borderWidth: "1.5px",
          },
        }}
      >
        {options.map((opt) => {
          const isDisabled = disabledOptions.includes(opt.value);
          return (
            <MenuItem
              key={opt.value}
              value={opt.value}
              disabled={isDisabled}
              sx={{
                fontSize: "0.85rem",
                fontWeight: 600,
                opacity: isDisabled ? 0.45 : 1,
              }}
            >
              <Checkbox
                checked={value.includes(opt.value)}
                size="small"
                sx={{
                  mr: 1,
                  p: 0.3,
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(74,63,107,0.3)",
                  "&.Mui-checked": { color: "#7c3aed" },
                }}
              />
              <ListItemText primary={opt.label} />
              {isDisabled && (
                <Typography
                  variant="caption"
                  sx={{ color: "text.disabled", ml: 1, fontSize: "0.7rem" }}
                >
                  (Selected in other field)
                </Typography>
              )}
            </MenuItem>
          );
        })}
      </Select>
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: error ? "error.main" : "text.secondary",
            mt: 0.5,
            display: "block",
            fontSize: "0.75rem",
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}

// ─── Custom Green Switch matching screenshot ───────────────────────────────
const CustomSwitch = styled(Switch)(({ theme }) => ({
  width: 48,
  height: 26,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 3,
    "&.Mui-checked": {
      transform: "translateX(22px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: "#16a34a",
      },
    },
  },
  "& .MuiSwitch-thumb": {
    width: 20,
    height: 20,
    borderRadius: "50%",
    boxShadow: "0 2px 4px 0 rgba(0, 35, 11, 0.2)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 13,
    opacity: 1,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(74, 63, 107, 0.18)",
    boxSizing: "border-box",
  },
}));

// ─── Role styling ─────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  Admin: { bg: "rgba(239,68,68,0.10)", darkBg: "rgba(239,68,68,0.20)", color: "#dc2626", darkColor: "#fca5a5" },
  Organizer: { bg: "rgba(234,179,8,0.12)", darkBg: "rgba(234,179,8,0.22)", color: "#b45309", darkColor: "#fde047" },
  Member: { bg: "rgba(74,63,107,0.08)", darkBg: "rgba(124,58,237,0.15)", color: "#4a3f6b", darkColor: "#c4b5fd" },
};
const getRoleStyle = (roleName = "") =>
  ROLE_COLORS[roleName] ?? { bg: "rgba(74,63,107,0.08)", darkBg: "rgba(124,58,237,0.15)", color: "#4a3f6b", darkColor: "#c4b5fd" };

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
  gender: "Male",
  workType: "Office",
  dateOfBirth: dayjs().subtract(18, "year"),
  joiningDate: dayjs(),
  createMemberProfile: false, // Enable User Access (OFF by default)
  enableMultipleRoles: false, // Enable Multiple Roles (OFF by default)
  roleName: "",
  primaryRoles: [],
  secondaryRoles: [],
  newPassword: "",
  confirmPassword: "",
  isActive: true,
};

export default function UsersPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const canViewUsers = hasActionPermission("View Users", 83, authState?.role).canView;
  const canAddUser = hasActionPermission("Add User", 84, authState?.role).canExecute && hasWriteAccess;
  const canEditUser = hasActionPermission("Edit User", 85, authState?.role).canExecute && hasWriteAccess;
  const canDeleteUser = hasActionPermission("Delete User", 86, authState?.role).canExecute && hasWriteAccess;
  const canImportExcel = hasActionPermission("Import Excel", 87, authState?.role).canExecute && hasWriteAccess;
  const canExportUsers = hasActionPermission("Export Users", 88, authState?.role).canExecute;
  const canChangeUserStatus = hasActionPermission("Change User Status", 89, authState?.role).canExecute && hasWriteAccess;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [roleSwitchDialogOpen, setRoleSwitchDialogOpen] = useState(false);
  const [selectedUserForRoleSwitch, setSelectedUserForRoleSwitch] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Filter state
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [appliedRole, setAppliedRole] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  // Dynamic user roles from database
  const userRolesList = useMemo(() => {
    if (roles && roles.length > 0) {
      return roles.map((r) => ({ label: r.roleName, value: r.roleName }));
    }
    return [
      { label: "Admin", value: "Admin" },
      { label: "Organizer", value: "Organizer" },
      { label: "Member", value: "Member" },
    ];
  }, [roles]);

  const typeOptions = useMemo(() => {
    if (workTypes && workTypes.length > 0) {
      return workTypes
        .filter((w) => w.isActive !== false)
        .map((w) => ({ label: w.workTypeName, value: w.workTypeName }));
    }
    return [
      { label: "Office", value: "Office" },
      { label: "WFH", value: "WFH" },
    ];
  }, [workTypes]);

  const templateValidations = useMemo(() => {
    const rolesStr = userRolesList.map((r) => r.value).join(",");
    const workTypesStr = typeOptions.map((t) => t.value).join(",");
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    return {
      Email: {
        type: "custom",
        formulae: ['ISNUMBER(MATCH("*@*.*", C2, 0))'],
        promptTitle: "Email Address",
        prompt: "Enter a valid, unique email address (e.g. user@domain.com).",
        errorTitle: "Invalid Email",
        error: "Please enter a valid email address.",
      },
      Role: {
        type: "list",
        formulae: [`"${rolesStr || "Admin,Organizer,Member"}"`],
        promptTitle: "User Role",
        prompt: "Select role from dropdown.",
        errorTitle: "Invalid Role",
        error: `Role must be one of: ${rolesStr || "Admin, Organizer, Member"}.`,
      },
      Phone: {
        type: "textLength",
        operator: "equal",
        formulae: [10],
        promptTitle: "Mobile Number",
        prompt: "Enter a unique 10-digit mobile number.",
        errorTitle: "Invalid Mobile Number",
        error: "Mobile number must be exactly 10 digits.",
      },
      Gender: {
        type: "list",
        formulae: [`"Male,Female,Other"`],
        promptTitle: "Gender",
        prompt: "Select Male, Female, or Other.",
        errorTitle: "Invalid Gender",
        error: "Please select a gender from the list.",
      },
      "Work Type": {
        type: "list",
        formulae: [`"${workTypesStr || "Office,WFH"}"`],
        promptTitle: "Work Type",
        prompt: "Select Work Type from dropdown.",
        errorTitle: "Invalid Work Type",
        error: "Please select a work type from the list.",
      },
      "Date of Birth": {
        type: "date",
        operator: "lessThanOrEqual",
        formulae: [eighteenYearsAgo],
        promptTitle: "Date of Birth",
        prompt: "Format: DD/MM/YYYY. User must be at least 18 years old.",
        errorTitle: "Minimum Age Requirement",
        error: "User must be at least 18 years old (DOB <= 18 years ago).",
      },
      "Joining Date": (r, getColLetter) => ({
        type: "custom",
        formulae: [`${getColLetter("Joining Date")}${r}>${getColLetter("Date of Birth")}${r}`],
        promptTitle: "Joining Date",
        prompt: "Format: DD/MM/YYYY. Joining date must be after Date of Birth.",
        errorTitle: "Invalid Joining Date",
        error: "Joining Date must be after Date of Birth.",
      }),
    };
  }, [userRolesList, typeOptions]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (appliedRole) result = result.filter((u) => u.roleName === appliedRole);
    if (appliedStatus !== "")
      result = result.filter((u) => String(u.isActive) === appliedStatus);
    return result;
  }, [users, appliedRole, appliedStatus]);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, rolesData, workTypesData] = await Promise.all([
        getUsersAsync(),
        getRolesAsync().catch(() => []),
        getWorkTypesAsync(true).catch(() => []),
      ]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
      setWorkTypes(Array.isArray(workTypesData) ? workTypesData : []);
    } catch {
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  }

  // ── Open dialog ────────────────────────────────────────────────────────────
  function openCreate() {
    if (!canAddUser) return;
    setForm({
      ...initialForm,
      workType: typeOptions.length > 0 ? typeOptions[0].value : "Office",
      gender: "Male",
      createMemberProfile: false,
      enableMultipleRoles: false,
      roleName: "",
      primaryRoles: [],
      secondaryRoles: [],
      username: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPassword(false);
    setShowConfirm(false);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(row) {
    if (!canEditUser) return;
    const hasAccess = row.hasMemberProfile !== false;
    const hasMultiple = Boolean(
      row.enableMultipleRoles ||
      (row.roles && row.roles.length > 1) ||
      (row.secondaryRoles && row.secondaryRoles.length > 0)
    );
    let pRoles = Array.isArray(row.primaryRoles) && row.primaryRoles.length > 0
      ? [...row.primaryRoles]
      : (row.roleName ? [row.roleName] : []);
    let sRoles = Array.isArray(row.secondaryRoles) ? [...row.secondaryRoles] : [];

    if (hasMultiple && pRoles.length === 0 && row.roles && row.roles.length > 0) {
      pRoles = [row.roles[0]];
      sRoles = row.roles.slice(1);
    }

    setForm({
      userId: row.userId,
      fullName: row.fullName || row.FullName || "",
      username: row.username ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      gender: row.gender ?? "Male",
      workType: row.workType || (typeOptions.length > 0 ? typeOptions[0].value : "Office"),
      dateOfBirth: row.dateOfBirth ? dayjs(row.dateOfBirth) : dayjs().subtract(18, "year"),
      joiningDate: row.joiningDate ? dayjs(row.joiningDate) : dayjs(),
      createMemberProfile: hasAccess,
      enableMultipleRoles: hasMultiple,
      roleName: row.roleName ?? (pRoles[0] || ""),
      primaryRoles: pRoles,
      secondaryRoles: sRoles,
      newPassword: "",
      confirmPassword: "",
      isActive: row.isActive ?? true,
      createdOn: row.createdOn || row.createdAt,
    });
    setShowPassword(false);
    setShowConfirm(false);
    setErrors({});
    setDialogOpen(true);
  }

  function handleToggleMultipleRoles(checked) {
    setForm((prev) => {
      let pRoles = Array.isArray(prev.primaryRoles) ? [...prev.primaryRoles] : [];
      let sRoles = Array.isArray(prev.secondaryRoles) ? [...prev.secondaryRoles] : [];
      if (checked) {
        if (pRoles.length === 0 && prev.roleName) {
          pRoles = [prev.roleName];
        }
      } else {
        const singleRole = pRoles.length > 0 ? pRoles[0] : (prev.roleName || "");
        return {
          ...prev,
          enableMultipleRoles: false,
          roleName: singleRole,
        };
      }
      return {
        ...prev,
        enableMultipleRoles: checked,
        primaryRoles: pRoles,
        secondaryRoles: sRoles,
      };
    });
    setErrors((prev) => ({
      ...prev,
      primaryRoles: "",
      secondaryRoles: "",
      roleName: "",
    }));
  }

  function openView(row) {
    setSelectedUser(row);
    setViewDialogOpen(true);
  }

  function fieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const filed = "This field is required";
    const schema = {
      fullName: { required: true, type: "letteronly", min: 2, max: 100, label: filed },
      email: { required: true, email: true, label: filed },
      phone: { required: true, type: "numberonly", min: 10, max: 10, label: filed },
      gender: { required: true, label: filed },
      workType: { required: true, label: filed },
      dateOfBirth: { required: true, label: filed },
      joiningDate: { required: true, label: filed },
    };

    if (!form.enableMultipleRoles) {
      schema.roleName = { required: true, label: filed };
    }

    if (form.createMemberProfile) {
      schema.username = { required: true, type: "letterandnumber", min: 3, max: 30, label: filed };
      if (!form.userId) {
        schema.newPassword = { required: true, min: 6, max: 50, label: filed };
        schema.confirmPassword = { required: true, min: 6, max: 50, label: filed };
      } else if (form.newPassword) {
        schema.newPassword = { required: false, min: 6, max: 50, label: filed };
        schema.confirmPassword = { required: true, min: 6, max: 50, label: filed };
      }
    }

    const e = validateForm(form, schema);

    if (form.enableMultipleRoles) {
      if (!form.primaryRoles || form.primaryRoles.length === 0) {
        e.primaryRoles = "At least one Primary Role is required";
      }
      if (!form.secondaryRoles || form.secondaryRoles.length === 0) {
        e.secondaryRoles = "At least one Secondary Role is required";
      }
      if (form.primaryRoles && form.secondaryRoles) {
        const overlap = form.primaryRoles.filter((r) => form.secondaryRoles.includes(r));
        if (overlap.length > 0) {
          e.secondaryRoles = "Same role cannot be selected in both Primary and Secondary";
        }
      }
    }

    if (form.createMemberProfile) {
      if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
        e.confirmPassword = "Passwords do not match";
      }
    }

    // Phone exact 10-digit validation
    const cleanPhone = String(form.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      e.phone = "Mobile number must be exactly 10 digits";
    }

    // DOB minimum age (18 years)
    if (form.dateOfBirth) {
      const dobDay = dayjs(form.dateOfBirth);
      if (!dobDay.isValid()) {
        e.dateOfBirth = "Invalid date of birth";
      } else if (dayjs().diff(dobDay, "year") < 18) {
        e.dateOfBirth = "User must be at least 18 years old";
      }
    }

    // Joining Date must be after DOB
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix all validation errors before saving");
      return;
    }

    // Check duplicate email, username, and mobile number
    const emailLower = form.email.trim().toLowerCase();
    const isAccess = Boolean(form.createMemberProfile);
    const resolvedUsername = isAccess && form.username
      ? form.username.trim()
      : (form.username?.trim() || null);
    const cleanPhone = String(form.phone || "").replace(/\D/g, "");

    if (!form.userId) {
      if (users.some((u) => u.email && u.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered");
        return;
      }
      if (isAccess && resolvedUsername && users.some((u) => u.username && u.username.trim().toLowerCase() === resolvedUsername.toLowerCase())) {
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
      if (isAccess && resolvedUsername && users.some((u) => u.userId !== form.userId && u.username && u.username.trim().toLowerCase() === resolvedUsername.toLowerCase())) {
        setErrors((prev) => ({ ...prev, username: "This username is already taken" }));
        toast.error("This username is already taken");
        return;
      }
      if (cleanPhone && users.some((u) => u.userId !== form.userId && u.phone && String(u.phone).replace(/\D/g, "") === cleanPhone)) {
        setErrors((prev) => ({ ...prev, phone: "This mobile number is already registered" }));
        toast.error("This mobile number is already registered");
        return;
      }
    }

    setSaving(true);
    try {
      const isMultiple = Boolean(form.enableMultipleRoles);
      const primaryRolesList = isMultiple ? (form.primaryRoles || []) : (form.roleName ? [form.roleName] : []);
      const secondaryRolesList = isMultiple ? (form.secondaryRoles || []) : [];
      const combinedRoles = isMultiple
        ? [...new Set([...primaryRolesList, ...secondaryRolesList])]
        : (form.roleName ? [form.roleName] : ["Member"]);
      const mainRoleName = primaryRolesList.length > 0 ? primaryRolesList[0] : (form.roleName || "Member");

      const payload = {
        fullName: form.fullName.trim(),
        username: resolvedUsername,
        email: form.email.trim(),
        phone: cleanPhone,
        gender: form.gender,
        workType: form.workType,
        dateOfBirth: form.dateOfBirth ? (dayjs.isDayjs(form.dateOfBirth) ? form.dateOfBirth.toISOString() : form.dateOfBirth) : null,
        joiningDate: form.joiningDate ? (dayjs.isDayjs(form.joiningDate) ? form.joiningDate.toISOString() : form.joiningDate) : null,
        createMemberProfile: isAccess,
        enableUserAccess: isAccess,
        enableMultipleRoles: isMultiple,
        memberUsername: isAccess ? resolvedUsername : null,
        roleName: mainRoleName,
        roles: combinedRoles,
        primaryRoles: primaryRolesList,
        secondaryRoles: secondaryRolesList,
        password: isAccess && form.newPassword ? form.newPassword.trim() : undefined,
        isActive: form.isActive,
      };

      if (form.userId) {
        await updateUserAsync(form.userId, payload);
        toast.success("Saved successfully");
      } else {
        await createUserAsync(payload);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      const rawMsg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response?.data : "") ||
        err.message ||
        "";
      if (
        rawMsg.toLowerCase().includes("inner exception") ||
        rawMsg.toLowerCase().includes("unique") ||
        rawMsg.toLowerCase().includes("duplicate")
      ) {
        toast.error("A user with this username, email, or mobile number already exists.");
      } else {
        toast.error(err.response?.data?.message ?? (rawMsg || "Failed to save"));
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function handleDeleteRequest(id) {
    if (!canDeleteUser) return;
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    try {
      await deleteUserAsync(userToDelete);
      toast.success("Deleted successfully");
      loadData();
    } catch (err) {
      toast.error(err, "Failed to delete");
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  }

  function handleToggleStatusRequest(row) {
    if (!canChangeUserStatus) return;
    setUserToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!userToToggle) return;
    try {
      const payload = {
        fullName: userToToggle.fullName || userToToggle.FullName || userToToggle.username,
        username: userToToggle.username,
        email: userToToggle.email,
        roleName: userToToggle.roleName,
        phone: userToToggle.phone || "",
        gender: userToToggle.gender || "Male",
        workType: userToToggle.workType || "Office",
        dateOfBirth: userToToggle.dateOfBirth,
        joiningDate: userToToggle.joiningDate,
        isActive: !userToToggle.isActive,
      };
      await updateUserAsync(userToToggle.userId, payload);
      toast.success("User status updated successfully");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to update status");
    } finally {
      setStatusConfirmOpen(false);
      setUserToToggle(null);
    }
  }

  // ── Excel Validation & Import ──────────────────────────────────────────────
  const validateRow = (row, rowNum, allRows) => {
    const fullName = row["full name"] !== undefined && row["full name"] !== null
      ? String(row["full name"]).trim()
      : (row["name"] !== undefined && row["name"] !== null ? String(row["name"]).trim() : "");
    const username = row["username"] !== undefined && row["username"] !== null ? String(row["username"]).trim() : "";
    const email = row["email"] !== undefined && row["email"] !== null ? String(row["email"]).trim() : "";
    const rawRole = row["role"] !== undefined && row["role"] !== null
      ? String(row["role"]).trim()
      : (row["rolename"] !== undefined && row["rolename"] !== null ? String(row["rolename"]).trim() : "");
    const password = row["password"] !== undefined && row["password"] !== null ? String(row["password"]).trim() : "";
    const phone = row["phone"] !== undefined && row["phone"] !== null
      ? String(row["phone"]).trim()
      : (row["phonenumber"] !== undefined && row["phonenumber"] !== null ? String(row["phonenumber"]).trim() : (row["mobile"] || ""));
    const gender = row["gender"] !== undefined && row["gender"] !== null ? String(row["gender"]).trim() : "";
    const rawType = row["work type"] !== undefined && row["work type"] !== null
      ? String(row["work type"]).trim()
      : (row["worktype"] !== undefined && row["worktype"] !== null ? String(row["worktype"]).trim() : "");
    const dobStr = row["date of birth"] !== undefined && row["date of birth"] !== null
      ? row["date of birth"]
      : (row["dob"] || "");
    const joiningStr = row["joining date"] !== undefined && row["joining date"] !== null
      ? row["joining date"]
      : (row["joiningdate"] || "");

    // 1. Full Name
    if (!fullName) return { error: `Row ${rowNum}: Full Name is required` };
    if (!/^[a-zA-Z\s]+$/.test(fullName)) return { error: `Row ${rowNum}: Full Name must contain only letters` };

    // 2. Username
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
      if (firstUserIndex !== -1 && firstUserIndex < rowNum - 2) {
        return { error: `Row ${rowNum}: Duplicate username '${username}' in Excel (Row ${firstUserIndex + 2})` };
      }
    }

    // 3. Email Format & Email Uniqueness
    if (!email) return { error: `Row ${rowNum}: Email is required` };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: `Row ${rowNum}: Invalid email format '${email}' (e.g. name@domain.com)` };
    }
    const emailLower = email.toLowerCase();
    const existingEmail = users.find((u) => u.email && u.email.trim().toLowerCase() === emailLower);
    if (existingEmail) {
      return { error: `Row ${rowNum}: Email '${email}' already exists in system (Email uniqueness)` };
    }
    if (allRows && Array.isArray(allRows)) {
      const firstEmailIndex = allRows.findIndex((r) => {
        const rEmail = r["email"] !== undefined && r["email"] !== null ? String(r["email"]).trim().toLowerCase() : "";
        return rEmail === emailLower;
      });
      if (firstEmailIndex !== -1 && firstEmailIndex < rowNum - 2) {
        return { error: `Row ${rowNum}: Duplicate email '${email}' in Excel (Row ${firstEmailIndex + 2})` };
      }
    }

    // 4. Role
    const matchedRole = userRolesList.find((r) => r.value.toLowerCase() === rawRole.toLowerCase());
    if (!matchedRole) {
      return { error: `Row ${rowNum}: Invalid role '${rawRole}'. Allowed: ${userRolesList.map((r) => r.value).join(", ")}` };
    }

    // 5. Password
    if (password && password.length < 6) {
      return { error: `Row ${rowNum}: Password must be at least 6 characters` };
    }

    // 6. Mobile Number Exactly 10 Digits & Mobile Uniqueness
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (!cleanPhone) {
      return { error: `Row ${rowNum}: Mobile number is required` };
    }
    if (cleanPhone.length !== 10) {
      return { error: `Row ${rowNum}: Mobile number '${phone}' must be exactly 10 digits` };
    }
    const existingPhone = users.find((u) => u.phone && String(u.phone).replace(/\D/g, "") === cleanPhone);
    if (existingPhone) {
      return { error: `Row ${rowNum}: Mobile number '${phone}' already exists in system (Mobile uniqueness)` };
    }
    if (allRows && Array.isArray(allRows)) {
      const firstPhoneIndex = allRows.findIndex((r) => {
        const rRaw = r["phone"] ?? r["phonenumber"] ?? r["mobile"] ?? "";
        return String(rRaw).replace(/\D/g, "") === cleanPhone;
      });
      if (firstPhoneIndex !== -1 && firstPhoneIndex < rowNum - 2) {
        return { error: `Row ${rowNum}: Duplicate mobile number '${phone}' in Excel (Row ${firstPhoneIndex + 2})` };
      }
    }

    // 7. Gender
    let normalizedGender = "Male";
    if (gender) {
      normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      if (!["Male", "Female", "Other"].includes(normalizedGender)) {
        return { error: `Row ${rowNum}: Gender must be Male, Female, or Other` };
      }
    }

    // 8. Work Type
    let normalizedType = "Office";
    if (rawType) {
      const matchedType = typeOptions.find((t) => t.value.toLowerCase() === rawType.toLowerCase());
      if (matchedType) {
        normalizedType = matchedType.value;
      } else {
        return { error: `Row ${rowNum}: Work Type '${rawType}' must be one of: ${typeOptions.map((t) => t.value).join(", ")}` };
      }
    }

    // Date parser
    const parseExcelDate = (val) => {
      if (val === undefined || val === null || val === "") return null;
      if (val instanceof Date) {
        const localDate = new Date(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate());
        return dayjs(localDate);
      }
      const num = Number(val);
      if (!isNaN(num) && num > 10000 && num < 60000) {
        const utcDate = new Date((num - 25568) * 86400 * 1000);
        const localDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
        return dayjs(localDate);
      }
      const parsed = dayjs(String(val).trim(), ["DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY", "DD-MM-YYYY"], true);
      if (parsed.isValid()) return parsed;
      const looseParsed = dayjs(String(val).trim());
      if (looseParsed.isValid()) return looseParsed;
      return null;
    };

    // 9. DOB Minimum Age (18 years)
    const dob = parseExcelDate(dobStr);
    if (!dob || !dob.isValid()) {
      return { error: `Row ${rowNum}: Date of Birth must be a valid date (DD/MM/YYYY)` };
    }
    const ageInYears = dayjs().diff(dob, "year");
    if (ageInYears < 18) {
      return { error: `Row ${rowNum}: User must be at least 18 years old (Age: ${ageInYears} yrs, DOB: ${dob.format("DD/MM/YYYY")})` };
    }

    // 10. Joining Date must be after DOB
    const joiningDate = parseExcelDate(joiningStr);
    if (!joiningDate || !joiningDate.isValid()) {
      return { error: `Row ${rowNum}: Joining Date must be a valid date (DD/MM/YYYY)` };
    }
    if (joiningDate.isBefore(dob) || joiningDate.isSame(dob)) {
      return { error: `Row ${rowNum}: Joining Date (${joiningDate.format("DD/MM/YYYY")}) must be after Date of Birth (${dob.format("DD/MM/YYYY")})` };
    }
    if (joiningDate.diff(dob, "year") < 18) {
      return { error: `Row ${rowNum}: Joining Date (${joiningDate.format("DD/MM/YYYY")}) cannot be earlier than 18 years from Date of Birth (${dob.add(18, "year").format("DD/MM/YYYY")})` };
    }

    return {
      error: null,
      parsed: {
        fullName,
        username,
        email,
        password: password || "Welcome@123",
        roleName: matchedRole.value,
        phone: cleanPhone,
        gender: normalizedGender,
        workType: normalizedType,
        dateOfBirth: dob.toISOString(),
        joiningDate: joiningDate.toISOString(),
        isActive: true,
      },
    };
  };

  const handleBulkImport = async (validData) => {
    if (!validData || validData.length === 0) return;
    setLoading(true);
    try {
      await createUsersBulkAsync(validData);
      toast.success(`Successfully imported all ${validData.length} user account(s) & member profile(s)!`);
      loadData();
    } catch (err) {
      const rawMsg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response?.data : "") ||
        err.message ||
        "";
      if (
        rawMsg.toLowerCase().includes("inner exception") ||
        rawMsg.toLowerCase().includes("unique") ||
        rawMsg.toLowerCase().includes("duplicate")
      ) {
        toast.error("One or more records contain a username, email, or phone that already exists in the database.");
      } else {
        toast.error(rawMsg || "Failed to import users");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      label: "Action",
      sx: { width: 145 },
      render: (row) => {
        return (
          <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
            <Tooltip title="View Details">
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                onClick={() => openView(row)}
              >
                <ViewIcon sx={{ fontSize: "1.05rem", color: actionIconColor }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={hasWriteAccess ? "Edit User" : ""}>
              <span>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canEditUser}
                  onClick={() => openEdit(row)}
                >
                  <EditIcon sx={{ fontSize: "1.05rem", color: canEditUser ? actionIconColor : "#cbd5e1" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canDeleteUser ? "Delete User" : ""}>
              <span>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canDeleteUser}
                  onClick={() => handleDeleteRequest(row.userId)}
                >
                  <DeleteIcon sx={{ fontSize: "1.05rem", color: canDeleteUser ? actionIconColor : "#cbd5e1" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canChangeUserStatus ? (row.isActive ? "Deactivate User" : "Activate User") : ""}>
              <span>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canChangeUserStatus}
                  onClick={() => handleToggleStatusRequest(row)}
                >
                  {row.isActive ? (
                    <ToggleOnIcon sx={{ fontSize: "1.25rem", color: canChangeUserStatus ? "#10b981" : "#cbd5e1" }} />
                  ) : (
                    <ToggleOffIcon sx={{ fontSize: "1.25rem", color: canChangeUserStatus ? "#ef4444" : "#cbd5e1" }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      label: "Full Name",
      key: "fullName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="text.primary">
          {row.fullName || row.FullName || row.username}
        </Typography>
      ),
    },
    {
      label: "Username",
      key: "username",
      render: (row) => (
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {row.username}
        </Typography>
      ),
    },
    { label: "Email", key: "email" },
    {
      label: "User Role",
      key: "roleName",
      render: (row) => {
        const assignedRoles = (Array.isArray(row.roles) && row.roles.length > 0)
          ? row.roles
          : (row.roleName ? [row.roleName] : ["Member"]);

        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
            {assignedRoles.map((r, idx) => {
              const style = getRoleStyle(r);
              const isPrimary = Boolean(
                row.primaryRoles?.includes(r) ||
                (!row.primaryRoles?.length && idx === 0)
              );
              return (
                <React.Fragment key={`${r}-${idx}`}>
                  <Chip
                    label={r}
                    size="small"
                    sx={{
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? style.darkBg : style.bg,
                      color: (theme) =>
                        theme.palette.mode === "dark" ? style.darkColor : style.color,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      height: 22,
                      borderRadius: "4px",
                      border: isPrimary ? "1px solid rgba(124, 58, 237, 0.35)" : "none",
                    }}
                  />
                  {idx < assignedRoles.length - 1 && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled", fontWeight: 700, mx: 0.2 }}
                    >
                      |
                    </Typography>
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        );
      },
    },
    {
      label: "Is Primary",
      key: "isPrimary",
      render: (row) => {
        const isPrimary = row.isPrimary !== false;
        return isPrimary ? (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: "#16a34a",
              bgcolor: "rgba(22,163,74,0.1)",
              px: 1.2,
              py: 0.3,
              borderRadius: "4px",
              fontSize: "0.7rem",
              letterSpacing: "0.03em",
              display: "inline-block",
            }}
          >
            Yes
          </Typography>
        ) : (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: "#64748b",
              bgcolor: "rgba(100,116,139,0.1)",
              px: 1.2,
              py: 0.3,
              borderRadius: "4px",
              fontSize: "0.7rem",
              letterSpacing: "0.03em",
              display: "inline-block",
            }}
          >
            No
          </Typography>
        );
      },
    },
    {
      label: "Is Secondary",
      key: "isSecondary",
      render: (row) => {
        const hasSecondary = Boolean(
          row.isSecondary ||
          (Array.isArray(row.secondaryRoles) && row.secondaryRoles.length > 0)
        );
        return hasSecondary ? (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: "#16a34a",
              bgcolor: "rgba(22,163,74,0.1)",
              px: 1.2,
              py: 0.3,
              borderRadius: "4px",
              fontSize: "0.7rem",
              letterSpacing: "0.03em",
              display: "inline-block",
            }}
          >
            Yes
          </Typography>
        ) : (
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: "#64748b",
              bgcolor: "rgba(100,116,139,0.1)",
              px: 1.2,
              py: 0.3,
              borderRadius: "4px",
              fontSize: "0.7rem",
              letterSpacing: "0.03em",
              display: "inline-block",
            }}
          >
            No
          </Typography>
        );
      },
    },
    {
      label: "Phone",
      key: "phone",
      render: (row) => row.phone || "--",
    },
    {
      label: "Work Type",
      key: "workType",
      render: (row) => {
        const wt = row.workType || "Office";
        const isWfh = wt.toUpperCase() === "WFH";
        return (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              bgcolor: isWfh ? "rgba(147, 51, 234, 0.1)" : "rgba(37, 99, 235, 0.1)",
              color: isWfh ? "#9333ea" : "#2563eb",
              border: isWfh ? "1px solid rgba(147, 51, 234, 0.25)" : "1px solid rgba(37, 99, 235, 0.25)",
              px: 1.2,
              py: 0.3,
              borderRadius: "12px",
              fontSize: "0.75rem",
              display: "inline-block",
            }}
          >
            {wt}
          </Typography>
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
              px: 1.2,
              py: 0.3,
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
              px: 1.2,
              py: 0.3,
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
      label: "Date of Birth",
      key: "dateOfBirth",
      render: (row) => formatGridDate(row.dateOfBirth),
    },
    {
      label: "Joining Date",
      key: "joiningDate",
      render: (row) => formatGridDate(row.joiningDate),
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
      <AppDataTable
        title="User Management"
        columns={columns}
        data={filteredUsers}
        loading={loading}
        allowExport={canExportUsers}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="outlined"
              size="small"
              disabled={!canImportExcel}
              startIcon={<ExcelIcon />}
              onClick={() => setImportDialogOpen(true)}
              sx={{
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(74, 63, 107, 0.3)",
                color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                "&:hover": {
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.04)",
                },
              }}
            >
              Import Excel
            </AppButton>
            <AppButton
              variant="contained"
              size="small"
              disabled={!canAddUser}
              startIcon={<PersonAddIcon />}
              onClick={openCreate}
            >
              Add User
            </AppButton>
          </Stack>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{ xs: 12, md: 8 }}
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
                  options={[{ label: "All Roles", value: "" }, ...userRolesList]}
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
        maxWidth="md"
        actions={
          <>
            <AppButton
              variant="outlined"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{
                borderRadius: "8px",
                px: 3.5,
                py: 0.8,
                textTransform: "none",
                fontWeight: 600,
                borderColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(74,63,107,0.25)",
                color: "text.primary",
                "&:hover": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.4)"
                      : "#4a3f6b",
                  bgcolor: "transparent",
                },
              }}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
              onClick={handleSubmit}
              sx={{
                borderRadius: "8px",
                px: 3.5,
                py: 0.8,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "#4a3f6b !important",
                "&:hover": { bgcolor: "#3b325c !important" },
              }}
            >
              {saving ? "Saving…" : "Save"}
            </AppButton>
          </>
        }
      >
        <Grid container spacing={2.5}>
          {/* Row 1: Full Name (& Member Role if single role) */}
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
                label="Member Role"
                placeholder="Select role…"
                value={form.roleName}
                onChange={(e) => fieldChange("roleName", e.target.value)}
                options={userRolesList}
                error={!!errors.roleName}
                helperText={errors.roleName}
                required
              />
            </Grid>
          )}

          {/* Row 2 (When Enable Multiple Roles = ON): Primary Role * & Secondary Role * */}
          {form.enableMultipleRoles && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppMultiRoleSelect
                  label="Primary Role"
                  placeholder="Select primary role(s)…"
                  value={form.primaryRoles}
                  onChange={(val) => fieldChange("primaryRoles", val)}
                  options={userRolesList}
                  disabledOptions={form.secondaryRoles}
                  error={!!errors.primaryRoles}
                  helperText={errors.primaryRoles}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppMultiRoleSelect
                  label="Secondary Role"
                  placeholder="Select secondary role(s)…"
                  value={form.secondaryRoles}
                  onChange={(val) => fieldChange("secondaryRoles", val)}
                  options={userRolesList}
                  disabledOptions={form.primaryRoles}
                  error={!!errors.secondaryRoles}
                  helperText={errors.secondaryRoles}
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
              placeholder="Select gender…"
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
              placeholder="Select work type…"
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

          {/* Bottom Switches: Enable User Access & Enable Multiple Roles in the same row */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 1.75,
                px: 2.5,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(74, 63, 107, 0.14)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.03)"
                    : "#f8f7fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 52,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e",
                  fontSize: "0.95rem",
                }}
              >
                Enable User Access
              </Typography>
              <CustomSwitch
                checked={Boolean(form.createMemberProfile)}
                onChange={(e) => fieldChange("createMemberProfile", e.target.checked)}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 1.75,
                px: 2.5,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(74, 63, 107, 0.14)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.03)"
                    : "#f8f7fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 52,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#ffffff" : "#1e1a2e",
                  fontSize: "0.95rem",
                }}
              >
                Enable Multiple Roles
              </Typography>
              <CustomSwitch
                checked={Boolean(form.enableMultipleRoles)}
                onChange={(e) => handleToggleMultipleRoles(e.target.checked)}
              />
            </Box>
          </Grid>

          {/* ── Conditional User Access Fields ── */}
          {form.createMemberProfile && (
            <>
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
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: { xs: "none", md: "block" } }} />

              {/* Password & Confirm Password */}
              <Grid size={{ xs: 12, md: 6 }}>
                <AppInput
                  label={form.userId ? "New Password (leave blank to keep current)" : "Password"}
                  placeholder="Enter password (min 6 characters)"
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
                        <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff sx={{ fontSize: "1.1rem" }} /> : <Visibility sx={{ fontSize: "1.1rem" }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppInput
                  label={form.userId ? "Confirm New Password" : "Confirm Password"}
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
                        <IconButton size="small" onClick={() => setShowConfirm((v) => !v)} edge="end">
                          {showConfirm ? <VisibilityOff sx={{ fontSize: "1.1rem" }} /> : <Visibility sx={{ fontSize: "1.1rem" }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </>
          )}

          {/* Is Active & Created On — shown in edit mode only */}
          {form.userId && (
            <>
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", alignItems: "center" }}>
                <AppSwitch
                  label={form.isActive ? "Active Account" : "Inactive Account"}
                  checked={form.isActive}
                  onChange={(e) => fieldChange("isActive", e.target.checked)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
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
            </>
          )}
        </Grid>
      </AppDialog>

      {/* ── Switch Role Dialog for Table Action ───────────────────────────── */}
      <SwitchRoleDialog
        open={roleSwitchDialogOpen}
        onClose={() => {
          setRoleSwitchDialogOpen(false);
          setSelectedUserForRoleSwitch(null);
        }}
        targetUser={selectedUserForRoleSwitch}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* ── Status Confirm ────────────────────────────────────────────────── */}
      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${userToToggle?.isActive ? "deactivate" : "activate"} this user account?`}
      />

      {/* ── Unified Excel Import ─────────────────────────────────────────── */}
      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleBulkImport}
        title="Import Users & Member Profiles"
        templateHeaders={[
          "Full Name",
          "Username",
          "Email",
          "Password",
          "Role",
          "Phone",
          "Gender",
          "Work Type",
          "Date of Birth",
          "Joining Date",
        ]}
        templateValidations={templateValidations}
        validateRow={validateRow}
      />

      {/* ── View User Details Dialog ──────────────────────────────────────── */}
      <UserDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
