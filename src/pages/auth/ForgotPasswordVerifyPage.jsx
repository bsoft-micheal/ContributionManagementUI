import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CircularProgress,
  InputAdornment,
  Link,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DialpadRoundedIcon from "@mui/icons-material/DialpadRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import { RequestForgotPasswordOtpAsync, VerifyForgotPasswordOtpAsync } from "../../services/userService";
import { getSystemSettingsAsync } from "../../services/settingsService";
import loginBg from "../../assets/login_bg.png";
import rightLoginBg from "../../assets/right_login_bg.png";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

export default function ForgotPasswordVerifyPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();

  const email = location.state?.email || localStorage.getItem("recovery_email") || "";

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptsMsg, setAttemptsMsg] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [expiryDuration, setExpiryDuration] = useState(600);
  
  const [timer, setTimer] = useState(() => {
    const sentTimeStr = localStorage.getItem("otp_sent_time");
    if (sentTimeStr) {
      const sentTime = parseInt(sentTimeStr, 10);
      const elapsed = Math.floor((Date.now() - sentTime) / 1000);
      const remaining = 600 - elapsed;
      return remaining > 0 ? remaining : 0;
    }
    return 600;
  });
  
  const [isTimerActive, setIsTimerActive] = useState(() => {
    const sentTimeStr = localStorage.getItem("otp_sent_time");
    if (sentTimeStr) {
      const sentTime = parseInt(sentTimeStr, 10);
      const elapsed = Math.floor((Date.now() - sentTime) / 1000);
      return elapsed < 600;
    }
    return true;
  });

  // Fetch dynamic OTP expiry from system settings
  useEffect(() => {
    async function loadConfig() {
      try {
        const sys = await getSystemSettingsAsync();
        const mins = parseInt(sys?.otpExpiry, 10);
        if (mins > 0) {
          const secs = mins * 60;
          setExpiryDuration(secs);
          const sentTimeStr = localStorage.getItem("otp_sent_time");
          if (sentTimeStr) {
            const sentTime = parseInt(sentTimeStr, 10);
            const elapsed = Math.floor((Date.now() - sentTime) / 1000);
            const remaining = secs - elapsed;
            setTimer(remaining > 0 ? remaining : 0);
            setIsTimerActive(remaining > 0);
          } else {
            setTimer(secs);
          }
        }
      } catch (err) {
        // Ignored fallback
      }
    }
    loadConfig();
  }, []);

  // Security Redirect: if page is accessed directly, send back to step 1
  useEffect(() => {
    if (!email) {
      toast.error("Please start the recovery process by entering your email.");
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate, toast]);

  // Countdown timer logic
  useEffect(() => {
    if (!isTimerActive) return;

    const interval = setInterval(() => {
      const sentTimeStr = localStorage.getItem("otp_sent_time");
      if (sentTimeStr) {
        const sentTime = parseInt(sentTimeStr, 10);
        const elapsed = Math.floor((Date.now() - sentTime) / 1000);
        const remaining = expiryDuration - elapsed;
        if (remaining <= 0) {
          setTimer(0);
          setIsTimerActive(false);
        } else {
          setTimer(remaining);
        }
      } else {
        setTimer((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, expiryDuration]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isLocked) {
      toast.error("Maximum OTP attempts exceeded. Please request a new OTP.");
      return;
    }
    if (!otp.trim()) {
      setOtpError(COMMON_STRINGS.VALIDATION.REQUIRED || "OTP code is required.");
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }
    if (otp.trim().length !== 6) {
      setOtpError("OTP must be exactly 6 digits.");
      toast.error(TOAST_MESSAGES.AUTH.OTP_INVALID || "The OTP code must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    try {
      await VerifyForgotPasswordOtpAsync(email, otp.trim());
      toast.success(TOAST_MESSAGES.AUTH.OTP_VERIFIED || "OTP verified successfully! Please choose a new password.");
      setIsTimerActive(false);
      localStorage.setItem("recovery_otp", otp.trim());
      localStorage.removeItem("otp_sent_time");
      navigate("/forgot-password/reset", { state: { email, otp: otp.trim() } });
    } catch (error) {
      const msg = error.response?.data?.message || TOAST_MESSAGES.AUTH.OTP_INVALID || "Invalid or expired OTP. Please try again.";
      toast.error(msg);
      setAttemptsMsg(msg);
      if (msg.toLowerCase().includes("maximum otp attempts exceeded") || msg.toLowerCase().includes("maximum attempts")) {
        setIsLocked(true);
        setOtpError("Maximum attempts reached.");
      } else {
        setOtpError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await RequestForgotPasswordOtpAsync(email);
      toast.success(TOAST_MESSAGES.AUTH.OTP_SENT || "A new password reset OTP has been sent successfully.");
      localStorage.setItem("otp_sent_time", Date.now().toString());
      setTimer(expiryDuration);
      setIsTimerActive(true);
      setOtp("");
      setOtpError("");
      setAttemptsMsg("");
      setIsLocked(false);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "stretch",
        bgcolor: "background.default",
        overflowY: "auto",
      }}
    >
      <Card
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          width: "100%",
          minHeight: "100vh",
          height: { xs: "auto", md: "100vh" },
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
          overflow: "hidden",
        }}
      >
        {/* LEFT PANEL */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            width: "50%",
            background: `url(${loginBg}) no-repeat center center`,
            backgroundSize: "cover",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "center",
            p: 6,
            color: "text.primary",
            textAlign: "center",
            borderRight: "1px solid",
            borderColor: "divider",
            position: "relative",
          }}
        >
          <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: theme.palette.mode === "dark" ? "rgba(15, 18, 32, 0.65)" : "rgba(245, 244, 251, 0.5)", pointerEvents: "none" }} />
          <Card
            sx={{
              background: theme.palette.mode === "dark" ? "rgba(23, 27, 45, 0.75)" : "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: theme.palette.mode === "dark" ? "1px solid rgba(231, 235, 247, 0.12)" : "1px solid rgba(255, 255, 255, 0.45)",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              boxShadow: theme.palette.mode === "dark"
                ? "0 -8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                : "0 -8px 32px rgba(30, 26, 46, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
              p: { xs: 3, sm: 4 },
              borderRadius: 0,
              width: "100%",
              textAlign: "center",
              position: "absolute",
              bottom: 0,
              left: 0,
              zIndex: 1,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.5, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
              Account Recovery
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.6, maxWidth: "600px", mx: "auto" }}>
              Securely restore your access using our rapid, mail-integrated verification wizard.
            </Typography>
          </Card>
        </Box>

        {/* RIGHT PANEL */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: `url(${rightLoginBg}) no-repeat center center`,
            backgroundSize: "cover",
            p: { xs: 2.5, sm: 4, md: 6 },
            height: { xs: "auto", md: "100vh" },
            minHeight: { xs: "100vh", md: "auto" },
            overflowY: "auto",
          }}
        >
          <Card
            sx={{
              my: "auto",
              background: theme.palette.mode === "dark" ? theme.palette.background.paper : "#ffffff",
              boxShadow: theme.palette.mode === "dark"
                ? "0 24px 64px rgba(0, 0, 0, 0.28), 0 8px 24px rgba(0, 0, 0, 0.2)"
                : "0 24px 64px rgba(30, 26, 46, 0.06), 0 8px 24px rgba(30, 26, 46, 0.04)",
              border: "1px solid",
              borderColor: theme.palette.mode === "dark" ? "rgba(231, 235, 247, 0.08)" : "rgba(74, 63, 107, 0.06)",
              borderRadius: "24px",
              p: { xs: 3.5, sm: 5 },
              width: "90%",
              maxWidth: "440px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Box sx={{ mb: 4, mt: -1 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                onClick={() => {
                  localStorage.removeItem("otp_sent_time");
                  localStorage.removeItem("recovery_email");
                  localStorage.removeItem("recovery_otp");
                }}
                sx={{ display: "inline-flex", alignItems: "center", gap: 1, fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", textDecoration: "none", "&:hover": { color: "#5b21b6" } }}
              >
                <ArrowBackRoundedIcon sx={{ fontSize: "1.1rem" }} />
                Back to Email Step
              </Link>
            </Box>

            <Box sx={{ width: "100%", mb: 5 }}>
              <Stepper activeStep={1} alternativeLabel>
                {["Email", "Verify OTP", "New Password"].map((label) => (
                  <Step key={label}>
                    <StepLabel StepIconProps={{ sx: { "&.Mui-active": { color: "#7c3aed" }, "&.Mui-completed": { color: "#7c3aed" } } }}>
                      <span style={{ fontSize: "0.75rem", fontFamily: '"Outfit", sans-serif', fontWeight: 700, color: theme.palette.text.primary }}>
                        {label}
                      </span>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Box component="form" onSubmit={handleVerifyOtp} sx={{ width: "100%" }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                Verify OTP
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontWeight: 500, mb: 3 }}>
                Please enter the 6-digit OTP code sent to <strong style={{ color: theme.palette.text.primary }}>{email}</strong>.
              </Typography>

              {/* Attempts feedback banner */}
              {attemptsMsg && (
                <Box
                  sx={{
                    mb: 2.5,
                    p: 1.5,
                    borderRadius: "8px",
                    bgcolor: isLocked ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                    border: `1px solid ${isLocked ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                    color: isLocked ? "#dc2626" : "#d97706",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {attemptsMsg}
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: "8px", bgcolor: theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.12)" : "rgba(124, 58, 237, 0.05)", border: "1px dashed rgba(124, 58, 237, 0.2)", mb: 4 }}>
                <TimerRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
                  OTP Expiry Countdown: {formatTime(timer)}
                </Typography>
              </Box>

              <Stack spacing={3.5}>
                <AppInput
                  label="Enter 6-Digit OTP"
                  value={otp}
                  disabled={loading || isLocked}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                    if (otpError) setOtpError("");
                  }}
                  error={!!otpError}
                  helperText={otpError}
                  placeholder="X X X X X X"
                  required
                  inputProps={{ style: { textAlign: "center", letterSpacing: "12px", fontSize: "1.1rem", fontWeight: "900" } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DialpadRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <AppButton
                  type="submit"
                  size="large"
                  disabled={loading || timer === 0 || isLocked}
                  fullWidth
                  sx={{
                    py: 1.1,
                    fontSize: "0.82rem",
                    borderRadius: "8px",
                    background: (theme) => theme.palette.mode === "dark"
                      ? "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)"
                      : "linear-gradient(135deg, #1e1a2e 0%, #2d2550 100%)",
                    boxShadow: (theme) => theme.palette.mode === "dark"
                      ? "0 8px 24px rgba(124, 58, 237, 0.3)"
                      : "0 8px 24px rgba(30, 26, 46, 0.2)",
                    "&:hover": {
                      background: (theme) => theme.palette.mode === "dark"
                        ? "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)"
                        : "linear-gradient(135deg, #2d2550 0%, #1e1a2e 100%)",
                      transform: "translateY(-1px)",
                      boxShadow: (theme) => theme.palette.mode === "dark"
                        ? "0 12px 32px rgba(124, 58, 237, 0.4)"
                        : "0 12px 32px rgba(30, 26, 46, 0.3)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: "#ffffff" }} /> : isLocked ? "ATTEMPTS EXCEEDED" : "VERIFY OTP CODE"}
                </AppButton>

                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", fontWeight: 500 }}>
                    Didn't receive the OTP?{" "}
                    <Link
                      component="button"
                      type="button"
                      onClick={handleResendOtp}
                      disabled={(!isLocked && timer > 0) || loading}
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: (!isLocked && timer > 0)
                          ? (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "#9d96bd") 
                          : "#7c3aed",
                        textDecoration: "none",
                        cursor: (!isLocked && timer > 0) ? "not-allowed" : "pointer",
                        "&:hover": { textDecoration: (!isLocked && timer > 0) ? "none" : "underline" },
                      }}
                    >
                      Resend OTP {!isLocked && timer > 0 && `(Wait ${timer}s)`}
                    </Link>
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Box>
      </Card>
    </Box>
  );
}
