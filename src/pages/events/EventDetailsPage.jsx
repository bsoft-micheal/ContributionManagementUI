import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

import MetricCard from "../../components/MetricCard";
import apiClient from "../../services/apiClient";
import AppDataTable from "../../components/common/AppDataTable";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/PageHeader";

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: resData } = await apiClient.get(`/events/getEventAsyncById/${id}`);
        const data = (resData && resData.data !== undefined) ? resData.data : resData;
        setEventDetails(data);
      } catch (error) {
        console.error("Failed to load event details", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <Typography color="text.secondary">Loading strategic data...</Typography>
      </Box>
    );
  }

  if (!eventDetails) {
    return (
      <Box sx={{ textAlign: "center", py: 10 }}>
        <Typography variant="h6">Event not found</Typography>
        <AppButton sx={{ mt: 2 }} onClick={() => navigate("/events")}>Back to Events</AppButton>
      </Box>
    );
  }

  const columns = [
    { label: "Member Name", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Amount", key: "amount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.amount}</Typography> },
    {
      label: "Status",
      key: "paymentStatus",
      render: (row) => (
        <Typography
          variant="caption" fontWeight={800}
          sx={{
            color: row.paymentStatus === "Paid" ? "#16a34a" : "#dc2626",
            bgcolor: row.paymentStatus === "Paid" ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
            px: 1.2, py: 0.3, borderRadius: "3px",
            fontSize: "0.7rem", letterSpacing: "0.04em"
          }}
        >
          {row.paymentStatus}
        </Typography>
      )
    },
    { label: "Mode", key: "paymentMode" },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={eventDetails.eventTypeName}
        title={eventDetails.eventName}
        description={`${eventDetails.description} Scheduled for ${dayjs(eventDetails.eventDate).format("DD MMM YYYY")}.`}
        actions={
          <AppButton
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ color: "text.secondary" }}
          >
            Back to List
          </AppButton>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="Total Members" value={eventDetails.participantCount} helper="Members assigned to this event." />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="Expected Amount" value={`₹${eventDetails.totalExpectedAmount}`} helper="Projected amount." />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="Received Amount" value={`₹${eventDetails.totalPaidAmount}`} helper="Confirmed amount." accent="#16a34a" />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%", boxShadow: "0 2px 8px rgba(74,63,107,0.1)", border: "1px solid rgba(74,63,107,0.08)" }}>
            <Box sx={{ bgcolor: "#4a3f6b", color: "#fff", px: 2, py: 1.2 }}>
               <Typography variant="subtitle2" fontWeight={700}>Current Active Members</Typography>
            </Box>
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {eventDetails.participants.map((participant) => (
                  <Box
                    key={participant.id}
                    sx={{
                      p: 1.5,
                      borderRadius: "6px",
                      border: "1px solid rgba(74,63,107,0.08)",
                      bgcolor: "#fcfcff",
                      "&:hover": { bgcolor: "#f5f4fb" }
                    }}
                  >
                    <Typography variant="body2" fontWeight={800} color="primary.main">{participant.memberName}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>{participant.roleName}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <AppDataTable
            title="Contribution Review"
            columns={columns}
            data={eventDetails.contributions}
            loading={false}
          />
        </Grid>
      </Grid>
    </div>
  );
}
