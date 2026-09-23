import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AppInput from "./AppInput";
import apiClient from "../../services/apiClient";
import { useAppToast } from "./AppToast";

export default function MfaSettings({ embedded = false, title = "Two-Factor Authentication (MFA)", onDevicesChange }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    deviceLabel: "",
    otp: "",
  });
  const toast = useAppToast();

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/mfa/getDevicesMfaAsync");
      const data = res.data?.data !== undefined ? res.data.data : res.data;
      const devList = Array.isArray(data) ? data : [];
      setDevices(devList);
      if (typeof onDevicesChange === "function") {
        onDevicesChange(devList);
      }
    } catch (err) {
      toast.error("Failed to load MFA devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/mfa/setupMfaAsync");
      const data = res.data?.data !== undefined ? res.data.data : res.data;
      setSetupData(data);
    } catch (err) {
      toast.error("Failed to start MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!verifyForm.otp || verifyForm.otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/mfa/verifySetupMfaAsync", {
        secretKey: setupData.secretKey,
        deviceLabel: verifyForm.deviceLabel || "Authenticator App",
        otp: verifyForm.otp,
      });

      toast.success("MFA Device added successfully");
      setSetupData(null);
      setVerifyForm({ deviceLabel: "", otp: "" });
      fetchDevices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (id) => {
    try {
      setLoading(true);
      await apiClient.delete(`/mfa/removeDeviceMfaAsync/${id}`);
      toast.success("Device removed");
      fetchDevices();
    } catch (err) {
      toast.error("Failed to remove device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: embedded ? 1 : 3 }}>
      {!embedded && <Divider sx={{ my: 2, borderColor: "rgba(74, 63, 107, 0.08)" }} />}
      {title && (
        <Typography
          variant="subtitle1"
          fontWeight={800}
          color="text.primary"
          sx={{ letterSpacing: "0.02em", mb: 2, fontSize: "0.95rem" }}
        >
          {title}
        </Typography>
      )}

      {loading && devices.length === 0 && !setupData && (
        <CircularProgress size={24} />
      )}

      {/* List of existing devices */}
      {devices.length > 0 && !setupData && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.primary" }}>
              Configured Device
            </Typography>
            <Typography
              variant="caption"
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.12)",
                color: "#059669",
                fontWeight: 700,
                px: 1.25,
                py: 0.35,
                borderRadius: "12px",
                fontSize: "0.72rem",
              }}
            >
              Active (1 Device Only)
            </Typography>
          </Box>

          {devices.map((device) => (
            <Box
              key={device.id}
              sx={{
                p: 2.2,
                borderRadius: "16px",
                border: (t) => `1px solid ${t.palette.divider}`,
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#fafafa"),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "text.primary" }}>
                  {device.deviceLabel}
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", mt: 0.3 }}>
                  Added: {new Date(device.dateAdded || device.createdAt).toLocaleDateString()}
                </Typography>
              </Box>

              <IconButton
                onClick={() => handleRemoveDevice(device.id)}
                sx={{
                  color: "#d32f2f",
                  "&:hover": { bgcolor: "rgba(211, 47, 47, 0.08)" },
                }}
                title="Delete Device"
              >
                <DeleteOutlineIcon sx={{ fontSize: 24 }} />
              </IconButton>
            </Box>
          ))}

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1.5,
              fontSize: "0.76rem",
              color: "text.secondary",
            }}
          >
            * Only one MFA device is allowed per account. To use a different device, delete the current device first.
          </Typography>
        </Box>
      )}

      {/* Start Setup Button - Only allowed when NO device is currently configured */}
      {!setupData && devices.length === 0 && (
        <Button
          variant="contained"
          onClick={handleStartSetup}
          disabled={loading}
          sx={{
            borderRadius: "10px",
            fontWeight: 700,
            textTransform: "none",
            bgcolor: "primary.main",
            boxShadow: "none",
            "&:hover": { bgcolor: "primary.dark", boxShadow: "none" },
          }}
        >
          + Set Up Authenticator App
        </Button>
      )}

      {/* Setup Form */}
      {setupData && (
        <Box sx={{ bgcolor: "rgba(124, 58, 237, 0.04)", p: 2, borderRadius: "12px", border: "1px dashed rgba(124, 58, 237, 0.3)" }}>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
            1. Scan this QR Code with your Authenticator App (e.g., Google Authenticator, Authy):
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 2, bgcolor: "white", p: 2, borderRadius: 2 }}>
            {/* Instead of importing an external lib for QR, use an open API for rendering since we have the otpauth URI */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(setupData.qrCodeUri)}`}
              alt="MFA QR Code"
              width={150}
              height={150}
            />
          </Box>

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            2. Enter the 6-digit code generated by your app:
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="Device Label (Optional)"
                value={verifyForm.deviceLabel}
                onChange={(e) => setVerifyForm({ ...verifyForm, deviceLabel: e.target.value })}
                placeholder="e.g. My iPhone"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="6-Digit Code"
                value={verifyForm.otp}
                onChange={(e) => setVerifyForm({ ...verifyForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="123456"
                maxLength={6}
                required
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button onClick={() => setSetupData(null)} color="inherit" disabled={loading}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleVerifySetup} disabled={loading || verifyForm.otp.length !== 6}>
              {loading ? "Verifying..." : "Verify & Save"}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
