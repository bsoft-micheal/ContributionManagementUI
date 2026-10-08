import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import dayjs from "dayjs";

import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import AppInput from "../common/AppInput";
import AppTextArea from "../common/AppTextArea";
import AppDateInput from "../common/AppDateInput";
import { useAppToast } from "../common/AppToast";
import { updateBudgetCalculationRateAsync } from "../../services/budgetCalculationService";

const formatRateAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "").slice(0, 8);
  if (!cleanVal) return "";
  const num = Number(cleanVal);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-US");
};

export default function RateUpdateModal({
  open,
  onClose,
  item,
  onSuccess,
}) {
  const theme = useTheme();
  const toast = useAppToast();

  const [newRate, setNewRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(dayjs());
  const [changeReason, setChangeReason] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) {
      setNewRate("");
      setEffectiveFrom(dayjs());
      setChangeReason("");
      setErrors({});
    }
  }, [open, item]);

  if (!item) return null;

  const currentRateNum = Number(item.rate ?? 0);
  const newRateNum = newRate === "" ? null : Number(String(newRate).replace(/[^0-9]/g, "").slice(0, 8));
  
  const isRateChanged =
    newRateNum !== null &&
    !isNaN(newRateNum) &&
    newRateNum !== currentRateNum &&
    newRateNum <= 10000000 &&
    !errors.newRate;
  const isIncrease = newRateNum !== null && newRateNum > currentRateNum;
  const isDecrease = newRateNum !== null && newRateNum < currentRateNum;
  
  const diffAmount = newRateNum !== null ? newRateNum - currentRateNum : 0;
  const diffPercentage =
    currentRateNum > 0 && newRateNum !== null
      ? ((diffAmount / currentRateNum) * 100).toFixed(1)
      : null;

  const validate = () => {
    const errs = {};

    if (newRate === "" || newRateNum === null || isNaN(newRateNum)) {
      errs.newRate = "New rate is required";
    } else if (newRateNum < 0) {
      errs.newRate = "New rate must be greater than or equal to 0";
    } else if (newRateNum === currentRateNum) {
      errs.newRate = "New rate must be different from the current rate.";
    } else if (newRateNum > 10000000) {
      errs.newRate = "Rate cannot exceed 10,000,000";
    }

    if (!effectiveFrom || !dayjs(effectiveFrom).isValid()) {
      errs.effectiveFrom = "Effective from date is required";
    }

    const trimmedReason = (changeReason || "").trim();
    if (!trimmedReason) {
      errs.changeReason = "Please enter the reason for the rate change.";
    } else if (trimmedReason.length < 5) {
      errs.changeReason = "Reason must be at least 5 characters long";
    } else if (trimmedReason.length > 500) {
      errs.changeReason = "Reason cannot exceed 500 characters";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) {
      if (newRateNum === currentRateNum) {
        toast.error("New rate must be different from the current rate.");
      } else if (!changeReason?.trim()) {
        toast.error("Please enter the reason for the rate change.");
      } else {
        toast.error("Please fill all required fields correctly.");
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        budgetCalculationId: item.budgetCalculationId,
        expenseItem: item.expenseItem || "",
        rate: newRateNum,
        newRate: newRateNum,
        category: item.category || "",
        eventTypeId: item.eventTypeId || null,
        isActive: item.isActive !== undefined ? item.isActive : true,
        effectiveFrom: dayjs(effectiveFrom).format("YYYY-MM-DD"),
        changeReason: changeReason.trim(),
      };

      await updateBudgetCalculationRateAsync(item.budgetCalculationId, payload);
      toast.success("Rate updated successfully.");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      const msg = error?.response?.data?.message || "Unable to update the rate. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={`Update Rate - ${item.expenseItem || "Expense Item"}`}
      maxWidth="sm"
      actions={
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, width: "100%" }}>
          <AppButton variant="outlined" onClick={onClose} disabled={submitting}>
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={handleUpdate}
            disabled={submitting}
            sx={{
              bgcolor: "#4a3f6b !important",
              "&:hover": { bgcolor: "#3b325c !important" },
              fontWeight: 700,
              px: 2.5,
            }}
          >
            {submitting ? "Updating..." : "Update"}
          </AppButton>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2, pt: 0.5 }}>
        {/* Header Info / Context Pills */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            borderRadius: "8px",
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8f7fc",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
              EVENT TYPE
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {item.category || item.eventTypeName || "--"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
              EXPENSE ITEM
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {item.expenseItem || "--"}
            </Typography>
          </Box>
        </Box>

        {/* Current Rate & New Rate Row */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontWeight: 600,
                  color: theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
                  fontSize: "0.78125rem",
                }}
              >
                Current Rate
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1.5,
                  py: 1,
                  borderRadius: "6px",
                  bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                  border: `1px solid ${theme.palette.divider}`,
                  minHeight: "40px",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>
                  ₹ {currentRateNum.toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="New Rate"
              placeholder="₹ Enter new rate"
              fullWidth
              value={formatRateAmount(newRate)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
                setNewRate(raw);
                const num = raw === "" ? null : Number(raw);
                let err = "";
                if (num !== null && num > 10000000) {
                  err = "Rate cannot exceed 10,000,000";
                }
                setErrors((p) => ({ ...p, newRate: err }));
              }}
              required
              error={!!errors.newRate}
              helperText={errors.newRate}
            />
          </Grid>
        </Grid>

        {/* Live Delta preview if changed */}
        {isRateChanged && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.8,
              borderRadius: "6px",
              bgcolor: isIncrease
                ? "rgba(22, 163, 74, 0.08)"
                : "rgba(220, 38, 38, 0.08)",
              border: `1px solid ${
                isIncrease ? "rgba(22, 163, 74, 0.25)" : "rgba(220, 38, 38, 0.25)"
              }`,
            }}
          >
            {isIncrease ? (
              <TrendingUpRoundedIcon sx={{ color: "#16a34a", fontSize: "1.2rem" }} />
            ) : (
              <TrendingDownRoundedIcon sx={{ color: "#dc2626", fontSize: "1.2rem" }} />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: isIncrease ? "#16a34a" : "#dc2626",
                fontSize: "0.78rem",
              }}
            >
              {isIncrease ? "Increase" : "Decrease"} of ₹{Math.abs(diffAmount).toLocaleString("en-IN")}
              {diffPercentage !== null ? ` (${isIncrease ? "+" : ""}${diffPercentage}%)` : ""}
            </Typography>
          </Box>
        )}

        {/* Effective Date Picker */}
        <AppDateInput
          label="Effective From"
          value={effectiveFrom}
          onChange={(newVal) => {
            setEffectiveFrom(newVal);
            if (errors.effectiveFrom) setErrors((p) => ({ ...p, effectiveFrom: "" }));
          }}
          required
          error={!!errors.effectiveFrom}
          helperText={errors.effectiveFrom}
        />

        {/* Reason for Change / Reason for Increase */}
        <AppTextArea
          label={isIncrease ? "Reason for Increase" : "Reason for Change"}
          placeholder="Increased due to increase in vendor price."
          value={changeReason}
          onChange={(e) => {
            setChangeReason(e.target.value);
            if (errors.changeReason) setErrors((p) => ({ ...p, changeReason: "" }));
          }}
          required
          maxLength={500}
          showCount
          rows={3}
          error={!!errors.changeReason}
          helperText={errors.changeReason}
        />
      </Box>
    </AppDialog>
  );
}
