import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Chip,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  TableFooter,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  FileDownload as FileDownloadIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarMonthIcon,
  People as PeopleIcon,
  ReceiptLong as ReceiptLongIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  SearchOff as SearchOffIcon,
  InfoOutlined as InfoIcon,
  GridOn as ExcelIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import AppSelect from "../common/AppSelect";
import AppButton, { AppClearFilterButton } from "../common/AppButton";
import { exportSheets } from "../../utils/exportToExcel";
import { formatWholeCurrency } from "../../utils/roundingHelper";
import { formatGridDate } from "../../utils/dateHelper";
import { getPendingDuesReportAsync } from "../../services/reportService";
import { getEventsAsync } from "../../services/eventService";
import { useAppToast } from "../common/AppToast";

export default function PendingDuesReport({
  eventTypesList = [],
  eventsList: propEventsList = [],
  isMember = false,
  currentUserId,
  currentUserName,
  canExport = true,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toast = useAppToast();

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1; // 1-12

  // Filter States - Ordered as: Year -> Month -> Event Type -> Event Name
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = All Months / Latest
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [appliedFilters, setAppliedFilters] = useState({
    year: currentYear,
    month: 0,
    eventType: "ALL",
    eventId: "ALL",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [onlyWithDues, setOnlyWithDues] = useState(true);

  // Events list state
  const [internalEvents, setInternalEvents] = useState(propEventsList || []);

  useEffect(() => {
    if (propEventsList && propEventsList.length > 0) {
      setInternalEvents(propEventsList);
    } else {
      getEventsAsync()
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          setInternalEvents(list);
        })
        .catch(() => {});
    }
  }, [propEventsList]);

  // Data States
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Member Breakdown Modal
  const [selectedMemberModal, setSelectedMemberModal] = useState(null);

  // Month & Year Options
  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      list.push({ label: String(y), value: y });
    }
    return list;
  }, [currentYear]);

  const monthOptions = useMemo(() => [
    { label: "All Months", value: 0 },
    { label: "Jan", value: 1 },
    { label: "Feb", value: 2 },
    { label: "Mar", value: 3 },
    { label: "Apr", value: 4 },
    { label: "May", value: 5 },
    { label: "Jun", value: 6 },
    { label: "Jul", value: 7 },
    { label: "Aug", value: 8 },
    { label: "Sep", value: 9 },
    { label: "Oct", value: 10 },
    { label: "Nov", value: 11 },
    { label: "Dec", value: 12 },
  ], []);

  const eventTypeOptions = useMemo(() => [
    { label: "All Event Types", value: "ALL" },
    ...eventTypesList.map((t) => ({
      label: t.name || t.eventTypeName,
      value: t.id || t.eventTypeId,
    })),
  ], [eventTypesList]);

  const eventOptions = useMemo(() => {
    let list = internalEvents || [];
    if (selectedEventType && selectedEventType !== "ALL") {
      list = list.filter((e) => String(e.eventTypeId || e.EventTypeId) === String(selectedEventType));
    }
    if (selectedYear && selectedYear !== 0) {
      list = list.filter((e) => {
        const d = e.eventDate || e.EventDate || e.createdAt;
        return d ? dayjs(d).year() === Number(selectedYear) : true;
      });
    }
    if (selectedMonth && selectedMonth !== 0) {
      list = list.filter((e) => {
        const d = e.eventDate || e.EventDate || e.createdAt;
        return d ? dayjs(d).month() + 1 === Number(selectedMonth) : true;
      });
    }
    return [
      { label: "All Events", value: "ALL" },
      ...list.map((e) => ({
        label: e.eventName || e.EventName || "Event",
        value: e.eventId || e.EventId,
      })),
    ];
  }, [internalEvents, selectedEventType, selectedYear, selectedMonth]);

  // Load Report Data
  const fetchReport = useCallback(async (filters) => {
    setLoading(true);
    try {
      const data = await getPendingDuesReportAsync(
        filters.month,
        filters.year,
        filters.eventType,
        filters.eventId
      );
      setReportData(data);
    } catch {
      toast.error("Failed to load pending dues report.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReport(appliedFilters);
  }, [appliedFilters, fetchReport]);

  const handleApplyFilter = () => {
    setAppliedFilters({
      year: selectedYear,
      month: selectedMonth,
      eventType: selectedEventType,
      eventId: selectedEvent,
    });
  };

  const handleClearFilter = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(0);
    setSelectedEventType("ALL");
    setSelectedEvent("ALL");
    setSearchTerm("");
    setOnlyWithDues(true);
    setAppliedFilters({
      year: currentYear,
      month: 0,
      eventType: "ALL",
      eventId: "ALL",
    });
  };

  // Header Title matching Image 2
  const reportTitle = useMemo(() => {
    if (appliedFilters.eventId && appliedFilters.eventId !== "ALL") {
      const ev = (internalEvents || []).find((e) => String(e.eventId || e.EventId) === String(appliedFilters.eventId));
      if (ev) return `${ev.eventName || ev.EventName} Contribution Dues`;
    }
    if (appliedFilters.eventType && appliedFilters.eventType !== "ALL") {
      const match = eventTypesList.find(
        (t) => String(t.id || t.eventTypeId) === String(appliedFilters.eventType)
      );
      if (match) return `${match.name || match.eventTypeName} Contribution`;
    }
    return "Pending Contribution Dues";
  }, [appliedFilters.eventId, appliedFilters.eventType, internalEvents, eventTypesList]);

  // Short month helper
  const toShortMonth = (name) => {
    if (!name) return "";
    const map = {
      january: "Jan",
      february: "Feb",
      march: "Mar",
      april: "Apr",
      may: "May",
      june: "Jun",
      july: "Jul",
      august: "Aug",
      september: "Sep",
      october: "Oct",
      november: "Nov",
      december: "Dec",
    };
    const key = name.trim().toLowerCase();
    return map[key] || name;
  };

  // Labels (Short form for extra space)
  const priorLabel = reportData?.priorMonthsLabel || "Previous Arrear";
  const prevLabel = toShortMonth(reportData?.previousMonthLabel);
  const currentLabel = toShortMonth(reportData?.currentMonthLabel) || "Current Month";
  const hasPrevColumn = Boolean(prevLabel && prevLabel.trim().length > 0);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!reportData?.members) return [];
    let list = reportData.members;

    // Member role filter: members only see themselves
    if (isMember && currentUserId) {
      list = list.filter(
        (m) =>
          String(m.memberId).toLowerCase() === String(currentUserId).toLowerCase() ||
          (currentUserName && m.memberName.toLowerCase().trim() === currentUserName.toLowerCase().trim())
      );
    }

    // Dues filter
    if (onlyWithDues) {
      list = list.filter((m) => Number(m.totalPendingAmount || 0) > 0);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.memberName.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reportData, onlyWithDues, searchTerm, isMember, currentUserId, currentUserName]);

  // Calculations for displayed members
  const displayedTotals = useMemo(() => {
    return filteredMembers.reduce(
      (acc, m) => {
        acc.prior += Number(m.priorMonthsPendingAmount || 0);
        acc.previous += Number(m.previousMonthPendingAmount || 0);
        acc.current += Number(m.currentMonthPendingAmount || 0);
        acc.total += Number(m.totalPendingAmount || 0);
        return acc;
      },
      { prior: 0, previous: 0, current: 0, total: 0 }
    );
  }, [filteredMembers]);

  // Export to Excel matching Image 2
  const handleExportExcel = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast.warning("No records found to export.");
      return;
    }

    try {
      const excelRows = filteredMembers.map((m) => {
        const row = {
          "Member Name": m.memberName,
          [priorLabel]: m.priorMonthsPendingAmount > 0 ? Number(m.priorMonthsPendingAmount) : "",
        };
        if (hasPrevColumn) {
          row[prevLabel] = m.previousMonthPendingAmount > 0 ? Number(m.previousMonthPendingAmount) : "";
        }
        row[currentLabel] = m.currentMonthPendingAmount > 0 ? Number(m.currentMonthPendingAmount) : "";
        row["TOTAL"] = Number(m.totalPendingAmount || 0);
        return row;
      });

      // Append Total row at bottom
      const totalRow = {
        "Member Name": "TOTAL",
        [priorLabel]: displayedTotals.prior > 0 ? displayedTotals.prior : "",
      };
      if (hasPrevColumn) {
        totalRow[prevLabel] = displayedTotals.previous > 0 ? displayedTotals.previous : "";
      }
      totalRow[currentLabel] = displayedTotals.current > 0 ? displayedTotals.current : "";
      totalRow["TOTAL"] = displayedTotals.total;
      excelRows.push(totalRow);

      const sanitizedTitle = reportTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const fileName = `${sanitizedTitle}-${appliedFilters.year}-${String(appliedFilters.month).padStart(2, "0")}.xlsx`;

      exportSheets(fileName, [
        { name: reportTitle.substring(0, 31), data: excelRows },
      ]);
      toast.success("Pending dues report exported successfully!");
    } catch {
      toast.error("Failed to export Excel report.");
    }
  };

  // Export to PDF / Printout matching AppDataTable format
  const handleExportPdf = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast.warning("No records found to export.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=750");
    if (!printWindow) {
      window.print();
      return;
    }

    const generatedDate = new Date().toLocaleString();
    const rowsHtml = filteredMembers
      .map(
        (m, idx) => `
      <tr class="${idx % 2 === 0 ? "even" : "odd"}">
        <td><strong>${m.memberName}</strong>${m.department ? `<br/><span style="color:#64748b;font-size:10px;">${m.department}</span>` : ""}</td>
        <td style="text-align:right;">${m.priorMonthsPendingAmount > 0 ? "₹" + Number(m.priorMonthsPendingAmount).toLocaleString("en-IN") : "—"}</td>
        ${hasPrevColumn ? `<td style="text-align:right;">${m.previousMonthPendingAmount > 0 ? "₹" + Number(m.previousMonthPendingAmount).toLocaleString("en-IN") : "—"}</td>` : ""}
        <td style="text-align:right;">${m.currentMonthPendingAmount > 0 ? "₹" + Number(m.currentMonthPendingAmount).toLocaleString("en-IN") : "—"}</td>
        <td style="text-align:right;font-weight:700;color:#e11d48;">₹${Number(m.totalPendingAmount || 0).toLocaleString("en-IN")}</td>
      </tr>`
      )
      .join("");

    const totalsHtml = `
      <tr style="background:#f1f5f9;font-weight:800;border-top:2px solid #4a3f6b;">
        <td><strong>TOTAL</strong></td>
        <td style="text-align:right;">${displayedTotals.prior > 0 ? "₹" + Number(displayedTotals.prior).toLocaleString("en-IN") : "—"}</td>
        ${hasPrevColumn ? `<td style="text-align:right;">${displayedTotals.previous > 0 ? "₹" + Number(displayedTotals.previous).toLocaleString("en-IN") : "—"}</td>` : ""}
        <td style="text-align:right;">${displayedTotals.current > 0 ? "₹" + Number(displayedTotals.current).toLocaleString("en-IN") : "—"}</td>
        <td style="text-align:right;color:#e11d48;font-size:12px;">₹${Number(displayedTotals.total).toLocaleString("en-IN")}</td>
      </tr>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - Team Contribution Management</title>
          <meta charset="utf-8" />
          <style>
            @page { size: landscape; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1e1a2e; margin: 0; padding: 24px; background: #ffffff;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .header {
              display: flex; justify-content: space-between; align-items: flex-end;
              border-bottom: 2px solid #4a3f6b; padding-bottom: 12px; margin-bottom: 16px;
            }
            .header-left h1 { margin: 0; font-size: 22px; color: #4a3f6b; font-weight: 800; }
            .header-left p { margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-weight: 500; }
            .header-right { text-align: right; font-size: 12px; color: #4b5563; line-height: 1.5; }
            .header-right strong { color: #1e1a2e; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; margin-bottom: 20px; }
            th {
              background-color: #4a3f6b !important; color: #ffffff !important;
              font-weight: 700; text-align: left; padding: 9px 10px; border: 1px solid #4a3f6b;
              letter-spacing: 0.03em; font-size: 10px;
            }
            td { padding: 8px 10px; border: 1px solid #e5e7eb; color: #374151; font-size: 11px; }
            tr.even { background-color: #ffffff; }
            tr.odd { background-color: #f8fafc; }
            .footer {
              margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px;
              font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;
            }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>${reportTitle}</h1>
              <p>Team Contribution Management System • ${appliedFilters.year} • Total Due: ${formatWholeCurrency(displayedTotals.total)}</p>
            </div>
            <div class="header-right">
              <div>Printed On: <strong>${generatedDate}</strong></div>
              <div>Members with Dues: <strong>${filteredMembers.length}</strong></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th style="text-align:right;">${priorLabel}</th>
                ${hasPrevColumn ? `<th style="text-align:right;">${prevLabel}</th>` : ""}
                <th style="text-align:right;">${currentLabel}</th>
                <th style="text-align:right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${totalsHtml}
            </tbody>
          </table>
          <div class="footer">
            <span>Confidential — Internal Company Record</span>
            <span>Printed from Contribution Management System</span>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const isExportAllowed = canExport && filteredMembers.length > 0;
  const exportIconBtnSx = {
    p: 0.4,
    color: isExportAllowed
      ? (theme.palette.mode === "dark" ? "#94a3b8" : "#64748b")
      : (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
    "&:hover": {
      color: isExportAllowed
        ? (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")
        : (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
    },
  };


  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* ── Top Header: Title, Count, Total Due & Export ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              letterSpacing: "-0.01em",
              color: "text.primary",
              fontSize: "1.08rem",
            }}
          >
            {reportTitle}
          </Typography>

          <Chip
            size="small"
            label={`${filteredMembers.length} Members`}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.08)",
              color: isDark ? "#c4b5fd" : "#4a3f6b",
              height: 24,
            }}
          />

          {displayedTotals.total > 0 && (
            <Chip
              size="small"
              icon={<HourglassEmptyIcon sx={{ fontSize: "14px !important", color: "error.main" }} />}
              label={`Total Due: ${formatWholeCurrency(displayedTotals.total)}`}
              sx={{
                fontWeight: 800,
                fontSize: "0.75rem",
                bgcolor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
                color: "error.main",
                border: (theme) =>
                  `1px solid ${isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"}`,
                height: 24,
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}
        </Box>

        {/* Export Button */}
        {canExport && (
          <AppButton
            size="small"
            variant="contained"
            startIcon={<FileDownloadIcon sx={{ fontSize: 17 }} />}
            onClick={handleExportExcel}
            sx={{
              height: 34,
              minHeight: 34,
              fontSize: "0.78rem",
              fontWeight: 700,
              px: 2,
              borderRadius: "8px",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important",
              },
            }}
          >
            Export Excel
          </AppButton>
        )}
      </Box>

      {/* ── Filter Controls Row: Unified & Clearly Formatted ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 1.5,
          p: 2,
          borderRadius: "12px",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* 1. Year Selector (FIRST) */}
        <Box sx={{ width: { xs: "100%", sm: 105, md: 110 } }}>
          <AppSelect
            label="Year"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedEvent("ALL");
            }}
            options={yearOptions}
            size="small"
            clearable={false}
            allowClear={false}
          />
        </Box>

        {/* 2. Month Selector (SECOND) */}
        <Box sx={{ width: { xs: "100%", sm: 115, md: 125 } }}>
          <AppSelect
            label="Current Month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setSelectedEvent("ALL");
            }}
            options={monthOptions}
            size="small"
            clearable={false}
            allowClear={false}
          />
        </Box>

        {/* 3. Event Type Filter (THIRD) */}
        <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
          <AppSelect
            label="Event Type"
            value={selectedEventType}
            onChange={(e) => {
              setSelectedEventType(e.target.value);
              setSelectedEvent("ALL");
            }}
            options={eventTypeOptions}
            size="small"
          />
        </Box>

        {/* 4. Event Name Filter (FOURTH) */}
        <Box sx={{ width: { xs: "100%", sm: 160, md: 175 } }}>
          <AppSelect
            label="Event Name"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            options={eventOptions}
            size="small"
          />
        </Box>

        {/* 5. Status Filter (FIFTH) */}
        <Box sx={{ width: { xs: "100%", sm: 155, md: 165 } }}>
          <AppSelect
            label="Member Status"
            value={onlyWithDues ? "dues" : "all"}
            onChange={(e) => setOnlyWithDues(e.target.value === "dues")}
            options={[
              { label: "Pending Dues Only", value: "dues" },
              { label: "All Members", value: "all" },
            ]}
            size="small"
            clearable={false}
            allowClear={false}
          />
        </Box>

        {/* 6. Search Member Input (SIXTH) */}
        <Box sx={{ width: { xs: "100%", sm: 180, md: 200 } }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 0.5,
              fontWeight: 600,
              color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b"),
              textTransform: "none",
              letterSpacing: "0.01em",
              fontSize: "0.78125rem",
            }}
          >
            Search Member
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm("")}>
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                height: 34,
                fontSize: "0.82rem",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "background.paper" : "background.paper",
                "& fieldset": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(231, 235, 247, 0.25)"
                      : "rgba(74, 63, 107, 0.28)",
                  borderWidth: "1.5px",
                },
                "&:hover fieldset": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(157, 140, 230, 0.75)"
                      : "#6f5bd3",
                  borderWidth: "1.5px",
                },
                "&.Mui-focused fieldset": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "#9d8ce6" : "#6f5bd3",
                  borderWidth: "2px",
                },
              },
            }}
          />
        </Box>

        {/* 7. Action Buttons: Filter & Clear */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            ml: { md: "auto" },
            width: { xs: "100%", md: "auto" },
            justifyContent: { xs: "flex-end", md: "flex-end" },
            height: 34,
          }}
        >
          <AppButton
            size="small"
            variant="contained"
            startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
            onClick={handleApplyFilter}
            sx={{
              height: 34,
              minHeight: 34,
              fontWeight: 700,
              fontSize: "0.78rem",
              px: 2,
              borderRadius: "8px",
              whiteSpace: "nowrap",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#6d5ca0 !important" : "#4a3f6b !important",
              border: (theme) =>
                theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "#7d6bb3 !important" : "#3b325c !important",
              },
            }}
          >
            Filter
          </AppButton>

          <AppClearFilterButton
            filters={{
              year: selectedYear,
              month: selectedMonth,
              eventType: selectedEventType,
              event: selectedEvent,
              search: searchTerm,
            }}
            defaultValues={{
              year: currentYear,
              month: 0,
              eventType: "ALL",
              event: "ALL",
              search: "",
            }}
            onClick={handleClearFilter}
          />
        </Box>
      </Box>

      {/* ── Table Section ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "12px",
          border: (t) => `1px solid ${t.palette.divider}`,
          overflow: "hidden",
        }}
      >
        {/* Export Toolbar matching AppDataTable */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.25,
            px: 2,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "#ffffff",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(74, 63, 107, 0.75)",
                fontSize: "0.75rem",
                mr: 0.5,
              }}
            >
              Export :
            </Typography>
            <Tooltip title={isExportAllowed ? "Export Excel (.xlsx)" : "Record not found"}>
              <span>
                <IconButton
                  size="small"
                  disabled={!isExportAllowed}
                  onClick={handleExportExcel}
                  sx={exportIconBtnSx}
                >
                  <ExcelIcon sx={{ fontSize: "1.1rem" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isExportAllowed ? "Save PDF / Printout" : "Record not found"}>
              <span>
                <IconButton
                  size="small"
                  disabled={!isExportAllowed}
                  onClick={handleExportPdf}
                  sx={exportIconBtnSx}
                >
                  <PdfIcon sx={{ fontSize: "1.1rem" }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <CircularProgress size={36} color="primary" />
            <Typography variant="body2" color="text.secondary">
              Generating pending dues report...
            </Typography>
          </Box>
        ) : filteredMembers.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
                bgcolor: (t) =>
                  searchTerm.trim()
                    ? t.palette.mode === "dark"
                      ? "rgba(148, 163, 184, 0.12)"
                      : "rgba(100, 116, 139, 0.08)"
                    : t.palette.mode === "dark"
                    ? "rgba(16, 185, 129, 0.14)"
                    : "rgba(16, 185, 129, 0.08)",
                border: (t) =>
                  `1.5px solid ${
                    searchTerm.trim()
                      ? t.palette.mode === "dark"
                        ? "rgba(148, 163, 184, 0.25)"
                        : "rgba(100, 116, 139, 0.2)"
                      : t.palette.mode === "dark"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(16, 185, 129, 0.22)"
                  }`,
                color: searchTerm.trim() ? "text.secondary" : "#10b981",
              }}
            >
              {searchTerm.trim() ? (
                <SearchOffIcon sx={{ fontSize: 26 }} />
              ) : (
                <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />
              )}
            </Box>
            <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ fontSize: "1.05rem" }}>
              {searchTerm.trim() ? "No Matching Members" : "No Pending Dues Found"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: "auto", mt: 0.5 }}>
              {onlyWithDues ? (
                appliedFilters.month > 0 ? (
                  <>
                    No members have pending contribution dues for{" "}
                    <strong>
                      {monthOptions.find((m) => m.value === appliedFilters.month)?.label || "the selected month"}{" "}
                      {appliedFilters.year}
                    </strong>
                    . No events or contributions occurred in this month.
                  </>
                ) : (
                  "All active members have fully settled their contribution dues."
                )
              ) : (
                "No members match your current filter search."
              )}
            </Typography>
            {onlyWithDues && appliedFilters.month > 0 && (
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSelectedMonth(0);
                    setAppliedFilters((prev) => ({ ...prev, month: 0 }));
                  }}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                >
                  View All Months (Overall Pending Dues)
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 680 }}>
            <Table stickyHeader sx={{ minWidth: 650 }}>
                {/* ── Table Header matching Image 2 ── */}
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        bgcolor: (t) => (t.palette.mode === "dark" ? "#1e1e2d" : "#f1f5f9"),
                        color: "text.primary",
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        minWidth: 220,
                      }}
                    >
                      Member Name
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        bgcolor: (t) => (t.palette.mode === "dark" ? "#1e1e2d" : "#f1f5f9"),
                        color: "text.primary",
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        minWidth: 135,
                      }}
                    >
                      {priorLabel}
                    </TableCell>

                    {hasPrevColumn && (
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          bgcolor: (t) => (t.palette.mode === "dark" ? "#1e1e2d" : "#f1f5f9"),
                          color: "text.primary",
                          borderRight: (t) => `1px solid ${t.palette.divider}`,
                          minWidth: 100,
                        }}
                      >
                        {prevLabel}
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        bgcolor: (t) => (t.palette.mode === "dark" ? "#1e1e2d" : "#f1f5f9"),
                        color: "text.primary",
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        minWidth: 100,
                      }}
                    >
                      {currentLabel}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 900,
                        fontSize: "0.88rem",
                        bgcolor: (t) => (t.palette.mode === "dark" ? "#26263b" : "#e2e8f0"),
                        color: "error.main",
                        minWidth: 110,
                      }}
                    >
                      TOTAL
                    </TableCell>
                  </TableRow>
                </TableHead>

                {/* ── Table Body matching Image 2 ── */}
                <TableBody>
                  {filteredMembers.map((m, idx) => {
                    const isTotalNonZero = Number(m.totalPendingAmount || 0) > 0;
                    return (
                      <TableRow
                        key={m.memberId || idx}
                        hover
                        onClick={() => setSelectedMemberModal(m)}
                        sx={{
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          "&:nth-of-type(even)": {
                            bgcolor: isDark ? "rgba(255,255,255,0.015)" : "#fafafa",
                          },
                        }}
                      >
                        {/* Member Name */}
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            py: 1.2,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                bgcolor: isDark ? "rgba(124, 58, 237, 0.25)" : "rgba(124, 58, 237, 0.12)",
                                color: "#7c3aed",
                              }}
                            >
                              {m.memberName?.charAt(0)?.toUpperCase() || "M"}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: "0.85rem" }}>
                                {m.memberName}
                              </Typography>
                              {m.department && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", lineHeight: 1 }}>
                                  {m.department}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Prior Months Dues (Blank if 0, matching Image 2) */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            py: 1.2,
                            color: m.priorMonthsPendingAmount > 0 ? "text.primary" : "text.disabled",
                          }}
                        >
                          {m.priorMonthsPendingAmount > 0 ? formatWholeCurrency(m.priorMonthsPendingAmount) : ""}
                        </TableCell>

                        {/* Previous Month Dues (Blank if 0, matching Image 2) */}
                        {hasPrevColumn && (
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              borderRight: (t) => `1px solid ${t.palette.divider}`,
                              py: 1.2,
                              color: m.previousMonthPendingAmount > 0 ? "text.primary" : "text.disabled",
                            }}
                          >
                            {m.previousMonthPendingAmount > 0 ? formatWholeCurrency(m.previousMonthPendingAmount) : ""}
                          </TableCell>
                        )}

                        {/* Current Month Dues (Blank if 0, matching Image 2) */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            py: 1.2,
                            color: m.currentMonthPendingAmount > 0 ? "text.primary" : "text.disabled",
                          }}
                        >
                          {m.currentMonthPendingAmount > 0 ? formatWholeCurrency(m.currentMonthPendingAmount) : ""}
                        </TableCell>

                        {/* TOTAL (Bold, matching Image 2) */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.88rem",
                            py: 1.2,
                            color: isTotalNonZero ? "error.main" : "text.secondary",
                            bgcolor: isDark ? "rgba(239, 68, 68, 0.04)" : "rgba(239, 68, 68, 0.02)",
                          }}
                        >
                          {formatWholeCurrency(m.totalPendingAmount || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                {/* ── Table Footer Summary Totals Row ── */}
                <TableFooter sx={{ position: "sticky", bottom: 0, zIndex: 2 }}>
                  <TableRow
                    sx={{
                      bgcolor: (t) => (t.palette.mode === "dark" ? "#1e1e2d" : "#e2e8f0"),
                      borderTop: (t) => `2px solid ${t.palette.divider}`,
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        color: "text.primary",
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        py: 1.5,
                      }}
                    >
                      TOTAL
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.88rem",
                        color: "text.primary",
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        py: 1.5,
                      }}
                    >
                      {displayedTotals.prior > 0 ? formatWholeCurrency(displayedTotals.prior) : "—"}
                    </TableCell>

                    {hasPrevColumn && (
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.88rem",
                          color: "text.primary",
                          borderRight: (t) => `1px solid ${t.palette.divider}`,
                          py: 1.5,
                        }}
                      >
                        {displayedTotals.previous > 0 ? formatWholeCurrency(displayedTotals.previous) : "—"}
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.88rem",
                        color: "text.primary",
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        py: 1.5,
                      }}
                    >
                      {displayedTotals.current > 0 ? formatWholeCurrency(displayedTotals.current) : "—"}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 900,
                        fontSize: "0.92rem",
                        color: "error.main",
                        bgcolor: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
                        py: 1.5,
                      }}
                    >
                      {formatWholeCurrency(displayedTotals.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          )}
      </Paper>

      {/* ── Member Detailed Breakdown Modal ── */}
      <Dialog
        open={Boolean(selectedMemberModal)}
        onClose={() => setSelectedMemberModal(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            border: (t) => `1px solid ${t.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontWeight={800}>
              Pending Dues Breakdown
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedMemberModal(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          {selectedMemberModal && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Member Summary Header */}
              <Box
                sx={{
                  p: 1.8,
                  borderRadius: "12px",
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc"),
                  border: (t) => `1px solid ${t.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {selectedMemberModal.memberName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedMemberModal.email || selectedMemberModal.department || "Active Member"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    Total Pending
                  </Typography>
                  <Typography variant="h6" fontWeight={900} color="error.main">
                    {formatWholeCurrency(selectedMemberModal.totalPendingAmount)}
                  </Typography>
                </Box>
              </Box>

              {/* Bucket Breakdown */}
              <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ mt: 0.5 }}>
                PERIOD BREAKDOWN
              </Typography>

              <Stack spacing={1}>
                {/* Prior Months */}
                <Box sx={{ display: "flex", justifyContent: "space-between", p: 1.2, borderRadius: "8px", bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedMemberModal.priorMonthsLabel || "Previous Arrear"}
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color={selectedMemberModal.priorMonthsPendingAmount > 0 ? "error.main" : "text.secondary"}>
                    {formatWholeCurrency(selectedMemberModal.priorMonthsPendingAmount)}
                  </Typography>
                </Box>

                {/* Previous Month */}
                {selectedMemberModal.previousMonthLabel && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", p: 1.2, borderRadius: "8px", bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedMemberModal.previousMonthLabel}
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color={selectedMemberModal.previousMonthPendingAmount > 0 ? "error.main" : "text.secondary"}>
                      {formatWholeCurrency(selectedMemberModal.previousMonthPendingAmount)}
                    </Typography>
                  </Box>
                )}

                {/* Current Month */}
                <Box sx={{ display: "flex", justifyContent: "space-between", p: 1.2, borderRadius: "8px", bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedMemberModal.currentMonthLabel || "Current Month"}
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color={selectedMemberModal.currentMonthPendingAmount > 0 ? "error.main" : "text.secondary"}>
                    {formatWholeCurrency(selectedMemberModal.currentMonthPendingAmount)}
                  </Typography>
                </Box>
              </Stack>

              {/* Monthly Details List if available */}
              {selectedMemberModal.monthlyBreakdown?.length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ mt: 1 }}>
                    MONTHLY EVENT BREAKDOWN
                  </Typography>
                  <Stack spacing={0.8}>
                    {selectedMemberModal.monthlyBreakdown.map((b, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 0.8,
                          px: 1.2,
                          borderBottom: (t) => `1px dashed ${t.palette.divider}`,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CalendarMonthIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body2" fontWeight={600}>
                            {b.monthName} {b.year}
                          </Typography>
                          <Chip size="small" label={`${b.pendingEventsCount} event(s)`} sx={{ height: 20, fontSize: "0.68rem" }} />
                        </Box>
                        <Typography variant="body2" fontWeight={800} color="error.main">
                          {formatWholeCurrency(b.pendingAmount)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedMemberModal(null)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
