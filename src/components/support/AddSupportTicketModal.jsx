import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Visibility as ViewIcon,
  FileDownload as DownloadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";

import AppDialog from "../common/AppDialog";
import AppConfirmDialog from "../common/AppConfirmDialog";
import AppButton, { AppCancelButton, AppSaveButton } from "../common/AppButton";
import AppSelect from "../common/AppSelect";
import AppTextArea from "../common/AppTextArea";
import { useAppToast } from "../common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { createSupportTicketAsync, getSupportTicketsAsync } from "../../services/supportTicketService";
import { getMembersAsync } from "../../services/memberService";
import { getEventsAsync } from "../../services/eventService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { getTicketTypesAsync } from "../../services/ticketTypeService";
import { getPrioritiesAsync } from "../../services/priorityService";
import { TOAST_MESSAGES } from "../../constants";

const DEFAULT_TICKET_TYPES = [
  "Payment Issue",
  "Attendance Discrepancy",
  "Profile Update Request",
  "General Query",
  "Other",
];

const DEFAULT_PRIORITIES = ["Low", "Medium", "High", "Critical"];

const initialForm = {
  memberName: "",
  memberId: "",
  eventType: "",
  relatedEvent: "",
  ticketType: "",
  priority: "",
  description: "",
  attachment: "",
  attachmentName: "",
};

