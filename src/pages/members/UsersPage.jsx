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

import { useNavigate } from "react-router-dom";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import dayjs from "dayjs";
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton, { AppAddButton } from "../../components/common/AppButton";
import AppSwitch from "../../components/common/AppSwitch";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import ExcelImportDialog from "../../components/common/ExcelImportDialog";
import UserDetailsDialog from "../../components/members/UserDetailsDialog";
import SwitchRoleDialog from "../../components/members/SwitchRoleDialog";
import {
  validateForm,
  validateEmail,
  validateIndianMobile,
  validatePassword,
  validateConfirmPassword,
  validateUsername,
} from "../../utils/validation";
import {
  getUsersAsync,
  createUserAsync,
  updateUserAsync,
  deleteUserAsync,
  createUsersBulkAsync,
} from "../../services/userService";
import { getRolesAsync } from "../../services/roleService";
import { getWorkTypesAsync } from "../../services/workTypeService";
import { TOAST_MESSAGES, COMMON_STRINGS, MENU_FEATURE_IDS } from "../../constants";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";



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
  gender: "",
  workType: "",
  dateOfBirth: null,
  joiningDate: null,
  createMemberProfile: false, // Enable User Access (OFF by default)
  enableMultipleRoles: false, // Enable Multiple Roles (OFF by default)
  roleName: "",
  primaryRole: "",
  secondaryRole: "",
  newPassword: "",
  confirmPassword: "",
  isActive: true,
};

