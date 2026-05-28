import { useState } from "react";
import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "admin@teamcontribution.local", password: "Admin@123" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppToast();

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f4fb",
        background: "radial-gradient(ellipse at top, rgba(74,63,107,0.08) 0%, transparent 60%), #f5f4fb",
        p: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(74,63,107,0.15)",
          overflow: "visible",
          position: "relative",
        }}
      >
        {/* Purple header badge */}
        <Box
          sx={{
            position: "absolute",
            top: -22,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "#4a3f6b",
            color: "white",
            px: 3,
            py: 0.8,
            borderRadius: "8px",
            fontWeight: 800,
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 0.8,
            boxShadow: "0 6px 16px rgba(74,63,107,0.35)",
            whiteSpace: "nowrap",
          }}
        >
          <LockRoundedIcon sx={{ fontSize: "0.9rem" }} />
          Contribution Management
        </Box>

        <CardContent sx={{ p: { xs: 3, md: 4 }, pt: { xs: 5, md: 5.5 } }}>
          <Stack spacing={3}>
            {/* Title */}
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 900, color: "#1e1a2e" }}>
                Welcome back
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.88rem" }}>
                Sign in to access the contribution management system.
              </Typography>
            </Box>

            {/* Demo credentials hint */}
            <Alert
              severity="info"
              variant="outlined"
              sx={{
                borderRadius: "8px",
                border: "1px solid rgba(74,63,107,0.25)",
                bgcolor: "rgba(74,63,107,0.04)",
                "& .MuiAlert-icon": { color: "#4a3f6b" },
                fontSize: "0.82rem",
                py: 0.8,
              }}
            >
              Demo: <strong>admin@teamcontribution.local</strong> / <strong>Admin@123</strong>
            </Alert>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <AppInput
                  label="Email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((c) => ({ ...c, email: e.target.value }));
                    if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                  }}
                  error={!!errors.email}
                  helperText={errors.email}
                  placeholder={"Enter Email"}
                  required
                />
                <AppInput
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((c) => ({ ...c, password: e.target.value }));
                    if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                  }}
                  error={!!errors.password}
                  helperText={errors.password}
                  placeholder={"Enter Password"}
                  required
                />
                <AppButton
                  type="submit"
                  size="large"
                  disabled={loading}
                  fullWidth
                  sx={{ py: 1.4, mt: 0.5, fontSize: "0.9rem" }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </AppButton>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
