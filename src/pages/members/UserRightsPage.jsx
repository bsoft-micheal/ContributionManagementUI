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
import { useAuth } from "../../contexts/AuthContext";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const ACCESS_OPTIONS = [
  { value: 1, label: "Read Only", color: "#3b82f6", stringVal: "readOnly" },
  { value: 2, label: "Read/Write", color: "#10b981", stringVal: "readWrite" },
  { value: 3, label: "Deny", color: "#ef4444", stringVal: "deny" },
];

const CANONICAL_MODULE_ORDER = [
  "Dashboard",
  "Users",
  "Events",
  "Finance",
  "Support Ticket",
  "Tools",
  "Reports"
];

const CANONICAL_SUBMODULE_ORDER = {
  Finance: [
    "",
    "Contribution",
    "Payment Submission",
    "Payment History",
    "Calculation",
    "Expense"
  ],
  Events: [
    "",
    "Event",
    "Calendar",
    "Gallery"
  ],
  "Support Ticket": [
    "",
    "Support Ticket",
    "Types",
    "Status"
  ],
  Tools: [
    "",
    "Users",
    "Roles",
    "User Rights",
    "Event Types",
    "Budget Calculations",
    "Types",
    "Status",
    "Exit Process",
    "Settings"
  ]
};

const isProtectedAdminFeature = (r) => {
  if (!r) return false;
  const subMod = String(r.subModule || "").toLowerCase().trim();
  const page = String(r.page || "").toLowerCase().trim();
  const action = String(r.action || "").toLowerCase().trim();
  const featId = Number(r.featureID || r.featureId || r.FeatureID || r.FeatureId);
  return (
    subMod === "user rights" ||
    subMod === "roles" ||
    page === "user rights" ||
    page === "roles" ||
    page === "/user-rights" ||
    page === "/roles" ||
    action === "user rights" ||
    action === "roles" ||
    featId === 16 ||
    featId === 15 ||
    featId === 13
  );
};

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
  const { authState } = useAuth();

  const moduleOptions = useMemo(() => {
    const roleRights = rights[selectedRoleName] || [];
    const rawModules = roleRights.map((r) => r.module).filter(Boolean);
    const uniqueModules = Array.from(new Set(rawModules));
    const sortedModules = uniqueModules.sort((a, b) => {
      const idxA = CANONICAL_MODULE_ORDER.indexOf(a);
      const idxB = CANONICAL_MODULE_ORDER.indexOf(b);
      const effA = idxA >= 0 ? idxA : 999;
      const effB = idxB >= 0 ? idxB : 999;
      return effA - effB;
    });
    return [{ label: "All Modules", value: "All" }, ...sortedModules.map((m) => ({ label: m, value: m }))];
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

        let moduleVal = (r.module || r.Module || "").trim();
        let subModuleVal = (r.subModule || r.SubModule || "").trim();
        let actionVal = (r.action || r.Action || "").trim();

        // Title Case module names
        const modLower = moduleVal.toLowerCase();
        if (modLower === "user" || modLower === "users" || modLower === "members") {
          moduleVal = "Users";
        } else if (modLower === "dashbod" || modLower === "dashboard") {
          moduleVal = "Dashboard";
        } else if (modLower === "events") {
          moduleVal = "Events";
        } else if (modLower === "finance") {
          moduleVal = "Finance";
        } else if (modLower.includes("support") || modLower.includes("ticket")) {
          moduleVal = "Support Ticket";
        } else if (modLower === "tools") {
          moduleVal = "Tools";
        } else if (modLower === "reports") {
          moduleVal = "Reports";
        }

        // Frontend resilience: if action is empty but subModule contains action phrases
        if (!actionVal && subModuleVal) {
          const actionPrefixes = ["View", "Add", "Edit", "Delete", "Export", "Import", "Create", "Reply", "Close", "Reset", "Submit", "Update", "Process", "Change"];
          const isAction = actionPrefixes.some(p => subModuleVal.startsWith(p));
          if (isAction) {
            actionVal = subModuleVal;
            if (subModuleVal.includes("Member") || subModuleVal.includes("User")) subModuleVal = "Users";
            else if (subModuleVal.includes("Event Type") || subModuleVal.includes("Types")) subModuleVal = "Event Types";
            else if (subModuleVal.includes("Event")) subModuleVal = "Event";
            else if (subModuleVal.includes("Gallery") || subModuleVal.includes("Photo")) subModuleVal = "Gallery";
            else if (subModuleVal.includes("Contribution")) subModuleVal = "Contribution";
            else if (subModuleVal.includes("Payment Submission") || subModuleVal.includes("Submit Payment")) subModuleVal = "Payment Submission";
            else if (subModuleVal.includes("Payment")) subModuleVal = "Payment History";
            else if (subModuleVal.includes("Calculation")) subModuleVal = "Calculation";
            else if (subModuleVal.includes("Expense")) subModuleVal = "Expense";
            else if (subModuleVal.includes("Role")) subModuleVal = "Roles";
            else if (subModuleVal.includes("Exit")) subModuleVal = "Exit Process";
            else if (subModuleVal.includes("User Rights")) subModuleVal = "User Rights";
            else if (subModuleVal.includes("Status")) subModuleVal = "Status";
            else if (subModuleVal.includes("Setting")) subModuleVal = "Settings";
            else if (subModuleVal.includes("Ticket")) subModuleVal = "Support Ticket";
          }
        }

        // Module fallback if blank
        if (!moduleVal) {
          const checkText = `${actionVal} ${subModuleVal}`.toLowerCase();
          if (checkText.includes("member") || checkText.includes("user")) moduleVal = "Users";
          else if (checkText.includes("event") || checkText.includes("gallery") || checkText.includes("photo") || checkText.includes("calendar")) moduleVal = "Events";
          else if (checkText.includes("contribution") || checkText.includes("payment") || checkText.includes("calculation") || checkText.includes("expense")) moduleVal = "Finance";
          else if (checkText.includes("ticket") || checkText.includes("helpdesk")) moduleVal = "Support Ticket";
          else if (checkText.includes("role") || checkText.includes("setting") || checkText.includes("exit")) moduleVal = "Tools";
          else if (checkText.includes("report")) moduleVal = "Reports";
          else if (checkText.includes("dashboard")) moduleVal = "Dashboard";
        }

        const pageVal = (actionVal && actionVal.trim() !== "" ? actionVal : (r.page || r.Page || subModuleVal || moduleVal || "")).trim();

        return {
          ...r,
          featureID: r.featureID || r.FeatureID || r.featureId || 0,
          module: moduleVal,
          subModule: subModuleVal,
          action: actionVal,
          page: pageVal,
          accessType: Number(typeVal),
          access: r.access || r.Access || (Number(typeVal) === 3 ? "deny" : (Number(typeVal) === 1 ? "readOnly" : "readWrite")),
          createdBy: r.createdBy || r.CreatedBy || null,
          createdAt: r.createdAt || r.CreatedAt || r.createdOn || r.CreatedOn,
        };
      });

      // Sort rows hierarchically to match canonical navigation order
      const sorted = [...normalised].sort((a, b) => {
        const modA = a.module || "";
        const modB = b.module || "";
        const idxA = CANONICAL_MODULE_ORDER.indexOf(modA);
        const idxB = CANONICAL_MODULE_ORDER.indexOf(modB);
        const effA = idxA >= 0 ? idxA : 999;
        const effB = idxB >= 0 ? idxB : 999;
        if (effA !== effB) return effA - effB;

        const subOrder = CANONICAL_SUBMODULE_ORDER[modA] || [];
        const subA = a.subModule || "";
        const subB = b.subModule || "";
        const sIdxA = subOrder.indexOf(subA);
        const sIdxB = subOrder.indexOf(subB);
        const effSubA = sIdxA >= 0 ? sIdxA : 999;
        const effSubB = sIdxB >= 0 ? sIdxB : 999;
        if (effSubA !== effSubB) return effSubA - effSubB;

        // Sub-module header row (empty action) comes before its actions
        if (!a.action && b.action) return -1;
        if (a.action && !b.action) return 1;

        return (a.featureID || 0) - (b.featureID || 0);
      });

      const finalRows = sorted.map((r, i) => ({ ...r, _uid: i + 1 }));

      setRights(prev => ({ ...prev, [roleName]: finalRows }));
      try {
        const stored = localStorage.getItem("projectRightsConfig");
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[roleName] = finalRows;
        parsed[roleName.toLowerCase()] = finalRows;
        const activeUserRole = authState?.role || authState?.roleName || "";
        if (activeUserRole && roleName.toLowerCase() === activeUserRole.toLowerCase()) {
          parsed["current"] = finalRows;
        }
        localStorage.setItem("projectRightsConfig", JSON.stringify(parsed));
      } catch {
        // ignore cache write error
      }
    } catch {
      toast.error(`Failed to load rights for ${roleName}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Handle radio change: Master row updates all sub-modules, SubModule updates actions, Action updates itself ──
  const handleAccessChange = (uid, newAccessType) => {
    if (!selectedRoleName) return;
    const numAccessType = Number(newAccessType);
    const strAccess = numAccessType === 3 ? "deny" : (numAccessType === 1 ? "readOnly" : "readWrite");
    const isAdmin = String(selectedRoleName).trim().toLowerCase() === "admin";

    setRights(prev => {
      const currentList = prev[selectedRoleName] || [];
      const targetRow = currentList.find(r => r._uid === uid);
      if (!targetRow) return prev;

      // ── Admin Protection: block Deny on User Rights / Roles ──────────────
      if (isAdmin && numAccessType === 3 && isProtectedAdminFeature(targetRow)) {
        setTimeout(() => {
          toast.error("Access denied is not allowed for 'User Rights' or 'Roles' on Admin role.");
        }, 0);
        // Revert just this row to Read/Write
        const reverted = currentList.map(r =>
          r._uid === uid ? { ...r, accessType: 2, access: "readWrite" } : r
        );
        return { ...prev, [selectedRoleName]: reverted };
      }

      const targetModule = targetRow.module;
      const targetSubModule = targetRow.subModule;
      const isMasterRow = (!targetRow.subModule || targetRow.subModule.trim() === "") && (!targetRow.action || targetRow.action.trim() === "");
      const isSubModuleMaster = targetRow.subModule && targetRow.subModule.trim() !== "" && (!targetRow.action || targetRow.action.trim() === "");

      let blockedCount = 0;

      const updated = currentList.map(r => {
        const wouldDeny = numAccessType === 3;
        if (isMasterRow && r.module === targetModule) {
          if (isAdmin && wouldDeny && isProtectedAdminFeature(r)) {
            blockedCount++;
            return { ...r, accessType: 2, access: "readWrite" };
          }
          return { ...r, accessType: numAccessType, access: strAccess };
        } else if (isSubModuleMaster && r.module === targetModule && r.subModule === targetSubModule) {
          if (isAdmin && wouldDeny && isProtectedAdminFeature(r)) {
            blockedCount++;
            return { ...r, accessType: 2, access: "readWrite" };
          }
          return { ...r, accessType: numAccessType, access: strAccess };
        } else if (r._uid === uid) {
          if (isAdmin && wouldDeny && isProtectedAdminFeature(r)) {
            blockedCount++;
            return { ...r, accessType: 2, access: "readWrite" };
          }
          return { ...r, accessType: numAccessType, access: strAccess };
        }
        return r;
      });

      if (blockedCount > 0) {
        setTimeout(() => {
          toast.error("Access denied is not allowed for 'User Rights' or 'Roles' on Admin role.");
        }, 0);
      }

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

    // ── Admin Protection: sanitise any Deny on protected features before saving ──
    const isAdmin = String(selectedRoleName).trim().toLowerCase() === "admin";
    let adminLockoutReverted = false;
    const sanitisedRows = currentRows.map(r => {
      const typeVal = Number(r.accessType) || (r.access === "deny" ? 3 : (r.access === "readOnly" ? 1 : 2));
      if (isAdmin && typeVal === 3 && isProtectedAdminFeature(r)) {
        adminLockoutReverted = true;
        return { ...r, accessType: 2, access: "readWrite" };
      }
      return r;
    });

    if (adminLockoutReverted) {
      toast.error("Access denied is not allowed for 'User Rights' or 'Roles' on Admin role. Reverted to Read/Write.");
      setRights(prev => ({ ...prev, [selectedRoleName]: sanitisedRows }));
    }

    const rowsToSave = adminLockoutReverted ? sanitisedRows : currentRows;

    setSaving(true);
    try {
      const selectedRoleObj = roles.find(r => r.roleName === selectedRoleName);
      // Build request payload: every Rights item explicitly contains `roleId` and `role: selectedRoleName`
      const payload = {
        roleId: selectedRoleObj?.roleId || undefined,
        roleName: selectedRoleName,
        rights: rowsToSave.map(r => {
          const typeVal = Number(r.accessType) || (r.access === "deny" ? 3 : (r.access === "readOnly" ? 1 : 2));
          const strVal = typeVal === 3 ? "deny" : (typeVal === 1 ? "readOnly" : "readWrite");
          const pageVal = (r.action && r.action.trim() !== "" ? r.action : (r.page || r.subModule || r.module || "")).trim();
          const featId = Number(r.featureID || r.featureId || r.FeatureID || r.FeatureId) || 0;
          return {
            roleId: selectedRoleObj?.roleId || r.roleId || undefined,
            role: selectedRoleName,
            featureId: featId,
            featureID: featId,
            FeatureID: featId,
            module: (r.module || "").trim(),
            subModule: (r.subModule || "").trim(),
            action: (r.action || "").trim(),
            page: pageVal,
            accessType: typeVal,
            access: strVal,
          };
        }),
      };

      await saveUserRightsAsync(payload);

      try {
        const stored = localStorage.getItem("projectRightsConfig");
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[selectedRoleName] = rowsToSave;
        parsed[selectedRoleName.toLowerCase()] = rowsToSave;
        const activeUserRole = authState?.role || authState?.roleName || "";
        if (activeUserRole && selectedRoleName.toLowerCase() === activeUserRole.toLowerCase()) {
          parsed["current"] = rowsToSave;
        }
        localStorage.setItem("projectRightsConfig", JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent("rightsUpdated", { detail: { roleName: selectedRoleName } }));
      } catch {
        // ignore cache write error
      }

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

  // ── Columns: S.no, Module, Sub Module, Action, Rights Accessibility, Current Access, Created On ──
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
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.8rem" }}>
          {row.module || "—"}
        </Typography>
      ),
    },
    {
      label: "Sub Module",
      key: "subModule",
      render: (row) => {
        const val = row.subModule && row.subModule.trim() !== "" ? row.subModule : "—";
        return (
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.primary", fontWeight: 500 }}>
            {val}
          </Typography>
        );
      },
    },
    {
      label: "Action",
      key: "action",
      render: (row) => {
        const val = row.action && row.action.trim() !== "" ? row.action : "—";
        return (
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.primary" }}>
            {val}
          </Typography>
        );
      },
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
                startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
                onClick={handleSave}
                loading={saving}
                disabled={saving || loading}
                sx={{
                  height: 34,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  px: 2.2,
                  borderRadius: "8px",
                  bgcolor: "#31275d !important",
                  color: "#ffffff !important",
                  boxShadow: "0 2px 8px rgba(49, 39, 93, 0.3)",
                  "&:hover": {
                    bgcolor: "#241c46 !important",
                  },
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
