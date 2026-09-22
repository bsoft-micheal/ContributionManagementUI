import React, { useEffect, useState, useMemo } from "react";
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Grid
} from "@mui/material";

import { useAppToast } from "../../components/common/AppToast";
import AppSelect from "../../components/common/AppSelect";
import AppDataTable from "../../components/common/AppDataTable";
import { GetUserRightsAsync, SaveUserRightsAsync } from "../../services/userRightsService";
import { GetRolesAsync } from "../../services/roleService";

const defaultRows = [
  // Dashboard Module
  { id: 1, module: "Dashboard", subModule: "Analytics", page: "Dashboard", access: "readWrite" },

  // Members Module
  { id: 2, module: "Members", subModule: "Directory", page: "Members", access: "readWrite" },

  // Events Module
  { id: 3, module: "Events", subModule: "Registry", page: "Events", access: "readWrite" },
  { id: 4, module: "Events", subModule: "Calendar", page: "Calendar", access: "readWrite" },
  { id: 16, module: "Events", subModule: "Media", page: "Gallery", access: "readWrite" },

  // Contributions Module
  { id: 5, module: "Contributions", subModule: "Ledger", page: "Contributions", access: "readWrite" },
  { id: 6, module: "Contributions", subModule: "Calculation", page: "Calculation", access: "readWrite" },
  { id: 17, module: "Contributions", subModule: "Expenses", page: "Expense", access: "readWrite" },
  { id: 18, module: "Contributions", subModule: "Payments", page: "Payments", access: "readWrite" },

  // Support Data Module
  { id: 7, module: "Support Data", subModule: "Categories", page: "Event Types", access: "readWrite" },
  { id: 8, module: "Support Data", subModule: "Clearance", page: "Exit Process", access: "readWrite" },
  { id: 9, module: "Support Data", subModule: "Admin", page: "User Rights", access: "readWrite" },
  { id: 11, module: "Support Data", subModule: "Admin", page: "Users", access: "readWrite" },
  { id: 15, module: "Support Data", subModule: "Admin", page: "Roles", access: "readWrite" },
  { id: 19, module: "Support Data", subModule: "Helpdesk", page: "Support Tickets", access: "readWrite" },
  { id: 20, module: "Support Data", subModule: "Configuration", page: "Settings", access: "readWrite" },

  // Reports Module
  { id: 10, module: "Reports", subModule: "Analytics", page: "Event Audit", access: "readWrite" },
  { id: 12, module: "Reports", subModule: "Analytics", page: "Member Velocity", access: "readWrite" },
  { id: 13, module: "Reports", subModule: "Analytics", page: "Pending Dues", access: "readWrite" },
  { id: 14, module: "Reports", subModule: "Analytics", page: "Member Category Paid", access: "readWrite" }
];

