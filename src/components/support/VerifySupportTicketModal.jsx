import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";

import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import AppSelect from "../common/AppSelect";
import AppTextArea from "../common/AppTextArea";
import { useAppToast } from "../common/AppToast";
import {
  getSupportTicketsAsync,
  updateSupportTicketAsync,
  replySupportTicketAsync,
  createSupportTicketAsync,
} from "../../services/supportTicketService";
import { getStatusesAsync } from "../../services/statusService";
import { getImageUrl } from "../../services/apiClient";
import { TOAST_MESSAGES } from "../../constants";

export default function VerifySupportTicketModal({
  open,
  onClose,
  initialData = null,
  onSuccess,
}) {
  const toast = useAppToast();

  const [ticketInfo, setTicketInfo] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("Open");
  const [replyText, setReplyText] = useState("");
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [dbStatuses, setDbStatuses] = useState([]);

  // Image preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");

  const openImagePreview = (src, title = "Ticket Attachment Preview") => {
    if (!src) return;
    setPreviewImageSrc(getImageUrl(src));
    setPreviewImageTitle(title);
    setPreviewModalOpen(true);
  };

  const handleDownloadImage = (src, fileName = "ticket_attachment.png") => {
    if (!src) return;
    try {
      const resolved = getImageUrl(src);
      const link = document.createElement("a");
      link.href = resolved;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image downloaded successfully!");
    } catch {
      toast.error("Could not download image");
    }
  };

  // Immediate sync when modal opens or initialData is passed
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const initStatus = initialData.status || "Open";
      setTicketInfo({
        ticketId: initialData.ticketId || initialData.id || null,
        ticketNo: initialData.ticketNo || "",
        memberName: initialData.memberName || "",
        memberId: initialData.memberId || "",
        status: initStatus,
        ticketType: initialData.ticketType || "Payment Issue",
        priority: initialData.priority || "Medium",
        relatedEvent: initialData.relatedEvent || initialData.eventName || "",
        eventName: initialData.eventName || initialData.relatedEvent || "",
        attachment: initialData.attachment || null,
        description: initialData.description || "",
      });
      setUpdateStatus(initStatus);
      setReplyText("");
      setErrors({});
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const loadTicketData = async () => {
      try {
        const [ticketsRes, statusesRes] = await Promise.all([
          getSupportTicketsAsync().catch(() => []),
          getStatusesAsync(true).catch(() => []),
        ]);
        if (!isMounted) return;

        if (Array.isArray(statusesRes)) {
          setDbStatuses(statusesRes);
        }

        const rawMemberName = (initialData?.memberName || "").trim();
        const memberNameLower = rawMemberName.toLowerCase();
        const memberIdStr = String(initialData?.memberId || "").trim().toLowerCase();
        const rawEventName = (initialData?.relatedEvent || initialData?.eventName || "").trim();
        const cleanEventName = rawEventName.replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)/g, "").trim().toLowerCase();

        let matchedTicket = null;
        if (Array.isArray(ticketsRes) && ticketsRes.length > 0) {
          // 1. Direct ID / ticketNo match if present
          if (initialData?.ticketId || initialData?.id || initialData?.ticketNo) {
            const tId = initialData.ticketId || initialData.id;
            const tNo = initialData.ticketNo;
            matchedTicket = ticketsRes.find(
              (t) => (tId && (t.ticketId === tId || t.id === tId)) || (tNo && t.ticketNo === tNo)
            );
          }

          // 2. Try matching both member and event
          if (!matchedTicket && cleanEventName) {
            matchedTicket = [...ticketsRes].reverse().find((t) => {
              const tMember = (t.memberName || "").trim().toLowerCase();
              const tMemberId = String(t.memberId || "").trim().toLowerCase();
              const tEvent = (t.relatedEvent || t.eventName || "").trim().toLowerCase();
              const isMember = tMember === memberNameLower || (memberIdStr && tMemberId === memberIdStr) || (memberNameLower && tMember.includes(memberNameLower));
              const isEvent =
                tEvent === cleanEventName ||
                (tEvent && cleanEventName && (tEvent.includes(cleanEventName) || cleanEventName.includes(tEvent)));
              return isMember && isEvent;
            });
          }

          // 3. Try matching member alone (latest ticket for this member)
          if (!matchedTicket && memberNameLower) {
            matchedTicket = [...ticketsRes].reverse().find((t) => {
              const tMember = (t.memberName || "").trim().toLowerCase();
              const tMemberId = String(t.memberId || "").trim().toLowerCase();
              return tMember === memberNameLower || (memberIdStr && tMemberId === memberIdStr) || tMember.includes(memberNameLower);
            });
          }

          // 4. Try matching event alone
          if (!matchedTicket && cleanEventName) {
            matchedTicket = [...ticketsRes].reverse().find((t) => {
              const tEvent = (t.relatedEvent || t.eventName || "").trim().toLowerCase();
              return tEvent === cleanEventName || (tEvent && cleanEventName && (tEvent.includes(cleanEventName) || cleanEventName.includes(tEvent)));
            });
          }

          // 5. Fallback to latest ticket from DB
          if (!matchedTicket && ticketsRes.length > 0) {
            matchedTicket = ticketsRes[ticketsRes.length - 1];
          }
        }

        const fallbackTicket = (ticketsRes && ticketsRes.length > 0) ? ticketsRes[ticketsRes.length - 1] : null;
        const resolvedMatch = matchedTicket || fallbackTicket;

        const currentStatus = resolvedMatch?.status || initialData?.status || "Open";
        const finalTicket = {
          ticketId: resolvedMatch?.ticketId || resolvedMatch?.id || initialData?.ticketId || null,
          ticketNo: resolvedMatch?.ticketNo || initialData?.ticketNo || "",
          memberName: resolvedMatch?.memberName || rawMemberName || "Member",
          memberId: resolvedMatch?.memberId || initialData?.memberId || "",
          status: currentStatus,
          ticketType: resolvedMatch?.ticketType || initialData?.ticketType || "Payment Issue",
          priority: resolvedMatch?.priority || initialData?.priority || "Medium",
          relatedEvent: resolvedMatch?.relatedEvent || resolvedMatch?.eventName || rawEventName || "",
          eventName: resolvedMatch?.eventName || resolvedMatch?.relatedEvent || rawEventName || "",
          attachment: resolvedMatch?.attachment || initialData?.attachment || null,
          description: resolvedMatch?.description || initialData?.description || "",
        };

        setTicketInfo(finalTicket);
        setUpdateStatus(currentStatus);
      } catch {
        // Retain initialData or graceful fallback
        if (!ticketInfo) {
          const fallbackStatus = initialData?.status || "Open";
          setTicketInfo({
            ticketId: initialData?.ticketId || null,
            ticketNo: initialData?.ticketNo || "",
            memberName: initialData?.memberName || "Member",
            memberId: initialData?.memberId || "",
            status: fallbackStatus,
            ticketType: initialData?.ticketType || "Payment Issue",
            priority: initialData?.priority || "Medium",
            relatedEvent: initialData?.relatedEvent || initialData?.eventName || "",
            eventName: initialData?.eventName || initialData?.relatedEvent || "",
            attachment: initialData?.attachment || null,
          });
          setUpdateStatus(fallbackStatus);
        }
      }
    };

    loadTicketData();
    return () => {
      isMounted = false;
    };
  }, [open, initialData]);

  const statusOptions = useMemo(() => {
    const result = [];
    const validOptions = ["Pending", "Verified"];

    if (ticketInfo?.status && !validOptions.some(opt => opt.toLowerCase() === ticketInfo.status.toLowerCase())) {
      result.push({ label: ticketInfo.status, value: ticketInfo.status });
    }

    validOptions.forEach(opt => result.push({ label: opt, value: opt }));

    return result;
  }, [ticketInfo?.status]);

  const handleSave = async () => {
    if (!updateStatus) {
      setErrors({ updateStatus: "Update Status is required" });
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS || "Update Status is required");
      return;
    }

    try {
      setIsSaving(true);
      const ticketId = ticketInfo?.ticketId || ticketInfo?.id;
      const hasNote = replyText && replyText.trim().length > 0;
      const statusChanged = Boolean(updateStatus && updateStatus !== ticketInfo?.status);

      if (ticketId) {
        if (hasNote) {
          await replySupportTicketAsync(ticketId, {
            message: replyText.trim(),
            replyMessage: replyText.trim(),
            status: updateStatus,
          });
        }
        if (!hasNote || statusChanged) {
          await updateSupportTicketAsync(ticketId, {
            memberName: ticketInfo.memberName,
            memberId: ticketInfo.memberId || "",
            relatedEvent: ticketInfo.relatedEvent || ticketInfo.eventName || "",
            ticketType: ticketInfo.ticketType || "Payment Issue",
            description: ticketInfo.description || "",
            priority: ticketInfo.priority || "Medium",
            status: updateStatus,
            attachment: ticketInfo.attachment || null,
          });
        }
      } else {
        const newTicketNo =
          ticketInfo?.ticketNo ||
          `TKT-${dayjs().format("YYYY")}-${String(Math.floor(Math.random() * 900) + 100)}`;
        await createSupportTicketAsync({
          ticketNo: newTicketNo,
          memberName: ticketInfo?.memberName || initialData?.memberName || "Member",
          memberId: ticketInfo?.memberId || initialData?.memberId || "",
          relatedEvent: ticketInfo?.relatedEvent || ticketInfo?.eventName || initialData?.eventName || "",
          ticketType: ticketInfo?.ticketType || "Payment Issue",
          description: replyText.trim() || `Verified support ticket - Status set to ${updateStatus}`,
          priority: ticketInfo?.priority || "Medium",
          status: updateStatus,
          attachment: ticketInfo?.attachment || null,
        });
      }

      toast.success(TOAST_MESSAGES.SUPPORT.STATUS_UPDATED || "Support ticket updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          TOAST_MESSAGES.GENERAL.SAVE_FAILED ||
          "Failed to update support ticket"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedAttachment = ticketInfo?.attachment || initialData?.attachment || null;
  const resolvedEventName = ticketInfo?.eventName || ticketInfo?.relatedEvent || initialData?.eventName || initialData?.relatedEvent || "--";

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
        title="Verify Support Ticket"
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
              onClick={handleSave}
            >
              Save
            </AppButton>
          </Stack>
        }
      >
        {ticketInfo && (
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
                {/* Member Name */}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    User Name
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {ticketInfo.memberName || "--"}
                  </Typography>
                </Grid>

                {/* Current Status */}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Current Status
                  </Typography>
                  <Box sx={{ mt: 0.2 }}>
                    <Chip
                      label={ticketInfo.status || "Open"}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor:
                          ticketInfo.status === "Resolved" || ticketInfo.status === "Closed"
                            ? "rgba(22, 163, 74, 0.12)"
                            : ticketInfo.status === "In Progress"
                            ? "rgba(2, 132, 199, 0.12)"
                            : ticketInfo.status === "Verified"
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(234, 179, 8, 0.15)",
                        color:
                          ticketInfo.status === "Resolved" || ticketInfo.status === "Closed"
                            ? "#16a34a"
                            : ticketInfo.status === "In Progress"
                            ? "#0284c7"
                            : ticketInfo.status === "Verified"
                            ? "#059669"
                            : "#d97706",
                      }}
                    />
                  </Box>
                </Grid>

                {/* Event Name */}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Event Name
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      color: (t) => (t.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
                    }}
                  >
                    {resolvedEventName}
                  </Typography>
                </Grid>

                {/* Ticket Type */}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ticket Type
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {ticketInfo.ticketType || "Payment Issue"}
                  </Typography>
                </Grid>

                {/* Priority */}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Priority
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {ticketInfo.priority || "Medium"}
                  </Typography>
                </Grid>

                {/* Ticket Number */}
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ticket Number
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {ticketInfo.ticketNo || "--"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Attachment Preview Box */}
            {resolvedAttachment && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.8, fontWeight: 700 }}>
                  Attached Image
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.2,
                    px: 1.5,
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: "10px",
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer", overflow: "hidden" }}
                    onClick={() =>
                      openImagePreview(
                        resolvedAttachment,
                        `${ticketInfo.ticketNo || "Ticket"} - Attached Proof`
                      )
                    }
                  >
                    <Box
                      component="img"
                      src={getImageUrl(resolvedAttachment)}
                      alt="Attachment thumbnail"
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "8px",
                        objectFit: "cover",
                        border: "1px solid rgba(0,0,0,0.12)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                        bgcolor: "#fff",
                        "&:hover": { transform: "scale(1.05)" },
                        transition: "transform 0.2s ease",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Attached Proof Image
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#0284c7", fontSize: "0.7rem", display: "block" }}>
                        Click to view full image
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <AppButton
                      variant="outlined"
                      size="small"
                      startIcon={<ViewIcon sx={{ fontSize: 16 }} />}
                      onClick={() =>
                        openImagePreview(
                          resolvedAttachment,
                          `${ticketInfo.ticketNo || "Ticket"} - Attached Proof`
                        )
                      }
                      sx={{ fontSize: "0.75rem", py: 0.4 }}
                    >
                      Preview
                    </AppButton>
                    <AppButton
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                      onClick={() =>
                        handleDownloadImage(
                          resolvedAttachment,
                          `${ticketInfo.ticketNo || "ticket"}_attachment.png`
                        )
                      }
                      sx={{ fontSize: "0.75rem", py: 0.4 }}
                    >
                      Download
                    </AppButton>
                  </Stack>
                </Box>
              </Box>
            )}

            {/* Update Controls */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppSelect
                  label="Update Status"
                  value={updateStatus}
                  onChange={(e) => {
                    setUpdateStatus(e.target.value);
                    if (errors.updateStatus) setErrors((prev) => ({ ...prev, updateStatus: "" }));
                  }}
                  options={statusOptions}
                  error={!!errors.updateStatus}
                  helperText={errors.updateStatus || ""}
                  required
                  allowClear={true}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AppTextArea
                  label="Resolution Notes / Reply Message"
                  placeholder="Type resolution notes or reply message..."
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (errors.replyText) setErrors((prev) => ({ ...prev, replyText: "" }));
                  }}
                  error={!!errors.replyText}
                  helperText={errors.replyText || ""}
                  minRows={3}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </AppDialog>

      {/* Enlarged Lightbox Image Preview Dialog */}
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
