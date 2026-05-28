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
import { GetRoles } from "../../services/roleService";

const defaultRows = [
  // Dashboard Module
  { id: 1, module: "Dashboard", subModule: "Analytics", page: "Dashboard", access: "readWrite" },

  // Members Module
  { id: 2, module: "Members", subModule: "Directory", page: "Members", access: "readWrite" },

  // Events Module
  { id: 3, module: "Events", subModule: "Registry", page: "Events", access: "readWrite" },
  { id: 4, module: "Events", subModule: "Calendar", page: "Calendar", access: "readWrite" },

  // Contributions Module
  { id: 5, module: "Contributions", subModule: "Ledger", page: "Contributions", access: "readWrite" },
  { id: 6, module: "Contributions", subModule: "Calculation", page: "Calculation", access: "readWrite" },

  // Support Data Module
  { id: 7, module: "Support Data", subModule: "Categories", page: "Event Types", access: "readWrite" },
  { id: 8, module: "Support Data", subModule: "Clearance", page: "Exit Process", access: "readWrite" },
  { id: 9, module: "Support Data", subModule: "Admin", page: "User Rights", access: "readWrite" },

  // Reports Module
  { id: 10, module: "Reports", subModule: "Analytics", page: "Reports", access: "readWrite" }
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

  async function loadData() {
    setLoading(true);
    try {
      const rolesData = await GetRoles();
      setRoles(rolesData);
      
      if (rolesData.length > 0) {
        setSelectedRoleName(rolesData[0].roleName);
      }

      // Populate local storage rights and align with the current defaultRows schema
      const savedRights = localStorage.getItem("projectRightsConfig");
      let rightsMap = savedRights ? JSON.parse(savedRights) : {};
      
      rolesData.forEach(role => {
        const existingRows = rightsMap[role.roleName] || [];
        // Map current defaultRows. If a row exists by page/subModule/module name, preserve its access.
        rightsMap[role.roleName] = defaultRows.map(defRow => {
          const match = existingRows.find(
            r => r.page === defRow.page || 
                 (r.subModule === defRow.subModule && r.module === defRow.module) ||
                 r.id === defRow.id
          );
          return {
            ...defRow,
            access: match ? match.access : defRow.access
          };
        });
      });

      localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));
      setRights(rightsMap);
    } catch (error) {
      toast.error("Failed to load operational directory");
    } finally {
      setLoading(false);
    }
  }

  // Update inline radio accessibility state instantly
  const handleAccessChange = (rowId, newAccess) => {
    if (!selectedRoleName) return;

    const updatedRights = { ...rights };
    const roleRows = updatedRights[selectedRoleName];
    
    if (roleRows) {
      const targetRow = roleRows.find(r => r.id === rowId);
      if (targetRow) {
        targetRow.access = newAccess;
        setRights(updatedRights);
        localStorage.setItem("projectRightsConfig", JSON.stringify(updatedRights));

        const activeRole = roles.find(r => r.roleName === selectedRoleName);
        const resourceName = targetRow.subModule || targetRow.page || targetRow.module;
        
        let accessLabel = "Read Only";
        if (newAccess === "readWrite") accessLabel = "Read/Write";
        if (newAccess === "deny") accessLabel = "Deny";

        toast.success(`Access updated: '${resourceName}' set to '${accessLabel}' for ${activeRole?.roleName}`);
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
        title="User Rights Configuration"
        columns={columns}
        data={filteredRows}
        loading={loading}
        filterPanel={
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect
                label="Role"
                value={selectedRoleName}
                onChange={(e) => setSelectedRoleName(e.target.value)}
                options={roles.map(r => ({ label: r.roleName, value: r.roleName }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect
                label="Sub Module"
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
                fullWidth
              />
            </Grid>
          </Grid>
        }
      />
    </div>
  );
}
