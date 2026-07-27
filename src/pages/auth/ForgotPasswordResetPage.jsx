import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CircularProgress,
  IconButton,
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
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ResetPasswordWithOtp } from "../../services/userService";
import loginBg from "../../assets/login_bg.png";
import rightLoginBg from "../../assets/right_login_bg.png";

export default function ForgotPasswordResetPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();

  const email = location.state?.email || localStorage.getItem("recovery_email") || "";
  const otp = location.state?.otp || localStorage.getItem("recovery_otp") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // Security Redirect: if page is accessed directly, send back to step 1
  useEffect(() => {
    if (!email || !otp) {
      toast.error("Please verify your OTP first.");
      navigate("/forgot-password", { replace: true });
    }
  }, [email, otp, navigate, toast]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordError("New password is required.");
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      toast.error("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    try {
      await ResetPasswordWithOtp(email, otp, newPassword.trim());
      toast.success("Password updated successfully! Redirecting you to Login...");
      
      // Clear recovery session storage items
      localStorage.removeItem("otp_sent_time");
      localStorage.removeItem("recovery_email");
      localStorage.removeItem("recovery_otp");

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Failed to reset password. Please request a new OTP.");
    } finally {
      setLoading(false);
    }
  };

  const isLengthValid = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  if (!email || !otp) return null;

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
            {!success && (
              <Box sx={{ width: "100%", mb: 5 }}>
                <Stepper activeStep={2} alternativeLabel>
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
            )}

            {!success ? (
              <Box component="form" onSubmit={handleResetPassword} sx={{ width: "100%" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                  New Password
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontWeight: 500, mb: 4.5 }}>
                  Set a solid, secure new password for your account recovery.
                </Typography>

                <Stack spacing={3.2}>
                  <AppInput
                    label="New Password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    error={!!passwordError}
                    helperText={passwordError}
                    placeholder="Enter new password"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small">
                            {showPassword ? <VisibilityOff sx={{ fontSize: "1.1rem" }} /> : <Visibility sx={{ fontSize: "1.1rem" }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <AppInput
                    label="Confirm Password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Verify new password"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockRoundedIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Card
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: theme.palette.mode === "dark" ? "rgba(231, 235, 247, 0.1)" : "rgba(74, 63, 107, 0.1)",
                      bgcolor: theme.palette.mode === "dark" ? "rgba(231, 235, 247, 0.02)" : "rgba(74, 63, 107, 0.02)"
                    }}
                  >
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "text.primary", mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
                      <InfoOutlinedIcon sx={{ fontSize: "0.95rem", color: "#7c3aed" }} />
                      Password Requirements:
                    </Typography>
                    <Stack spacing={0.6}>
                      <Typography sx={{ fontSize: "0.74rem", color: isLengthValid ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {isLengthValid ? "✓" : "✗"} Minimum 6 characters
                      </Typography>
                      <Typography sx={{ fontSize: "0.74rem", color: hasUppercase ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {hasUppercase ? "✓" : "✗"} At least 1 uppercase letter
                      </Typography>
                      <Typography sx={{ fontSize: "0.74rem", color: hasNumber ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {hasNumber ? "✓" : "✗"} At least 1 numeric digit
                      </Typography>
                      <Typography sx={{ fontSize: "0.74rem", color: passwordsMatch ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {passwordsMatch ? "✓" : "✗"} Passwords match perfectly
                      </Typography>
                    </Stack>
                  </Card>

                  <AppButton
                    type="submit"
                    size="large"
                    disabled={loading || !isLengthValid || !hasUppercase || !hasNumber || !passwordsMatch}
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
                    {loading ? <CircularProgress size={24} sx={{ color: "#ffffff" }} /> : "RESET PASSWORD"}
                  </AppButton>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
                <CheckCircleRoundedIcon sx={{ color: "#10b981", fontSize: "4.5rem", mb: 3 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", fontFamily: '"Outfit", sans-serif', mb: 1.5 }}>
                  Success!
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontWeight: 500, mb: 5, lineHeight: 1.6 }}>
                  Your password has been successfully restored. We're redirecting you back to the sign in page in a moment...
                </Typography>
                <AppButton
                  component={RouterLink}
                  to="/login"
                  size="large"
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
                  GO TO SIGN IN NOW
                </AppButton>
              </Box>
            )}
          </Card>
        </Box>
      </Card>
    </Box>
  );
}
