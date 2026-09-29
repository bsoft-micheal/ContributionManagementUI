import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { formatGridDate } from "../../utils/dateHelper";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import MemberDetailsDialog from "../../components/members/MemberDetailsDialog";
import { getMembersAsync } from "../../services/memberService";
import { getRolesAsync } from "../../services/roleService";
import { getWorkTypesAsync } from "../../services/workTypeService";
import { hasActionPermission } from "../../utils/rightsHelper";

export default function MembersPage() {
  const { authState } = useAuth();
  const isMemberRole = String(authState?.role || "").toLowerCase() === "member";

  // Granular Action Permissions
  const canViewMember = hasActionPermission("View Member", 25, authState?.role).canView;

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const toast = useAppToast();

  const [filterRoleId, setFilterRoleId] = useState("");
  const [appliedRoleId, setAppliedRoleId] = useState("");

  const filteredMembers = useMemo(() => {
    let list = members;
    if (isMemberRole) {
      const userEmail = String(authState?.email || "").toLowerCase().trim();
      const currentMemberId = authState?.memberId ? String(authState.memberId).toLowerCase() : null;
      list = list.filter(m => 
        (currentMemberId && String(m.memberId).toLowerCase() === currentMemberId) ||
        (userEmail && String(m.email).toLowerCase().trim() === userEmail)
      );
    } else if (appliedRoleId && appliedRoleId !== "ALL") {
      list = list.filter((m) => String(m.roleId) === String(appliedRoleId));
    }
    return list;
  }, [members, appliedRoleId, isMemberRole, authState]);

  const roleOptions = useMemo(() => {
    return (roles || []).map((r) => ({
      label: r.roleName,
      value: r.roleId,
    }));
  }, [roles]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [membersData, rolesData, workTypesData] = await Promise.all([
        getMembersAsync(),
        getRolesAsync().catch(() => []),
        getWorkTypesAsync(true).catch(() => []),
      ]);
      const normalizedMembers = (membersData || []).map((m) => {
        const workType = m.workType || m.memberType || m.type || "";
        return {
          ...m,
          workType,
        };
      });
      setMembers(normalizedMembers);
      setRoles(rolesData || []);
      setWorkTypes(Array.isArray(workTypesData) ? workTypesData : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load members data");
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      label: "Action",
      sx: { width: 70 },
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          {canViewMember && (
            <Tooltip title="View Details">
              <IconButton size="small" sx={{ p: 0.3 }} onClick={() => {
                setSelectedMember(row);
                setViewDialogOpen(true);
              }}>
                <ViewIcon sx={{ fontSize: "1.05rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      label: "Member Name",
      key: "name",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="text.primary">
          {row.name}
        </Typography>
      ),
    },
    { label: "Gender", key: "gender" },
    { label: "Email", key: "email" },
    { label: "Phone", key: "phone", render: (row) => row.phone || "--" },
    {
      label: "Role",
      key: "roleName",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74,63,107,0.08)",
            color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
            px: 1.2,
            py: 0.3,
            borderRadius: "3px",
            fontSize: "0.75rem",
          }}
        >
          {row.roleName || "--"}
        </Typography>
      ),
    },
    {
      label: "Work Type",
      key: "workType",
      render: (row) => {
        const wt = row.workType || row.memberType || row.type || "Office";
        const isWfh = wt.toUpperCase() === "WFH";
        return (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              bgcolor: isWfh ? "rgba(147, 51, 234, 0.1)" : "rgba(37, 99, 235, 0.1)",
              color: isWfh ? "#9333ea" : "#2563eb",
              border: isWfh
                ? "1px solid rgba(147, 51, 234, 0.25)"
                : "1px solid rgba(37, 99, 235, 0.25)",
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
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title={isMemberRole ? "My Profile" : "Member Directory"}
        columns={columns}
        data={filteredMembers}
        loading={loading}
        filterPanel={
          !isMemberRole ? (
            <Grid container spacing={2} alignItems="center">
              <Grid
                size={{ xs: 12, md: 8 }}
                sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
              >
                <Box sx={{ minWidth: 200 }}>
                  <AppSelect
                    label="Filter by Role"
                    placeholder="Select Role"
                    value={filterRoleId}
                    onChange={(e) => setFilterRoleId(e.target.value)}
                    options={[{ label: "All Roles", value: "" }, ...roleOptions]}
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
                    px: 2,
                    "&:hover": {
                      borderColor: "#ef4444",
                      bgcolor: "rgba(239, 68, 68, 0.05)",
                    },
                  }}
                >
                  Clear Filter
                </AppButton>
              </Grid>
            </Grid>
          ) : null
        }
      />

      <MemberDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        member={selectedMember}
      />
    </div>
  );
}
