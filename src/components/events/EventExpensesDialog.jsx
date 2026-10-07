import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import {
  Close as CloseIcon,
  ReceiptLong as ReceiptIcon,
  OpenInNew as OpenInNewIcon,
  Image as ImageIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { formatGridDate } from "../../utils/dateHelper";
import { getExpensesAsync } from "../../services/expenseService";
import { getImageUrl } from "../../services/apiClient";
import { useAppToast } from "../common/AppToast";

export default function EventExpensesDialog({ open, onClose, event, onAddExpenseClick }) {
  const navigate = useNavigate();
  const toast = useAppToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [receiptModal, setReceiptModal] = useState({ open: false, url: "", title: "" });

  useEffect(() => {
    if (!open || !event) {
      setExpenses([]);
      return;
    }

    let isMounted = true;
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const data = await getExpensesAsync();
        if (!isMounted) return;

        const targetEventName = (event.eventName || "").trim().toLowerCase();
        const targetCategory = (event.eventTypeName || event.category || "").trim().toLowerCase();

        const filtered = (Array.isArray(data) ? data : []).filter((item) => {
          const itemEvent = (item.eventName || "").trim().toLowerCase();
          return itemEvent && itemEvent === targetEventName;
        });

        setExpenses(filtered);
      } catch (err) {
        if (isMounted) {
          toast.error("Failed to load expenses for this event.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExpenses();
    return () => {
      isMounted = false;
    };
  }, [open, event]);

  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [expenses]);

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
    if (s === "rejected") return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
  };

  const resolveReceiptUrl = (filePath) => {
    if (!filePath) return "";
    if (filePath.startsWith("data:") || filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    if (filePath.startsWith("/expense_attachments/") || filePath.startsWith("expense_attachments/")) {
      return getImageUrl(filePath);
    }
    if (filePath.startsWith("/")) {
      return getImageUrl(filePath);
    }
    return getImageUrl(`/expense_attachments/${filePath}`);
  };

  const handleOpenInExpensePage = () => {
    onClose();
    navigate("/expense", {
      state: {
        filterEvent: event?.eventName,
        filterCategory: event?.eventTypeName || event?.category,
      },
    });
  };

  return (
    <>
      <AppDialog
        open={open}
        onClose={onClose}
        title={`Expenses - ${event?.eventName || "Event"}`}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              {onAddExpenseClick && (
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    onClose();
                    onAddExpenseClick(event);
                  }}
                  sx={{
                    bgcolor: "#342b54 !important",
                    color: "#ffffff !important",
                    "&:hover": { bgcolor: "#241d3b !important" },
                  }}
                >
                  Add Expense
                </AppButton>
              )}
              <AppButton
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenInExpensePage}
              >
                Open in Expense Page
              </AppButton>
            </Box>
            <AppButton variant="outlined" size="small" onClick={onClose}>
              Close
            </AppButton>
          </Stack>
        }
      >
        <Box sx={{ p: 1 }}>
          {/* Summary Chips / Cards */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 3,
              p: 2,
              borderRadius: "12px",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc"),
              border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
            }}
          >
            <Box sx={{ minWidth: 140 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Event Name
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                {event?.eventName || "--"}
              </Typography>
            </Box>

            <Box sx={{ minWidth: 120 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Category
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                {event?.eventTypeName || event?.category || "--"}
              </Typography>
            </Box>

            <Box sx={{ minWidth: 120 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Event Date
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                {event?.eventDate ? formatGridDate(event.eventDate) : "--"}
              </Typography>
            </Box>

            <Box sx={{ minWidth: 140 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Total Expenses
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: "#7c3aed" }}>
                ₹{totalExpenseAmount.toLocaleString("en-IN")}
              </Typography>
            </Box>

            {event?.valuation ? (
              <Box sx={{ minWidth: 140 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Event Valuation
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#10b981" }}>
                  ₹{Number(event.valuation).toLocaleString("en-IN")}
                </Typography>
              </Box>
            ) : null}
          </Box>

          {/* Expenses Table or Empty State */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
              <CircularProgress size={36} sx={{ color: "#7c3aed" }} />
            </Box>
          ) : expenses.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
                px: 2,
                borderRadius: "12px",
                border: "1px dashed",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.15)" : "#cbd5e1"),
              }}
            >
              <ReceiptIcon sx={{ fontSize: "3rem", color: "text.secondary", opacity: 0.5, mb: 1 }} />
              <Typography variant="body1" fontWeight={700} sx={{ color: "text.primary", mb: 0.5 }}>
                No expenses recorded for this event yet
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                There are currently no expenses recorded for {event?.eventName}.
              </Typography>
              {onAddExpenseClick && (
                <AppButton
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    onClose();
                    onAddExpenseClick(event);
                  }}
                  sx={{
                    mt: 2,
                    bgcolor: "#342b54 !important",
                    color: "#ffffff !important",
                    "&:hover": { bgcolor: "#241d3b !important" },
                  }}
                >
                  Add Expense
                </AppButton>
              )}
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto", maxHeight: expenses.length > 6 ? 260 : "none", overflowY: expenses.length > 6 ? "auto" : "visible" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#f1f5f9") }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Expense ID</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1 }}>Submitted By</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", py: 1, textAlign: "center" }}>Receipt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((row, idx) => {
                    const statusStyle = getStatusColor(row.status);
                    const rawFile = row.fileName || row.fileUrl || "";
                    const hasReceipt = Boolean(rawFile);
                    const receiptUrl = resolveReceiptUrl(rawFile);

                    return (
                      <TableRow key={row.expenseId || row.id || idx} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                        <TableCell sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
                          {row.id || (row.expenseId ? `EXP-${String(idx + 1).padStart(3, "0")}` : `EXP-${idx + 1}`)}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, maxWidth: 180 }}>
                          {row.description || "--"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem" }}>
                          {row.category || event?.eventTypeName || "--"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", fontWeight: 800 }}>
                          ₹{Number(row.amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem" }}>
                          {row.expenseDate ? formatGridDate(row.expenseDate) : "--"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem" }}>
                          <Chip
                            label={row.status || "Pending"}
                            size="small"
                            sx={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              height: 20,
                              bgcolor: statusStyle.bg,
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.border}`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                          {row.submittedBy || "--"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {hasReceipt ? (
                            <IconButton
                              size="small"
                              onClick={() =>
                                setReceiptModal({
                                  open: true,
                                  url: receiptUrl,
                                  title: `Receipt - ${row.id || "Expense"} (${row.description || event?.eventName})`,
                                })
                              }
                              sx={{
                                color: "#7c3aed",
                                p: 0.4,
                                "&:hover": { bgcolor: "rgba(124, 58, 237, 0.1)" },
                              }}
                            >
                              <ImageIcon sx={{ fontSize: "1.1rem" }} />
                            </IconButton>
                          ) : (
                            <Typography variant="caption" sx={{ color: "text.disabled" }}>
                              --
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </AppDialog>

      {/* Receipt Image Preview Dialog */}
      <Dialog
        open={receiptModal.open}
        onClose={() => setReceiptModal({ open: false, url: "", title: "" })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {receiptModal.title || "Attached Receipt Preview"}
          </Typography>
          <IconButton onClick={() => setReceiptModal({ open: false, url: "", title: "" })} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center", bgcolor: "#111827", p: 2 }}>
          {receiptModal.url ? (
            <Box
              component="img"
              src={receiptModal.url}
              alt="Receipt Preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: 3,
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No receipt image available.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
