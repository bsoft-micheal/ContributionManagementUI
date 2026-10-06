import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  useTheme,
} from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import dayjs from "dayjs";

/**
 * ExecutiveFinancialBarChart
 * Clean executive financial bar chart visualization for the main Dashboard.
 * Displays comparative bars matching the exact top metric cards:
 * Total Expected, Total Collections, Total Pending, Total Expenses, and Balance Amount.
 */
export default function ExecutiveFinancialBarChart({
  events = [],
  isMember = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [hoveredEventId, setHoveredEventId] = useState(null);

  const formatAmount = (val) =>
    Number(val || 0).toLocaleString(undefined, {
      maximumFractionDigits: Number(val || 0) % 1 === 0 ? 0 : 2,
    });

  return (
    <Box>
      {/* ── Header ── */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.35)",
              flexShrink: 0,
            }}
          >
            <BarChartRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Typography
            variant="h6"
            fontWeight={900}
            sx={{ lineHeight: 1.2, fontFamily: '"Outfit", sans-serif' }}
          >
            Financial Overview
          </Typography>
          {events.length > 1 && (
            <Chip
              size="small"
              label={`${events.length} Events`}
              sx={{
                height: 22,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)",
                color: "primary.main",
              }}
            />
          )}
        </Stack>
      </Stack>

      {/* ── Visual Bar Content Area ── */}
      {events.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: "center",
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: "12px",
            color: "text.secondary",
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            No events available for financial visualization in this period.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: events.length > 1 ? { xs: 460, sm: 480, md: 510 } : "none",
            overflowY: events.length > 1 ? "auto" : "visible",
            pr: events.length > 1 ? 0.75 : 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "rgba(124, 58, 237, 0.45)" : "rgba(124, 58, 237, 0.35)",
              borderRadius: "4px",
              "&:hover": {
                background: isDark ? "rgba(124, 58, 237, 0.7)" : "rgba(124, 58, 237, 0.6)",
              },
            },
          }}
        >
          {events.map((e, idx) => {
            const exp = Number(e.expected !== undefined ? e.expected : e.expectedAmount) || 0;
            const col = Number(e.collected !== undefined ? e.collected : (e.paidAmount !== undefined ? e.paidAmount : e.collectedAmount)) || 0;
            const pen = Number(e.pending !== undefined ? e.pending : (e.pendingAmount !== undefined ? e.pendingAmount : Math.max(0, exp - col))) || 0;
            const expense = Number(e.expense !== undefined ? e.expense : e.expenseAmount) || 0;
            const rem = e.remaining !== undefined ? Number(e.remaining) : (e.remainingAmount !== undefined ? Number(e.remainingAmount) : (exp - expense));
            const eventLabel = e.label || e.eventName || "Event";
            const eventDate = e.date || e.eventDate;
            const isHovered = hoveredEventId === (e.id || e.eventId || idx);

            const colPct = exp > 0 ? Math.min(100, Math.round((col / exp) * 100)) : 0;
            const penPct = exp > 0 ? Math.min(100, Math.round((pen / exp) * 100)) : 0;
            const expPct = exp > 0 ? Math.min(100, Math.round((expense / exp) * 100)) : 0;
            const remPct = exp > 0 ? Math.min(100, Math.max(0, Math.round((rem / exp) * 100))) : 0;

            const isSurplus = rem >= 0;

            return (
              <Box
                key={e.id || idx}
                onMouseEnter={() => setHoveredEventId(e.id || idx)}
                onMouseLeave={() => setHoveredEventId(null)}
                sx={{
                  p: 2.25,
                  borderRadius: "14px",
                  border: "1.5px solid",
                  borderColor: isHovered
                    ? "#7c3aed"
                    : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                  bgcolor: isHovered
                    ? isDark
                      ? "rgba(124,58,237,0.08)"
                      : "rgba(124,58,237,0.03)"
                    : isDark
                    ? "rgba(255,255,255,0.02)"
                    : "#ffffff",
                  boxShadow: isHovered
                    ? isDark
                      ? "0 6px 20px rgba(124,58,237,0.2)"
                      : "0 6px 20px rgba(0,0,0,0.06)"
                    : "none",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: isHovered ? "translateY(-1.5px)" : "none",
                }}
              >
                {/* ── Event Meta Header ── */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                  flexWrap="wrap"
                  sx={{ mb: 2 }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: e.color || "#7c3aed",
                      boxShadow: "0 0 8px rgba(124, 58, 237, 0.6)",
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight={900} sx={{ fontSize: "0.95rem" }}>
                    {eventLabel}
                  </Typography>
                  {e.eventTypeName && (
                    <Chip
                      label={e.eventTypeName}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        bgcolor: isDark ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)",
                        color: "primary.main",
                      }}
                    />
                  )}
                  {eventDate && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.75rem" }}>
                      • {dayjs(eventDate).format("DD MMM YYYY")}
                    </Typography>
                  )}
                </Stack>

                {/* ── 5 Comparative Bars Matching Top Metric Cards ── */}
                <Stack spacing={1.5}>
                  {/* Total Expected Bar */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.74rem", color: "#6366f1" }}>
                        Total Expected
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.78rem", fontFamily: '"Outfit", sans-serif', color: "#6366f1" }}>
                        ₹{formatAmount(exp)}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 9, borderRadius: "5px", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                      <Box sx={{ height: "100%", width: "100%", borderRadius: "5px", background: "linear-gradient(90deg, #818cf8 0%, #6366f1 100%)" }} />
                    </Box>
                  </Box>

                  {/* Total Collections Bar */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.74rem", color: "#10b981" }}>
                        {isMember ? "My Collections" : "Total Collections"}
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.78rem", fontFamily: '"Outfit", sans-serif', color: "#10b981" }}>
                        ₹{formatAmount(col)}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 9, borderRadius: "5px", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${colPct}%`,
                          borderRadius: "5px",
                          background: "linear-gradient(90deg, #34d399 0%, #10b981 100%)",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Total Pending Bar */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.74rem", color: "#f43f5e" }}>
                        Total Pending
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.78rem", fontFamily: '"Outfit", sans-serif', color: "#f43f5e" }}>
                        ₹{formatAmount(pen)}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 9, borderRadius: "5px", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${penPct}%`,
                          borderRadius: "5px",
                          background: "linear-gradient(90deg, #fb7185 0%, #f43f5e 100%)",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Total Expenses Bar */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.74rem", color: "#f59e0b" }}>
                        Total Expenses
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.78rem", fontFamily: '"Outfit", sans-serif', color: "#f59e0b" }}>
                        ₹{formatAmount(expense)}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 9, borderRadius: "5px", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${expPct}%`,
                          borderRadius: "5px",
                          background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Balance Amount Bar */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.74rem", color: isSurplus ? "#06b6d4" : "#f43f5e" }}>
                        Balance Amount
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: "0.78rem", fontFamily: '"Outfit", sans-serif', color: isSurplus ? "#06b6d4" : "#f43f5e" }}>
                        ₹{formatAmount(rem)}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 9, borderRadius: "5px", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${remPct}%`,
                          borderRadius: "5px",
                          background: isSurplus
                            ? "linear-gradient(90deg, #38bdf8 0%, #06b6d4 100%)"
                            : "linear-gradient(90deg, #fb7185 0%, #f43f5e 100%)",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </Box>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
