import React, { useEffect, useState } from "react";
import { Box, Grid, Typography, Card, CardContent, Divider, Chip, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { GetMembers } from "../../services/memberService";
import { GetRoles } from "../../services/roleService";
import AppDataTable from "../../components/common/AppDataTable";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import { GetEvents, GetEventById } from "../../services/eventService";
import { useAppToast } from "../../components/common/AppToast";

export default function ContributionCalculationPage() {
  const theme = useTheme();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculationData, setCalculationData] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [filterEventId, setFilterEventId] = useState("");
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [fullShareAmount, setFullShareAmount] = useState(0);
  const toast = useAppToast();

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
      if (evts.length > 0) {
        setSelectedEventId(evts[0].eventId);
        setFilterEventId(evts[0].eventId);
      }
    } catch (error) {
      console.error("Failed to load calculation data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedEventId) {
      loadEventDetails();
    }
  }, [selectedEventId]);

  async function loadEventDetails() {
    setLoading(true);
    try {
      const detailedEvent = await GetEventById(selectedEventId);
      setSelectedEventDetails(detailedEvent);
    } catch (error) {
      console.error("Failed to load event details:", error);
      toast.error("Failed to load event details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (members.length && selectedEventDetails) {
      calculateContributions();
    } else {
      setCalculationData([]);
      setFullShareAmount(0);
    }
  }, [members, selectedEventDetails]);

  const calculateContributions = () => {
    if (!selectedEventDetails) {
      setCalculationData([]);
      setFullShareAmount(0);
      return;
    }

    const eventDate = dayjs(selectedEventDetails.eventDate);
    const eventParticipants = selectedEventDetails.participants || [];

    const eventTypeName = selectedEventDetails.eventTypeName || 
      events.find(e => e.eventId === selectedEventDetails.eventId)?.eventTypeName || "";
    const isBirthdayEvent = eventTypeName.toLowerCase().includes("birthday");

    // 1. Identify which members are participants and find their tenure/joining date
    const enrichedParticipants = eventParticipants.map(ep => {
      const memberInfo = members.find(m => m.memberId === ep.memberId);
      const joiningDate = memberInfo ? dayjs(memberInfo.joiningDate) : dayjs();
      const tenureYears = eventDate.diff(joiningDate, 'year', true);
      const isLessThanOneYear = tenureYears < 1;

      return {
        memberId: ep.memberId,
        name: ep.memberName || (memberInfo ? memberInfo.name : ""),
        joiningDate: memberInfo ? memberInfo.joiningDate : null,
        tenure: tenureYears,
        isLessThanOneYear,
      };
    });

    const totalAmount = selectedEventDetails.baseAmount || 0;
    let fullShare = 0;
    let equalShare = 0;

    if (isBirthdayEvent) {
      // 2. Count full vs half shares (Only for Birthday events)
      const halfShareCount = enrichedParticipants.filter(p => p.isLessThanOneYear).length;
      const fullShareCount = enrichedParticipants.length - halfShareCount;

      // 3. Split calculation
      const divisor = fullShareCount + 0.5 * halfShareCount;
      fullShare = divisor > 0 ? (totalAmount / divisor) : 0;
      setFullShareAmount(fullShare);
    } else {
      // For other events (Except Birthday), everyone pays an equal share amount
      const divisor = enrichedParticipants.length;
      equalShare = divisor > 0 ? (totalAmount / divisor) : 0;
      setFullShareAmount(equalShare);
    }

    // 4. Calculate for each participant (respect existing contribution amounts or default split)
    const calculated = enrichedParticipants.map(p => {
      const epContribution = selectedEventDetails.contributions?.find(c => c.memberId === p.memberId);
      let calculatedAmount;
      if (epContribution !== undefined && epContribution !== null) {
        calculatedAmount = epContribution.amount;
      } else if (isBirthdayEvent) {
        calculatedAmount = p.isLessThanOneYear ? (fullShare * 0.5) : fullShare;
      } else {
        calculatedAmount = equalShare;
      }

      return {
        ...p,
        isBirthdayEvent,
        tenureFormatted: p.tenure >= 0 ? p.tenure.toFixed(2) : "0.00",
        calculatedAmount: Math.round(calculatedAmount * 100) / 100, // Round to 2 decimals
      };
    });

    setCalculationData(calculated);
  };

  const currentEventTypeName = selectedEventDetails?.eventTypeName || 
    events.find(e => e.eventId === selectedEventDetails?.eventId)?.eventTypeName || "";
  const isCurrentEventBirthday = currentEventTypeName.toLowerCase().includes("birthday");

  const columns = [
    {
      label: "Member Name",
      key: "name",
      sx: { minWidth: 160 },
      cellSx: { minWidth: 160 },
      render: (row) => <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
    },
    {
      label: "Joining Date",
      key: "joiningDate",
      sx: { minWidth: 120 },
      cellSx: { minWidth: 120 },
      render: (row) => row.joiningDate ? dayjs(row.joiningDate).format("DD/MM/YYYY") : "—"
    },
    {
      label: "No of Years",
      key: "tenureFormatted",
      align: "right",
      sx: { minWidth: 100 },
      cellSx: { minWidth: 100 }
    },
    {
      label: "Rule Applied",
      sx: { minWidth: 150 },
      cellSx: { minWidth: 150 },
      render: (row) => {
        if (!row.isBirthdayEvent) {
          return (
            <Chip
              size="small"
              label="Equal Share"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 800, fontSize: "0.65rem" }}
            />
          );
        }
        return (
          <Chip
            size="small"
            label={row.isLessThanOneYear ? "50% (New Entrant)" : "100% (Standard)"}
            color={row.isLessThanOneYear ? "warning" : "success"}
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: "0.65rem" }}
          />
        );
      }
    },
    {
      label: "Final Payable",
      key: "calculatedAmount",
      align: "right",
      sx: { minWidth: 130 },
      cellSx: { minWidth: 130 },
      render: (row) => (
        <Typography variant="body2" fontWeight={900} sx={{ color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : theme.palette.primary.main }}>
          ₹{(row.calculatedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      )
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Contribution Calculation"
        columns={columns}
        data={calculationData}
        loading={loading}
        filterPanel={
          <Grid container spacing={3} alignItems="stretch" justifyContent="space-between">
            <Grid size={{ xs: 12, lg: 4 }} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap", pt: 0.5 }}>
              <Box sx={{ minWidth: 220, flexGrow: 1 }}>
                <AppSelect
                  label="Planned Event"
                  placeholder="Select an event"
                  value={filterEventId}
                  onChange={(e) => {
                    setFilterEventId(e.target.value);
                    setSelectedEventId(e.target.value);
                  }}
                  options={events.map(e => ({ label: e.eventName, value: e.eventId }))}
                  required
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
                  bgcolor: theme.palette.mode === "dark" ? "#5e6783 !important" : "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: theme.palette.mode === "dark" ? "#6b7390 !important" : "#3b325c !important" }
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
            <Grid size={{ xs: 12, lg: 8 }} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "stretch" }}>
              <Card sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.mode === "dark" ? "#171b2d" : "#ffffff", p: 1.5, width: "100%", maxWidth: 840, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", mb: 0.8, letterSpacing: "0.05em", fontSize: "0.68rem", textTransform: "uppercase" }}>
                  Calculation Summary
                </Typography>
                <Grid container spacing={2}>
                  {/* Column 1: Cost & Participants */}
                  <Grid size={{ xs: 12, sm: isCurrentEventBirthday ? 3.5 : 4 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Total Event Cost:</Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem" }}>₹{(selectedEventDetails?.baseAmount || 0).toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Total Participants:</Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem" }}>{calculationData.length}</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  {isCurrentEventBirthday ? (
                    <>
                      {/* Column 2: Full/Half share counts for Birthday */}
                      <Grid size={{ xs: 12, sm: 4.5 }} sx={{ borderLeft: { xs: "none", sm: `1px solid ${theme.palette.divider}` }, pl: { xs: 0, sm: 2 } }}>
                        <Stack spacing={0.5}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Full Share Members (100%):</Typography>
                            <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem" }}>{calculationData.filter(x => !x.isLessThanOneYear).length}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Half Share Members (50%):</Typography>
                            <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem" }}>{calculationData.filter(x => x.isLessThanOneYear).length}</Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      {/* Column 3: Full Share Amount */}
                      <Grid size={{ xs: 6, sm: 2 }} sx={{ borderLeft: `1px solid ${theme.palette.divider}`, pl: 2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 600 }}>Full Share</Typography>
                        <Typography variant="body2" fontWeight={900} color="primary.main" sx={{ fontSize: "0.85rem", mt: 0.2 }}>
                          ₹{fullShareAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Grid>

                      {/* Column 4: Half Share Amount */}
                      <Grid size={{ xs: 6, sm: 2 }} sx={{ borderLeft: `1px solid ${theme.palette.divider}`, pl: 2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 600 }}>Half Share (50%)</Typography>
                        <Typography variant="body2" fontWeight={900} color="warning.main" sx={{ fontSize: "0.85rem", mt: 0.2 }}>
                          ₹{(fullShareAmount * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Grid>
                    </>
                  ) : (
                    <>
                      {/* Column 2: Equal Distribution info for Other Events */}
                      <Grid size={{ xs: 12, sm: 4 }} sx={{ borderLeft: { xs: "none", sm: `1px solid ${theme.palette.divider}` }, pl: { xs: 0, sm: 2 } }}>
                        <Stack spacing={0.5}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Rule:</Typography>
                            <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem" }}>Equal Share Split</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Eligible Members:</Typography>
                            <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.68rem" }}>All {calculationData.length} Members (100%)</Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      {/* Column 3: Equal Share Amount */}
                      <Grid size={{ xs: 12, sm: 4 }} sx={{ borderLeft: `1px solid ${theme.palette.divider}`, pl: 2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", fontWeight: 600 }}>Equal Share per Member</Typography>
                        <Typography variant="body2" fontWeight={900} color="primary.main" sx={{ fontSize: "0.95rem", mt: 0.2 }}>
                          ₹{fullShareAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Card>
            </Grid>
          </Grid>
        }
      />
    </div>
  );
}
