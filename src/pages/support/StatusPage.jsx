import React, { useEffect, useState } from "react";
import { Typography, Box, IconButton, Tooltip } from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import AppInput from "../../components/common/AppInput";
import AppButton, { AppCancelButton, AppSaveButton } from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import AppMultiSelect from "../../components/common/AppMultiSelect";
import {
  getStatusesAsync,
  createStatusAsync,
  updateStatusAsync,
  deleteStatusAsync,
} from "../../services/statusService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const NORMALIZE_MODULE_NAME = {
  ticket: "Support Ticket",
  tickets: "Support Ticket",
  "support ticket": "Support Ticket",
  "support tickets": "Support Ticket",
  support: "Support Ticket",
  payment: "Payments",
  payments: "Payments",
  expense: "Expenses",
  expenses: "Expenses",
  event: "Events",
  events: "Events",
  contribution: "Contributions",
  contributions: "Contributions",
  general: "General",
};

const AVAILABLE_MODULES = [
  { label: "Expenses", value: "Expenses" },
  { label: "Contributions", value: "Contributions" },
  { label: "Payments", value: "Payments" },
  { label: "Support Ticket", value: "Support Ticket" },
  { label: "Events", value: "Events" },
];

const STATUS_MODULE_CONFIG = {
  open: ["Support Ticket"],
  "in progress": ["Support Ticket"],
  resolved: ["Support Ticket"],
  pending: ["Support Ticket", "Payments", "Expenses", "Contributions"],
  verified: ["Payments", "Contributions", "Expenses"],
  closed: ["Support Ticket", "Events"],
  paid: ["Payments", "Contributions"],
  approved: ["General"],
  rejected: ["General"],
  active: ["Events", "General"],
  inactive: ["Events", "General"],
};

function getModulesForStatus(row) {
  const cleanName = String(row?.statusName || "").trim().toLowerCase();
  const configured = STATUS_MODULE_CONFIG[cleanName] ? [...STATUS_MODULE_CONFIG[cleanName]] : [];

  if (row?.module && row.module.toLowerCase() !== "general") {
    const rawParts = row.module.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of rawParts) {
      const lower = part.toLowerCase();
      const normalized = NORMALIZE_MODULE_NAME[lower] || part;
      if (!configured.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
        configured.push(normalized);
      }
    }
  }

  if (configured.length === 0) {
    const rawMod = (row?.module || "General").trim().toLowerCase();
    configured.push(NORMALIZE_MODULE_NAME[rawMod] || row?.module || "General");
  }

  // Deduplicate case-insensitively
  const seen = new Set();
  const unique = [];
  for (const mod of configured) {
    const lower = mod.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(mod);
    }
  }

  return unique;
}

const initialStatusForm = {
  statusName: "",
  modules: [],
  isActive: true,
};

