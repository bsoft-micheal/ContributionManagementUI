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
  Add as AddIcon,
  Save as SaveIcon
} from "@mui/icons-material";

import dayjs from "dayjs";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import { GetContributions, GetContributionsByEvent, RecordPayment } from "../../services/contributionService";
import { GetEvents } from "../../services/eventService";
import { GetMembers } from "../../services/memberService";
import { GetRoles } from "../../services/roleService";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";

const initialPayment = {
  eventId: "",
  memberId: "",
  amount: "",
  paymentMode: "Upi",
  paymentDate: dayjs(),
};

export default function ContributionsPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Contributions", authState?.role);
  const hasWriteAccess = rights.write;

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [filterEventId, setFilterEventId] = useState("");
  const [contributions, setContributions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payment, setPayment] = useState(initialPayment);
  const [allContributions, setAllContributions] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();

  useEffect(() => {
    async function loadEvents() {
      try {
        const [mems, rls, data] = await Promise.all([
          GetMembers(),
          GetRoles(),
          GetEvents()
        ]);
        setMembers(mems);
        setRoles(rls);
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].eventId);
          setFilterEventId(data[0].eventId);
        }
        const allData = await GetContributions();
        setAllContributions(allData);
      } catch (error) {
        console.error("Error loading events & contributions:", error);
      }
    }

    loadEvents();
  }, []);

  const getContributionOutstanding = (c, member, role, event) => {
    let expectedAmount = c.amount || 0;
    if (member && role && event) {
      const eventDate = dayjs(event.eventDate);
      const joiningDate = dayjs(member.joiningDate);
      const tenureYears = eventDate.diff(joiningDate, 'year', true);
      const isLessThanOneYear = tenureYears < 1;
      
      const baseAmount = role.defaultContributionAmount || 0;
      const percentage = isLessThanOneYear ? 0.5 : 1.0;
      expectedAmount = baseAmount * percentage;
    }
    
    const paidAmount = c.paymentStatus === "Paid" ? (c.amount || 0) : 0;
    return Math.max(0, expectedAmount - paidAmount);
  };

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    async function loadContributions() {
      try {
        const data = await GetContributionsByEvent(selectedEventId);
        const selectedEvent = events.find(e => e.eventId === selectedEventId);
        
        const enrichedData = data.map(c => {
          const member = members.find(m => m.memberId === c.memberId);
          const role = member ? roles.find(r => r.roleId === member.roleId) : null;
          const event = events.find(e => e.eventId === c.eventId) || selectedEvent;
          
          // Calculate Arrears (Sum of unpaid contributions BEFORE this event's date or just other unpaid)
          const previousUnpaid = allContributions
            .filter(prev => 
              prev.memberId === c.memberId && 
              prev.eventId !== c.eventId
            )
            .reduce((sum, prev) => {
              const prevEvent = events.find(e => e.eventId === prev.eventId);
              return sum + getContributionOutstanding(prev, member, role, prevEvent);
            }, 0);
          
          const currentOutstanding = getContributionOutstanding(c, member, role, event);
          
          return {
            ...c,
            previousUnpaid,
            totalAccumulated: currentOutstanding + previousUnpaid
          };
        });
        
        setContributions(enrichedData);
      } catch (error) {
        console.error("Error loading contributions:", error);
      }
    }

    loadContributions();
  }, [selectedEventId, allContributions, members, roles, events]);

  async function handlePay() {
    const newErrors = {};
    if (payment.amount === "" || payment.amount === null || payment.amount === undefined) {
      newErrors.amount = "This field is required";
    } else if (Number(payment.amount) < 0) {
      newErrors.amount = "Amount cannot be negative";
    }
    if (!payment.paymentMode) newErrors.paymentMode = "This field is required";
    if (!payment.paymentDate) newErrors.paymentDate = "This field is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      await RecordPayment({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString(),
        amount: payment.amount === "" ? null : Number(payment.amount),
      });
      toast.success("Saved successfully");
      setDialogOpen(false);
      
      // Reload the global list which automatically triggers the dependency recalculation
      const allData = await GetContributions();
      setAllContributions(allData);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to save.");
    }
  }

  const eventOptions = events.map(e => ({ label: e.eventName, value: e.eventId }));
  const modeOptions = ["Cash", "Upi", "BankTransfer", "Card"].map(m => ({ label: m, value: m }));

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
          <Tooltip title={row.paymentStatus === "Paid" ? "Already Paid" : (hasWriteAccess ? "Record Payment" : "")}>
            <span>
              <IconButton
                size="small"
                disabled={row.paymentStatus === "Paid" || !hasWriteAccess}
                onClick={() => {
                  setPayment({ eventId: row.eventId, memberId: row.memberId, amount: row.amount, paymentMode: "Upi", paymentDate: dayjs() });
                  setErrors({});
                  setDialogOpen(true);
                }}
                sx={{ p: 0.3, color: row.paymentStatus === "Paid" || !hasWriteAccess ? "#cbd5e1" : "#4a3f6b" }}
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
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 220 }}>
                <AppSelect
                  label="Selected Event"
                  value={filterEventId}
                  onChange={(event) => setFilterEventId(event.target.value)}
                  options={eventOptions}
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                onClick={() => {
                  setSelectedEventId(filterEventId);
                 
                }}
                sx={{
                  bgcolor: "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: "#3b325c !important" }
                }}
              >
                Filter
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                onClick={() => {
                  if (events.length > 0) {
                    const firstEventId = events[0].eventId;
                    setFilterEventId(firstEventId);
                    setSelectedEventId(firstEventId);
                  }
                 
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)"
                  }
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 3, alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                   Total Income
                  </Typography>
                  <Typography variant="body1" fontWeight={900} color="success.main" sx={{ lineHeight: 1 }}>
                    ₹{contributions.filter(c => c.paymentStatus === "Paid").reduce((sum, c) => sum + c.amount, 0)}
                  </Typography>
                </Box>
                <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", pl: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                    Total Members
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
        title="Record Payment"
        actions={
          <>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handlePay} sx={{ bgcolor: "#4a3f6b !important", "&:hover": { bgcolor: "#3b325c !important" } }}>Save</AppButton>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
          </>
        }
      >
        <Stack spacing={3} sx={{ pt: 1 }}>
          <AppInput 
            label="Amount" 
            type="number" 
            value={payment.amount} 
            onChange={(event) => {
              setPayment((current) => ({ ...current, amount: event.target.value }));
              if (errors.amount) setErrors(prev => ({ ...prev, amount: "" }));
            }} 
            error={!!errors.amount}
            helperText={errors.amount}
            required
          />
          <AppSelect
            label="Payment Mode"
            value={payment.paymentMode}
            onChange={(event) => {
              setPayment((current) => ({ ...current, paymentMode: event.target.value }));
              if (errors.paymentMode) setErrors(prev => ({ ...prev, paymentMode: "" }));
            }}
            options={modeOptions}
            error={!!errors.paymentMode}
            helperText={errors.paymentMode}
            required
          />
          <AppDateInput
            label="Payment Date"
            value={payment.paymentDate}
            onChange={(newValue) => {
              setPayment((current) => ({ ...current, paymentDate: newValue }));
              if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: "" }));
            }}
            error={!!errors.paymentDate}
            helperText={errors.paymentDate}
            required
          />
        </Stack>
      </AppDialog>
    </div>
  );
}
