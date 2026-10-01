import React, { useEffect, useState } from "react";
import { Typography, Box, IconButton, Tooltip, Stack } from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  ConfirmationNumberRounded as ConfirmationNumberRoundedIcon,
  WorkRounded as WorkRoundedIcon,
  FlagRounded as FlagRoundedIcon,
  CreditCardRounded as CreditCardRoundedIcon,
} from "@mui/icons-material";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSwitch from "../../components/common/AppSwitch";
import {
  getTicketTypesAsync,
  createTicketTypeAsync,
  updateTicketTypeAsync,
  deleteTicketTypeAsync,
} from "../../services/ticketTypeService";
import {
  getWorkTypesAsync,
  createWorkTypeAsync,
  updateWorkTypeAsync,
  deleteWorkTypeAsync,
} from "../../services/workTypeService";
import {
  getPrioritiesAsync,
  createPriorityAsync,
  updatePriorityAsync,
  deletePriorityAsync,
} from "../../services/priorityService";
import {
  getPaymentModesAsync,
  createPaymentModeAsync,
  updatePaymentModeAsync,
  deletePaymentModeAsync,
} from "../../services/paymentModeService";
import { validateForm } from "../../utils/validation";
import { formatGridDate } from "../../utils/dateHelper";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";


const initialTicketTypeForm = {
  typeName: "",
  isActive: true,
};

const initialWorkTypeForm = {
  workTypeName: "",
  isActive: true,
};

const initialPriorityForm = {
  priorityName: "",
  isActive: true,
};

const initialPaymentModeForm = {
  paymentModeName: "",
  isActive: true,
};

const COLLECTION_TABS = [
  {
    id: "ticketTypes",
    label: "Ticket Types",
    icon: <ConfirmationNumberRoundedIcon sx={{ fontSize: "1.2rem" }} />,
  },
  {
    id: "workTypes",
    label: "Work Types",
    icon: <WorkRoundedIcon sx={{ fontSize: "1.2rem" }} />,
  },
  {
    id: "priorities",
    label: "Priorities",
    icon: <FlagRoundedIcon sx={{ fontSize: "1.2rem" }} />,
  },
  {
    id: "paymentModes",
    label: "Payment Modes",
    icon: <CreditCardRoundedIcon sx={{ fontSize: "1.2rem" }} />,
  },
];

