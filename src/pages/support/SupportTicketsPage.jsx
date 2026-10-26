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
  Alert,
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
  RestartAlt as RestartAltIcon,
  Save as SaveIcon,
  MarkChatRead as MarkChatReadIcon,
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
import AppButton, { AppAddButton, AppCancelButton, AppSaveButton } from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import VerifySupportTicketModal from "../../components/support/VerifySupportTicketModal";
import {
  getSupportTicketsAsync,
  getSupportTicketByIdAsync,
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
  eventId: null,
  eventType: "",
  relatedEvent: "",
  ticketType: "",
  priority: "",
  description: "",
  attachment: "",
  attachmentName: "",
};

export default function SupportTicketsPage() {
  const location = useLocation();
  const toast = useAppToast();
  const { authState } = useAuth();
  const { addNotification } = useNotifications();
  const { canEdit } = useAccessByLocation();
  const hasWriteAccess = canEdit;

  const userRole = String(authState?.role || authState?.user?.roleName || "").trim().toLowerCase();
  const isAdminOrOrg = userRole === "admin" || userRole === "organizer";
  const isMemberRole = userRole === "member";
  const isNameLocked = true;

  // Action-level feature IDs from navigation_menus (parent_id=12):
  // 49=Add support, 50=View details, 51=Verify, 52=Edit, 53=Delete
  const canViewTicket = hasActionPermission("View details", 50, authState?.role).canView;
  const canAddTicket = hasActionPermission("Add support", 49, authState?.role).canExecute;
  const canEditTicket = hasActionPermission("Edit", 52, authState?.role).canExecute;
  const canDeleteTicket = hasActionPermission("Delete", 53, authState?.role).canExecute;
  const canVerifyTicket = hasActionPermission("Verify", 51, authState?.role).canExecute;
  const canExportTicket = hasActionPermission("Export Support Ticket", 50, authState?.role).canExecute;

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
  const [isSaving, setIsSaving] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [removeAttachmentConfirmOpen, setRemoveAttachmentConfirmOpen] = useState(false);

  const savedFormRef = useRef(null);

  const isFormDirty = React.useCallback(() => {
    if (!dialogOpen || !savedFormRef.current) return false;
    const s = savedFormRef.current;

    if ((form.memberName || "").trim() !== (s.memberName || "").trim()) return true;
    if ((form.eventType || "").trim() !== (s.eventType || "").trim()) return true;
    if ((form.relatedEvent || "").trim() !== (s.relatedEvent || "").trim()) return true;
    if ((form.ticketType || "").trim() !== (s.ticketType || "").trim()) return true;
    if ((form.priority || "").trim() !== (s.priority || "").trim()) return true;
    if ((form.description || "").trim() !== (s.description || "").trim()) return true;

    // Compare attachment
    if ((form.attachment || "") !== (s.attachment || "")) return true;
    if ((form.attachmentName || "") !== (s.attachmentName || "")) return true;

    return false;
  }, [dialogOpen, form]);

  const handleCloseDialog = React.useCallback(() => {
    setDialogOpen(false);
    setEditingTicket(null);
    setErrors({});
    savedFormRef.current = null;
  }, []);

  const { handleCancelRequest, UnsavedChangesDialog } = useUnsavedChanges({
    isDirty: isFormDirty,
    onQuit: handleCloseDialog,
  });

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

      const MAX_SIZE = 6 * 1024 * 1024; // 6MB limit
      if (file.size > MAX_SIZE) {
        toast.error("Image size exceeds maximum limit of 6 MB");
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
    setRemoveAttachmentConfirmOpen(true);
  };

  const handleConfirmRemoveAttachment = () => {
    setForm((c) => ({
      ...c,
      attachment: "",
      attachmentName: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setRemoveAttachmentConfirmOpen(false);
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
  const [replyErrors, setReplyErrors] = useState({});

  // Filter state inside AppDataTable filterPanel
  const initialEventFilter = location.state?.relatedEvent || location.state?.eventName || "ALL";
  const [filterType, setFilterType] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState(initialEventFilter);
  const [appliedType, setAppliedType] = useState("ALL");
  const [appliedPriority, setAppliedPriority] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [appliedEvent, setAppliedEvent] = useState(initialEventFilter);

  useEffect(() => {
    if (location.state?.relatedEvent || location.state?.eventName) {
      const ev = location.state.relatedEvent || location.state.eventName;
      setFilterEvent(ev);
      setAppliedEvent(ev);
    }
  }, [location.state?.relatedEvent, location.state?.eventName]);

  const fetchTicketsFromDb = async () => {
    try {
      setLoading(true);
      const data = await getSupportTicketsAsync();
      if (Array.isArray(data)) {
        const mapped = data.map((item, idx) => ({
          id: item.ticketId || item.id || `TKT${String(idx + 1).padStart(4, "0")}`,
          ticketId: item.ticketId || item.id,
          ticketNo: item.ticketNo || `TKT${String(idx + 1).padStart(4, "0")}`,
          memberName: item.memberName || "",
          memberId: item.memberId || "",
          eventId: item.eventId || item.EventId || null,
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
          resolutionNotes: item.resolutionNotes || item.replyMessage || item.resolution || "",
          modifiedOn: item.modifiedOn || null,
          modifiedBy: item.modifiedBy || null,
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
        getStatusesAsync(true, "Support Ticket").catch(() => []),
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
      const relEvent = location.state.relatedEvent || location.state.eventName || "";
      const matchedEvent = (eventsList || []).find(
        (ev) => (ev.eventName || ev.name || ev.title) === relEvent || (location.state?.eventId && (ev.eventId === location.state.eventId || ev.id === location.state.eventId))
      );
      const derivedType = location.state.eventType || matchedEvent?.eventTypeName || matchedEvent?.categoryName || matchedEvent?.eventType || "";

      const loggedIn = getLoggedInMember();
      const memberName = location.state.memberName || loggedIn.name || authState?.fullName || "";
      const memberId = location.state.memberId || loggedIn.id || "";

      setForm({
        ...initialForm,
        memberName,
        memberId,
        eventId: location.state?.eventId || matchedEvent?.eventId || matchedEvent?.id || null,
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

  // Specific status options for Verify Support Ticket modal (Pending & Verified)
  const ticketVerifyStatusOptions = useMemo(() => {
    const list = [
      { label: "Pending", value: "Pending" },
      { label: "Verified", value: "Verified" },
    ];
    if (replyTicket?.status && !["Pending", "Verified"].includes(replyTicket.status) && replyTicket.status !== "Paid") {
      list.unshift({ label: replyTicket.status, value: replyTicket.status });
    }
    return list;
  }, [replyTicket?.status]);

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

  // Dynamically derive event options for the event filter
  const filterEventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const seen = new Set();
    (eventsList || []).forEach((e) => {
      const name = e.eventName || e.name || e.title;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });
    (tickets || []).forEach((t) => {
      const name = t.relatedEvent || t.eventName;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });
    return list;
  }, [eventsList, tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      if (appliedType !== "ALL" && item.ticketType !== appliedType) return false;
      if (appliedPriority !== "ALL" && item.priority !== appliedPriority) return false;
      if (appliedStatus !== "ALL" && item.status !== appliedStatus) return false;
      if (appliedEvent !== "ALL") {
        const cleanApplied = appliedEvent.trim().toLowerCase();
        const itemEvent = (item.relatedEvent || item.eventName || "").trim().toLowerCase();
        const targetEventId = location.state?.eventId;
        const matchesEventId = targetEventId && item.eventId && String(item.eventId).toLowerCase() === String(targetEventId).toLowerCase();
        if (!matchesEventId && itemEvent !== cleanApplied && !itemEvent.includes(cleanApplied) && !cleanApplied.includes(itemEvent)) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, appliedType, appliedPriority, appliedStatus, appliedEvent, location.state?.eventId]);

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

  const getVerifiedByName = (ticket) => {
    if (!ticket) return "";
    if (ticket.verifiedBy && ticket.verifiedBy !== "--") return ticket.verifiedBy;

    // Extract verifier name from resolution notes if formatted like "[16 Oct 2026, 10:26 AM] Daniel A: ..."
    if (ticket.resolutionNotes) {
      const match = ticket.resolutionNotes.match(/\[.*?\]\s*([^:\n\r]+):/);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }

    if (ticket.assignedTo && ticket.assignedTo !== "--") return ticket.assignedTo;

    // Check modifiedBy against membersList
    if (ticket.modifiedBy) {
      const matched = (membersList || []).find(
        (m) =>
          String(m.memberId || m.id || m.userId).toLowerCase() ===
          String(ticket.modifiedBy).toLowerCase()
      );
      if (matched?.name) return matched.name;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.modifiedBy)) {
        return ticket.modifiedBy;
      }
    }

    return "";
  };

  const cleanResolutionNotes = (notes) => {
    if (!notes) return "";
    return notes
      .split("\n")
      .map((line) => line.replace(/^\[.*?\]\s*[^:\n\r]+:\s*/, ""))
      .join("\n")
      .trim();
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

  const isTicketVerified = (status) => {
    const s = String(status || "").trim().toLowerCase();
    return ["verified", "resolved", "closed"].some((v) => s.includes(v));
  };

  // Helper: Find active/unverified ticket for a specific ticket type on an event
  const getUnverifiedTicketForType = (
    typeVal,
    targetMemberName,
    targetMemberId,
    targetEventId,
    targetEventName,
    excludeTicketId
  ) => {
    if (!typeVal) return null;
    const cleanType = String(typeVal).trim().toLowerCase();
    const loggedIn = getLoggedInMember();
    const mName = String(targetMemberName || loggedIn.name || authState?.fullName || authState?.username || "").trim().toLowerCase();
    const mId = String(targetMemberId || loggedIn.id || authState?.memberId || authState?.user?.userId || "").trim().toLowerCase();
    const cleanEventId = String(targetEventId || "").trim().toLowerCase();
    const cleanEventName = String(targetEventName || "").trim().toLowerCase();
    const cleanExcludeId = String(excludeTicketId || "").trim().toLowerCase();

    return (tickets || []).find((t) => {
      if (cleanExcludeId) {
        const tId = String(t.ticketId || t.id || "").trim().toLowerCase();
        if (tId && tId === cleanExcludeId) return false;
      }

      if (isTicketVerified(t.status)) return false;

      const tType = String(t.ticketType || "").trim().toLowerCase();
      if (tType !== cleanType) return false;

      // Event match: if event is specified, ticket must match that event
      if (cleanEventId || cleanEventName) {
        const tEventId = String(t.eventId || "").trim().toLowerCase();
        const tEventName = String(t.relatedEvent || "").trim().toLowerCase();

        const matchesEventId = Boolean(cleanEventId && tEventId && tEventId === cleanEventId);
        const matchesEventName = Boolean(cleanEventName && tEventName && tEventName === cleanEventName);

        if (!matchesEventId && !matchesEventName) {
          return false;
        }
      }

      if (isMemberRole && !isAdminOrOrg) return true;

      const tName = (t.memberName || "").trim().toLowerCase();
      const tId = String(t.memberId || "").trim().toLowerCase();
      const tCreatedBy = (t.createdBy || "").trim().toLowerCase();

      if (mName || mId) {
        const matchesName = mName && (tName === mName || tCreatedBy === mName);
        const matchesId = mId && (tId === mId || tCreatedBy === mId);
        return matchesName || matchesId;
      }

      return true;
    });
  };

  // Active unverified tickets for current member
  const memberActiveUnverifiedTickets = useMemo(() => {
    const loggedIn = getLoggedInMember();
    const mName = String(loggedIn.name || authState?.fullName || authState?.username || "").trim().toLowerCase();
    const mId = String(loggedIn.id || authState?.memberId || authState?.user?.userId || "").trim().toLowerCase();

    return (tickets || []).filter((t) => {
      if (isTicketVerified(t.status)) return false;
      if (isMemberRole && !isAdminOrOrg) return true;

      const tName = (t.memberName || "").trim().toLowerCase();
      const tId = String(t.memberId || "").trim().toLowerCase();
      const tCreatedBy = (t.createdBy || "").trim().toLowerCase();

      const matchesName = mName && (tName === mName || tCreatedBy === mName);
      const matchesId = mId && (tId === mId || tCreatedBy === mId);

      return matchesName || matchesId;
    });
  }, [tickets, authState, isMemberRole, isAdminOrOrg, membersList]);

  // Check if unverified ticket exists for currently selected form.ticketType on selected event
  const unverifiedTicketForSelectedType = useMemo(() => {
    const currentTicketId = editingTicket ? (editingTicket.ticketId || editingTicket.id) : null;
    return getUnverifiedTicketForType(
      form.ticketType,
      form.memberName,
      form.memberId,
      form.eventId,
      form.relatedEvent,
      currentTicketId
    );
  }, [
    form.ticketType,
    form.memberName,
    form.memberId,
    form.eventId,
    form.relatedEvent,
    editingTicket,
    tickets,
    authState,
    isMemberRole,
    isAdminOrOrg,
    membersList,
  ]);

  // List of active ticket types from master data
  const masterTicketTypeNames = useMemo(() => {
    return (dbTicketTypes || [])
      .filter((t) => t.isActive !== false && t.typeName)
      .map((t) => t.typeName);
  }, [dbTicketTypes]);

  // Whether all available ticket types already have active tickets across all available events for the member
  const allTicketTypesOccupied = useMemo(() => {
    if (!isMemberRole || !masterTicketTypeNames.length || !eventsList?.length) return false;
    const loggedIn = getLoggedInMember();
    const currentTicketId = editingTicket ? (editingTicket.ticketId || editingTicket.id) : null;

    // A member is only globally blocked from adding if EVERY available event has all ticket types occupied
    return eventsList.every((ev) => {
      const evId = ev.eventId || ev.id;
      const evName = ev.eventName || ev.name || ev.title;
      return masterTicketTypeNames.every((typeName) =>
        Boolean(
          getUnverifiedTicketForType(
            typeName,
            loggedIn.name,
            loggedIn.id,
            evId,
            evName,
            currentTicketId
          )
        )
      );
    });
  }, [
    isMemberRole,
    masterTicketTypeNames,
    eventsList,
    editingTicket,
    tickets,
    authState,
    isAdminOrOrg,
    membersList,
  ]);

  // Whether all ticket types for currently selected form.eventId / form.relatedEvent in the dialog are occupied
  const isCurrentEventAllTypesOccupied = useMemo(() => {
    if (!form.eventId && !form.relatedEvent) return false;
    if (!masterTicketTypeNames.length) return false;
    const loggedIn = getLoggedInMember();
    const targetName = form.memberName || loggedIn.name;
    const targetId = form.memberId || loggedIn.id;
    const currentTicketId = editingTicket ? (editingTicket.ticketId || editingTicket.id) : null;

    return masterTicketTypeNames.every((typeName) =>
      Boolean(
        getUnverifiedTicketForType(
          typeName,
          targetName,
          targetId,
          form.eventId,
          form.relatedEvent,
          currentTicketId
        )
      )
    );
  }, [
    masterTicketTypeNames,
    form.eventId,
    form.relatedEvent,
    form.memberName,
    form.memberId,
    editingTicket,
    tickets,
    authState,
    isMemberRole,
    isAdminOrOrg,
    membersList,
  ]);

  // Ticket type options with status for Add/Edit dialog (event-wise)
  const dialogTicketTypeOptions = useMemo(() => {
    const loggedIn = getLoggedInMember();
    const targetName = form.memberName || loggedIn.name;
    const targetId = form.memberId || loggedIn.id;
    const currentTicketId = editingTicket ? (editingTicket.ticketId || editingTicket.id) : null;

    return (dbTicketTypes || [])
      .filter((t) => t.typeName && t.isActive !== false)
      .map((t) => {
        const activeTicket = getUnverifiedTicketForType(
          t.typeName,
          targetName,
          targetId,
          form.eventId,
          form.relatedEvent,
          currentTicketId
        );
        return {
          label: activeTicket ? `${t.typeName} (Active: ${activeTicket.ticketNo})` : t.typeName,
          value: t.typeName,
          disabled: Boolean(activeTicket),
        };
      });
  }, [
    dbTicketTypes,
    form.memberName,
    form.memberId,
    form.eventId,
    form.relatedEvent,
    editingTicket,
    tickets,
    authState,
    isMemberRole,
    isAdminOrOrg,
    membersList,
  ]);

  const handleEditTicket = (row) => {
    const isVerified = isTicketVerified(row?.status);
    if (isVerified) {
      toast.warning("Cannot edit a verified ticket.");
      return;
    }
    setEditingTicket(row);
    const matchedEvent = (eventsList || []).find(
      (ev) => (ev.eventName || ev.name || ev.title) === row.relatedEvent || (row.eventId && (ev.eventId === row.eventId || ev.id === row.eventId))
    );
    const derivedType = matchedEvent?.eventTypeName || matchedEvent?.categoryName || matchedEvent?.eventType || "";

    const editFormData = {
      memberName: row.memberName || "",
      memberId: row.memberId || "",
      eventId: row.eventId || matchedEvent?.eventId || matchedEvent?.id || null,
      eventType: derivedType,
      relatedEvent: row.relatedEvent || "",
      ticketType: row.ticketType || "",
      priority: row.priority || "",
      status: row.status || "Open",
      description: row.description || "",
      attachment: row.attachment || "",
      attachmentName: row.attachment ? `${row.ticketNo || "ticket"}_attachment.png` : "",
    };
    setForm(editFormData);
    savedFormRef.current = editFormData;
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteRequest = (row) => {
    const isVerified = isTicketVerified(row?.status);
    if (isVerified) {
      toast.warning("Cannot delete a verified ticket.");
      return;
    }
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
      await fetchTicketsFromDb();
    } finally {
      setDeleteConfirmOpen(false);
      setTicketToDelete(null);
    }
  };

  const handleSaveTicket = async () => {
    if (editingTicket && !canEditTicket) return;
    if (!editingTicket && !canAddTicket) return;

    const newErrors = {};
    if (!form.memberName) newErrors.memberName = "This field is required";
    if (!form.eventType) newErrors.eventType = "This field is required";
    if (!form.relatedEvent || !String(form.relatedEvent).trim()) newErrors.relatedEvent = "This field is required";
    if (!form.ticketType) newErrors.ticketType = "This field is required";
    if (!form.priority || !String(form.priority).trim()) newErrors.priority = "This field is required";
    if (!form.description || !form.description.trim()) newErrors.description = "This field is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      setIsSaving(true);
      let resolvedMemberId = form.memberId;
      if (!resolvedMemberId && form.memberName) {
        const matched = membersList.find((m) => (m.name || m.memberName) === form.memberName);
        if (matched) resolvedMemberId = matched.memberId || matched.id || "";
      }

      // Check if user already has an active unverified ticket for this ticket type on this event
      const currentTicketId = editingTicket ? (editingTicket.ticketId || editingTicket.id) : null;
      const existingUnverified = getUnverifiedTicketForType(
        form.ticketType,
        form.memberName,
        resolvedMemberId || form.memberId,
        form.eventId,
        form.relatedEvent,
        currentTicketId
      );

      if (existingUnverified) {
        const eventLabel = form.relatedEvent ? ` on event "${form.relatedEvent}"` : "";
        toast.warning(
          `You already have an active support ticket (${existingUnverified.ticketNo}) for ticket type "${existingUnverified.ticketType}"${eventLabel}. A new ticket for this type can only be created after the existing ticket is resolved.`
        );
        setIsSaving(false);
        return;
      }

      if (editingTicket) {
        const ticketId = editingTicket.ticketId || editingTicket.id;
        await updateSupportTicketAsync(ticketId, {
          memberName: form.memberName,
          memberId: resolvedMemberId || "",
          eventId: form.eventId || editingTicket?.eventId || null,
          relatedEvent: form.relatedEvent || "",
          ticketType: form.ticketType,
          description: form.description,
          priority: form.priority,
          status: editingTicket.status || "Open",
          attachment: form.attachment || null,
          modifiedOn: editingTicket.modifiedOn || null,
        });
        toast.success(TOAST_MESSAGES.SUPPORT.UPDATED_SUCCESS || TOAST_MESSAGES.GENERAL.UPDATED_SUCCESS);
      } else {
        const created = await createSupportTicketAsync({
          memberName: form.memberName,
          memberId: resolvedMemberId || "",
          eventId: form.eventId || null,
          relatedEvent: form.relatedEvent || "",
          ticketType: form.ticketType,
          description: form.description,
          priority: form.priority,
          status: "Open",
          attachment: form.attachment || null,
        });

        const actualTicketNo = created?.ticketNo || "";

        // Trigger notification for Authority/Admin safely
        try {
          if (typeof addNotification === "function") {
            addNotification({
              type: "TICKET_RAISED",
              title: `Support Ticket Raised: ${actualTicketNo}`,
              message: `Member ${form.memberName || authState?.fullName || "User"} raised support ticket #${actualTicketNo}.`,
              ticketNo: actualTicketNo,
              targetRole: "Authority",
              link: "/support-tickets",
            });
          }
        } catch {
          // Non-critical notification failure
        }

        toast.success(TOAST_MESSAGES.SUPPORT.CREATED_SUCCESS || TOAST_MESSAGES.GENERAL.CREATED_SUCCESS);
      }

      setDialogOpen(false);
      setEditingTicket(null);
      setForm(initialForm);
      savedFormRef.current = null;
      setErrors({});
      await fetchTicketsFromDb();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
      if (err?.response?.status === 404 || err?.response?.status === 409) {
        setDialogOpen(false);
        setEditingTicket(null);
        setForm(initialForm);
        savedFormRef.current = null;
        setErrors({});
        await fetchTicketsFromDb();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyTicket || !canVerifyTicket) return;
    const ticketId = replyTicket.ticketId || replyTicket.id;
    const hasNote = replyText && replyText.trim().length > 0;
    const statusChanged = Boolean(replyStatus && replyStatus !== replyTicket.status);

    const newErrors = {};
    if (!replyStatus) {
      newErrors.replyStatus = "This field is required";
    }
    if (!hasNote && !statusChanged) {
      newErrors.replyText = "This field is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setReplyErrors(newErrors);
      toast.error("This field is required");
      return;
    }
    setReplyErrors({});

    try {
      if (hasNote) {
        await replySupportTicketAsync(ticketId, {
          message: replyText.trim(),
          replyMessage: replyText.trim(),
          status: replyStatus,
          modifiedOn: replyTicket.modifiedOn || null,
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
          modifiedOn: replyTicket.modifiedOn || null,
        });
      }
      toast.success(TOAST_MESSAGES.SUPPORT.STATUS_UPDATED || "Support ticket updated successfully!");
      setReplyDialogOpen(false);
      setReplyTicket(null);
      setReplyText("");
      setReplyErrors({});
      await fetchTicketsFromDb();
    } catch (err) {
      toast.error(err, TOAST_MESSAGES.GENERAL.SAVE_FAILED);
      if (err?.response?.status === 404 || err?.response?.status === 409) {
        setReplyDialogOpen(false);
        setReplyTicket(null);
        setReplyText("");
        setReplyErrors({});
        await fetchTicketsFromDb();
      }
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => {
        const isVerified = ["verified", "resolved", "closed"].includes(
          (row.status || "").trim().toLowerCase()
        );
        const canVerifyAction = canVerifyTicket && !isVerified;
        const canEditAction = canEditTicket && !isVerified;
        const canDeleteAction = canDeleteTicket && !isVerified;

        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title={canViewTicket ? "View Details" : "Disabled"}>
              <span style={{ display: "inline-flex", cursor: !canViewTicket ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{ p: 0.3 }}
                  disabled={!canViewTicket}
                  onClick={async () => {
                    setSelectedTicket(row);
                    setViewDialogOpen(true);
                    try {
                      const ticketId = row.ticketId || row.id;
                      if (ticketId) {
                        const res = await getSupportTicketByIdAsync(ticketId);
                        const fresh = res?.data || res;
                        if (fresh && (fresh.ticketId || fresh.id)) {
                          setSelectedTicket((prev) => ({
                            ...prev,
                            ...fresh,
                            resolutionNotes:
                              fresh.resolutionNotes ||
                              fresh.replyMessage ||
                              fresh.resolution ||
                              prev?.resolutionNotes ||
                              "",
                            modifiedOn: fresh.modifiedOn || prev?.modifiedOn || null,
                            modifiedBy: fresh.modifiedBy || prev?.modifiedBy || null,
                          }));
                        }
                      }
                    } catch {
                      // row already in state
                    }
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
            <Tooltip
              title={
                !canVerifyTicket
                  ? "Disabled"
                  : isVerified
                  ? "Ticket is already verified"
                  : "Verify Ticket"
              }
            >
              <span style={{ display: "inline-flex", cursor: !canVerifyAction ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0.3,
                    opacity: canVerifyAction ? 1 : 0.38,
                    cursor: !canVerifyAction ? "not-allowed !important" : "pointer",
                    pointerEvents: !canVerifyAction ? "none" : "auto",
                  }}
                  disabled={!canVerifyAction}
                  onClick={() => {
                    if (!canVerifyAction) return;
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
                        canVerifyAction
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
                !canEditTicket
                  ? "Disabled"
                  : isVerified
                  ? "Cannot edit a verified ticket"
                  : "Edit"
              }
            >
              <span style={{ display: "inline-flex", cursor: !canEditAction ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0.3,
                    opacity: canEditAction ? 1 : 0.38,
                    cursor: !canEditAction ? "not-allowed !important" : "pointer",
                    pointerEvents: !canEditAction ? "none" : "auto",
                  }}
                  disabled={!canEditAction}
                  onClick={() => {
                    if (!canEditAction) return;
                    handleEditTicket(row);
                  }}
                >
                  <EditIcon
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) =>
                        canEditAction
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
                !canDeleteTicket
                  ? "Disabled"
                  : isVerified
                  ? "Cannot delete a verified ticket"
                  : "Delete"
              }
            >
              <span style={{ display: "inline-flex", cursor: !canDeleteAction ? "not-allowed" : "pointer" }}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0.3,
                    opacity: canDeleteAction ? 1 : 0.38,
                    cursor: !canDeleteAction ? "not-allowed !important" : "pointer",
                    pointerEvents: !canDeleteAction ? "none" : "auto",
                  }}
                  disabled={!canDeleteAction}
                  onClick={() => {
                    if (!canDeleteAction) return;
                    handleDeleteRequest(row);
                  }}
                >
                  <DeleteIcon
                    sx={{
                      fontSize: "1.05rem",
                      color: (theme) =>
                        canDeleteAction
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
        );
      },
    },
    {
      label: "Ticket No",
      key: "ticketNo",
      render: (row) => row.ticketNo || "--",
    },
    {
      label: "Name",
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
        searchPlaceholder="Search by Ticket No..."
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip
              title={
                !canAddTicket
                  ? "Disabled"
                  : isMemberRole && allTicketTypesOccupied
                  ? "You have active tickets for all ticket types. Wait until existing tickets are verified to submit new ones."
                  : "Add Support Ticket"
              }
            >
              <span>
                <AppAddButton
                  disabled={!canAddTicket || (isMemberRole && allTicketTypesOccupied)}
                  onClick={() => {
                    if (isMemberRole && allTicketTypesOccupied) {
                      toast.warning(
                        "You have active support tickets for all available ticket types. You can only create a new ticket after an existing ticket is verified."
                      );
                      return;
                    }
                    const loggedIn = getLoggedInMember();
                    const firstStatus = dbStatuses.find((s) => s.isActive !== false)?.statusName || "";

                    const addFormData = {
                      ...initialForm,
                      memberName: loggedIn.name || authState?.fullName || "",
                      memberId: loggedIn.id || "",
                      eventId: null,
                      relatedEvent: "",
                      eventType: "",
                      ticketType: "",
                      priority: "",
                      status: firstStatus,
                      description: "",
                    };
                    setEditingTicket(null);
                    setForm(addFormData);
                    savedFormRef.current = addFormData;
                    setErrors({});
                    setDialogOpen(true);
                  }}
                />
              </span>
            </Tooltip>
          </Stack>
        }
        filterPanel={
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 1.25,
              width: "100%",
            }}
          >
            <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
              <AppSelect
                label="Ticket Type"
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
            <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
              <AppSelect
                label="Ticket Priority"
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
            <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
              <AppSelect
                label="Ticket Status"
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
            <Box sx={{ width: { xs: "100%", sm: 175, md: 195 } }}>
              <AppSelect
                label="Event Name"
                value={filterEvent}
                onChange={(e) => {
                  setFilterEvent(e.target.value);
                }}
                options={filterEventOptions}
                size="small"
                placeholder="Select Event"
                fullWidth
              />
            </Box>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, height: 34 }}>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 17 }} />}
                onClick={() => {
                  setAppliedType(filterType);
                  setAppliedPriority(filterPriority);
                  setAppliedStatus(filterStatus);
                  setAppliedEvent(filterEvent);
                }}
                sx={{
                  height: 34,
                  minHeight: 34,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  whiteSpace: "nowrap",
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
                  border: (theme) => theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
                  "&:hover": { bgcolor: (theme) => theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important" },
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
                  setFilterEvent("ALL");
                  setAppliedType("ALL");
                  setAppliedPriority("ALL");
                  setAppliedStatus("ALL");
                  setAppliedEvent("ALL");
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  minHeight: 34,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                  },
                }}
              >
                Clear Filter
              </AppButton>
            </Box>
          </Box>
        }
      />

      {/* Add / Edit Ticket Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => handleCancelRequest(handleCloseDialog)}
        title={editingTicket ? "Edit Support Ticket" : "Add Support Ticket"}
        maxWidth="sm"
        actions={
          <Stack direction="row" spacing={1.5}>
            <AppCancelButton
              disabled={isSaving}
              onClick={() => handleCancelRequest(handleCloseDialog)}
            />
            <AppSaveButton
              loading={isSaving}
              disabled={isSaving || Boolean(unverifiedTicketForSelectedType) || isCurrentEventAllTypesOccupied}
              onClick={handleSaveTicket}
            >
              {editingTicket ? "Update" : "Save"}
            </AppSaveButton>
          </Stack>
        }
      >
        <Grid container spacing={2}>
          {(unverifiedTicketForSelectedType || isCurrentEventAllTypesOccupied) && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning" sx={{ borderRadius: "8px", fontWeight: 600 }}>
                {unverifiedTicketForSelectedType
                  ? (isMemberRole
                      ? `You currently have an active support ticket (${unverifiedTicketForSelectedType.ticketNo}) for ticket type "${unverifiedTicketForSelectedType.ticketType}"${form.relatedEvent ? ` on event "${form.relatedEvent}"` : ""}. Please resolve the existing ticket before submitting another ticket for this type.`
                      : `Member already has an active support ticket (${unverifiedTicketForSelectedType.ticketNo}) for ticket type "${unverifiedTicketForSelectedType.ticketType}"${form.relatedEvent ? ` on event "${form.relatedEvent}"` : ""}. It must be resolved before creating or updating a ticket for this type.`)
                  : `You have active support tickets for all available ticket types on event "${form.relatedEvent}". You can only create a new ticket after an existing ticket is verified.`}
              </Alert>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Name"
              placeholder="Select Name"
              value={form.memberName}
              disabled={true}
              allowClear={false}
              clearable={false}
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
                if (errors.eventType) setErrors((p) => ({ ...p, eventType: "" }));
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

                  const matched = (eventsList || []).find(
                    (ev) => (ev.eventName || ev.name || ev.title) === newRelatedEvent
                  );

                  if (newRelatedEvent) {
                    setErrors((p) => ({ ...p, relatedEvent: "" }));
                  }

                  return {
                    ...c,
                    eventType: selectedType,
                    relatedEvent: newRelatedEvent,
                    eventId: matched?.eventId || matched?.id || null,
                  };
                });
              }}
              options={eventTypeOptions}
              error={!!errors.eventType}
              helperText={errors.eventType}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              placeholder="Select Event Name"
              value={form.relatedEvent}
              onChange={(e) => {
                const selectedName = e.target.value;
                if (errors.relatedEvent) setErrors((p) => ({ ...p, relatedEvent: "" }));
                const matched = (eventsList || []).find(
                  (ev) => (ev.eventName || ev.name || ev.title) === selectedName
                );
                const matchedType = matched?.eventTypeName || matched?.categoryName || matched?.eventType || "";

                if (matchedType && errors.eventType) setErrors((p) => ({ ...p, eventType: "" }));

                setForm((c) => ({
                  ...c,
                  relatedEvent: selectedName,
                  eventId: matched?.eventId || matched?.id || null,
                  eventType: matchedType || c.eventType,
                }));
              }}
              options={eventNameOptions}
              error={Boolean(errors.relatedEvent)}
              helperText={errors.relatedEvent}
              required
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
              options={dialogTicketTypeOptions}
              error={Boolean(errors.ticketType)}
              helperText={errors.ticketType}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Priority"
              placeholder="Select Priority"
              value={form.priority}
              onChange={(e) => {
                setForm((c) => ({ ...c, priority: e.target.value }));
                if (errors.priority) setErrors((p) => ({ ...p, priority: "" }));
              }}
              options={priorityOptions.filter((o) => o.value !== "ALL")}
              error={Boolean(errors.priority)}
              helperText={errors.priority}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: (t) => t.palette.mode === "dark" ? "#e2e8f0" : "#334155" }}>
                  Attachment (1 Image, Max 6MB)
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
                    Click to attach image (Max 6MB)
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
                      <Tooltip title={form.attachmentName || "Attached Image"} arrow placement="top">
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 120,
                            cursor: "pointer",
                          }}
                        >
                          {form.attachmentName || "Attached Image"}
                        </Typography>
                      </Tooltip>
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
              maxLength={500}
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

      {/* Confirm Remove Attachment Dialog */}
      <AppConfirmDialog
        open={removeAttachmentConfirmOpen}
        onClose={() => setRemoveAttachmentConfirmOpen(false)}
        onConfirm={handleConfirmRemoveAttachment}
        title="Remove Attachment"
        content="Are you sure you want to remove this attached image?"
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor="error"
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
        maxWidth="sm"
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
                  Name
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
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Verified By
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {getVerifiedByName(selectedTicket) || "--"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Subject
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
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
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
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

              {/* Resolution Notes / Reply Message */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    fontWeight: 700,
                    mb: 0.8,
                  }}
                >
                  <MarkChatReadIcon
                    sx={{
                      fontSize: 18,
                      color: selectedTicket.resolutionNotes ? "#16a34a" : "text.secondary",
                    }}
                  />
                  Resolution Notes / Reply Message
                </Typography>
                <Box
                  sx={{
                    bgcolor: (t) =>
                      selectedTicket.resolutionNotes
                        ? t.palette.mode === "dark"
                          ? "rgba(34, 197, 94, 0.08)"
                          : "#f0fdf4"
                        : t.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.03)"
                          : "#f8fafc",
                    p: 2,
                    borderRadius: "10px",
                    border: (t) =>
                      `1px solid ${
                        selectedTicket.resolutionNotes
                          ? t.palette.mode === "dark"
                            ? "rgba(34, 197, 94, 0.28)"
                            : "#bbf7d0"
                          : t.palette.divider
                      }`,
                    lineHeight: 1.6,
                  }}
                >
                  {selectedTicket.resolutionNotesHistory && selectedTicket.resolutionNotesHistory.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                      {selectedTicket.resolutionNotesHistory.map((note, idx) => (
                        <Box
                          key={note.noteId || idx}
                          sx={{
                            p: 1.25,
                            borderRadius: "8px",
                            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "#ffffff"),
                            border: (t) => `1px solid ${t.palette.divider}`,
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} color="primary.main">
                              {note.senderName || "Admin"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {note.createdAt ? dayjs(note.createdAt).format("DD/MM/YYYY hh:mm A") : ""}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              color: (t) => (t.palette.mode === "dark" ? "#86efac" : "#166534"),
                              fontWeight: 500,
                              fontSize: "0.85rem",
                              lineHeight: 1.6,
                            }}
                          >
                            {note.notes}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : cleanResolutionNotes(selectedTicket.resolutionNotes) ? (
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: (t) =>
                            t.palette.mode === "dark" ? "#86efac" : "#166534",
                          fontWeight: 500,
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                        }}
                      >
                        {cleanResolutionNotes(selectedTicket.resolutionNotes)}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontStyle: "italic", fontSize: "0.85rem" }}
                    >
                      No resolution notes or reply message provided yet.
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </AppDialog>

      {/* Reply & Update Ticket Status Modal */}
      <VerifySupportTicketModal
        open={replyDialogOpen}
        onClose={() => {
          setReplyDialogOpen(false);
          setReplyTicket(null);
          setReplyText("");
          setReplyErrors({});
        }}
        initialData={replyTicket}
        onSuccess={() => {
          fetchTicketsFromDb();
        }}
      />

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
      <UnsavedChangesDialog />
    </div>
  );
}
