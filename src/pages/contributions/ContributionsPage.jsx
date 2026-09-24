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

  async function handlePay() {
    const filed = "This field is required";
    const schema = {
      amount: { required: true, type: "numberonly", min: 0, max: 1000000, label: filed },
      paymentMode: { required: true, label: filed },
      paymentDate: { required: true, label: filed }
    };
    const newErrors = validateForm(payment, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    try {
      await RecordPaymentAsync({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString(),
        amount: payment.amount === "" ? null : Number(payment.amount),
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
      toast.error(error.response?.data?.message ?? "Unable to save payment.");
    }
  }

  const eventOptions = events.map(e => ({ label: e.eventName, value: e.eventId }));
  const modeOptions = ["Cash", "Upi", "BankTransfer", "Card"].map(m => ({ label: m, value: m }));

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
          <Tooltip title={row.paymentStatus === "Paid" ? "Already Paid" : (hasWriteAccess ? "Record Payment" : "")}>
            <span>
              <IconButton
                size="small"
                disabled={row.paymentStatus === "Paid" || !hasWriteAccess}
                onClick={() => {
                  setPayment({ eventId: row.eventId, memberId: row.memberId, amount: row.amount, paymentMode: "Upi", paymentDate: dayjs() });
                  setErrors({});
                  setDialogOpen(true);
                }}
                sx={{ p: 0.3, color: row.paymentStatus === "Paid" || !hasWriteAccess ? "#cbd5e1" : actionIconColor }}
              >
                <PaymentsIcon sx={{ fontSize: "1.1rem" }} />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={row.paymentStatus === "Paid" ? "View Dynamic Payment QR" : "Scan Dynamic QR & Send Reminder"}>
            <IconButton
              size="small"
              onClick={() => {
                setSelectedContributionForQr(row);
                setQrDialogOpen(true);
              }}
              sx={{ p: 0.3, color: actionIconColor }}
            >
              <QrCodeIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
        </Box>
      )
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
    { label: "Amount", key: "amount", align: "right", render: (row) => <Typography variant="body2" fontWeight={700}>₹{(row.amount || 0).toLocaleString()}</Typography> },
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
    { label: "Mode", key: "paymentMode" },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
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
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handlePay}
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "#5e6783 !important" : "#4a3f6b !important",
                "&:hover": { bgcolor: theme.palette.mode === "dark" ? "#6b7390 !important" : "#3b325c !important" }
              }}
            >
              Save
            </AppButton>
            <AppButton variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</AppButton>
          </>
        }
      >
        <Stack spacing={3} sx={{ pt: 1 }}>
          <AppInput
            label="Amount"
            placeholder="Enter payment amount (₹)"
            value={payment.amount}
            onChange={(event) => {
              setPayment((current) => ({ ...current, amount: event.target.value }));
              if (errors.amount) setErrors(prev => ({ ...prev, amount: "" }));
            }}
            restrictType="numberonly"
            maxLength={10}
            error={!!errors.amount}
            helperText={errors.amount}
            required
          />
          <AppSelect
            label="Payment Mode"
            placeholder="Select payment mode"
            value={payment.paymentMode}
            onChange={(event) => {
              setPayment((current) => ({ ...current, paymentMode: event.target.value }));
              if (errors.paymentMode) setErrors(prev => ({ ...prev, paymentMode: "" }));
            }}
            options={modeOptions}
            error={!!errors.paymentMode}
            helperText={errors.paymentMode}
            required
          />
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

          {payment.paymentMode === "Upi" && Number(payment.amount) > 0 && (() => {
            const targetEvent = events.find((e) => e.eventId === payment?.eventId);
            const eventType = targetEvent?.eventTypeName || targetEvent?.eventType || targetEvent?.name;
            const eventQrConfig = getPaymentQrConfig(eventType);

            return (
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
                  Dynamic UPI Payment QR (₹{Number(payment.amount).toLocaleString("en-IN")}) - {eventType || "Event"}
                </Typography>
                {eventQrConfig.isConfigured ? (
                  <>
                    <Box
                      component="img"
                      src={
                        eventQrConfig.qrMode === "uploaded" && eventQrConfig.qrImage
                          ? eventQrConfig.qrImage
                          : generateQrPngDataUrl(
                              buildUpiPaymentUri({
                                upiId: eventQrConfig.qrUpiId,
                                receiverName: eventQrConfig.qrReceiverName,
                                amount: payment.amount,
                                note: `Contribution Payment for ${eventType || "Event"}`,
                              }),
                              200
                            )
                      }
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
                      Payee: <strong>{eventQrConfig.qrReceiverName}</strong> ({eventQrConfig.qrUpiId})
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", mt: 0.2, display: "block" }}>
                      Scan with any UPI app to pay ₹{Number(payment.amount).toLocaleString("en-IN")} directly.
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ py: 1 }}>
                    <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 700, display: "block" }}>
                      Payment QR is not configured for this event type ({eventType || "Event"}).
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.66rem", mt: 0.3, display: "block" }}>
                      Configure UPI ID in Settings &gt; Payment QR Settings.
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })()}
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
