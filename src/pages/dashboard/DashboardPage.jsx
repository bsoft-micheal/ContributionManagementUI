import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import MetricCard from "../../components/MetricCard";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import { GetDashboardSummaryAsync } from "../../services/dashboardService";
import AppDataTable from "../../components/common/AppDataTable";

function EventContributionChart({ items }) {
  const theme = useTheme();

  return (
    <Stack spacing={2.5} sx={{ height: "100%" }}>
      {items.map((item) => {
        const expected = Number(item.expectedAmount) || 0;
        const collected = Number(item.collectedAmount) || 0;
        const pending = Number(item.pendingAmount) || 0;
        
        const total = Math.max(expected, 1);
        const collectedWidth = `${(collected / total) * 100}%`;
        const pendingWidth = `${(pending / total) * 100}%`;

        return (
          <Box key={item.eventId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem" }} noWrap>
                {item.eventName}
              </Typography>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                {"\u20B9"}{expected.toLocaleString()}
              </Typography>
            </Stack>

            {/* Stacked Progress Bar */}
            <Box 
              sx={{ 
                height: 10, 
                borderRadius: 999, 
                bgcolor: theme.palette.action.hover, 
                display: "flex", 
                overflow: "hidden" 
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: collectedWidth,
                  background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                  transition: "width 0.5s ease-in-out",
                }}
              />
              <Box
                sx={{
                  height: "100%",
                  width: pendingWidth,
                  background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </Box>

            {/* Breakdown Legend */}
            <Stack direction="row" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Collected: <span style={{ color: "#10b981", fontWeight: 700 }}>{"\u20B9"}{collected.toLocaleString()}</span>
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Pending: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{"\u20B9"}{pending.toLocaleString()}</span>
                </Typography>
              </Stack>
            </Stack>
          </Box>
        );
      })}

      {items.length === 0 && (
        <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "text.secondary" }}>
          <Typography variant="body2">No events for the selected month.</Typography>
        </Box>
      )}
    </Stack>
  );
}

function ProgressRing({ value, label, sublabel }) {
  const theme = useTheme();
  const size = 120;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <Box sx={{ display: "grid", placeItems: "center", gap: 1 }}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.palette.action.hover}
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#dashboardGradient)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <defs>
            <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <Box>
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1 }}>
              {Math.round(progress)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Typography variant="body2" fontWeight={700}>
        {sublabel}
      </Typography>
    </Box>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await GetDashboardSummaryAsync(filters);
      setSummary(data);
      setLoading(false);
    }

    loadData();
  }, [filters]);

  const monthOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    }))
  ];

  const currentYear = dayjs().year();
  const yearOptions = [
    { label: "All", value: 0 },
    ...Array.from({ length: 11 }, (_, i) => {
      const y = currentYear - 5 + i;
      return { label: String(y), value: y };
    })
  ];

  const upcomingEvents = summary?.upcomingEvents ?? [];
  const chartEventsData = upcomingEvents.slice(0, 6);

  const operationalHealth = useMemo(() => {
    if (!summary?.monthlyEventsCount) return 0;
    const health = ((summary.monthlyEventsCount - (summary.pendingPayments ?? 0)) / summary.monthlyEventsCount) * 100;
    return Math.max(0, Math.min(100, health));
  }, [summary]);

  const columns = [
    {
      label: "Event",
      key: "eventName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">
          {row.eventName}
        </Typography>
      ),
    },
    {
      label: "Category",
      key: "eventTypeName",
      render: (row) => (
        <Chip
          label={row.eventTypeName}
          size="small"
          sx={{
            bgcolor: theme.palette.mode === "dark" ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.10)",
            color: "primary.main",
            fontWeight: 700,
          }}
        />
      ),
    },
    {
      label: "Date",
      key: "eventDate",
      render: (row) => dayjs(row.eventDate).format("DD MMM YYYY"),
    },
    {
      label: "Amount",
      key: "expectedAmount",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={800}>
          {"\u20B9"}{Number(row.expectedAmount).toLocaleString()}
        </Typography>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <Card sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 2.5,
            background: theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)"
              : "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.10) 100%)",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack spacing={2}>
            <Grid container spacing={2} alignItems="end">
              <Grid size={{ xs: 12, md: 3 }}>
                <AppSelect
                  label="Month"
                  value={filters.month}
                  onChange={(event) => setFilters((current) => ({ ...current, month: Number(event.target.value) }))}
                  options={monthOptions}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <AppSelect
                  label="Year"
                  value={filters.year}
                  onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
                  options={yearOptions}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                  <Chip label={`Monthly events: ${summary?.monthlyEventsCount ?? 0}`} color="primary" variant="outlined" />
                  <Chip label={`Pending dues: ${summary?.pendingPayments ?? 0}`} color="error" variant="outlined" />
                  <Chip label={`Collections: \u20B9${Number(summary?.totalContributions ?? 0).toLocaleString()}`} color="success" variant="outlined" />
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </Box>

        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 8 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <MetricCard label="Active Events" value={summary?.monthlyEventsCount ?? 0} helper="Scheduled for the selected month" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <MetricCard
                    label="Total Collections"
                    value={`\u20B9${Number(summary?.totalContributions ?? 0).toLocaleString()}`}
                    helper="Collected against planned activity"
                    accent="success.main"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <MetricCard
                    label="Total Pending"
                    value={`\u20B9${Number(summary?.totalPendingAmount ?? 0).toLocaleString()}`}
                    helper="Total pending amount for the month"
                    accent="error.main"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <MetricCard
                    label="Pending Payments"
                    value={summary?.pendingPayments ?? 0}
                    helper="Number of unpaid contributions"
                    accent="warning.main"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={900}>
                            Event Collections Breakdown
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Collected vs Pending contributions per event.
                          </Typography>
                        </Box>
                        <EventContributionChart items={chartEventsData} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={900}>
                            Planning Snapshot
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pending payments status per event.
                          </Typography>
                        </Box>
                        <Stack spacing={2.5}>
                          {chartEventsData.map((event) => {
                            const pendingCount = event.pendingContributionsCount ?? 0;
                            const totalCount = event.totalContributionsCount ?? 0;
                            const percentage = totalCount > 0 ? (pendingCount / totalCount) * 100 : 0;

                            return (
                              <Box key={event.eventId}>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }} alignItems="center">
                                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }} noWrap>
                                    {event.eventName}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={800} color={pendingCount > 0 ? "error.main" : "success.main"}>
                                    {pendingCount} / {totalCount} Pending
                                  </Typography>
                                </Stack>
                                <Box sx={{ height: 8, borderRadius: 999, bgcolor: theme.palette.action.hover, overflow: "hidden" }}>
                                  <Box 
                                    sx={{ 
                                      width: `${percentage}%`, 
                                      height: "100%", 
                                      background: "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)",
                                      borderRadius: 999,
                                      transition: "width 0.5s ease-in-out"
                                    }} 
                                  />
                                </Box>
                              </Box>
                            );
                          })}

                          {chartEventsData.length === 0 && (
                            <Box sx={{ py: 4, display: "grid", placeItems: "center", color: "text.secondary" }}>
                              <Typography variant="body2">No events for the selected month.</Typography>
                            </Box>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <AppDataTable title="Events for Selected Month" columns={columns} data={upcomingEvents} loading={false} />
            </Stack>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
