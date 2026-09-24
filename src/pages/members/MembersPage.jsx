import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
  Description as ExcelIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatGridDate } from "../../utils/dateHelper";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import { GetMembersAsync, CreateMemberAsync, UpdateMemberAsync, DeleteMemberAsync, CreateMembersBulkAsync } from "../../services/memberService";
import { GetRolesAsync } from "../../services/roleService";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import MemberDetailsDialog from "../../components/members/MemberDetailsDialog";
import ExcelImportDialog from "../../components/common/ExcelImportDialog";
import { validateForm } from "../../utils/validation";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  roleId: "",
  gender: "",
  type: "Office",
  dateOfBirth: dayjs().subtract(18, "year"),
  joiningDate: dayjs(),
};

export default function MembersPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Members", authState?.role);
  const hasWriteAccess = rights.write;

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const toast = useAppToast();

  const [filterRoleId, setFilterRoleId] = useState("ALL");
  const [appliedRoleId, setAppliedRoleId] = useState("ALL");

  const filteredMembers = useMemo(() => {
    if (!appliedRoleId || appliedRoleId === "ALL") return members;
    return members.filter((m) => String(m.roleId) === String(appliedRoleId));
  }, [members, appliedRoleId]);

  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
  ];

  const typeOptions = [
    { label: "Office", value: "Office" },
    { label: "WFH", value: "WFH" },
  ];

  const templateValidations = useMemo(() => {
    const roleNamesList = roles.map((r) => r.roleName).join(",");
    return {
      "Gender": {
        type: "list",
        formulae: [`"Male,Female,Other"`],
        error: "Please select a gender from the list."
      },
      "Type": {
        type: "list",
        formulae: [`"Office,WFH"`],
        error: "Please select a type from the list."
      },
      "Role": {
        type: "list",
        formulae: [`"${roleNamesList || "Admin,Manager,User,Member"}"`],
        error: "Please select a role from the list."
      },
      "Date of Birth": {
        type: "date",
        operator: "lessThan",
        formulae: [new Date()],
        error: "Please enter a valid date of birth."
      },
      "Joining Date": {
        type: "date",
        operator: "lessThanOrEqual",
        formulae: [new Date()],
        error: "Please enter a valid joining date."
      }
    };
  }, [roles]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [membersData, rolesData] = await Promise.all([
      GetMembersAsync(),
      GetRolesAsync(),
    ]);
    const localOverrides = JSON.parse(localStorage.getItem("cm_member_overrides") || "{}");
    const normalizedMembers = (membersData || []).map((m) => {
      const override = localOverrides[m.memberId] || {};
      const type = override.type || m.type || "Office";
      return {
        ...m,
        type,
      };
    });
    setMembers(normalizedMembers);
    const safeRoles = rolesData || [];
    setRoles(safeRoles);
    if (safeRoles.length > 0) {
      setFilterRoleId((prev) => {
        if (prev === "ALL") return "ALL";
        if (prev && safeRoles.some((r) => String(r.roleId) === String(prev))) return prev;
        return "ALL";
      });
      setAppliedRoleId((prev) => {
        if (prev === "ALL") return "ALL";
        if (prev && safeRoles.some((r) => String(r.roleId) === String(prev))) return prev;
        return "ALL";
      });
    }
    setLoading(false);
  }

  async function handleSubmit() {
    const filed = "This field is required"
    const schema = {
      name: { required: true, type: "letteronly", min: 2, max: 100, label: filed },
      email: { required: true, email: true, label: filed },
      phone: { required: true, type: "numberonly", min: 10, max: 10, label: filed },
      roleId: { required: true, label: filed },
      gender: { required: true, label: filed },
      type: { required: true, label: filed },
      dateOfBirth: { required: true, label: filed },
      joiningDate: { required: true, label: filed },
    };
    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    // Check uniqueness for email and phone
    const emailLower = form.email.trim().toLowerCase();
    const phoneClean = form.phone.trim();
    if (!form.memberId) {
      if (members.some((m) => m.email && m.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered with another member");
        return;
      }
      if (members.some((m) => m.phone && String(m.phone).trim() === phoneClean)) {
        setErrors((prev) => ({ ...prev, phone: "This phone number is already registered" }));
        toast.error("This phone number is already registered with another member");
        return;
      }
    } else {
      if (members.some((m) => m.memberId !== form.memberId && m.email && m.email.trim().toLowerCase() === emailLower)) {
        setErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        toast.error("This email is already registered with another member");
        return;
      }
      if (members.some((m) => m.memberId !== form.memberId && m.phone && String(m.phone).trim() === phoneClean)) {
        setErrors((prev) => ({ ...prev, phone: "This phone number is already registered" }));
        toast.error("This phone number is already registered with another member");
        return;
      }
    }

    try {
      let res;
      if (form.memberId) {
        res = await UpdateMemberAsync(form.memberId, form);
        toast.success("Saved successfully");
      } else {
        res = await CreateMemberAsync(form);
        toast.success("Saved successfully");
      }

      const savedId = form.memberId || res?.memberId || res?.data?.memberId;
      if (savedId) {
        const localOverrides = JSON.parse(localStorage.getItem("cm_member_overrides") || "{}");
        localOverrides[savedId] = {
          type: form.type || "Office",
        };
        localStorage.setItem("cm_member_overrides", JSON.stringify(localOverrides));
      }

      setDialogOpen(false);
      loadData();
    } catch (error) {
      const rawMsg = error.response?.data?.message || (typeof error.response?.data === "string" ? error.response?.data : "") || error.message || "";
      if (rawMsg.toLowerCase().includes("inner exception") || rawMsg.toLowerCase().includes("unique") || rawMsg.toLowerCase().includes("duplicate")) {
        toast.error("A member with this email or phone number already exists.");
      } else {
        toast.error("Failed to save");
      }
    }
  }

  function handleDeleteRequest(id) {
    setMemberToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (memberToDelete) {
      try {
        await DeleteMemberAsync(memberToDelete);
        toast.success("Deleted successfully");
        loadData();
      } catch (error) {
        toast.error("Failed to delete");
      } finally {
        setDeleteConfirmOpen(false);
        setMemberToDelete(null);
      }
    }
  }

  const validateRow = (row, rowNum, allRows) => {
    const name = row["name"] !== undefined && row["name"] !== null ? String(row["name"]).trim() : "";
    const email = row["email"] !== undefined && row["email"] !== null ? String(row["email"]).trim() : "";
    const phone = row["phone"] !== undefined && row["phone"] !== null ? String(row["phone"]).trim() : "";
    const gender = row["gender"] !== undefined && row["gender"] !== null ? String(row["gender"]).trim() : "";
    const roleName = row["role"] !== undefined && row["role"] !== null ? String(row["role"]).trim() : "";
    const rawType = row["type"] !== undefined && row["type"] !== null ? String(row["type"]).trim() : "";
    const dobStr = row["date of birth"] !== undefined && row["date of birth"] !== null ? row["date of birth"] : (row["dob"] || "");
    const joiningStr = row["joining date"] !== undefined && row["joining date"] !== null ? row["joining date"] : (row["joiningdate"] || "");

    if (!name) return { error: `Row ${rowNum}: Name is required` };
    if (!/^[a-zA-Z\s]+$/.test(name)) return { error: `Row ${rowNum}: Name must contain only letters` };

    if (!email) return { error: `Row ${rowNum}: Email is required` };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: `Row ${rowNum}: Invalid email format` };

    // 1. Check if email already exists in system database
    const emailLower = email.toLowerCase();
    const existingMemberWithEmail = members.find(
      (m) => m.email && m.email.trim().toLowerCase() === emailLower
    );
    if (existingMemberWithEmail) {
      return { error: `Row ${rowNum}: Email '${email}' already exists in system` };
    }

    // 2. Check if email is duplicated within the Excel spreadsheet itself
    if (allRows && Array.isArray(allRows)) {
      const firstEmailIndex = allRows.findIndex((r) => {
        const rEmail = r["email"] !== undefined && r["email"] !== null ? String(r["email"]).trim().toLowerCase() : "";
        return rEmail === emailLower;
      });
      if (firstEmailIndex !== -1 && firstEmailIndex < (rowNum - 2)) {
        return { error: `Row ${rowNum}: Duplicate email '${email}' in Excel (Row ${firstEmailIndex + 2})` };
      }
    }

    if (!phone) return { error: `Row ${rowNum}: Phone number is required` };
    if (!/^\d{10}$/.test(phone)) return { error: `Row ${rowNum}: Phone number must be exactly 10 digits` };

    // 3. Check if phone already exists in system database
    const cleanPhone = phone.trim();
    const existingMemberWithPhone = members.find(
      (m) => m.phone && String(m.phone).trim() === cleanPhone
    );
    if (existingMemberWithPhone) {
      return { error: `Row ${rowNum}: Phone '${phone}' already exists in system` };
    }

    // 4. Check if phone is duplicated within the Excel spreadsheet itself
    if (allRows && Array.isArray(allRows)) {
      const firstPhoneIndex = allRows.findIndex((r) => {
        const rPhone = r["phone"] !== undefined && r["phone"] !== null ? String(r["phone"]).trim() : "";
        return rPhone === cleanPhone;
      });
      if (firstPhoneIndex !== -1 && firstPhoneIndex < (rowNum - 2)) {
        return { error: `Row ${rowNum}: Duplicate phone '${phone}' in Excel (Row ${firstPhoneIndex + 2})` };
      }
    }

    // Match gender
    const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
    if (!["Male", "Female", "Other"].includes(normalizedGender)) {
      return { error: `Row ${rowNum}: Gender must be Male, Female, or Other` };
    }

    // Match role
    const matchedRole = roles.find(r => r.roleName.toLowerCase() === roleName.toLowerCase());
    if (!matchedRole) {
      return { error: `Row ${rowNum}: Role '${roleName}' not found in system` };
    }

    // Match Type
    let normalizedType = "Office";
    if (rawType) {
      const upperType = rawType.toUpperCase();
      if (upperType === "WFH") {
        normalizedType = "WFH";
      } else if (upperType === "OFFICE") {
        normalizedType = "Office";
      } else {
        return { error: `Row ${rowNum}: Type must be Office or WFH` };
      }
    }

    // Helper to parse dates from Excel (supporting Date objects, serial numbers, and string values)
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

    // Match dates
    const dob = parseExcelDate(dobStr);
    if (!dob || !dob.isValid()) return { error: `Row ${rowNum}: Date of Birth must be a valid date (DD/MM/YYYY)` };
    if (dayjs().diff(dob, "year") < 18) return { error: `Row ${rowNum}: Member must be at least 18 years old` };

    const joiningDate = parseExcelDate(joiningStr);
    if (!joiningDate || !joiningDate.isValid()) return { error: `Row ${rowNum}: Joining Date must be a valid date (DD/MM/YYYY)` };

    return {
      error: null,
      parsed: {
        name,
        email,
        phone,
        gender: normalizedGender,
        type: normalizedType,
        roleId: matchedRole.roleId,
        dateOfBirth: dob.toISOString(),
        joiningDate: joiningDate.toISOString(),
      }
    };
  };

  const handleBulkImport = async (validData) => {
    if (!validData || validData.length === 0) return;
    setLoading(true);
    try {
      await CreateMembersBulkAsync(validData);
      toast.success(`Successfully imported all ${validData.length} member(s)!`);
      loadData();
    } catch (err) {
      const rawMsg = err.response?.data?.message || (typeof err.response?.data === "string" ? err.response?.data : "") || err.message || "";
      if (rawMsg.toLowerCase().includes("inner exception") || rawMsg.toLowerCase().includes("unique") || rawMsg.toLowerCase().includes("duplicate")) {
        toast.error("One or more records contain an email or phone that already exists in the database.");
      } else {
        toast.error(rawMsg || "Failed to import members");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { label: "All", value: "ALL" },
    ...roles.map((r) => ({
      label: r.roleName,
      value: r.roleId,
    })),
  ];

  const columns = [
    {
      label: "Action",
      sx: { width: 90 },
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title="View Details">
            <IconButton size="small" sx={{ p: 0.3 }} onClick={() => {
              setSelectedMember(row);
              setViewDialogOpen(true);
            }}>
              <ViewIcon sx={{ fontSize: "1.05rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Edit" : ""}>
            <span>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => {
                setForm({
                  ...row,
                  type: row.type || "Office",
                  dateOfBirth: row.dateOfBirth ? dayjs(row.dateOfBirth) : null,
                  joiningDate: row.joiningDate ? dayjs(row.joiningDate) : null
                });
                setErrors({});
                setDialogOpen(true);
              }}>
                <EditIcon sx={{ fontSize: "1.05rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#cbd5e1") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete" : ""}>
            <span>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => handleDeleteRequest(row.memberId)}>
                <DeleteIcon sx={{ fontSize: "1.05rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#cbd5e1") }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    { label: "Member Name", key: "name", render: (row) => <Typography variant="body2" fontWeight={700}>{row.name}</Typography> },
    { label: "Gender", key: "gender" },
    { label: "Email", key: "email" },
    {
      label: "Role",
      key: "roleName",
      render: (row) => (
        <Typography variant="caption" fontWeight={700}
          sx={{
            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74,63,107,0.08)",
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
            px: 1.2, py: 0.3,
            borderRadius: "3px",
            fontSize: "0.75rem"
          }}
        >
          {row.roleName}
        </Typography>
      ),
    },
    {
      label: "Type",
      key: "type",
      render: (row) => {
        const isWfh = (row.type || "").toUpperCase() === "WFH";
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
              display: "inline-block"
            }}
          >
            {row.type || "Office"}
          </Typography>
        );
      },
    },
    { label: "Date of Birth", key: "dateOfBirth", render: (row) => formatGridDate(row.dateOfBirth) },
    { label: "Joining Date", key: "joiningDate", render: (row) => formatGridDate(row.joiningDate) },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--"
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Members Details"
        columns={columns}
        data={filteredMembers}
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
              onClick={() => {
                setForm(initialForm);
                setErrors({});
                setDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          </Stack>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 200 }}>
                <AppSelect
                  label="Role"
                  value={filterRoleId}
                  onChange={(e) => setFilterRoleId(e.target.value)}
                  options={roleOptions}
                  size="small"
                  required
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setAppliedRoleId(filterRoleId);
                  toast.success("Filter applied");
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
              <AppButton
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilterRoleId("ALL");
                  setAppliedRoleId("ALL");
                  toast.success("Filter reset to All");
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)"
                  }
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
          </Grid>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.memberId ? "Edit Member" : "Add Member"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>Save</AppButton>
          </>
        }
      >
        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            <AppInput label="Name" placeholder="Enter name" value={form.name}
              onChange={(e) => {
                setForm((c) => ({ ...c, name: e.target.value }));
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              restrictType="letteronly"
              maxLength={100}
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput label="Email" placeholder="Enter email" value={form.email}
              onChange={(e) => {
                setForm((c) => ({ ...c, email: e.target.value }));
                if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
              }}
              maxLength={100}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput label="Phone Number" placeholder="Enter phone number" value={form.phone}
              onChange={(e) => {
                setForm((c) => ({ ...c, phone: e.target.value }));
                if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
              }}
              restrictType="numberonly"
              maxLength={10}
              error={!!errors.phone}
              helperText={errors.phone}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect label="Role" placeholder="select role..." value={form.roleId}
              onChange={(e) => {
                setForm((c) => ({ ...c, roleId: e.target.value }));
                if (errors.roleId) setErrors(prev => ({ ...prev, roleId: "" }));
              }}
              options={roleOptions}
              error={!!errors.roleId}
              helperText={errors.roleId}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect label="Gender" placeholder="Select gender..." value={form.gender}
              onChange={(e) => {
                setForm((c) => ({ ...c, gender: e.target.value }));
                if (errors.gender) setErrors(prev => ({ ...prev, gender: "" }));
              }}
              options={genderOptions}
              error={!!errors.gender}
              helperText={errors.gender}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput label="Date of Birth" value={form.dateOfBirth}
              onChange={(newValue) => {
                setForm((c) => ({ ...c, dateOfBirth: newValue }));
                if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: "" }));
              }}
              error={!!errors.dateOfBirth}
              helperText={errors.dateOfBirth}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput label="Joining Date" value={form.joiningDate}
              onChange={(newValue) => {
                setForm((c) => ({ ...c, joiningDate: newValue }));
                if (errors.joiningDate) setErrors(prev => ({ ...prev, joiningDate: "" }));
              }}
              error={!!errors.joiningDate}
              helperText={errors.joiningDate}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="Type"
              placeholder="Select type..."
              value={form.type || "Office"}
              onChange={(e) => {
                setForm((c) => ({ ...c, type: e.target.value }));
                if (errors.type) setErrors(prev => ({ ...prev, type: "" }));
              }}
              options={typeOptions}
              error={!!errors.type}
              helperText={errors.type}
              required
            />
          </Grid>
        </Grid>
      </AppDialog>

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm"
        content="Are you sure you want to delete this record?"
      />

      <MemberDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        member={selectedMember}
      />

      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleBulkImport}
        title="Import Members"
        templateHeaders={["Name", "Email", "Phone", "Role", "Gender", "Type", "Date of Birth", "Joining Date"]}
        templateValidations={templateValidations}
        validateRow={validateRow}
      />
    </div>
  );
}
