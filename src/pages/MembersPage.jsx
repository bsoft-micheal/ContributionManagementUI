import React, { useEffect, useState } from "react";
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
} from "@mui/icons-material";

import { useAppToast } from "../components/common/AppToast";
import dayjs from "dayjs";
import AppInput from "../components/common/AppInput";
import AppSelect from "../components/common/AppSelect";
import AppDateInput from "../components/common/AppDateInput";
import AppButton from "../components/common/AppButton";
import { GetMembers, CreateMember, UpdateMember, DeleteMember } from "../services/memberService";
import { GetRoles } from "../services/roleService";
import AppDataTable from "../components/common/AppDataTable";
import AppDialog from "../components/common/AppDialog";

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
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const toast = useAppToast();

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
    try {
      if (form.memberId) {
        await UpdateMember(form.memberId, form);
        toast.success("Personnel record updated successfully");
      } else {
        await CreateMember(form);
        toast.success("New personnel successfully onboarded");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Critical synchronization error encountered");
    }
  }

  async function handleDelete(id) {
    if (window.confirm("Perform archival of this personnel record?")) {
      await DeleteMember(id);
      toast.info("Record moved to historical archives");
      loadData();
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
          <Tooltip title="Edit">
            <IconButton size="small" sx={{ p: 0.3 }} onClick={() => { 
              setForm({
                ...row,
                dateOfBirth: row.dateOfBirth ? dayjs(row.dateOfBirth) : null,
                joiningDate: row.joiningDate ? dayjs(row.joiningDate) : null
              }); 
              setDialogOpen(true); 
            }}>
              <EditIcon sx={{ fontSize: "1.05rem", color: "#4a3f6b" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" sx={{ p: 0.3 }} onClick={() => handleDelete(row.memberId)}>
              <DeleteIcon sx={{ fontSize: "1.05rem", color: "#4a3f6b" }} />
            </IconButton>
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
          sx={{ bgcolor: "rgba(74,63,107,0.08)", color: "#4a3f6b", px: 1.2, py: 0.3, borderRadius: "3px", fontSize: "0.75rem" }}
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
          sx={{ color: "#16a34a", bgcolor: "rgba(22,163,74,0.08)", px: 1.2, py: 0.3, borderRadius: "3px", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
        >Verified</Typography>
      ),
    },
  ];


  return (
    <div className="page-shell">
      <AppDataTable
        title="Member Directory"
        columns={columns}
        data={members}
        loading={loading}
        actions={
          <AppButton
            variant="contained"
            size="small"
            onClick={() => {
              setForm(initialForm);
              setDialogOpen(true);
            }}
          >
            Add
          </AppButton>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect 
                label="Filter by Role" 
                placeholder="All Roles"
                options={[{ label: "All Roles", value: "" }, ...roleOptions]} 
                size="small" 
                fullWidth 
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 0 }}>
                    Personnel Count
                  </Typography>
                  <Typography variant="h6" fontWeight={900} color="primary.main" sx={{ lineHeight: 1 }}>
                    {members.length} <span style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.6 }}>ACTIVE</span>
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.memberId ? "Update Personnel Record" : "New Personnel Enrollment"}
        actions={
          <>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}>Process Record</AppButton>
          </>
        }
      >
        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            <AppInput label="Full Operational Name" placeholder="e.g. John Doe" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput label="Enterprise Email" placeholder="john.doe@company.com" type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput label="Secure Contact" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect label="Strategic Role" placeholder="Select role..." value={form.roleId} onChange={(e) => setForm((c) => ({ ...c, roleId: e.target.value }))} options={roleOptions} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect label="Gender Identity" placeholder="Select gender..." value={form.gender} onChange={(e) => setForm((c) => ({ ...c, gender: e.target.value }))} options={genderOptions} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput label="Credentialized DOB" value={form.dateOfBirth} onChange={(v) => setForm((c) => ({ ...c, dateOfBirth: v }))} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput label="Official Joining Date" value={form.joiningDate} onChange={(v) => setForm((c) => ({ ...c, joiningDate: v }))} />
          </Grid>
        </Grid>
      </AppDialog>
    </div>
  );
}