export default function AddSupportTicketModal({
  open,
  onClose,
  initialData = null,
  onSuccess,
}) {
  const toast = useAppToast();
  const { authState } = useAuth();
  const { addNotification } = useNotifications();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [membersList, setMembersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [dbTicketTypes, setDbTicketTypes] = useState([]);
  const [dbPriorities, setDbPriorities] = useState([]);
  const [existingTickets, setExistingTickets] = useState([]);

  // Attachment states
  const fileInputRef = useRef(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");
  const [removeAttachmentConfirmOpen, setRemoveAttachmentConfirmOpen] = useState(false);

  const userRole = String(authState?.role || authState?.user?.roleName || "").trim().toLowerCase();
  const isMemberRole = userRole === "member";
  const isNameLocked = true;

  // Load lookup lists when modal is open
  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const fetchLookupData = async () => {
      try {
        const [membersRes, eventsRes, eventTypesRes, ticketTypesRes, prioritiesRes, ticketsRes] = await Promise.all([
          getMembersAsync().catch(() => []),
          getEventsAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
          getTicketTypesAsync(true).catch(() => []),
          getPrioritiesAsync(true).catch(() => []),
          getSupportTicketsAsync().catch(() => []),
        ]);

        if (!isMounted) return;
        if (Array.isArray(membersRes)) setMembersList(membersRes);
        if (Array.isArray(eventsRes)) setEventsList(eventsRes);
        if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
        if (Array.isArray(ticketTypesRes)) setDbTicketTypes(ticketTypesRes);
        if (Array.isArray(prioritiesRes)) setDbPriorities(prioritiesRes);
        if (Array.isArray(ticketsRes)) setExistingTickets(ticketsRes);
      } catch {
        // Fallback silently if lookups fail
      }
    };

    fetchLookupData();

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Synchronize form when opened or initialData changes
  useEffect(() => {
    if (!open) return;

    const rawMemberName = (
      initialData?.memberName ||
      authState?.fullName ||
      authState?.name ||
      authState?.user?.fullName ||
      ""
    ).trim();

    const rawMemberId = initialData?.memberId || authState?.userId || "";
    let rawEventName = initialData?.relatedEvent || initialData?.eventName || "";
    const cleanEventName = (rawEventName || "").replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)/g, "").trim();
    let rawEventType = initialData?.eventType || initialData?.categoryName || initialData?.eventTypeName || "";

    if (eventsList.length > 0) {
      const matched = eventsList.find((ev) => {
        const evName = (ev.eventName || ev.name || ev.title || "").trim().toLowerCase();
        return (
          evName === rawEventName.toLowerCase() ||
          (cleanEventName && evName === cleanEventName.toLowerCase())
        );
      });

      if (matched) {
        rawEventName = matched.eventName || matched.name || matched.title || cleanEventName || rawEventName;
        if (!rawEventType) {
          rawEventType = matched.eventTypeName || matched.categoryName || matched.eventType || "";
        }
      } else if (cleanEventName) {
        rawEventName = cleanEventName;
      }
    } else if (cleanEventName) {
      rawEventName = cleanEventName;
    }

    setForm({
      memberName: rawMemberName,
      memberId: rawMemberId,
      eventType: rawEventType,
      relatedEvent: rawEventName,
      ticketType: initialData?.ticketType || "",
      priority: initialData?.priority || "",
      description: initialData?.description || "",
      attachment: "",
      attachmentName: "",
    });
    setErrors({});
  }, [open, initialData, eventsList, authState]);

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

  // Member options
  const memberOptions = useMemo(() => {
    const list = [];
    const unique = new Set();

    if (form.memberName) {
      unique.add(form.memberName.toLowerCase());
      list.push({ label: form.memberName, value: form.memberName });
    }

    (membersList || []).forEach((m) => {
      const name = m.name || m.memberName;
      if (name && !unique.has(name.toLowerCase())) {
        unique.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });

    return list;
  }, [membersList, form.memberName]);

  // Event Type options
  const eventTypeOptions = useMemo(() => {
    const list = [];
    const unique = new Set();

    if (form.eventType) {
      unique.add(form.eventType.toLowerCase());
      list.push({ label: form.eventType, value: form.eventType });
    }

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
  }, [eventTypesList, eventsList, form.eventType]);

  // Event Name options filtered by selected eventType
  const eventNameOptions = useMemo(() => {
    const list = [];
    const unique = new Set();

    if (form.relatedEvent) {
      unique.add(form.relatedEvent.toLowerCase());
      list.push({ label: form.relatedEvent, value: form.relatedEvent });
    }

    const filtered = (eventsList || []).filter((e) => {
      if (!form.eventType) return true;
      const eType = (e.eventTypeName || e.categoryName || e.eventType || "").trim().toLowerCase();
      return eType === form.eventType.trim().toLowerCase();
    });

    filtered.forEach((e) => {
      const name = e.eventName || e.name || e.title;
      if (name && !unique.has(name.toLowerCase())) {
        unique.add(name.toLowerCase());
        list.push({ label: name, value: name });
      }
    });

    return list;
  }, [eventsList, form.eventType, form.relatedEvent]);

  // Helper: Find active/unverified ticket for a specific ticket type on an event
  const getUnverifiedTicketForType = (typeVal, targetEventId, targetEventName) => {
    if (!typeVal) return null;
    const cleanType = String(typeVal).trim().toLowerCase();
    const rawMemberName = (form.memberName || authState?.fullName || authState?.username || "").trim().toLowerCase();
    const rawMemberId = String(form.memberId || authState?.memberId || authState?.user?.userId || "").trim().toLowerCase();
    const cleanEventId = String(targetEventId || form.eventId || "").trim().toLowerCase();
    const cleanEventName = String(targetEventName || form.relatedEvent || "").trim().toLowerCase();

    return (existingTickets || []).find((t) => {
      const s = String(t.status || "").trim().toLowerCase();
      const isVerified = ["verified", "resolved", "closed"].some((v) => s.includes(v));
      if (isVerified) return false;

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

      if (isMemberRole && userRole !== "admin" && userRole !== "organizer") return true;

      const tName = (t.memberName || "").trim().toLowerCase();
      const tId = String(t.memberId || "").trim().toLowerCase();
      const tCreatedBy = (t.createdBy || "").trim().toLowerCase();

      return (rawMemberName && (tName === rawMemberName || tCreatedBy === rawMemberName)) ||
             (rawMemberId && (tId === rawMemberId || tCreatedBy === rawMemberId));
    });
  };

  // Ticket Type options with active ticket status (event-wise)
  const ticketTypeOptions = useMemo(() => {
    const fromDb = Array.isArray(dbTicketTypes)
      ? dbTicketTypes
        .filter((t) => t.typeName && t.isActive !== false)
        .map((t) => {
          const active = getUnverifiedTicketForType(t.typeName, form.eventId, form.relatedEvent);
          return {
            label: active ? `${t.typeName} (Active: ${active.ticketNo})` : t.typeName,
            value: t.typeName,
            disabled: Boolean(active),
          };
        })
      : [];

    if (fromDb.length > 0) return fromDb;
    return DEFAULT_TICKET_TYPES.map((t) => {
      const active = getUnverifiedTicketForType(t, form.eventId, form.relatedEvent);
      return {
        label: active ? `${t} (Active: ${active.ticketNo})` : t,
        value: t,
        disabled: Boolean(active),
      };
    });
  }, [dbTicketTypes, form.memberName, form.memberId, form.eventId, form.relatedEvent, existingTickets, authState, isMemberRole, userRole]);

  // Priority options
  const priorityOptions = useMemo(() => {
    const fromDb = Array.isArray(dbPriorities)
      ? dbPriorities
        .filter((p) => p.priorityName && p.isActive !== false)
        .map((p) => ({ label: p.priorityName, value: p.priorityName }))
      : [];

    if (fromDb.length > 0) return fromDb;
    return DEFAULT_PRIORITIES.map((p) => ({ label: p, value: p }));
  }, [dbPriorities]);

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

  const openImagePreview = (src, title = "Attached Image Preview") => {
    if (!src) return;
    setPreviewImageSrc(src);
    setPreviewImageTitle(title);
    setPreviewModalOpen(true);
  };

  const unverifiedTicketForSelectedType = useMemo(() => {
    return getUnverifiedTicketForType(form.ticketType, form.eventId, form.relatedEvent);
  }, [existingTickets, form.ticketType, form.eventId, form.relatedEvent, form.memberName, form.memberId, authState, isMemberRole, userRole]);

  const handleSaveTicket = async () => {
    const newErrors = {};
    if (!form.memberName) newErrors.memberName = "This field is required";
    if (!form.eventType) newErrors.eventType = "This field is required";
    if (!form.relatedEvent || !String(form.relatedEvent).trim()) newErrors.relatedEvent = "This field is required";
    if (!form.ticketType) newErrors.ticketType = "This field is required";
    if (!form.priority || !String(form.priority).trim()) newErrors.priority = "This field is required";
    if (!form.description || !form.description.trim()) newErrors.description = "This field is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS || "Please fill in all required fields.");
      return;
    }

    const existingUnverified = getUnverifiedTicketForType(form.ticketType, form.eventId, form.relatedEvent);
    if (existingUnverified) {
      const eventLabel = form.relatedEvent ? ` on event "${form.relatedEvent}"` : "";
      toast.warning(
        `You already have an active support ticket (${existingUnverified.ticketNo}) for ticket type "${existingUnverified.ticketType}"${eventLabel}. A new ticket for this type can only be created after the existing ticket is resolved.`
      );
      return;
    }

    try {
      setIsSaving(true);
      let resolvedMemberId = form.memberId;
      if (!resolvedMemberId && form.memberName) {
        const matched = membersList.find((m) => (m.name || m.memberName) === form.memberName);
        if (matched) resolvedMemberId = matched.memberId || matched.id || "";
      }

      const created = await createSupportTicketAsync({
        memberName: form.memberName,
        memberId: resolvedMemberId || "",
        eventId: form.eventId || initialData?.eventId || null,
        relatedEvent: form.relatedEvent || "",
        ticketType: form.ticketType,
        description: form.description || "",
        priority: form.priority,
        status: "Open",
        attachment: form.attachment || null,
      });

      const actualTicketNo = created?.ticketNo || "";
      window.dispatchEvent(new CustomEvent("support_ticket_updated", { detail: created }));

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

      toast.success(TOAST_MESSAGES.SUPPORT.CREATED_SUCCESS || "Support ticket created successfully!");
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED || "Failed to create support ticket");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AppDialog
        open={open}
        onClose={() => {
          if (!isSaving) {
            onClose();
            setErrors({});
          }
        }}
        title="Add Support Ticket"
        maxWidth="sm"
        actions={
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center" }}>
            <AppCancelButton
              disabled={isSaving}
              onClick={onClose}
            />
            <AppSaveButton
              loading={isSaving}
              disabled={isSaving || Boolean(unverifiedTicketForSelectedType)}
              onClick={handleSaveTicket}
            />
          </Stack>
        }
      >
        <Grid container spacing={2}>
          {unverifiedTicketForSelectedType && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning" sx={{ borderRadius: "8px", fontWeight: 600 }}>
                {isMemberRole
                  ? `You currently have an active support ticket (${unverifiedTicketForSelectedType.ticketNo}) for ticket type "${unverifiedTicketForSelectedType.ticketType}"${form.relatedEvent ? ` on event "${form.relatedEvent}"` : ""}. Please resolve the existing ticket before submitting another ticket for this type.`
                  : `Member already has an active support ticket (${unverifiedTicketForSelectedType.ticketNo}) for ticket type "${unverifiedTicketForSelectedType.ticketType}"${form.relatedEvent ? ` on event "${form.relatedEvent}"` : ""}. It must be resolved before creating or updating a ticket for this type.`}
              </Alert>
            </Grid>
          )}
          {/* Name */}
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

          {/* Event Type */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Type"
              placeholder="Select Event Type"
              value={form.eventType}
              allowClear={false}
              onChange={(e) => {
                const selectedType = e.target.value;
                if (errors.eventType) setErrors((p) => ({ ...p, eventType: "" }));
                setForm((c) => {
                  const matchingEvents = (eventsList || []).filter(
                    (ev) =>
                      (ev.eventTypeName || ev.categoryName || ev.eventType || "")
                        .trim()
                        .toLowerCase() === selectedType.trim().toLowerCase()
                  );
                  const currentMatches = matchingEvents.some(
                    (ev) => (ev.eventName || ev.name || ev.title) === c.relatedEvent
                  );
                  const newRelatedEvent = currentMatches
                    ? c.relatedEvent
                    : matchingEvents.length === 1
                      ? matchingEvents[0].eventName || matchingEvents[0].name || matchingEvents[0].title
                      : "";

                  if (newRelatedEvent) {
                    setErrors((p) => ({ ...p, relatedEvent: "" }));
                  }

                  return {
                    ...c,
                    eventType: selectedType,
                    relatedEvent: newRelatedEvent,
                  };
                });
              }}
              options={eventTypeOptions}
              error={!!errors.eventType}
              helperText={errors.eventType}
              required
            />
          </Grid>

          {/* Event Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              placeholder="Select Event Name"
              value={form.relatedEvent}
              allowClear={true}
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
                  eventType: matchedType || c.eventType,
                }));
              }}
              options={eventNameOptions}
              error={Boolean(errors.relatedEvent)}
              helperText={errors.relatedEvent}
              required
            />
          </Grid>

          {/* Ticket Type */}
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
              error={Boolean(errors.ticketType)}
              helperText={errors.ticketType}
              required
            />
          </Grid>

          {/* Priority */}
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

          {/* Attachment */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ color: (t) => (t.palette.mode === "dark" ? "#e2e8f0" : "#334155") }}
                >
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
                      : ((t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)")),
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
                      : ((t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.03)")),
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: errors.attachment
                        ? "#dc2626"
                        : ((t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b")),
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.07)"),
                    },
                  }}
                >
                  <CloudUploadIcon
                    sx={{
                      fontSize: 20,
                      color: errors.attachment
                        ? "#ef4444"
                        : ((t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b")),
                    }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{ color: errors.attachment ? "#ef4444" : "text.secondary" }}
                  >
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
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc"),
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
                      <IconButton
                        size="small"
                        onClick={() => openImagePreview(form.attachment, form.attachmentName || "Attached Image")}
                      >
                        <ViewIcon sx={{ fontSize: 17, color: (t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b") }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleDownloadImage(form.attachment, form.attachmentName || "ticket_attachment.png")
                        }
                      >
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

          {/* Description */}
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

      {/* Lightbox Image Preview Dialog */}
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
              onClick={() =>
                handleDownloadImage(
                  previewImageSrc,
                  `${previewImageTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`
                )
              }
            >
              Download
            </AppButton>
            <IconButton size="small" onClick={() => setPreviewModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "#f8fafc"),
            borderRadius: "10px",
          }}
        >
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
    </>
  );
}
