import React, { useEffect, useState, useMemo } from "react";
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Grid,
  Chip,
} from "@mui/material";

import { useAppToast } from "../../components/common/AppToast";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import { FilterList as FilterListIcon, Refresh as RefreshIcon, Save as SaveIcon } from "@mui/icons-material";
import { getUserRightsAsync, saveUserRightsAsync } from "../../services/userRightsService";
import { getRolesAsync } from "../../services/roleService";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const ACCESS_OPTIONS = [
  { value: 1, label: "Read Only", color: "#3b82f6", stringVal: "readOnly" },
  { value: 2, label: "Read/Write", color: "#10b981", stringVal: "readWrite" },
  { value: 3, label: "Deny", color: "#ef4444", stringVal: "deny" },
];

export default function UserRightsPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [selectedModule, setSelectedModule] = useState("All");

  // filter panel state (applied only on "Filter" click)
  const [filterRoleName, setFilterRoleName] = useState("");
  const [filterModule, setFilterModule] = useState("All");

  // rights keyed by roleName → array of right rows
  const [rights, setRights] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toast = useAppToast();

  const moduleOptions = useMemo(() => {
    const roleRights = rights[selectedRoleName] || [];
    const uniqueModules = Array.from(new Set(roleRights.map((r) => r.module).filter(Boolean)));
    return [{ label: "All Modules", value: "All" }, ...uniqueModules.map((m) => ({ label: m, value: m }))];
  }, [rights, selectedRoleName]);

  // ── Initial load: fetch roles ─────────────────────────────────────────────
  useEffect(() => {
    loadRoles();
  }, []);

  // ── Fetch rights whenever selected role changes ───────────────────────────
  useEffect(() => {
    if (selectedRoleName) fetchRightsForRole(selectedRoleName);
  }, [selectedRoleName]);

  async function loadRoles() {
    try {
      const dbRoles = await getRolesAsync();
      const list = Array.isArray(dbRoles) && dbRoles.length > 0
        ? dbRoles
        : [{ roleName: "Admin" }, { roleName: "Organizer" }, { roleName: "Member" }];
      setRoles(list);
      if (list.length > 0) {
        setSelectedRoleName(list[0].roleName);
        setFilterRoleName(list[0].roleName);
      }
    } catch {
      toast.error("Failed to load roles");
    }
  }

  async function fetchRightsForRole(roleName, forceRefresh = false) {
    // return cached if available and not forcing refresh
    if (!forceRefresh && rights[roleName]) { setLoading(false); return; }
    setLoading(true);
    try {
      const serverRights = await getUserRightsAsync(roleName);
      const rows = Array.isArray(serverRights) ? serverRights : [];
      // normalise: add a sequential ui id
      const normalised = rows.map((r, i) => {
        let typeVal = r.accessType ?? r.AccessType;
        if (!typeVal || Number(typeVal) === 0) {
          const str = r.access || r.Access || "readOnly";
          typeVal = str === "deny" ? 3 : (str === "readOnly" ? 1 : 2);
        }
        return {
          ...r,
          _uid: i + 1,
          module: r.module || r.Module || "",
          subModule: r.subModule || r.SubModule || "",
          page: r.page || r.Page || "",
          accessType: Number(typeVal),
          access: r.access || r.Access || (Number(typeVal) === 3 ? "deny" : (Number(typeVal) === 1 ? "readOnly" : "readWrite")),
          createdBy: r.createdBy || r.CreatedBy || null,
        };
      });
      setRights(prev => ({ ...prev, [roleName]: normalised }));
    } catch {
      toast.error(`Failed to load rights for ${roleName}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Handle radio change: Master row updates all sub-modules, Child row updates itself ──
  const handleAccessChange = (uid, newAccessType) => {
    if (!selectedRoleName) return;
    const numAccessType = Number(newAccessType);
    const strAccess = numAccessType === 3 ? "deny" : (numAccessType === 1 ? "readOnly" : "readWrite");

    setRights(prev => {
      const currentList = prev[selectedRoleName] || [];
      const targetRow = currentList.find(r => r._uid === uid);
      if (!targetRow) return prev;

      const targetModule = targetRow.module;
      const isMasterRow = !targetRow.subModule || targetRow.subModule.trim() === "";

      const updated = currentList.map(r => {
        if (isMasterRow && r.module === targetModule) {
          // Master row selection: cascade to all sub-modules under this parent module
          return { ...r, accessType: numAccessType, access: strAccess };
        } else if (r._uid === uid) {
          // Sub-module row selection: update individual row
          return { ...r, accessType: numAccessType, access: strAccess };
        }
        return r;
      });

      return { ...prev, [selectedRoleName]: updated };
    });
  };

  // ── Handle Save button click ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedRoleName) {
      toast.error("Please select a Role before saving");
      return;
    }

    const currentRows = rights[selectedRoleName] || [];
    if (currentRows.length === 0) {
      toast.error("No rights data available to save");
      return;
    }

    setSaving(true);
    try {
      // Build request payload: every Rights item explicitly contains `role: selectedRoleName`
      const payload = {
        roleName: selectedRoleName,
        rights: currentRows.map(r => {
          const typeVal = Number(r.accessType) || (r.access === "deny" ? 3 : (r.access === "readOnly" ? 1 : 2));
          const strVal = typeVal === 3 ? "deny" : (typeVal === 1 ? "readOnly" : "readWrite");
          return {
            role: selectedRoleName,
            featureId: r.featureID || r.featureId || 0,
            module: r.module || "",
            subModule: r.subModule || "",
            page: r.page || "",
            accessType: typeVal,
            access: strVal,
          };
        }),
      };

      await saveUserRightsAsync(payload);

      toast.success("User rights saved successfully");

      // Reload rights from server after successful save to refresh Current Access
      await fetchRightsForRole(selectedRoleName, true);
    } catch (err) {
      const msg = err.response?.data?.title || err.response?.data?.message || "Failed to save user rights";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Apply filter ───────────────────────────────────────────────────────────
  const handleApplyFilter = () => {
    setSelectedRoleName(filterRoleName);
    setSelectedModule(filterModule);
  };

  const handleClearFilter = () => {
    const defaultRole = roles.length > 0 ? roles[0].roleName : "";
    setFilterRoleName(defaultRole);
    setFilterModule("All");
    setSelectedRoleName(defaultRole);
    setSelectedModule("All");
  };

  const handleRefresh = () => {
    fetchRightsForRole(selectedRoleName, true);
  };

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const rows = rights[selectedRoleName] || [];
    return rows.filter(row => {
      if (selectedModule !== "All" && row.module.toLowerCase() !== selectedModule.toLowerCase()) return false;
      return true;
    });
  }, [rights, selectedRoleName, selectedModule]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      label: "S.No",
      key: "_uid",
      sx: { width: 60 },
      render: (row) => {
        const idx = filteredRows.findIndex(r => r._uid === row._uid);
        return (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            {idx + 1}
          </Typography>
        );
      },
    },
    {
      label: "Module",
      key: "module",
      render: (row) => {
        const idx = filteredRows.findIndex(r => r._uid === row._uid);
        const repeated = idx > 0 && filteredRows[idx - 1].module === row.module;
        return (
          <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.8rem" }}>
            {repeated ? "" : row.module}
          </Typography>
        );
      },
    },
    {
      label: "Sub Module",
      key: "subModule",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
          {row.subModule || "—"}
        </Typography>
      ),
    },
    {
      label: "Rights Accessibility",
      render: (row) => (
        <RadioGroup
          row
          value={row.accessType || (row.access === "deny" ? 3 : (row.access === "readOnly" ? 1 : 2))}
          onChange={(e) => handleAccessChange(row._uid, Number(e.target.value))}
          sx={{ gap: 2, flexWrap: "nowrap" }}
        >
          {ACCESS_OPTIONS.map(opt => (
            <FormControlLabel
              key={opt.value}
              value={opt.value}
              control={
                <Radio
                  size="small"
                  disabled={saving}
                  sx={{
                    color: "rgba(74,63,107,0.35)",
                    "&.Mui-checked": { color: opt.color },
                    p: 0.5,
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 500 }}>
                  {opt.label}
                </Typography>
              }
            />
          ))}
        </RadioGroup>
      ),
    },
    {
      label: "Current Access",
      render: (row) => {
        const typeVal = Number(row.accessType) || (row.access === "deny" ? 3 : (row.access === "readOnly" ? 1 : 2));
        const opt = ACCESS_OPTIONS.find(o => o.value === typeVal) || ACCESS_OPTIONS[1];
        return (
          <Chip
            label={opt.label}
            size="small"
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              bgcolor: `${opt.color}18`,
              color: opt.color,
              border: `1px solid ${opt.color}40`,
              height: 22,
            }}
          />
        );
      },
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
        title="User Rights"
        columns={columns}
        data={filteredRows}
        loading={loading}
        filterPanel={
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 3.5 }}>
              <AppSelect
                label="Role"
                placeholder="Select Role"
                value={filterRoleName}
                onChange={(e) => setFilterRoleName(e.target.value)}
                options={roles.map(r => ({ label: r.roleName, value: r.roleName }))}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <AppSelect
                label="Module"
                placeholder="Select Module"
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                options={moduleOptions}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mt: { xs: 0, md: 2.2 } }}>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={handleApplyFilter}
                sx={{ height: 34, fontWeight: 700, fontSize: "0.75rem", px: 2 }}
              >
                Filter
              </AppButton>
              <AppButton
                variant="contained"
                size="small"
                color="success"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                loading={saving}
                disabled={saving || loading}
                sx={{
                  height: 34, fontWeight: 700, fontSize: "0.75rem", px: 2,
                  bgcolor: "#10b981",
                  "&:hover": { bgcolor: "#059669" },
                }}
              >
                Save
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{
                  height: 34, fontWeight: 700, fontSize: "0.75rem", px: 2,
                  color: "#6366f1", borderColor: "rgba(99,102,241,0.4)",
                  "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99,102,241,0.05)" },
                }}
              >
                Refresh
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                onClick={handleClearFilter}
                sx={{
                  height: 34, fontWeight: 700, fontSize: "0.75rem", px: 2,
                  color: "#ef4444", borderColor: "rgba(239,68,68,0.4)",
                  "&:hover": { borderColor: "#ef4444", bgcolor: "rgba(239,68,68,0.05)" },
                }}
              >
                Clear
              </AppButton>
            </Grid>
          </Grid>
        }
      />
    </div>
  );
}
