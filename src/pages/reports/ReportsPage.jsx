import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { formatGridDate } from "../../utils/dateHelper";
import apiClient from "../../services/apiClient";
import { exportSheets } from "../../utils/exportToExcel";
import AppDataTable from "../../components/common/AppDataTable";
import AppSelect from "../../components/common/AppSelect";
import AppButton from "../../components/common/AppButton";
import AppPieChart from "../../components/common/AppPieChart";
import { useAppToast } from "../../components/common/AppToast";
import { PieChart as PieChartIcon, BarChart as BarChartIcon, FilterList as FilterListIcon } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";

function SimpleBarChart({ items, valueKey = "value", labelKey = "label" }) {
  const theme = useTheme();
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <Stack spacing={1.5}>
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = `${Math.max(8, (value / maxValue) * 100)}%`;

        return (
          <Box
            key={item[labelKey]}
            sx={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 100px",
              alignItems: "center",
              gap: 2,
              "&:hover": {
                "& .bar-fill": { filter: "brightness(1.15)" },
                "& .bar-label": { color: "primary.main" }
              }
            }}
          >
            <Typography
              className="bar-label"
              variant="body2"
              fontWeight={700}
              sx={{ fontSize: "0.82rem", transition: "color 0.2s ease", color: "text.primary" }}
              noWrap
            >
              {item[labelKey]}
            </Typography>
            <Box
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.05)",
                overflow: "hidden",
                border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.03)" : "none"
              }}
            >
              <Box
                className="bar-fill"
                sx={{
                  height: "100%",
                  width,
                  borderRadius: 999,
                  background: theme.palette.mode === "dark"
                    ? "linear-gradient(90deg, #a78bfa 0%, #818cf8 100%)"
                    : "linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)",
                  transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease",
                }}
              />
            </Box>
            <Typography
              variant="subtitle2"
              fontWeight={800}
              color="text.primary"
              sx={{ minWidth: 84, textAlign: "right", fontFamily: '"Outfit", sans-serif', fontSize: "0.85rem" }}
            >
              {"\u20B9"}{value.toLocaleString()}
            </Typography>
          </Box>
        );
      })}

      {items.length === 0 && (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No chart data available.
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

function SummaryChip({ label, value, color = "primary" }) {
  const theme = useTheme();
  
  const colorsMap = {
    primary: {
      bg: theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.12)" : "rgba(124, 58, 237, 0.06)",
      border: theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.25)" : "rgba(124, 58, 237, 0.15)",
      text: theme.palette.mode === "dark" ? "#a78bfa" : "#6d28d9",
    },
    success: {
      bg: theme.palette.mode === "dark" ? "rgba(22, 163, 74, 0.12)" : "rgba(22, 163, 74, 0.06)",
      border: theme.palette.mode === "dark" ? "rgba(22, 163, 74, 0.25)" : "rgba(22, 163, 74, 0.15)",
      text: theme.palette.mode === "dark" ? "#4ade80" : "#15803d",
    },
    error: {
      bg: theme.palette.mode === "dark" ? "rgba(220, 38, 38, 0.12)" : "rgba(220, 38, 38, 0.06)",
      border: theme.palette.mode === "dark" ? "rgba(220, 38, 38, 0.25)" : "rgba(220, 38, 38, 0.15)",
      text: theme.palette.mode === "dark" ? "#f87171" : "#b91c1c",
    },
    warning: {
      bg: theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.12)" : "rgba(217, 119, 6, 0.06)",
      border: theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.25)" : "rgba(217, 119, 6, 0.15)",
      text: theme.palette.mode === "dark" ? "#fbbf24" : "#d97706",
    }
  };

  const style = colorsMap[color] || colorsMap.primary;

  return (
    <Chip
      label={
        <span>
          {label}: <strong style={{ marginLeft: "4px" }}>{value}</strong>
        </span>
      }
      sx={{
        fontWeight: 600,
        fontSize: "0.78rem",
        bgcolor: style.bg,
        borderColor: style.border,
        color: style.text,
        borderWidth: "1.5px",
        px: 0.5,
        height: 28,
        borderRadius: "8px",
        "& .MuiChip-label": { px: 1 }
      }}
      variant="outlined"
    />
  );
}

