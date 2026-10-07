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
  dateOfBirth: dayjs().subtract(18, "year"),
  joiningDate: dayjs(),
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
    const workTypesStr = typeOptions.map((t) => t.value).join(",");
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
        prompt: "Enter a unique 10-digit phone number.",
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
      "Work Type": {
        type: "list",
        formulae: [`"${workTypesStr || "Office,WFH"}"`],
        promptTitle: "Work Type",
        prompt: "Select Work Type from dropdown.",
        errorTitle: "Invalid Work Type",
        error: "Please select a work type from the list.",
      },
    };
  }, [typeOptions]);

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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
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

    if (form.createMemberProfile) {
      schema.username = { required: true, type: "letterandnumber", min: 3, max: 30, label: "Username" };
      if (!form.userId) {
        schema.newPassword = { required: true, min: 6, max: 50, label: "Password" };
        schema.confirmPassword = { required: true, min: 6, max: 50, label: "Confirm Password" };
      } else if (form.newPassword) {
        schema.newPassword = { required: false, min: 6, max: 50, label: "Password" };
        schema.confirmPassword = { required: true, min: 6, max: 50, label: "Confirm Password" };
      }
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
      toast.error("Please fill required field");
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
    const email = row["email"] !== undefined && row["email"] !== null ? String(row["email"]).trim() : "";
    const rawUsername = row["username"] !== undefined && row["username"] !== null
      ? String(row["username"]).trim()
      : (row["user name"] !== undefined && row["user name"] !== null
        ? String(row["user name"]).trim()
        : (row["user_name"] !== undefined && row["user_name"] !== null ? String(row["user_name"]).trim() : ""));
    const derivedUsername = rawUsername || (email && email.includes("@") ? email.split("@")[0].trim() : "");
    
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

    // 1. Full Name
    if (!fullName) return { error: `Row ${rowNum}: Full Name is required` };
    if (!/^[a-zA-Z\s]+$/.test(fullName)) return { error: `Row ${rowNum}: Full Name must contain only letters` };

    // 2. Email Format & Email Uniqueness
    if (!email) return { error: `Row ${rowNum}: Email is required` };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: `Row ${rowNum}: Invalid email format '${email}' (e.g. name@domain.com)` };
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

    // 3. Username Uniqueness (Explicit username or Email prefix)
    if (derivedUsername) {
      const usernameLower = derivedUsername.toLowerCase();
      const existingUsername = users.find((u) => u.username && u.username.trim().toLowerCase() === usernameLower);
      if (existingUsername) {
        const owner = existingUsername.fullName || existingUsername.username || "another user";
        return { error: `Row ${rowNum}: Username '${derivedUsername}' already exists in database (registered to '${owner}')` };
      }
      if (allRows && Array.isArray(allRows)) {
        const firstUserIndex = allRows.findIndex((r) => {
          const rRawUser = r["username"] ?? r["user name"] ?? r["user_name"] ?? "";
          const rEmail = r["email"] !== undefined && r["email"] !== null ? String(r["email"]).trim().toLowerCase() : "";
          const rUser = (rRawUser ? String(rRawUser).trim() : (rEmail.includes("@") ? rEmail.split("@")[0].trim() : "")).toLowerCase();
          return rUser === usernameLower;
        });
        if (firstUserIndex !== -1 && firstUserIndex < rowNum - 2) {
          return { error: `Row ${rowNum}: Duplicate username '${derivedUsername}' in Excel sheet (matches Row ${firstUserIndex + 2})` };
        }
      }
    }

    // 4. Mobile Number Exactly 10 Digits & Mobile Uniqueness
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (!cleanPhone) {
      return { error: `Row ${rowNum}: Phone Number is required` };
    }
    if (cleanPhone.length !== 10) {
      return { error: `Row ${rowNum}: Phone Number '${phone}' must be exactly 10 digits` };
    }
    const existingPhone = users.find((u) => u.phone && String(u.phone).replace(/\D/g, "") === cleanPhone);
    if (existingPhone) {
      const owner = existingPhone.fullName || existingPhone.username || "another user";
      return { error: `Row ${rowNum}: Phone Number '${phone}' already exists in database (registered to '${owner}')` };
    }
    if (allRows && Array.isArray(allRows)) {
      const firstPhoneIndex = allRows.findIndex((r) => {
        const rRaw = r["phone number"] ?? r["phone"] ?? r["phonenumber"] ?? r["mobile"] ?? "";
        return String(rRaw).replace(/\D/g, "") === cleanPhone;
      });
      if (firstPhoneIndex !== -1 && firstPhoneIndex < rowNum - 2) {
        return { error: `Row ${rowNum}: Duplicate phone number '${phone}' in Excel sheet (matches Row ${firstPhoneIndex + 2})` };
      }
    }

    // 5. Gender
    let normalizedGender = "Male";
    if (gender) {
      normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      if (!["Male", "Female", "Other"].includes(normalizedGender)) {
        return { error: `Row ${rowNum}: Gender must be Male, Female, or Other` };
      }
    }

    // 6. Work Type
    let normalizedType = typeOptions[0]?.value || "Office";
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

    // 7. DOB Minimum Age (18 years)
    const dob = parseExcelDate(dobStr);
    if (!dob || !dob.isValid()) {
      return { error: `Row ${rowNum}: Date of Birth must be a valid date (DD/MM/YYYY)` };
    }
    const ageInYears = dayjs().diff(dob, "year");
    if (ageInYears < 18) {
      return { error: `Row ${rowNum}: User must be at least 18 years old (Age: ${ageInYears} yrs, DOB: ${dob.format("DD/MM/YYYY")})` };
    }

    // 8. Joining Date must be after DOB
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
        username: rawUsername || derivedUsername,
        email,
        phone: cleanPhone,
        gender: normalizedGender,
        workType: normalizedType,
        dateOfBirth: dob.format("YYYY-MM-DD"),
        joiningDate: joiningDate.format("YYYY-MM-DD"),
        createMemberProfile: false,
        enableUserAccess: false,
        enableMultipleRoles: false,
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
            <Tooltip title={canDeleteUser ? "Delete User" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canDeleteUser ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canDeleteUser}
                  onClick={() => handleDeleteRequest(row.userId)}
                >
                  <DeleteIcon sx={{ fontSize: "1.05rem", color: canDeleteUser ? actionIconColor : "#94a3b8" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canChangeUserStatus ? (row.isActive ? "Deactivate User" : "Activate User") : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canChangeUserStatus ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canChangeUserStatus}
                  onClick={() => handleToggleStatusRequest(row)}
                >
                  {row.isActive ? (
                    <ToggleOnIcon sx={{ fontSize: "1.25rem", color: canChangeUserStatus ? "#10b981" : "#94a3b8" }} />
                  ) : (
                    <ToggleOffIcon sx={{ fontSize: "1.25rem", color: canChangeUserStatus ? "#ef4444" : "#94a3b8" }} />
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
          "Full Name",
          "Email",
          "Phone Number",
          "Gender",
          "Date of Birth",
          "Joining Date",
          "Work Type",
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
