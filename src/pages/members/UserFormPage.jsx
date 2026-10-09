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
import {
  validateForm,
  validateIndianMobile,
  validatePassword,
  validateConfirmPassword,
  validateUsername,
} from "../../utils/validation";
import {
  getUsersAsync,
  createUserAsync,
  updateUserAsync,
} from "../../services/userService";
import { getRolesAsync } from "../../services/roleService";
import { getWorkTypesAsync } from "../../services/workTypeService";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";

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
  workType: "Office",
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

function FormSectionCard({ title, subtitle, children, sx = {} }) {
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
      <Box sx={{ mb: 1.4 }}>
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

  const [hasExistingLogin, setHasExistingLogin] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const savedFormRef = React.useRef(null);

  const isFormDirty = React.useCallback(() => {
    if (!savedFormRef.current) return false;
    const s = savedFormRef.current;

    // Compare basic fields
    if ((form.fullName || "").trim() !== (s.fullName || "").trim()) return true;
    if ((form.email || "").trim() !== (s.email || "").trim()) return true;
    if ((form.phone || "").trim() !== (s.phone || "").trim()) return true;
    if ((form.gender || "") !== (s.gender || "")) return true;
    if ((form.workType || "") !== (s.workType || "")) return true;

    // Compare dates
    const dobCurrent = form.dateOfBirth ? dayjs(form.dateOfBirth).format("YYYY-MM-DD") : "";
    const dobSaved = s.dateOfBirth ? dayjs(s.dateOfBirth).format("YYYY-MM-DD") : "";
    if (dobCurrent !== dobSaved) return true;

    const joinCurrent = form.joiningDate ? dayjs(form.joiningDate).format("YYYY-MM-DD") : "";
    const joinSaved = s.joiningDate ? dayjs(s.joiningDate).format("YYYY-MM-DD") : "";
    if (joinCurrent !== joinSaved) return true;

    // Compare credentials / flags
    if (Boolean(form.createMemberProfile) !== Boolean(s.createMemberProfile)) return true;
    if (Boolean(form.enableMultipleRoles) !== Boolean(s.enableMultipleRoles)) return true;
    if ((form.username || "").trim() !== (s.username || "").trim()) return true;
    if ((form.primaryRole || "") !== (s.primaryRole || "")) return true;
    if ((form.roleName || "") !== (s.roleName || "")) return true;

    // Compare secondary roles array
    const sec1 = Array.isArray(form.secondaryRoles) ? [...form.secondaryRoles].sort().join(",") : "";
    const sec2 = Array.isArray(s.secondaryRoles) ? [...s.secondaryRoles].sort().join(",") : "";
    if (sec1 !== sec2) return true;

    // Compare passwords if entered
    if (form.newPassword && form.newPassword.length > 0) return true;
    if (form.confirmPassword && form.confirmPassword.length > 0) return true;

    return false;
  }, [form]);

  const { handleCancelRequest, UnsavedChangesDialog } = useUnsavedChanges({
    isDirty: isFormDirty,
    onQuit: () => navigate("/users"),
  });

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

  function getRoleNameById(roleId, customRoles = roles) {
    if (!roleId) return "";
    const found = (customRoles || []).find(
      (r) =>
        String(r.roleId || r.RoleId || r.id || "").toLowerCase() ===
        String(roleId).toLowerCase()
    );
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
      const loadedRoles = rData || [];
      const loadedWorkTypes = wData || [];
      const loadedUsers = uData || [];

      setRoles(loadedRoles);
      setWorkTypes(loadedWorkTypes);
      setUsers(loadedUsers);

      if (id) {
        const row = loadedUsers.find(
          (u) => String(u.userId || u.UserId || u.id) === String(id)
        );
        if (row) {
          populateFormForEdit(row, loadedRoles, loadedWorkTypes);
        } else {
          toast.error("User not found.");
          navigate("/users");
        }
      } else {
        setHasExistingLogin(false);
        setIsChangingPassword(false);
        const defaultFormData = {
          ...initialForm,
          workType:
            loadedWorkTypes.length > 0
              ? loadedWorkTypes[0].workTypeName || loadedWorkTypes[0].name
              : "Office",
        };
        setForm(defaultFormData);
        savedFormRef.current = defaultFormData;
      }
    } catch (error) {
      toast.error("Failed to load user form data.");
    } finally {
      setLoading(false);
    }
  }

  function populateFormForEdit(row, loadedRoles = [], loadedWorkTypes = []) {
    if (!row) return;

    const resolveRoleName = (rId) => {
      if (!rId) return "";
      const found = (loadedRoles || []).find(
        (r) =>
          String(r.roleId || r.RoleId || r.id || "").toLowerCase() ===
          String(rId).toLowerCase()
      );
      return found ? found.roleName || found.name : "";
    };

    // Valid role names currently existing in master data
    const validMasterRoleNames = new Set(
      (loadedRoles || []).map((r) => (r.roleName || r.name || "").trim().toLowerCase()).filter(Boolean)
    );

    const isRoleValid = (name) => {
      if (!name) return false;
      return validMasterRoleNames.has(name.trim().toLowerCase());
    };

    // 1. Extract primary role
    let pRole = "";
    if (Array.isArray(row.primaryRoles) && row.primaryRoles.length > 0 && row.primaryRoles[0]) {
      pRole = String(row.primaryRoles[0]).trim();
    } else if (Array.isArray(row.PrimaryRoles) && row.PrimaryRoles.length > 0 && row.PrimaryRoles[0]) {
      pRole = String(row.PrimaryRoles[0]).trim();
    } else if (Array.isArray(row.primaryRoleIds) && row.primaryRoleIds.length > 0) {
      pRole = resolveRoleName(row.primaryRoleIds[0]);
    } else if (Array.isArray(row.PrimaryRoleIds) && row.PrimaryRoleIds.length > 0) {
      pRole = resolveRoleName(row.PrimaryRoleIds[0]);
    } else if (row.roleId && resolveRoleName(row.roleId)) {
      pRole = resolveRoleName(row.roleId);
    } else if (row.RoleId && resolveRoleName(row.RoleId)) {
      pRole = resolveRoleName(row.RoleId);
    } else if (row.roleName && row.roleName !== "None" && row.roleName !== "--") {
      pRole = String(row.roleName).trim();
    } else if (row.RoleName && row.RoleName !== "None" && row.RoleName !== "--") {
      pRole = String(row.RoleName).trim();
    } else if (row.role && row.role !== "None" && row.role !== "--") {
      pRole = String(row.role).trim();
    } else if (row.Role && row.Role !== "None" && row.Role !== "--") {
      pRole = String(row.Role).trim();
    }

    if (pRole && validMasterRoleNames.size > 0 && !isRoleValid(pRole)) {
      pRole = "";
    }

    // 2. Extract secondary/all roles
    const assignedRolesSet = new Set();
    const addRoleName = (val) => {
      if (!val || typeof val !== "string") return;
      const clean = val.trim();
      if (!clean || clean === "--" || clean === "None") return;
      if (validMasterRoleNames.size > 0 && !isRoleValid(clean)) return; // Exclude deleted/inactive roles
      for (const item of assignedRolesSet) {
        if (item.toLowerCase() === clean.toLowerCase()) return;
      }
      assignedRolesSet.add(clean);
    };

    const addRoleId = (rId) => {
      const name = resolveRoleName(rId);
      if (name) addRoleName(name);
    };

    if (Array.isArray(row.roles)) row.roles.forEach(addRoleName);
    if (Array.isArray(row.Roles)) row.Roles.forEach(addRoleName);
    if (Array.isArray(row.secondaryRoles)) row.secondaryRoles.forEach(addRoleName);
    if (Array.isArray(row.SecondaryRoles)) row.SecondaryRoles.forEach(addRoleName);
    if (Array.isArray(row.roleIds)) row.roleIds.forEach(addRoleId);
    if (Array.isArray(row.RoleIds)) row.RoleIds.forEach(addRoleId);
    if (Array.isArray(row.secondaryRoleIds)) row.secondaryRoleIds.forEach(addRoleId);
    if (Array.isArray(row.SecondaryRoleIds)) row.SecondaryRoleIds.forEach(addRoleId);
    if (pRole) addRoleName(pRole);

    const sRolesList = Array.from(assignedRolesSet);

    if (!pRole && sRolesList.length > 0) {
      pRole = sRolesList[0];
    } else if (!pRole && loadedRoles.length > 0) {
      pRole = loadedRoles[0].roleName || loadedRoles[0].name || "";
    }

    // 3. Determine login access flag and existing login presence
    const hasUsername = Boolean(row.username && String(row.username).trim() !== "");
    const hasAccess = Boolean(
      row.createMemberProfile === true ||
      row.enableUserAccess === true ||
      (hasUsername && (pRole || sRolesList.length > 0 || row.roleId || row.RoleId))
    );

    const existingLogin = Boolean(hasAccess && hasUsername);
    setHasExistingLogin(existingLogin);
    setIsChangingPassword(false);

    // 4. Determine multiple roles flag
    const hasMultiple = Boolean(
      hasAccess && (row.enableMultipleRoles || row.EnableMultipleRoles || sRolesList.length > 1)
    );

    const singleRole = hasAccess ? (pRole || "") : "";

    const editFormData = {
      userId: row.userId || row.UserId || "",
      fullName: row.fullName || row.FullName || row.name || row.Name || "",
      username: hasAccess ? (row.username || row.Username || "") : "",
      email: row.email || row.Email || "",
      phone: row.phone || row.Phone || "",
      gender: row.gender || row.Gender || "Male",
      workType:
        row.workType ||
        row.WorkType ||
        (loadedWorkTypes.length > 0
          ? loadedWorkTypes[0].workTypeName || loadedWorkTypes[0].name
          : "Office"),
      dateOfBirth: row.dateOfBirth
        ? dayjs(row.dateOfBirth)
        : row.DateOfBirth
        ? dayjs(row.DateOfBirth)
        : dayjs().subtract(18, "year"),
      joiningDate: row.joiningDate
        ? dayjs(row.joiningDate)
        : row.JoiningDate
        ? dayjs(row.JoiningDate)
        : dayjs(),
      createMemberProfile: hasAccess,
      enableMultipleRoles: hasMultiple,
      roleName: singleRole,
      primaryRole: pRole,
      secondaryRole:
        sRolesList.find((r) => r.toLowerCase() !== pRole.toLowerCase()) || "",
      secondaryRoles: sRolesList,
      newPassword: "",
      confirmPassword: "",
      isActive: row.isActive ?? row.IsActive ?? true,
    };

    setForm(editFormData);
    savedFormRef.current = editFormData;
  }

  function validateSingleField(field, value, currentForm) {
    const strVal = String(value ?? "").trim();

    switch (field) {
      case "fullName": {
        if (!strVal) return "This field is required";
        if (strVal.length < 2) return "Full Name must be at least 2 characters";
        if (strVal.length > 100) return "Full Name cannot exceed 100 characters";
        if (!/^[A-Za-z\s]+$/.test(strVal)) return "Only letters and spaces are allowed";
        return "";
      }
      case "email": {
        if (!strVal) return "This field is required";
        const emailErr = validateEmail(strVal);
        return emailErr || "";
      }
      case "phone": {
        if (!strVal) return "This field is required";
        const phoneErr = validateIndianMobile(strVal);
        return phoneErr || "";
      }
      case "gender": {
        if (!strVal) return "This field is required";
        return "";
      }
      case "workType": {
        if (!strVal) return "This field is required";
        return "";
      }
      case "dateOfBirth": {
        if (!value) return "This field is required";
        const dobDay = dayjs(value);
        if (!dobDay.isValid()) return "Invalid date of birth";
        if (dayjs().diff(dobDay, "year") < 18) return "User must be at least 18 years old";
        return "";
      }
      case "joiningDate": {
        if (!value) return "This field is required";
        const joinDay = dayjs(value);
        if (!joinDay.isValid()) return "Invalid joining date";
        if (currentForm.dateOfBirth) {
          const dobDay = dayjs(currentForm.dateOfBirth);
          if (dobDay.isValid()) {
            if (joinDay.isBefore(dobDay) || joinDay.isSame(dobDay)) {
              return "Joining Date must be after Date of Birth";
            }
            if (joinDay.diff(dobDay, "year") < 18) {
              return "Joining Date must be at least 18 years after Date of Birth";
            }
          }
        }
        return "";
      }
      case "username": {
        if (!currentForm.createMemberProfile) return "";
        return validateUsername(value, { isRequired: true });
      }
      case "newPassword": {
        if (!currentForm.createMemberProfile) return "";
        const shouldReqPassword =
          (!hasExistingLogin && Boolean(currentForm.createMemberProfile)) ||
          (hasExistingLogin && isChangingPassword);
        if (!shouldReqPassword) return "";

        const customReqMsg = hasExistingLogin ? "New password is required." : "Password is required.";
        if (!value || !String(value).trim()) {
          return customReqMsg;
        }

        return validatePassword(value, {
          username: currentForm.username,
          email: currentForm.email,
          isRequired: true,
        });
      }
      case "confirmPassword": {
        if (!currentForm.createMemberProfile) return "";
        const shouldReqPassword =
          (!hasExistingLogin && Boolean(currentForm.createMemberProfile)) ||
          (hasExistingLogin && isChangingPassword);
        if (!shouldReqPassword) return "";

        return validateConfirmPassword(value, currentForm.newPassword, {
          isRequired: true,
        });
      }
      case "roleName": {
        if (!currentForm.createMemberProfile || currentForm.enableMultipleRoles) return "";
        if (!strVal) return "This field is required";
        return "";
      }
      case "primaryRole": {
        if (!currentForm.createMemberProfile || !currentForm.enableMultipleRoles) return "";
        if (!strVal) return "This field is required";
        if (currentForm.secondaryRoles && !currentForm.secondaryRoles.includes(strVal)) {
          return "Primary Role must be one of the selected Secondary Roles";
        }
        return "";
      }
      case "secondaryRoles": {
        if (!currentForm.createMemberProfile || !currentForm.enableMultipleRoles) return "";
        if (!Array.isArray(value) || value.length === 0) return "This field is required";
        return "";
      }
      default:
        return "";
    }
  }

  function fieldChange(field, value) {
    if (field === "joiningDate") {
      const isJoiningToday =
        value &&
        dayjs(value).isValid() &&
        dayjs(value).isSame(dayjs(), "day");

      let nextWorkType = form.workType;
      if (isJoiningToday && !form.workType) {
        nextWorkType = "Office";
      }

      const updatedForm = {
        ...form,
        joiningDate: value,
        workType: nextWorkType,
      };
      setForm(updatedForm);

      const joinErr = validateSingleField("joiningDate", value, updatedForm);
      const workErr = validateSingleField("workType", nextWorkType, updatedForm);

      setErrors((prev) => ({
        ...prev,
        joiningDate: joinErr,
        workType: workErr,
      }));
      return;
    }
    if (field === "dobAndJoining") {
      const dobVal = value.dateOfBirth;
      const joinVal = value.joiningDate;
      const isJoiningToday = joinVal && dayjs(joinVal).isSame(dayjs(), "day");
      let nextWorkType = form.workType;
      if (isJoiningToday && !form.workType) {
        nextWorkType = "Office";
      }

      const updatedForm = {
        ...form,
        dateOfBirth: dobVal,
        joiningDate: joinVal,
        workType: nextWorkType,
      };
      setForm(updatedForm);

      const dobErr = validateSingleField("dateOfBirth", dobVal, updatedForm);
      const joinErr = validateSingleField("joiningDate", joinVal, updatedForm);
      const workErr = validateSingleField("workType", nextWorkType, updatedForm);

      setErrors((prev) => ({
        ...prev,
        dateOfBirth: dobErr,
        joiningDate: joinErr,
        workType: workErr,
      }));
      return;
    }

    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);

    const errorMsg = validateSingleField(field, value, updatedForm);

    setErrors((prev) => {
      const nextErrors = { ...prev, [field]: errorMsg };

      if (field === "dateOfBirth" && updatedForm.joiningDate) {
        nextErrors.joiningDate = validateSingleField("joiningDate", updatedForm.joiningDate, updatedForm);
      }
      if (field === "newPassword") {
        if (updatedForm.confirmPassword) {
          nextErrors.confirmPassword = validateSingleField("confirmPassword", updatedForm.confirmPassword, updatedForm);
        }
      }
      const shouldReqPassword =
        (!hasExistingLogin && Boolean(updatedForm.createMemberProfile)) ||
        (hasExistingLogin && isChangingPassword);

      if ((field === "username" || field === "email") && shouldReqPassword && updatedForm.newPassword) {
        nextErrors.newPassword = validateSingleField("newPassword", updatedForm.newPassword, updatedForm);
      }
      if (field === "secondaryRoles" && updatedForm.primaryRole) {
        nextErrors.primaryRole = validateSingleField("primaryRole", updatedForm.primaryRole, updatedForm);
      }

      return nextErrors;
    });
  }

  function handleSecondaryRolesChange(newSecondaryRoles) {
    const updatedRoles = Array.isArray(newSecondaryRoles) ? newSecondaryRoles : [];
    let nextPrimary = form.primaryRole;
    if (!updatedRoles.includes(nextPrimary)) {
      nextPrimary = updatedRoles[0] || "";
    }
    const updatedForm = {
      ...form,
      secondaryRoles: updatedRoles,
      primaryRole: nextPrimary,
    };
    setForm(updatedForm);

    const secErr = validateSingleField("secondaryRoles", updatedRoles, updatedForm);
    const primErr = validateSingleField("primaryRole", nextPrimary, updatedForm);

    setErrors((prev) => ({
      ...prev,
      secondaryRoles: secErr,
      primaryRole: primErr,
    }));
  }

  function handleToggleCreateMemberProfile(checked) {
    setForm((prev) => ({
      ...prev,
      createMemberProfile: checked,
      ...(checked
        ? {
            username: prev.username || "",
          }
        : {
            enableMultipleRoles: false,
            roleName: "",
            primaryRole: "",
            secondaryRole: "",
            secondaryRoles: [],
            username: "",
            newPassword: "",
            confirmPassword: "",
          }),
    }));
    if (!checked) {
      setErrors((prev) => ({
        ...prev,
        username: "",
        newPassword: "",
        confirmPassword: "",
        secondaryRoles: "",
        primaryRole: "",
        roleName: "",
      }));
    }
  }

  function handleToggleMultipleRoles(checked) {
    if (!form.createMemberProfile) return;
    setForm((prev) => {
      if (checked) {
        const existingRoles = (prev.secondaryRoles && prev.secondaryRoles.length > 0)
          ? [...prev.secondaryRoles]
          : (prev.roleName ? [prev.roleName] : (prev.primaryRole ? [prev.primaryRole] : []));

        let pRole = prev.primaryRole || prev.roleName || (existingRoles.length > 0 ? existingRoles[0] : "");

        if (pRole && !existingRoles.includes(pRole)) {
          existingRoles.push(pRole);
        }

        return {
          ...prev,
          enableMultipleRoles: true,
          primaryRole: pRole,
          secondaryRoles: existingRoles,
        };
      } else {
        const singleRole = prev.primaryRole || (prev.secondaryRoles && prev.secondaryRoles.length > 0 ? prev.secondaryRoles[0] : "") || prev.roleName || "";
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
      gender: { required: true, label: "Gender" },
      workType: { required: true, label: "Work Type" },
      dateOfBirth: { required: true, label: "Date of Birth" },
      joiningDate: { required: true, label: "Joining Date" },
    };

    if (form.createMemberProfile && !form.enableMultipleRoles) {
      schema.roleName = { required: true, label: "Primary Role" };
    }

    const e = validateForm(form, schema);

    if (form.createMemberProfile) {
      const userErr = validateUsername(form.username, { isRequired: true });
      if (userErr) {
        e.username = userErr;
      }
    }

    const shouldReqPassword =
      (!hasExistingLogin && Boolean(form.createMemberProfile)) ||
      (hasExistingLogin && isChangingPassword);

    if (form.createMemberProfile && shouldReqPassword) {
      const customReqMsg = hasExistingLogin ? "New password is required." : "Password is required.";
      if (!form.newPassword || !String(form.newPassword).trim()) {
        e.newPassword = customReqMsg;
      } else {
        const pwErr = validatePassword(form.newPassword, {
          username: form.username,
          email: form.email,
          isRequired: true,
        });
        if (pwErr) {
          e.newPassword = pwErr;
        }
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

    if (form.createMemberProfile && form.enableMultipleRoles) {
      if (!form.secondaryRoles || form.secondaryRoles.length === 0) {
        e.secondaryRoles = "This field is required";
      }
      if (!form.primaryRole) {
        e.primaryRole = "This field is required";
      } else if (form.secondaryRoles && !form.secondaryRoles.includes(form.primaryRole)) {
        e.primaryRole = "Primary Role must be one of the selected Secondary Roles";
      }
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
        setErrors((prev) => ({ ...prev, username: "Username already exists." }));
        toast.error("Username already exists.");
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
        setErrors((prev) => ({ ...prev, username: "Username already exists." }));
        toast.error("Username already exists.");
        return;
      }
    }

    setSaving(true);
    try {
      const isMultiple = Boolean(isAccess && form.enableMultipleRoles);
      const primaryRolesList = isAccess
        ? (isMultiple ? [form.primaryRole].filter(Boolean) : [form.roleName].filter(Boolean))
        : [];
      const secondaryRolesList = isAccess && isMultiple
        ? (form.secondaryRoles || []).filter((r) => r !== form.primaryRole)
        : [];
      const combinedRolesList = isAccess
        ? (isMultiple ? form.secondaryRoles || [] : [form.roleName].filter(Boolean))
        : [];

      const payload = {
        fullName: form.fullName.trim(),
        username: isAccess ? resolvedUsername : null,
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        workType: form.workType,
        dateOfBirth: form.dateOfBirth ? dayjs(form.dateOfBirth).format("YYYY-MM-DD") : null,
        joiningDate: form.joiningDate ? dayjs(form.joiningDate).format("YYYY-MM-DD") : null,
        createMemberProfile: isAccess,
        enableUserAccess: isAccess,
        enableMultipleRoles: isMultiple,
        roleName: isAccess ? (isMultiple ? form.primaryRole : form.roleName) : null,
        primaryRoles: primaryRolesList,
        secondaryRoles: secondaryRolesList,
        secondaryRole: secondaryRolesList.length > 0 ? secondaryRolesList.join(", ") : null,
        secondaryRolesCsv: secondaryRolesList.length > 0 ? secondaryRolesList.join(", ") : null,
        roles: combinedRolesList,
        rolesCsv: combinedRolesList.length > 0 ? combinedRolesList.join(", ") : null,
        isActive: Boolean(form.isActive),
      };

      const shouldReqPassword =
        (!hasExistingLogin && isAccess) ||
        (hasExistingLogin && isChangingPassword);

      if (isAccess && shouldReqPassword && form.newPassword && form.newPassword.trim()) {
        payload.password = form.newPassword.trim();
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
        {/* ── 1. Page Header Bar ───────────────── */}
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
                onClick={() => handleCancelRequest(() => navigate("/users"))}
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
          <FormSectionCard title="Basic Information">
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
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppInput
                  label="Email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => fieldChange("email", e.target.value)}
                  maxLength={250}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AppInput
                  label="Phone Number"
                  placeholder="Enter 10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => fieldChange("phone", e.target.value)}
                  restrictType="numberonly"
                  maxLength={10}
                  error={!!errors.phone}
                  helperText={errors.phone}
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
                  required
                />
              </Grid>
            </Grid>
          </FormSectionCard>

          {/* ── SECTION 2 — Work Details ──────────────────────────────── */}
          <FormSectionCard title="Work Details">
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
                    onClick={() => {
                      if (!hasExistingLogin) {
                        handleToggleCreateMemberProfile(!form.createMemberProfile);
                      }
                    }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      cursor: hasExistingLogin ? "default" : "pointer",
                      userSelect: "none",
                      width: "fit-content",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(form.createMemberProfile)}
                      disabled={hasExistingLogin}
                      onChange={(e) => {
                        if (!hasExistingLogin) {
                          handleToggleCreateMemberProfile(e.target.checked);
                        }
                      }}
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
                        "&.Mui-disabled": {
                          color: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.35)"
                              : "#94a3b8",
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

                  {/* Enable Multiple Roles (only available if Create Login Account is checked) */}
                  <Box
                    onClick={() => {
                      if (form.createMemberProfile) {
                        handleToggleMultipleRoles(!form.enableMultipleRoles);
                      }
                    }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      cursor: form.createMemberProfile ? "pointer" : "not-allowed",
                      userSelect: "none",
                      width: "fit-content",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(form.enableMultipleRoles && form.createMemberProfile)}
                      disabled={!form.createMemberProfile}
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
                        "&.Mui-disabled": {
                          color: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.35)"
                              : "#94a3b8",
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        color: (theme) =>
                          !form.createMemberProfile
                            ? theme.palette.mode === "dark"
                              ? "#94a3b8"
                              : "#64748b"
                            : theme.palette.mode === "dark"
                            ? "#e2e8f0"
                            : "#1e293b",
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

          {/* ── SECTION 3 — Role Assignment (only shown when Create Login Account is checked) ── */}
          {form.createMemberProfile && (
            <FormSectionCard title="Role Assignment">
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
                      required
                    />
                  </Grid>
                )}
              </Grid>
            </FormSectionCard>
          )}

          {/* ── SECTION 4 — Login Credentials ────────────────────────── */}
          {form.createMemberProfile && (
            <FormSectionCard title="Login Credentials">
              <Grid container spacing={1.6}>
                {/* Username */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <AppInput
                    label="Username"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={(e) => fieldChange("username", e.target.value)}
                    restrictType="username"
                    maxLength={30}
                    autoComplete="off"
                    error={!!errors.username}
                    helperText={errors.username || "4–30 characters. Start with a letter. Use letters, numbers, dot or underscore only."}
                    required
                  />
                </Grid>

                {/* For Existing Login User when NOT changing password: Show masked password + Change Password button */}
                {hasExistingLogin && !isChangingPassword ? (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          mb: 0.6,
                          fontSize: "0.78rem",
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#cbd5e1" : "#475569",
                        }}
                      >
                        Password
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          px: 1.5,
                          height: 40,
                          border: "1px solid",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.15)"
                              : "#d8d8e5",
                          borderRadius: "8px",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.03)"
                              : "#f8fafc",
                        }}
                      >
                        <Typography
                          sx={{
                            letterSpacing: "0.25em",
                            fontSize: "1.1rem",
                            color: "text.secondary",
                            userSelect: "none",
                            lineHeight: 1,
                            fontWeight: 700,
                          }}
                        >
                          ••••••••
                        </Typography>
                        <AppButton
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setIsChangingPassword(true);
                            setErrors((prev) => ({
                              ...prev,
                              newPassword: "",
                              confirmPassword: "",
                            }));
                          }}
                          sx={{
                            py: 0.3,
                            px: 1.2,
                            fontSize: "0.75rem",
                            minWidth: "auto",
                            height: 28,
                            borderRadius: "6px",
                            borderColor: "#4a3f6b",
                            color: "#4a3f6b",
                            fontWeight: 600,
                            "&:hover": {
                              bgcolor: "rgba(74, 63, 107, 0.08)",
                              borderColor: "#4a3f6b",
                            },
                          }}
                        >
                          Change Password
                        </AppButton>
                      </Box>
                    </Box>
                  </Grid>
                ) : (
                  <>
                    {/* Password */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <AppInput
                        label={
                          hasExistingLogin
                            ? "New Password"
                            : "Password"
                        }
                        placeholder={
                          hasExistingLogin
                            ? "Enter new password (8–12 characters)"
                            : "Enter password (8–12 characters)"
                        }
                        type={showPassword ? "text" : "password"}
                        value={form.newPassword}
                        onChange={(e) => fieldChange("newPassword", e.target.value)}
                        maxLength={12}
                        autoComplete="new-password"
                        error={!!errors.newPassword}
                        helperText={errors.newPassword}
                        required
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
                          hasExistingLogin
                            ? "Confirm New Password"
                            : "Confirm Password"
                        }
                        placeholder="Re-enter password"
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) =>
                          fieldChange("confirmPassword", e.target.value)
                        }
                        maxLength={12}
                        autoComplete="new-password"
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                        required
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

                    {hasExistingLogin && isChangingPassword && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 0.5 }}>
                          <AppButton
                            variant="text"
                            size="small"
                            onClick={() => {
                              setIsChangingPassword(false);
                              setForm((prev) => ({
                                ...prev,
                                newPassword: "",
                                confirmPassword: "",
                              }));
                              setErrors((prev) => ({
                                ...prev,
                                newPassword: "",
                                confirmPassword: "",
                              }));
                            }}
                            sx={{
                              fontSize: "0.78rem",
                              color: "text.secondary",
                              textTransform: "none",
                              p: 0,
                              minWidth: "auto",
                              "&:hover": {
                                color: "error.main",
                                bgcolor: "transparent",
                                textDecoration: "underline",
                              },
                            }}
                          >
                            Cancel Password Change
                          </AppButton>
                        </Box>
                      </Grid>
                    )}
                  </>
                )}
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
              onClick={() => handleCancelRequest(() => navigate("/users"))}
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
              disabled={saving}
              onClick={handleSubmit}
              sx={{
                px: 3.5,
              }}
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Save"}
            </AppButton>
          </Stack>
        </Box>
      </Paper>
      <UnsavedChangesDialog />
    </div>
  );
}
