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

export default function MfaSettings() {
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
      const res = await apiClient.get("/mfa/devices");
      setDevices(res.data);
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
      const res = await apiClient.get("/mfa/setup");
      setSetupData(res.data);
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
      await apiClient.post("/mfa/verify-setup", {
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
      await apiClient.delete(`/mfa/devices/${id}`);
      toast.success("Device removed");
      fetchDevices();
    } catch (err) {
      toast.error("Failed to remove device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ my: 2, borderColor: "rgba(74, 63, 107, 0.08)" }} />
      <Typography variant="subtitle1" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "0.05em", mb: 2 }}>
        Two-Factor Authentication (MFA)
      </Typography>

      {loading && devices.length === 0 && !setupData && (
        <CircularProgress size={24} />
      )}

      {/* List of existing devices */}
      {devices.length > 0 && !setupData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Configured Devices
          </Typography>
          <List sx={{ bgcolor: "background.paper", borderRadius: 1, border: "1px solid rgba(0,0,0,0.1)" }}>
            {devices.map((device) => (
              <ListItem
                key={device.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveDevice(device.id)} color="error">
                    <DeleteOutlineIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={device.deviceLabel}
                  secondary={`Added: ${new Date(device.dateAdded).toLocaleDateString()}`}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Start Setup Button */}
      {!setupData && (
        <Button
          variant="outlined"
          color="primary"
          onClick={handleStartSetup}
          disabled={loading}
          sx={{ borderRadius: "8px", fontWeight: 700 }}
        >
          {devices.length > 0 ? "Add Another Device" : "Set Up Authenticator App"}
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

          <Typography variant="caption" sx={{ display: "block", textAlign: "center", mb: 2, wordBreak: "break-all" }}>
            Or enter code manually: <strong>{setupData.secretKey}</strong>
          </Typography>

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

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
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