export default function ReportsPage({ mode = "event" }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const hasWriteAccess = getRightsForPage("Reports", authState?.role).write;

  const toast = useAppToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });
  const [chartType, setChartType] = useState("pie");
  const [metric, setMetric] = useState("paid");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const apiParams = {
          month: filters.month === 0 ? null : filters.month,
          year: filters.year === 0 ? null : filters.year,
        };
        const { data: resData } = await apiClient.get("/reports/getSummaryReportAsync", { params: apiParams });
        const data = (resData && resData.data !== undefined) ? resData.data : resData;
        setReport(data);
      } catch (err) {
        toast.error("Failed to load reports. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [filters]);

  const monthOptions = [
    { label: "All Months", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: dayjs().month(i).format("MMMM"),
      value: i + 1,
    }))
  ];

  const currentYear = dayjs().year();
  const yearOptions = [
    { label: "All Years", value: 0 },
    ...Array.from({ length: 11 }, (_, i) => {
      const y = currentYear - 5 + i;
      return { label: String(y), value: y };
    })
  ];

  // 1. Event Collections Columns
  const eventColumns = [
    { label: "Event", key: "eventName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventName}</Typography> },
    { label: "Type", key: "eventTypeName", render: (row) => <Typography variant="body2" color="text.secondary">{row.eventTypeName || "General"}</Typography> },
    { label: "Date", key: "eventDate", render: (row) => formatGridDate(row.eventDate) },
    { label: "Expected", key: "expectedAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800}>{"\u20B9"}{Number(row.expectedAmount).toLocaleString()}</Typography> },
    { label: "Paid", key: "paidAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="success.main">{"\u20B9"}{Number(row.paidAmount).toLocaleString()}</Typography> },
    { label: "Pending", key: "pendingAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="error.main">{"\u20B9"}{Number(row.pendingAmount).toLocaleString()}</Typography> },
    {
      label: "Rate",
      key: "collectionRate",
      align: "center",
      render: (row) => {
        const rate = row.collectionRate ?? (row.expectedAmount > 0 ? Math.round((row.paidAmount / row.expectedAmount) * 100) : 0);
        return (
          <Chip
            size="small"
            label={`${rate}%`}
            color={rate >= 100 ? "success" : rate >= 50 ? "primary" : "warning"}
            sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }}
          />
        );
      }
    },
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

  // 2. Member Contributions Columns
  const memberColumns = [
    { label: "Member", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Expected", key: "totalExpectedAmount", align: "right", render: (row) => `\u20B9${Number(row.totalExpectedAmount).toLocaleString()}` },
    { label: "Paid", key: "totalPaidAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="success.main">{"\u20B9"}{Number(row.totalPaidAmount).toLocaleString()}</Typography> },
    { label: "Pending", key: "totalPendingAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="error.main">{"\u20B9"}{(row.totalExpectedAmount - row.totalPaidAmount).toLocaleString()}</Typography> },
    { label: "Paid Events", key: "paidEventsCount", align: "center", render: (row) => <Typography variant="body2" fontWeight={600}>{row.paidEventsCount}</Typography> },
    { label: "Pending Events", key: "pendingEventsCount", align: "center", render: (row) => <Typography variant="body2" fontWeight={600} color={row.pendingEventsCount > 0 ? "error.main" : "text.secondary"}>{row.pendingEventsCount}</Typography> },
    {
      label: "Status",
      key: "completionRate",
      align: "center",
      render: (row) => {
        const rate = row.totalExpectedAmount > 0 ? Math.round((row.totalPaidAmount / row.totalExpectedAmount) * 100) : 0;
        return (
          <Chip
            size="small"
            label={rate >= 100 ? "All Paid" : `${rate}% Paid`}
            color={rate >= 100 ? "success" : "warning"}
            variant={rate >= 100 ? "filled" : "outlined"}
            sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }}
          />
        );
      }
    },
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

  // 3. Pending Dues Columns
  const pendingColumns = [
    { label: "Member Name", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Phone", key: "phone", render: (row) => <Typography variant="body2" color="text.secondary">{row.phone || "—"}</Typography> },
    { label: "Event Name", key: "eventName", render: (row) => <Typography variant="body2" fontWeight={600}>{row.eventName}</Typography> },
    { label: "Event Date", key: "eventDate", render: (row) => formatGridDate(row.eventDate) },
    { label: "Pending Due", key: "amount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="error.main">{"\u20B9"}{Number(row.amount).toLocaleString()}</Typography> },
    {
      label: "Aging Category",
      key: "agingCategory",
      align: "center",
      render: (row) => {
        const category = row.agingCategory || (row.daysOverdue > 30 ? "Critical (> 30d)" : row.daysOverdue >= 15 ? "Moderate (15-30d)" : "Recent (< 15d)");
        const isCritical = category.includes("Critical");
        const isModerate = category.includes("Moderate");
        return (
          <Chip
            size="small"
            label={category}
            color={isCritical ? "error" : isModerate ? "warning" : "info"}
            sx={{ fontWeight: 700, fontSize: "0.72rem", height: 22 }}
          />
        );
      }
    },
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

  // Chart Data calculation per mode
  const chartData = useMemo(() => {
    if (mode === "member") {
      return (report?.memberContributionHistory ?? [])
        .map((item) => {
          const val =
            metric === "paid"
              ? Number(item.totalPaidAmount) || 0
              : metric === "pending"
              ? Math.max(0, (Number(item.totalExpectedAmount) || 0) - (Number(item.totalPaidAmount) || 0))
              : Number(item.totalExpectedAmount) || 0;
          return { label: item.memberName, value: val };
        })
        .filter((item) => item.value > 0);
    }

    if (mode === "pending") {
      if (metric === "member") {
        // Group pending dues by member
        const map = {};
        (report?.pendingDues ?? []).forEach(d => {
          map[d.memberName] = (map[d.memberName] || 0) + Number(d.amount);
        });
        return Object.entries(map).map(([k, v]) => ({ label: k, value: v }));
      }
      // Group pending dues by event
      const map = {};
      (report?.pendingDues ?? []).forEach(d => {
        map[d.eventName] = (map[d.eventName] || 0) + Number(d.amount);
      });
      return Object.entries(map).map(([k, v]) => ({ label: k, value: v }));
    }

    // Default: Event Collections
    return (report?.eventCollections ?? [])
      .map((item) => {
        const val =
          metric === "paid"
            ? Number(item.paidAmount) || 0
            : metric === "pending"
            ? Number(item.pendingAmount) || 0
            : Number(item.expectedAmount) || 0;
        return { label: item.eventName, value: val };
      })
      .filter((item) => item.value > 0);
  }, [mode, report, metric]);

  const pageTitle = {
    event: "Event Collections",
    member: "Member Contributions",
    pending: "Pending Dues & Defaulters",
  }[mode] || "Event Collections";

  const exportCurrentView = () => {
    if (!hasWriteAccess) return;

    try {
      exportSheets("team-contribution-reports.xlsx", [
        { name: "Event Collections", data: report?.eventCollections ?? [] },
        { name: "Member Contributions", data: report?.memberContributionHistory ?? [] },
        { name: "Pending Dues", data: report?.pendingDues ?? [] },
      ]);
      toast.success("Reports exported to Excel successfully!");
    } catch {
      toast.error("Failed to export reports to Excel");
    }
  };

  const navTabs = [
    { label: "Event Collections", path: "/reports/event-collection-audit", modeKey: "event" },
    { label: "Member Contributions", path: "/reports/member-velocity", modeKey: "member" },
    { label: "Pending Dues", path: "/reports/pending-dues", modeKey: "pending" },
  ];

  return (
    <div className="page-shell">
      <Card sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            background: theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(79, 70, 229, 0.02) 100%)"
              : "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.10) 100%)",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Box>
                <Typography fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', color: "text.primary", fontSize: "1.2rem" }}>
                  {pageTitle}
                </Typography>
              </Box>
              <AppButton
                size="small"
                variant="contained"
                disabled={!hasWriteAccess}
                onClick={exportCurrentView}
              >
                Export Excel
              </AppButton>
            </Box>

            {/* 5-Tab Pill Navigation */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 0.5 }}>
              {navTabs.map((tab) => {
                const isActive = mode === tab.modeKey || (!mode && tab.modeKey === "event");
                return (
                  <Box
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    sx={{
                      px: 1.8,
                      py: 0.6,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: isActive ? 700 : 600,
                      bgcolor: isActive ? "primary.main" : theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.06)",
                      color: isActive ? "#ffffff" : "text.secondary",
                      border: isActive ? "1px solid transparent" : `1px solid ${theme.palette.divider}`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: isActive ? "primary.dark" : theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(74,63,107,0.12)",
                        color: isActive ? "#ffffff" : "text.primary",
                      },
                    }}
                  >
                    {tab.label}
                  </Box>
                );
              })}
            </Box>

            {/* Filter Bar and Summary KPIs */}
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 2.2 }}>
                <AppSelect
                  label="Month"
                  placeholder="Select Month"
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(Number(event.target.value))}
                  options={monthOptions}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 1.8 }}>
                <AppSelect
                  label="Year"
                  placeholder="Select Year"
                  value={filterYear}
                  onChange={(event) => setFilterYear(Number(event.target.value))}
                  options={yearOptions}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }} sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: { xs: 0, md: 2.2 } }}>
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setFilters({ month: filterMonth, year: filterYear });
                  }}
                  sx={{
                    height: 38,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
                  }}
                >
                  Filter
                </AppButton>
                <AppButton
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const defaultMonth = dayjs().month() + 1;
                    const defaultYear = dayjs().year();
                    setFilterMonth(defaultMonth);
                    setFilterYear(defaultYear);
                    setFilters({ month: defaultMonth, year: defaultYear });
                  }}
                  sx={{
                    color: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    height: 38,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    px: 2,
                    "&:hover": {
                      borderColor: "#ef4444",
                      bgcolor: "rgba(239, 68, 68, 0.05)"
                    }
                  }}
                >
                  Clear Filter
                </AppButton>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ mt: { xs: 1, md: 2.5 } }}>
                  {mode === "event" && (
                    <>
                      <SummaryChip label="Expected" value={`₹${Number(report?.eventCollections?.reduce((sum, row) => sum + row.expectedAmount, 0) ?? 0).toLocaleString()}`} />
                      <SummaryChip label="Paid" value={`₹${Number(report?.eventCollections?.reduce((sum, row) => sum + row.paidAmount, 0) ?? 0).toLocaleString()}`} color="success" />
                      <SummaryChip label="Pending" value={`₹${Number(report?.eventCollections?.reduce((sum, row) => sum + row.pendingAmount, 0) ?? 0).toLocaleString()}`} color="error" />
                    </>
                  )}
                  {mode === "member" && (
                    <>
                      <SummaryChip label="Members" value={report?.memberContributionHistory?.length ?? 0} />
                      <SummaryChip label="Total Expected" value={`₹${Number(report?.memberContributionHistory?.reduce((sum, row) => sum + row.totalExpectedAmount, 0) ?? 0).toLocaleString()}`} />
                      <SummaryChip label="Total Paid" value={`₹${Number(report?.memberContributionHistory?.reduce((sum, row) => sum + row.totalPaidAmount, 0) ?? 0).toLocaleString()}`} color="success" />
                    </>
                  )}
                  {mode === "pending" && (
                    <>
                      <SummaryChip label="Total Outstanding Dues" value={`₹${Number(report?.pendingDues?.reduce((sum, row) => sum + row.amount, 0) ?? 0).toLocaleString()}`} color="error" />
                      <SummaryChip label="Pending Records" value={report?.pendingDues?.length ?? 0} color="warning" />
                      <SummaryChip label="Defaulters" value={new Set(report?.pendingDues?.map(p => p.memberId)).size} color="error" />
                    </>
                  )}
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
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Card
                    sx={{
                      height: "100%",
                      bgcolor: theme.palette.mode === "dark" ? "background.default" : "var(--app-surface-alt)",
                      borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "var(--app-border)"
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2.5}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', fontSize: "1.05rem", color: "text.primary" }}>
                              Visualization
                            </Typography>

                            {/* Metric Selector based on active report mode */}
                            <Stack direction="row" spacing={0.5} sx={{ ml: { xs: 0, sm: 1 } }}>
                              {(mode === "event" || mode === "member") && (
                                [
                                  { label: "Paid", key: "paid" },
                                  { label: "Expected", key: "expected" },
                                  { label: "Pending", key: "pending" },
                                ].map((m) => (
                                  <Chip
                                    key={m.key}
                                    size="small"
                                    label={m.label}
                                    onClick={() => setMetric(m.key)}
                                    color={metric === m.key ? "primary" : "default"}
                                    variant={metric === m.key ? "filled" : "outlined"}
                                    sx={{ height: 24, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                  />
                                ))
                              )}

                              {mode === "pending" && (
                                [
                                  { label: "By Event", key: "event" },
                                  { label: "By Member", key: "member" },
                                ].map((m) => (
                                  <Chip
                                    key={m.key}
                                    size="small"
                                    label={m.label}
                                    onClick={() => setMetric(m.key)}
                                    color={(metric === m.key || (metric !== "event" && metric !== "member" && m.key === "event")) ? "primary" : "default"}
                                    variant={(metric === m.key || (metric !== "event" && metric !== "member" && m.key === "event")) ? "filled" : "outlined"}
                                    sx={{ height: 24, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                  />
                                ))
                              )}
                            </Stack>
                          </Box>

                          {/* View Toggle: Pie Chart vs Bar Chart */}
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{
                              bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.06)",
                              p: 0.5,
                              borderRadius: "8px",
                            }}
                          >
                            <Box
                              onClick={() => setChartType("pie")}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1.2,
                                py: 0.4,
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                bgcolor: chartType === "pie" ? "primary.main" : "transparent",
                                color: chartType === "pie" ? "#ffffff" : "text.secondary",
                                transition: "all 0.2s ease",
                                "&:hover": { color: chartType === "pie" ? "#ffffff" : "text.primary" },
                              }}
                            >
                              <PieChartIcon sx={{ fontSize: 16 }} />
                              Pie Chart
                            </Box>
                            <Box
                              onClick={() => setChartType("bar")}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1.2,
                                py: 0.4,
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                bgcolor: chartType === "bar" ? "primary.main" : "transparent",
                                color: chartType === "bar" ? "#ffffff" : "text.secondary",
                                transition: "all 0.2s ease",
                                "&:hover": { color: chartType === "bar" ? "#ffffff" : "text.primary" },
                              }}
                            >
                              <BarChartIcon sx={{ fontSize: 16 }} />
                              Bar Chart
                            </Box>
                          </Stack>
                        </Box>

                        {chartData.length === 0 ? (
                          <Box sx={{ py: 6, textAlign: "center" }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                              No chart data to visualize for this selection.
                            </Typography>
                          </Box>
                        ) : chartType === "pie" ? (
                          <AppPieChart items={chartData} />
                        ) : (
                          <SimpleBarChart items={chartData} />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* At a Glance KPI Card */}
                <Grid size={{ xs: 12, lg: 4 }}>
                  <Card
                    sx={{
                      height: "100%",
                      bgcolor: theme.palette.mode === "dark" ? "background.default" : "var(--app-surface-alt)",
                      borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "var(--app-border)"
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', fontSize: "1.05rem", color: "text.primary" }}>
                            At a Glance
                          </Typography>
                        </Box>
                        <Box sx={{ width: "100%" }}>
                          <Stack spacing={1.5} sx={{ mt: 1 }}>
                            {mode === "event" && [
                              { label: "Event Collections", value: report?.eventCollections?.length ?? 0 },
                              { label: "Fully Collected Events", value: report?.eventCollections?.filter(e => e.pendingAmount === 0).length ?? 0 },
                              { label: "Events with Pending Dues", value: report?.eventCollections?.filter(e => e.pendingAmount > 0).length ?? 0 },
                              { label: "Average Collection Rate", value: `${report?.eventCollections?.length ? Math.round(report.eventCollections.reduce((s, e) => s + (e.collectionRate || 0), 0) / report.eventCollections.length) : 0}%` },
                            ].map((row) => (
                              <Box
                                key={row.label}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  py: 1,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                  "&:last-child": { borderBottom: "none" }
                                }}
                              >
                                <Typography variant="body2" fontWeight={600} color="text.secondary">
                                  {row.label}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.05)",
                                    px: 1.5,
                                    py: 0.25,
                                    borderRadius: "6px",
                                    fontFamily: '"Outfit", sans-serif'
                                  }}
                                >
                                  {row.value}
                                </Typography>
                              </Box>
                            ))}

                            {mode === "member" && [
                              { label: "Active Contributors", value: report?.memberContributionHistory?.length ?? 0 },
                              { label: "100% Cleared Members", value: report?.memberContributionHistory?.filter(m => m.pendingEventsCount === 0).length ?? 0 },
                              { label: "Members with Pending Dues", value: report?.memberContributionHistory?.filter(m => m.pendingEventsCount > 0).length ?? 0 },
                              { label: "Collection Efficiency", value: `${report?.financialSummary?.collectionEfficiencyPercent ?? 0}%` },
                            ].map((row) => (
                              <Box
                                key={row.label}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  py: 1,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                  "&:last-child": { borderBottom: "none" }
                                }}
                              >
                                <Typography variant="body2" fontWeight={600} color="text.secondary">
                                  {row.label}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.05)",
                                    px: 1.5,
                                    py: 0.25,
                                    borderRadius: "6px",
                                    fontFamily: '"Outfit", sans-serif'
                                  }}
                                >
                                  {row.value}
                                </Typography>
                              </Box>
                            ))}

                            {mode === "pending" && [
                              { label: "Total Overdue Amount", value: `₹${Number(report?.financialSummary?.totalPendingDues ?? 0).toLocaleString()}` },
                              { label: "Unique Defaulters", value: report?.financialSummary?.defaultersCount ?? 0 },
                              { label: "Critical Dues (> 30 Days)", value: report?.pendingDues?.filter(p => p.daysOverdue > 30).length ?? 0 },
                              { label: "Moderate Dues (15-30 Days)", value: report?.pendingDues?.filter(p => p.daysOverdue >= 15 && p.daysOverdue <= 30).length ?? 0 },
                            ].map((row) => (
                              <Box
                                key={row.label}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  py: 1,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                  "&:last-child": { borderBottom: "none" }
                                }}
                              >
                                <Typography variant="body2" fontWeight={600} color="text.secondary">
                                  {row.label}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.05)",
                                    px: 1.5,
                                    py: 0.25,
                                    borderRadius: "6px",
                                    fontFamily: '"Outfit", sans-serif'
                                  }}
                                >
                                  {row.value}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Data Table per active report mode */}
              {(mode === "event" || !mode) && (
                <AppDataTable title="Event Collections" columns={eventColumns} data={report?.eventCollections ?? []} loading={false} />
              )}

              {mode === "member" && (
                <AppDataTable title="Member Contributions" columns={memberColumns} data={report?.memberContributionHistory ?? []} loading={false} />
              )}

              {mode === "pending" && (
                <AppDataTable title="Pending Dues & Defaulters" columns={pendingColumns} data={report?.pendingDues ?? []} loading={false} />
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
