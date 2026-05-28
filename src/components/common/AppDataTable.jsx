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
} from "@mui/material";
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
} from "@mui/icons-material";

// ─── CSV Export Helper ──────────────────────────────────────────────────────
function exportToCSV(columns, data, filename = "export.csv") {
  const headers = columns.filter(c => c.key).map(c => c.label);
  const keys = columns.filter(c => c.key).map(c => c.key);
  const rows = data.map(row =>
    keys.map(k => `"${(row[k] ?? "").toString().replace(/"/g, '""')}"`).join(",")
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

    // Sort
    if (orderBy) {
      result.sort((a, b) => {
        const va = a[orderBy] ?? "";
        const vb = b[orderBy] ?? "";
        if (va < vb) return order === "asc" ? -1 : 1;
        if (va > vb) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, orderBy, order]);

  const paginatedData = processedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Re-order columns so Action is always first, then filter by visibility
  const orderedColumns = useMemo(() => {
    const list = [
      ...columns.filter(c => c.label === "Action"),
      ...columns.filter(c => c.label !== "Action"),
    ];
    return list.filter(c => visibleColumns[c.label] !== false);
  }, [columns, visibleColumns]);

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
        border: "1px solid rgba(224, 224, 224, 1)",
        borderRadius: isFullscreen ? "0" : "8px",
        overflow: "hidden",
        bgcolor: "#ffffff",
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
            bgcolor: "#fcfcff",
            px: 3,
            py: 2,
            borderBottom: "1px solid rgba(224, 224, 224, 0.8)",
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
          borderBottom: "1px solid rgba(224, 224, 224, 0.8)",
          bgcolor: "#ffffff",
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
              color: "#475569",
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
              sx={{ p: 0.4, color: "#64748b", "&:hover": { color: "#4a3f6b" } }}
            >
              <ExcelIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save PDF">
            <IconButton
              size="small"
              onClick={handlePrint}
              sx={{ p: 0.4, color: "#64748b", "&:hover": { color: "#4a3f6b" } }}
            >
              <PdfIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print Report">
            <IconButton
              size="small"
              onClick={handlePrint}
              sx={{ p: 0.4, color: "#64748b", "&:hover": { color: "#4a3f6b" } }}
            >
              <PrintIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download CSV">
            <IconButton
              size="small"
              onClick={() => exportToCSV(orderedColumns, processedData, `${title || 'export'}.csv`)}
              sx={{ p: 0.4, color: "#64748b", "&:hover": { color: "#4a3f6b" } }}
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
              color: "#4a3f6b",
              borderColor: "rgba(74, 63, 107, 0.3)",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              height: 32,
              px: 1.5,
              borderRadius: "4px",
              "&:hover": {
                borderColor: "#4a3f6b",
                bgcolor: "rgba(74, 63, 107, 0.04)",
              },
            }}
          >
            Columns
          </Button>

          <Tooltip title={isFullscreen ? "Exit Full Screen" : "Full Screen"}>
            <IconButton
              size="small"
              sx={{
                color: "#4a3f6b",
                p: 0.6,
                border: "1px solid rgba(74, 63, 107, 0.2)",
                borderRadius: "4px",
                height: 32,
                width: 32,
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
                bgcolor: "#ffffff",
                "& fieldset": { borderColor: "rgba(74, 63, 107, 0.2)" },
                "&:hover fieldset": { borderColor: "rgba(74, 63, 107, 0.4)" },
                "&.Mui-focused fieldset": { borderColor: "#4a3f6b" },
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
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, fontSize: "0.8rem", color: "#4a3f6b" }}>
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

      {/* ── 3. Table ──────────────────────────────────────────────────────── */}
      <Box sx={{ overflowX: "auto", flexGrow: isFullscreen ? 1 : 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress size={30} sx={{ color: "#4a3f6b" }} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#eef4f8" }}>
                {orderedColumns.map((column, index) => (
                  <TableCell
                    key={index}
                    align={column.align || "left"}
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      color: "#1e293b",
                      py: 1,
                      px: 2,
                      borderRight: "1px solid rgba(224, 224, 224, 0.8)",
                      borderBottom: "1px solid rgba(224, 224, 224, 1)",
                      "&:last-child": { borderRight: "none" },
                      whiteSpace: "nowrap",
                      ...column.sx,
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
                        onClick={handleColumnsClick}
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
                      bgcolor: rowIndex % 2 === 1 ? "#fafafa" : "#ffffff",
                      "&:hover": { bgcolor: "#f5f7fa" },
                      "& td": {
                        borderRight: "1px solid rgba(224, 224, 224, 0.8)",
                        borderBottom: "1px solid rgba(224, 224, 224, 0.8)",
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
                          color: "#334155",
                          ...column.cellSx,
                        }}
                      >
                        {column.render ? (
                          column.render(row)
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "inherit", color: "inherit" }}
                          >
                            {row[column.key] ?? "--"}
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
          borderTop: "1px solid rgba(224, 224, 224, 1)",
          bgcolor: "#ffffff",
          flexWrap: "wrap",
          gap: 2
        }}
      >
        {/* Left Pagination metrics */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b", fontSize: "0.75rem" }}>
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
                color: "#1e293b",
                "& .MuiSelect-select": { py: 0.5, px: 1 },
                "& fieldset": { borderColor: "rgba(0,0,0,0.1)" },
              }}
            >
              {[5, 10, 15, 25, 50].map((val) => (
                <MenuItem key={val} value={val} sx={{ fontSize: "0.75rem" }}>
                  {val}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b", fontSize: "0.75rem" }}>
            Rows {totalRows} • Page {page + 1} of {totalPages}
          </Typography>
        </Stack>

        {/* Right Pagination buttons */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            size="small"
            disabled={page === 0}
            onClick={() => setPage(0)}
            sx={{ border: "1px solid rgba(224, 224, 224, 0.8)", borderRadius: "4px", p: 0.5 }}
          >
            <FirstPageIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
          <Button
            size="small"
            disabled={page === 0}
            onClick={() => setPage(prev => prev - 1)}
            sx={{
              border: "1px solid rgba(224, 224, 224, 0.8)",
              borderRadius: "4px",
              color: "#334155",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "none",
              px: 1.5,
              minWidth: "unset",
              height: 28,
              "&:disabled": { color: "#cbd5e1" }
            }}
          >
            Prev
          </Button>
          <Typography variant="caption" sx={{ mx: 1.5, fontWeight: 700, fontSize: "0.75rem", color: "#1e293b" }}>
            {page + 1} / {totalPages}
          </Typography>
          <Button
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(prev => prev + 1)}
            sx={{
              border: "1px solid rgba(224, 224, 224, 0.8)",
              borderRadius: "4px",
              color: "#334155",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "none",
              px: 1.5,
              minWidth: "unset",
              height: 28,
              "&:disabled": { color: "#cbd5e1" }
            }}
          >
            Next
          </Button>
          <IconButton
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
            sx={{ border: "1px solid rgba(224, 224, 224, 0.8)", borderRadius: "4px", p: 0.5 }}
          >
            <LastPageIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  );
}
