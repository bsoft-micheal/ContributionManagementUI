import React, { useEffect, useState } from "react";
import { FormControlLabel, Checkbox, Typography, Box, IconButton, Tooltip, Chip, Paper, Grid } from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon, ToggleOn as ToggleOnIcon, ToggleOff as ToggleOffIcon, Calculate as CalculateIcon } from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import { getEventTypesAsync, createEventTypeAsync, updateEventTypeAsync, deleteEventTypeAsync } from "../../services/eventTypeService";
import { getUsersAsync } from "../../services/userService";
import { validateForm } from "../../utils/validation";
import { formatGridDate, formatCreatedBy } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";
import useAccessByLocation from "../../hooks/useAccessByLocation";

const defaultCriteria = [
  { years: 1, share: 50 },
  { years: 2, share: 60 },
  { years: 3, share: 70 },
  { years: 4, share: 80 }
];

const initialForm = {
  eventTypeName: "",
  isActive: true,
  hasTenureRule: false,
  criteria: defaultCriteria,
  tenureThresholdYears: 1,
  newEntrantSharePercentage: 50,
  standardSharePercentage: 100,
  ruleDescription: "",
};

const isGuid = (val) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(val || "").trim()
  );

export default function EventTypesPage() {
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [typeToToggle, setTypeToToggle] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();

  const savedFormRef = React.useRef(null);

  const isFormDirty = React.useCallback(() => {
    if (!dialogOpen || !savedFormRef.current) return false;
    const s = savedFormRef.current;

    if ((form.eventTypeName || "").trim() !== (s.eventTypeName || "").trim()) return true;
    if (Boolean(form.hasTenureRule) !== Boolean(s.hasTenureRule)) return true;
    if (Boolean(form.isActive) !== Boolean(s.isActive)) return true;
    if (JSON.stringify(form.criteria || []) !== JSON.stringify(s.criteria || [])) return true;

    return false;
  }, [dialogOpen, form]);

  const handleCloseDialog = React.useCallback(() => {
    setDialogOpen(false);
    setErrors({});
    savedFormRef.current = null;
  }, []);

  const { handleCancelRequest, UnsavedChangesDialog } = useUnsavedChanges({
    isDirty: isFormDirty,
    onQuit: handleCloseDialog,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [data, usersData] = await Promise.all([
        getEventTypesAsync(true),
        getUsersAsync().catch(() => [])
      ]);

      const userMap = {};
      let firstAdmin = null;
      if (Array.isArray(usersData)) {
        usersData.forEach((u) => {
          const id = String(u.userId || u.id || "").toLowerCase();
          const name = u.fullName || u.name || u.username;
          if (id && name) userMap[id] = name;
          if (!firstAdmin && (u.roleName?.toLowerCase() === "admin" || u.role?.toLowerCase() === "admin" || u.roleNames?.some(r => r.toLowerCase() === "admin"))) {
            firstAdmin = name;
          }
        });
      }

      const defaultAdminName = firstAdmin || authState?.user?.fullName || authState?.user?.username || "Admin";

      const resolvedTypes = (data || []).map((t) => {
        const raw = t.createdBy || t.CreatedBy;
        let createdBy = raw;
        if (!raw || isGuid(raw) || raw === "--") {
          const mapped = raw && isGuid(raw) ? userMap[String(raw).toLowerCase()] : null;
          createdBy = mapped || defaultAdminName;
        }
        return {
          ...t,
          createdBy,
        };
      });

      setTypes(resolvedTypes);
    } catch (error) {
      toast.error(error, "Failed to load event types");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const requiredLabel = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD;
    const schema = {
      eventTypeName: { required: true, type: "letteronly", min: 2, max: 50, label: requiredLabel }
    };

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    if (form.hasTenureRule) {
      if (!form.criteria || form.criteria.length === 0) {
        toast.error("Please add at least one dynamic criteria row");
        return;
      }
      for (let i = 0; i < form.criteria.length; i++) {
        const item = form.criteria[i];
        const y = Number(item.years);
        const s = Number(item.share);
        if (!y || y <= 0) {
          toast.error(`Please enter valid Years in row ${i + 1}`);
          return;
        }
        if (!s || s <= 0 || s > 100) {
          toast.error(`Share (%) must be between 1 and 100 in row ${i + 1}`);
          return;
        }
      }
    }

    const trimmedName = form.eventTypeName?.trim().toLowerCase();
    const isDuplicate = types.some(
      (t) =>
        t.eventTypeName &&
        t.eventTypeName.trim().toLowerCase() === trimmedName &&
        (!form.eventTypeId || t.eventTypeId !== form.eventTypeId)
    );
    if (isDuplicate) {
      setErrors((prev) => ({ ...prev, eventTypeName: "Category Name already exists" }));
      toast.error("A category with this name already exists");
      return;
    }

    try {
      const sortedCriteria = form.hasTenureRule
        ? [...form.criteria]
            .map(c => ({ years: Number(c.years), share: Number(c.share) }))
            .sort((a, b) => a.years - b.years)
        : [];

      const firstRow = sortedCriteria[0];
      const ruleJson = form.hasTenureRule && sortedCriteria.length > 0
        ? JSON.stringify(sortedCriteria)
        : "Equal Share";

      const payload = {
        ...form,
        hasTenureRule: Boolean(form.hasTenureRule),
        tenureThresholdYears: firstRow ? firstRow.years : 1,
        newEntrantSharePercentage: firstRow ? firstRow.share : 50,
        standardSharePercentage: 100,
        ruleDescription: ruleJson
      };

      if (form.eventTypeId) {
        await updateEventTypeAsync(form.eventTypeId, payload);
        toast.success(TOAST_MESSAGES.EVENT_TYPES.SAVED_SUCCESS);
      } else {
        await createEventTypeAsync(payload);
        toast.success(TOAST_MESSAGES.EVENT_TYPES.SAVED_SUCCESS);
      }
      setDialogOpen(false);
      savedFormRef.current = null;
      loadData();
    } catch (error) {
      toast.error(error, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleDeleteRequest(id) {
    setTypeToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (typeToDelete) {
      try {
        await deleteEventTypeAsync(typeToDelete);
        toast.success(TOAST_MESSAGES.EVENT_TYPES.DELETED_SUCCESS);
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
        setTypeToDelete(null);
      }
    }
  }

  function handleToggleStatusRequest(row) {
    setTypeToToggle(row);
    setStatusConfirmOpen(true);
  }

  async function handleConfirmStatusToggle() {
    if (!typeToToggle) return;
    try {
      const payload = {
        ...typeToToggle,
        isActive: !typeToToggle.isActive,
      };
      await updateEventTypeAsync(typeToToggle.eventTypeId, payload);
      toast.success(TOAST_MESSAGES.EVENT_TYPES.STATUS_UPDATED);
      loadData();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.EVENT_TYPES.STATUS_UPDATE_FAILED);
    } finally {
      setStatusConfirmOpen(false);
      setTypeToToggle(null);
    }
  }

  const handleOpenAddDialog = () => {
    const addFormData = {
      ...initialForm,
      criteria: [
        { years: 1, share: 50 },
        { years: 2, share: 60 },
        { years: 3, share: 70 },
        { years: 4, share: 80 }
      ]
    };
    setForm(addFormData);
    savedFormRef.current = addFormData;
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (row) => {
    let parsedCriteria = [];
    if (row.ruleDescription) {
      try {
        const parsed = JSON.parse(row.ruleDescription);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedCriteria = parsed.map((p) => ({
            years: p.years ?? p.y ?? 1,
            share: p.share ?? p.s ?? 50
          }));
        }
      } catch {
        // Not a JSON rule description
      }
    }

    if (parsedCriteria.length === 0) {
      if (row.hasTenureRule) {
        parsedCriteria = [
          { years: row.tenureThresholdYears ?? 1, share: row.newEntrantSharePercentage ?? 50 }
        ];
      } else {
        parsedCriteria = [
          { years: 1, share: 50 },
          { years: 2, share: 60 },
          { years: 3, share: 70 },
          { years: 4, share: 80 }
        ];
      }
    }

    const editFormData = {
      ...row,
      hasTenureRule: Boolean(row.hasTenureRule),
      criteria: parsedCriteria,
      tenureThresholdYears: row.tenureThresholdYears ?? 1,
      newEntrantSharePercentage: row.newEntrantSharePercentage ?? 50,
      standardSharePercentage: row.standardSharePercentage ?? 100,
      ruleDescription: row.ruleDescription ?? "",
    };
    setForm(editFormData);
    savedFormRef.current = editFormData;
    setErrors({});
    setDialogOpen(true);
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Category" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !hasWriteAccess ? "not-allowed" : "pointer" }}>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess} onClick={() => handleOpenEditDialog(row)}>
                <EditIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? TOAST_MESSAGES.GENERAL.RECORD_IN_USE : (hasWriteAccess ? "Delete Category" : "Disabled")}>
            <span style={{ display: "inline-flex", cursor: (!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)) ? "not-allowed" : "pointer" }}>
              <IconButton size="small" sx={{ p: 0.3 }} disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)} onClick={() => handleDeleteRequest(row.eventTypeId)}>
                <DeleteIcon sx={{ fontSize: "1.1rem", color: (theme) => hasWriteAccess && !(row.isReferred || row.IsReferred) ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8") }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? (row.isActive ? "Deactivate Category" : "Activate Category") : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !hasWriteAccess ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon sx={{ fontSize: "1.25rem", color: hasWriteAccess ? "#10b981" : "#94a3b8" }} />
                ) : (
                  <ToggleOffIcon sx={{ fontSize: "1.25rem", color: hasWriteAccess ? "#ef4444" : "#94a3b8" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
    { label: "Category Name", key: "eventTypeName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventTypeName}</Typography> },
    {
      label: "Calculation Rule",
      key: "hasTenureRule",
      render: (row) => {
        if (row.hasTenureRule) {
          let summary = "";
          try {
            const parsed = JSON.parse(row.ruleDescription);
            if (Array.isArray(parsed) && parsed.length > 0) {
              summary = parsed.map((c) => `< ${c.years}y: ${c.share}%`).join(", ");
            }
          } catch {
            summary = row.ruleDescription || `< ${row.tenureThresholdYears ?? 1} yr: ${row.newEntrantSharePercentage ?? 50}%`;
          }
          return (
            <Tooltip title={summary || "Dynamic Criteria"}>
              <Chip
                size="small"
                icon={<CalculateIcon sx={{ fontSize: "0.9rem !important" }} />}
                label={summary ? `Dynamic: ${summary}` : `Dynamic Share`}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 800, fontSize: "0.7rem", px: 0.5, maxWidth: 280 }}
              />
            </Tooltip>
          );
        }
        return (
          <Chip
            size="small"
            label="Equal Share (100%)"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: "0.7rem" }}
          />
        );
      }
    },
    {
      label: COMMON_STRINGS.TABLE.STATUS_COL,
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{
            color: row.isActive ? "#16a34a" : "#64748b",
            bgcolor: row.isActive ? "rgba(22,163,74,0.08)" : "rgba(100,116,139,0.08)",
            px: 1.2, py: 0.3,
            borderRadius: "3px",
            fontSize: "0.7rem",
            letterSpacing: "0.04em"
          }}
        >
          {row.isActive ? COMMON_STRINGS.TABLE.ACTIVE : COMMON_STRINGS.TABLE.INACTIVE}
        </Typography>
      )
    },
    {
      label: COMMON_STRINGS.TABLE.CREATED_BY_COL,
      key: "createdBy",
      render: (row) => {
        const formatted = formatCreatedBy(row.createdBy || row.CreatedBy);
        return formatted !== "--" ? formatted : (row.createdBy && !isGuid(row.createdBy) ? row.createdBy : "Admin");
      },
    },
    {
      label: COMMON_STRINGS.TABLE.CREATED_ON_COL,
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Manage Event Type"
        columns={columns}
        data={types}
        loading={loading}
        actions={
          <AppButton
            size="small"
            variant="contained"
            disabled={!hasWriteAccess}
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            {COMMON_STRINGS.ACTIONS.ADD}
          </AppButton>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => handleCancelRequest(handleCloseDialog)}
        title={form.eventTypeId ? "Edit Event Type" : "Add Event Type"}
        actions={
          <>
            <AppButton
              variant="outlined"
              onClick={() => handleCancelRequest(handleCloseDialog)}
              sx={{
                borderRadius: "8px",
                px: 3,
                fontWeight: 700,
                textTransform: "none",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(74, 63, 107, 0.4)",
                color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                "&:hover": {
                  borderColor: "#4a3f6b",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74, 63, 107, 0.04)"
                }
              }}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              sx={{
                borderRadius: "8px",
                px: 3,
                fontWeight: 700,
                textTransform: "none",
                bgcolor: "#4a3f6b !important",
                "&:hover": { bgcolor: "#3b325c !important" }
              }}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <AppInput
            label="Event Type"
            placeholder="Enter event type name"
            fullWidth
            value={form.eventTypeName}
            onChange={(e) => {
              setForm(f => ({ ...f, eventTypeName: e.target.value }));
              if (errors.eventTypeName) {
                setErrors(prev => ({ ...prev, eventTypeName: "" }));
              }
            }}
            restrictType="letteronly"
            maxLength={50}
            error={!!errors.eventTypeName}
            helperText={errors.eventTypeName}
            required
          />

          {/* Enable Dynamic Calculation Checkbox */}
          <Box
            onClick={() => {
              setForm((f) => {
                const nextChecked = !f.hasTenureRule;
                return {
                  ...f,
                  hasTenureRule: nextChecked,
                  criteria: (!f.criteria || f.criteria.length === 0)
                    ? [
                        { years: 1, share: 50 },
                        { years: 2, share: 60 },
                        { years: 3, share: 70 },
                        { years: 4, share: 80 }
                      ]
                    : f.criteria
                };
              });
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              userSelect: "none",
              py: 0.2,
              mt: 0.5,
              width: "fit-content",
            }}
          >
            <Checkbox
              checked={form.hasTenureRule}
              onChange={(e) => {
                const nextChecked = e.target.checked;
                setForm((f) => ({
                  ...f,
                  hasTenureRule: nextChecked,
                  criteria: (!f.criteria || f.criteria.length === 0)
                    ? [
                        { years: 1, share: 50 },
                        { years: 2, share: 60 },
                        { years: 3, share: 70 },
                        { years: 4, share: 80 }
                      ]
                    : f.criteria
                }));
              }}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{
                p: 0.1,
                transform: "scale(0.85)",
                color: "#4a3f6b",
                "&.Mui-checked": {
                  color: "#4a3f6b",
                },
              }}
            />
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{
                color: (theme) => (theme.palette.mode === "dark" ? "#e2e8f0" : "#334155"),
                fontSize: "0.85rem",
              }}
            >
              Enable Dynamic Calculation
            </Typography>
          </Box>

          {/* Dynamic Criteria Section */}
          {form.hasTenureRule && (
            <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
                  fontSize: "0.84rem",
                }}
              >
                Dynamic Criteria <span style={{ color: "#ef4444" }}>*</span>
              </Typography>

              {/* Table Container */}
              <Box
                sx={{
                  border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#e2e8f0"}`,
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {/* Table Header */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 64px",
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#f8fafc"),
                    px: 2,
                    py: 1.2,
                    borderBottom: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                  }}
                >
                  <Typography variant="caption" fontWeight={700} sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#475569") }}>
                    Years
                  </Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#475569") }}>
                    Share (%)
                  </Typography>
                  <Typography variant="caption" fontWeight={700} align="center" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#475569") }}>
                    Action
                  </Typography>
                </Box>

                {/* Rows */}
                <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5, bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff") }}>
                  {(form.criteria || []).map((row, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 64px",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <AppInput
                        value={row.years}
                        placeholder="e.g. 1"
                        restrictType="numeric"
                        maxLength={3}
                        size="small"
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                          const updated = [...(form.criteria || [])];
                          updated[idx] = { ...updated[idx], years: val };
                          setForm((f) => ({ ...f, criteria: updated }));
                        }}
                      />
                      <AppInput
                        value={row.share}
                        placeholder="e.g. 50"
                        restrictType="numeric"
                        maxLength={3}
                        size="small"
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                          const updated = [...(form.criteria || [])];
                          updated[idx] = { ...updated[idx], share: val };
                          setForm((f) => ({ ...f, criteria: updated }));
                        }}
                      />
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if ((form.criteria || []).length <= 1) {
                              toast.error("At least one criteria row is required");
                              return;
                            }
                            const updated = (form.criteria || []).filter((_, i) => i !== idx);
                            setForm((f) => ({ ...f, criteria: updated }));
                          }}
                          sx={{
                            color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                            p: 0.6,
                            "&:hover": {
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74, 63, 107, 0.08)"),
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: "1.2rem" }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Add Row Button */}
              <Box sx={{ mt: 0.2 }}>
                <AppButton
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const currentList = form.criteria || [];
                    const maxYear = currentList.length > 0
                      ? Math.max(...currentList.map((c) => Number(c.years) || 0))
                      : 0;
                    const lastShare = currentList.length > 0
                      ? Number(currentList[currentList.length - 1].share) || 50
                      : 40;
                    const nextShare = Math.min(100, lastShare + 10);
                    setForm((f) => ({
                      ...f,
                      criteria: [...(f.criteria || []), { years: maxYear + 1, share: nextShare }],
                    }));
                  }}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2,
                    py: 0.5,
                    fontSize: "0.8rem",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#4a3f6b"),
                    color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                    "&:hover": {
                      borderColor: "#4a3f6b",
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74, 63, 107, 0.04)"),
                    },
                  }}
                >
                  Add Row
                </AppButton>
              </Box>

              {/* Helper text caption */}
              <Typography
                variant="caption"
                sx={{
                  color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#64748b"),
                  fontSize: "0.75rem",
                  mt: 0.2,
                }}
              >
                Define contribution share by years of service.
              </Typography>
            </Box>
          )}

          {form.eventTypeId && (
            <AppSwitch
              label="Active Or InActive types"
              checked={form.isActive}
              onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
            />
          )}
        </Box>
      </AppDialog>

      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      <AppConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.STATUS_CONFIRM_MSG(typeToToggle?.isActive ? "deactivate" : "activate", "category")}
      />
      <UnsavedChangesDialog />
    </div>
  );
}

