import React, { useEffect, useState } from "react";
import {
  CircularProgress,
  Grid,
  Stack,
  Typography,
  Box,
  Card,
  CardContent,
} from "@mui/material";
import dayjs from "dayjs";
import MetricCard from "../../components/MetricCard";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import { GetDashboardSummary } from "../../services/dashboardService";
import AppDataTable from "../../components/common/AppDataTable";

export default function DashboardPage() {
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
    value: i + 1 
  }));

  const columns = [
    { label: "Event",    key: "eventName",    render: (row) => <Typography variant="body2" fontWeight={700} color="primary.main">{row.eventName}</Typography> },
    { label: "Category", key: "eventTypeName", render: (row) => (
      <Typography variant="caption" fontWeight={700}
        sx={{ bgcolor: "rgba(74,63,107,0.08)", color: "#4a3f6b", px: 1.2, py: 0.3, borderRadius: "3px", fontSize: "0.75rem" }}
      >{row.eventTypeName}</Typography>
    )},
    { label: "Date",     key: "eventDate",    render: (row) => dayjs(row.eventDate).format("DD MMM YYYY") },
    { label: "Amount",   key: "expectedAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.expectedAmount}</Typography> },
  ];

  return (
    <div className="page-shell">
      <Card sx={{ border: "none", boxShadow: "0 2px 8px rgba(74,63,107,0.1)", borderRadius: "6px", overflow: "hidden" }}>
        {/* Header */}
        <Box sx={{
          background: "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
          color: "#ffffff",
          px: 2.5,
          py: 0.5,
          minHeight: 36,
          display: "flex",
          alignItems: "center",
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#ffffff", fontSize: "0.85rem" }}>
            Dashboard
          </Typography>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* Filter bar */}
          <Box sx={{ bgcolor: "#faf9fd", p: 1.5, borderBottom: "1px solid rgba(74,63,107,0.1)" }}>
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
            </Grid>
          </Box>

          <Box sx={{ p: 2 }}>
            {loading ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress size={32} />
              </Stack>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <MetricCard
                      label="Active Cycles"
                      value={summary?.monthlyEventsCount ?? 0}
                      helper="Event operations registered for current window"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <MetricCard
                      label="Net Collections"
                      value={`₹${summary?.totalContributions ?? 0}`}
                      helper="Gross realized capital across all active events"
                      accent="secondary.main"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <MetricCard
                      label="Compliance Gap"
                      value={summary?.pendingPayments ?? 0}
                      helper="Pending member transactions requiring audit"
                      accent="error.main"
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: "text.secondary", textTransform: "uppercase" }}>
                  Strategic Forecast (Next 14 Days)
                </Typography>
                
                <AppDataTable
                  title="Forecasted Operations (Next 14 Days)"
                  columns={columns}
                  data={summary?.upcomingEvents ?? []}
                  loading={false}
                />
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}
