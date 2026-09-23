import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import AppInput from "../common/AppInput";
import { useAppToast } from "../common/AppToast";
import dayjs from "dayjs";
import {
  getEmailReminderLogs,
  clearEmailReminderLogs,
} from "../../services/emailReminderScheduler";

export default function EmailReminderLogsDialog({ open, onClose }) {
  const theme = useTheme();
  const toast = useAppToast();
  const isDark = theme.palette.mode === "dark";

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  const refreshLogs = () => {
    const list = getEmailReminderLogs();
    setLogs(list);
  };

  useEffect(() => {
    if (open) {
      refreshLogs();
    }
  }, [open]);

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all email reminder sending logs?")) {
      clearEmailReminderLogs();
      refreshLogs();
      toast.info("Email reminder logs cleared.");
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (log.memberName && log.memberName.toLowerCase().includes(q)) ||
      (log.recipientEmail && log.recipientEmail.toLowerCase().includes(q)) ||
      (log.categoryName && log.categoryName.toLowerCase().includes(q)) ||
      (log.stage && log.stage.toLowerCase().includes(q)) ||
      (log.subject && log.subject.toLowerCase().includes(q))
    );
  });

  const getStageColor = (stage) => {
    if (!stage) return "default";
    const s = stage.toLowerCase();
    if (s.includes("initial")) return "info";
    if (s.includes("reminder 1")) return "primary";
    if (s.includes("reminder 2")) return "warning";
    if (s.includes("reminder 3")) return "error";
    if (s.includes("test")) return "secondary";
    return "default";
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <HistoryOutlinedIcon sx={{ color: "#0284c7" }} />
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1.05rem" }}>
            Email Sending History & Audit Logs
          </Typography>
        </Box>
      }
      maxWidth="lg"
      actions={
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <AppButton
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineOutlinedIcon />}
            onClick={handleClear}
            disabled={logs.length === 0}
            sx={{ fontSize: "0.8rem" }}
          >
            Clear Log History
          </AppButton>
          <AppButton variant="contained" onClick={onClose} sx={{ bgcolor: "#0284c7 !important" }}>
            Close
          </AppButton>
        </Box>
      }
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.76rem" }}>
            Audit log of all category-based automated notifications, 10-day reminders, and test emails ({filteredLogs.length} total entries).
          </Typography>
          <Box sx={{ width: { xs: "100%", sm: 280 } }}>
            <AppInput
              placeholder="Search member, email, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        {filteredLogs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${theme.palette.divider}`, borderRadius: "10px" }}>
            <Typography variant="body2" color="text.secondary">
              No email dispatch records found. Send a test email or execute a scheduler cycle to populate logs.
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              maxHeight: 440,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "10px",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Recipient / Member</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Stage</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem" }} align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontSize: "0.74rem", whiteSpace: "nowrap" }}>
                      {dayjs(row.sentDate).format("DD/MM/YYYY, hh:mm A")}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.76rem" }}>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
                        {row.memberName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                        {row.recipientEmail}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.76rem", fontWeight: 600 }}>
                      {row.categoryName || "General"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.stage || "Initial"}
                        size="small"
                        color={getStageColor(row.stage)}
                        variant="outlined"
                        sx={{ fontSize: "0.68rem", fontWeight: 700, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.76rem", fontWeight: 700, color: "#0284c7" }}>
                      {row.amount ? `₹${Number(row.amount).toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.74rem", maxWidth: 220 }}>
                      <Tooltip title={row.subject || ""}>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ display: "block", fontSize: "0.74rem", color: "text.primary" }}
                        >
                          {row.subject || "—"}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.status || "Sent"}
                        size="small"
                        sx={{
                          bgcolor: isDark ? "rgba(16,185,129,0.15)" : "#d1fae5",
                          color: "#059669",
                          fontWeight: 700,
                          fontSize: "0.66rem",
                          height: 20,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </AppDialog>
  );
}
