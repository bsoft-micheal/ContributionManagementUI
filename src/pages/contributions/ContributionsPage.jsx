import React, { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
  IconButton,
  Tooltip
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Payments as PaymentsIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Save as SaveIcon,
  QrCodeScanner as QrCodeIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";

import dayjs from "dayjs";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppButton from "../../components/common/AppButton";
import { GetContributionsAsync, GetContributionsByEventAsync, RecordPaymentAsync } from "../../services/contributionService";
import { GetEventsAsync } from "../../services/eventService";
import { GetMembersAsync } from "../../services/memberService";
import { GetRolesAsync } from "../../services/roleService";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import { validateForm } from "../../utils/validation";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import PaymentQrReminderDialog from "../../components/contributions/PaymentQrReminderDialog";
import {
  getPaymentQrConfig,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
  generateQrPngDataUrl,
} from "../../utils/upiQrHelper";

const initialPayment = {
  eventId: "",
  memberId: "",
  amount: "",
  paymentMode: "Upi",
  paymentDate: dayjs(),
  cashAmount: "",
  upiAmount: "",
};

export default function ContributionsPage() {
  const theme = useTheme();
  const { authState } = useAuth();
  const rights = getRightsForPage("Contributions", authState?.role);
  const hasWriteAccess = rights.write;

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [filterEventId, setFilterEventId] = useState("");
  const [contributions, setContributions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedContributionForQr, setSelectedContributionForQr] = useState(null);
  const [payment, setPayment] = useState(initialPayment);
  const [allContributions, setAllContributions] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});
  const toast = useAppToast();
  const actionIconColor = theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b";

  useEffect(() => {
    async function loadEvents() {
      try {
        const [mems, rls, data] = await Promise.all([
          GetMembersAsync(),
          GetRolesAsync(),
          GetEventsAsync()
        ]);
        setMembers(mems);
        setRoles(rls);
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].eventId);
          setFilterEventId(data[0].eventId);
        }
        try {
          const allData = await GetContributionsAsync();
          setAllContributions(allData);
        } catch (allDataErr) {
          console.warn("Global contributions endpoint not available yet:", allDataErr);
          setAllContributions([]);
        }
      } catch (error) {
        console.error("Error loading events & contributions:", error);
      }
    }

    loadEvents();
  }, []);

  const getContributionOutstanding = (c) => {
    if (!c) return 0;
    if (c.paymentStatus === "Paid") return 0;
    return c.amount || 0;
  };

  useEffect(() => {
    if (!selectedEventId) {
      setContributions([]);
      return;
    }

    async function loadContributions() {
      try {
        const data = await GetContributionsByEventAsync(selectedEventId);

        const enrichedData = data.map(c => {
          // Calculate Arrears: sum of unpaid contributions for this member in other events
          const previousUnpaid = allContributions
            .filter(prev =>
              prev.memberId === c.memberId &&
              prev.eventId !== c.eventId &&
              prev.paymentStatus !== "Paid"
            )
            .reduce((sum, prev) => sum + (prev.amount || 0), 0);

          const currentOutstanding = getContributionOutstanding(c);

          return {
            ...c,
            previousUnpaid,
            totalAccumulated: currentOutstanding + previousUnpaid
          };
        });

        setContributions(enrichedData);
      } catch (error) {
        console.error("Error loading contributions:", error);
      }
    }

    loadContributions();
  }, [selectedEventId, allContributions]);

  const handleAmountChange = (val) => {
    setPayment((prev) => {
      const next = { ...prev, amount: val };
      if (prev.paymentMode === "Split" && val !== "") {
        const total = Number(val) || 0;
        const currentCash = Number(prev.cashAmount);
        if (!isNaN(currentCash) && currentCash > 0 && currentCash <= total) {
          next.upiAmount = String(Math.round((total - currentCash) * 100) / 100);
        } else if (total > 0) {
          const half = Math.round((total / 2) * 100) / 100;
          next.cashAmount = String(half);
          next.upiAmount = String(Math.round((total - half) * 100) / 100);
        }
      }
      return next;
    });
    if (errors.amount || errors.split) setErrors(prev => ({ ...prev, amount: "", split: "" }));
  };

  const handlePaymentModeChange = (newMode) => {
    setPayment((current) => {
      const next = { ...current, paymentMode: newMode };
      if (newMode === "Split") {
        const total = Number(current.amount) || 0;
        if (total > 0 && (!current.cashAmount || !current.upiAmount)) {
          const half = Math.round((total / 2) * 100) / 100;
          next.cashAmount = String(half);
          next.upiAmount = String(Math.round((total - half) * 100) / 100);
        }
      }
      return next;
    });
    if (errors.paymentMode || errors.split || errors.cashAmount || errors.upiAmount) {
      setErrors(prev => ({ ...prev, paymentMode: "", split: "", cashAmount: "", upiAmount: "" }));
    }
  };

  const handleCashAmountChange = (val) => {
    setPayment((prev) => {
      const total = Number(prev.amount) || 0;
      const parsedCash = val === "" ? 0 : (Number(val) || 0);
      const remainingUpi = Math.max(0, Math.round((total - parsedCash) * 100) / 100);
      return {
        ...prev,
        cashAmount: val,
        upiAmount: val === "" ? "" : String(remainingUpi)
      };
    });
    if (errors.cashAmount || errors.upiAmount || errors.split) {
      setErrors(prev => ({ ...prev, cashAmount: "", upiAmount: "", split: "" }));
    }
  };

  const handleUpiAmountChange = (val) => {
    setPayment((prev) => {
      const total = Number(prev.amount) || 0;
      const parsedUpi = val === "" ? 0 : (Number(val) || 0);
      const remainingCash = Math.max(0, Math.round((total - parsedUpi) * 100) / 100);
      return {
        ...prev,
        upiAmount: val,
        cashAmount: val === "" ? "" : String(remainingCash)
      };
    });
    if (errors.cashAmount || errors.upiAmount || errors.split) {
      setErrors(prev => ({ ...prev, cashAmount: "", upiAmount: "", split: "" }));
    }
  };

  const handlePaymentScopeChange = (scope) => {
    let newAmt = payment.currentEventDue || 0;
    if (scope === "PreviousArrears") newAmt = payment.previousArrears || 0;
    else if (scope === "AllOutstanding") newAmt = payment.totalDue || 0;

    setPayment((prev) => {
      const next = { ...prev, paymentScope: scope, amount: String(newAmt) };
      if (prev.paymentMode === "Split") {
        const half = Math.round((newAmt / 2) * 100) / 100;
        next.cashAmount = String(half);
        next.upiAmount = String(Math.round((newAmt - half) * 100) / 100);
      }
      return next;
    });
    if (errors.amount || errors.split) setErrors((prev) => ({ ...prev, amount: "", split: "" }));
  };

  async function handlePay() {
    const filed = "This field is required";
    const schema = {
      amount: { required: true, type: "decimalonly", min: 0, max: 1000000, label: filed },
      paymentMode: { required: true, label: filed },
      paymentDate: { required: true, label: filed }
    };
    const newErrors = validateForm(payment, schema);

    if (payment.paymentMode === "Split") {
      const total = Number(payment.amount) || 0;
      const cash = Number(payment.cashAmount);
      const upi = Number(payment.upiAmount);

      if (payment.cashAmount === "" || isNaN(cash) || cash < 0) {
        newErrors.cashAmount = "Please enter valid cash amount";
      }
      if (payment.upiAmount === "" || isNaN(upi) || upi < 0) {
        newErrors.upiAmount = "Please enter valid UPI amount";
      }
      if (!newErrors.cashAmount && !newErrors.upiAmount) {
        const splitSum = Math.round((cash + upi) * 100) / 100;
        if (splitSum !== total) {
          newErrors.split = `Cash (₹${cash}) + UPI (₹${upi}) = ₹${splitSum} must equal Total (₹${total}).`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.split) {
        toast.error(newErrors.split);
      } else {
        toast.error("Please fill all the required fields correctly");
      }
      return;
    }

    try {
      await RecordPaymentAsync({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString(),
        amount: payment.amount === "" ? null : Number(payment.amount),
        cashAmount: payment.paymentMode === "Split" ? (payment.cashAmount === "" ? null : Number(payment.cashAmount)) : null,
        upiAmount: payment.paymentMode === "Split" ? (payment.upiAmount === "" ? null : Number(payment.upiAmount)) : null,
        paymentScope: payment.paymentScope || "CurrentEvent",
      });
      toast.success("Payment recorded successfully");
      setDialogOpen(false);

      // Reload global and event contributions to update all outstanding balances
      const allData = await GetContributionsAsync();
      setAllContributions(allData);

      const eventData = await GetContributionsByEventAsync(selectedEventId);
      const enriched = eventData.map(c => {
        const previousUnpaid = allData
          .filter(prev =>
            prev.memberId === c.memberId &&
            prev.eventId !== c.eventId &&
            prev.paymentStatus !== "Paid"
          )
          .reduce((sum, prev) => sum + (prev.amount || 0), 0);

        const currentOutstanding = getContributionOutstanding(c);

        return {
          ...c,
          previousUnpaid,
          totalAccumulated: currentOutstanding + previousUnpaid
        };
      });
      setContributions(enriched);
    } catch (error) {
      const apiErrorMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(" ") : null) ||
        error.response?.data?.title ||
        "Unable to save payment.";
      toast.error(apiErrorMsg);
    }
  }

  const eventOptions = events.map(e => ({ label: e.eventName, value: e.eventId }));
  const modeOptions = [
    { label: "Cash", value: "Cash" },
    { label: "UPI", value: "Upi" },
    { label: "Split Payment (Cash + UPI)", value: "Split" },
  ];

  const columns = [
    {
      label: "Action",
      render: (row) => {
        const currentDue = row.paymentStatus === "Paid" ? 0 : (row.amount || 0);
        const previousArrears = row.previousUnpaid || 0;
        const totalDue = currentDue + previousArrears;

        const isFullyPaid = row.paymentStatus === "Paid" && previousArrears <= 0;
        const isButtonDisabled = isFullyPaid || !hasWriteAccess;
        const buttonTooltip = isFullyPaid
          ? "Fully Paid"
          : (row.paymentStatus === "Paid" && previousArrears > 0 ? "Pay Previous Arrears" : (hasWriteAccess ? "Record Payment" : ""));

        return (
          <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
            <Tooltip title={buttonTooltip}>
              <span>
                <IconButton
                  size="small"
                  disabled={isButtonDisabled}
                  onClick={() => {
                    let defaultScope = "CurrentEvent";
                    if (row.paymentStatus === "Paid" && previousArrears > 0) {
                      defaultScope = "PreviousArrears";
                    } else if (currentDue > 0 && previousArrears > 0) {
                      defaultScope = "AllOutstanding";
                    }

                    const initAmt = defaultScope === "PreviousArrears" ? previousArrears : (defaultScope === "AllOutstanding" ? totalDue : currentDue);

                    setPayment({
                      eventId: row.eventId,
                      memberId: row.memberId,
                      amount: String(initAmt),
                      paymentMode: "Upi",
                      paymentDate: dayjs(),
                      cashAmount: "",
                      upiAmount: "",
                      paymentScope: defaultScope,
                      currentEventDue: currentDue,
                      previousArrears: previousArrears,
                      totalDue: totalDue,
                    });
                    setErrors({});
                    setDialogOpen(true);
                  }}
                  sx={{ p: 0.3, color: isButtonDisabled ? "#cbd5e1" : actionIconColor }}
                >
                  <PaymentsIcon sx={{ fontSize: "1.1rem" }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
      );
    }
  },
    { label: "Member", key: "memberName", render: (row) => <Typography variant="body2" fontWeight={700}>{row.memberName}</Typography> },
    {
      label: "Status",
      key: "paymentStatus",
      render: (row) => (
        <Typography
          variant="caption" fontWeight={800}
          sx={{
            color: row.paymentStatus === "Paid" ? "#16a34a" : "#dc2626",
            bgcolor: row.paymentStatus === "Paid" ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
            px: 1.2, py: 0.3, borderRadius: "3px",
            fontSize: "0.7rem", letterSpacing: "0.04em"
          }}
        >
          {row.paymentStatus}
        </Typography>
      )
    },
    {
      label: "Amount",
      key: "amount",
      align: "right",
      render: (row) => {
        const currentDue = row.paymentStatus === "Paid" ? 0 : (row.amount || 0);
        return (
          <Typography variant="body2" fontWeight={700} color={row.paymentStatus === "Paid" ? "text.secondary" : "inherit"}>
            ₹{currentDue.toLocaleString()}
          </Typography>
        );
      }
    },
    {
      label: "Arrears",
      key: "previousUnpaid",
      align: "right",
      render: (row) => (
        <Tooltip title="Outstanding from previous cycles">
          <Typography variant="body2" color="error.main" fontWeight={row.previousUnpaid > 0 ? 800 : 400}>
            ₹{(row.previousUnpaid || 0).toLocaleString()}
          </Typography>
        </Tooltip>
      )
    },
    {
      label: "Total Due",
      key: "totalAccumulated",
      align: "right",
      render: (row) => (
        <Typography variant="body2" fontWeight={900} color={theme.palette.mode === "dark" ? "#ffffff" : "primary.main"}>
          ₹{(row.totalAccumulated || 0).toLocaleString()}
        </Typography>
      )
    },
    {
      label: "Mode",
      key: "paymentMode",
      render: (row) => {
        if (row.paymentMode === "Split") {
          const cashInfo = row.cashAmount ? `₹${Number(row.cashAmount).toLocaleString()} Cash` : "";
          const upiInfo = row.upiAmount ? `₹${Number(row.upiAmount).toLocaleString()} UPI` : "";
          const splitLabel = cashInfo && upiInfo ? `Split (${cashInfo} + ${upiInfo})` : "Split (Cash + UPI)";
          const tooltipText = cashInfo && upiInfo ? `Split Payment: ${cashInfo} and ${upiInfo}` : "Split Payment (Partial Cash + Partial UPI)";

          return (
            <Tooltip title={tooltipText}>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  px: 1,
                  py: 0.3,
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "#4f46e5",
                  bgcolor: "rgba(79, 70, 229, 0.08)",
                  border: "1px solid rgba(79, 70, 229, 0.25)",
                }}
              >
                {splitLabel}
              </Box>
            </Tooltip>
          );
        }
        return row.paymentMode || "-";
      },
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Contribution Collections"
        columns={columns}
        data={contributions}
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 220 }}>
                <AppSelect
                  label="Selected Event"
                  placeholder="Select an event"
                  value={filterEventId}
                  onChange={(event) => {
                    setFilterEventId(event.target.value);
                  }}
                  options={eventOptions}
                  required
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setSelectedEventId(filterEventId);
                  toast.success("Filter applied");
                }}
                sx={{
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                }}
              >
                Filter
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                onClick={() => {
                  if (events.length > 0) {
                    const firstEventId = events[0].eventId;
                    setFilterEventId(firstEventId);
                    setSelectedEventId(firstEventId);
                    toast.success("Filter cleared");
                  }
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)"
                  }
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 3, alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                    Total Income
                  </Typography>
                  <Typography variant="body1" fontWeight={900} color="success.main" sx={{ lineHeight: 1 }}>
                    ₹{contributions.filter(c => c.paymentStatus === "Paid").reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", pl: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                    Total Members
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1 }}>{contributions.length} Members</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        }
      />

      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        title="Contribution Collections "
        actions={
          <>
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handlePay}
              disabled={
                payment.paymentMode === "Split" && (
                  !payment.amount ||
                  Number(payment.amount) <= 0 ||
                  payment.cashAmount === "" ||
                  payment.upiAmount === "" ||
                  Math.round(((Number(payment.cashAmount) || 0) + (Number(payment.upiAmount) || 0)) * 100) / 100 !== Number(payment.amount)
                )
              }
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "#5e6783 !important" : "#4a3f6b !important",
                "&:hover": { bgcolor: theme.palette.mode === "dark" ? "#6b7390 !important" : "#3b325c !important" }
              }}
            >
              Save
            </AppButton>
          </>
        }
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {/* Member Dues Summary Banner */}
          {(payment.previousArrears > 0 || payment.currentEventDue > 0) && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(74,63,107,0.04)",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.8, fontSize: "0.68rem" }}>
                Member Dues Summary
              </Typography>
              <Grid container spacing={1} textAlign="center">
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Current Event</Typography>
                  <Typography variant="body2" fontWeight={800} color={payment.currentEventDue > 0 ? "error.main" : "success.main"}>
                    ₹{(payment.currentEventDue || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Previous Arrears</Typography>
                  <Typography variant="body2" fontWeight={800} color={payment.previousArrears > 0 ? "error.main" : "text.secondary"}>
                    ₹{(payment.previousArrears || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>Total Due</Typography>
                  <Typography variant="body2" fontWeight={900} color="primary.main">
                    ₹{(payment.totalDue || 0).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Payment Scope Selector */}
          {(payment.previousArrears > 0 || payment.currentEventDue > 0) && (
            <AppSelect
              label="Payment For *"
              placeholder="Select payment target"
              value={payment.paymentScope || "CurrentEvent"}
              onChange={(e) => handlePaymentScopeChange(e.target.value)}
              options={[
                ...(payment.currentEventDue > 0 ? [{ label: `Current Event Only (₹${payment.currentEventDue.toLocaleString()})`, value: "CurrentEvent" }] : []),
                ...(payment.previousArrears > 0 ? [{ label: `Previous Arrears Only (₹${payment.previousArrears.toLocaleString()})`, value: "PreviousArrears" }] : []),
                ...((payment.currentEventDue > 0 && payment.previousArrears > 0) ? [{ label: `All Outstanding (₹${payment.totalDue.toLocaleString()})`, value: "AllOutstanding" }] : []),
              ]}
              required
            />
          )}

          <AppInput
            label="Amount"
            placeholder="Fixed payment amount (₹)"
            value={payment.amount}
            onChange={(event) => handleAmountChange(event.target.value)}
            restrictType="decimalonly"
            maxLength={10}
            disabled={true}
            error={!!errors.amount}
            helperText={
              errors.amount ||
              (payment.paymentMode === "Split"
                ? "Total fixed due amount. You can adjust Cash and UPI amounts below."
                : "Fixed due amount for the selected payment scope.")
            }
            required
          />
          <AppSelect
            label="Payment Mode"
            placeholder="Select payment mode"
            value={payment.paymentMode}
            onChange={(event) => handlePaymentModeChange(event.target.value)}
            options={modeOptions}
            error={!!errors.paymentMode}
            helperText={errors.paymentMode}
            required
          />

          {payment.paymentMode === "Split" && (
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(74, 63, 107, 0.03)",
                border: "1px dashed",
                borderColor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(74, 63, 107, 0.25)",
              }}
            >
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={800} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                  Split Payment Breakdown
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <AppInput
                    label="Cash Amount *"
                    placeholder="₹ Cash"
                    value={payment.cashAmount}
                    onChange={(e) => handleCashAmountChange(e.target.value)}
                    restrictType="decimalonly"
                    maxLength={10}
                    error={!!errors.cashAmount}
                    helperText={errors.cashAmount}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <AppInput
                    label="UPI Amount *"
                    placeholder="₹ UPI"
                    value={payment.upiAmount}
                    onChange={(e) => handleUpiAmountChange(e.target.value)}
                    restrictType="decimalonly"
                    maxLength={10}
                    error={!!errors.upiAmount}
                    helperText={errors.upiAmount}
                    required
                  />
                </Grid>
              </Grid>

              {/* Real-time Balance Status Indicator */}
              {(() => {
                const tot = Number(payment.amount) || 0;
                const c = Number(payment.cashAmount) || 0;
                const u = Number(payment.upiAmount) || 0;
                const sum = Math.round((c + u) * 100) / 100;
                const isBalanced = tot > 0 && sum === tot && payment.cashAmount !== "" && payment.upiAmount !== "";
                const diff = Math.round((tot - sum) * 100) / 100;

                if (isBalanced) {
                  return (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1,
                        borderRadius: "8px",
                        bgcolor: "rgba(22, 163, 74, 0.08)",
                        border: "1px solid rgba(22, 163, 74, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 800, fontSize: "0.75rem" }}>
                        ✓ Balanced: ₹{c.toLocaleString()} (Cash) + ₹{u.toLocaleString()} (UPI) = ₹{tot.toLocaleString()}
                      </Typography>
                    </Box>
                  );
                }

                if (tot > 0 && (payment.cashAmount !== "" || payment.upiAmount !== "")) {
                  return (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1,
                        borderRadius: "8px",
                        bgcolor: "rgba(220, 38, 38, 0.08)",
                        border: "1px solid rgba(220, 38, 38, 0.25)",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 800, fontSize: "0.72rem", display: "block" }}>
                        ⚠️ Split total is ₹{sum.toLocaleString()} (Diff: {diff > 0 ? `₹${diff.toLocaleString()} remaining` : `₹${Math.abs(diff).toLocaleString()} over`}).
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                        The sum of Cash + UPI must equal the Total Amount (₹{tot.toLocaleString()}).
                      </Typography>
                    </Box>
                  );
                }

                return null;
              })()}
            </Box>
          )}

          <AppDateInput
            label="Payment Date"
            value={payment.paymentDate}
            onChange={(newValue) => {
              setPayment((current) => ({ ...current, paymentDate: newValue }));
              if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: "" }));
            }}
            error={!!errors.paymentDate}
            helperText={errors.paymentDate}
            required
          />

          {((payment.paymentMode === "Upi" && Number(payment.amount) > 0) ||
            (payment.paymentMode === "Split" && Number(payment.upiAmount) > 0)) && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(2, 132, 199, 0.08)" : "rgba(2, 132, 199, 0.04)"),
                border: "1px solid rgba(2, 132, 199, 0.2)",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" fontWeight={800} sx={{ color: "#0284c7", display: "block", mb: 0.8 }}>
                {payment.paymentMode === "Split"
                  ? `Dynamic UPI QR (Split UPI Portion: ₹${Number(payment.upiAmount).toLocaleString("en-IN")})`
                  : `Dynamic UPI Payment QR (₹${Number(payment.amount).toLocaleString("en-IN")})`}
              </Typography>
              <Box
                component="img"
                src={generateQrPngDataUrl(
                  buildUpiPaymentUri({
                    upiId: getPaymentQrConfig().qrUpiId,
                    receiverName: getPaymentQrConfig().qrReceiverName,
                    amount: payment.paymentMode === "Split" ? payment.upiAmount : payment.amount,
                    note: "Contribution Payment",
                  }),
                  200
                )}
                alt="UPI QR Code"
                sx={{
                  width: 120,
                  height: 120,
                  display: "block",
                  margin: "0 auto",
                  p: 0.6,
                  bgcolor: "#ffffff",
                  borderRadius: "10px",
                  border: "1.5px solid #0284c7",
                  boxShadow: "0 2px 8px rgba(2, 132, 199, 0.12)",
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.6, display: "block" }}>
                {payment.paymentMode === "Split"
                  ? `Scan with any UPI app to pay ₹${Number(payment.upiAmount).toLocaleString("en-IN")} online. Collect ₹${Number(payment.cashAmount || 0).toLocaleString("en-IN")} in cash.`
                  : `Scan with any UPI app to pay ₹${Number(payment.amount).toLocaleString("en-IN")} directly.`}
              </Typography>
            </Box>
          )}
        </Stack>
      </AppDialog>

      {/* Dynamic Payment QR & Email Reminder Dialog */}
      <PaymentQrReminderDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        contribution={selectedContributionForQr}
        event={events.find((e) => e.eventId === selectedContributionForQr?.eventId)}
        member={members.find((m) => m.memberId === selectedContributionForQr?.memberId)}
      />
    </div>
  );
}
