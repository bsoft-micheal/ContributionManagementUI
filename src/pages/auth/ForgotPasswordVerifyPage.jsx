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
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DialpadRoundedIcon from "@mui/icons-material/DialpadRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import { RequestForgotPasswordOtp, VerifyForgotPasswordOtp } from "../../services/userService";
import loginBg from "../../assets/login_bg.png";
import rightLoginBg from "../../assets/right_login_bg.png";

export default function ForgotPasswordVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();

  const email = location.state?.email || localStorage.getItem("recovery_email") || "";

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [timer, setTimer] = useState(() => {
    const sentTimeStr = localStorage.getItem("otp_sent_time");
    console.log("[ForgotPasswordVerifyPage] Mount - sentTimeStr from localStorage:", sentTimeStr);
    if (sentTimeStr) {
      const sentTime = parseInt(sentTimeStr, 10);
      const elapsed = Math.floor((Date.now() - sentTime) / 1000);
      const remaining = 900 - elapsed;
      console.log("[ForgotPasswordVerifyPage] Mount - Timer calculation details:", {
        sentTime,
        now: Date.now(),
        elapsed,
        remaining
      });
      return remaining > 0 ? remaining : 0;
    }
    console.log("[ForgotPasswordVerifyPage] Mount - No sentTimeStr found. Defaulting to 900s.");
    return 900;
  });
  
  const [isTimerActive, setIsTimerActive] = useState(() => {
    const sentTimeStr = localStorage.getItem("otp_sent_time");
    if (sentTimeStr) {
      const sentTime = parseInt(sentTimeStr, 10);
      const elapsed = Math.floor((Date.now() - sentTime) / 1000);
      const isActive = elapsed < 900;
      console.log("[ForgotPasswordVerifyPage] Mount - isTimerActive details:", {
        elapsed,
        isActive
      });
      return isActive;
    }
    return true;
  });

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
        const remaining = 900 - elapsed;
        if (remaining <= 0) {
          console.log("[ForgotPasswordVerifyPage] Tick - Timer expired!");
          setTimer(0);
          setIsTimerActive(false);
        } else {
          setTimer(remaining);
        }
      } else {
        console.log("[ForgotPasswordVerifyPage] Tick - sentTimeStr is missing from localStorage. Decrementing state.");
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
  }, [isTimerActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setOtpError("OTP code is required.");
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }
    if (otp.trim().length !== 6) {
      setOtpError("OTP must be exactly 6 digits.");
      toast.error("The OTP code must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    try {
      await VerifyForgotPasswordOtp(email, otp.trim());
      toast.success("OTP verified successfully! Please choose a new password.");
      setIsTimerActive(false);
      localStorage.setItem("recovery_otp", otp.trim());
      localStorage.removeItem("otp_sent_time");
      navigate("/forgot-password/reset", { state: { email, otp: otp.trim() } });
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await RequestForgotPasswordOtp(email);
      toast.success("A new password reset OTP has been sent successfully.");
      localStorage.setItem("otp_sent_time", Date.now().toString());
      setTimer(900);
      setIsTimerActive(true);
      setOtp("");
      setOtpError("");
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
        bgcolor: "#faf9ff",
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
            color: "#1e1a2e",
            textAlign: "center",
            borderRight: "1px solid rgba(74, 63, 107, 0.08)",
            position: "relative",
          }}
        >
          <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(245, 244, 251, 0.5)", pointerEvents: "none" }} />
          <Card
            sx={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255, 255, 255, 0.45)",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              boxShadow: "0 -8px 32px rgba(30, 26, 46, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
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
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.5, color: "#1e1a2e", fontFamily: '"Outfit", sans-serif' }}>
              Account Recovery
            </Typography>
            <Typography variant="body2" sx={{ color: "#5b5280", fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.6, maxWidth: "600px", mx: "auto" }}>
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
              background: "#ffffff",
              boxShadow: "0 24px 64px rgba(30, 26, 46, 0.06), 0 8px 24px rgba(30, 26, 46, 0.04)",
              border: "1px solid rgba(74, 63, 107, 0.06)",
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
                      <span style={{ fontSize: "0.75rem", fontFamily: '"Outfit", sans-serif', fontWeight: 700, color: "#1e1a2e" }}>
                        {label}
                      </span>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Box component="form" onSubmit={handleVerifyOtp} sx={{ width: "100%" }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#1e1a2e", fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                Verify OTP
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "#5b5280", fontWeight: 500, mb: 3 }}>
                Please enter the 6-digit OTP code sent to <strong style={{ color: "#1e1a2e" }}>{email}</strong>.
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: "8px", bgcolor: "rgba(124, 58, 237, 0.05)", border: "1px dashed rgba(124, 58, 237, 0.2)", mb: 4 }}>
                <TimerRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
                  OTP Expiry Countdown: {formatTime(timer)}
                </Typography>
              </Box>

              <Stack spacing={3.5}>
                <AppInput
                  label="Enter 6-Digit OTP"
                  value={otp}
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
                  disabled={loading || timer === 0}
                  fullWidth
                  sx={{
                    py: 1.5,
                    fontSize: "0.9rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #1e1a2e 0%, #2d2550 100%)",
                    boxShadow: "0 8px 24px rgba(30, 26, 46, 0.2)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #2d2550 0%, #1e1a2e 100%)",
                      transform: "translateY(-1px)",
                      boxShadow: "0 12px 32px rgba(30, 26, 46, 0.3)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: "#ffffff" }} /> : "VERIFY OTP CODE"}
                </AppButton>

                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "#5b5280", fontWeight: 500 }}>
                    Didn't receive the OTP?{" "}
                    <Link
                      component="button"
                      type="button"
                      onClick={handleResendOtp}
                      disabled={timer > 0 || loading}
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: timer > 0 ? "#9d96bd" : "#7c3aed",
                        textDecoration: "none",
                        cursor: timer > 0 ? "not-allowed" : "pointer",
                        "&:hover": { textDecoration: timer > 0 ? "none" : "underline" },
                      }}
                    >
                      Resend OTP {timer > 0 && `(Wait ${timer}s)`}
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