export default function UsersPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const activeRole = authState?.role || authState?.roleName;

  const canViewUsers = hasActionPermission("View User", MENU_FEATURE_IDS.USERS_VIEW, activeRole).canView;
  const canAddUser = hasActionPermission("Add User", MENU_FEATURE_IDS.USERS_ADD, activeRole).canExecute;
  const canEditUser = hasActionPermission("Edit User", MENU_FEATURE_IDS.USERS_EDIT, activeRole).canExecute;
  const canDeleteUser = hasActionPermission("Delete User", MENU_FEATURE_IDS.USERS_DELETE, activeRole).canExecute;
  const canImportExcel = hasActionPermission("Import Excel", MENU_FEATURE_IDS.USERS_IMPORT_EXCEL, activeRole).canExecute;
  const canExportUsers = hasActionPermission("Export Users", MENU_FEATURE_IDS.USERS_EXPORT, activeRole).canExecute;
  const canChangeUserStatus = hasActionPermission("Change User Status", MENU_FEATURE_IDS.USERS_UPDATE, activeRole).canExecute;

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

  const getRoleNameById = (id) => {
    if (!id) return "";
    const match = roles.find(
      (r) =>
        String(r.roleId).toLowerCase() === String(id).toLowerCase() ||
        String(r.id || "").toLowerCase() === String(id).toLowerCase() ||
        r.roleName?.toLowerCase() === String(id).toLowerCase()
    );
    return match ? match.roleName : id;
  };

  const typeOptions = useMemo(() => {
    const list = Array.isArray(workTypes)
      ? workTypes
      : Array.isArray(workTypes?.$values)
        ? workTypes.$values
        : [];
    return list
      .filter((w) => w && w.isActive !== false)
      .map((w) => {
        const name = w.workTypeName || w.typeName || w.name || "";
        return { label: name, value: name };
      })
      .filter((opt) => Boolean(opt.value));
  }, [workTypes]);

  const templateValidations = useMemo(() => {
    const workTypesStr = typeOptions.map((t) => t.value).join(",");
    const rolesStr = (roles || [])
      .map((r) => r.roleName || r.name)
      .filter(Boolean)
      .join(",");
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    return {
      Email: (r, getColLetter) => ({
        type: "custom",
        formulae: [`ISNUMBER(MATCH("*@*.*", ${getColLetter("Email")}${r}, 0))`],
        promptTitle: "Email Address",
        prompt: "Enter a valid, unique email address (e.g. user@domain.com).",
        errorTitle: "Invalid Email",
        error: "Please enter a valid email address.",
      }),
      "Phone Number": {
        type: "textLength",
        operator: "equal",
        formulae: [10],
        promptTitle: "Phone Number",
        prompt: "Enter a unique 10-digit phone number starting with 6-9.",
        errorTitle: "Invalid Phone Number",
        error: "Phone number must be exactly 10 digits.",
      },
      Gender: {
        type: "list",
        formulae: [`"Male,Female,Other"`],
        promptTitle: "Gender",
        prompt: "Select Male, Female, or Other.",
        errorTitle: "Invalid Gender",
        error: "Please select a gender from the list.",
      },
      "Date of Birth": (r, getColLetter) => ({
        type: "custom",
        formulae: [`AND(ISNUMBER(${getColLetter("Date of Birth")}${r}), ${getColLetter("Date of Birth")}${r}<=EDATE(TODAY(),-216))`],
        promptTitle: "Date of Birth",
        prompt: "Format: DD/MM/YYYY. User must be at least 18 years old.",
        errorTitle: "Minimum Age Requirement",
        error: "User must be at least 18 years old (DOB <= 18 years ago).",
      }),
      "Joining Date": (r, getColLetter) => ({
        type: "custom",
        formulae: [`AND(ISNUMBER(${getColLetter("Joining Date")}${r}), ${getColLetter("Joining Date")}${r}>=EDATE(${getColLetter("Date of Birth")}${r},216), ${getColLetter("Joining Date")}${r}<=TODAY()+90)`],
        promptTitle: "Joining Date",
        prompt: "Format: DD/MM/YYYY. Must be at least 18 years after Date of Birth and maximum 3 months in future.",
        errorTitle: "Invalid Joining Date",
        error: "Joining Date must be at least 18 years after Date of Birth and cannot exceed 3 months in future.",
      }),
      "Work Type": {
        type: "list",
        formulae: [`"${workTypesStr}"`],
        promptTitle: "Work Type",
        prompt: "Select Work Type from dropdown.",
        errorTitle: "Invalid Work Type",
        error: "Please select a work type from the list.",
      },
      Role: {
        type: "list",
        formulae: [`"${rolesStr}"`],
        promptTitle: "Role",
        prompt: "Select role from active roles.",
        errorTitle: "Invalid Role",
        error: "Please select an active role from the list.",
      },
    };
  }, [typeOptions, roles]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (appliedRole) {
      const matchedRoleObj = roles.find(
        (r) => r.roleName === appliedRole || String(r.roleId).toLowerCase() === String(appliedRole).toLowerCase()
      );
      const matchedRoleId = matchedRoleObj ? String(matchedRoleObj.roleId).toLowerCase() : null;
      result = result.filter((u) => {
        const uRoleId = u.roleId ? String(u.roleId).toLowerCase() : null;
        const uRoleIds = (u.roleIds || []).map((id) => String(id).toLowerCase());
        const uRoleName = u.roleName || getRoleNameById(u.roleId);
        return (
          uRoleName === appliedRole ||
          uRoleId === appliedRole.toLowerCase() ||
          (matchedRoleId && (uRoleId === matchedRoleId || uRoleIds.includes(matchedRoleId)))
        );
      });
    }
    if (appliedStatus !== "")
      result = result.filter((u) => String(u.isActive) === appliedStatus);
    return result;
  }, [users, roles, appliedRole, appliedStatus]);

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

  const navigate = useNavigate();

  // ── Open page navigation ──────────────────────────────────────────────────
  function openCreate() {
    if (!canAddUser) return;
    navigate("/users/add");
  }

  function openEdit(row) {
    if (!canEditUser) return;
    navigate(`/users/edit/${row.userId}`);
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

  function openView(row) {
    setSelectedUser(row);
    setViewDialogOpen(true);
  }

  function fieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "newPassword") {
      const pwErr = validatePassword(value, {
        username: form.username,
        email: form.email,
        isRequired: Boolean(form.createMemberProfile),
      });
      setErrors((prev) => {
        const nextErrors = { ...prev, newPassword: pwErr };
        if (form.confirmPassword) {
          nextErrors.confirmPassword = validateConfirmPassword(form.confirmPassword, value, {
            isRequired: Boolean(form.createMemberProfile),
          });
        }
        return nextErrors;
      });
      return;
    }

    if (field === "confirmPassword") {
      const cpwErr = validateConfirmPassword(value, form.newPassword, {
        isRequired: Boolean(form.createMemberProfile),
      });
      setErrors((prev) => ({ ...prev, confirmPassword: cpwErr }));
      return;
    }

    if (field === "username" || field === "email") {
      if (form.newPassword) {
        const pwErr = validatePassword(form.newPassword, {
          username: field === "username" ? value : form.username,
          email: field === "email" ? value : form.email,
          isRequired: Boolean(form.createMemberProfile),
        });
        setErrors((prev) => ({ ...prev, [field]: "", newPassword: pwErr }));
        return;
      }
    }

    if (field === "email") {
      if (errors.email) {
        setErrors((prev) => ({ ...prev, email: !value ? "This field is required" : validateEmail(value) }));
      }
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const schema = {
      fullName: { required: true, type: "letteronly", min: 2, max: 100, label: "Full Name" },
      email: { required: true, email: true, label: "Email" },
      gender: { required: true, label: "Gender" },
      workType: { required: true, label: "Work Type" },
      dateOfBirth: { required: true, label: "Date of Birth" },
      joiningDate: { required: true, label: "Joining Date" },
    };

    if (!form.enableMultipleRoles) {
      schema.roleName = { required: true, label: "User Role" };
    }

    if (form.createMemberProfile) {
      schema.username = { required: true, type: "letterandnumber", min: 3, max: 30, label: "Username" };
    }

    const e = validateForm(form, schema);

    if (form.createMemberProfile) {
      const pwErr = validatePassword(form.newPassword, {
        username: form.username,
        email: form.email,
        isRequired: true,
      });
      if (pwErr) {
        e.newPassword = pwErr;
      }

      const cpwErr = validateConfirmPassword(form.confirmPassword, form.newPassword, {
        isRequired: true,
      });
      if (cpwErr) {
        e.confirmPassword = cpwErr;
      }
    }

    // Validate Indian mobile number
    const phoneErr = validateIndianMobile(form.phone);
    if (phoneErr) {
      e.phone = phoneErr;
    }

    if (form.enableMultipleRoles) {
      if (!form.primaryRole) {
        e.primaryRole = "This field is required";
      }
      if (!form.secondaryRole) {
        e.secondaryRole = "This field is required";
      }
      if (form.primaryRole && form.secondaryRole && form.primaryRole === form.secondaryRole) {
        e.secondaryRole = "Secondary Role must be different from Primary Role";
      }
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

    // Joining Date validation
    if (form.joiningDate) {
      const joinDay = dayjs(form.joiningDate);
      if (!joinDay.isValid()) {
        e.joiningDate = "Invalid joining date";
      } else if (joinDay.isAfter(dayjs().add(3, "month").endOf("day"))) {
        e.joiningDate = "Joining Date cannot be more than 3 months in the future";
      } else if (form.dateOfBirth) {
        const dobDay = dayjs(form.dateOfBirth);
        if (dobDay.isValid()) {
          if (joinDay.isBefore(dobDay) || joinDay.isSame(dobDay)) {
            e.joiningDate = "Joining Date must be after Date of Birth";
          } else if (joinDay.diff(dobDay, "year") < 18) {
            e.joiningDate = "Joining Date must be at least 18 years after Date of Birth";
          }
        }
      }
    }

    return e;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill required field");
      return;
    }

    // Check duplicate email and username (Duplicate phone is allowed)
    const emailLower = form.email.trim().toLowerCase();
    const isAccess = Boolean(form.createMemberProfile);
    const resolvedUsername = isAccess && form.username
      ? form.username.trim()
      : (form.username?.trim() || null);

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
    }



    setSaving(true);
    try {
      const isMultiple = Boolean(form.enableMultipleRoles);
      const primaryRolesList = isMultiple
        ? (form.primaryRole ? [form.primaryRole] : [])
        : (form.roleName ? [form.roleName] : []);
      const secondaryRolesList = isMultiple
        ? (form.secondaryRole && form.secondaryRole !== form.primaryRole ? [form.secondaryRole] : [])
        : [];
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
        if (authState && (authState.userId === form.userId || authState.email?.toLowerCase() === form.email.trim().toLowerCase())) {
          try {
            await switchRole(mainRoleName);
          } catch {
            // Ignore switch role error if any
          }
        }
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
  function handleDeleteRequest(user) {
    if (!canDeleteUser) return;
    const targetUser = typeof user === "object" ? user : users.find((u) => u.userId === user);
    if (targetUser) {
      const isInUse = Boolean(
        targetUser.isReferred ||
        targetUser.IsReferred ||
        (targetUser.username && String(targetUser.username).trim() !== "") ||
        targetUser.createMemberProfile === true
      );
      if (isInUse) {
        toast.error("This record cannot be deleted because it is currently in use.");
        return;
      }
    }
    setUserToDelete(typeof user === "object" ? user.userId : user);
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

    // Disallow deactivating currently logged in user
    const isSelf = Boolean(
      (authState?.userId && String(row.userId).toLowerCase() === String(authState.userId).toLowerCase()) ||
      (authState?.email && row.email && String(row.email).toLowerCase() === String(authState.email).toLowerCase()) ||
      (authState?.username && row.username && String(row.username).toLowerCase() === String(authState.username).toLowerCase())
    );

    if (row.isActive && isSelf) {
      toast.error("You cannot deactivate your own account.");
      return;
    }

    setUserToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!userToToggle) return;

    // Disallow deactivating currently logged in user
    const isSelf = Boolean(
      (authState?.userId && String(userToToggle.userId).toLowerCase() === String(authState.userId).toLowerCase()) ||
      (authState?.email && userToToggle.email && String(userToToggle.email).toLowerCase() === String(authState.email).toLowerCase()) ||
      (authState?.username && userToToggle.username && String(userToToggle.username).toLowerCase() === String(authState.username).toLowerCase())
    );

    if (userToToggle.isActive && isSelf) {
      toast.error("You cannot deactivate your own account.");
      setStatusConfirmOpen(false);
      setUserToToggle(null);
      return;
    }

    try {
      const payload = {
        fullName: userToToggle.fullName || userToToggle.FullName || userToToggle.username,
        username: userToToggle.username,
        email: userToToggle.email,
        roleName: userToToggle.roleName,
        phone: userToToggle.phone || "",
        gender: userToToggle.gender || "",
        workType: userToToggle.workType || "",
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
    const fullName = row["name"] !== undefined && row["name"] !== null
      ? String(row["name"]).trim()
      : (row["full name"] !== undefined && row["full name"] !== null ? String(row["full name"]).trim() : "");
    const email = row["email"] !== undefined && row["email"] !== null ? String(row["email"]).trim() : "";
    const rawUsername = row["username"] !== undefined && row["username"] !== null
      ? String(row["username"]).trim()
      : (row["user name"] !== undefined && row["user name"] !== null
        ? String(row["user name"]).trim()
        : (row["user_name"] !== undefined && row["user_name"] !== null ? String(row["user_name"]).trim() : ""));
    const phone = row["phone number"] !== undefined && row["phone number"] !== null
      ? String(row["phone number"]).trim()
      : (row["phone"] !== undefined && row["phone"] !== null
        ? String(row["phone"]).trim()
        : (row["phonenumber"] !== undefined && row["phonenumber"] !== null ? String(row["phonenumber"]).trim() : (row["mobile"] || "")));
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

    const rawEnableMultiple = row["enable multiple roles"] ?? row["enablemultipleroles"] ?? row["multiple roles"] ?? "";
    const primaryRoleStr = row["primary role"] ?? row["primaryrole"] ?? row["role"] ?? row["role name"] ?? "";
    const additionalRolesStr = row["additional roles"] ?? row["additionalroles"] ?? row["secondary roles"] ?? "";

    // 1. Full Name
    if (!fullName) return { error: `Row ${rowNum}: Name is required` };
    if (!/^[a-zA-Z\s]+$/.test(fullName)) return { error: `Row ${rowNum}: Name must contain only letters` };

    // 2. Email Format & Email Uniqueness
    if (!email) return { error: `Row ${rowNum}: Email is required` };
    const emailErr = validateEmail(email);
    if (emailErr) {
      return { error: `Row ${rowNum}: ${emailErr} ('${email}')` };
    }
    const emailLower = email.toLowerCase();
    const existingEmail = users.find((u) => u.email && u.email.trim().toLowerCase() === emailLower);
    if (existingEmail) {
      const owner = existingEmail.fullName || existingEmail.username || "another user";
      return { error: `Row ${rowNum}: Email '${email}' already exists in database (registered to '${owner}')` };
    }
    if (allRows && Array.isArray(allRows)) {
      const firstEmailIndex = allRows.findIndex((r) => {
        const rEmail = r["email"] !== undefined && r["email"] !== null ? String(r["email"]).trim().toLowerCase() : "";
        return rEmail === emailLower;
      });
      if (firstEmailIndex !== -1 && firstEmailIndex < rowNum - 2) {
        return { error: `Row ${rowNum}: Duplicate email '${email}' in Excel sheet (matches Row ${firstEmailIndex + 2})` };
      }
    }

    // 3. Phone Number Validation (10 digits starting with 6–9)
    const rawPhone = String(phone || "").trim().replace(/\D/g, "");
    if (!rawPhone) {
      return { error: `Row ${rowNum}: Phone Number is required` };
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(rawPhone)) {
      if (rawPhone.length !== 10) {
        return { error: `Row ${rowNum}: Phone Number '${phone}' must be exactly 10 digits` };
      }
      if (!/^[6-9]/.test(rawPhone)) {
        return { error: `Row ${rowNum}: Phone Number '${phone}' must start with 6, 7, 8, or 9` };
      }
      return { error: `Row ${rowNum}: Phone Number '${phone}' is invalid. Enter a 10-digit number starting with 6–9` };
    }
    const cleanPhone = rawPhone;

    // 4. Gender
    const rawGender = String(gender || "").trim();
    if (!rawGender) return { error: `Row ${rowNum}: Gender is required` };
    const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
    if (!["Male", "Female", "Other"].includes(normalizedGender)) {
      return { error: `Row ${rowNum}: Gender must be Male, Female, or Other` };
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
      const str = String(val).trim();
      const parsed = dayjs(str, ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"], true);
      if (parsed.isValid()) return parsed;
      const parsedWithTime = dayjs(str, ["DD/MM/YYYY HH:mm:ss", "DD-MM-YYYY HH:mm:ss", "YYYY-MM-DDTHH:mm:ssZ"], true);
      if (parsedWithTime.isValid()) return parsedWithTime;
      const looseParsed = dayjs(str);
      if (looseParsed.isValid()) return looseParsed;
      return null;
    };

    // 5. DOB Minimum Age (18 years)
    const dob = parseExcelDate(dobStr);
    if (!dob || !dob.isValid()) {
      return { error: `Row ${rowNum}: Date of Birth must be a valid date (DD/MM/YYYY)` };
    }
    const ageInYears = dayjs().diff(dob, "year");
    if (ageInYears < 18) {
      return { error: `Row ${rowNum}: User must be at least 18 years old (Age: ${ageInYears} yrs, DOB: ${dob.format("DD/MM/YYYY")})` };
    }

    // 6. Joining Date must be after DOB and up to 3 months in the future
    const joiningDate = parseExcelDate(joiningStr);
    if (!joiningDate || !joiningDate.isValid()) {
      return { error: `Row ${rowNum}: Joining Date must be a valid date (DD/MM/YYYY)` };
    }
    if (joiningDate.isAfter(dayjs().add(3, "month").endOf("day"))) {
      return { error: `Row ${rowNum}: Joining Date (${joiningDate.format("DD/MM/YYYY")}) cannot be more than 3 months in the future` };
    }
    if (joiningDate.isBefore(dob) || joiningDate.isSame(dob)) {
      return { error: `Row ${rowNum}: Joining Date (${joiningDate.format("DD/MM/YYYY")}) must be after Date of Birth (${dob.format("DD/MM/YYYY")})` };
    }
    if (joiningDate.diff(dob, "year") < 18) {
      return { error: `Row ${rowNum}: Joining Date (${joiningDate.format("DD/MM/YYYY")}) cannot be earlier than 18 years from Date of Birth (${dob.add(18, "year").format("DD/MM/YYYY")})` };
    }

    // 7. Work Type
    if (!rawType) return { error: `Row ${rowNum}: Work Type is required` };
    const matchedType = typeOptions.find((t) => t.value.toLowerCase() === String(rawType).trim().toLowerCase());
    if (!matchedType) {
      return { error: `Row ${rowNum}: Work Type '${rawType}' must be one of: ${typeOptions.map((t) => t.value).join(", ")}` };
    }
    const normalizedType = matchedType.value;

    // 8. Role (Single Role Import)
    const cleanRole = String(primaryRoleStr || "").trim();
    if (!cleanRole) {
      return { error: `Row ${rowNum}: Role is required` };
    }
    const matchedRole = roles.find(
      (r) => (r.roleName || r.name || "").trim().toLowerCase() === cleanRole.toLowerCase()
    );
    if (!matchedRole) {
      return { error: `Row ${rowNum}: Role '${cleanRole}' is invalid. Must match an active master role: ${roles.map((r) => r.roleName || r.name).join(", ")}` };
    }
    const resolvedRole = matchedRole.roleName || matchedRole.name;

    // 9. Autogenerate Username from Full Name (without initials, lowercase, no whitespace)
    // Extract parts with length > 1 to exclude single-letter initials (e.g. "Anish A" -> "anish", "John Doe" -> "johndoe")
    const nameParts = fullName
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 1);

    let baseUsername = (nameParts.length > 0 ? nameParts.join("") : fullName.replace(/\s+/g, "")).toLowerCase();
    // Keep only letters and numbers
    baseUsername = baseUsername.replace(/[^a-z0-9]/g, "");
    if (baseUsername.length < 3) {
      baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    if (baseUsername.length > 25) {
      baseUsername = baseUsername.substring(0, 25);
    }

    // Determine unique username against database and previous rows in this batch
    let cleanUsername = baseUsername;
    let suffix = 1;

    const isUsernameTaken = (candidate, currentRowIndex) => {
      const lower = candidate.toLowerCase();
      // Check database
      if (users.some((u) => u.username && u.username.trim().toLowerCase() === lower)) {
        return true;
      }
      // Check prior rows in current Excel import batch
      if (allRows && Array.isArray(allRows)) {
        for (let i = 0; i < currentRowIndex; i++) {
          const priorRow = allRows[i];
          const priorFullName = priorRow["name"] || priorRow["full name"] || "";
          const priorParts = String(priorFullName).trim().split(/\s+/).filter((p) => p.length > 1);
          let priorBase = (priorParts.length > 0 ? priorParts.join("") : String(priorFullName).replace(/\s+/g, "")).toLowerCase().replace(/[^a-z0-9]/g, "");
          if (priorBase.length < 3) priorBase = String(priorFullName).toLowerCase().replace(/[^a-z0-9]/g, "");
          if (priorBase.length > 25) priorBase = priorBase.substring(0, 25);
          if (priorRow._assignedUsername && priorRow._assignedUsername.toLowerCase() === lower) {
            return true;
          }
          if (priorBase === lower && !priorRow._assignedUsername) {
            return true;
          }
        }
      }
      return false;
    };

    while (isUsernameTaken(cleanUsername, rowNum - 2)) {
      cleanUsername = `${baseUsername}${suffix}`;
      suffix++;
    }

    // Store assigned username on row for following rows to check against
    row._assignedUsername = cleanUsername;

    return {
      error: null,
      parsed: {
        fullName,
        username: cleanUsername,
        email,
        phone: cleanPhone,
        gender: normalizedGender,
        workType: normalizedType,
        dateOfBirth: dob.format("YYYY-MM-DD"),
        joiningDate: joiningDate.format("YYYY-MM-DD"),
        createMemberProfile: true,
        enableUserAccess: true,
        enableMultipleRoles: false,
        roleName: resolvedRole,
        primaryRole: resolvedRole,
        primaryRoles: [resolvedRole],
        secondaryRoles: [],
        roles: [resolvedRole],
        isImported: true,
        isActive: true,
      },
    };
  };

  const handleBulkImport = async (validData) => {
    if (!validData || validData.length === 0) {
      toast.error("No valid records found to import.");
      return;
    }
    setLoading(true);
    try {
      await createUsersBulkAsync(validData);
      toast.success(`Successfully imported all ${validData.length} user account(s) & profile(s)!`);
      loadData();
    } catch (err) {
      const serverData = err.response?.data;
      const rawMsg =
        serverData?.message ||
        (typeof serverData === "string" ? serverData : "") ||
        err.message ||
        "";

      const lower = rawMsg.toLowerCase();
      if (lower.includes("users_email_key") || (lower.includes("email") && lower.includes("unique"))) {
        toast.error("Duplicate Credential: Email address is already registered in the database.");
      } else if (lower.includes("users_username_key") || (lower.includes("username") && lower.includes("unique"))) {
        toast.error("Duplicate Credential: Username is already registered in the database.");
      } else if (lower.includes("users_phone_key") || (lower.includes("phone") && lower.includes("unique"))) {
        toast.error("Duplicate Credential: Phone number is already registered in the database.");
      } else if (rawMsg) {
        toast.error(rawMsg);
      } else {
        toast.error("Failed to import users. Please verify your credentials and try again.");
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
            <Tooltip title={canViewUsers ? "View Details" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewUsers ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canViewUsers}
                  onClick={() => openView(row)}
                >
                  <ViewIcon sx={{ fontSize: "1.05rem", color: canViewUsers ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canEditUser ? "Edit User" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canEditUser ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canEditUser}
                  onClick={() => openEdit(row)}
                >
                  <EditIcon sx={{ fontSize: "1.05rem", color: canEditUser ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            {(() => {
              const isInUse = Boolean(
                row.isReferred ||
                row.IsReferred ||
                (row.username && String(row.username).trim() !== "") ||
                row.createMemberProfile === true
              );
              const isDeleteAllowed = canDeleteUser && !isInUse;
              const deleteTooltip = isInUse
                ? "This record cannot be deleted because it is currently in use."
                : canDeleteUser
                  ? "Delete User"
                  : "Disabled";

              return (
                <Tooltip title={deleteTooltip}>
                  <span style={{ display: "inline-flex", cursor: !isDeleteAllowed ? "not-allowed" : "pointer" }}>
                    <IconButton
                      size="small"
                      sx={{ p: 0.3 }}
                      disabled={!isDeleteAllowed}
                      onClick={() => handleDeleteRequest(row)}
                    >
                      <DeleteIcon
                        sx={{
                          fontSize: "1.05rem",
                          color: (theme) =>
                            isDeleteAllowed
                              ? actionIconColor
                              : theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.45)"
                                : "#94a3b8",
                        }}
                      />
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })()}
            {(() => {
              const isSelf = Boolean(
                (authState?.userId && String(row.userId).toLowerCase() === String(authState.userId).toLowerCase()) ||
                (authState?.email && row.email && String(row.email).toLowerCase() === String(authState.email).toLowerCase()) ||
                (authState?.username && row.username && String(row.username).toLowerCase() === String(authState.username).toLowerCase())
              );
              const isDeactivatingSelf = row.isActive && isSelf;
              const canToggle = canChangeUserStatus && !isDeactivatingSelf;
              const tooltipTitle = isDeactivatingSelf
                ? "You cannot deactivate your own account"
                : canChangeUserStatus
                  ? (row.isActive ? "Deactivate User" : "Activate User")
                  : "Disabled";

              return (
                <Tooltip title={tooltipTitle}>
                  <span style={{ display: "inline-flex", cursor: !canToggle ? "not-allowed" : "pointer" }}>
                    <IconButton
                      size="small"
                      sx={{ p: 0.3 }}
                      disabled={!canToggle}
                      onClick={() => handleToggleStatusRequest(row)}
                    >
                      {row.isActive ? (
                        <ToggleOnIcon sx={{ fontSize: "1.25rem", color: canToggle ? "#10b981" : "#94a3b8" }} />
                      ) : (
                        <ToggleOffIcon sx={{ fontSize: "1.25rem", color: canToggle ? "#ef4444" : "#94a3b8" }} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })()}
          </Box>
        );
      },
    },

    {
      label: "Name",
      key: "fullName",
      render: (row) => row.fullName || row.FullName || row.memberUsername || "--",
    },
    {
      label: "Username",
      key: "username",
      render: (row) => (
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {row.createMemberProfile !== false && row.username && String(row.username).trim() !== ""
            ? row.username
            : "--"}
        </Typography>
      ),
    },
    { label: "Email", key: "email" },
    {
      label: "Primary Role",
      key: "primaryRole",
      render: (row) => {
        const hasLoginAccount = Boolean(
          row.createMemberProfile === true ||
          row.hasAccess === true ||
          (row.createMemberProfile !== false && row.username && String(row.username).trim() !== "")
        );

        let pRole = "";
        if (hasLoginAccount) {
          if (Array.isArray(row.primaryRoleIds) && row.primaryRoleIds.length > 0) {
            pRole = getRoleNameById(row.primaryRoleIds[0]);
          } else if (Array.isArray(row.primaryRoles) && row.primaryRoles.length > 0) {
            pRole = row.primaryRoles[0];
          } else if (row.roleId) {
            pRole = getRoleNameById(row.roleId);
          } else if (row.roleName && row.roleName !== "None") {
            pRole = row.roleName;
          } else if (Array.isArray(row.roleIds) && row.roleIds.length > 0) {
            pRole = getRoleNameById(row.roleIds[0]);
          } else if (Array.isArray(row.roles) && row.roles.length > 0) {
            pRole = row.roles[0];
          }
        }

        return (
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            {pRole || "--"}
          </Typography>
        );
      },
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
        searchPlaceholder="Search by username..."
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
            <AppAddButton
              disabled={!canAddUser}
              onClick={openCreate}
            />
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
                  label="User Role"
                  placeholder="Select Role"
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value || "");
                  }}
                  onClear={() => setFilterRole("")}
                  options={[{ label: "All Roles", value: "" }, ...userRolesList]}
                  size="small"
                  fullWidth
                />
              </Box>

              {/* Status filter */}
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label=" User Status"
                  placeholder="Select Status"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value || "");
                  }}
                  onClear={() => setFilterStatus("")}
                  options={[
                    { label: "All Statuses", value: "" },
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ]}
                  size="small"
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
        title="Import Users"
        templateHeaders={[
          "Name",
          "Email",
          "Phone Number",
          "Gender",
          "Date of Birth",
          "Joining Date",
          "Work Type",
          "Role",
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
