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
import { GetDashboardSummary } from "../../services/dashboardService";
import AppDataTable from "../../components/common/AppDataTable";

function SimpleBarChart({ items, valueKey = "value", labelKey = "label", height = 220 }) {
  const theme = useTheme();
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <Stack spacing={1.5} sx={{ height: "100%" }}>
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = `${Math.max(8, (value / maxValue) * 100)}%`;

        return (
          <Box key={item[labelKey]} sx={{ display: "grid", gridTemplateColumns: "1fr 5fr auto", alignItems: "center", gap: 1.5 }}>
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }} noWrap>
              {item[labelKey]}
            </Typography>
            <Box sx={{ height: 12, borderRadius: 999, bgcolor: theme.palette.action.hover, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width,
                  borderRadius: 999,
                  background: theme.palette.mode === "dark"
                    ? "linear-gradient(90deg, #59627b 0%, #40475d 100%)"
                    : "linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)",
                }}
              />
            </Box>
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ minWidth: 74, textAlign: "right" }}>
              {"\u20B9"}{value.toLocaleString()}
            </Typography>
          </Box>
        );
      })}

      {items.length === 0 && (
        <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "text.secondary" }}>
          <Typography variant="body2">No upcoming events yet.</Typography>
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
      const data = await GetDashboardSummary(filters);
      setSummary(data);
      setLoading(false);
    }

    loadData();
  }, [filters]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: dayjs().month(i).format("MMMM"),
    value: i + 1,
  }));

  const upcomingEvents = summary?.upcomingEvents ?? [];
  const upcomingBarData = upcomingEvents.slice(0, 6).map((event) => ({
    label: event.eventName,
    value: event.expectedAmount,
  }));

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
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.2em", fontWeight: 800 }}>
                Executive Overview
              </Typography>
              <Typography variant="h4" fontWeight={900}>
                Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High-level collection status, upcoming activity, and event planning at a glance.
              </Typography>
            </Box>

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
                <AppInput
                  label="Year"
                  type="number"
                  value={filters.year}
                  onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
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
                    label="Pending Payments"
                    value={summary?.pendingPayments ?? 0}
                    helper="Unsettled contributions"
                    accent="error.main"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ProgressRing value={operationalHealth} label="Health" sublabel="Operational readiness" />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={900}>
                            Upcoming Event Budget
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Expected amount for the next 14 days.
                          </Typography>
                        </Box>
                        <SimpleBarChart items={upcomingBarData} />
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
                            Balance between upcoming events and unresolved dues.
                          </Typography>
                        </Box>
                        <Stack spacing={1.5}>
                          <Box>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={700}>
                                Upcoming Events
                              </Typography>
                              <Typography variant="body2" fontWeight={800}>
                                {summary?.monthlyEventsCount ?? 0}
                              </Typography>
                            </Stack>
                            <Box sx={{ height: 10, borderRadius: 999, bgcolor: theme.palette.action.hover, overflow: "hidden" }}>
                              <Box sx={{ width: "100%", height: "100%", bgcolor: "primary.main", borderRadius: 999 }} />
                            </Box>
                          </Box>
                          <Box>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={700}>
                                Pending Dues
                              </Typography>
                              <Typography variant="body2" fontWeight={800}>
                                {summary?.pendingPayments ?? 0}
                              </Typography>
                            </Stack>
                            <Box sx={{ height: 10, borderRadius: 999, bgcolor: theme.palette.action.hover, overflow: "hidden" }}>
                              <Box sx={{ width: `${Math.min(100, ((summary?.pendingPayments ?? 0) / Math.max(summary?.monthlyEventsCount ?? 1, 1)) * 100)}%`, height: "100%", bgcolor: "error.main", borderRadius: 999 }} />
                            </Box>
                          </Box>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <AppDataTable title="Upcoming Events (Next 14 Days)" columns={columns} data={upcomingEvents} loading={false} />
            </Stack>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
