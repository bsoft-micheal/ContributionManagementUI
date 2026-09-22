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
import apiClient from "../../services/apiClient";
import { exportSheets } from "../../utils/exportToExcel";
import AppDataTable from "../../components/common/AppDataTable";
import AppSelect from "../../components/common/AppSelect";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppPieChart from "../../components/common/AppPieChart";
import { PieChart as PieChartIcon, BarChart as BarChartIcon } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import { GetMembersAsync } from "../../services/memberService";
import { GetContributionsAsync } from "../../services/contributionService";

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
              gridTemplateColumns: "130px 1fr 90px",
              alignItems: "center",
              gap: 2,
              "&:hover": {
                "& .bar-fill": {
                  filter: "brightness(1.15)",
                },
                "& .bar-label": {
                  color: "primary.main",
                }
              }
            }}
          >
            <Typography
              className="bar-label"
              variant="body2"
              fontWeight={700}
              sx={{
                fontSize: "0.82rem",
                transition: "color 0.2s ease",
                color: "text.primary"
              }}
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
              sx={{
                minWidth: 84,
                textAlign: "right",
                fontFamily: '"Outfit", sans-serif',
                fontSize: "0.85rem"
              }}
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

export default function ReportsPage({ mode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const hasWriteAccess = getRightsForPage("Reports", authState?.role).write;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });

  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [allContributions, setAllContributions] = useState([]);
  const [chartType, setChartType] = useState("pie");
  const [eventMetric, setEventMetric] = useState("expected");

  useEffect(() => {
    if (mode === "member-category") {
      async function loadMemberCategoryData() {
        setLoading(true);
        try {
          const membersList = await GetMembersAsync();
          setMembers(membersList);
          if (membersList.length > 0) {
            setSelectedMemberId(membersList[0].memberId);
          }
          const contributionsList = await GetContributionsAsync();
          setAllContributions(contributionsList);
        } finally {
          setLoading(false);
        }
      }

      loadMemberCategoryData();
      return;
    }

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
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [filters, mode]);

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

  const eventColumns = [
    { label: "Event", key: "eventName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventName}</Typography> },
    { label: "Date", key: "eventDate", render: (row) => dayjs(row.eventDate).format("DD MMM YYYY") },
    { label: "Expected", key: "expectedAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800}>{"\u20B9"}{Number(row.expectedAmount).toLocaleString()}</Typography> },
    { label: "Paid", key: "paidAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="success.main">{"\u20B9"}{Number(row.paidAmount).toLocaleString()}</Typography> },
    { label: "Pending", key: "pendingAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="error.main">{"\u20B9"}{Number(row.pendingAmount).toLocaleString()}</Typography> },
  ];

  const memberColumns = [
    { label: "Member", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Expected", key: "totalExpectedAmount", align: "right", render: (row) => `\u20B9${Number(row.totalExpectedAmount).toLocaleString()}` },
    { label: "Paid", key: "totalPaidAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="success.main">{"\u20B9"}{Number(row.totalPaidAmount).toLocaleString()}</Typography> },
    { label: "Pending", key: "totalPendingAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="error.main">{"\u20B9"}{(row.totalExpectedAmount - row.totalPaidAmount).toLocaleString()}</Typography> },
  ];

  const pendingColumns = [
    { label: "Member", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Event", key: "eventName" },
    { label: "Amount", key: "amount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="error.main">{"\u20B9"}{Number(row.amount).toLocaleString()}</Typography> },
  ];

  const memberCategoryData = useMemo(() => {
    if (!selectedMemberId || allContributions.length === 0) return [];

    const memberPaidContribs = allContributions.filter(
      (contribution) => contribution.memberId === selectedMemberId && contribution.paymentStatus === "Paid"
    );

    const groups = {};
    memberPaidContribs.forEach((contribution) => {
      const category = contribution.categoryName || "Uncategorized";
      groups[category] = (groups[category] || 0) + contribution.amount;
    });

    return Object.entries(groups)
      .map(([categoryName, totalPaidAmount]) => ({ categoryName, totalPaidAmount }))
      .sort((a, b) => b.totalPaidAmount - a.totalPaidAmount);
  }, [selectedMemberId, allContributions]);

  const memberCategoryColumns = [
    { label: "Category", key: "categoryName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.categoryName}</Typography> },
    { label: "Total Paid", key: "totalPaidAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={800} color="success.main">₹{Number(row.totalPaidAmount).toLocaleString()}</Typography> },
  ];

  const chartData = useMemo(() => {
    if (mode === "member-category") {
      return memberCategoryData
        .filter((item) => Number(item.totalPaidAmount) > 0)
        .map((item) => ({ label: item.categoryName, value: Number(item.totalPaidAmount) }));
    }

    if (mode === "member") {
      return (report?.memberContributionHistory ?? [])
        .filter((item) => Number(item.totalPaidAmount) > 0)
        .map((item) => ({ label: item.memberName, value: Number(item.totalPaidAmount) }));
    }

    if (mode === "pending") {
      const grouped = {};
      (report?.pendingDues ?? []).forEach((item) => {
        const name = item.memberName || "Unknown";
        grouped[name] = (grouped[name] || 0) + (Number(item.amount) || 0);
      });
      return Object.entries(grouped)
        .filter(([, val]) => val > 0)
        .map(([memberName, amount]) => ({ label: memberName, value: amount }));
    }

    return (report?.eventCollections ?? [])
      .map((item) => {
        const val =
          eventMetric === "paid"
            ? Number(item.paidAmount) || 0
            : eventMetric === "pending"
            ? Number(item.pendingAmount) || 0
            : Number(item.expectedAmount) || 0;
        return { label: item.eventName, value: val };
      })
      .filter((item) => item.value > 0);
  }, [mode, memberCategoryData, report, eventMetric]);

  const pageTitle =
    mode === "event" ? "Event Audit" :
    mode === "member" ? "Member Velocity" :
    mode === "pending" ? "Pending Dues" :
    mode === "member-category" ? "Member Category Paid" :
    "Financial Analytics";

  const totalMemberPaid = useMemo(() => {
    return memberCategoryData.reduce((sum, row) => sum + row.totalPaidAmount, 0);
  }, [memberCategoryData]);

  const exportCurrentView = () => {
    if (!hasWriteAccess) return;

    if (mode === "member-category") {
      const activeMember = members.find((member) => member.memberId === selectedMemberId);
      const memberName = activeMember ? activeMember.name : "Member";
      exportSheets(`${memberName}-category-payments.xlsx`, [
        {
          name: "Category Payments",
          data: memberCategoryData.map((item, index) => ({
            "S.No": index + 1,
            Category: item.categoryName,
            "Total Paid (\u20B9)": item.totalPaidAmount,
          })),
        },
      ]);
      return;
    }

    exportSheets("team-contribution-reports.xlsx", [
      { name: "Event Collections", data: report?.eventCollections ?? [] },
      { name: "Member History", data: report?.memberContributionHistory ?? [] },
      { name: "Pending Dues", data: report?.pendingDues ?? [] },
    ]);
  };

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

            {/* Report Navigation Tabs */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 0.5 }}>
              {[
                { label: "Event Audit", path: "/reports/event-collection-audit", modeKey: "event" },
                { label: "Member Velocity", path: "/reports/member-velocity", modeKey: "member" },
                { label: "Pending Dues", path: "/reports/pending-dues", modeKey: "pending" },
                { label: "Member Category Paid", path: "/reports/member-category-paid", modeKey: "member-category" },
              ].map((tab) => {
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

            <Grid container spacing={2} alignItems="center">
              {mode === "member-category" ? (
                <>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <AppSelect
                      label="Select Member"
                      placeholder="Select Member"
                      value={selectedMemberId}
                      onChange={(event) => setSelectedMemberId(event.target.value)}
                      options={members.map((member) => ({ label: member.name, value: member.memberId }))}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ mt: { xs: 1, md: 2.5 } }}>
                      <SummaryChip label="Total Contributed" value={`\u20B9${Number(totalMemberPaid).toLocaleString()}`} color="success" />
                    </Stack>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <AppSelect
                      label="Month"
                      placeholder="Select Month"
                      value={filters.month}
                      onChange={(event) => setFilters((current) => ({ ...current, month: Number(event.target.value) }))}
                      options={monthOptions}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <AppSelect
                      label="Year"
                      placeholder="Select Year"
                      value={filters.year}
                      onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
                      options={yearOptions}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ mt: { xs: 1, md: 2.5 } }}>
                      <SummaryChip label="Expected" value={`\u20B9${Number(report?.eventCollections?.reduce((sum, row) => sum + row.expectedAmount, 0) ?? 0).toLocaleString()}`} />
                      <SummaryChip label="Paid" value={`\u20B9${Number(report?.eventCollections?.reduce((sum, row) => sum + row.paidAmount, 0) ?? 0).toLocaleString()}`} color="success" />
                      <SummaryChip label="Pending" value={`\u20B9${Number(report?.eventCollections?.reduce((sum, row) => sum + row.pendingAmount, 0) ?? 0).toLocaleString()}`} color="error" />
                    </Stack>
                  </Grid>
                </>
              )}
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
                            {(!mode || mode === "event") && (
                              <Stack direction="row" spacing={0.5} sx={{ ml: { xs: 0, sm: 1 } }}>
                                {[
                                  { label: "Expected", key: "expected" },
                                  { label: "Paid", key: "paid" },
                                  { label: "Pending", key: "pending" },
                                ].map((m) => (
                                  <Chip
                                    key={m.key}
                                    size="small"
                                    label={m.label}
                                    onClick={() => setEventMetric(m.key)}
                                    color={eventMetric === m.key ? "primary" : "default"}
                                    variant={eventMetric === m.key ? "filled" : "outlined"}
                                    sx={{
                                      height: 24,
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  />
                                ))}
                              </Stack>
                            )}
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
                                "&:hover": {
                                  color: chartType === "pie" ? "#ffffff" : "text.primary",
                                },
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
                                "&:hover": {
                                  color: chartType === "bar" ? "#ffffff" : "text.primary",
                                },
                              }}
                            >
                              <BarChartIcon sx={{ fontSize: 16 }} />
                              Bar Chart
                            </Box>
                          </Stack>
                        </Box>

                        {chartType === "pie" ? (
                          <AppPieChart items={chartData} />
                        ) : (
                          <SimpleBarChart items={chartData} />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
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
                          {mode === "member-category" ? (
                            <Stack spacing={1.5}>
                              <Chip
                                label={`Selected member: ${members.find((member) => member.memberId === selectedMemberId)?.name || "None"}`}
                                variant="outlined"
                                sx={{
                                  alignSelf: "flex-start",
                                  fontWeight: 700,
                                  borderColor: "secondary.main",
                                  color: "secondary.main"
                                }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                Paid category distribution helps identify where a member contributes most frequently.
                              </Typography>
                            </Stack>
                          ) : (
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                              {[
                                { label: "Event collections", value: report?.eventCollections?.length ?? 0 },
                                { label: "Member records", value: report?.memberContributionHistory?.length ?? 0 },
                                { label: "Pending dues", value: report?.pendingDues?.length ?? 0 }
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
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {(mode === "event" || !mode) && (
                <AppDataTable title="Event Collection Audit" columns={eventColumns} data={report?.eventCollections ?? []} loading={false} />
              )}

              {(mode === "member" || !mode) && (
                <AppDataTable title="Member Contribution Details" columns={memberColumns} data={report?.memberContributionHistory ?? []} loading={false} />
              )}

              {(mode === "pending" || !mode) && (
                <AppDataTable title="Pending Dues Details" columns={pendingColumns} data={report?.pendingDues ?? []} loading={false} />
              )}

              {mode === "member-category" && (
                <AppDataTable title="Category-wise Paid Summary" columns={memberCategoryColumns} data={memberCategoryData} loading={false} />
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
