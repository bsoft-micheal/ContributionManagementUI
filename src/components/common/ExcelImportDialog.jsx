import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Description as ExcelIcon,
  Download as DownloadIcon,
  Cancel as CancelIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import AppDialog from "./AppDialog";
import AppButton from "./AppButton";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import dayjs from "dayjs";

export default function ExcelImportDialog({
  open,
  onClose,
  onImport,
  title = "Import Data",
  templateHeaders = [],
  templateValidations = {},
  validateRow = () => ({ error: null, parsed: {} }),
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState([]); // { raw, error, parsed }
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows as an array of objects
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        // Map and validate each row
        const processed = rawJson.map((row, idx) => {
          // Normalize keys (case-insensitive, trim/preserve types)
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            const val = row[key];
            normalizedRow[key.trim().toLowerCase()] = typeof val === "string" ? val.trim() : val;
          });

          // Run validation passed from parent
          const validationResult = validateRow(normalizedRow, idx + 1);
          return {
            rowNumber: idx + 2, // Excel rows are 1-indexed, first row is header
            raw: row,
            error: validationResult.error,
            parsed: validationResult.parsed,
          };
        });

        setParsedRows(processed);
      } catch (err) {
        console.error(err);
        setParsedRows([{ rowNumber: 1, raw: {}, error: "Failed to read Excel file. Please ensure it is a valid format.", parsed: {} }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template");

      // Add headers
      worksheet.addRow(templateHeaders);

      // Auto-fit column widths
      worksheet.columns = templateHeaders.map((header) => ({
        header: header,
        key: header,
        width: Math.max(16, header.length + 4),
      }));

      // Apply data validation to rows 2 to 100
      for (let r = 2; r <= 100; r++) {
        templateHeaders.forEach((header, colIdx) => {
          const validationRule = templateValidations?.[header];
          if (validationRule) {
            const colLetter = worksheet.getColumn(colIdx + 1).letter;
            const cell = worksheet.getCell(`${colLetter}${r}`);
            
            cell.dataValidation = {
              allowBlank: true,
              showErrorMessage: true,
              errorTitle: "Invalid Input",
              ...validationRule,
            };

            if (validationRule.type === "date") {
              cell.numFmt = "dd/mm/yyyy";
            }
          }
        });
      }

      // Generate & trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, "_")}_Template.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Failed to generate Excel template:", err);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    // Only pass rows that don't have errors
    const validData = parsedRows
      .filter((row) => !row.error)
      .map((row) => row.parsed);
    
    onImport(validData);
    handleClear();
    onClose();
  };

  const totalCount = parsedRows.length;
  const invalidCount = parsedRows.filter((r) => r.error).length;
  const validCount = totalCount - invalidCount;

  return (
    <AppDialog
      open={open}
      onClose={() => {
        handleClear();
        onClose();
      }}
      title={title}
      maxWidth="md"
      actions={
        file ? (
          <>
            <AppButton variant="outlined" onClick={handleClear} disabled={loading}>
              Upload Different File
            </AppButton>
            <AppButton
              variant="contained"
              onClick={handleConfirm}
              disabled={loading || validCount === 0}
              sx={{
                bgcolor: "#4a3f6b !important",
                "&:hover": { bgcolor: "#3b325c !important" },
              }}
            >
              Import {validCount} Records
            </AppButton>
          </>
        ) : (
          <AppButton variant="outlined" onClick={onClose}>
            Cancel
          </AppButton>
        )
      }
    >
      {!file ? (
        <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
          {/* Drag & Drop Area */}
          <Box
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              width: "100%",
              minHeight: 180,
              border: (theme) =>
                theme.palette.mode === "dark"
                  ? "2px dashed rgba(255, 255, 255, 0.2)"
                  : "2px dashed rgba(74, 63, 107, 0.3)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(74, 63, 107, 0.02)",
              transition: "all 0.2s ease",
              p: 3,
              "&:hover": {
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(74, 63, 107, 0.05)",
              },
            }}
          >
            <UploadIcon sx={{ fontSize: "3.5rem", color: "#8b81b3", mb: 1.5 }} />
            <Typography variant="body1" fontWeight={700} color="text.primary" align="center">
              Drag & Drop your Excel file here, or click to browse
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5 }}>
              Supports .xlsx and .xls formats
            </Typography>
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
          </Box>

          {/* Template Info & Download */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{
              width: "100%",
              p: 2,
              border: (theme) =>
                theme.palette.mode === "dark"
                  ? "1px solid rgba(255, 255, 255, 0.1)"
                  : "1px solid rgba(74, 63, 107, 0.12)",
              borderRadius: "8px",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={0.5} alignSelf="flex-start">
              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                Spreadsheet Columns Layout
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Your file must have headers matching:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                {templateHeaders.map((header) => (
                  <Chip
                    key={header}
                    label={header}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(74, 63, 107, 0.06)",
                    }}
                  />
                ))}
              </Stack>
            </Stack>

            <AppButton
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              sx={{
                whiteSpace: "nowrap",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(74, 63, 107, 0.3)",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                "&:hover": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                },
              }}
            >
              Get Template
            </AppButton>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={3} sx={{ py: 1 }}>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress size={40} sx={{ color: "#4a3f6b" }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Reading and validating Excel sheet...
              </Typography>
            </Stack>
          ) : (
            <>
              {/* Summary and Warnings */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ExcelIcon sx={{ fontSize: "2rem", color: "#16a34a" }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Rows: {totalCount} | Valid: {validCount} | Invalid: {invalidCount}
                  </Typography>
                </Box>
              </Stack>

              {invalidCount > 0 ? (
                <Alert
                  severity="warning"
                  icon={<ErrorIcon />}
                  sx={{
                    borderRadius: "8px",
                    "& .MuiAlert-message": { width: "100%" },
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    Spreadsheet contains {invalidCount} invalid row(s).
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Invalid rows (highlighted in red) will be skipped during import. You can confirm import to save the {validCount} valid record(s), or clear and upload a corrected file.
                  </Typography>
                </Alert>
              ) : (
                <Alert
                  severity="success"
                  icon={<SuccessIcon />}
                  sx={{ borderRadius: "8px" }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    All {validCount} row(s) are valid and ready to import!
                  </Typography>
                </Alert>
              )}

              {/* Preview Table */}
              <Paper
                elevation={0}
                sx={{
                  maxHeight: 280,
                  overflowY: "auto",
                  border: (theme) =>
                    theme.palette.mode === "dark"
                      ? "1px solid rgba(255, 255, 255, 0.1)"
                      : "1px solid rgba(224, 224, 224, 1)",
                  borderRadius: "8px",
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1d2338" : "#f8fafc" }}>
                        Row
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1d2338" : "#f8fafc" }}>
                        Validation Status
                      </TableCell>
                      {templateHeaders.map((header) => (
                        <TableCell
                          key={header}
                          sx={{ fontWeight: 800, fontSize: "0.75rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1d2338" : "#f8fafc" }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        hover
                        sx={{
                          bgcolor: row.error
                            ? "rgba(239, 68, 68, 0.05)"
                            : "inherit",
                          "&:hover": {
                            bgcolor: row.error
                              ? "rgba(239, 68, 68, 0.08) !important"
                              : "rgba(255,255,255,0.03)",
                          },
                        }}
                      >
                        <TableCell sx={{ fontSize: "0.75rem", py: 1 }}>
                          {row.rowNumber}
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          {row.error ? (
                            <Chip
                              label={row.error}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                height: 20,
                                borderRadius: "4px",
                              }}
                            />
                          ) : (
                            <Chip
                              label="Valid"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                height: 20,
                                borderRadius: "4px",
                              }}
                            />
                          )}
                        </TableCell>
                        {templateHeaders.map((header) => {
                          const value =
                            row.raw[header] ||
                            row.raw[header.toLowerCase()] ||
                            row.raw[header.replace(/\s+/g, "")] ||
                            "";
                          
                          // Format display value for preview table
                          const isDateColumn = header.toLowerCase().includes("date") || header.toLowerCase().includes("birth") || header.toLowerCase().includes("dob");
                          let displayValue = String(value);
                          if (isDateColumn && value !== "") {
                            if (value instanceof Date) {
                              const localDate = new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
                              displayValue = dayjs(localDate).format("DD/MM/YYYY");
                            } else {
                              const num = Number(value);
                              if (!isNaN(num) && num > 10000 && num < 60000) {
                                const utcDate = new Date((num - 25568) * 86400 * 1000);
                                const localDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
                                displayValue = dayjs(localDate).format("DD/MM/YYYY");
                              }
                            }
                          }

                          return (
                            <TableCell key={header} sx={{ fontSize: "0.75rem", py: 1, color: "text.primary" }}>
                              {displayValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </Stack>
      )}
    </AppDialog>
  );
}
