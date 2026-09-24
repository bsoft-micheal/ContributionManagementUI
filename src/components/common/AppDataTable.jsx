import React, { useState, useMemo } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
  Collapse,
  Button,
  Popover,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  TableSortLabel,
  Menu,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ViewColumn as ColumnsIcon,
  Download as DownloadIcon,
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
  Clear as ClearIcon,
  FilterAlt as FilterIcon,
  PushPin as PinIcon,
  VisibilityOff as HideIcon,
  Visibility as ShowIcon,
  Sort as SortIcon,
} from "@mui/icons-material";
import { formatGridDate, formatGridDateTime } from "../../utils/dateHelper";

// ─── CSV Export Helper ──────────────────────────────────────────────────────
function exportToCSV(columns, data, filename = "export.csv") {
  const headers = columns.filter(c => c.key).map(c => c.label);
  const keys = columns.filter(c => c.key).map(c => c.key);
  const rows = data.map(row =>
    keys.map(k => {
      let val = row[k];
      if (val === undefined && typeof k === "string" && k.length > 0) {
        val = row[k[0].toUpperCase() + k.slice(1)] ?? row[k[0].toLowerCase() + k.slice(1)];
      }
      return `"${(val ?? "").toString().replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handlePrint() {
  window.print();
}

export default function AppDataTable({
  title,
  columns,
  data = [],
  loading,
  actions,
  filterPanel,
}) {
  const theme = useTheme();
  const surface = theme.palette.background.paper;
  const surfaceAlt = theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.95)";
  const borderColor = theme.palette.divider;
  const primaryMain = theme.palette.primary.main;
  const textSecondary = theme.palette.text.secondary;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const [search, setSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    return columns.reduce((acc, col) => {
      acc[col.label] = true;
      return acc;
    }, {});
  });

  // Columns Popover Anchor
  const [anchorEl, setAnchorEl] = useState(null);
  const handleColumnsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleColumnsClose = () => {
    setAnchorEl(null);
  };
  const openPopover = Boolean(anchorEl);

  // Column Action Menu States
  const [columnMenuAnchorEl, setColumnMenuAnchorEl] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [pinnedColumns, setPinnedColumns] = useState({});

  const handleColumnMenuClick = (event, column) => {
    event.stopPropagation(); // Stop sorting toggle when clicking the menu icon
    setColumnMenuAnchorEl(event.currentTarget);
    setActiveColumn(column);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchorEl(null);
    setActiveColumn(null);
  };

  const isColumnMenuOpen = Boolean(columnMenuAnchorEl);

  // ── Sorting ───────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (!key) return;
    setOrder(orderBy === key && order === "asc" ? "desc" : "asc");
    setOrderBy(key);
    setPage(0);
  };

  // ── Search + Sort + Paginate ──────────────────────────────────────────────
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Deep search across all row values
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          
          val != null && val.toString().toLowerCase().includes(q)
        )
      );
    }

    // 2. Column-specific filters
    Object.keys(columnFilters).forEach(key => {
      const filterVal = columnFilters[key];
      if (filterVal && filterVal.trim()) {
        const q = filterVal.toLowerCase();
        result = result.filter(row => {
          const val = row[key];
          return val != null && val.toString().toLowerCase().includes(q);
        });
      }
    });

    // 3. Sort
    if (orderBy) {
      result.sort((a, b) => {
        let va = a[orderBy];
        if (va === undefined && typeof orderBy === "string" && orderBy.length > 0) {
          va = a[orderBy[0].toUpperCase() + orderBy.slice(1)] ?? a[orderBy[0].toLowerCase() + orderBy.slice(1)];
        }
        let vb = b[orderBy];
        if (vb === undefined && typeof orderBy === "string" && orderBy.length > 0) {
          vb = b[orderBy[0].toUpperCase() + orderBy.slice(1)] ?? b[orderBy[0].toLowerCase() + orderBy.slice(1)];
        }
        va = va ?? "";
        vb = vb ?? "";
        
        // Handle sorting of numeric strings or normal comparison
        const numA = Number(va);
        const numB = Number(vb);
        if (!isNaN(numA) && !isNaN(numB)) {
          return order === "asc" ? numA - numB : numB - numA;
        }

        if (va < vb) return order === "asc" ? -1 : 1;
        if (va > vb) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, columnFilters, orderBy, order]);

  const paginatedData = processedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Re-order columns so pinned left are first, then normal (Action first), then pinned right, then filter by visibility
  const orderedColumns = useMemo(() => {
    const visible = columns.filter(c => visibleColumns[c.label] !== false);

    const leftPinned = [];
    const unpinned = [];
    const rightPinned = [];

    visible.forEach(col => {
      const pin = pinnedColumns[col.label];
      if (pin === "left") {
        leftPinned.push(col);
      } else if (pin === "right") {
        rightPinned.push(col);
      } else {
        unpinned.push(col);
      }
    });

    // Sort unpinned: keep 'Action' first
    const sortedUnpinned = [
      ...unpinned.filter(c => c.label === "Action"),
      ...unpinned.filter(c => c.label !== "Action"),
    ];

    return [...leftPinned, ...sortedUnpinned, ...rightPinned];
  }, [columns, visibleColumns, pinnedColumns]);

  // Compute left offsets for left-pinned columns
  const columnLeftOffsets = useMemo(() => {
    const offsets = {};
    let currentOffset = 0;
    const leftPinned = orderedColumns.filter(c => pinnedColumns[c.label] === "left");
    leftPinned.forEach(col => {
      offsets[col.label] = currentOffset;
      const width = col.sx?.width || 120;
      currentOffset += typeof width === "number" ? width : parseInt(width) || 120;
    });
    return offsets;
  }, [orderedColumns, pinnedColumns]);

  // Compute right offsets for right-pinned columns
  const columnRightOffsets = useMemo(() => {
    const offsets = {};
    let currentOffset = 0;
    const rightPinned = [...orderedColumns].reverse().filter(c => pinnedColumns[c.label] === "right");
    rightPinned.forEach(col => {
      offsets[col.label] = currentOffset;
      const width = col.sx?.width || 120;
      currentOffset += typeof width === "number" ? width : parseInt(width) || 120;
    });
    return offsets;
  }, [orderedColumns, pinnedColumns]);

  const getPinStyles = (column, isHeader = false) => {
    const pin = pinnedColumns[column.label];
    if (!pin) return {};

    const isLeft = pin === "left";
    const offset = isLeft ? columnLeftOffsets[column.label] : columnRightOffsets[column.label];
    const width = column.sx?.width || 120;

    return {
      position: "sticky",
      [isLeft ? "left" : "right"]: offset,
      zIndex: isHeader ? 3 : 2,
      width: width,
      minWidth: width,
      boxShadow: isLeft 
        ? "2px 0 5px -2px rgba(0,0,0,0.12)" 
        : "-2px 0 5px -2px rgba(0,0,0,0.12)",
      bgcolor: isHeader
        ? (theme.palette.mode === "dark" ? "#1d2338" : "#eef4f8")
        : (theme.palette.mode === "dark" ? "#1e293b" : "#ffffff"),
    };
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Pagination metrics
  const totalRows = processedData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const startRow = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalRows);

  return (
    <Paper
      elevation={isFullscreen ? 5 : 0}
      sx={{
        border: theme.palette.mode === "dark" ? `1px solid ${borderColor}` : "1px solid rgba(224, 224, 224, 1)",
        borderRadius: isFullscreen ? "0" : "8px",
        overflow: "hidden",
        bgcolor: surface,
        display: "flex",
        flexDirection: "column",
        ...(isFullscreen && {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1400,
        })
      }}
    >
      {/* ── 1. Top Header Bar (Store Dispatch / Member Directory layout) ──── */}
      <Box
        sx={{
          background: "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
          color: "#ffffff",
          px: 3,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 46,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ fontSize: "0.95rem", letterSpacing: "0.02em" }}
        >
          {title}
        </Typography>

        {actions && (
          <Box
            sx={{
              "& .MuiButton-root": {
                bgcolor: "#2a1b4d !important", // Deep indigo/purple button to match theme
                color: "#ffffff !important",
                borderRadius: "4px !important",
                fontSize: "0.75rem !important",
                fontWeight: 700,
                py: "5px !important",
                px: "14px !important",
                minWidth: "unset",
                textTransform: "none",
                boxShadow: "none !important",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                "&:hover": { bgcolor: "#1a1033 !important" },
              },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* ── 2. Filter Panel ─────────────────────────────────────────────── */}
      {filterPanel && (
        <Box
          sx={{
            bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#fcfcff",
            px: 3,
            py: 2,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          {filterPanel}
        </Box>
      )}

      {/* ── 2. Toolbar: Export (Left) | Columns & Search (Right) ──────────── */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${borderColor}`,
          bgcolor: surface,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* Left: Export Toolbar */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: textSecondary,
              fontSize: "0.75rem",
              mr: 0.5
            }}
          >
            Export :
          </Typography>
          <Tooltip title="Export Excel">
            <IconButton
              size="small"
              onClick={() => exportToCSV(orderedColumns, processedData, `${title || 'export'}.csv`)}
              sx={{ p: 0.4, color: theme.palette.mode === "dark" ? "#94a3b8" : "#64748b", "&:hover": { color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" } }}
            >
              <ExcelIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save PDF">
            <IconButton
              size="small"
              onClick={handlePrint}
              sx={{ p: 0.4, color: theme.palette.mode === "dark" ? "#94a3b8" : "#64748b", "&:hover": { color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" } }}
            >
              <PdfIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print Report">
            <IconButton
              size="small"
              onClick={handlePrint}
              sx={{ p: 0.4, color: theme.palette.mode === "dark" ? "#94a3b8" : "#64748b", "&:hover": { color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" } }}
            >
              <PrintIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download CSV">
            <IconButton
              size="small"
              onClick={() => exportToCSV(orderedColumns, processedData, `${title || 'export'}.csv`)}
              sx={{ p: 0.4, color: theme.palette.mode === "dark" ? "#94a3b8" : "#64748b", "&:hover": { color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" } }}
            >
              <DownloadIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Right: Columns Button, Fullscreen & Search */}
        <Stack direction="row" alignItems="center" spacing={1.5}>

          <Button
            size="small"
            variant="outlined"
            onClick={handleColumnsClick}
            startIcon={<ColumnsIcon sx={{ fontSize: "1rem" }} />}
            sx={{
              color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(74, 63, 107, 0.3)",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              height: 32,
              px: 1.5,
              borderRadius: "4px",
              "&:hover": {
                borderColor: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.04)",
              },
            }}
          >
            Columns
          </Button>

          <Tooltip title={isFullscreen ? "Exit Full Screen" : "Full Screen"}>
            <IconButton
              size="small"
              sx={{
                color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                p: 0.6,
                border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(74, 63, 107, 0.2)",
                borderRadius: "4px",
                height: 32,
                width: 32,
                "&:hover": {
                  borderColor: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                  bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.04)",
                },
              }}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <FullscreenExitIcon sx={{ fontSize: "1.1rem" }} />
              ) : (
                <FullscreenIcon sx={{ fontSize: "1.1rem" }} />
              )}
            </IconButton>
          </Tooltip>

          <TextField
            size="small"
            placeholder="Search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ fontSize: "1rem", color: "#8b81b3" }} />
                </InputAdornment>
              ),
              sx: {
                height: 32,
                width: { xs: "100%", sm: 200 },
                fontSize: "0.78rem",
                borderRadius: "4px",
                bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
                color: "inherit",
                "& fieldset": { borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(74, 63, 107, 0.2)" },
                "&:hover fieldset": { borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.25)" : "rgba(74, 63, 107, 0.4)" },
                "&.Mui-focused fieldset": { borderColor: theme.palette.mode === "dark" ? theme.palette.primary.main : "#4a3f6b" },
              },
            }}
          />
        </Stack>
      </Box>

      {/* Column Picker Popover */}
      <Popover
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleColumnsClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: { p: 2, maxWidth: 240, maxHeight: 320, overflowY: "auto", borderRadius: "6px" }
        }}
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, fontSize: "0.8rem", color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
          Toggle Columns
        </Typography>
        <Stack spacing={0.5}>
          {columns.map((col, idx) => (
            <FormControlLabel
              key={idx}
              control={
                <Checkbox
                  size="small"
                  checked={visibleColumns[col.label] !== false}
                  onChange={(e) => {
                    setVisibleColumns(prev => ({
                      ...prev,
                      [col.label]: e.target.checked
                    }));
                  }}
                  sx={{ py: 0.3 }}
                />
              }
              label={<Typography variant="body2" sx={{ fontSize: "0.78rem" }}>{col.label}</Typography>}
            />
          ))}
        </Stack>
      </Popover>

      {/* Column Action Menu */}
      <Menu
        anchorEl={columnMenuAnchorEl}
        open={isColumnMenuOpen}
        onClose={handleColumnMenuClose}
        PaperProps={{
          sx: {
            minWidth: 220,
            maxWidth: 280,
            borderRadius: "10px",
            boxShadow: "0px 4px 20px rgba(0,0,0,0.08)",
            border: `1px solid ${borderColor}`,
          }
        }}
      >
        {activeColumn && (
          <Box>
            {/* Header info */}
            <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", fontWeight: 800, color: textSecondary, textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em" }}>
              Column Options: {activeColumn.label}
            </Typography>
            <Divider sx={{ my: 0.5 }} />

            {/* Sorting Actions */}
            {activeColumn.key && (
              <>
                <MenuItem
                  onClick={() => {
                    if (orderBy === activeColumn.key) {
                      setOrderBy("");
                    }
                    handleColumnMenuClose();
                  }}
                  disabled={orderBy !== activeColumn.key}
                  sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
                >
                  <ClearIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: textSecondary }} />
                  Clear sort
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOrderBy(activeColumn.key);
                    setOrder("asc");
                    setPage(0);
                    handleColumnMenuClose();
                  }}
                  sx={{ py: 1, fontSize: "0.78rem", fontWeight: orderBy === activeColumn.key && order === "asc" ? 700 : 500 }}
                >
                  <SortAscIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: primaryMain }} />
                  Sort by {activeColumn.label} ascending
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOrderBy(activeColumn.key);
                    setOrder("desc");
                    setPage(0);
                    handleColumnMenuClose();
                  }}
                  sx={{ py: 1, fontSize: "0.78rem", fontWeight: orderBy === activeColumn.key && order === "desc" ? 700 : 500 }}
                >
                  <SortDescIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: primaryMain }} />
                  Sort by {activeColumn.label} descending
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
              </>
            )}

            {/* Filtering Actions */}
            {activeColumn.key && (
              <>
                <MenuItem
                  onClick={() => {
                    setColumnFilters(prev => ({ ...prev, [activeColumn.key]: "" }));
                    handleColumnMenuClose();
                  }}
                  disabled={!columnFilters[activeColumn.key]}
                  sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
                >
                  <ClearIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: textSecondary }} />
                  Clear filter
                </MenuItem>

                {/* Filter Textbox directly inside menu */}
                <Box sx={{ px: 2, py: 1 }} onClick={(e) => e.stopPropagation()}>
                  <TextField
                    size="small"
                    placeholder={`Filter by ${activeColumn.label}...`}
                    value={columnFilters[activeColumn.key] || ""}
                    onChange={(e) => {
                      setColumnFilters(prev => ({
                        ...prev,
                        [activeColumn.key]: e.target.value
                      }));
                      setPage(0);
                    }}
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterIcon sx={{ fontSize: "1rem", color: textSecondary }} />
                        </InputAdornment>
                      ),
                      sx: {
                        height: 30,
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                      }
                    }}
                    variant="outlined"
                    fullWidth
                  />
                </Box>
                <Divider sx={{ my: 0.5 }} />
              </>
            )}

            {/* Pinning Actions */}
            <MenuItem
              onClick={() => {
                setPinnedColumns(prev => ({ ...prev, [activeColumn.label]: "left" }));
                handleColumnMenuClose();
              }}
              disabled={pinnedColumns[activeColumn.label] === "left"}
              sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
            >
              <PinIcon sx={{ mr: 1.5, fontSize: "1.05rem", transform: "rotate(-45deg)", color: primaryMain }} />
              Pin to left
            </MenuItem>
            <MenuItem
              onClick={() => {
                setPinnedColumns(prev => ({ ...prev, [activeColumn.label]: "right" }));
                handleColumnMenuClose();
              }}
              disabled={pinnedColumns[activeColumn.label] === "right"}
              sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
            >
              <PinIcon sx={{ mr: 1.5, fontSize: "1.05rem", transform: "rotate(45deg)", color: primaryMain }} />
              Pin to right
            </MenuItem>
            <MenuItem
              onClick={() => {
                setPinnedColumns(prev => ({ ...prev, [activeColumn.label]: null }));
                handleColumnMenuClose();
              }}
              disabled={!pinnedColumns[activeColumn.label]}
              sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
            >
              <ClearIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: textSecondary }} />
              Unpin
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />

            {/* Visibility Actions */}
            <MenuItem
              onClick={() => {
                setVisibleColumns(prev => ({ ...prev, [activeColumn.label]: false }));
                handleColumnMenuClose();
              }}
              sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
            >
              <HideIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: textSecondary }} />
              Hide {activeColumn.label} column
            </MenuItem>
            <MenuItem
              onClick={() => {
                setVisibleColumns(
                  columns.reduce((acc, col) => {
                    acc[col.label] = true;
                    return acc;
                  }, {})
                );
                handleColumnMenuClose();
              }}
              sx={{ py: 1, fontSize: "0.78rem", fontWeight: 500 }}
            >
              <ShowIcon sx={{ mr: 1.5, fontSize: "1.05rem", color: primaryMain }} />
              Show all columns
            </MenuItem>
          </Box>
        )}
      </Menu>

      {/* ── 3. Table ──────────────────────────────────────────────────────── */}
      <Box sx={{ overflowX: "auto", flexGrow: isFullscreen ? 1 : 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress size={30} sx={{ color: theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.mode === "dark" ? surfaceAlt : "#eef4f8" }}>
                {orderedColumns.map((column, index) => (
                  <TableCell
                    key={index}
                    align={column.align || "left"}
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      color: theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
                      py: 1,
                      px: 2,
                      borderRight: theme.palette.mode === "dark"
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : "1px solid rgba(224, 224, 224, 0.8)",
                      borderBottom: theme.palette.mode === "dark"
                        ? "1px solid rgba(255, 255, 255, 0.1)"
                        : "1px solid rgba(224, 224, 224, 1)",
                      "&:last-child": { borderRight: "none" },
                      whiteSpace: "nowrap",
                      ...column.sx,
                      ...getPinStyles(column, true),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: column.align === "right" ? "flex-end" : "space-between", width: "100%", gap: 1 }}>
                      {column.key ? (
                        <TableSortLabel
                          active={orderBy === column.key}
                          direction={orderBy === column.key ? order : "asc"}
                          onClick={() => handleSort(column.key)}
                          IconComponent={() => (
                            <Typography variant="caption" sx={{ ml: 0.5, fontSize: "0.85rem", color: "inherit", opacity: 0.7 }}>⇅</Typography>
                          )}
                          sx={{
                            color: "inherit !important",
                            fontWeight: "inherit",
                          }}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        <span>{column.label}</span>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleColumnMenuClick(e, column)}
                        sx={{ p: 0.1, color: "inherit", opacity: 0.5, "&:hover": { opacity: 1 } }}
                      >
                        <Typography variant="caption" sx={{ fontSize: "0.85rem", fontWeight: 700 }}>⋮</Typography>
                      </IconButton>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    hover
                    sx={{
                      bgcolor: rowIndex % 2 === 1
                        ? (theme.palette.mode === "dark" ? "rgba(255,255,255,0.015)" : "#fafafa")
                        : (theme.palette.mode === "dark" ? surface : "#ffffff"),
                      "&:hover": { bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f5f7fa" },
                      "& td": {
                        borderRight: theme.palette.mode === "dark"
                          ? "1px solid rgba(255, 255, 255, 0.08)"
                          : "1px solid rgba(224, 224, 224, 0.8)",
                        borderBottom: theme.palette.mode === "dark"
                          ? "1px solid rgba(255, 255, 255, 0.08)"
                          : "1px solid rgba(224, 224, 224, 0.8)",
                      },
                      "& td:last-child": { borderRight: "none" },
                    }}
                  >
                    {orderedColumns.map((column, colIndex) => (
                      <TableCell
                        key={colIndex}
                        align={column.align || "left"}
                        sx={{
                          py: 0.8,
                          px: 2,
                          fontSize: "0.78rem",
                          color: theme.palette.mode === "dark" ? "#ffffff" : "#334155",
                          ...column.cellSx,
                          ...getPinStyles(column, false),
                        }}
                      >
                        {column.render ? (
                          column.render(row)
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "inherit", color: "inherit" }}
                          >
                            {column.type === "date"
                              ? formatGridDate(row[column.key])
                              : column.type === "datetime"
                              ? formatGridDateTime(row[column.key])
                              : (row[column.key] ?? (typeof column.key === "string" && column.key.length > 0 ? (row[column.key[0].toUpperCase() + column.key.slice(1)] ?? row[column.key[0].toLowerCase() + column.key.slice(1)]) : undefined) ?? "--")}
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={orderedColumns.length}
                    align="center"
                    sx={{ py: 6 }}
                  >
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      No records found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Box>

      {/* ── 4. Custom Footer / Pagination (Mockup matching) ──────────────── */}
      <Box
        sx={{
          px: 3,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${borderColor}`,
          bgcolor: surface,
          flexWrap: "wrap",
          gap: 2
        }}
      >
        {/* Left Pagination metrics */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: textSecondary, fontSize: "0.75rem" }}>
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
                height: 28,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
                "& .MuiSelect-select": { py: 0.5, px: 1 },
                "& fieldset": { borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0,0,0,0.1)" },
              }}
            >
              {[5, 10, 15, 25, 50].map((val) => (
                <MenuItem key={val} value={val} sx={{ fontSize: "0.75rem" }}>
                  {val}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: textSecondary, fontSize: "0.75rem" }}>
            Rows {totalRows} • Page {page + 1} of {totalPages}
          </Typography>
        </Stack>

        {/* Right Pagination buttons */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            size="small"
            disabled={page === 0}
            onClick={() => setPage(0)}
            sx={{
              border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(224, 224, 224, 0.8)",
              borderRadius: "4px",
              p: 0.5,
              color: "inherit"
            }}
          >
            <FirstPageIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
          <Button
            size="small"
            disabled={page === 0}
            onClick={() => setPage(prev => prev - 1)}
            sx={{
              border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(224, 224, 224, 0.8)",
              borderRadius: "4px",
              color: theme.palette.mode === "dark" ? "#ffffff" : "#334155",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "none",
              px: 1.5,
              minWidth: "unset",
              height: 28,
              "&:disabled": { color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1" }
            }}
          >
            Prev
          </Button>
          <Typography variant="caption" sx={{ mx: 1.5, fontWeight: 700, fontSize: "0.75rem", color: theme.palette.mode === "dark" ? "#ffffff" : "#1e293b" }}>
            {page + 1} / {totalPages}
          </Typography>
          <Button
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(prev => prev + 1)}
            sx={{
              border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(224, 224, 224, 0.8)",
              borderRadius: "4px",
              color: theme.palette.mode === "dark" ? "#ffffff" : "#334155",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "none",
              px: 1.5,
              minWidth: "unset",
              height: 28,
              "&:disabled": { color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1" }
            }}
          >
            Next
          </Button>
          <IconButton
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
            sx={{
              border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(224, 224, 224, 0.8)",
              borderRadius: "4px",
              p: 0.5,
              color: "inherit"
            }}
          >
            <LastPageIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  );
}