export default function UserRightsPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [selectedSubModule, setSelectedSubModule] = useState("Dashboard");
  const [rights, setRights] = useState({});
  const [loading, setLoading] = useState(true);

  const toast = useAppToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoleName) {
      fetchRightsForRole(selectedRoleName);
    }
  }, [selectedRoleName]);

  async function loadData() {
    try {
      const dbRoles = await GetRolesAsync();
      if (Array.isArray(dbRoles) && dbRoles.length > 0) {
        setRoles(dbRoles);
        setSelectedRoleName(dbRoles[0].roleName);
      } else {
        const fallback = [
          { roleName: "Admin" },
          { roleName: "Manager" },
          { roleName: "User" },
          { roleName: "Member" },
        ];
        setRoles(fallback);
        setSelectedRoleName(fallback[0].roleName);
      }
    } catch (err) {
      console.warn("Could not load roles from database:", err);
    }
  }

  async function fetchRightsForRole(roleName) {
    setLoading(true);
    try {
      const serverRights = await GetUserRightsAsync(roleName);
      // Align with defaultRows to handle any schema discrepancies
      const alignedRights = defaultRows.map(defRow => {
        let match = serverRights.find(r => r.page === defRow.page);

        // Fallback for transition from single 'Reports' to split reports
        if (!match && defRow.module === "Reports") {
          match = serverRights.find(r => r.page === "Reports");
        }

        if (!match) {
          match = serverRights.find(
            r => r.subModule === defRow.subModule && r.module === defRow.module
          );
        }

        return {
          ...defRow,
          access: match ? match.access : defRow.access
        };
      });
      setRights(prev => ({ ...prev, [roleName]: alignedRights }));
    } catch {
      toast.error("Failed to load ");
    } finally {
      setLoading(false);
    }
  }

  // Update inline radio accessibility state instantly
  const handleAccessChange = async (rowId, newAccess) => {
    if (!selectedRoleName) return;

    const updatedRights = { ...rights };
    const roleRows = updatedRights[selectedRoleName];

    if (roleRows) {
      const targetRow = roleRows.find(r => r.id === rowId);
      if (targetRow) {
        targetRow.access = newAccess;
        setRights(updatedRights);

        try {
          const payload = {
            roleName: selectedRoleName,
            rights: roleRows.map(r => ({
              module: r.module,
              subModule: r.subModule,
              page: r.page,
              access: r.access
            }))
          };
          await SaveUserRightsAsync(payload);

          // Update local storage so path authorization helper takes effect instantly
          const savedRights = localStorage.getItem("projectRightsConfig");
          let rightsMap = savedRights ? JSON.parse(savedRights) : {};
          rightsMap[selectedRoleName] = roleRows;
          localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));

          const activeRole = roles.find(r => r.roleName === selectedRoleName);
          const resourceName = targetRow.subModule || targetRow.page || targetRow.module;

          let accessLabel = "Read Only";
          if (newAccess === "readWrite") accessLabel = "Read/Write";
          if (newAccess === "deny") accessLabel = "Deny";

          toast.success("Saved successfully");
        } catch {
          toast.error("Failed to save");
        }
      }
    }
  };

  // Filter rows by Selected Sub Module
  const filteredRows = useMemo(() => {
    const currentRows = rights[selectedRoleName] || [];

    return currentRows.filter(row => {
      // If the page is "User Rights" and selectedRoleName is not Admin or Manager, hide it
      if (row.page === "User Rights" && selectedRoleName !== "Admin" && selectedRoleName !== "Manager") {
        return false;
      }
      // Sub Module filter matches selected Module or acts as "All"
      return selectedSubModule === "All" || row.module.toLowerCase() === selectedSubModule.toLowerCase();
    });
  }, [rights, selectedRoleName, selectedSubModule]);

  // AppDataTable Columns Mapping
  const columns = [
    {
      label: "S.No",
      key: "id",
      sx: { width: 60 },
      render: (row) => {
        const index = filteredRows.findIndex(r => r.id === row.id);
        return (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            {index !== -1 ? index + 1 : ""}
          </Typography>
        );
      }
    },
    {
      label: "Module",
      key: "module",
      render: (row) => {
        const index = filteredRows.findIndex(r => r.id === row.id);
        const isRepeated = index > 0 && filteredRows[index - 1].module === row.module;
        return (
          <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.8rem" }}>
            {isRepeated ? "" : row.module}
          </Typography>
        );
      }
    },
    {
      label: "Sub Module",
      key: "subModule",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
          {row.subModule || "--"}
        </Typography>
      )
    },
    {
      label: "Pages",
      key: "page",
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
          {row.page || "--"}
        </Typography>
      )
    },
    {
      label: "Rights Accessibility",
      render: (row) => (
        <RadioGroup
          row
          value={row.access}
          onChange={(e) => handleAccessChange(row.id, e.target.value)}
          sx={{ gap: 3 }}
        >
          <FormControlLabel
            value="readOnly"
            control={<Radio size="small" sx={{ color: "rgba(74,63,107,0.4)", "&.Mui-checked": { color: "#4a3f6b" } }} />}
            label={<Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 500 }}>Read Only</Typography>}
          />
          <FormControlLabel
            value="readWrite"
            control={<Radio size="small" sx={{ color: "rgba(74,63,107,0.4)", "&.Mui-checked": { color: "#4a3f6b" } }} />}
            label={<Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 500 }}>Read/Write</Typography>}
          />
          <FormControlLabel
            value="deny"
            control={<Radio size="small" sx={{ color: "rgba(74,63,107,0.4)", "&.Mui-checked": { color: "#4a3f6b" } }} />}
            label={<Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 500 }}>Deny</Typography>}
          />
        </RadioGroup>
      )
    }
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
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect
                label="Role"
                placeholder="Select Role"
                value={selectedRoleName}
                onChange={(e) => setSelectedRoleName(e.target.value)}
                options={roles.map(r => ({ label: r.roleName, value: r.roleName }))}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect
                label="Sub Module"
                placeholder="Select Sub Module"
                value={selectedSubModule}
                onChange={(e) => setSelectedSubModule(e.target.value)}
                options={[
                  { label: "Dashboard", value: "Dashboard" },
                  { label: "Members", value: "Members" },
                  { label: "Events", value: "Events" },
                  { label: "Contributions", value: "Contributions" },
                  { label: "Support Data", value: "Support Data" },
                  { label: "Reports", value: "Reports" }
                ]}
                required
                fullWidth
              />
            </Grid>
          </Grid>
        }
      />
    </div>
  );
}
