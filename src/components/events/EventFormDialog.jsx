import React, { useState, useEffect } from "react";
import { Grid, Box, Typography } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppMultiSelect from "../common/AppMultiSelect";
import AppTextArea from "../common/AppTextArea";
import AppButton from "../common/AppButton";
import AppDialog from "../common/AppDialog";
import { validateForm } from "../../utils/validation";
import { useAppToast } from "../common/AppToast";
import { CreateEvent, UpdateEvent, GetEventById } from "../../services/eventService";

const formatBaseAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const cleanVal = String(value).replace(/[^0-9]/g, "");
  if (!cleanVal) return "";
  return Number(cleanVal).toLocaleString("en-US");
};

const initialForm = {
  eventName: "",
  eventTypeId: "",
  eventDate: dayjs(),
  description: "",
  baseAmount: "",
  participantIds: [],
};

export default function EventFormDialog({
  open,
  onClose,
  event,
  eventTypes = [],
  members = [],
  onSaveSuccess,
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useAppToast();

  useEffect(() => {
    if (open) {
      if (event && event.eventId) {
        const fetchDetails = async () => {
          setLoading(true);
          try {
            const detailedEvent = await GetEventById(event.eventId);
            setForm({
              eventId: detailedEvent.eventId || null,
              eventName: detailedEvent.eventName || "",
              eventTypeId: detailedEvent.eventTypeId || "",
              eventDate: detailedEvent.eventDate ? dayjs(detailedEvent.eventDate) : dayjs(),
              description: detailedEvent.description || "",
              baseAmount: detailedEvent.baseAmount !== undefined && detailedEvent.baseAmount !== null && Number(detailedEvent.baseAmount) > 0 ? String(detailedEvent.baseAmount) : "",
              participantIds: detailedEvent.participantIds || (detailedEvent.participants ? detailedEvent.participants.map(p => p.memberId) : []),
            });
          } catch (error) {
            toast.error("Failed to load event details");
            console.error("Error loading event details:", error);
          } finally {
            setLoading(false);
          }
        };
        fetchDetails();
      } else if (event) {
        setForm({
          eventName: "",
          eventTypeId: "",
          eventDate: event.eventDate ? dayjs(event.eventDate) : dayjs(),
          description: "",
          baseAmount: "",
          participantIds: [],
        });
      } else {
        setForm(initialForm);
      }
      setErrors({});
    }
  }, [open, event]);

  const calculateBaseAmount = (eventTypeId, eventDate) => {
    if (!eventTypeId) return "";
    const selectedType = eventTypes.find(t => t.eventTypeId === eventTypeId);
    if (!selectedType) return "";

    const typeBase = Number(selectedType.baseAmount) || 0;

    if (selectedType.eventTypeName.toLowerCase().includes("birthday")) {
      if (!eventDate) return "";
      const targetMonth = dayjs(eventDate).month(); // 0-11
      const count = members.filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth).length;
      const rate = typeBase > 0 ? typeBase : 500;
      return count > 0 ? (count * rate) : "";
    }

    return typeBase > 0 ? typeBase : "";
  };

  const handleSubmit = async () => {
    const filed = "This field is required";
    const schema = {
      eventName: { required: true, type: "letteronly", min: 3, max: 100, label: filed },
      baseAmount: { 
        required: true, 
        type: "numberonly", 
        label: filed,
        customValidate: (val) => {
          const num = Number(String(val).replace(/[^0-9]/g, ""));
          if (val === "" || val === undefined || val === null || num <= 0) {
            return filed;
          }
          if (num > 1000000) {
            return "Base amount cannot exceed 1,000,000";
          }
          return "";
        }
      },
      eventTypeId: { required: true, label: filed },
      eventDate: { required: true, label: filed },
      participantIds: { required: true, label: filed },
    };

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        baseAmount: Number(String(form.baseAmount).replace(/[^0-9]/g, "") || 0),
        eventDate: dayjs(form.eventDate).hour(12).toISOString(),
      };

      if (form.eventId) {
        await UpdateEvent(form.eventId, payload);
        toast.success("Saved successfully");
      } else {
        await CreateEvent(payload);
        toast.success("Saved successfully");
      }
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save");
      console.error("Error saving event:", error);
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = eventTypes.map((t) => ({
    label: t.eventTypeName,
    value: t.eventTypeId,
  }));

  const memberOptions = members.map((m) => ({
    label: m.name,
    value: m.memberId,
  }));

  const getBirthdayCelebrators = () => {
    if (!form.eventTypeId) return "";
    const selectedType = eventTypes.find(t => t.eventTypeId === form.eventTypeId);
    if (!selectedType || !selectedType.eventTypeName.toLowerCase().includes("birthday")) return "";

    const targetMonth = dayjs(form.eventDate).month();
    const celebrators = members.filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth);
    const count = celebrators.length;
    if (count === 0) return "No birthdays in this month";
    
    const typeBase = Number(selectedType.baseAmount) || 0;
    const rate = typeBase > 0 ? typeBase : 500;
    const total = count * rate;
    const names = celebrators.map(c => c.name).join(", ");
    return `${names} celebrating birthday (${count} celebrant${count > 1 ? "s" : ""} × ₹${rate.toLocaleString()} = ₹${total.toLocaleString()})`;
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={form.eventId ? "Edit Event" : "Add Event"}
      actions={
        <>
          <AppButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving || loading}
            sx={{
              bgcolor: "#4a3f6b !important",
              "&:hover": { bgcolor: "#3b325c !important" },
            }}
          >
            {saving ? "Saving..." : (loading ? "Loading..." : "Save")}
          </AppButton>
          <AppButton variant="outlined" onClick={onClose} disabled={saving || loading}>
            Cancel
          </AppButton>
        </>
      }
    >
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppSelect
            label="Category"
            value={form.eventTypeId}
            onChange={(e) => {
              const newTypeId = e.target.value;
              const computedAmount = calculateBaseAmount(newTypeId, form.eventDate);
              setForm((current) => ({ 
                ...current, 
                eventTypeId: newTypeId,
                baseAmount: computedAmount
              }));
              if (errors.eventTypeId) setErrors((prev) => ({ ...prev, eventTypeId: "" }));
              if (errors.baseAmount) setErrors((prev) => ({ ...prev, baseAmount: "" }));
            }}
            options={typeOptions}
            error={!!errors.eventTypeId}
            helperText={errors.eventTypeId}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppInput
            label="Base Amount"
            value={formatBaseAmount(form.baseAmount)}
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "");
              setForm((current) => ({ ...current, baseAmount: rawVal }));
              if (errors.baseAmount) setErrors((prev) => ({ ...prev, baseAmount: "" }));
            }}
            maxLength={15}
            error={!!errors.baseAmount}
            helperText={errors.baseAmount}
            required
            disabled={!!form.eventTypeId && Boolean(calculateBaseAmount(form.eventTypeId, form.eventDate))}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppInput
            label="Event Name"
            value={form.eventName}
            onChange={(e) => {
              setForm((current) => ({ ...current, eventName: e.target.value }));
              if (errors.eventName) setErrors((prev) => ({ ...prev, eventName: "" }));
            }}
            restrictType="letteronly"
            maxLength={100}
            error={!!errors.eventName}
            helperText={errors.eventName}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppDateInput
            label="Event Date"
            value={form.eventDate}
            onChange={(newValue) => {
              const computedAmount = calculateBaseAmount(form.eventTypeId, newValue);
              setForm((current) => ({ 
                ...current, 
                eventDate: newValue,
                baseAmount: form.eventTypeId ? computedAmount : current.baseAmount
              }));
              if (errors.eventDate) setErrors((prev) => ({ ...prev, eventDate: "" }));
              if (errors.baseAmount) setErrors((prev) => ({ ...prev, baseAmount: "" }));
            }}
            error={!!errors.eventDate}
            helperText={errors.eventDate}
            required
          />
        </Grid>
        {getBirthdayCelebrators() && (
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(22, 163, 74, 0.12)" : "rgba(34, 197, 94, 0.08)",
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(22, 163, 74, 0.3)" : "rgba(34, 197, 94, 0.2)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === "dark" ? "#4ade80" : "#15803d" }}>
                🎂 {getBirthdayCelebrators()}
              </Typography>
            </Box>
          </Grid>
        )}
        <Grid size={{ xs: 12 }}>
          <AppTextArea
            label="Description"
            minRows={3}
            maxRows={6}
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <AppMultiSelect
            label="Members"
            placeholder="Select members..."
            value={form.participantIds}
            onChange={(e) => {
              setForm((current) => ({ ...current, participantIds: e.target.value }));
              if (errors.participantIds) setErrors((prev) => ({ ...prev, participantIds: "" }));
            }}
            options={memberOptions}
            error={!!errors.participantIds}
            helperText={errors.participantIds}
            required
          />
        </Grid>
      </Grid>
    </AppDialog>
  );
}
