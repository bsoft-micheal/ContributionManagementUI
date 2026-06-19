import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import dayjs from "dayjs";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import { GetMembers, CreateMember, UpdateMember, DeleteMember } from "../../services/memberService";
import { GetRoles } from "../../services/roleService";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import MemberDetailsDialog from "../../components/members/MemberDetailsDialog";
import { validateForm } from "../../utils/validation";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  roleId: "",
  gender: "",
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
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const toast = useAppToast();

  const [filterRoleId, setFilterRoleId] = useState("");
  const [appliedRoleId, setAppliedRoleId] = useState("");

  const filteredMembers = useMemo(() => {
    if (!appliedRoleId) return members;
    return members.filter((m) => m.roleId === appliedRoleId);
  }, [members, appliedRoleId]);

  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [members, roles] = await Promise.all([
      GetMembers(),
      GetRoles(),
    ]);
    setMembers(members);
    setRoles(roles);
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
      dateOfBirth: { required: true, label: filed },
      joiningDate: { required: true, label: filed },
    };
    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      if (form.memberId) {
        await UpdateMember(form.memberId, form);
        toast.success("Saved successfully");
      } else {
        await CreateMember(form);
        toast.success("Saved successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Failed to save");
    }
  }

  function handleDeleteRequest(id) {
    setMemberToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (memberToDelete) {
      try {
        await DeleteMember(memberToDelete);
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

  const roleOptions = roles.map((r) => ({
    label: r.roleName,
    value: r.roleId,
  }));

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
    { label: "Date of Birth", key: "dateOfBirth", render: (row) => row.dateOfBirth ? dayjs(row.dateOfBirth).format("DD/MM/YYYY") : "--" },
    {
      label: "Status",
      render: () => (
        <Typography variant="caption" fontWeight={800}
          sx={{ color: "#16a34a", bgcolor: "rgba(22,163,74,0.08)", px: 1.2, py: 0.3, borderRadius: "3px", fontSize: "0.7rem", letterSpacing: "0.04em" }}
        >Verified</Typography>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Manage Members Details"
        columns={columns}
        data={filteredMembers}
        loading={loading}
        actions={
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
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 200 }}>
                <AppSelect
                  label="Select Role"
                  value={filterRoleId}
                  onChange={(e) => setFilterRoleId(e.target.value)}
                  options={[...roleOptions]}
                  size="small"
                  placeholder="Select Role"
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                onClick={() => {
                  setAppliedRoleId(filterRoleId);

                }}
                sx={{
                  bgcolor: "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: "#3b325c !important" }
                }}
              >
                Filter
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilterRoleId("");
                  setAppliedRoleId("");
                  toast.success("Filter cleared");
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
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
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>Save</AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
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
    </div>
  );
}
