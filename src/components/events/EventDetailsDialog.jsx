import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import { formatViewDate } from "../../utils/dateHelper";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import AppConfirmDialog from "../common/AppConfirmDialog";
import { useAppToast } from "../common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { hasActionPermission } from "../../utils/rightsHelper";
import { deleteEventAsync } from "../../services/eventService";
import { getContributionsByEventAsync } from "../../services/contributionService";
import { getMembersAsync } from "../../services/memberService";
import { COMMON_STRINGS, TOAST_MESSAGES } from "../../constants";

export default function EventDetailsDialog({ open, onClose, event, members = [], onDeleteSuccess }) {
  const toast = useAppToast();
  const { authState } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalMembers, setInternalMembers] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDeleteEvent = Boolean(
    hasActionPermission("Delete Event", 33, authState?.role).canExecute ||
    authState?.role?.toLowerCase() === "admin" ||
    authState?.role?.toLowerCase() === "organizer"
  );

  const handleConfirmDelete = async () => {
    if (!event?.eventId) return;
    setDeleting(true);
    try {
      await deleteEventAsync(event.eventId);
      toast.success(TOAST_MESSAGES?.EVENTS?.DELETED_SUCCESS || "Event deleted successfully");
      setDeleteConfirmOpen(false);
      onClose();
      if (onDeleteSuccess) {
        onDeleteSuccess(event.eventId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES?.GENERAL?.DELETE_FAILED || "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  };

  // Fetch contributions for this event
  useEffect(() => {
    if (open && event?.eventId) {
      const fetchContributions = async () => {
        setLoading(true);
        try {
          const data = await getContributionsByEventAsync(event.eventId);
          setContributions(data || []);
        } catch (error) {
          toast.error("Failed to load event contributions");
        } finally {
          setLoading(false);
        }
      };
      fetchContributions();
    } else {
      setContributions([]);
    }
  }, [open, event?.eventId]);

  // Fallback to fetch members if not passed via props
  useEffect(() => {
    if (open && (!members || members.length === 0)) {
      getMembersAsync()
        .then((res) => {
          if (Array.isArray(res)) setInternalMembers(res);
        })
        .catch(() => {});
    }
  }, [open, members]);

  // Filter all members to only active, non-exited accounts
  const rawMembers = members && members.length > 0 ? members : internalMembers;
  const allMembers = (rawMembers || []).filter(
    (m) => m && m.isActive !== false && !m.isExited && !m.isDeleted
  );

  if (!open || !event) {
    return null;
  }

  const totalExpected = event?.totalExpectedAmount || 0;
  const totalPaid = (contributions || [])
    .filter((c) => c.paymentStatus === "Paid")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalUnpaid = totalExpected - totalPaid;
  const unpaidList = (contributions || []).filter((c) => c.paymentStatus !== "Paid");

  const isBirthday = Boolean(
    event?.eventTypeName?.toLowerCase().includes("birthday") ||
    event?.eventName?.toLowerCase().includes("birthday")
  );

  // Helper to parse celebrants list directly from description string:
  // e.g. "Birthday celebration (4 Office, 0 WFH) for Albin (30 Sep), Michael Antony Raj C (18 Sep)... Planned Budget: ..."
  const parseCelebrantsFromDescription = (desc) => {
    if (!desc) return [];
    const match = desc.match(/for\s+(.*?)(?:\.\s*Planned Budget|\.|$)/i);
    if (!match || !match[1]) return [];
    const celebrantsText = match[1];
    const items = celebrantsText.split(/,\s*/);
    const result = [];
    items.forEach((item, idx) => {
      const cleanItem = item.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      const m = cleanItem.match(/^(.*?)\s*\((.*?)\)$/);
      if (m) {
        result.push({
          id: `parsed-${idx}`,
          name: m[1].trim(),
          dobText: m[2].trim(),
        });
      } else if (cleanItem) {
        result.push({
          id: `parsed-${idx}`,
          name: cleanItem,
          dobText: "--",
        });
      }
    });
    return result;
  };

  // Compile birthday members & DOB table data (strictly deduplicated)
  const getTableCelebrants = () => {
    if (!isBirthday || !event) return [];

    const parsedList = parseCelebrantsFromDescription(event?.description);
    const eventMonth = event?.eventDate ? dayjs(event.eventDate).month() : 0;
    const map = new Map();

    const getDedupeKey = (id, name, dob) => {
      const cleanName = (name || "").toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      const cleanDob = dob ? dayjs(dob).format("YYYY-MM-DD") : "";
      if (cleanName && cleanDob) {
        return `${cleanName}|${cleanDob}`;
      }
      if (id && !String(id).startsWith("parsed-")) {
        return `id:${id}`;
      }
      return cleanName || `id:${id}`;
    };

    // 1. Process parsed items from description (maintains exact list from description)
    parsedList.forEach((item) => {
      const cleanItemName = item.name.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      let match = allMembers.find((m) => {
        if (!m.name) return false;
        const cleanMName = m.name.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        return cleanMName === cleanItemName;
      });

      if (!match) {
        match = allMembers.find((m) => {
          if (!m.name) return false;
          const cleanMName = m.name.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
          return cleanMName.includes(cleanItemName) || cleanItemName.includes(cleanMName);
        });
      }

      const resolvedName = match?.name || item.name;
      const resolvedDob = match?.dateOfBirth || null;
      const dedupeKey = getDedupeKey(match?.memberId || item.id, resolvedName, resolvedDob);

      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, {
          id: match?.memberId || item.id,
          name: resolvedName,
          dateOfBirth: resolvedDob,
          dobFormatted: resolvedDob
            ? dayjs(resolvedDob).format("DD/MM/YYYY")
            : item.dobText,
          dobDayMonth: resolvedDob
            ? dayjs(resolvedDob).format("D MMMM")
            : item.dobText,
          memberType: match?.workType || match?.memberType,
        });
      }
    });

    // 2. Supplement from event.participants or allMembers matching event month
    const participantIds = (event.participants || []).map((p) => p.memberId || p.id);
    let matchedMembers = [];
    if (participantIds.length > 0) {
      const pMembers = allMembers.filter((m) => participantIds.includes(m.memberId) && m.dateOfBirth);
      const monthMatches = pMembers.filter((m) => dayjs(m.dateOfBirth).month() === eventMonth);
      matchedMembers = monthMatches.length > 0 ? monthMatches : pMembers;
    }

    if (matchedMembers.length === 0 && map.size === 0) {
      matchedMembers = allMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === eventMonth
      );
    }

    matchedMembers.forEach((m) => {
      const dedupeKey = getDedupeKey(m.memberId, m.name, m.dateOfBirth);
      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, {
          id: m.memberId,
          name: m.name,
          dateOfBirth: m.dateOfBirth,
          dobFormatted: m.dateOfBirth ? dayjs(m.dateOfBirth).format("DD/MM/YYYY") : "--",
          dobDayMonth: m.dateOfBirth ? dayjs(m.dateOfBirth).format("D MMMM") : "--",
          memberType: m.workType || m.memberType || "Office",
        });
      } else {
        // If already present, enrich missing birth date or ID if parsed item didn't have it
        const existing = map.get(dedupeKey);
        if (!existing.dateOfBirth && m.dateOfBirth) {
          existing.id = m.memberId;
          existing.dateOfBirth = m.dateOfBirth;
          existing.dobFormatted = dayjs(m.dateOfBirth).format("DD/MM/YYYY");
          existing.dobDayMonth = dayjs(m.dateOfBirth).format("D MMMM");
          existing.memberType = m.workType || m.memberType || existing.memberType || "Office";
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dayA = a.dateOfBirth ? dayjs(a.dateOfBirth).date() : 0;
      const dayB = b.dateOfBirth ? dayjs(b.dateOfBirth).date() : 0;
      return dayA - dayB;
    });
  };

  const tableCelebrants = getTableCelebrants();

  // Overview summary text for description
  const getOverviewText = () => {
    if (!event?.description) return "";
    const match = event.description.match(/^(Birthday celebration.*?)\s*for.*?\.\s*(Planned Budget.*)$/i);
    if (match) {
      return `${match[1]} • ${match[2]}`;
    }
    return event.description;
  };

  const overviewText = isBirthday && tableCelebrants.length > 0
    ? getOverviewText()
    : (event?.description || "");

  return (
    <>
      <AppDialog
      open={open}
      onClose={onClose}
      title="Event Details"
      maxWidth="md"
      actions={
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <Box>
            {canDeleteEvent && event?.eventId && totalPaid === 0 && (
              <AppButton
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon sx={{ fontSize: "1.1rem" }} />}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleting}
                sx={{
                  borderColor: "#ef4444",
                  color: "#ef4444",
                  "&:hover": {
                    borderColor: "#dc2626",
                    bgcolor: "rgba(239, 68, 68, 0.08)",
                  },
                }}
              >
                Delete Event
              </AppButton>
            )}
          </Box>
          <AppButton
            variant="outlined"
            color="inherit"
            onClick={onClose}
            sx={{
              borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "rgba(74, 63, 107, 0.4)",
              color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              "&:hover": {
                borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.04)",
              }
            }}
          >
            Close
          </AppButton>
        </Box>
      }
    >
      <Grid container spacing={3}>
        {/* Event Identity */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
                display: "block",
                mb: 0.2,
              }}
            >
              Event Identity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
              {event?.eventName || ""}
            </Typography>
          </Box>
        </Grid>

        {/* Category */}
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
                display: "block",
                mb: 0.2,
              }}
            >
              Category
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {event?.eventTypeName || "Custom Event"}
            </Typography>
          </Box>
        </Grid>

        {/* Date */}
        <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
                display: "block",
                mb: 0.2,
              }}
            >
              Date
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatViewDate(event?.eventDate)}
            </Typography>
          </Box>
        </Grid>

        {/* Created By */}
        <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
                display: "block",
                mb: 0.2,
              }}
            >
              Created By
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {event?.createdByName || event?.createdBy || "--"}
            </Typography>
          </Box>
        </Grid>

        {/* Created On */}
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
                display: "block",
                mb: 0.2,
              }}
            >
              Created On
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatViewDate(event?.createdAt || event?.createdOn)}
            </Typography>
          </Box>
        </Grid>

        {/* Description Section with Birthday Members & DOB Table */}
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0,0,0,0.02)",
              borderRadius: "8px",
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Description
              </Typography>
              {isBirthday && tableCelebrants.length > 0 && (
                <Chip
                  size="small"
                  label={`${tableCelebrants.length} Birthday Celebrant${tableCelebrants.length !== 1 ? "s" : ""}`}
                  sx={{
                    height: 22,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.2)" : "rgba(192, 38, 211, 0.1)",
                    color: (theme) => theme.palette.mode === "dark" ? "#f0abfc" : "#86198f",
                    borderRadius: "6px",
                  }}
                />
              )}
            </Box>

            {overviewText && (
              <Typography
                variant="body2"
                sx={{
                  color: "text.primary",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  mb: isBirthday && tableCelebrants.length > 0 ? 1.5 : 0,
                  fontWeight: 500,
                }}
              >
                {overviewText}
              </Typography>
            )}

            {/* Table of Birthday Members and their DOB */}
            {isBirthday && tableCelebrants.length > 0 && (
              <Box
                sx={{
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(74, 63, 107, 0.25)" : "rgba(74, 63, 107, 0.06)",
                      }}
                    >
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, width: 45, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                        #
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                        Birthday Member
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                        Date of Birth (DOB)
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem", py: 0.8, width: 110, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                        Member Type
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableCelebrants.map((celebrant, index) => (
                      <TableRow
                        key={celebrant.id || index}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                          "&:hover": {
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(74, 63, 107, 0.03)",
                          },
                        }}
                      >
                        <TableCell sx={{ fontSize: "0.75rem", py: 0.8, color: "text.secondary", fontWeight: 700 }}>
                          {index + 1}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", py: 0.8, fontWeight: 700 }}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Typography component="span" sx={{ fontWeight: 700, fontSize: "0.78rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "text.primary" }}>
                              {celebrant.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", py: 0.8, fontWeight: 600, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "text.primary" }}>
                          {celebrant.dobFormatted}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", py: 0.8 }}>
                          <Chip
                            size="small"
                            label={celebrant.workType || celebrant.memberType || "Office"}
                            sx={{
                              height: 18,
                              fontSize: "0.64rem",
                              fontWeight: 700,
                              bgcolor: (celebrant.workType || celebrant.memberType) === "WFH" ? "rgba(234, 88, 12, 0.1)" : "rgba(2, 132, 199, 0.1)",
                              color: (celebrant.workType || celebrant.memberType) === "WFH" ? "#ea580c" : "#0284c7",
                              borderRadius: "4px",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Financial Metrics */}
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    fontSize: "0.65rem",
                  }}
                >
                  Total Expected
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main" }}>
                  ₹{totalExpected.toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ borderLeft: { md: "1px solid rgba(0,0,0,0.08)" }, pl: { md: 2 } }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    fontSize: "0.65rem",
                  }}
                >
                  Total Paid
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "success.main" }}>
                  ₹{totalPaid.toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ borderLeft: { md: "1px solid rgba(0,0,0,0.08)" }, pl: { md: 2 } }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    fontSize: "0.65rem",
                  }}
                >
                  Unpaid Amount
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#dc2626" }}>
                  ₹{totalUnpaid.toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>

        {/* Unpaid Members List */}
        {unpaidList.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: "rgba(220, 38, 38, 0.02)",
                borderRadius: "6px",
                border: "1px solid rgba(220, 38, 38, 0.08)",
                mt: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "#dc2626",
                  fontSize: "0.65rem",
                  display: "block",
                  mb: 1,
                }}
              >
                Unpaid List
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {unpaidList.map((c) => (
                  <Typography
                    key={c.memberId}
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      bgcolor: "rgba(220, 38, 38, 0.05)",
                      color: "#dc2626",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                    }}
                  >
                    {c.memberName}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>
    </AppDialog>

    <AppConfirmDialog
      open={deleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      onConfirm={handleConfirmDelete}
      title={COMMON_STRINGS?.DIALOGS?.CONFIRM_TITLE || "Confirm Delete"}
      content={COMMON_STRINGS?.DIALOGS?.DELETE_CONFIRM_MSG || "Are you sure you want to delete this event?"}
      confirmText="Delete"
      confirmColor="error"
    />
  </>
  );
}
