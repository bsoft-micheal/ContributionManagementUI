import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import apiClient from "../services/apiClient";
import { exportSheets } from "../utils/exportToExcel";
import AppDataTable from "../components/common/AppDataTable";
import AppSelect from "../components/common/AppSelect";
import AppInput from "../components/common/AppInput";
import AppButton from "../components/common/AppButton";

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: dayjs().month() + 1, year: dayjs().year() });

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const { data } = await apiClient.get("/reports/summary", { params: filters });
      setReport(data);
      setLoading(false);
    }

    loadReports();
  }, [filters]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ 
    label: dayjs().month(i).format("MMMM"), 
    value: i + 1 
  }));

  const eventColumns = [
    { label: "Event",    key: "eventName",    render: (row) => <Typography variant="body2" fontWeight={700}>{row.eventName}</Typography> },
    { label: "Date",     key: "eventDate",    render: (row) => dayjs(row.eventDate).format("DD MMM YYYY") },
    { label: "Expected", key: "expectedAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{row.expectedAmount}</Typography> },
    { label: "Paid",     key: "paidAmount",    align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="success.main">₹{row.paidAmount}</Typography> },
    { label: "Pending",  key: "pendingAmount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="error.main">₹{row.pendingAmount}</Typography> },
  ];

  const memberColumns = [
    { label: "Member",   key: "memberName",          render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Expected", key: "totalExpectedAmount",  align: "right", render: (row) => `₹${row.totalExpectedAmount}` },
    { label: "Paid",     key: "totalPaidAmount",      align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="success.main">₹{row.totalPaidAmount}</Typography> },
  ];

  const pendingColumns = [
    { label: "Member",  key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    { label: "Event",   key: "eventName" },
    { label: "Amount",  key: "amount",    align: "right", render: (row) => <Typography variant="body2" fontWeight={700} color="error.main">₹{row.amount}</Typography> },
  ];

  return (
    <div className="page-shell">
      <Card sx={{ border: "none", boxShadow: "0 2px 8px rgba(74,63,107,0.1)", borderRadius: "6px", overflow: "hidden" }}>
        <Box sx={{
          background: "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
          color: "#ffffff",
          px: 2.5,
          py: 0.5,
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#ffffff", fontSize: "0.85rem" }}>
            Financial Analytics
          </Typography>
          <AppButton
            size="small"
            variant="contained"
            sx={{ bgcolor: "#2a1b4d", borderRadius: "3px", fontSize: "0.75rem", py: 0.3, px: 2, "&:hover": { bgcolor: "#1a1033" } }}
            onClick={() =>
              exportSheets("team-contribution-reports.xlsx", [
                { name: "Event Collections", data: report?.eventCollections ?? [] },
                { name: "Member History", data: report?.memberContributionHistory ?? [] },
                { name: "Pending Dues", data: report?.pendingDues ?? [] },
              ])
            }
          >
            Export Excel
          </AppButton>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: "#faf9fd", p: 2, borderBottom: "1px solid rgba(74,63,107,0.1)" }}>
            <Grid container spacing={3} alignItems="center">
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
              <Grid size={{ xs: 12, md: 6 }}>
                 <Typography variant="caption" color="text.secondary">Collection Health Index</Typography>
                 <Typography variant="body2" fontWeight={800}>
                    ₹{report?.eventCollections?.reduce((s, r) => s + r.paidAmount, 0)} Realized / ₹{report?.eventCollections?.reduce((s, r) => s + r.expectedAmount, 0)} Projected
                 </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: "text.secondary", textTransform: "uppercase" }}>
                   Event-wise Collection Audit
                </Typography>
                <AppDataTable
                  columns={eventColumns}
                  data={report?.eventCollections ?? []}
                  loading={loading}
                />
              </Grid>
              
              <Grid size={{ xs: 12, lg: 6 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: "text.secondary", textTransform: "uppercase" }}>
                   Member Contribution Velocity
                </Typography>
                <AppDataTable
                  columns={memberColumns}
                  data={report?.memberContributionHistory ?? []}
                  loading={loading}
                />
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: "text.secondary", textTransform: "uppercase" }}>
                   High Priority Dues (Pending Receipt)
                </Typography>
                <AppDataTable
                  columns={pendingColumns}
                  data={report?.pendingDues ?? []}
                  loading={loading}
                />
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}

