import { useEffect, useState } from "react";
import { Alert, Box, Card, FormControlLabel, Link, Stack, Switch, Typography, IconButton, InputAdornment } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import logo from "../../assets/logo.png";
import loginBg from "../../assets/login_bg.png";
import rightLoginBg from "../../assets/right_login_bg.png";

export default function LoginPage() {
  const theme = useTheme();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA State
  const [showOtpField, setShowOtpField] = useState(false);
  const [otp, setOtp] = useState("");
  const [mfaStatusMessage, setMfaStatusMessage] = useState("");
  const [isLockedOut, setIsLockedOut] = useState(false);

  // ── Show session-expired toast when redirected by idle timer ─────────────────
  useEffect(() => {
    if (location.state?.sessionExpired) {
      toast.warning("You were logged out due to inactivity.");
      // Clear the state so refreshing the page doesn't re-show the message
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    
    if (showOtpField) {
      return handleOtpSubmit();
    }

    const newErrors = {};
    if (!form.email?.trim()) newErrors.email = "This field is required";
    if (!form.password?.trim()) newErrors.password = "This field is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    setLoading(true);
    try {
      const data = await login(form, keepSignedIn);
      if (data?.requiresTwoFactor) {
        setShowOtpField(true);
        setMfaStatusMessage("");
        setIsLockedOut(false);
        toast.info("Please check OTP code in Authenticator app.");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    if (isLockedOut) {
      toast.error(mfaStatusMessage || "MFA verification is temporarily locked.");
      return;
    }

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await verifyTwoFactor(form.email, otp, keepSignedIn);
      setMfaStatusMessage("");
      setIsLockedOut(false);
      navigate("/");
    } catch (error) {
      const msg = error.response?.data?.message ?? "Invalid OTP code.";
      setMfaStatusMessage(msg);
      if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("exceeded")) {
        setIsLockedOut(true);
      }
      setOtp("");
      document.getElementById("otp-input-0")?.focus();
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

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
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
          overflow: "hidden",
        }}
      >
        {/* LEFT PANEL: Premium Light-Purple Flat Collab Illustration and Checklist */}
        {/* LEFT PANEL: Fully covered by Flat Collab Illustration with Glass Welcome Card */}
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
          {/* Soft translucent white overlay over the background image to ensure text readability */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: theme.palette.mode === "dark" ? "rgba(15, 18, 32, 0.65)" : "rgba(245, 244, 251, 0.5)",
              pointerEvents: "none",
            }}
          />

          {/* Full-Width Bottom Glassmorphic Welcome Bar */}
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
            {/* Welcome Message */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                mb: 1.5,
                color: "text.primary",
                fontFamily: '"Outfit", sans-serif',
                fontSize: { xs: "1.15rem", sm: "1.25rem" },
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              Welcome to Contribution Management !!
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: "0.88rem",
                fontWeight: 500,
                lineHeight: 1.6,
                maxWidth: "600px",
                mx: "auto",
              }}
            >
              Log in to track social collections, manage event budgets, calculate allocations, and celebrate corporate milestones with full transparency.
            </Typography>
          </Card>
        </Box>

        {/* RIGHT PANEL: Floating Login Card Form Panel */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: `url(${rightLoginBg}) no-repeat center center`,
            backgroundSize: "cover",
            p: { xs: 2.5, sm: 4, md: 6 },
            minHeight: "100vh",
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
            {/* Branding Container */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 6 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "10px",
                  bgcolor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 16px rgba(74, 63, 107, 0.1), inset 0 0 0 1px rgba(74, 63, 107, 0.05)",
                  p: 0.7,
                }}
              >
                <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </Box>
              <Stack spacing={0} sx={{ textAlign: "left" }}>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, color: "text.primary", fontSize: "0.85rem", letterSpacing: "0.02em", lineHeight: 1.1 }}>
                  CONTRIBUTION
                </Typography>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, color: "#7c3aed", fontSize: "0.85rem", letterSpacing: "0.02em", lineHeight: 1.1 }}>
                  MANAGEMENT
                </Typography>
              </Stack>
            </Box>

            {/* Header Text */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: "text.primary",
                fontFamily: '"Outfit", sans-serif',
                mb: 0.8,
                textAlign: "left",
              }}
            >
              Sign In
            </Typography>
            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "text.secondary",
                fontWeight: 500,
                mb: 4.5,
                textAlign: "left",
              }}
            >
              Enter your credentials to access the system.
            </Typography>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
              <Stack spacing={3.2}>
                {!showOtpField ? (
                  <>
                    <AppInput
                      label="Email Address"
                      value={form.email}
                      onChange={(e) => {
                        setForm((c) => ({ ...c, email: e.target.value }));
                        if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      error={!!errors.email}
                      helperText={errors.email}
                      placeholder="Enter Email"
                      required
                    />
                    
                    <AppInput
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => {
                        setForm((c) => ({ ...c, password: e.target.value }));
                        if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      error={!!errors.password}
                      helperText={errors.password}
                      placeholder="Enter Password"
                      required
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword((prev) => !prev)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                              sx={{
                                color: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.7)"
                                    : "text.secondary",
                              }}
                            >
                              {showPassword ? (
                                <VisibilityOff sx={{ fontSize: "1.15rem" }} />
                              ) : (
                                <Visibility sx={{ fontSize: "1.15rem" }} />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Forgot Password Link Row */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        width: "100%",
                        mt: -1,
                      }}
                    >
                      <Link
                        component={RouterLink}
                        to="/forgot-password"
                        sx={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#7c3aed",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        Forgot Password ?
                      </Link>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ mb: 3 }}>
                      {mfaStatusMessage && (
                        <Alert
                          severity={isLockedOut ? "error" : "warning"}
                          sx={{
                            mb: 2,
                            fontSize: "0.82rem",
                            borderRadius: "8px",
                            textAlign: "left",
                            fontWeight: 600,
                          }}
                        >
                          {mfaStatusMessage}
                        </Alert>
                      )}
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, mb: 1.5, textAlign: "left" }}>
                        Enter the 6-digit code from your Authenticator App:
                      </Typography>
                      <Box sx={{ display: "flex", gap: { xs: 1, sm: 1.5 }, justifyContent: "space-between" }}>
                        {Array(6).fill(0).map((_, i) => (
                          <input
                            key={i}
                            id={`otp-input-${i}`}
                            type="text"
                            maxLength={1}
                            disabled={loading || isLockedOut}
                            value={otp[i] || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              let newOtp = otp.split("");
                              if (val) {
                                newOtp[i] = val;
                                setOtp(newOtp.join(""));
                                if (i < 5) document.getElementById(`otp-input-${i + 1}`).focus();
                              } else {
                                newOtp[i] = "";
                                setOtp(newOtp.join(""));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !otp[i] && i > 0) {
                                document.getElementById(`otp-input-${i - 1}`).focus();
                              }
                            }}
                            style={{
                              width: "100%",
                              aspectRatio: "1",
                              textAlign: "center",
                              fontSize: "1.5rem",
                              fontWeight: "bold",
                              borderRadius: "12px",
                              border: isLockedOut
                                ? "2px solid rgba(239, 68, 68, 0.4)"
                                : "2px solid rgba(124, 58, 237, 0.2)",
                              outline: "none",
                              backgroundColor: isLockedOut
                                ? "rgba(239, 68, 68, 0.05)"
                                : "transparent",
                              color: "inherit",
                              cursor: isLockedOut ? "not-allowed" : "text",
                              opacity: isLockedOut ? 0.7 : 1,
                            }}
                            onFocus={(e) => { if (!isLockedOut) e.target.style.borderColor = "#7c3aed"; }}
                            onBlur={(e) => { if (!isLockedOut) e.target.style.borderColor = isLockedOut ? "rgba(239, 68, 68, 0.4)" : "rgba(124, 58, 237, 0.2)"; }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </>
                )}

                {/* Submit Button */}
                <AppButton
                  type="submit"
                  size="large"
                  disabled={loading || (showOtpField && isLockedOut)}
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
                  {loading ? (showOtpField ? "Verifying..." : "Signing in...") : (showOtpField ? (isLockedOut ? "LOCKED OUT" : "VERIFY OTP") : "LOGIN")}
                </AppButton>

                {/* Back to Login Button for OTP step */}
                {showOtpField && (
                  <AppButton
                    type="button"
                    variant="outlined"
                    size="large"
                    disabled={loading}
                    fullWidth
                    onClick={() => {
                      setShowOtpField(false);
                      setOtp("");
                      setMfaStatusMessage("");
                      setIsLockedOut(false);
                    }}
                    sx={{
                      mt: 1.5,
                      py: 1.1,
                      fontSize: "0.82rem",
                      borderRadius: "8px",
                      borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(231, 235, 247, 0.2)" : "rgba(74, 63, 107, 0.2)",
                      color: "text.primary",
                      "&:hover": {
                        borderColor: "#7c3aed",
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(124, 58, 237, 0.08)" : "rgba(124, 58, 237, 0.04)",
                      },
                    }}
                  >
                    BACK TO LOGIN
                  </AppButton>
                )}
              </Stack>
            </Box>

          </Card>
        </Box>
      </Card>
    </Box>
  );
}
