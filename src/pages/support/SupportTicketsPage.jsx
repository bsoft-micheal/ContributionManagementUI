import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatGridDate, formatViewDateTime } from "../../utils/dateHelper";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
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

const initialForm = {
  memberName: "",
  memberId: "",
  relatedEvent: "",
  ticketType: "",
  priority: "Medium",
  status: "Open",
  subject: "",
  description: "",
  assignedTo: "",
};

const priorityOptions = [
  { label: "All Priorities", value: "ALL" },
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];

const statusOptions = [
  { label: "All Statuses", value: "ALL" },
  { label: "Open", value: "Open" },
  { label: "In Progress", value: "In Progress" },
  { label: "Resolved", value: "Resolved" },
  { label: "Closed", value: "Closed" },
];

export default function SupportTicketsPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Support Tickets", authState?.role);
  const hasWriteAccess = rights?.write !== undefined ? rights.write : true;
  const toast = useAppToast();

  const [tickets, setTickets] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

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
          assignedTo: item.assignedTo || "Admin",
          createdDate: item.createdOn || new Date().toISOString(),
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
      const [membersRes, eventsRes] = await Promise.all([
        GetMembersAsync().catch(() => []),
        GetEventsAsync().catch(() => []),
      ]);
      if (Array.isArray(membersRes)) setMembersList(membersRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
    } catch (err) {
      console.warn("Failed to load members or events lookup data:", err);
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

  // Dynamically derive ticket types from DB tickets + default categories
  const ticketTypeOptions = useMemo(() => {
    const set = new Set();
    tickets.forEach((t) => {
      if (t.ticketType) set.add(t.ticketType);
    });
    ["Payment Issue", "Event Clarification", "Application Issue", "Feedback", "Other"].forEach((st) => set.add(st));
    return [
      { label: "All Types", value: "ALL" },
      ...Array.from(set).map((t) => ({ label: t, value: t })),
    ];
  }, [tickets]);

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
          ticketType: form.ticketType,
          subject: form.subject,
          description: form.description,
          priority: form.priority,
          status: form.status,
          assignedTo: form.assignedTo || "",
          relatedEvent: form.relatedEvent || "",
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
          <Tooltip title={hasWriteAccess ? "Edit" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleEditTicket(row)}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.05rem",
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
          <Tooltip title={hasWriteAccess ? "Delete" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.05rem",
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
      render: (row) => row.assignedTo || "Admin",
    },
    {
      label: "Created Date",
      key: "createdDate",
      render: (row) => formatGridDate(row.createdDate),
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
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingTicket(null);
                setForm(initialForm);
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
              <Box sx={{ minWidth: 200 }}>
                <AppSelect
                  label="Select Ticket Type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
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
                  onChange={(e) => setFilterPriority(e.target.value)}
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
                  onChange={(e) => setFilterStatus(e.target.value)}
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
                onClick={() => {
                  setAppliedType(filterType);
                  setAppliedPriority(filterPriority);
                  setAppliedStatus(filterStatus);
                }}
                sx={{
                  bgcolor: "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: "#3b325c !important" },
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
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(74, 63, 107, 0.3)",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                  "&:hover": {
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(74, 63, 107, 0.04)",
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
              options={statusOptions}
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
          <Grid size={{ xs: 12 }}>
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
                  <Typography variant="caption" color="text.secondary">
                    Attachment
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#4a3f6b", fontWeight: 600, mt: 0.5 }}>
                    📎 {selectedTicket.attachment}
                  </Typography>
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
    </div>
  );
}
