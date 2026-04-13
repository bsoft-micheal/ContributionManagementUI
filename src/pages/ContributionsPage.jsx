import React, { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
  IconButton,
  Tooltip
} from "@mui/material";
import { 
  Payments as PaymentsIcon,
  Visibility as ViewIcon,
  Add as AddIcon
} from "@mui/icons-material";

import dayjs from "dayjs";
import AppInput from "../components/common/AppInput";
import AppSelect from "../components/common/AppSelect";
import AppDateInput from "../components/common/AppDateInput";
import AppButton from "../components/common/AppButton";
import { GetContributionsByEvent, RecordPayment } from "../services/contributionService";
import { GetEvents } from "../services/eventService";
import AppDataTable from "../components/common/AppDataTable";
import AppDialog from "../components/common/AppDialog";
import { useAppToast } from "../components/common/AppToast";

const initialPayment = {
  eventId: "",
  memberId: "",
  amount: "",
  paymentMode: "Upi",
  paymentDate: dayjs(),
};

export default function ContributionsPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [contributions, setContributions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payment, setPayment] = useState(initialPayment);
  const [allContributions, setAllContributions] = useState([]);
  const toast = useAppToast();

  useEffect(() => {
    async function loadEvents() {
      const data = await GetEvents();
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventId(data[0].eventId);
      }
      const allData = await GetContributions();
      setAllContributions(allData);
    }

    loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    async function loadContributions() {
      const data = await GetContributionsByEvent(selectedEventId);
      
      // Calculate Arrears (Sum of unpaid contributions BEFORE this event's date or just other unpaid)
      const enrichedData = data.map(c => {
        const previousUnpaid = allContributions
          .filter(prev => 
            prev.memberId === c.memberId && 
            prev.paymentStatus !== "Paid" && 
            prev.contributionId !== c.contributionId
          )
          .reduce((sum, prev) => sum + (prev.amount || 0), 0);
        
        return {
          ...c,
          previousUnpaid,
          totalAccumulated: (c.amount || 0) + previousUnpaid
        };
      });
      
      setContributions(enrichedData);
    }

    loadContributions();
  }, [selectedEventId]);

  async function handlePay() {
    try {
      await RecordPayment({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString(),
        amount: payment.amount === "" ? null : Number(payment.amount),
      });
      toast.success("Contribution marked as paid.");
      setDialogOpen(false);
      const data = await GetContributionsByEvent(selectedEventId);
      setContributions(data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to update contribution.");
    }
  }

  const eventOptions = events.map(e => ({ label: e.eventName, value: e.eventId }));
  const modeOptions = ["Cash", "Upi", "BankTransfer", "Card"].map(m => ({ label: m, value: m }));

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
          <Tooltip title={row.paymentStatus === "Paid" ? "Already Paid" : "Record Payment"}>
            <span>
              <IconButton
                size="small"
                disabled={row.paymentStatus === "Paid"}
                onClick={() => {
                  setPayment({ eventId: row.eventId, memberId: row.memberId, amount: row.amount, paymentMode: "Upi", paymentDate: dayjs() });
                  setDialogOpen(true);
                }}
                sx={{ p: 0.3, color: row.paymentStatus === "Paid" ? "#ccc" : "#4a3f6b" }}
              >
                <PaymentsIcon sx={{ fontSize: "1.1rem" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
    { label: "Member", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
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
            textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.04em"
          }}
        >
          {row.paymentStatus}
        </Typography>
      )
    },
    { label: "Amount", key: "amount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.amount}</Typography> },
    { 
      label: "Arrears", 
      key: "previousUnpaid", 
      align: "right", 
      render: (row) => (
        <Tooltip title="Outstanding from previous cycles">
          <Typography variant="body2" color="error.main" fontWeight={row.previousUnpaid > 0 ? 800 : 400}>
            ₹{row.previousUnpaid}
          </Typography>
        </Tooltip>
      )
    },
    { 
      label: "Total Due", 
      key: "totalAccumulated", 
      align: "right", 
      render: (row) => (
        <Typography variant="body2" fontWeight={900} color="primary.main">
          ₹{row.totalAccumulated}
        </Typography>
      ) 
    },
    { label: "Mode", key: "paymentMode" },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Contribution Collections"
        columns={columns}
        data={contributions}
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect
                label="Selected Event"
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                options={eventOptions}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                    Net Realized
                  </Typography>
                  <Typography variant="body1" fontWeight={900} color="success.main" sx={{ lineHeight: 1 }}>
                    ₹{contributions.filter(c => c.paymentStatus === "Paid").reduce((sum, c) => sum + c.amount, 0)}
                  </Typography>
                </Box>
                <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", pl: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                     Enrollment
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1 }}>{contributions.length} Members</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        }
      />

      <AppDialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        fullWidth 
        maxWidth="xs"
        title="Confirm Capital Receipt"
        actions={
          <>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton variant="contained" onClick={handlePay}>Acknowledge Payment</AppButton>
          </>
        }
      >
        <Stack spacing={3} sx={{ pt: 1 }}>
          <AppInput 
            label="Realized Contribution Amount" 
            type="number" 
            value={payment.amount} 
            onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} 
          />
          <AppSelect
            label="Capital Transfer Method"
            value={payment.paymentMode}
            onChange={(event) => setPayment((current) => ({ ...current, paymentMode: event.target.value }))}
            options={modeOptions}
          />
          <AppDateInput
            label="Engagement Date"
            value={payment.paymentDate}
            onChange={(newValue) => setPayment((current) => ({ ...current, paymentDate: newValue }))}
          />
        </Stack>
      </AppDialog>
    </div>
  );
}