export default function TypesPage() {
  const [activeTab, setActiveTab] = useState("ticketTypes");
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const toast = useAppToast();

  // ==================== Ticket Types State ====================
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketTypesLoading, setTicketTypesLoading] = useState(true);
  const [ticketTypeDialogOpen, setTicketTypeDialogOpen] = useState(false);
  const [ticketTypeDeleteConfirmOpen, setTicketTypeDeleteConfirmOpen] = useState(false);
  const [ticketTypeToDelete, setTicketTypeToDelete] = useState(null);
  const [ticketTypeStatusConfirmOpen, setTicketTypeStatusConfirmOpen] = useState(false);
  const [ticketTypeToToggle, setTicketTypeToToggle] = useState(null);
  const [ticketTypeForm, setTicketTypeForm] = useState(initialTicketTypeForm);
  const [ticketTypeErrors, setTicketTypeErrors] = useState({});

  // ==================== Work Types State ====================
  const [workTypes, setWorkTypes] = useState([]);
  const [workTypesLoading, setWorkTypesLoading] = useState(true);
  const [workTypeDialogOpen, setWorkTypeDialogOpen] = useState(false);
  const [workTypeDeleteConfirmOpen, setWorkTypeDeleteConfirmOpen] = useState(false);
  const [workTypeToDelete, setWorkTypeToDelete] = useState(null);
  const [workTypeStatusConfirmOpen, setWorkTypeStatusConfirmOpen] = useState(false);
  const [workTypeToToggle, setWorkTypeToToggle] = useState(null);
  const [workTypeForm, setWorkTypeForm] = useState(initialWorkTypeForm);
  const [workTypeErrors, setWorkTypeErrors] = useState({});

  // ==================== Priorities State ====================
  const [priorities, setPriorities] = useState([]);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [priorityDeleteConfirmOpen, setPriorityDeleteConfirmOpen] = useState(false);
  const [priorityToDelete, setPriorityToDelete] = useState(null);
  const [priorityStatusConfirmOpen, setPriorityStatusConfirmOpen] = useState(false);
  const [priorityToToggle, setPriorityToToggle] = useState(null);
  const [priorityForm, setPriorityForm] = useState(initialPriorityForm);
  const [priorityErrors, setPriorityErrors] = useState({});

  // ==================== Payment Modes State ====================
  const [paymentModes, setPaymentModes] = useState([]);
  const [paymentModesLoading, setPaymentModesLoading] = useState(true);
  const [paymentModeDialogOpen, setPaymentModeDialogOpen] = useState(false);
  const [paymentModeDeleteConfirmOpen, setPaymentModeDeleteConfirmOpen] = useState(false);
  const [paymentModeToDelete, setPaymentModeToDelete] = useState(null);
  const [paymentModeStatusConfirmOpen, setPaymentModeStatusConfirmOpen] = useState(false);
  const [paymentModeToToggle, setPaymentModeToToggle] = useState(null);
  const [paymentModeForm, setPaymentModeForm] = useState(initialPaymentModeForm);
  const [paymentModeErrors, setPaymentModeErrors] = useState({});

  useEffect(() => {
    loadTicketTypes();
    loadWorkTypes();
    loadPriorities();
    loadPaymentModes();
  }, []);


  // -------------------- Ticket Types Operations --------------------
  async function loadTicketTypes() {
    setTicketTypesLoading(true);
    try {
      const data = await getTicketTypesAsync();
      setTicketTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load ticket types");
    } finally {
      setTicketTypesLoading(false);
    }
  }

  async function handleTicketTypeSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD || "This field is required";
    const schema = {
      typeName: { required: true, min: 2, max: 150, label: fieldRequired },
    };

    const newErrors = validateForm(ticketTypeForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setTicketTypeErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        typeName: ticketTypeForm.typeName.trim(),
        isActive: ticketTypeForm.isActive !== undefined ? ticketTypeForm.isActive : true,
      };

      if (ticketTypeForm.ticketTypeId) {
        await updateTicketTypeAsync(ticketTypeForm.ticketTypeId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await createTicketTypeAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setTicketTypeDialogOpen(false);
      loadTicketTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleTicketTypeDeleteRequest(id) {
    setTicketTypeToDelete(id);
    setTicketTypeDeleteConfirmOpen(true);
  }

  async function handleConfirmTicketTypeDelete() {
    if (ticketTypeToDelete) {
      try {
        await deleteTicketTypeAsync(ticketTypeToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadTicketTypes();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
      } finally {
        setTicketTypeDeleteConfirmOpen(false);
        setTicketTypeToDelete(null);
      }
    }
  }

  function handleTicketTypeToggleStatusRequest(row) {
    setTicketTypeToToggle(row);
    setTicketTypeStatusConfirmOpen(true);
  }

  async function handleConfirmTicketTypeStatusToggle() {
    if (!ticketTypeToToggle) return;
    try {
      const payload = {
        typeName: ticketTypeToToggle.typeName,
        isActive: !ticketTypeToToggle.isActive,
      };
      await updateTicketTypeAsync(ticketTypeToToggle.ticketTypeId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadTicketTypes();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setTicketTypeStatusConfirmOpen(false);
      setTicketTypeToToggle(null);
    }
  }

  // -------------------- Work Types Operations --------------------
  async function loadWorkTypes() {
    setWorkTypesLoading(true);
    try {
      const data = await getWorkTypesAsync();
      setWorkTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setWorkTypesLoading(false);
    }
  }

  async function handleWorkTypeSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD || "This field is required";
    const schema = {
      workTypeName: { required: true, min: 2, max: 100, label: fieldRequired },
    };

    const newErrors = validateForm(workTypeForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setWorkTypeErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        workTypeName: workTypeForm.workTypeName.trim(),
        isActive: workTypeForm.isActive !== undefined ? workTypeForm.isActive : true,
      };

      if (workTypeForm.workTypeId) {
        await updateWorkTypeAsync(workTypeForm.workTypeId, payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      } else {
        await createWorkTypeAsync(payload);
        toast.success(TOAST_MESSAGES.GENERAL.SAVED_SUCCESS);
      }
      setWorkTypeDialogOpen(false);
      loadWorkTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  }

  function handleWorkTypeDeleteRequest(id) {
    setWorkTypeToDelete(id);
    setWorkTypeDeleteConfirmOpen(true);
  }

  async function handleConfirmWorkTypeDelete() {
    if (workTypeToDelete) {
      try {
        await deleteWorkTypeAsync(workTypeToDelete);
        toast.success(TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
        loadWorkTypes();
      } catch (error) {
        toast.error(error.response?.data?.message || TOAST_MESSAGES.GENERAL.DELETE_FAILED);
      } finally {
        setWorkTypeDeleteConfirmOpen(false);
        setWorkTypeToDelete(null);
      }
    }
  }

  function handleWorkTypeToggleStatusRequest(row) {
    setWorkTypeToToggle(row);
    setWorkTypeStatusConfirmOpen(true);
  }

  async function handleConfirmWorkTypeStatusToggle() {
    if (!workTypeToToggle) return;
    try {
      const payload = {
        workTypeName: workTypeToToggle.workTypeName,
        isActive: !workTypeToToggle.isActive,
      };
      await updateWorkTypeAsync(workTypeToToggle.workTypeId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadWorkTypes();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setWorkTypeStatusConfirmOpen(false);
      setWorkTypeToToggle(null);
    }
  }

  // -------------------- Priorities Operations --------------------
  async function loadPriorities() {
    setPrioritiesLoading(true);
    try {
      const data = await getPrioritiesAsync();
      setPriorities(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load priorities");
    } finally {
      setPrioritiesLoading(false);
    }
  }

  async function handlePrioritySubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD || "This field is required";
    const schema = {
      priorityName: { required: true, min: 2, max: 100, label: fieldRequired },
    };

    const newErrors = validateForm(priorityForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setPriorityErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        priorityName: priorityForm.priorityName.trim(),
        isActive: priorityForm.isActive,
      };

      if (priorityForm.priorityId) {
        await updatePriorityAsync(priorityForm.priorityId, payload);
        toast.success("Priority updated successfully!");
      } else {
        await createPriorityAsync(payload);
        toast.success("Priority created successfully!");
      }

      setPriorityDialogOpen(false);
      setPriorityForm(initialPriorityForm);
      setPriorityErrors({});
      loadPriorities();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save priority");
    }
  }

  function handlePriorityDeleteRequest(id) {
    setPriorityToDelete(id);
    setPriorityDeleteConfirmOpen(true);
  }

  async function handleConfirmPriorityDelete() {
    if (!priorityToDelete) return;
    try {
      await deletePriorityAsync(priorityToDelete);
      toast.success("Priority deleted successfully!");
      loadPriorities();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete priority");
    } finally {
      setPriorityDeleteConfirmOpen(false);
      setPriorityToDelete(null);
    }
  }

  function handlePriorityToggleStatusRequest(row) {
    setPriorityToToggle(row);
    setPriorityStatusConfirmOpen(true);
  }

  async function handleConfirmPriorityStatusToggle() {
    if (!priorityToToggle) return;
    try {
      const payload = {
        priorityName: priorityToToggle.priorityName,
        isActive: !priorityToToggle.isActive,
      };
      await updatePriorityAsync(priorityToToggle.priorityId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadPriorities();
    } catch (err) {
      toast.error(err.response?.data?.message ?? TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED);
    } finally {
      setPriorityStatusConfirmOpen(false);
      setPriorityToToggle(null);
    }
  }

  // -------------------- Payment Modes Operations --------------------
  async function loadPaymentModes() {
    setPaymentModesLoading(true);
    try {
      const data = await getPaymentModesAsync();
      setPaymentModes(Array.isArray(data) ? data : []);
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        (error.response?.status === 404 ? "Payment Modes endpoint not found (404). Please restart/rebuild the backend API server." : null) ||
        error.message ||
        "Failed to load payment modes";
      toast.error(errMsg);
    } finally {
      setPaymentModesLoading(false);
    }
  }

  async function handlePaymentModeSubmit() {
    const fieldRequired = COMMON_STRINGS.VALIDATION.REQUIRED_FIELD || "This field is required";
    const schema = {
      paymentModeName: { required: true, min: 2, max: 100, label: fieldRequired },
    };

    const newErrors = validateForm(paymentModeForm, schema);

    if (Object.keys(newErrors).length > 0) {
      setPaymentModeErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      const payload = {
        paymentModeName: paymentModeForm.paymentModeName.trim(),
        isActive: paymentModeForm.isActive !== undefined ? paymentModeForm.isActive : true,
      };

      if (paymentModeForm.paymentModeId) {
        await updatePaymentModeAsync(paymentModeForm.paymentModeId, payload);
        toast.success("Payment mode updated successfully!");
      } else {
        await createPaymentModeAsync(payload);
        toast.success("Payment mode created successfully!");
      }

      setPaymentModeDialogOpen(false);
      setPaymentModeForm(initialPaymentModeForm);
      setPaymentModeErrors({});
      loadPaymentModes();
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(" ") : null) ||
        error.response?.data?.title ||
        (error.response?.status === 404 ? "Payment Modes API not running (404). Please rebuild/restart backend in Visual Studio." : null) ||
        error.message ||
        "Failed to save payment mode";
      toast.error(errMsg);
    }
  }

  function handlePaymentModeDeleteRequest(id) {
    setPaymentModeToDelete(id);
    setPaymentModeDeleteConfirmOpen(true);
  }

  async function handleConfirmPaymentModeDelete() {
    if (!paymentModeToDelete) return;
    try {
      await deletePaymentModeAsync(paymentModeToDelete);
      toast.success("Payment mode deleted successfully!");
      loadPaymentModes();
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        (error.response?.status === 404 ? "Payment Modes API not running (404). Please restart backend." : null) ||
        error.message ||
        "Failed to delete payment mode";
      toast.error(errMsg);
    } finally {
      setPaymentModeDeleteConfirmOpen(false);
      setPaymentModeToDelete(null);
    }
  }

  function handlePaymentModeToggleStatusRequest(row) {
    setPaymentModeToToggle(row);
    setPaymentModeStatusConfirmOpen(true);
  }

  async function handleConfirmPaymentModeStatusToggle() {
    if (!paymentModeToToggle) return;
    try {
      const payload = {
        paymentModeName: paymentModeToToggle.paymentModeName,
        isActive: !paymentModeToToggle.isActive,
      };
      await updatePaymentModeAsync(paymentModeToToggle.paymentModeId, payload);
      toast.success(TOAST_MESSAGES.GENERAL.STATUS_UPDATED_SUCCESS);
      loadPaymentModes();
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        (err.response?.status === 404 ? "Payment Modes API not running (404). Please restart backend." : null) ||
        err.message ||
        TOAST_MESSAGES.GENERAL.STATUS_UPDATE_FAILED;
      toast.error(errMsg);
    } finally {
      setPaymentModeStatusConfirmOpen(false);
      setPaymentModeToToggle(null);
    }
  }


  // ==================== Ticket Types Table Columns ====================
  const ticketTypeColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Ticket Type" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setTicketTypeForm({
                    ticketTypeId: row.ticketTypeId,
                    typeName: row.typeName || "",
                    isActive: row.isActive ?? true,
                  });
                  setTicketTypeErrors({});
                  setTicketTypeDialogOpen(true);
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? "Cannot delete: this ticket type is referenced in support tickets" : (hasWriteAccess ? "Delete Ticket Type" : "")}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)}
                onClick={() => handleTicketTypeDeleteRequest(row.ticketTypeId)}
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              hasWriteAccess
                ? row.isActive
                  ? "Deactivate Ticket Type"
                  : "Activate Ticket Type"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleTicketTypeToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#10b981" : "#cbd5e1",
                    }}
                  />
                ) : (
                  <ToggleOffIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#ef4444" : "#cbd5e1",
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
      label: "Ticket Type",
      key: "typeName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.typeName}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: row.isActive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: row.isActive ? "#10b981" : "#ef4444",
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
            display: "inline-block",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.createdOn),
    },
  ];

  // ==================== Work Types Table Columns ====================
  const workTypeColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Work Type" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setWorkTypeForm({
                    workTypeId: row.workTypeId,
                    workTypeName: row.workTypeName || "",
                    isActive: row.isActive ?? true,
                  });
                  setWorkTypeErrors({});
                  setWorkTypeDialogOpen(true);
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? "Cannot delete: this work type is assigned to active members" : (hasWriteAccess ? "Delete Work Type" : "")}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)}
                onClick={() => handleWorkTypeDeleteRequest(row.workTypeId)}
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              hasWriteAccess
                ? row.isActive
                  ? "Deactivate Work Type"
                  : "Activate Work Type"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleWorkTypeToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#10b981" : "#cbd5e1",
                    }}
                  />
                ) : (
                  <ToggleOffIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#ef4444" : "#cbd5e1",
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
      label: "Work Type",
      key: "workTypeName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.workTypeName}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: row.isActive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: row.isActive ? "#10b981" : "#ef4444",
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
            display: "inline-block",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.createdOn),
    },
  ];

  // ==================== Priorities Table Columns ====================
  const priorityColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Priority" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setPriorityForm({
                    priorityId: row.priorityId,
                    priorityName: row.priorityName || "",
                    isActive: row.isActive ?? true,
                  });
                  setPriorityErrors({});
                  setPriorityDialogOpen(true);
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? "Cannot delete: this priority is assigned to support tickets" : (hasWriteAccess ? "Delete Priority" : "")}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)}
                onClick={() => handlePriorityDeleteRequest(row.priorityId)}
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? (row.isActive ? "Deactivate Priority" : "Activate Priority") : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handlePriorityToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon sx={{ color: "#10b981", fontSize: "1.4rem" }} />
                ) : (
                  <ToggleOffIcon sx={{ color: "#94a3b8", fontSize: "1.4rem" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    {
      label: "Priority",
      key: "priorityName",
      render: (row) => {
        const isHigh = row.priorityName === "High" || row.priorityName === "Urgent";
        const isMedium = row.priorityName === "Medium";
        return (
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              color: isHigh ? "#ef4444" : isMedium ? "#f59e0b" : "#3b82f6",
            }}
          >
            {row.priorityName}
          </Typography>
        );
      },
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: row.isActive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: row.isActive ? "#10b981" : "#ef4444",
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
            display: "inline-block",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.createdOn),
    },
  ];

  // ==================== Payment Modes Table Columns ====================
  const paymentModeColumns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.2, alignItems: "center" }}>
          <Tooltip title={hasWriteAccess ? "Edit Payment Mode" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => {
                  setPaymentModeForm({
                    paymentModeId: row.paymentModeId,
                    paymentModeName: row.paymentModeName || "",
                    isActive: row.isActive ?? true,
                  });
                  setPaymentModeErrors({});
                  setPaymentModeDialogOpen(true);
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.isReferred || row.IsReferred ? "Cannot delete: this payment mode is used in transactions or contributions" : (hasWriteAccess ? "Delete Payment Mode" : "")}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess || Boolean(row.isReferred || row.IsReferred)}
                onClick={() => handlePaymentModeDeleteRequest(row.paymentModeId)}
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
                        ? "rgba(255,255,255,0.3)"
                        : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              hasWriteAccess
                ? row.isActive
                  ? "Deactivate Payment Mode"
                  : "Activate Payment Mode"
                : ""
            }
          >
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handlePaymentModeToggleStatusRequest(row)}
              >
                {row.isActive ? (
                  <ToggleOnIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#10b981" : "#cbd5e1",
                    }}
                  />
                ) : (
                  <ToggleOffIcon
                    sx={{
                      fontSize: "1.25rem",
                      color: hasWriteAccess ? "#ef4444" : "#cbd5e1",
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
      label: "Payment Mode",
      key: "paymentModeName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.paymentModeName}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "isActive",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: row.isActive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: row.isActive ? "#10b981" : "#ef4444",
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
            display: "inline-block",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.createdOn),
    },
  ];


  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Top Header */}
      <Typography
        variant="h5"
        fontWeight={900}
        sx={{
          color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e1b4b"),
          fontSize: "1.45rem",
          letterSpacing: "-0.01em",
        }}
      >
        Event Collections
      </Typography>

      {/* Tabs Container */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {COLLECTION_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Box
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                py: 1.6,
                px: 2.5,
                borderRadius: "14px",
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                bgcolor: (theme) => {
                  if (isActive) {
                    return theme.palette.mode === "dark" ? "#4c3a70" : "#45386d";
                  }
                  return theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(124, 58, 237, 0.04)";
                },
                color: (theme) => {
                  if (isActive) return "#ffffff";
                  return theme.palette.mode === "dark" ? "#c4b5fd" : "#45386d";
                },
                boxShadow: (theme) =>
                  isActive
                    ? "0 6px 18px rgba(69, 56, 109, 0.28)"
                    : "none",
                border: (theme) =>
                  isActive
                    ? "1px solid transparent"
                    : theme.palette.mode === "dark"
                    ? "1px solid rgba(255, 255, 255, 0.06)"
                    : "1px solid rgba(124, 58, 237, 0.08)",
                "&:hover": {
                  transform: "translateY(-1px)",
                  bgcolor: (theme) => {
                    if (isActive) {
                      return theme.palette.mode === "dark" ? "#55427d" : "#403366";
                    }
                    return theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(124, 58, 237, 0.09)";
                  },
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", color: "inherit" }}>
                {tab.icon}
              </Box>
              <Typography
                fontWeight={isActive ? 800 : 700}
                sx={{
                  fontSize: "0.95rem",
                  color: "inherit",
                  letterSpacing: "0.01em",
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* 1. Ticket Types Table */}
      {activeTab === "ticketTypes" && (
        <AppDataTable
          title="Ticket Types"
          columns={ticketTypeColumns}
          data={ticketTypes}
          loading={ticketTypesLoading}
          actions={
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setTicketTypeForm(initialTicketTypeForm);
                setTicketTypeErrors({});
                setTicketTypeDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          }
        />
      )}

      {/* 2. Work Types Table */}
      {activeTab === "workTypes" && (
        <AppDataTable
          title="Work Types"
          columns={workTypeColumns}
          data={workTypes}
          loading={workTypesLoading}
          actions={
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setWorkTypeForm(initialWorkTypeForm);
                setWorkTypeErrors({});
                setWorkTypeDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          }
        />
      )}

      {/* 3. Priorities Table */}
      {activeTab === "priorities" && (
        <AppDataTable
          title="Priorities"
          columns={priorityColumns}
          data={priorities}
          loading={prioritiesLoading}
          actions={
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setPriorityForm(initialPriorityForm);
                setPriorityErrors({});
                setPriorityDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          }
        />
      )}

      {/* 4. Payment Modes Table */}
      {activeTab === "paymentModes" && (
        <AppDataTable
          title="Payment Modes"
          columns={paymentModeColumns}
          data={paymentModes}
          loading={paymentModesLoading}
          actions={
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setPaymentModeForm(initialPaymentModeForm);
                setPaymentModeErrors({});
                setPaymentModeDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          }
        />
      )}

      {/* ==================== Ticket Type Dialog ==================== */}

      <AppDialog
        open={ticketTypeDialogOpen}
        onClose={() => setTicketTypeDialogOpen(false)}
        title={ticketTypeForm.ticketTypeId ? "Edit Ticket Type" : "Add Ticket Type"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setTicketTypeDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleTicketTypeSubmit}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <AppInput
            label="Ticket Type"
            placeholder="Enter ticket type"
            value={ticketTypeForm.typeName}
            onChange={(e) => {
              setTicketTypeForm((prev) => ({ ...prev, typeName: e.target.value }));
              if (ticketTypeErrors.typeName) {
                setTicketTypeErrors((prev) => ({ ...prev, typeName: "" }));
              }
            }}
            maxLength={150}
            error={!!ticketTypeErrors.typeName}
            helperText={ticketTypeErrors.typeName}
            required
            fullWidth
          />

          <AppSwitch
            label="Status"
            checked={ticketTypeForm.isActive}
            onChange={(e) =>
              setTicketTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
        </Box>
      </AppDialog>

      {/* Ticket Type Delete Confirmation */}
      <AppConfirmDialog
        open={ticketTypeDeleteConfirmOpen}
        onClose={() => setTicketTypeDeleteConfirmOpen(false)}
        onConfirm={handleConfirmTicketTypeDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Ticket Type Status Toggle Confirmation */}
      <AppConfirmDialog
        open={ticketTypeStatusConfirmOpen}
        onClose={() => setTicketTypeStatusConfirmOpen(false)}
        onConfirm={handleConfirmTicketTypeStatusToggle}
        title="Confirm Status Change"
        content={`Are you sure you want to ${
          ticketTypeToToggle?.isActive ? "deactivate" : "activate"
        } this ticket type?`}
      />

      {/* ==================== Work Type Dialog ==================== */}
      <AppDialog
        open={workTypeDialogOpen}
        onClose={() => setWorkTypeDialogOpen(false)}
        title={workTypeForm.workTypeId ? "Edit Work Type" : "Add Work Type"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setWorkTypeDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleWorkTypeSubmit}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <AppInput
            label="Work Type"
            placeholder="Enter work type (e.g. Office, WFH, Hybrid)"
            value={workTypeForm.workTypeName}
            onChange={(e) => {
              setWorkTypeForm((prev) => ({ ...prev, workTypeName: e.target.value }));
              if (workTypeErrors.workTypeName) {
                setWorkTypeErrors((prev) => ({ ...prev, workTypeName: "" }));
              }
            }}
            maxLength={100}
            error={!!workTypeErrors.workTypeName}
            helperText={workTypeErrors.workTypeName}
            required
            fullWidth
          />

          <AppSwitch
            label="Status"
            checked={workTypeForm.isActive}
            onChange={(e) =>
              setWorkTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
        </Box>
      </AppDialog>

      {/* Work Type Delete Confirmation */}
      <AppConfirmDialog
        open={workTypeDeleteConfirmOpen}
        onClose={() => setWorkTypeDeleteConfirmOpen(false)}
        onConfirm={handleConfirmWorkTypeDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Work Type Status Toggle Confirmation */}
      <AppConfirmDialog
        open={workTypeStatusConfirmOpen}
        onClose={() => setWorkTypeStatusConfirmOpen(false)}
        onConfirm={handleConfirmWorkTypeStatusToggle}
        title="Confirm Status Change"
        content={`Are you sure you want to ${
          workTypeToToggle?.isActive ? "deactivate" : "activate"
        } this work type?`}
      />

      {/* ==================== Priority Dialog ==================== */}
      <AppDialog
        open={priorityDialogOpen}
        onClose={() => setPriorityDialogOpen(false)}
        title={priorityForm.priorityId ? "Edit Priority" : "Add Priority"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setPriorityDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handlePrioritySubmit}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <AppInput
            label="Priority Name"
            placeholder="Enter priority name (e.g. High, Medium, Low)"
            value={priorityForm.priorityName}
            onChange={(e) => {
              setPriorityForm((prev) => ({ ...prev, priorityName: e.target.value }));
              if (priorityErrors.priorityName) {
                setPriorityErrors((prev) => ({ ...prev, priorityName: "" }));
              }
            }}
            maxLength={100}
            error={!!priorityErrors.priorityName}
            helperText={priorityErrors.priorityName}
            required
            fullWidth
          />

          <AppSwitch
            label="Status"
            checked={priorityForm.isActive}
            onChange={(e) =>
              setPriorityForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
        </Box>
      </AppDialog>

      {/* Priority Delete Confirmation */}
      <AppConfirmDialog
        open={priorityDeleteConfirmOpen}
        onClose={() => setPriorityDeleteConfirmOpen(false)}
        onConfirm={handleConfirmPriorityDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Priority Status Toggle Confirmation */}
      <AppConfirmDialog
        open={priorityStatusConfirmOpen}
        onClose={() => setPriorityStatusConfirmOpen(false)}
        onConfirm={handleConfirmPriorityStatusToggle}
        title="Confirm Status Change"
        content={`Are you sure you want to ${
          priorityToToggle?.isActive ? "deactivate" : "activate"
        } this priority?`}
      />

      {/* ==================== Payment Mode Dialog ==================== */}
      <AppDialog
        open={paymentModeDialogOpen}
        onClose={() => setPaymentModeDialogOpen(false)}
        title={paymentModeForm.paymentModeId ? "Edit Payment Mode" : "Add Payment Mode"}
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setPaymentModeDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handlePaymentModeSubmit}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <AppInput
            label="Payment Mode"
            placeholder="Enter payment mode (e.g. UPI, Cash, Card, Net Banking)"
            value={paymentModeForm.paymentModeName}
            onChange={(e) => {
              setPaymentModeForm((prev) => ({ ...prev, paymentModeName: e.target.value }));
              if (paymentModeErrors.paymentModeName) {
                setPaymentModeErrors((prev) => ({ ...prev, paymentModeName: "" }));
              }
            }}
            maxLength={100}
            error={!!paymentModeErrors.paymentModeName}
            helperText={paymentModeErrors.paymentModeName}
            required
            fullWidth
          />

          <AppSwitch
            label="Status"
            checked={paymentModeForm.isActive}
            onChange={(e) =>
              setPaymentModeForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
        </Box>
      </AppDialog>

      {/* Payment Mode Delete Confirmation */}
      <AppConfirmDialog
        open={paymentModeDeleteConfirmOpen}
        onClose={() => setPaymentModeDeleteConfirmOpen(false)}
        onConfirm={handleConfirmPaymentModeDelete}
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
      />

      {/* Payment Mode Status Toggle Confirmation */}
      <AppConfirmDialog
        open={paymentModeStatusConfirmOpen}
        onClose={() => setPaymentModeStatusConfirmOpen(false)}
        onConfirm={handleConfirmPaymentModeStatusToggle}
        title="Confirm Status Change"
        content={`Are you sure you want to ${
          paymentModeToToggle?.isActive ? "deactivate" : "activate"
        } this payment mode?`}
      />
    </Box>
  );
}

