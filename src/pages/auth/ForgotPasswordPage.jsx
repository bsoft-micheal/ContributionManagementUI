import { useState } from "react";
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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAppToast } from "../../components/common/AppToast";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import { RequestForgotPasswordOtpAsync } from "../../services/userService";
import loginBg from "../../assets/login_bg.png";
import rightLoginBg from "../../assets/right_login_bg.png";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

export default function ForgotPasswordPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const toast = useAppToast();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError(COMMON_STRINGS.VALIDATION.REQUIRED || "Email address is required.");
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    setLoading(true);
    try {
      await RequestForgotPasswordOtpAsync(email.trim());
      toast.success(TOAST_MESSAGES.AUTH.OTP_SENT || "A password reset OTP has been sent to your email!");
      const sentTime = Date.now().toString();
      localStorage.setItem("otp_sent_time", sentTime);
      localStorage.setItem("recovery_email", email.trim());
      navigate("/forgot-password/verify", { state: { email: email.trim() } });
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Failed to request password reset OTP. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

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
              <Link component={RouterLink} to="/login" sx={{ display: "inline-flex", alignItems: "center", gap: 1, fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", textDecoration: "none", "&:hover": { color: "#5b21b6" } }}>
                <ArrowBackRoundedIcon sx={{ fontSize: "1.1rem" }} />
                Back to Login
              </Link>
            </Box>

            <Box sx={{ width: "100%", mb: 5 }}>
              <Stepper activeStep={0} alternativeLabel>
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

            <Box component="form" onSubmit={handleRequestOtp} sx={{ width: "100%" }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                Forgot Password?
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontWeight: 500, mb: 4.5 }}>
                Enter your registered email address and we'll send you a 6-digit OTP to reset your password.
              </Typography>

              <Stack spacing={3.5}>
                <AppInput
                  label="Email Address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  error={!!emailError}
                  helperText={emailError}
                  placeholder="Enter registered email"
                  required
                  type="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <AppButton
                  type="submit"
                  size="large"
                  disabled={loading}
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
                  {loading ? <CircularProgress size={24} sx={{ color: "#ffffff" }} /> : "SEND OTP CODE"}
                </AppButton>
              </Stack>
            </Box>
          </Card>
        </Box>
      </Card>
    </Box>
  );
}
