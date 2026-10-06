import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
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
  QuestionAnswer as ReplyActionIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatGridDate, formatViewDateTime, formatCreatedBy } from "../../utils/dateHelper";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import useAccessByLocation from "../../hooks/useAccessByLocation";
import { hasActionPermission } from "../../utils/rightsHelper";
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
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync } from "../../services/eventService";
import { getTicketTypesAsync } from "../../services/ticketTypeService";
import { getStatusesAsync } from "../../services/statusService";
import { getPrioritiesAsync } from "../../services/priorityService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const initialForm = {
  memberName: "",
  memberId: "",
  eventType: "",
  relatedEvent: "",
  ticketType: "",
  priority: "Medium",
  description: "",
  attachment: "",
  attachmentName: "",
};

export default function SupportTicketsPage() {
  const { authState } = useAuth();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  // Action-level feature IDs from navigation_menus (parent_id=12):
  // 49=Add support, 50=View details, 51=Verify, 52=Edit, 53=Delete
  const canViewTicket = hasActionPermission("View details", 50, authState?.role).canView;
  const canAddTicket = hasActionPermission("Add support", 49, authState?.role).canExecute && hasWriteAccess;
  const canEditTicket = hasActionPermission("Edit", 52, authState?.role).canExecute && hasWriteAccess;
  const canDeleteTicket = hasActionPermission("Delete", 53, authState?.role).canExecute && hasWriteAccess;
  const canVerifyTicket = hasActionPermission("Verify", 51, authState?.role).canExecute && hasWriteAccess;
  const canExportTicket = hasActionPermission("Export Support Ticket", 50, authState?.role).canExecute;

  const toast = useAppToast();
  const location = useLocation();
  const { addNotification } = useNotifications();

  const userRole = String(authState?.role || authState?.user?.roleName || "").trim().toLowerCase();
  const isMemberRole = userRole === "member";
  const isNameLocked = isMemberRole || Boolean(location.state?.raiseTicket) || Boolean(location.state?.memberName);

  const getLoggedInMember = () => {
    const rawName = (
      authState?.fullName ||
      authState?.name ||
      authState?.user?.fullName ||
      authState?.user?.name ||
      authState?.username ||
      ""
    ).trim();
    if (!rawName) return { name: "", id: "" };
    const matched = membersList.find((m) => {
      const mName = (m.name || m.memberName || "").trim().toLowerCase();
      return (
        mName === rawName.toLowerCase() ||
        (m.email && authState?.email && m.email.toLowerCase() === authState.email.toLowerCase()) ||
        (m.username && authState?.username && m.username.toLowerCase() === authState.username.toLowerCase())
      );
    });
    return {
      name: matched?.name || matched?.memberName || rawName,
      id: matched?.memberId || matched?.id || "",
    };
  };

  const [tickets, setTickets] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [dbTicketTypes, setDbTicketTypes] = useState([]);
  const [dbStatuses, setDbStatuses] = useState([]);
  const [dbPriorities, setDbPriorities] = useState([]);
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
    try {
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
        setErrors((prev) => {
          const next = { ...prev };
          delete next.attachment;
          return next;
        });
        toast.success(`Image "${file.name}" attached successfully!`);
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to process attachment");
    }
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
    } catch {
      toast.error("Could not download image");
    }
  };

  // Reply & Update Status dialog state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyTicket, setReplyTicket] = useState(null);
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
    } catch {
      toast.error(TOAST_MESSAGES.GENERAL.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [membersRes, eventsRes, eventTypesRes, ticketTypesRes, statusesRes, prioritiesRes] = await Promise.all([
        getMembersAsync().catch(() => []),
        getEventsAsync().catch(() => []),
        getEventTypesAsync().catch(() => []),
        getTicketTypesAsync(true).catch(() => []),
        getStatusesAsync(true).catch(() => []),
        getPrioritiesAsync(true).catch(() => []),
      ]);
      if (Array.isArray(membersRes)) setMembersList(membersRes);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
      if (Array.isArray(ticketTypesRes)) setDbTicketTypes(ticketTypesRes);
      if (Array.isArray(statusesRes)) setDbStatuses(statusesRes);
      if (Array.isArray(prioritiesRes)) setDbPriorities(prioritiesRes);
    } catch {
      toast.error("Failed to load lookup data for tickets");
    }
  };

  useEffect(() => {
    fetchTicketsFromDb();
    fetchLookupData();
  }, []);

  useEffect(() => {
    if (location.state?.raiseTicket) {
      setEditingTicket(null);
      const relEvent = location.state.relatedEvent || "";
      const matchedEvent = (eventsList || []).find(
        (ev) => (ev.eventName || ev.name || ev.title) === relEvent
      );
      const derivedType = location.state.eventType || matchedEvent?.eventTypeName || matchedEvent?.categoryName || matchedEvent?.eventType || "";

      const loggedIn = getLoggedInMember();
      const memberName = location.state.memberName || loggedIn.name || authState?.fullName || "";
      const memberId = location.state.memberId || loggedIn.id || "";

      setForm({
        ...initialForm,
        memberName,
        memberId,
        eventType: derivedType,
        relatedEvent: relEvent,
        ticketType: "Payment Issue",
        subject: `Payment Issue - ${relEvent || "Contribution"}`,
        description: "",
        priority: "High",
      });
      setDialogOpen(true);
    }
  }, [location.state, eventsList]);

  // Reactive fallback: sync Event Type when eventsList loads or relatedEvent changes
  useEffect(() => {
    if (form.relatedEvent && !form.eventType && eventsList.length > 0) {
      const matched = eventsList.find(
        (ev) => (ev.eventName || ev.name || ev.title) === form.relatedEvent
      );
      const derivedType = matched?.eventTypeName || matched?.categoryName || matched?.eventType || "";
      if (derivedType) {
        setForm((prev) => ({ ...prev, eventType: derivedType }));
      }
    }
  }, [eventsList, form.relatedEvent, form.eventType]);

  // Dynamically derive member options from DB members
  const memberOptions = useMemo(() => {
    const list = [{ label: "Select Member", value: "" }];
    const unique = new Set();
    membersList.forEach((m) => {
      const name = m.name || m.memberName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({
          label: name,
          value: name,
        });
      }
    });
    return list;
  }, [membersList]);

  // Dynamically derive event type options from DB event types and events
  const eventTypeOptions = useMemo(() => {
    const list = [{ label: "Select Event Type", value: "" }];
    const unique = new Set();

    (eventTypesList || [])
      .filter((t) => t.isActive !== false)
      .forEach((t) => {
        const name = t.eventTypeName || t.typeName || t.name;
        if (name && !unique.has(name.toLowerCase())) {
          unique.add(name.toLowerCase());
          list.push({ label: name, value: name });
        }
      });

    (eventsList || []).forEach((e) => {
      const type = e.eventTypeName || e.categoryName || e.eventType;
      if (type && !unique.has(type.toLowerCase())) {
        unique.add(type.toLowerCase());
        list.push({ label: type, value: type });
      }
    });

    return list;
  }, [eventTypesList, eventsList]);

  // Dynamically derive event name options filtered against selected eventType
  const eventNameOptions = useMemo(() => {
    const list = [{ label: "Select Event Name", value: "" }];
    const unique = new Set();

    const filtered = (eventsList || []).filter((e) => {
      if (!form.eventType) return true;
      const eType = (e.eventTypeName || e.categoryName || e.eventType || "").trim().toLowerCase();
      return eType === form.eventType.trim().toLowerCase();
    });

    filtered.forEach((e) => {
      const name = e.eventName || e.name || e.title;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({ label: name, value: name });
      }
    });

    return list;
  }, [eventsList, form.eventType]);

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

  // Dynamically derive priority options strictly from DB priorities table
  const priorityOptions = useMemo(() => {
    const list = Array.isArray(dbPriorities)
      ? dbPriorities
        .filter((p) => p.priorityName && p.isActive !== false)
        .map((p) => ({ label: p.priorityName, value: p.priorityName }))
      : [];

    return [
      { label: "All Priorities", value: "ALL" },
      ...(list.length > 0
        ? list
        : [
          { label: "High", value: "High" },
          { label: "Medium", value: "Medium" },
          { label: "Low", value: "Low" },
        ]),
    ];
  }, [dbPriorities]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      if (appliedType !== "ALL" && item.ticketType !== appliedType) return false;
      if (appliedPriority !== "ALL" && item.priority !== appliedPriority) return false;
      if (appliedStatus !== "ALL" && item.status !== appliedStatus) return false;
      return true;
    });
  }, [tickets, appliedType, appliedPriority, appliedStatus]);

  const getEventDetails = (relatedEvent) => {
    if (!relatedEvent) return { eventType: "--", eventName: "--" };

    const cleanStr = String(relatedEvent).trim();

    // Check if it matches an existing event
    const matchedEvent = (eventsList || []).find(
      (e) => (e.eventName || e.name || e.title)?.trim().toLowerCase() === cleanStr.toLowerCase()
    );
    if (matchedEvent) {
      const type = matchedEvent.eventTypeName || matchedEvent.categoryName || matchedEvent.eventType || "--";
      const name = matchedEvent.eventName || matchedEvent.name || matchedEvent.title || cleanStr;
      return { eventType: type, eventName: name };
    }

    // Check if it directly matches an event type
    const matchedType = (eventTypesList || []).find(
      (t) => (t.eventTypeName || t.typeName || t.name)?.trim().toLowerCase() === cleanStr.toLowerCase()
    );
    if (matchedType) {
      return {
        eventType: matchedType.eventTypeName || matchedType.typeName || matchedType.name || cleanStr,
        eventName: "--",
      };
    }

    // If it contains a birthday / event type keyword
    const typeKeywordMatch = (eventTypesList || []).find((t) => {
      const tName = (t.eventTypeName || t.typeName || t.name || "").trim().toLowerCase();
      return tName && cleanStr.toLowerCase().includes(tName);
    });
    if (typeKeywordMatch) {
      return {
        eventType: typeKeywordMatch.eventTypeName || typeKeywordMatch.typeName || typeKeywordMatch.name,
        eventName: cleanStr,
      };
    }

    return { eventType: "--", eventName: cleanStr };
  };

  const processedTickets = useMemo(() => {
    return filteredTickets.map((item) => {
      const details = getEventDetails(item.relatedEvent);
      return {
        ...item,
        eventType: details.eventType,
        eventName: details.eventName,
      };
    });
  }, [filteredTickets, eventsList, eventTypesList]);

  const handleEditTicket = (row) => {
    setEditingTicket(row);
    const matchedEvent = (eventsList || []).find(
      (ev) => (ev.eventName || ev.name || ev.title) === row.relatedEvent
    );
    const derivedType = matchedEvent?.eventTypeName || matchedEvent?.categoryName || matchedEvent?.eventType || "";

    setForm({
      memberName: row.memberName || "",
      memberId: row.memberId || "",
      eventType: derivedType,
      relatedEvent: row.relatedEvent || "",
      ticketType: row.ticketType || "",
      priority: row.priority || "Medium",
      status: row.status || "Open",
      description: row.description || "",
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
    if (!ticketToDelete || !canDeleteTicket) return;
    const ticketId = ticketToDelete.ticketId || ticketToDelete.id;

    try {
      await deleteSupportTicketAsync(ticketId);
      toast.success(TOAST_MESSAGES.SUPPORT.DELETED_SUCCESS || TOAST_MESSAGES.GENERAL.DELETED_SUCCESS);
      await fetchTicketsFromDb();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.DELETE_FAILED);
    } finally {
      setDeleteConfirmOpen(false);
      setTicketToDelete(null);
    }
  };

  const handleSaveTicket = async () => {
    if (editingTicket && !canEditTicket) return;
    if (!editingTicket && !canAddTicket) return;

    const newErrors = {};
    if (!form.memberName) newErrors.memberName = "Member Name is required";
    if (!form.ticketType) newErrors.ticketType = "Ticket Type is required";
    if (!form.description || !form.description.trim()) newErrors.description = "Description is required";
    if (!form.attachment && (!editingTicket || !editingTicket.attachment)) {
      newErrors.attachment = "Attachment is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
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
          description: form.description,
          priority: form.priority,
          status: editingTicket.status || "Open",
          attachment: form.attachment || null,
        });
        toast.success(TOAST_MESSAGES.SUPPORT.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
      } else {
        const nextIdx = tickets.length + 1;
        const newTicketNo = `TKT-2026-${String(nextIdx).padStart(3, "0")}`;

        const created = await createSupportTicketAsync({
          ticketNo: newTicketNo,
          memberName: form.memberName,
          memberId: resolvedMemberId || "",
          relatedEvent: form.relatedEvent || "",
          ticketType: form.ticketType,
          description: form.description,
          priority: form.priority,
          status: "Open",
          attachment: form.attachment || null,
        });

        const actualTicketNo = created?.ticketNo || newTicketNo;

        // Trigger notification for Authority/Admin
        addNotification({
          type: "TICKET_RAISED",
          title: `Support Ticket Raised: ${actualTicketNo}`,
          message: `Member ${form.memberName || authState?.fullName || "User"} raised support ticket #${actualTicketNo}.`,
          ticketNo: actualTicketNo,
          targetRole: "Authority",
          link: "/support-tickets",
        });

        toast.success(TOAST_MESSAGES.SUPPORT.CREATED_SUCCESS || TOAST_MESSAGES.GENERAL.CREATED_SUCCESS);
      }

      setDialogOpen(false);
      setEditingTicket(null);
      setForm(initialForm);
      setErrors({});
      await fetchTicketsFromDb();
    } catch (err) {
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  };

  const handleSendReply = async () => {
    if (!replyTicket || !canVerifyTicket) return;
    const ticketId = replyTicket.ticketId || replyTicket.id;
    const hasNote = replyText && replyText.trim().length > 0;
    const statusChanged = replyStatus !== replyTicket.status;

    if (!hasNote && !statusChanged) {
      toast.error("Please enter a reply note or select a new status.");
      return;
    }

    try {
      if (hasNote) {
        await replySupportTicketAsync(ticketId, {
          message: replyText.trim(),
          replyMessage: replyText.trim(),
          status: replyStatus,
        });
      }
      if (!hasNote && statusChanged) {
        await updateSupportTicketAsync(ticketId, {
          memberName: replyTicket.memberName,
          memberId: replyTicket.memberId || "",
          relatedEvent: replyTicket.relatedEvent || "",
          ticketType: replyTicket.ticketType,
          description: replyTicket.description,
          priority: replyTicket.priority,
          status: replyStatus,
          attachment: replyTicket.attachment || null,
        });
      }
      toast.success(TOAST_MESSAGES.SUPPORT.STATUS_UPDATED || "Support ticket updated successfully!");
      setReplyDialogOpen(false);
      setReplyTicket(null);
      setReplyText("");
      await fetchTicketsFromDb();
    } catch (err) {
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={canViewTicket ? "View Details" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canViewTicket ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canViewTicket}
                onClick={() => {
                  setSelectedTicket(row);
                  setViewDialogOpen(true);
                }}
              >
                <ViewIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canViewTicket
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
          <Tooltip title={canVerifyTicket ? "Verify Ticket" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canVerifyTicket ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canVerifyTicket}
                onClick={() => {
                  setReplyTicket(row);
                  setReplyStatus(row.status || "In Progress");
                  setReplyText("");
                  setReplyDialogOpen(true);
                }}
              >
                <ReplyActionIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canVerifyTicket
                        ? theme.palette.mode === "dark"
                          ? "#38bdf8"
                          : "#0284c7"
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.45)"
                          : "#94a3b8",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={canEditTicket ? "Edit" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canEditTicket ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canEditTicket}
                onClick={() => handleEditTicket(row)}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canEditTicket
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
          <Tooltip title={canDeleteTicket ? "Delete" : "Disabled"}>
            <span style={{ display: "inline-flex", cursor: !canDeleteTicket ? "not-allowed" : "pointer" }}>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!canDeleteTicket}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      canDeleteTicket
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
        </Box>
      ),
    },
    {
      label: "Ticket No",
      key: "ticketNo",
      render: (row) => row.ticketNo || "--",
    },
    {
      label: "Member Name",
      key: "memberName",
      render: (row) => {
        let name = row.memberName;
        if (!name && row.memberId) {
          const matched = membersList.find((m) => (m.memberId || m.id) === row.memberId);
          name = matched?.name || matched?.memberName;
        }
        const cleanName = (name || "").replace(/\s*\([0-9a-fA-F-]{36}\)/g, "").trim() || name || "--";
        return cleanName;
      },
    },

    {
      label: "Event Type",
      key: "eventType",
      render: (row) => row.eventType || "--",
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (row) => row.eventName || "--",
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
      render: (row) => formatCreatedBy(row.createdBy || row.CreatedBy),
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Support Tickets"
        columns={columns}
        data={processedTickets}
        loading={loading}
        allowExport={canExportTicket}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="contained"
              size="small"
              disabled={!canAddTicket}
              startIcon={<AddIcon />}
              onClick={() => {
                const firstTicketType = dbTicketTypes.find((t) => t.isActive !== false)?.typeName || "";
                const firstStatus = dbStatuses.find((s) => s.isActive !== false)?.statusName || "";
                const loggedIn = getLoggedInMember();
                const defaultEvent = eventsList.length > 0 ? eventsList[0] : null;
                const defaultEventName = defaultEvent ? (defaultEvent.eventName || defaultEvent.name || defaultEvent.title || "") : "";
                const defaultEventType = defaultEvent ? (defaultEvent.eventTypeName || defaultEvent.categoryName || defaultEvent.eventType || "") : "";

                setEditingTicket(null);
                setForm({
                  ...initialForm,
                  memberName: loggedIn.name || authState?.fullName || "",
                  memberId: loggedIn.id || "",
                  relatedEvent: defaultEventName,
                  eventType: defaultEventType,
                  ticketType: firstTicketType || "Payment Issue",
                  status: firstStatus,
                  description: "",
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
              <Box sx={{ minWidth: 160 }}>
                <AppSelect
                  label="Select Ticket Type"
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                  }}
                  options={ticketTypeOptions}
                  size="small"
                  placeholder="Select Ticket Type"
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
              disabled={isNameLocked}
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
              label="Event Type"
              placeholder="Select Event Type"
              value={form.eventType}
              onChange={(e) => {
                const selectedType = e.target.value;
                setForm((c) => {
                  const matchingEvents = (eventsList || []).filter(
                    (ev) => (ev.eventTypeName || ev.categoryName || ev.eventType || "").trim().toLowerCase() === selectedType.trim().toLowerCase()
                  );
                  const currentMatches = matchingEvents.some(
                    (ev) => (ev.eventName || ev.name || ev.title) === c.relatedEvent
                  );
                  const newRelatedEvent = currentMatches
                    ? c.relatedEvent
                    : (matchingEvents.length === 1 ? (matchingEvents[0].eventName || matchingEvents[0].name || matchingEvents[0].title) : "");

                  return {
                    ...c,
                    eventType: selectedType,
                    relatedEvent: newRelatedEvent,
                  };
                });
              }}
              options={eventTypeOptions}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              placeholder="Select Event Name"
              value={form.relatedEvent}
              onChange={(e) => {
                const selectedName = e.target.value;
                const matched = (eventsList || []).find(
                  (ev) => (ev.eventName || ev.name || ev.title) === selectedName
                );
                const matchedType = matched?.eventTypeName || matched?.categoryName || matched?.eventType || "";

                setForm((c) => ({
                  ...c,
                  relatedEvent: selectedName,
                  eventType: matchedType || c.eventType,
                }));
              }}
              options={eventNameOptions}
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
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: (t) => t.palette.mode === "dark" ? "#e2e8f0" : "#334155" }}>
                  Attachment (1 Image, Max 3MB) <span style={{ color: "#ef4444" }}>*</span>
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
                    border: errors.attachment ? "1.5px dashed #ef4444" : "1.5px dashed",
                    borderColor: errors.attachment
                      ? "#ef4444"
                      : ((t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)"),
                    borderRadius: "10px",
                    p: 1.1,
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    cursor: "pointer",
                    bgcolor: errors.attachment
                      ? "rgba(239, 68, 68, 0.05)"
                      : ((t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)"),
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: errors.attachment
                        ? "#dc2626"
                        : ((t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
                      bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.07)",
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 20, color: errors.attachment ? "#ef4444" : ((t) => t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b") }} />
                  <Typography variant="caption" fontWeight={600} sx={{ color: errors.attachment ? "#ef4444" : "text.secondary" }}>
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
              {errors.attachment && (
                <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 600, mt: 0.3, px: 0.5 }}>
                  {errors.attachment}
                </Typography>
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
        title={COMMON_STRINGS.DIALOGS.CONFIRM_TITLE}
        content={COMMON_STRINGS.DIALOGS.DELETE_CONFIRM_MSG}
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
                  {(() => {
                    let name = selectedTicket.memberName;
                    if (!name && selectedTicket.memberId) {
                      const matched = membersList.find((m) => (m.memberId || m.id) === selectedTicket.memberId);
                      name = matched?.name || matched?.memberName;
                    }
                    if (!name) return "--";
                    return name.replace(/\s*\([0-9a-fA-F-]{36}\)/g, "").trim() || name;
                  })()}
                </Typography>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Name
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedTicket.relatedEvent || "--"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Type
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(() => {
                    const matchedEvent = (eventsList || []).find(
                      (ev) => (ev.eventName || ev.name || ev.title) === selectedTicket.relatedEvent
                    );
                    return matchedEvent?.eventTypeName || matchedEvent?.categoryName || matchedEvent?.eventType || "--";
                  })()}
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
          </Box>
        )}
      </AppDialog>

      {/* Reply & Update Ticket Status Modal */}
      <AppDialog
        open={replyDialogOpen}
        onClose={() => {
          setReplyDialogOpen(false);
          setReplyTicket(null);
          setReplyText("");
        }}
        title="Verify Support Ticket"
        maxWidth="sm"
        actions={
          <Stack direction="row" spacing={1.5}>
            <AppButton
              variant="outlined"
              onClick={() => {
                setReplyDialogOpen(false);
                setReplyTicket(null);
                setReplyText("");
              }}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSendReply}
            >
              Update Ticket
            </AppButton>
          </Stack>
        }
      >
        {replyTicket && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Quick Ticket Summary Card */}
            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                border: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Member Name
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {replyTicket.memberName || "--"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Current Status
                  </Typography>
                  <Box sx={{ mt: 0.2 }}>
                    <Chip
                      label={replyTicket.status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor:
                          replyTicket.status === "Resolved" || replyTicket.status === "Closed"
                            ? "rgba(22, 163, 74, 0.12)"
                            : replyTicket.status === "In Progress"
                              ? "rgba(2, 132, 199, 0.12)"
                              : "rgba(234, 179, 8, 0.15)",
                        color:
                          replyTicket.status === "Resolved" || replyTicket.status === "Closed"
                            ? "#16a34a"
                            : replyTicket.status === "In Progress"
                              ? "#0284c7"
                              : "#d97706",
                      }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ticket Type
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {replyTicket.ticketType}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Priority
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {replyTicket.priority}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppSelect
                  label="Update Status"
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  options={statusOptions.filter((o) => o.value !== "ALL")}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AppTextArea
                  label="Resolution Notes / Reply Message"
                  placeholder="Type resolution notes or reply message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  minRows={3}
                />
              </Grid>
            </Grid>
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
