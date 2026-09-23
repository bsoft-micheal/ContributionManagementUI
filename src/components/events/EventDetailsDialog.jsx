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
} from "@mui/material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { GetContributionsByEventAsync } from "../../services/contributionService";
import { GetMembersAsync } from "../../services/memberService";

export default function EventDetailsDialog({ open, onClose, event, members = [] }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalMembers, setInternalMembers] = useState([]);

  // Fetch contributions for this event
  useEffect(() => {
    if (open && event?.eventId) {
      const fetchContributions = async () => {
        setLoading(true);
        try {
          const data = await GetContributionsByEventAsync(event.eventId);
          setContributions(data || []);
        } catch (error) {
          console.error("Failed to load contributions:", error);
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
      GetMembersAsync()
        .then((res) => {
          if (Array.isArray(res)) setInternalMembers(res);
        })
        .catch((err) => console.warn("Failed to load members for event details:", err));
    }
  }, [open, members]);

  if (!event) return null;

  const allMembers = members && members.length > 0 ? members : internalMembers;

  const totalExpected = event.totalExpectedAmount || 0;
  const totalPaid = contributions
    .filter((c) => c.paymentStatus === "Paid")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalUnpaid = totalExpected - totalPaid;
  const unpaidList = contributions.filter((c) => c.paymentStatus !== "Paid");

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
      const m = item.match(/^(.*?)\s*\((.*?)\)$/);
      if (m) {
        result.push({
          id: `parsed-${idx}`,
          name: m[1].trim(),
          dobText: m[2].trim(),
        });
      } else if (item.trim()) {
        result.push({
          id: `parsed-${idx}`,
          name: item.trim(),
          dobText: "--",
        });
      }
    });
    return result;
  };

  // Compile birthday members & DOB table data
  const getTableCelebrants = () => {
    if (!isBirthday) return [];

    const parsedList = parseCelebrantsFromDescription(event.description);
    const eventMonth = dayjs(event.eventDate).month();
    const map = new Map();

    // 1. Process parsed items from description (maintains exact list from description)
    parsedList.forEach((item) => {
      const match = allMembers.find((m) => {
        if (!m.name) return false;
        const a = m.name.toLowerCase().trim();
        const b = item.name.toLowerCase().trim();
        return a === b || a.includes(b) || b.includes(a);
      });

      map.set(item.name.toLowerCase(), {
        id: match?.memberId || item.id,
        name: match?.name || item.name,
        dateOfBirth: match?.dateOfBirth || null,
        dobFormatted: match?.dateOfBirth
          ? dayjs(match.dateOfBirth).format("DD/MM/YYYY")
          : item.dobText,
        dobDayMonth: match?.dateOfBirth
          ? dayjs(match.dateOfBirth).format("D MMMM")
          : item.dobText,
        memberType: match?.memberType || "Office",
      });
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
      const key = (m.name || "").toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: m.memberId,
          name: m.name,
          dateOfBirth: m.dateOfBirth,
          dobFormatted: m.dateOfBirth ? dayjs(m.dateOfBirth).format("DD/MM/YYYY") : "--",
          dobDayMonth: m.dateOfBirth ? dayjs(m.dateOfBirth).format("D MMMM") : "--",
          memberType: m.memberType || "Office",
        });
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
    if (!event.description) return "";
    const match = event.description.match(/^(Birthday celebration.*?)\s*for.*?\.\s*(Planned Budget.*)$/i);
    if (match) {
      return `${match[1]} • ${match[2]}`;
    }
    return event.description;
  };

  const overviewText = isBirthday && tableCelebrants.length > 0
    ? getOverviewText()
    : event.description;

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Event Details"
      maxWidth="md"
      actions={
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
      }
    >
      <Grid container spacing={3}>
        {/* Event Identity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Event Identity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
              {event.eventName}
            </Typography>
          </Box>
        </Grid>

        {/* Category */}
        <Grid size={{ xs: 6, md: 3 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Category
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
              {event.eventTypeName || "Custom Event"}
            </Typography>
          </Box>
        </Grid>

        {/* Date */}
        <Grid size={{ xs: 6, md: 3 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Date
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
              {dayjs(event.eventDate).format("DD MMMM YYYY")}
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
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Typography component="span" sx={{ fontSize: "0.85rem" }}>🎂</Typography>
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
                            label={celebrant.memberType || "Office"}
                            sx={{
                              height: 18,
                              fontSize: "0.64rem",
                              fontWeight: 700,
                              bgcolor: celebrant.memberType === "WFH" ? "rgba(234, 88, 12, 0.1)" : "rgba(2, 132, 199, 0.1)",
                              color: celebrant.memberType === "WFH" ? "#ea580c" : "#0284c7",
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
  );
}
