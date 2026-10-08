import { useEffect, useState } from "react";
import { Alert, Box, Card, FormControlLabel, Link, Stack, Switch, TextField, Typography, IconButton, InputAdornment } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AppButton from "../../components/common/AppButton";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import logo from "../../assets/logo_image.png";
import loginBg from "../../assets/login_bg.png";
import rightLoginBg from "../../assets/right_login_bg.png";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";
import { getRightsForPath, getFirstAccessiblePath } from "../../utils/rightsHelper";

export default function LoginPage() {
  const theme = useTheme();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { isAuthenticated, authState, login, verifyTwoFactor, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA State
  const [showOtpField, setShowOtpField] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaStatusMessage, setMfaStatusMessage] = useState("");
  const [isLockedOut, setIsLockedOut] = useState(false);

  // If already authenticated, redirect to Dashboard landing page
  useEffect(() => {
    if (isAuthenticated) {
      // 1. Explicit switch/logout parameter in URL
      const params = new URLSearchParams(location.search);
      if (params.get("switch") === "true" || params.get("logout") === "true") {
        logout();
        return;
      }

      const activeRole = authState?.role || authState?.roleName;
      const firstAllowed = getFirstAccessiblePath(activeRole);

      // 2. If all permissions are denied (user is locked out), clear the session so the login form displays!
      if (!firstAllowed) {
        logout();
        toast.error("Your account has no accessible permissions. Please log in with an authorized account.");
        return;
      }

      // Always land on Dashboard "/" (or first allowed route if "/" is restricted)
      const destRights = getRightsForPath("/", activeRole);
      const target = destRights.deny ? firstAllowed : "/";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, authState]);

  // ── Show session-expired toast when redirected by idle timer ─────────────────
  useEffect(() => {
    if (location.state?.sessionExpired) {
      toast.warning(TOAST_MESSAGES.AUTH.SESSION_EXPIRED || "You were logged out due to inactivity.");
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
    if (!form.email?.trim()) newErrors.email = COMMON_STRINGS.VALIDATION.USERNAME_OR_EMAIL_REQUIRED || COMMON_STRINGS.VALIDATION.REQUIRED;
    if (!form.password?.trim()) newErrors.password = COMMON_STRINGS.VALIDATION.PASSWORD_REQUIRED || COMMON_STRINGS.VALIDATION.REQUIRED;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    setLoading(true);
    try {
      const data = await login(form, keepSignedIn);
      if (data?.requiresTwoFactor) {
        setShowOtpField(true);
        setResolvedEmail(data?.email || form.email);
        setMfaStatusMessage("");
        setIsLockedOut(false);
        toast.info(TOAST_MESSAGES.AUTH.TWO_FACTOR_REQUIRED || "Please check OTP code in Authenticator app.");
      } else {
        navigate("/", { replace: true });
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.Message ||
        (error.response?.data?.errors
          ? (typeof error.response.data.errors === "object"
              ? Object.values(error.response.data.errors).flat().join(", ")
              : String(error.response.data.errors))
          : null) ||
        error.response?.data?.title ||
        TOAST_MESSAGES.AUTH.LOGIN_FAILED;

      toast.error(errorMsg);

      const lowerMsg = String(errorMsg || "").toLowerCase();
      if (lowerMsg.includes("password")) {
        setErrors({ password: errorMsg });
      } else if (lowerMsg.includes("username") || lowerMsg.includes("email")) {
        setErrors({ email: errorMsg });
      }
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
      await verifyTwoFactor(resolvedEmail || form.email, otp, keepSignedIn);
      setMfaStatusMessage("");
      setIsLockedOut(false);
      navigate("/", { replace: true });
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
                fontWeight: 700,
                mb: 1.5,
                color: "text.primary",
                fontSize: { xs: "1.2rem", sm: "1.35rem" },
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap",
              }}
            >
              {COMMON_STRINGS.AUTH.WELCOME_TITLE}
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
              {COMMON_STRINGS.AUTH.WELCOME_SUBTITLE}
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
            justifyContent: "center",
            background: `url(${rightLoginBg}) no-repeat center center`,
            backgroundSize: "cover",
            p: { xs: 2.5, sm: 3.5 },
            minHeight: "100vh",
          }}
        >
          <Card
            sx={{
              background: theme.palette.mode === "dark" ? theme.palette.background.paper : "#ffffff",
              boxShadow: theme.palette.mode === "dark"
                ? "0 20px 60px rgba(0, 0, 0, 0.3)"
                : "0 16px 48px rgba(74, 63, 107, 0.08), 0 4px 16px rgba(74, 63, 107, 0.04)",
              border: "1px solid",
              borderColor: theme.palette.mode === "dark" ? "rgba(231, 235, 247, 0.08)" : "rgba(74, 63, 107, 0.06)",
              borderRadius: "20px",
              p: { xs: 2.5, sm: 3.5 },
              width: "100%",
              maxWidth: "420px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Branding Container */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "10px",
                  border: "1.5px solid rgba(74, 63, 107, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  p: 0,
                }}
              >
                <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Box>
              <Stack spacing={0} sx={{ textAlign: "left" }}>
                <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.875rem", letterSpacing: "0.02em", lineHeight: 1.15 }}>
                  CONTRIBUTION
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "#7c3aed", fontSize: "0.875rem", letterSpacing: "0.02em", lineHeight: 1.15 }}>
                  MANAGEMENT
                </Typography>
              </Stack>
            </Box>

            {/* Header Text */}
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.625rem" },
                fontWeight: 700,
                color: "text.primary",
                mb: 0.5,
                textAlign: "left",
                lineHeight: 1.25,
                letterSpacing: "-0.02em",
              }}
            >
              {COMMON_STRINGS.AUTH.SIGN_IN_TITLE}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.84rem",
                color: "text.secondary",
                fontWeight: 500,
                mb: 3,
                textAlign: "left",
              }}
            >
              {COMMON_STRINGS.AUTH.SIGN_IN_SUBTITLE}
            </Typography>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
              <Stack spacing={2.2}>
                {!showOtpField ? (
                  <>
                    <Box sx={{ textAlign: "left" }}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "text.primary", mb: 0.6 }}>
                        {COMMON_STRINGS.AUTH.USERNAME_OR_EMAIL_LABEL} <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
                      </Typography>
                      <TextField
                        fullWidth
                        value={form.email}
                        onChange={(e) => {
                          setForm((c) => ({ ...c, email: e.target.value }));
                          if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        error={!!errors.email}
                        helperText={errors.email}
                        placeholder={COMMON_STRINGS.AUTH.USERNAME_OR_EMAIL_PLACEHOLDER}
                        size="small"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "6px",
                            height: 38,
                            fontSize: "0.85rem",
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "background.paper" : "#faf9fd",
                            "& fieldset": {
                              borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(74, 63, 107, 0.12)",
                            },
                            "&:hover fieldset": {
                              borderColor: "#7c3aed",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#7c3aed",
                              borderWidth: "1.5px",
                            },
                            "&.Mui-error fieldset": {
                              borderColor: "rgba(239, 68, 68, 0.5)",
                            },
                            "& input": {
                              py: 0.75,
                              px: 1.5,
                            },
                          },
                          "& .MuiFormHelperText-root.Mui-error": {
                            color: "#ef4444",
                            opacity: 0.88,
                            fontSize: "0.74rem",
                            fontWeight: 500,
                            letterSpacing: "0.01em",
                            mt: 0.4,
                            mx: 0.25,
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ textAlign: "left" }}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "text.primary", mb: 0.6 }}>
                        {COMMON_STRINGS.AUTH.PASSWORD_LABEL} <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
                      </Typography>
                      <TextField
                        fullWidth
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => {
                          setForm((c) => ({ ...c, password: e.target.value }));
                          if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        error={!!errors.password}
                        helperText={errors.password}
                        placeholder={COMMON_STRINGS.AUTH.PASSWORD_PLACEHOLDER}
                        size="small"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Box
                                sx={{
                                  height: 22,
                                  width: "1px",
                                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.18)" : "rgba(74, 63, 107, 0.2)",
                                  mr: 0.75,
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => setShowPassword((prev) => !prev)}
                                onMouseDown={(e) => e.preventDefault()}
                                edge="end"
                                sx={{
                                  color: "text.secondary",
                                  p: 0.6,
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
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "6px",
                            height: 38,
                            fontSize: "0.85rem",
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "background.paper" : "#faf9fd",
                            "& fieldset": {
                              borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(74, 63, 107, 0.12)",
                            },
                            "&:hover fieldset": {
                              borderColor: "#7c3aed",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#7c3aed",
                              borderWidth: "1.5px",
                            },
                            "&.Mui-error fieldset": {
                              borderColor: "rgba(239, 68, 68, 0.5)",
                            },
                            "& input": {
                              py: 0.75,
                              px: 1.5,
                            },
                          },
                          "& .MuiFormHelperText-root.Mui-error": {
                            color: "#ef4444",
                            opacity: 0.88,
                            fontSize: "0.74rem",
                            fontWeight: 500,
                            letterSpacing: "0.01em",
                            mt: 0.4,
                            mx: 0.25,
                          },
                        }}
                      />
                    </Box>

                    {/* Forgot Password Link Row */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        width: "100%",
                        mt: -0.5,
                        mb: 0.5,
                      }}
                    >
                      <Link
                        component={RouterLink}
                        to="/forgot-password"
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "#7c3aed",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {COMMON_STRINGS.AUTH.FORGOT_PASSWORD}
                      </Link>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ mb: 2 }}>
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
                              borderRadius: "10px",
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
                  size="medium"
                  disabled={loading || (showOtpField && isLockedOut)}
                  disabledTooltip={false}
                  fullWidth
                  sx={{
                    height: 36,
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    borderRadius: "8px",
                    background: (theme) => theme.palette.mode === "dark"
                      ? "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)"
                      : "linear-gradient(135deg, #1e1a2e 0%, #2d2550 100%)",
                    boxShadow: (theme) => theme.palette.mode === "dark"
                      ? "0 4px 14px rgba(124, 58, 237, 0.25)"
                      : "0 4px 14px rgba(30, 26, 46, 0.15)",
                    "&:hover": {
                      background: (theme) => theme.palette.mode === "dark"
                        ? "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)"
                        : "linear-gradient(135deg, #2d2550 0%, #1e1a2e 100%)",
                      transform: "translateY(-1px)",
                      boxShadow: (theme) => theme.palette.mode === "dark"
                        ? "0 6px 18px rgba(124, 58, 237, 0.35)"
                        : "0 6px 18px rgba(30, 26, 46, 0.22)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? (showOtpField ? "Verifying..." : "Signing in...") : (showOtpField ? (isLockedOut ? "LOCKED OUT" : "VERIFY OTP") : COMMON_STRINGS.AUTH.LOGIN_BUTTON)}
                </AppButton>

                {/* Back to Login Button for OTP step */}
                {showOtpField && (
                  <AppButton
                    type="button"
                    variant="outlined"
                    size="large"
                    disabled={loading}
                    disabledTooltip={false}
                    fullWidth
                    onClick={() => {
                      setShowOtpField(false);
                      setOtp("");
                      setMfaStatusMessage("");
                      setIsLockedOut(false);
                    }}
                    sx={{
                      mt: 1,
                      height: 40,
                      fontSize: "0.82rem",
                      borderRadius: "10px",
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
