import React, { useState, useEffect } from "react";
import { Box, Grid, Typography } from "@mui/material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { GetContributionsByEventAsync } from "../../services/contributionService";

export default function EventDetailsDialog({ open, onClose, event, members = [] }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);

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

  if (!event) return null;

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

  const getBirthdayCelebrants = () => {
    if (!isBirthday || !event) return [];
    const eventMonth = dayjs(event.eventDate).month();
    const participantIds = (event.participants || []).map((p) => p.memberId || p.id);
    let matched = [];

    if (participantIds.length > 0) {
      const pMembers = members.filter((m) => participantIds.includes(m.memberId) && m.dateOfBirth);
      const monthMatches = pMembers.filter((m) => dayjs(m.dateOfBirth).month() === eventMonth);
      matched = monthMatches.length > 0 ? monthMatches : pMembers;
    }

    const textToSearch = `${event.eventName || ""} ${event.description || ""}`.toLowerCase();
    const nameMatches = members.filter((m) => {
      if (!m.name || !m.dateOfBirth) return false;
      const lowerName = m.name.toLowerCase().trim();
      if (textToSearch.includes(lowerName)) return true;
      const parts = lowerName.split(/\s+/).filter((p) => p.length >= 3);
      return parts.length > 0 && parts.some((p) => textToSearch.includes(p));
    });

    const map = new Map();
    matched.forEach((c) => map.set(c.memberId, c));
    nameMatches.forEach((c) => map.set(c.memberId, c));

    if (map.size === 0) {
      members
        .filter((m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === eventMonth)
        .forEach((c) => map.set(c.memberId, c));
    }

    return Array.from(map.values()).sort((a, b) => {
      const dayA = a.dateOfBirth ? dayjs(a.dateOfBirth).date() : 0;
      const dayB = b.dateOfBirth ? dayjs(b.dateOfBirth).date() : 0;
      return dayA - dayB;
    });
  };

  const celebrantsList = getBirthdayCelebrants();

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
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 1.5,
              bgcolor: "rgba(0,0,0,0.02)",
              borderRadius: "6px",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                display: "block",
                mb: 0.5,
                fontSize: "0.65rem",
              }}
            >
              Description
            </Typography>
            <Typography variant="caption" sx={{ color: "text.primary", lineHeight: 1.4 }}>
              {event.description || "No tactical description provided."}
            </Typography>
          </Box>
        </Grid>

        {isBirthday && celebrantsList.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.12)" : "rgba(192, 38, 211, 0.05)",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.25)" : "rgba(192, 38, 211, 0.15)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: (theme) => theme.palette.mode === "dark" ? "#f0abfc" : "#86198f",
                    fontSize: "0.75rem",
                  }}
                >
                  🎂 Birthday Celebrants
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  {celebrantsList.length} celebrant{celebrantsList.length !== 1 ? "s" : ""}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {celebrantsList.map((c) => (
                  <Box
                    key={c.memberId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: "14px",
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
                      border: "1px solid",
                      borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.3)" : "rgba(192, 38, 211, 0.2)",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      🎂 {c.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: (theme) => theme.palette.mode === "dark" ? "#f5d0fe" : "#a21caf",
                        fontFamily: "monospace, 'Outfit', sans-serif",
                        fontSize: "0.78rem",
                      }}
                    >
                      {c.dateOfBirth ? dayjs(c.dateOfBirth).format("D MMM") : ""}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        )}

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
                  ₹{totalExpected}
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
                  ₹{totalPaid}
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
                  ₹{totalUnpaid}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
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
