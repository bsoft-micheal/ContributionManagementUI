import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import apiClient from "../../services/apiClient";
import AppDataTable from "../../components/common/AppDataTable";
import { exportSheets } from "../../utils/exportToExcel";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../contexts/AuthContext";
import PaymentQrReminderDialog from "../../components/contributions/PaymentQrReminderDialog";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Card
      sx={{
        borderRadius: "10px",
        boxShadow: isDark ? "0 10px 24px rgba(0,0,0,0.2)" : "0 2px 12px rgba(74,63,107,0.10)",
        background: bg || (isDark ? "#171b2d" : "#fff"),
        height: "100%",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "transparent"}`,
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
            {React.cloneElement(icon, { sx: { color: isDark ? "#ffffff" : color, fontSize: "1.4rem" } })}
          </Box>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: isDark ? "#d6dbef" : "#6b7280", letterSpacing: "0.05em" }}
          >
            {label}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={900} sx={{ color: isDark ? "#ffffff" : color, mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MyContributionSummaryPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

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
          <CategoryRoundedIcon sx={{ fontSize: "1rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
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
          sx={{ 
            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74,63,107,0.1)", 
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b", 
            fontWeight: 700, 
            fontSize: "0.8rem" 
          }}
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
          sx={{ 
            borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "#4a3f6b", 
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b", 
            fontWeight: 600, 
            fontSize: "0.75rem" 
          }}
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
          boxShadow: theme.palette.mode === "dark" ? "0 12px 28px rgba(0,0,0,0.22)" : "0 2px 8px rgba(74,63,107,0.1)",
          borderRadius: "6px",
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box
          sx={{
            background: theme.palette.mode === "dark"
              ? "linear-gradient(90deg, #171b2d 0%, #1d2338 100%)"
              : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
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
            <Typography variant="caption" sx={{ color: theme.palette.mode === "dark" ? "#d6dbef" : "#c4bde0", fontSize: "0.72rem" }}>
              All-time • {memberName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {totalPending > 0 && (
              <AppButton
                size="small"
                variant="contained"
                startIcon={<QrCodeScannerOutlinedIcon sx={{ fontSize: "1rem" }} />}
                sx={{
                  bgcolor: "#0284c7 !important",
                  borderRadius: "3px",
                  fontSize: "0.75rem",
                  py: 0.3,
                  px: 1.5,
                  "&:hover": { bgcolor: "#0369a1 !important" },
                }}
                onClick={() => setQrDialogOpen(true)}
              >
                Pay Dues via UPI QR
              </AppButton>
            )}
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
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* ── Stats row ──────────────────────────────────────────────────── */}
          <Box sx={{ bgcolor: theme.palette.mode === "dark" ? "#171b2d" : "#faf9fd", p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
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
                      <CategoryRoundedIcon sx={{ fontSize: "1rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
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
                      <ReceiptLongRoundedIcon sx={{ fontSize: "1rem", color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
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
      {/* ── Dynamic UPI QR Payment Dialog ── */}
      <PaymentQrReminderDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        contribution={{
          memberName,
          totalAccumulated: totalPending,
          amount: totalPending,
          eventName: "Pending Contributions",
        }}
        event={{ eventName: "Pending Contributions" }}
      />
    </div>
  );
}
