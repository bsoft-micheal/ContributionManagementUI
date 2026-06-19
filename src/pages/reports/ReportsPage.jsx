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
import apiClient from "../../services/apiClient";
import { exportSheets } from "../../utils/exportToExcel";
import AppDataTable from "../../components/common/AppDataTable";
import AppSelect from "../../components/common/AppSelect";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import { GetMembers } from "../../services/memberService";
import { GetContributions } from "../../services/contributionService";

function SimpleBarChart({ items, valueKey = "value", labelKey = "label" }) {
  const theme = useTheme();
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <Stack spacing={1.25}>
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
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ minWidth: 84, textAlign: "right" }}>
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
  return <Chip label={`${label}: ${value}`} color={color} variant="outlined" sx={{ fontWeight: 700 }} />;
}

export default function ReportsPage({ mode }) {
  const theme = useTheme();
  const { authState } = useAuth();
  const hasWriteAccess = getRightsForPage("Reports", authState?.role).write;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });

  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [allContributions, setAllContributions] = useState([]);

  useEffect(() => {
    if (mode === "member-category") {
      async function loadMemberCategoryData() {
        setLoading(true);
        try {
          const membersList = await GetMembers();
          setMembers(membersList);
          if (membersList.length > 0) {
            setSelectedMemberId(membersList[0].memberId);
          }
          const contributionsList = await GetContributions();
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
        const { data } = await apiClient.get("/reports/summary", { params: filters });
        setReport(data);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [filters, mode]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: dayjs().month(i).format("MMMM"),
    value: i + 1,
  }));

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
      return memberCategoryData.map((item) => ({ label: item.categoryName, value: item.totalPaidAmount }));
    }

    if (mode === "member") {
      return (report?.memberContributionHistory ?? []).slice(0, 6).map((item) => ({ label: item.memberName, value: item.totalPaidAmount }));
    }

    if (mode === "pending") {
      return (report?.pendingDues ?? []).slice(0, 6).map((item) => ({ label: item.memberName, value: item.amount }));
    }

    return (report?.eventCollections ?? []).slice(0, 6).map((item) => ({ label: item.eventName, value: item.expectedAmount }));
  }, [mode, memberCategoryData, report]);

  const pageTitle =
    mode === "event" ? "Event-wise Collection Audit" :
    mode === "member" ? "Member Contribution Velocity" :
    mode === "pending" ? "High Priority Dues" :
    mode === "member-category" ? "Member Category-wise Paid Analysis" :
    "Financial Analytics";

  const pageSubtitle =
    mode === "event"
      ? "Compare expected, paid, and pending amounts for each event."
      : mode === "member"
      ? "See how individual member contributions trend across the selected period."
      : mode === "pending"
      ? "Focus on unpaid contributions that need immediate follow-up."
      : mode === "member-category"
      ? "Review how a selected member's paid contributions are distributed by category."
      : "Clean financial reporting with export-ready tables and charts.";

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
            py: 2.5,
            background: theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)"
              : "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.10) 100%)",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "start" }}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.2em", fontWeight: 800 }}>
                  Reports
                </Typography>
                <Typography variant="h4" fontWeight={900}>
                  {pageTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pageSubtitle}
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

            <Grid container spacing={2} alignItems="end">
              {mode === "member-category" ? (
                <Grid size={{ xs: 12, md: 4 }}>
                  <AppSelect
                    label="Select Member"
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    options={members.map((member) => ({ label: member.name, value: member.memberId }))}
                  />
                </Grid>
              ) : (
                <>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <AppSelect
                      label="Month"
                      value={filters.month}
                      onChange={(event) => setFilters((current) => ({ ...current, month: Number(event.target.value) }))}
                      options={monthOptions}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <AppInput
                      label="Year"
                      type="number"
                      value={filters.year}
                      onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
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
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={900}>
                            Visualization
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            A quick read on the most important values in this report.
                          </Typography>
                        </Box>
                        <SimpleBarChart items={chartData} />
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
                            At a glance
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            The current report summary and export status.
                          </Typography>
                        </Box>
                        <Stack spacing={1.5}>
                          {mode === "member-category" ? (
                            <>
                              <Chip
                                label={`Selected member: ${members.find((member) => member.memberId === selectedMemberId)?.name || "None"}`}
                                variant="outlined"
                                sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                Paid category distribution helps identify where a member contributes most frequently.
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" fontWeight={700}>
                                Event collections: {report?.eventCollections?.length ?? 0}
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                Member records: {report?.memberContributionHistory?.length ?? 0}
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                Pending dues: {report?.pendingDues?.length ?? 0}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {(mode === "event" || !mode) && (
                <AppDataTable title="Event-wise Collection Audit" columns={eventColumns} data={report?.eventCollections ?? []} loading={false} />
              )}

              {(mode === "member" || !mode) && (
                <AppDataTable title="Member Contribution Velocity" columns={memberColumns} data={report?.memberContributionHistory ?? []} loading={false} />
              )}

              {(mode === "pending" || !mode) && (
                <AppDataTable title="High Priority Dues (Pending Receipt)" columns={pendingColumns} data={report?.pendingDues ?? []} loading={false} />
              )}

              {mode === "member-category" && (
                <AppDataTable title="Category-wise Overall Paid Amount" columns={memberCategoryColumns} data={memberCategoryData} loading={false} />
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
