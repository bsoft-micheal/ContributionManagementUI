import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
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
import { AppCancelButton, AppSaveButton } from "./AppButton";
import apiClient from "../../services/apiClient";
import { useAppToast } from "./AppToast";
import COMMON_STRINGS from "../../constants/commonStrings";

const MfaSettings = forwardRef(function MfaSettings(
  { embedded = false, title = "Two-Factor Authentication (MFA)", onDevicesChange },
  ref
) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    deviceLabel: "",
    otp: "",
  });
  const [errors, setErrors] = useState({});
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
      setErrors({});
      setVerifyForm({ deviceLabel: "", otp: "" });
      const res = await apiClient.get("/mfa/setupMfaAsync");
      const data = res.data?.data !== undefined ? res.data.data : res.data;
      setSetupData(data);
    } catch (err) {
      toast.error("Failed to start MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Device Label (Optional)
    if (verifyForm.deviceLabel !== undefined && verifyForm.deviceLabel !== null && verifyForm.deviceLabel.length > 0) {
      const trimmedLabel = verifyForm.deviceLabel.trim();
      if (!trimmedLabel) {
        newErrors.deviceLabel = "Device label cannot contain only spaces";
      } else if (trimmedLabel.length < 2) {
        newErrors.deviceLabel = "Device label must be at least 2 characters";
      } else if (trimmedLabel.length > 50) {
        newErrors.deviceLabel = "Device label cannot exceed 50 characters";
      }
    }

    // 2. 6-Digit Code (Mandatory)
    const rawOtp = verifyForm.otp ?? "";
    const trimmedOtp = rawOtp.trim();

    if (!trimmedOtp) {
      newErrors.otp = "This field is required";
    } else if (!/^\d{6}$/.test(rawOtp)) {
      newErrors.otp = "Enter a valid 6-digit code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeviceLabelChange = (e) => {
    const val = e.target.value.slice(0, 50);
    setVerifyForm((prev) => ({ ...prev, deviceLabel: val }));
    if (errors.deviceLabel) {
      const trimmed = val.trim();
      if (!val || (trimmed.length >= 2 && trimmed.length <= 50)) {
        setErrors((prev) => ({ ...prev, deviceLabel: "" }));
      }
    }
  };

  const handleOtpKeyDown = (e) => {
    const isControlKey =
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey;

    if (!isControlKey && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    if (!isControlKey) {
      const input = e.target;
      const hasSelection =
        input.selectionStart !== null &&
        input.selectionEnd !== null &&
        input.selectionStart !== input.selectionEnd;
      if ((verifyForm.otp || "").length >= 6 && !hasSelection) {
        e.preventDefault();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteText = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const digits = pasteText.replace(/\D/g, "");
    const input = e.target;
    const current = verifyForm.otp || "";
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    const nextVal = (current.slice(0, start) + digits + current.slice(end)).slice(0, 6);
    setVerifyForm((prev) => ({ ...prev, otp: nextVal }));
    if (errors.otp) {
      if (/^\d{6}$/.test(nextVal)) {
        setErrors((prev) => ({ ...prev, otp: "" }));
      }
    }
  };

  const handleOtpChange = (e) => {
    const val = (e.target.value || "").replace(/\D/g, "").slice(0, 6);
    setVerifyForm((prev) => ({ ...prev, otp: val }));
    if (errors.otp) {
      if (/^\d{6}$/.test(val)) {
        setErrors((prev) => ({ ...prev, otp: "" }));
      } else if (errors.otp === "This field is required" && val.trim()) {
        setErrors((prev) => ({ ...prev, otp: "" }));
      }
    }
  };

  const handleVerifySetup = async () => {
    if (loading) return false;

    const isValid = validateForm();
    if (!isValid) return false;

    try {
      setLoading(true);
      await apiClient.post("/mfa/verifySetupMfaAsync", {
        secretKey: setupData.secretKey,
        deviceLabel: verifyForm.deviceLabel?.trim() || "Authenticator App",
        otp: (verifyForm.otp ?? "").trim(),
      });

      toast.success("MFA Device added successfully");
      setSetupData(null);
      setVerifyForm({ deviceLabel: "", otp: "" });
      setErrors({});
      fetchDevices();
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid OTP code";
      setErrors((prev) => ({ ...prev, otp: msg }));
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    get isSettingUp() {
      return Boolean(setupData);
    },
    validate: validateForm,
    verifyAndSave: handleVerifySetup,
  }));


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
                maxLength={50}
                onChange={handleDeviceLabelChange}
                placeholder="e.g. My iPhone"
                error={Boolean(errors.deviceLabel)}
                helperText={errors.deviceLabel}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <AppInput
                label="6-Digit Code"
                value={verifyForm.otp}
                onChange={handleOtpChange}
                onKeyDown={handleOtpKeyDown}
                onPaste={handleOtpPaste}
                placeholder="e.g. 123456"
                required
                restrictType="numberonly"
                maxLength={6}
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 6,
                }}
                error={Boolean(errors.otp)}
                helperText={errors.otp}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <AppCancelButton
              onClick={() => {
                setSetupData(null);
                setVerifyForm({ deviceLabel: "", otp: "" });
                setErrors({});
              }}
              disabled={loading}
            />
            <AppSaveButton
              onClick={handleVerifySetup}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Save"}
            </AppSaveButton>
          </Box>
        </Box>
      )}
    </Box>
  );
});

export default MfaSettings;
