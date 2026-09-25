import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Divider,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import {
  PaymentRounded as PaymentIcon,
  CheckCircleOutline as CheckCircleIcon,
  ContentCopy as CopyIcon,
  QrCode2 as QrCodeIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ReceiptLong as ReceiptIcon,
  InfoOutlined as InfoIcon,
  AccountBalanceWallet as WalletIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import AppDateInput from "../../components/common/AppDateInput";
import AppTextArea from "../../components/common/AppTextArea";
import { useAppToast } from "../../components/common/AppToast";
import {
  getPaymentContextAsync,
  submitPaymentProofAsync,
} from "../../services/paymentService";

const PAYMENT_MODES = [
  { label: "Google Pay", value: "GPay", color: "#2563eb" },
  { label: "PhonePe", value: "PhonePe", color: "#7c3aed" },
  { label: "Paytm", value: "Paytm", color: "#0284c7" },
  { label: "BHIM / UPI", value: "UPI", color: "#ea580c" },
  { label: "Bank Transfer / IMPS", value: "Bank Transfer", color: "#059669" },
];

export default function SubmitPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useAppToast();

  const eventIdParam = searchParams.get("eventId");
  const memberIdParam = searchParams.get("memberId");
  const amountParam = searchParams.get("amount");

  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedTxn, setSubmittedTxn] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    eventId: eventIdParam || "",
    memberId: memberIdParam || "",
    eventName: "",
    memberName: "",
    email: "",
    amount: amountParam || "",
    paymentMode: "GPay",
    utr: "",
    paymentDate: dayjs(),
    notes: "",
    screenshot: "",
  });

  const [upiSettings, setUpiSettings] = useState({
    upiId: "danielrobertanto604@okicici",
    receiverName: "Daniel A",
    qrImage: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadContext = async () => {
      try {
        setLoadingContext(true);
        const res = await getPaymentContextAsync({
          eventId: eventIdParam || undefined,
          memberId: memberIdParam || undefined,
        });

        if (res) {
          setFormData((prev) => ({
            ...prev,
            eventName: res.eventName || prev.eventName,
            memberName: res.memberName || prev.memberName,
            email: res.email || prev.email,
            amount: res.amount ? String(res.amount) : (amountParam || prev.amount),
          }));

          setUpiSettings({
            upiId: res.qrUpiId || "danielrobertanto604@okicici",
            receiverName: res.qrReceiverName || "Daniel A",
            qrImage: res.qrImage || "",
          });
        }
      } catch (err) {
        console.warn("Could not load payment context:", err);
      } finally {
        setLoadingContext(false);
      }
    };

    loadContext();
  }, [eventIdParam, memberIdParam, amountParam]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiSettings.upiId);
    toast.success("UPI ID copied to clipboard!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, screenshot: reader.result }));
      toast.success("Payment screenshot attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setFormData((prev) => ({ ...prev, screenshot: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.memberName.trim()) errs.memberName = "Member name is required";
    if (!formData.eventName.trim()) errs.eventName = "Event name is required";
    if (!formData.amount || Number(formData.amount) <= 0)
      errs.amount = "Valid contribution amount is required";
    if (!formData.utr.trim()) {
      errs.utr = "UPI Reference / UTR Number is required";
    } else if (formData.utr.trim().length < 6) {
      errs.utr = "UTR Number must be at least 6 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        eventId: formData.eventId || undefined,
        memberId: formData.memberId || undefined,
        memberName: formData.memberName.trim(),
        eventName: formData.eventName.trim(),
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        utr: formData.utr.trim(),
        paymentDate: formData.paymentDate
          ? formData.paymentDate.toISOString()
          : new Date().toISOString(),
        screenshot: formData.screenshot || null,
        notes: formData.notes.trim() || null,
      };

      const res = await submitPaymentProofAsync(payload);
      setSubmittedTxn(res || payload);
      setIsSuccess(true);
      toast.success("Payment proof submitted successfully!");
    } catch (err) {
      console.error("Submission failed:", err);
      const msg = err.response?.data?.message || "Failed to submit payment proof. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const upiIntentUri = `upi://pay?pa=${upiSettings.upiId}&pn=${encodeURIComponent(
    upiSettings.receiverName
  )}&am=${formData.amount || "0"}&cu=INR&tn=${encodeURIComponent(
    "Contribution for " + (formData.eventName || "Event")
  )}`;

  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
    upiIntentUri
  )}`;

  if (loadingContext) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f8fafc",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress sx={{ color: "#7c3aed" }} />
          <Typography variant="body2" color="text.secondary">
            Loading payment details...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f1f5f9",
        py: { xs: 3, md: 6 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="md">
        {/* Top Header Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            mb: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, #4a3f6b 0%, #2d2550 100%)",
            color: "#ffffff",
            boxShadow: "0 10px 25px rgba(74, 63, 107, 0.15)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "#cbd5e1",
                  letterSpacing: 1.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                TEAM CONTRIBUTION SYSTEM
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                Payment Confirmation & UTR Submission
              </Typography>
              <Typography variant="body2" sx={{ color: "#e2e8f0", mt: 0.5 }}>
                Scan the QR code, complete payment on UPI, and submit your 12-digit UTR reference number.
              </Typography>
            </Box>
            <Chip
              icon={<ReceiptIcon sx={{ color: "#ffffff !important" }} />}
              label="Instant Audit Sync"
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontWeight: 700,
                backdropFilter: "blur(6px)",
              }}
            />
          </Stack>
        </Paper>

        {isSuccess ? (
          /* Success Screen */
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 3,
              bgcolor: "#ffffff",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              border: "1.5px solid #dcfce7",
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 44 }} />
            </Box>

            <Typography variant="h5" fontWeight={800} color="#166534" gutterBottom>
              Payment Proof Submitted Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: "auto", mb: 3 }}>
              Your transaction has been recorded with status <strong>Pending Verification</strong>.
              Once an administrator reviews and verifies the reference number, your contribution will automatically show as <strong>Paid</strong>.
            </Typography>

            <Card
              variant="outlined"
              sx={{
                maxWidth: 480,
                mx: "auto",
                bgcolor: "#f8fafc",
                borderRadius: 2.5,
                textAlign: "left",
                mb: 4,
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Transaction ID:
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="#7c3aed">
                      {submittedTxn?.txnNumber || "Pending Assignment"}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Event:
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {submittedTxn?.eventName || formData.eventName}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Member:
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {submittedTxn?.memberName || formData.memberName}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Amount Paid:
                    </Typography>
                    <Typography variant="caption" fontWeight={800} color="#16a34a" sx={{ fontSize: "0.9rem" }}>
                      Rs.{Number(submittedTxn?.amount || formData.amount).toFixed(2)}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      UTR / Ref No:
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="#1e293b">
                      {submittedTxn?.utr || formData.utr}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={2} justifyContent="center">
              <AppButton
                variant="outlined"
                onClick={() => {
                  setIsSuccess(false);
                  setFormData((prev) => ({ ...prev, utr: "", screenshot: "", notes: "" }));
                }}
              >
                Submit Another Payment
              </AppButton>
              <AppButton variant="primary" onClick={() => navigate("/my-contributions")}>
                Go to Portal
              </AppButton>
            </Stack>
          </Paper>
        ) : (
          /* Payment & Submission Form */
          <Grid container spacing={3}>
            {/* Left Column: UPI QR Code Card */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "#ffffff",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Chip
                  icon={<QrCodeIcon sx={{ fontSize: "16px !important" }} />}
                  label="Scan to Pay via UPI"
                  sx={{
                    bgcolor: "#ede9fe",
                    color: "#6d28d9",
                    fontWeight: 700,
                    mb: 2,
                  }}
                />

                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "#ffffff",
                    borderRadius: 3,
                    border: "2px solid #7c3aed",
                    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.12)",
                    mb: 2,
                  }}
                >
                  <img
                    src={dynamicQrUrl}
                    alt="UPI Payment QR Code"
                    width="200"
                    height="200"
                    style={{ display: "block", borderRadius: "8px" }}
                  />
                </Box>

                <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
                  Payee: {upiSettings.receiverName}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    bgcolor: "#f1f5f9",
                    py: 0.6,
                    px: 1.5,
                    borderRadius: 2,
                    mt: 1,
                    mb: 2,
                    maxWidth: "100%",
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="#475569"
                    sx={{
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                    }}
                  >
                    {upiSettings.upiId}
                  </Typography>
                  <Tooltip title="Copy UPI ID">
                    <IconButton size="small" onClick={handleCopyUpi} sx={{ p: 0.3 }}>
                      <CopyIcon sx={{ fontSize: 16, color: "#64748b" }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                  Compatible with Google Pay, PhonePe, Paytm, BHIM, or any banking UPI app.
                </Typography>

                <AppButton
                  variant="primary"
                  href={upiIntentUri}
                  sx={{
                    width: "100%",
                    mt: "auto",
                    bgcolor: "#7c3aed",
                    "&:hover": { bgcolor: "#6d28d9" },
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16, mr: 1 }} />
                  Open UPI App (Rs.{Number(formData.amount || 0).toFixed(2)})
                </AppButton>
              </Paper>
            </Grid>

            {/* Right Column: Submission Form */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  p: { xs: 2.5, sm: 3.5 },
                  borderRadius: 3,
                  bgcolor: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography variant="h6" fontWeight={800} color="#1e293b" sx={{ mb: 0.5 }}>
                  Submit Payment Details
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Please provide your transaction UTR / reference number after paying.
                </Typography>

                <Grid container spacing={2}>
                  {/* Event Name */}
                  <Grid item xs={12} sm={6}>
                    <AppInput
                      label="Event Name"
                      name="eventName"
                      required
                      value={formData.eventName}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, eventName: e.target.value }))
                      }
                      error={Boolean(errors.eventName)}
                      helperText={errors.eventName}
                      placeholder="e.g. Birthday Celebration"
                    />
                  </Grid>

                  {/* Member Name */}
                  <Grid item xs={12} sm={6}>
                    <AppInput
                      label="Contributor / Member Name"
                      name="memberName"
                      required
                      value={formData.memberName}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, memberName: e.target.value }))
                      }
                      error={Boolean(errors.memberName)}
                      helperText={errors.memberName}
                      placeholder="Your full name"
                    />
                  </Grid>

                  {/* Contribution Amount */}
                  <Grid item xs={12} sm={6}>
                    <AppInput
                      label="Contribution Amount (Rs.)"
                      name="amount"
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, amount: e.target.value }))
                      }
                      error={Boolean(errors.amount)}
                      helperText={errors.amount}
                      placeholder="0.00"
                    />
                  </Grid>

                  {/* Payment Date */}
                  <Grid item xs={12} sm={6}>
                    <AppDateInput
                      label="Payment Date"
                      value={formData.paymentDate}
                      onChange={(val) =>
                        setFormData((p) => ({ ...p, paymentDate: val }))
                      }
                    />
                  </Grid>

                  {/* Payment Mode Selector */}
                  <Grid item xs={12}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      sx={{ mb: 1, display: "block" }}
                    >
                      Payment Method Used *
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {PAYMENT_MODES.map((mode) => {
                        const isSelected = formData.paymentMode === mode.value;
                        return (
                          <Chip
                            key={mode.value}
                            label={mode.label}
                            onClick={() =>
                              setFormData((p) => ({ ...p, paymentMode: mode.value }))
                            }
                            sx={{
                              fontWeight: 700,
                              cursor: "pointer",
                              bgcolor: isSelected ? mode.color : "transparent",
                              color: isSelected ? "#ffffff" : "#475569",
                              border: `1.5px solid ${
                                isSelected ? mode.color : "#cbd5e1"
                              }`,
                              "&:hover": {
                                bgcolor: isSelected ? mode.color : "#f1f5f9",
                              },
                            }}
                          />
                        );
                      })}
                    </Stack>
                  </Grid>

                  {/* 12-Digit UPI Reference / UTR */}
                  <Grid item xs={12}>
                    <AppInput
                      label="UPI Reference / UTR Number (12 Digits)"
                      name="utr"
                      required
                      value={formData.utr}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, utr: e.target.value }))
                      }
                      error={Boolean(errors.utr)}
                      helperText={
                        errors.utr ||
                        "Find this 12-digit number in your Google Pay, PhonePe, or Paytm receipt."
                      }
                      placeholder="e.g. 426189345612"
                    />
                  </Grid>

                  {/* Optional Screenshot Upload */}
                  <Grid item xs={12}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      sx={{ mb: 1, display: "block" }}
                    >
                      Payment Screenshot / Slip (Optional)
                    </Typography>

                    {formData.screenshot ? (
                      <Box
                        sx={{
                          position: "relative",
                          display: "inline-block",
                          border: "1.5px solid #cbd5e1",
                          borderRadius: 2,
                          p: 1,
                          bgcolor: "#f8fafc",
                        }}
                      >
                        <img
                          src={formData.screenshot}
                          alt="Uploaded payment slip"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 180,
                            borderRadius: 6,
                            display: "block",
                          }}
                        />
                        <Tooltip title="Remove Screenshot">
                          <IconButton
                            size="small"
                            onClick={removeScreenshot}
                            sx={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              bgcolor: "rgba(239, 68, 68, 0.9)",
                              color: "#ffffff",
                              "&:hover": { bgcolor: "#dc2626" },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box
                        component="label"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1.5,
                          p: 2,
                          border: "2px dashed #cbd5e1",
                          borderRadius: 2.5,
                          bgcolor: "#fafafa",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "#7c3aed",
                            bgcolor: "#f5f3ff",
                          },
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleFileUpload}
                        />
                        <UploadIcon sx={{ color: "#7c3aed" }} />
                        <Typography variant="body2" color="text.secondary">
                          <strong>Click to upload</strong> payment screenshot or receipt
                        </Typography>
                      </Box>
                    )}
                  </Grid>

                  {/* Notes / Remarks */}
                  <Grid item xs={12}>
                    <AppTextArea
                      label="Additional Notes (Optional)"
                      name="notes"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, notes: e.target.value }))
                      }
                      placeholder="e.g. Paid via Daniel GPay account"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3.5, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
                  <AppButton
                    variant="primary"
                    type="submit"
                    disabled={submitting}
                    sx={{
                      minWidth: 180,
                      py: 1.2,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                    }}
                  >
                    {submitting ? (
                      <CircularProgress size={20} sx={{ color: "#ffffff" }} />
                    ) : (
                      "Submit Payment Proof"
                    )}
                  </AppButton>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
