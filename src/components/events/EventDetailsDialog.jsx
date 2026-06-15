import React, { useState, useEffect } from "react";
import { Box, Grid, Typography } from "@mui/material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { GetContributionsByEvent } from "../../services/contributionService";

export default function EventDetailsDialog({ open, onClose, event }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && event?.eventId) {
      const fetchContributions = async () => {
        setLoading(true);
        try {
          const data = await GetContributionsByEvent(event.eventId);
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

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Event Details"
      maxWidth="md"
      actions={
        <AppButton variant="text" color="inherit" onClick={onClose}>
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
                textTransform: "uppercase",
                fontSize: "0.65rem",
              }}
            >
              Event Identity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "#4a3f6b" }}>
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
                textTransform: "uppercase",
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
                textTransform: "uppercase",
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
                textTransform: "uppercase",
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
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    textTransform: "uppercase",
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
                    textTransform: "uppercase",
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
                    textTransform: "uppercase",
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
                  textTransform: "uppercase",
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
