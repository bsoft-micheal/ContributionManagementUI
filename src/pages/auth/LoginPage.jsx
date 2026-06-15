import { useState } from "react";
import { Alert, Box, Card, FormControlLabel, Link, Stack, Switch, Typography } from "@mui/material";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function LoginPage() {
  const loginBg = "/login_bg.png";
  const [form, setForm] = useState({ email: "admin@teamcontribution.local", password: "Admin@123" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  async function handleSubmit(event) {
    event.preventDefault();
    
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
      await login(form);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to login.");
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
            color: "#1e1a2e",
            textAlign: "center",
            borderRight: "1px solid rgba(74, 63, 107, 0.08)",
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
              background: "rgba(245, 244, 251, 0.5)",
              pointerEvents: "none",
            }}
          />

          {/* Full-Width Bottom Glassmorphic Welcome Bar */}
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
            {/* Welcome Message */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                mb: 1.5,
                color: "#1e1a2e",
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
                color: "#5b5280",
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
            background: "url(/right_login_bg.png) no-repeat center center",
            backgroundSize: "cover",
            p: { xs: 2.5, sm: 4, md: 6 },
            minHeight: "100vh",
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
                <img src="/logo.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </Box>
              <Stack spacing={0} sx={{ textAlign: "left" }}>
                <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, color: "#1e1a2e", fontSize: "0.85rem", letterSpacing: "0.02em", lineHeight: 1.1 }}>
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
                color: "#1e1a2e",
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
                color: "#5b5280",
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
                  type="password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((c) => ({ ...c, password: e.target.value }));
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  error={!!errors.password}
                  helperText={errors.password}
                  placeholder="Enter Password"
                  required
                />

                {/* Controls Row */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    mt: -1,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#7c3aed" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#7c3aed" },
                        }}
                      />
                    }
                    label="Remember Password ?"
                    sx={{
                      "& .MuiFormControlLabel-label": {
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "#5b5280",
                      },
                    }}
                  />
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

                {/* Submit Button */}
                <AppButton
                  type="submit"
                  size="large"
                  disabled={loading}
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
                  {loading ? "Signing in..." : "LOGIN"}
                </AppButton>
              </Stack>
            </Box>

            {/* Quick Demo Credentials Badge */}
            <Box sx={{ mt: 5, width: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  p: 2,
                  borderRadius: "12px",
                  border: "1px solid rgba(74, 63, 107, 0.12)",
                  bgcolor: "rgba(74, 63, 107, 0.02)",
                  alignItems: "flex-start",
                }}
              >
                <InfoOutlinedIcon sx={{ color: "#7c3aed", fontSize: "1.1rem", mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e1a2e", mb: 0.4 }}>
                    Quick Demo Login:
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#5b5280" }}>
                    Email: <strong style={{ color: "#7c3aed" }}>admin@teamcontribution.local</strong>
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#5b5280" }}>
                    Password: <strong style={{ color: "#7c3aed" }}>Admin@123</strong>
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>
        </Box>
      </Card>
    </Box>
  );
}
