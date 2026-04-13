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
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
} from "@mui/material";
import {
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GridView as GridIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material";
import { Collapse } from "@mui/material";

// ─── Theme Tokens (matches sidebar purple) ─────────────────────────────────
const THEME = {
  header: "#4a3f6b",        // Primary Mauve Header
  headerText: "#ffffff",
  toolbarBg: "#ffffff",
  exportIcon: "#5b4e8c",    // Slightly darker purple for icons
  tableHeaderBg: "#f8f7fd", // Very subtle lavender tint
  tableHeaderText: "#4a3f6b",
  rowHover: "#f5f4fb",
  rowAlt: "#fafafa",
  addBtn: "#2a1b4d",        // Darkest purple for primary action
  borderColor: "rgba(74, 63, 107, 0.12)",
  sortActive: "#4a3f6b",
};

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

function handlePrint(title) {
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
  const [showFilters, setShowFilters] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  }, [data, search, orderBy, order, columns]);

  const paginatedData = processedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // ── Re-order columns so Action is always first ────────────────────────────
  const orderedColumns = [
    ...columns.filter(c => c.label === "Action"),
    ...columns.filter(c => c.label !== "Action"),
  ];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Paper
      elevation={isFullscreen ? 5 : 0}
      sx={{
        border: isFullscreen ? "none" : `1px solid ${THEME.borderColor}`,
        borderRadius: isFullscreen ? "0" : "6px",
        overflow: "hidden",
        bgcolor: "#ffffff",
        ...(isFullscreen && {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1400,
          display: "flex",
          flexDirection: "column"
        })
      }}
    >
      {/* ── 1. Header Bar ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: `linear-gradient(90deg, ${THEME.header} 0%, #5d528b 100%)`,
          color: THEME.headerText,
          px: 2,
          py: 0.5,
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ fontSize: "0.85rem", letterSpacing: "0.01em" }}
        >
          {title}
        </Typography>

        {/* Add / Custom Action Button - Restored to Header */}
        {actions && (
          <Box
            sx={{
              "& .MuiButton-root": {
                bgcolor: "#2a1b4d !important", // Dark boxed style
                color: "#ffffff !important",
                borderRadius: "3px !important",
                fontSize: "0.75rem !important",
                fontWeight: 700,
                py: "3px !important",
                px: "14px !important",
                minWidth: "unset",
                textTransform: "none",
                boxShadow: "none !important",
                "&:hover": { bgcolor: "#1a1033 !important" },
              },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* ── 2. Toolbar: Export | Search | View Icons ──────────────────────── */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${THEME.borderColor}`,
          bgcolor: THEME.toolbarBg,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* Left: Export Icons */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: "0.05em" }}>
            Export
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Export CSV">
              <IconButton
                size="small"
                sx={{ p: 0.5, color: THEME.exportIcon, bgcolor: "rgba(74,63,107,0.04)", borderRadius: "4px", "&:hover": { bgcolor: "rgba(74,63,107,0.08)" } }}
                onClick={() => exportToCSV(orderedColumns, processedData, `${title || 'export'}.csv`)}
              >
                <ExcelIcon sx={{ fontSize: "1.1rem" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print Report">
              <IconButton
                size="small"
                sx={{ p: 0.5, color: THEME.exportIcon, bgcolor: "rgba(74,63,107,0.04)", borderRadius: "4px", "&:hover": { bgcolor: "rgba(74,63,107,0.08)" } }}
                onClick={() => handlePrint(title)}
              >
                <PrintIcon sx={{ fontSize: "1.1rem" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save PDF">
              <IconButton
                size="small"
                sx={{ p: 0.5, color: THEME.exportIcon, bgcolor: "rgba(74,63,107,0.04)", borderRadius: "4px", "&:hover": { bgcolor: "rgba(74,63,107,0.08)" } }}
                onClick={() => handlePrint(title)}
              >
                <PdfIcon sx={{ fontSize: "1.1rem" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>

        {/* Right: Search + Quick Tools */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <TextField
            size="small"
            placeholder="Quick search records..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: "1rem", color: "#8b81b3" }} />
                </InputAdornment>
              ),
              sx: {
                height: 34,
                width: { xs: "100%", sm: 240 },
                fontSize: "0.82rem",
                borderRadius: "6px",
                bgcolor: "#fcfcff",
                "& fieldset": { borderColor: "rgba(74,63,107,0.15)" },
                "&:hover fieldset": { borderColor: "rgba(74,63,107,0.3)" },
                "&.Mui-focused fieldset": { borderColor: THEME.header },
              },
            }}
          />
          <Box sx={{ display: "flex", gap: 0.5, pl: 1, borderLeft: "1px solid rgba(74,63,107,0.1)" }}>
             <Tooltip title={showFilters ? "Hide Filters" : "Show Advanced Filters"}>
                <IconButton 
                  size="small" 
                  sx={{ color: showFilters ? THEME.header : "#8b81b3", p: 0.6 }}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FilterIcon sx={{ fontSize: "1.05rem" }} />
                </IconButton>
             </Tooltip>
             <Tooltip title={isFullscreen ? "Exit Full Screen" : "Full Screen"}>
                <IconButton 
                  size="small" 
                  sx={{ color: isFullscreen ? THEME.header : "#8b81b3", p: 0.6 }}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: "1.05rem" }} /> : <FullscreenIcon sx={{ fontSize: "1.05rem" }} />}
                </IconButton>
             </Tooltip>
          </Box>
        </Stack>
      </Box>

      {/* ── 3. Filter Panel ───────────────────────────────────────────────── */}
      <Collapse in={showFilters && !!filterPanel}>
        <Box
          sx={{
            bgcolor: "#faf9fd",
            px: 2,
            py: 1.2,
            borderBottom: `1px solid ${THEME.borderColor}`,
          }}
        >
          {filterPanel}
        </Box>
      </Collapse>

      {/* ── 4. Table ──────────────────────────────────────────────────────── */}
      <Box sx={{ overflowX: "auto", flexGrow: isFullscreen ? 1 : 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress size={30} sx={{ color: THEME.header }} />
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: THEME.tableHeaderBg }}>
                  {orderedColumns.map((column, index) => (
                    <TableCell
                      key={index}
                      align={column.align || "left"}
                      sortDirection={orderBy === column.key ? order : false}
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        color: THEME.tableHeaderText,
                        py: 0.8,
                        px: 2,
                        borderRight: `1px solid ${THEME.borderColor}`,
                        "&:last-child": { borderRight: "none" },
                        whiteSpace: "nowrap",
                        ...column.sx,
                      }}
                    >
                      {column.key ? (
                        <TableSortLabel
                          active={orderBy === column.key}
                          direction={orderBy === column.key ? order : "asc"}
                          onClick={() => handleSort(column.key)}
                          sx={{
                            color: `${THEME.tableHeaderText} !important`,
                            "& .MuiTableSortLabel-icon": {
                              color: `${THEME.sortActive} !important`,
                            },
                          }}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        column.label
                      )}
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
                        bgcolor: rowIndex % 2 === 1 ? THEME.rowAlt : "#ffffff",
                        "&:hover": { bgcolor: THEME.rowHover },
                        "& td": {
                          borderRight: `1px solid ${THEME.borderColor}`,
                        },
                        "& td:last-child": { borderRight: "none" },
                      }}
                    >
                      {orderedColumns.map((column, colIndex) => (
                        <TableCell
                          key={colIndex}
                          align={column.align || "left"}
                          sx={{
                            py: 0.6,
                            px: 2,
                            fontSize: "0.8rem",
                            color: "#333",
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={500}
                      >
                        No records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* ── 5. Pagination ─────────────────────────────────────────── */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 15, 25, 50]}
              component="div"
              count={processedData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={e => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderTop: `1px solid ${THEME.borderColor}`,
                "& .MuiTablePagination-toolbar": { minHeight: 40 },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "text.secondary",
                },
                "& .MuiSelect-select": { fontSize: "0.75rem" },
              }}
            />
          </>
        )}
      </Box>
    </Paper>
  );
}