export default function StatusPage() {
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;
  const toast = useAppToast();

  // ==================== Status State ====================
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [itemToToggle, setItemToToggle] = useState(null);

  const [form, setForm] = useState(initialStatusForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  // ==================== Status Handlers ====================
  async function loadData() {
    setLoading(true);
    try {
      const statusData = await getStatusesAsync();
      const rawList = Array.isArray(statusData) ? statusData : [];
      const enriched = rawList.map((item) => ({
        ...item,
        modulesText: getModulesForStatus(item).join(", "),
      }));
      setItems(enriched);
    } catch (error) {
      toast.error(error, "Failed to load statuses");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD || "This field is required";
    const schema = {
      statusName: { required: true, min: 2, max: 100, label: fieldRequired },
    };

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    const trimmedName = form.statusName.trim().toLowerCase();
    const isDuplicate = items.some(
      (item) =>
        item.statusName &&
        item.statusName.trim().toLowerCase() === trimmedName &&
        (!form.statusId || item.statusId !== form.statusId)
    );
    if (isDuplicate) {
      setErrors((prev) => ({ ...prev, statusName: "Status name already exists" }));
      toast.error("Status already exists");
      return;
    }

    try {
      const moduleStr =
        Array.isArray(form.modules) && form.modules.length > 0
          ? form.modules.join(", ")
          : "General";

      const payload = {
        statusName: form.statusName.trim(),
        module: moduleStr,
        isActive: form.isActive !== undefined ? form.isActive : true,
      };

      if (form.statusId) {
        await updateStatusAsync(form.statusId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await createStatusAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleDeleteRequest(id) {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (itemToDelete) {
      try {
        await deleteStatusAsync(itemToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadData();
      } catch (error) {
        const rawMsg = error.response?.data?.message || error.response?.data?.title || error.message || "";
        if (/in use|referenced|associated|assigned|constraint|foreign key|cannot delete/i.test(rawMsg)) {
          toast.error(TOAST_MESSAGES.GENERAL.RECORD_IN_USE);
        } else {
          toast.error(TOAST_MESSAGES.GENERAL.DELETE_FAILED);
        }
      } finally {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
      }
    }
  }

  function handleToggleStatusRequest(row) {
    setItemToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!itemToToggle) return;
    try {
      const payload = {
        statusName: itemToToggle.statusName,
        isActive: !itemToToggle.isActive,
      };
      await updateStatusAsync(itemToToggle.statusId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadData();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setStatusConfirmOpen(false);
      setItemToToggle(null);
    }
  }

  // ==================== Status Columns ====================
  const statusColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Status" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !hasWriteAccess ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setForm({
                    statusId: row.statusId,
                    statusName: row.statusName || "",
                    modules: getModulesForStatus(row),
                    isActive: row.isActive ?? true,
                  });
                  setErrors({});
                  setDialogOpen(true);
                }}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.1rem",
                    color: (theme) =>
                      hasWriteAccess
                        ? theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "#4a3f6b"
                        : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.45)"
                        : "#94a3b8",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? TOAST_MESSAGES.GENERAL.RECORD_IN_USE : (hasWriteAccess ? "Delete Status" : "Disabled")}>
            <span style={{ display: "inline-flex", cursor: (!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)) ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)}
                onClick={() => handleDeleteRequest(row.statusId)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.1rem",
                    color: (theme) =>
                      hasWriteAccess && !(row.isReferred || row.IsReferred)
                        ? theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "#4a3f6b"
                        : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.45)"
                        : "#94a3b8",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              hasWriteAccess
                ? row.isActive
                  ? "Deactivate Status"
                  : "Activate Status"
                : "Disabled"
            }
          >
            <span style={{ display: "inline-flex", cursor: !hasWriteAccess ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#10b981" : "#94a3b8",
                    }}
                  />
                ) : (
                  <ToggleOffIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#ef4444" : "#94a3b8",
                    }}
                  />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    {
      label: "Status",
      key: "statusName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.statusName}
        </Typography>
      ),
    },
    {
      label: "Applicable Module(s)",
      key: "modulesText",
      exportValue: (row) => getModulesForStatus(row).join(", "),
      render: (row) => {
        const text = getModulesForStatus(row).join(", ");
        return (
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              fontWeight: 500,
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            {text || "--"}
          </Typography>
        );
      },
    },
    {
      label: "Active Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{
            color: row.isActive ? "#16a34a" : "#64748b",
            bgcolor: row.isActive ? "rgba(22,163,74,0.08)" : "rgba(100,116,139,0.08)",
            px: 1.2,
            py: 0.3,
            borderRadius: "3px",
            fontSize: "0.7rem",
            letterSpacing: "0.04em",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) =>
        formatGridDate(
          row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn
        ),
    },
  ];

  return (
    <div className="page-shell">
      {/* 1. Manage Status Table */}
      <AppDataTable
        title="Status"
        columns={statusColumns}
        data={items}
        loading={loading}
        searchPlaceholder="Search status or module..."
      />

      {/* ==================== Status Dialog ==================== */}
      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.statusId ? "Edit Status" : "Add Status"}
        actions={
          <>
            <AppCancelButton onClick={() => setDialogOpen(false)} />
            <AppSaveButton onClick={handleSubmit}>
              {form.statusId ? "Update" : "Save"}
            </AppSaveButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <AppInput
            label="Status Name"
            placeholder="Enter status name (e.g. Open, In Progress, Closed)"
            fullWidth
            value={form.statusName}
            onChange={(e) => {
              setForm((f) => ({ ...f, statusName: e.target.value }));
              if (errors.statusName) {
                setErrors((prev) => ({ ...prev, statusName: "" }));
              }
            }}
            maxLength={100}
            error={!!errors.statusName}
            helperText={errors.statusName}
            required
          />

          <AppMultiSelect
            label="Applicable Module(s)"
            placeholder="Select applicable modules"
            value={form.modules || []}
            onChange={(e) => {
              const val =
                typeof e.target.value === "string"
                  ? e.target.value.split(",")
                  : e.target.value;
              setForm((f) => ({ ...f, modules: val }));
            }}
            options={AVAILABLE_MODULES}
          />

          {form.statusId && (
            <AppSwitch
              label="Active Status"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
          )}
        </Box>
      </AppDialog>

      {/* Status Delete Confirmation */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Status Toggle Confirmation */}
      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title="Confirm"
        content={`Are you sure you want to ${
          itemToToggle?.isActive ? "deactivate" : "activate"
        } this status?`}
      />
    </div>
  );
}
