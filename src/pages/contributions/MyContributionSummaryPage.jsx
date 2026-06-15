import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import apiClient from "../../services/apiClient";
import AppDataTable from "../../components/common/AppDataTable";
import { exportSheets } from "../../utils/exportToExcel";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  return (
    <Card
      sx={{
        border: "none",
        borderRadius: "10px",
        boxShadow: "0 2px 12px rgba(74,63,107,0.10)",
        background: bg || "#fff",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: color + "18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, { sx: { color, fontSize: "1.4rem" } })}
          </Box>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {label}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={900} sx={{ color, mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MyContributionSummaryPage() {
  const { authState } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/contributions/my-summary");
        setSummary(data);
      } catch (err) {
        console.error("Failed to load contribution summary:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categoryColumns = [
    {
      label: "Category",
      key: "categoryName",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CategoryRoundedIcon sx={{ fontSize: "1rem", color: "#4a3f6b" }} />
          <Typography variant="body2" fontWeight={700}>{row.categoryName}</Typography>
        </Box>
      ),
    },
    {
      label: "Events Paid",
      key: "eventCount",
      align: "center",
      render: (row) => (
        <Chip
          label={row.eventCount}
          size="small"
          sx={{ bgcolor: "rgba(74,63,107,0.1)", color: "#4a3f6b", fontWeight: 700, fontSize: "0.8rem" }}
        />
      ),
    },
    {
      label: "Total Paid",
      key: "totalPaid",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={800} color="success.main">
          ₹{row.totalPaid.toLocaleString()}
        </Typography>
      ),
    },
  ];

  const eventColumns = [
    {
      label: "Event",
      key: "eventName",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>{row.eventName}</Typography>
      ),
    },
    {
      label: "Category",
      key: "categoryName",
      render: (row) => (
        <Chip
          label={row.categoryName}
          size="small"
          variant="outlined"
          sx={{ borderColor: "#4a3f6b", color: "#4a3f6b", fontWeight: 600, fontSize: "0.75rem" }}
        />
      ),
    },
    {
      label: "Amount",
      key: "amount",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          ₹{row.amount.toLocaleString()}
        </Typography>
      ),
    },
    {
      label: "Status",
      key: "paymentStatus",
      align: "center",
      render: (row) => (
        <Chip
          label={row.paymentStatus}
          size="small"
          sx={{
            bgcolor: row.paymentStatus === "Paid" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: row.paymentStatus === "Paid" ? "#16a34a" : "#dc2626",
            fontWeight: 700,
            fontSize: "0.75rem",
          }}
        />
      ),
    },
    {
      label: "Payment Date",
      key: "paymentDate",
      render: (row) =>
        row.paymentDate
          ? dayjs(row.paymentDate).format("DD MMM YYYY")
          : <Typography variant="body2" color="text.secondary">—</Typography>,
    },
  ];

  const handleExport = () => {
    if (!summary) return;
    exportSheets(`my-contribution-summary.xlsx`, [
      {
        name: "Category Breakdown",
        data: (summary.categoryBreakdown ?? []).map((d, i) => ({
          "S.No": i + 1,
          "Category": d.categoryName,
          "Events Paid": d.eventCount,
          "Total Paid (₹)": d.totalPaid,
        })),
      },
      {
        name: "Event History",
        data: (summary.eventBreakdown ?? []).map((d, i) => ({
          "S.No": i + 1,
          "Event": d.eventName,
          "Category": d.categoryName,
          "Amount (₹)": d.amount,
          "Status": d.paymentStatus,
          "Payment Date": d.paymentDate ? dayjs(d.paymentDate).format("DD MMM YYYY") : "",
        })),
      },
    ]);
  };

  const memberName = summary?.memberName || authState?.fullName || "Member";
  const totalPaid = summary?.totalPaidAmount ?? 0;
  const totalPending = summary?.totalPendingAmount ?? 0;
  const categoryCount = summary?.categoryBreakdown?.length ?? 0;

  return (
    <div className="page-shell">
      {/* ── Header card ──────────────────────────────────────────────────────── */}
      <Card
        sx={{
          border: "none",
          boxShadow: "0 2px 8px rgba(74,63,107,0.1)",
          borderRadius: "6px",
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
            color: "#fff",
            px: 2.5,
            py: 0.5,
            minHeight: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ color: "#fff", fontSize: "0.85rem" }}
            >
              My Contribution Summary
            </Typography>
            <Typography variant="caption" sx={{ color: "#c4bde0", fontSize: "0.72rem" }}>
              All-time • {memberName}
            </Typography>
          </Box>
          <AppButton
            size="small"
            variant="contained"
            sx={{
              bgcolor: "#2a1b4d",
              borderRadius: "3px",
              fontSize: "0.75rem",
              py: 0.3,
              px: 2,
              "&:hover": { bgcolor: "#1a1033" },
            }}
            onClick={handleExport}
          >
            Export Excel
          </AppButton>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* ── Stats row ──────────────────────────────────────────────────── */}
          <Box sx={{ bgcolor: "#faf9fd", p: 2.5, borderBottom: "1px solid rgba(74,63,107,0.1)" }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard
                  icon={<AccountBalanceWalletRoundedIcon />}
                  label="Total Paid (All Time)"
                  value={`₹${totalPaid.toLocaleString()}`}
                  color="#16a34a"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard
                  icon={<PendingActionsRoundedIcon />}
                  label="Total Pending"
                  value={`₹${totalPending.toLocaleString()}`}
                  color="#dc2626"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard
                  icon={<CategoryRoundedIcon />}
                  label="Categories Contributed"
                  value={categoryCount}
                  color="#4a3f6b"
                />
              </Grid>
            </Grid>
          </Box>

          {/* ── Tables ─────────────────────────────────────────────────────── */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Category breakdown */}
              <Grid size={{ xs: 12, md: 5 }}>
                <AppDataTable
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CategoryRoundedIcon sx={{ fontSize: "1rem", color: "#4a3f6b" }} />
                      Category-wise Paid Summary
                    </Box>
                  }
                  columns={categoryColumns}
                  data={summary?.categoryBreakdown ?? []}
                  loading={loading}
                />
              </Grid>

              {/* Event history */}
              <Grid size={{ xs: 12, md: 7 }}>
                <AppDataTable
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ReceiptLongRoundedIcon sx={{ fontSize: "1rem", color: "#4a3f6b" }} />
                      Event-by-Event History
                    </Box>
                  }
                  columns={eventColumns}
                  data={summary?.eventBreakdown ?? []}
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
