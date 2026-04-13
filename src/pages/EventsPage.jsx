import React, { useEffect, useState } from "react";
import {
  Box,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Visibility as ViewIcon, Edit as EditIcon, Add as AddIcon, Save as SaveIcon } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useAppToast } from "../components/common/AppToast";
import AppInput from "../components/common/AppInput";
import AppTextArea from "../components/common/AppTextArea";
import AppSelect from "../components/common/AppSelect";
import AppDateInput from "../components/common/AppDateInput";
import AppButton from "../components/common/AppButton";
import { useAuth } from "../contexts/AuthContext";
import { GetEvents, CreateEvent, UpdateEvent } from "../services/eventService";
import { GetEventTypes } from "../services/eventTypeService";
import { GetMembers } from "../services/memberService";
import { GetContributionsByEvent } from "../services/contributionService";
import AppDataTable from "../components/common/AppDataTable";
import AppDialog from "../components/common/AppDialog";

const initialForm = {
  eventName: "",
  eventTypeId: "",
  eventDate: dayjs(),
  description: "",
  baseAmount: 0,
  participantIds: [],
  contributionOverrides: [],
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [contributions, setContributions] = useState([]);
  const { authState } = useAuth();
  const navigate = useNavigate();
  const toast = useAppToast();

  async function loadData() {
    const [events, types, members] = await Promise.all([
      GetEvents(filters),
      GetEventTypes(),
      GetMembers(),
    ]);
    setEvents(events);
    setEventTypes(types);
    setMembers(members);
  }

  useEffect(() => {
    loadData();
  }, [filters]);

  async function handleSubmit() {
    try {
      if (form.eventId) {
        await UpdateEvent(form.eventId, form);
        toast.success("Operational event modified");
      } else {
        await CreateEvent(form);
        toast.success("New operational cycle scheduled");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Failed to synchronize event scheduling");
    }
  }

  const typeOptions = eventTypes.map(t => ({ label: t.eventTypeName, value: t.eventTypeId }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ 
    label: dayjs().month(i).format("MMMM"), 
    value: i + 1 
  }));

  const columns = [
    {
      label: "Action",
      render: (row) => (
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            <Tooltip title="View Details">
              <IconButton size="small" sx={{ p: 0.3 }} 
                onClick={async () => { 
                  setSelectedEvent(row); 
                  const data = await GetContributionsByEvent(row.eventId);
                  setContributions(data);
                  setViewDialogOpen(true); 
                }}
              >
                <ViewIcon sx={{ fontSize: "1.1rem", color: "#4a3f6b" }} />
              </IconButton>
            </Tooltip>
            {authState?.role === "Admin" && (
              <Tooltip title="Edit Event">
                <IconButton size="small" sx={{ p: 0.3 }} 
                  onClick={() => { 
                    setForm({
                      ...row,
                      eventDate: dayjs(row.eventDate),
                      participantIds: row.participantIds || [] 
                    });
                    setDialogOpen(true); 
                  }}
                >
                  <EditIcon sx={{ fontSize: "1.1rem", color: "#4a3f6b" }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
      )
    },
    { label: "Event Name", key: "eventName", render: (row) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">{row.eventName}</Typography>
    )},
    { label: "Category", key: "eventTypeName", render: (row) => <Typography variant="body2">{row.eventTypeName}</Typography> },
    { label: "Date", key: "eventDate", render: (row) => dayjs(row.eventDate).format("DD/MM/YYYY") },
    {
      label: "Status",
      render: () => (
        <Box sx={{ px: 1, py: 0.2, bgcolor: "rgba(74,63,107,0.08)", border: "1px solid rgba(74,63,107,0.2)", borderRadius: "3px", display: "inline-block" }}>
          <Typography variant="caption" fontWeight={800} color="#4a3f6b" sx={{ letterSpacing: "0.05em", fontSize: "0.7rem" }}>ACTIVE</Typography>
        </Box>
      )
    },
    {
      label: "Valuation",
      key: "totalExpectedAmount",
      align: "right",
      render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.totalExpectedAmount}</Typography>
    }
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Active Scheduled Events"
        columns={columns}
        data={events}
        actions={
          authState?.role === "Admin" && (
            <AppButton
              size="small"
              variant="contained"
              onClick={() => { setForm(initialForm); setDialogOpen(true); }}
            >
              Add
            </AppButton>
          )
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <AppSelect
                label="Month"
                value={filters.month}
                onChange={(event) => setFilters((current) => ({ ...current, month: Number(event.target.value) }))}
                options={monthOptions}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <AppInput
                label="Year"
                type="number"
                value={filters.year}
                onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.65rem" }}>Projected Revenue</Typography>
                <Typography variant="body2" fontWeight={800} color="primary.main" display="block">₹{events.reduce((sum, e) => sum + e.totalExpectedAmount, 0)}</Typography>
              </Box>
            </Grid>
          </Grid>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.eventId ? "Modify Strategic Event" : "Schedule New Operation"}
        actions={
          <>
            <AppButton variant="text" color="inherit" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}>Deploy Operation</AppButton>
          </>
        }
      >
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput label="Operational Name" value={form.eventName} onChange={(event) => setForm((current) => ({ ...current, eventName: event.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppInput label="Base Contribution Amount" value={form.baseAmount} onChange={(event) => setForm((current) => ({ ...current, baseAmount: event.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppSelect
              label="Strategic Category"
              value={form.eventTypeId}
              onChange={(event) => setForm((current) => ({ ...current, eventTypeId: event.target.value }))}
              options={typeOptions}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AppDateInput
              label="Scheduled Date"
              value={form.eventDate}
              onChange={(newValue) => setForm((current) => ({ ...current, eventDate: newValue }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <AppTextArea label="Event Description" minRows={3} maxRows={6} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 3, borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(79, 70, 229, 0.02)" }}>
              <Typography variant="caption" sx={{ mb: 2, fontWeight: 900, textTransform: "uppercase", color: "text.secondary" }}>
                Engagement Target (Participants)
              </Typography>
              <Grid container spacing={1}>
                {members.map((member) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={member.memberId}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={form.participantIds.includes(member.memberId)}
                          onChange={() => {
                            const newIds = form.participantIds.includes(member.memberId)
                              ? form.participantIds.filter((id) => id !== member.memberId)
                              : [...form.participantIds, member.memberId];
                            setForm((current) => ({ ...current, participantIds: newIds }));
                          }}
                        />
                      }
                      label={<Typography variant="caption" fontWeight={700}>{member.name}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </AppDialog>

      <AppDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        title="Event Intelligence Overview"
        maxWidth="md"
        actions={<AppButton variant="contained" size="small" onClick={() => setViewDialogOpen(false)}>Acknowledge</AppButton>}
      >
        {selectedEvent && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}>Event Identity</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#4a3f6b" }}>{selectedEvent.eventName}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}>Category</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>{selectedEvent.eventTypeName}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}>Date</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>{dayjs(selectedEvent.eventDate).format("DD MMMM YYYY")}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 1.5, bgcolor: "rgba(0,0,0,0.02)", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.05)" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", display: "block", mb: 0.5, fontSize: "0.65rem" }}>Description</Typography>
                <Typography variant="caption" sx={{ color: "text.primary", lineHeight: 1.4 }}>{selectedEvent.description || "No tactical description provided."}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}>Total Expected</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main" }}>₹{selectedEvent.totalExpectedAmount}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 2.5 }}>
                  <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", pl: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}>Total Paid</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "success.main" }}>
                      ₹{contributions.filter(c => c.paymentStatus === "Paid").reduce((sum, c) => sum + (c.amount || 0), 0)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 2.5 }}>
                  <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", pl: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}>Unpaid Amount</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#dc2626" }}>
                      ₹{selectedEvent.totalExpectedAmount - contributions.filter(c => c.paymentStatus === "Paid").reduce((sum, c) => sum + (c.amount || 0), 0)}
                    </Typography>
                  </Box>
                </Grid>
                {contributions.filter(c => c.paymentStatus !== "Paid").length > 0 && (
                  <Grid size={{ xs: 12, md: 4.5 }}>
                    <Box sx={{ borderLeft: { md: "1px solid rgba(0,0,0,0.08)" }, pl: { md: 2 } }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem", display: "block", mb: 0.5 }}>Unpaid List</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {contributions.filter(c => c.paymentStatus !== "Paid").map(c => (
                          <Typography key={c.memberId} variant="caption" sx={{ px: 1, py: 0.2, bgcolor: "rgba(220, 38, 38, 0.05)", color: "#dc2626", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                            {c.memberName}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        )}
      </AppDialog>
    </div>
  );
}
