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
import AppButton from "../common/AppButton";
import AppSelect from "../common/AppSelect";
import AppTextArea from "../common/AppTextArea";
import { useAppToast } from "../common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { createSupportTicketAsync } from "../../services/supportTicketService";
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
  priority: "Medium",
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

  // Attachment states
  const fileInputRef = useRef(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");

  const userRole = String(authState?.role || authState?.user?.roleName || "").trim().toLowerCase();
  const isMemberRole = userRole === "member";
  const isNameLocked = isMemberRole || Boolean(initialData?.memberName);

  // Load lookup lists when modal is open
  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const fetchLookupData = async () => {
      try {
        const [membersRes, eventsRes, eventTypesRes, ticketTypesRes, prioritiesRes] = await Promise.all([
          getMembersAsync().catch(() => []),
          getEventsAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
          getTicketTypesAsync(true).catch(() => []),
          getPrioritiesAsync(true).catch(() => []),
        ]);

        if (!isMounted) return;
        if (Array.isArray(membersRes)) setMembersList(membersRes);
        if (Array.isArray(eventsRes)) setEventsList(eventsRes);
        if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
        if (Array.isArray(ticketTypesRes)) setDbTicketTypes(ticketTypesRes);
        if (Array.isArray(prioritiesRes)) setDbPriorities(prioritiesRes);
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
      priority: initialData?.priority || "Medium",
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

  // Ticket Type options
  const ticketTypeOptions = useMemo(() => {
    const fromDb = Array.isArray(dbTicketTypes)
      ? dbTicketTypes
        .filter((t) => t.typeName && t.isActive !== false)
        .map((t) => ({ label: t.typeName, value: t.typeName }))
      : [];

    if (fromDb.length > 0) return fromDb;
    return DEFAULT_TICKET_TYPES.map((t) => ({ label: t, value: t }));
  }, [dbTicketTypes]);

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

  const openImagePreview = (src, title = "Attached Image Preview") => {
    if (!src) return;
    setPreviewImageSrc(src);
    setPreviewImageTitle(title);
    setPreviewModalOpen(true);
  };

  const handleSaveTicket = async () => {
    const newErrors = {};
    if (!form.memberName) newErrors.memberName = "User Name is required";
    if (!form.eventType) newErrors.eventType = "Event Type is required";
    if (!form.ticketType) newErrors.ticketType = "This field is required";
    if (!form.attachment) newErrors.attachment = "This field is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS || "Please fill in all required fields.");
      return;
    }

    try {
      setIsSaving(true);
      let resolvedMemberId = form.memberId;
      if (!resolvedMemberId && form.memberName) {
        const matched = membersList.find((m) => (m.name || m.memberName) === form.memberName);
        if (matched) resolvedMemberId = matched.memberId || matched.id || "";
      }

      const randomSuffix = String(Math.floor(Math.random() * 900) + 100);
      const newTicketNo = `TKT-${dayjs().format("YYYY")}-${randomSuffix}`;

      const created = await createSupportTicketAsync({
        ticketNo: newTicketNo,
        memberName: form.memberName,
        memberId: resolvedMemberId || "",
        relatedEvent: form.relatedEvent || "",
        ticketType: form.ticketType,
        description: form.description || "",
        priority: form.priority || "Medium",
        status: "Open",
        attachment: form.attachment || null,
      });

      const actualTicketNo = created?.ticketNo || newTicketNo;

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
            <AppButton
              variant="outlined"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              loading={isSaving}
              disabled={isSaving}
              onClick={handleSaveTicket}
            >
              Save
            </AppButton>
          </Stack>
        }
      >
        <Grid container spacing={2}>
          {/* User Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="User Name"
              placeholder="Select User Name"
              value={form.memberName}
              disabled={isNameLocked}
              allowClear={false}
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
              onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value }))}
              options={priorityOptions.filter((o) => o.value !== "ALL")}
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
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 120,
                        }}
                      >
                        {form.attachmentName || "Attached Image"}
                      </Typography>
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
    </>
  );
}
