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
import { formatViewDate, formatGridDate } from "../../utils/dateHelper";
import { ArrowBack as ArrowBackIcon, NotificationsActive as NotificationsActiveIcon, Send as SendIcon } from "@mui/icons-material";
import { Tooltip, IconButton } from "@mui/material";
import MetricCard from "../../components/MetricCard";
import apiClient from "../../services/apiClient";
import AppDataTable from "../../components/common/AppDataTable";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/PageHeader";
import { useAppToast } from "../../components/common/AppToast";
import { sendRemindersForEventAsync, sendReminderForContributionAsync } from "../../services/contributionService";

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useAppToast();
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingBulk, setSendingBulk] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: resData } = await apiClient.get(`/events/getEventAsyncById/${id}`);
        const data = (resData && resData.data !== undefined) ? resData.data : resData;
        setEventDetails(data);
      } catch {
        toast.error("Failed to load event details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleSendBulkReminders = async () => {
    try {
      setSendingBulk(true);
      await sendRemindersForEventAsync(id);
      toast.success("Hangfire reminder emails dispatched for all unpaid participants!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dispatch reminder emails.");
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendSingleReminder = async (contribution) => {
    try {
      await sendReminderForContributionAsync(contribution.contributionId);
      toast.success(`Reminder enqueued for ${contribution.memberName}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to send reminder for ${contribution.memberName}`);
    }
  };

  if (loading) {
    return <div className="page-shell" />;
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
    {
      label: "Action",
      sx: { width: 90, minWidth: 90 },
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {row.paymentStatus !== "Paid" && (
            <Tooltip title={`Send Reminder to ${row.memberName}`}>
              <IconButton
                size="small"
                sx={{ p: 0.4, color: "#f59e0b" }}
                onClick={() => handleSendSingleReminder(row)}
              >
                <SendIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    { label: "Member Name", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Amount", key: "amount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{Number(row.amount || 0).toLocaleString("en-IN")}</Typography> },
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
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
    {
      label: "Created On",
      key: "createdAt",
      render: (row) => formatGridDate(row.createdAt || row.CreatedAt || row.createdOn || row.CreatedOn),
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={eventDetails.eventTypeName}
        title={eventDetails.eventName}
        description={`${(eventDetails.description || "").replace(/<!--contrib:.*?-->/g, "").trim()} Scheduled for ${
          eventDetails.eventDates
            ? String(eventDetails.eventDates)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((d) => {
                  const match = d.match(/^(.*?)(?:\s*\((\d+)\))?$/);
                  const datePart = match && match[1] ? match[1].trim() : d;
                  const count = match && match[2] ? Number(match[2]) : 1;
                  return count > 1 ? `${datePart} (${count})` : datePart;
                })
                .join(", ")
            : formatViewDate(eventDetails.eventDate)
        }.`}
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <AppButton
              variant="contained"
              startIcon={<NotificationsActiveIcon />}
              disabled={sendingBulk}
              onClick={handleSendBulkReminders}
              sx={{
                bgcolor: "#0284c7 !important",
                "&:hover": { bgcolor: "#0369a1 !important" },
                fontWeight: 700,
              }}
            >
              {sendingBulk ? "Sending..." : "Send Reminders"}
            </AppButton>
            <AppButton
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{ color: "text.secondary" }}
            >
              Back to List
            </AppButton>
          </Box>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="Total Members" value={eventDetails.participantCount} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="Expected Amount" value={`₹${Number(eventDetails.totalExpectedAmount || 0).toLocaleString("en-IN")}`} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="Received Amount" value={`₹${Number(eventDetails.totalPaidAmount || 0).toLocaleString("en-IN")}`} accent="#16a34a" />
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
