import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  Avatar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { useAppToast } from "../common/AppToast";
import { getBudgetCalculationHistoryAsync } from "../../services/budgetCalculationService";
import { formatGridDate } from "../../utils/dateHelper";

export default function RateHistoryModal({
  open,
  onClose,
  item,
}) {
  const theme = useTheme();
  const toast = useAppToast();

  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (open && item?.budgetCalculationId) {
      loadHistory(item.budgetCalculationId);
      setPage(0);
    }
  }, [open, item]);

  const loadHistory = async (id) => {
    setLoading(true);
    try {
      const data = await getBudgetCalculationHistoryAsync(id);
      setHistoryList(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Unable to load rate history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const paginatedList = useMemo(() => {
    const start = page * rowsPerPage;
    return historyList.slice(start, start + rowsPerPage);
  }, [historyList, page, rowsPerPage]);

  const totalPages = Math.ceil(historyList.length / rowsPerPage) || 1;

  if (!item) return null;

  const latestHistory = historyList[0];
  const lastUpdatedOn = latestHistory?.changedOn
    ? formatGridDate(latestHistory.changedOn)
    : item.createdAt || item.createdOn
    ? formatGridDate(item.createdAt || item.createdOn)
    : "--";
  const lastUpdatedBy = latestHistory?.changedBy || item.createdBy || "--";

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={`Rate History - ${item.expenseItem || "Expense Item"}`}
      maxWidth="md"
      actions={
        <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <AppButton variant="outlined" onClick={onClose} sx={{ px: 3 }}>
            Close
          </AppButton>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, minWidth: { xs: "100%", sm: 680, md: 800 } }}>
        {/* Header Summary Info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            p: 2,
            borderRadius: "10px",
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f9f8fc",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "#2d2448" : "#ede8f9",
                color: theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                width: 48,
                height: 48,
              }}
            >
              <ReceiptLongRoundedIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Expense Item
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                {item.expenseItem}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 3.5, flexWrap: "wrap", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Event Type
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                {item.category || item.eventTypeName || "--"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Current Rate
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  color: theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                  lineHeight: 1.1,
                }}
              >
                ₹{(item.rate ?? 0).toLocaleString("en-IN")}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Last Updated On
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {lastUpdatedOn}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Last Updated By
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {lastUpdatedBy}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Section Heading */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryRoundedIcon sx={{ fontSize: "1.3rem", color: theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: "0.02em" }}>
            Rate Change History
          </Typography>
        </Box>

        {/* History Table */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: "8px",
            borderColor: theme.palette.divider,
            maxHeight: 380,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: theme.palette.mode === "dark" ? "#1e2438" : "#f1eff9",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    color: theme.palette.text.primary,
                    py: 1.2,
                  },
                }}
              >
                <TableCell>Rate (₹)</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Changed On</TableCell>
                <TableCell>Changed By</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                    <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                      Loading rate history...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : historyList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No rate history records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedList.map((row, index) => {
                  const isIncrease = row.changeType === "INCREASE";
                  const isDecrease = row.changeType === "DECREASE";
                  const isInitial = row.changeType === "INITIAL";

                  return (
                    <TableRow
                      key={row.historyId || index}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >

                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            color: theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b",
                          }}
                        >
                          ₹{(row.newRate ?? 0).toLocaleString("en-IN")}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {isInitial ? (
                          <Chip
                            label="Initial"
                            size="small"
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              height: 22,
                              bgcolor: "rgba(100, 116, 139, 0.1)",
                              color: "#64748b",
                            }}
                          />
                        ) : isIncrease ? (
                          <Chip
                            icon={<TrendingUpRoundedIcon sx={{ "&&": { color: "#16a34a", fontSize: "0.95rem" } }} />}
                            label={`+₹${(row.changeAmount ?? 0).toLocaleString("en-IN")} (${row.changePercentage > 0 ? "+" : ""}${row.changePercentage}%)`}
                            size="small"
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              height: 22,
                              bgcolor: "rgba(22, 163, 74, 0.1)",
                              color: "#16a34a",
                            }}
                          />
                        ) : isDecrease ? (
                          <Chip
                            icon={<TrendingDownRoundedIcon sx={{ "&&": { color: "#dc2626", fontSize: "0.95rem" } }} />}
                            label={`-₹${Math.abs(row.changeAmount ?? 0).toLocaleString("en-IN")} (${row.changePercentage}%)`}
                            size="small"
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              height: 22,
                              bgcolor: "rgba(220, 38, 38, 0.1)",
                              color: "#dc2626",
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            --
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" fontWeight={600}>
                          {row.effectiveFrom ? formatGridDate(row.effectiveFrom) : "--"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.changedOn ? formatGridDate(row.changedOn) : "--"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem" }}>
                          {row.changedBy || "--"}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.3,
                            color: theme.palette.text.primary,
                          }}
                          title={row.changeReason}
                        >
                          {row.changeReason || "--"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer */}
        {historyList.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
              pt: 0.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Rows per page:
              </Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                size="small"
                sx={{
                  fontSize: "0.75rem",
                  height: 28,
                  "& .MuiSelect-select": { py: 0.2, px: 1 },
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={15}>15</MenuItem>
                <MenuItem value={25}>25</MenuItem>
              </Select>
            </Box>

            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Rows {historyList.length} • Page {page + 1} of {totalPages}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton
                size="small"
                disabled={page === 0}
                onClick={() => setPage(0)}
                sx={{ p: 0.5 }}
              >
                <FirstPageRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                sx={{ p: 0.5 }}
              >
                <ChevronLeftRoundedIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" fontWeight={700} sx={{ px: 1 }}>
                {page + 1}
              </Typography>
              <IconButton
                size="small"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                sx={{ p: 0.5 }}
              >
                <ChevronRightRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
                sx={{ p: 0.5 }}
              >
                <LastPageRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
    </AppDialog>
  );
}
