import React, { useEffect, useState } from "react";
import { Box, Grid, Typography, Card, CardContent, Divider, Chip } from "@mui/material";
import dayjs from "dayjs";
import { GetMembers } from "../services/memberService";
import { GetRoles } from "../services/roleService";
import AppDataTable from "../components/common/AppDataTable";
import AppSelect from "../components/common/AppSelect";
import AppButton from "../components/common/AppButton";
import AppDialog from "../components/common/AppDialog";
import { GetContributionsByEvent, RecordPayment } from "../services/contributionService";
import { GetEvents } from "../services/eventService";

export default function ContributionCalculationPage() {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculationData, setCalculationData] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  useEffect(() => {
    loadBaseData();
  }, []);

  async function loadBaseData() {
    setLoading(true);
    try {
      const [mems, rls, evts] = await Promise.all([
        GetMembers(),
        GetRoles(),
        GetEvents()
      ]);
      setMembers(mems);
      setRoles(rls);
      setEvents(evts);
      if (evts.length > 0) setSelectedEventId(evts[0].eventId);
    } catch (error) {
      console.error("Error loading calculation data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (members.length && roles.length && selectedEventId) {
      calculateContributions();
    }
  }, [members, roles, selectedEventId]);

  const calculateContributions = () => {
    const selectedEvent = events.find(e => e.eventId === selectedEventId);
    const eventDate = selectedEvent ? dayjs(selectedEvent.eventDate) : dayjs();

    const calculated = members.map(member => {
      const role = roles.find(r => r.roleId === member.roleId);
      const joiningDate = dayjs(member.joiningDate);
      const tenureYears = eventDate.diff(joiningDate, 'year', true);
      const isLessThanOneYear = tenureYears < 1;
      
      const baseAmount = role?.defaultContributionAmount || 0;
      const percentage = isLessThanOneYear ? 0.5 : 1.0;
      const calculatedAmount = baseAmount * percentage;

      return {
        ...member,
        tenure: tenureYears.toFixed(2),
        percentage: (percentage * 100).toFixed(0) + "%",
        baseAmount,
        calculatedAmount,
        isLessThanOneYear
      };
    });

    setCalculationData(calculated);
  };

  const columns = [
    { label: "Member Name", key: "name", render: (row) => <Typography variant="body2" fontWeight={700}>{row.name}</Typography> },
    { label: "Joining Date", key: "joiningDate", render: (row) => dayjs(row.joiningDate).format("DD/MM/YYYY") },
    { label: "Tenure (Yrs)", key: "tenure", align: "right" },
    { 
      label: "Rule Applied", 
      render: (row) => (
        <Chip 
          size="small" 
          label={row.isLessThanOneYear ? "50% (New Entrant)" : "100% (Standard)"}
          color={row.isLessThanOneYear ? "warning" : "success"}
          variant="outlined"
          sx={{ fontWeight: 800, fontSize: "0.65rem" }}
        />
      )
    },
    { label: "Base Amount", key: "baseAmount", align: "right", render: (row) => `₹${row.baseAmount}` },
    { 
      label: "Final Payable", 
      key: "calculatedAmount", 
      align: "right", 
      render: (row) => (
        <Typography variant="body2" fontWeight={900} color="primary.main">
          ₹{row.calculatedAmount}
        </Typography>
      ) 
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Contribution Calculation Matrix"
        columns={columns}
        data={calculationData}
        loading={loading}
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <AppSelect
                label="Target Event for Calculation"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                options={events.map(e => ({ label: e.eventName, value: e.eventId }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ p: 1.5, bgcolor: "rgba(108, 92, 231, 0.05)", borderRadius: "8px", border: "1px solid rgba(108, 92, 231, 0.1)" }}>
                <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ textTransform: "uppercase" }}>
                  Policy Summary
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  Members with tenure &lt; 1 year pay 50%. Tenure is calculated relative to the event date.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        }
      />
    </div>
  );
}
