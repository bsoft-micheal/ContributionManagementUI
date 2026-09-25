import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Send as SendIcon,
  FilterList as FilterListIcon,
  CloudUpload as CloudUploadIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  ZoomIn as ZoomInIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import {
  getSupportTicketsAsync,
  createSupportTicketAsync,
  updateSupportTicketAsync,
  replySupportTicketAsync,
  deleteSupportTicketAsync,
} from "../../services/supportTicketService";
import { GetMembersAsync } from "../../services/memberService";
import { GetEventsAsync } from "../../services/eventService";
import { GetTicketTypesAsync } from "../../services/ticketTypeService";
import { GetStatusesAsync } from "../../services/statusService";

const initialForm = {
  memberName: "",
  memberId: "",
  relatedEvent: "",
  ticketType: "",
  priority: "Medium",
  status: "",
  subject: "",
  description: "",
  assignedTo: "",
  attachment: "",
  attachmentName: "",
};

const priorityOptions = [
  { label: "All Priorities", value: "ALL" },
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];

export default function SupportTicketsPage() {
  const { canEdit } = useAccessByLocation();
  const toast = useAppToast();

  const [tickets, setTickets] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [dbTicketTypes, setDbTicketTypes] = useState([]);
  const [dbStatuses, setDbStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  // Image attachment & preview states
  const fileInputRef = useRef(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");

  const openImagePreview = (src, title = "Attached Image Preview") => {
    if (!src) return;
    setPreviewImageSrc(src);
    setPreviewImageTitle(title);
    setPreviewModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    const MAX_SIZE = 3 * 1024 * 1024; // 3MB limit
    if (file.size > MAX_SIZE) {
      toast.error("Image size exceeds maximum limit of 3 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      setForm((c) => ({
        ...c,
        attachment: uploadEvt.target.result,
        attachmentName: file.name,
      }));
      toast.success(`Image "${file.name}" attached successfully!`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = (e) => {
    if (e) e.stopPropagation();
    setForm((c) => ({
      ...c,
      attachment: "",
      attachmentName: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadImage = (dataUrl, fileName = "ticket_attachment.png") => {
    if (!dataUrl) return;
    try {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image downloaded successfully!");
    } catch (err) {
      console.error("Failed to download image:", err);
      toast.error("Could not download image");
    }
  };

  // View / Reply state
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("In Progress");

  // Filter state inside AppDataTable filterPanel
  const [filterType, setFilterType] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [appliedType, setAppliedType] = useState("ALL");
  const [appliedPriority, setAppliedPriority] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");

  const fetchTicketsFromDb = async () => {
    try {
      setLoading(true);
      const data = await getSupportTicketsAsync();
      if (Array.isArray(data)) {
        const mapped = data.map((item, idx) => ({
          id: item.ticketId
            ? `TKT-${String(idx + 1).padStart(3, "0")}`
            : item.id || `TKT-${String(idx + 1).padStart(3, "0")}`,
          ticketId: item.ticketId || item.id,
          ticketNo: item.ticketNo || `TKT-2026-${String(idx + 1).padStart(3, "0")}`,
          memberName: item.memberName || "",
          memberId: item.memberId || "",
          relatedEvent: item.relatedEvent || "",
          ticketType: item.ticketType || "General Query",
          subject: item.subject || "",
          description: item.description || "",
          status: item.status || "Open",
          priority: item.priority || "Medium",
          assignedTo: item.assignedTo || "--",
          createdDate: item.createdOn || item.createdAt || new Date().toISOString(),
          createdBy: item.createdBy || item.CreatedBy || "--",
          refNo: item.refNo || "-",
          utr: item.utr || "-",
          attachment: item.attachment || null,
        }));
        setTickets(mapped);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Failed to load support tickets from database:", err);
      toast.error("Could not load support tickets from database");
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [membersRes, eventsRes, ticketTypesRes, statusesRes] = await Promise.all([
        GetMembersAsync().catch(() => []),
        GetEventsAsync().catch(() => []),
        GetTicketTypesAsync(true).catch(() => []),
        GetStatusesAsync(true).catch(() => []),
      ]);
      if (Array.isArray(membersRes)) setMembersList(membersRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(ticketTypesRes)) setDbTicketTypes(ticketTypesRes);
      if (Array.isArray(statusesRes)) setDbStatuses(statusesRes);
    } catch (err) {
      console.warn("Failed to load members, events, ticket types, or statuses lookup data:", err);
    }
  };

  useEffect(() => {
    fetchTicketsFromDb();
    fetchLookupData();
  }, []);

  // Dynamically derive member options from DB members
  const memberOptions = useMemo(() => {
    const list = [{ label: "Select Member", value: "" }];
    const unique = new Set();
    membersList.forEach((m) => {
      const name = m.name || m.memberName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({
          label: `${name}${m.roleName ? ` (${m.roleName})` : ""}`,
          value: name,
        });
      }
    });
    return list;
  }, [membersList]);

  // Dynamically derive event options from DB events
  const eventOptions = useMemo(() => {
    const list = [{ label: "Select Event", value: "" }];
    const unique = new Set();
    eventsList.forEach((e) => {
      const name = e.name || e.eventName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({ label: name, value: name });
      }
    });
    return list;
  }, [eventsList]);

  // Dynamically derive ticket types strictly from DB ticket types table in Support Data
  const ticketTypeOptions = useMemo(() => {
    const list = Array.isArray(dbTicketTypes)
      ? dbTicketTypes
          .filter((t) => t.typeName && t.isActive !== false)
          .map((t) => ({ label: t.typeName, value: t.typeName }))
      : [];

    return [
      { label: "All Types", value: "ALL" },
      ...list,
    ];
  }, [dbTicketTypes]);

  // Dynamically derive status options strictly from DB statuses table in Support Data
  const statusOptions = useMemo(() => {
    const list = Array.isArray(dbStatuses)
      ? dbStatuses
          .filter((s) => s.statusName && s.isActive !== false)
          .map((s) => ({ label: s.statusName, value: s.statusName }))
      : [];

    return [
      { label: "All Statuses", value: "ALL" },
      ...list,
    ];
  }, [dbStatuses]);

  // Dynamically derive assignee options from DB members list
  const assignedToOptions = useMemo(() => {
    const list = [{ label: "Unassigned", value: "" }];
    const unique = new Set();
    membersList.forEach((m) => {
      const name = m.name || m.memberName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({
          label: `${name}${m.roleName ? ` (${m.roleName})` : ""}`,
          value: name,
        });
      }
    });
    return list;
  }, [membersList]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      if (appliedType !== "ALL" && item.ticketType !== appliedType) return false;
      if (appliedPriority !== "ALL" && item.priority !== appliedPriority) return false;
      if (appliedStatus !== "ALL" && item.status !== appliedStatus) return false;
      return true;
    });
  }, [tickets, appliedType, appliedPriority, appliedStatus]);

  const handleEditTicket = (row) => {
    setEditingTicket(row);
    setForm({
      memberName: row.memberName || "",
      memberId: row.memberId || "",
      relatedEvent: row.relatedEvent || "",
      ticketType: row.ticketType || "",
      priority: row.priority || "Medium",
      status: row.status || "Open",
      subject: row.subject || "",
      description: row.description || "",
      assignedTo: row.assignedTo || "",
      attachment: row.attachment || "",
      attachmentName: row.attachment ? `${row.ticketNo || "ticket"}_attachment.png` : "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteRequest = (row) => {
    setTicketToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    const ticketId = ticketToDelete.ticketId || ticketToDelete.id;

    try {
      await deleteSupportTicketAsync(ticketId);
      toast.success("Support ticket deleted successfully");
      await fetchTicketsFromDb();
    } catch (err) {
      console.error("Backend delete ticket call failed:", err);
      toast.error("Failed to delete support ticket from database");
    } finally {
      setDeleteConfirmOpen(false);
      setTicketToDelete(null);
    }
  };

  const handleSaveTicket = async () => {
    const newErrors = {};
    if (!form.memberName) newErrors.memberName = "Member Name is required";
    if (!form.ticketType) newErrors.ticketType = "Ticket Type is required";
    if (!form.subject || !form.subject.trim()) newErrors.subject = "Subject is required";
    if (!form.description || !form.description.trim()) newErrors.description = "Description is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all required fields");
      return;
    }

    try {
      let resolvedMemberId = form.memberId;
      if (!resolvedMemberId && form.memberName) {
        const matched = membersList.find((m) => (m.name || m.memberName) === form.memberName);
        if (matched) resolvedMemberId = matched.memberId || matched.id || "";
      }

      if (editingTicket) {
        const ticketId = editingTicket.ticketId || editingTicket.id;
        await updateSupportTicketAsync(ticketId, {
          memberName: form.memberName,
          memberId: resolvedMemberId || "",
          relatedEvent: form.relatedEvent || "",
          ticketType: form.ticketType,
          subject: form.subject,
          description: form.description,
          priority: form.priority,
          status: form.status,
          assignedTo: form.assignedTo || "",
          attachment: form.attachment || null,
        });
        toast.success("Support ticket updated successfully!");
      } else {
        const nextIdx = tickets.length + 1;
        const newTicketNo = `TKT-2026-${String(nextIdx).padStart(3, "0")}`;

        await createSupportTicketAsync({
          ticketNo: newTicketNo,
          memberName: form.memberName,
          memberId: resolvedMemberId || "",
          relatedEvent: form.relatedEvent || "",
          ticketType: form.ticketType,
          subject: form.subject,
          description: form.description,
          priority: form.priority,
          status: form.status,
          assignedTo: form.assignedTo || "",
          attachment: form.attachment || null,
        });
        toast.success(`Ticket created successfully!`);
      }

      setDialogOpen(false);
      setEditingTicket(null);
      setForm(initialForm);
      setErrors({});
      await fetchTicketsFromDb();
    } catch (err) {
      console.error("Failed to save support ticket:", err);
      toast.error(err.response?.data?.message || "Failed to save support ticket to database");
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply or resolution note");
      return;
    }

    if (selectedTicket) {
      const ticketId = selectedTicket.ticketId || selectedTicket.id;
      try {
        await replySupportTicketAsync(ticketId, {
          replyMessage: replyText,
          status: replyStatus,
        });
        toast.success("Reply submitted and status updated in database!");
        setReplyText("");
        setViewDialogOpen(false);
        await fetchTicketsFromDb();
      } catch (err) {
        console.error("Backend reply call failed:", err);
        toast.error("Failed to submit reply to database");
      }
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View Details & Reply">
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => {
                setSelectedTicket(row);
                setReplyStatus(row.status || "In Progress");
                setReplyText("");
                setViewDialogOpen(true);
              }}
            >
              <ViewIcon
                sx={{
                  fontSize: "1.05rem",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={canEdit ? "Edit" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canEdit}
                onClick={() => handleEditTicket(row)}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canEdit
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
          <Tooltip title={canEdit ? "Delete" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canEdit}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canEdit
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
        </Box>
      ),
    },
    {
      label: "Ticket No",
      key: "ticketNo",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") }}
        >
          {row.ticketNo}
        </Typography>
      ),
    },
    {
      label: "Member Name",
      key: "memberName",
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>
          {row.memberName}
        </Typography>
      ),
    },
    {
      label: "Related Event",
      key: "relatedEvent",
      render: (row) => row.relatedEvent || "--",
    },
    {
      label: "Ticket Type",
      key: "ticketType",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: (t) =>
              t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74,63,107,0.08)",
            color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
          }}
        >
          {row.ticketType}
        </Typography>
      ),
    },
    {
      label: "Subject",
      key: "subject",
      render: (row) => (
        <Typography
          variant="body2"
          sx={{
            maxWidth: 220,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {row.subject}
        </Typography>
      ),
    },
    {
      label: "Priority",
      key: "priority",
      render: (row) => {
        const isHigh = row.priority === "High";
        const isMedium = row.priority === "Medium";
        return (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              bgcolor: isHigh
                ? "rgba(220, 38, 38, 0.1)"
                : isMedium
                  ? "rgba(234, 179, 8, 0.12)"
                  : "rgba(59, 130, 246, 0.1)",
              color: isHigh ? "#dc2626" : isMedium ? "#d97706" : "#2563eb",
              border: isHigh
                ? "1px solid rgba(220, 38, 38, 0.25)"
                : isMedium
                  ? "1px solid rgba(234, 179, 8, 0.25)"
                  : "1px solid rgba(59, 130, 246, 0.25)",
              px: 1.2,
              py: 0.3,
              borderRadius: "12px",
              fontSize: "0.75rem",
              display: "inline-block",
            }}
          >
            {row.priority}
          </Typography>
        );
      },
    },
    {
      label: "Status",
      key: "status",
      render: (row) => {
        const isOpen = row.status === "Open";
        const isInProgress = row.status === "In Progress";
        const isResolved = row.status === "Resolved";
        return (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              bgcolor: isResolved
                ? "rgba(22, 163, 74, 0.1)"
                : isInProgress
                  ? "rgba(59, 130, 246, 0.1)"
                  : isOpen
                    ? "rgba(220, 38, 38, 0.1)"
                    : "rgba(100, 116, 139, 0.1)",
              color: isResolved
                ? "#16a34a"
                : isInProgress
                  ? "#2563eb"
                  : isOpen
                    ? "#dc2626"
                    : "#64748b",
              border: isResolved
                ? "1px solid rgba(22, 163, 74, 0.25)"
                : isInProgress
                  ? "1px solid rgba(59, 130, 246, 0.25)"
                  : isOpen
                    ? "1px solid rgba(220, 38, 38, 0.25)"
                    : "1px solid rgba(100, 116, 139, 0.25)",
              px: 1.2,
              py: 0.3,
              borderRadius: "12px",
              fontSize: "0.75rem",
              display: "inline-block",
            }}
          >
            {row.status}
          </Typography>
        );
      },
    },
    {
      label: "Assigned To",
      key: "assignedTo",
      render: (row) => row.assignedTo || "--",
    },
    {
      label: "Attachment",
      key: "attachment",
      render: (row) => {
        if (!row.attachment) return "--";
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Tooltip title="Click to view full image">
              <Box
                component="img"
                src={row.attachment}
                alt="Thumbnail"
                onClick={() => openImagePreview(row.attachment, `${row.ticketNo} - Attachment`)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "4px",
                  objectFit: "cover",
                  cursor: "pointer",
                  border: "1px solid rgba(0,0,0,0.15)",
                  "&:hover": { transform: "scale(1.15)", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" },
                  transition: "all 0.15s ease",
                }}
              />
            </Tooltip>
            <Tooltip title="Download Image">
              <IconButton
                size="small"
                sx={{ p: 0.2 }}
                onClick={() => handleDownloadImage(row.attachment, `${row.ticketNo}_attachment.png`)}
              >
                <DownloadIcon sx={{ fontSize: 16, color: "#0284c7" }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      label: "Created On",
      key: "createdDate",
      render: (row) => formatGridDate(row.createdDate || row.createdOn || row.createdAt),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Support Tickets"
        columns={columns}
        data={filteredTickets}
        loading={loading}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="contained"
              size="small"
              disabled={!canEdit}
              startIcon={<AddIcon />}
              onClick={() => {
                const firstTicketType = dbTicketTypes.find((t) => t.isActive !== false)?.typeName || "";
                const firstStatus = dbStatuses.find((s) => s.isActive !== false)?.statusName || "";
                setEditingTicket(null);
                setForm({
                  ...initialForm,
                  ticketType: firstTicketType,
                  status: firstStatus,
                });
                setErrors({});
                setDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          </Stack>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 180 }}>
                <AppSelect
                  label="Select Ticket Type"
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                  }}
                  options={ticketTypeOptions}
                  size="small"
                  placeholder="Select Ticket Type"
                  required
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label="Select Priority"
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value);
                  }}
                  options={priorityOptions}
                  size="small"
                  placeholder="Select Priority"
                  required
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label="Select Status"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                  }}
                  options={statusOptions}
                  size="small"
                  placeholder="Select Status"
                  required
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setAppliedType(filterType);
                  setAppliedPriority(filterPriority);
                  setAppliedStatus(filterStatus);
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
                  setFilterType("ALL");
                  setFilterPriority("ALL");
                  setFilterStatus("ALL");
                  setAppliedType("ALL");
                  setAppliedPriority("ALL");
                  setAppliedStatus("ALL");
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
        }
      />

      {/* Add / Edit Ticket Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTicket(null);
          setErrors({});
        }}
        title={editingTicket ? "Edit Support Ticket" : "Add Support Ticket"}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5}>
            <AppButton
              variant="outlined"
              onClick={() => {
                setDialogOpen(false);
                setEditingTicket(null);
                setErrors({});
              }}
            >
              Cancel
            </AppButton>
            <AppButton variant="contained" onClick={handleSaveTicket}>
              {editingTicket ? "Update" : "Save"}
            </AppButton>
          </Stack>
        }
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Member Name"
              placeholder="Select Member"
              value={form.memberName}
              onChange={(e) => {
                const selectedName = e.target.value;
                const matched = membersList.find((m) => (m.name || m.memberName) === selectedName);
                setForm((c) => ({
                  ...c,
                  memberName: selectedName,
                  memberId: matched?.memberId || matched?.id || "",
                }));
                if (errors.memberName) setErrors((p) => ({ ...p, memberName: "" }));
              }}
              options={memberOptions}
              error={!!errors.memberName}
              helperText={errors.memberName}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Related Event"
              placeholder="Select Event"
              value={form.relatedEvent}
              onChange={(e) => setForm((c) => ({ ...c, relatedEvent: e.target.value }))}
              options={eventOptions}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Ticket Type"
              placeholder="Select Ticket Type"
              value={form.ticketType}
              onChange={(e) => {
                setForm((c) => ({ ...c, ticketType: e.target.value }));
                if (errors.ticketType) setErrors((p) => ({ ...p, ticketType: "" }));
              }}
              options={ticketTypeOptions.filter((o) => o.value !== "ALL")}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Priority"
              placeholder="Select Priority"
              value={form.priority}
              onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value }))}
              options={priorityOptions.filter((o) => o.value !== "ALL")}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Status"
              placeholder="Select Status"
              value={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
              options={statusOptions.filter((o) => o.value !== "ALL")}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Assigned To"
              placeholder="Select Assignee"
              value={form.assignedTo}
              onChange={(e) => setForm((c) => ({ ...c, assignedTo: e.target.value }))}
              options={assignedToOptions}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Subject"
              placeholder="Brief summary of the issue or inquiry"
              value={form.subject}
              onChange={(e) => {
                setForm((c) => ({ ...c, subject: e.target.value }));
                if (errors.subject) setErrors((p) => ({ ...p, subject: "" }));
              }}
              error={!!errors.subject}
              helperText={errors.subject}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: (t) => t.palette.mode === "dark" ? "#e2e8f0" : "#334155" }}>
                  Attachment (1 Image, Max 3MB)
                </Typography>
                {form.attachment && (
                  <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 700, fontSize: "0.7rem" }}>
                    ✓ Image Attached
                  </Typography>
                )}
              </Box>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: "none" }}
              />

              {!form.attachment ? (
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: "1.5px dashed",
                    borderColor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)",
                    borderRadius: "10px",
                    p: 1.1,
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    cursor: "pointer",
                    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: (t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                      bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.07)",
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 20, color: (t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b" }} />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Click to attach image (Max 3MB)
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 0.6,
                    px: 1,
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: "10px",
                    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                    minHeight: 46,
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", overflow: "hidden" }}
                    onClick={() => openImagePreview(form.attachment, form.attachmentName || "Attached Image")}
                  >
                    <Box
                      component="img"
                      src={form.attachment}
                      alt="Preview"
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "6px",
                        objectFit: "cover",
                        border: "1px solid rgba(0,0,0,0.1)",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="caption" fontWeight={700} sx={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                        {form.attachmentName || "Attached Image"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#0284c7", fontSize: "0.66rem", display: "block" }}>
                        Click to preview
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={0.3}>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => openImagePreview(form.attachment, form.attachmentName || "Attached Image")}>
                        <ViewIcon sx={{ fontSize: 17, color: (t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => handleDownloadImage(form.attachment, form.attachmentName || "ticket_attachment.png")}>
                        <DownloadIcon sx={{ fontSize: 17, color: "#0284c7" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Change">
                      <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                        <CloudUploadIcon sx={{ fontSize: 17, color: "#d97706" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={handleRemoveAttachment}>
                        <DeleteIcon sx={{ fontSize: 17, color: "#ef4444" }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              )}
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <AppTextArea
              label="Description"
              placeholder="Explain the issue details or question..."
              value={form.description}
              onChange={(e) => {
                setForm((c) => ({ ...c, description: e.target.value }));
                if (errors.description) setErrors((p) => ({ ...p, description: "" }));
              }}
              error={!!errors.description}
              helperText={errors.description}
              minRows={3}
              required
            />
          </Grid>
        </Grid>
      </AppDialog>

      {/* Confirm Delete Dialog */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTicketToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Confirm"
        content="Are you sure you want to delete this support ticket?"
      />

      {/* View Details & Reply Dialog */}
      <AppDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedTicket(null);
          setReplyText("");
        }}
        title="Support Ticket Details"
        maxWidth="md"
        actions={
          <AppButton variant="contained" onClick={() => setViewDialogOpen(false)}>
            Close
          </AppButton>
        }
      >
        {selectedTicket && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pb: 1.5,
                borderBottom: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ticket Number
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color={(t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")}
                >
                  {selectedTicket.ticketNo}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  label={selectedTicket.priority}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor:
                      selectedTicket.priority === "High"
                        ? "rgba(220, 38, 38, 0.12)"
                        : selectedTicket.priority === "Medium"
                          ? "rgba(234, 179, 8, 0.12)"
                          : "rgba(59, 130, 246, 0.12)",
                    color:
                      selectedTicket.priority === "High"
                        ? "#dc2626"
                        : selectedTicket.priority === "Medium"
                          ? "#d97706"
                          : "#2563eb",
                  }}
                />
                <Chip
                  label={selectedTicket.status}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor:
                      selectedTicket.status === "Resolved"
                        ? "rgba(22, 163, 74, 0.12)"
                        : selectedTicket.status === "In Progress"
                          ? "rgba(59, 130, 246, 0.12)"
                          : selectedTicket.status === "Open"
                            ? "rgba(220, 38, 38, 0.12)"
                            : "rgba(100, 116, 139, 0.12)",
                    color:
                      selectedTicket.status === "Resolved"
                        ? "#16a34a"
                        : selectedTicket.status === "In Progress"
                          ? "#2563eb"
                          : selectedTicket.status === "Open"
                            ? "#dc2626"
                            : "#64748b",
                  }}
                />
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Member Name
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {selectedTicket.memberName} {selectedTicket.memberId ? `(${selectedTicket.memberId})` : ""}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Related Event
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedTicket.relatedEvent || "--"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Ticket Type
                </Typography>
                <Typography variant="body2">{selectedTicket.ticketType}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Created Date
                </Typography>
                <Typography variant="body2">
                  {formatViewDateTime(selectedTicket.createdDate)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Subject
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {selectedTicket.subject}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: (t) =>
                      t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                    p: 1.5,
                    borderRadius: "8px",
                    border: (t) => `1px solid ${t.palette.divider}`,
                    lineHeight: 1.6,
                  }}
                >
                  {selectedTicket.description}
                </Typography>
              </Grid>
              {selectedTicket.attachment && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                    Attached Image
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: "10px",
                      bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
                      onClick={() => openImagePreview(selectedTicket.attachment, `${selectedTicket.ticketNo} - Attachment`)}
                    >
                      <Box
                        component="img"
                        src={selectedTicket.attachment}
                        alt="Attachment preview"
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: "1px solid rgba(0,0,0,0.12)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          bgcolor: "#fff",
                          "&:hover": { transform: "scale(1.05)" },
                          transition: "transform 0.2s ease",
                        }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          Image Attachment
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#0284c7" }}>
                          Click to view enlarged preview
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <AppButton
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon sx={{ fontSize: 16 }} />}
                        onClick={() => openImagePreview(selectedTicket.attachment, `${selectedTicket.ticketNo} - Attachment`)}
                      >
                        Preview
                      </AppButton>
                      <AppButton
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleDownloadImage(selectedTicket.attachment, `${selectedTicket.ticketNo}_attachment.png`)}
                      >
                        Download
                      </AppButton>
                    </Stack>
                  </Box>
                </Grid>
              )}
            </Grid>

            <Divider />

            {/* Quick Response Section */}
            <Box sx={{ bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#faf9fd", p: 2, borderRadius: "10px", border: (t) => `1px solid ${t.palette.divider}` }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                Reply & Update Ticket Status
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <AppTextArea
                    placeholder="Type resolution notes or reply message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    minRows={2}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <AppSelect
                    label="Update Status"
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    options={statusOptions.filter((o) => o.value !== "ALL")}
                    size="small"
                  />
                  <AppButton
                    variant="contained"
                    size="small"
                    startIcon={<SendIcon />}
                    onClick={handleSendReply}
                  >
                    Send Reply
                  </AppButton>
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}
      </AppDialog>

      {/* Image Preview / Lightbox Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
            bgcolor: "background.paper",
            p: 1.5,
          },
        }}
      >
        <DialogTitle sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {previewImageTitle}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <AppButton
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={() => handleDownloadImage(previewImageSrc, `${previewImageTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`)}
            >
              Download
            </AppButton>
            <IconButton size="small" onClick={() => setPreviewModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "#f8fafc", borderRadius: "10px" }}>
          {previewImageSrc && (
            <Box
              component="img"
              src={previewImageSrc}
              alt="Full Preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
