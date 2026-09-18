
import React, { useState, useEffect } from "react";
import { Grid, Box, Typography, Stack } from "@mui/material";
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

  const selectedType = eventTypes.find(t => t.eventTypeId === form.eventTypeId);
  const isBirthday = Boolean(selectedType && selectedType.eventTypeName?.toLowerCase().includes("birthday"));

  const calculateBaseAmount = (eventTypeId, eventDate, participantIds = form.participantIds) => {
    if (!eventTypeId) return "";
    const typeObj = eventTypes.find(t => t.eventTypeId === eventTypeId);
    if (!typeObj) return "";

    const typeBase = Number(typeObj.baseAmount) || 0;

    if (typeObj.eventTypeName?.toLowerCase().includes("birthday")) {
      const rate = typeBase > 0 ? typeBase : 500;
      if (participantIds && participantIds.length > 0) {
        return participantIds.length * rate;
      }
      if (!eventDate) return "";
      const targetMonth = dayjs(eventDate).month(); // 0-11
      const count = members.filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth).length;
      return count > 0 ? (count * rate) : "";
    }

    return typeBase > 0 ? typeBase : "";
  };

  useEffect(() => {
    if (open) {
      if (event && event.eventId) {
        const fetchDetails = async () => {
          setLoading(true);
          try {
            const detailedEvent = await GetEventById(event.eventId);
            let pIds = detailedEvent.participantIds || (detailedEvent.participants ? detailedEvent.participants.map(p => p.memberId) : []);
            
            const eventTypeObj = eventTypes.find(t => t.eventTypeId === detailedEvent.eventTypeId);
            const isBdayEvent = Boolean(eventTypeObj && eventTypeObj.eventTypeName?.toLowerCase().includes("birthday"));
            
            if (isBdayEvent && (!pIds || pIds.length === 0)) {
              const targetMonth = detailedEvent.eventDate ? dayjs(detailedEvent.eventDate).month() : dayjs().month();
              pIds = members
                .filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth)
                .map(m => m.memberId);
            }

            setForm({
              eventId: detailedEvent.eventId || null,
              eventName: detailedEvent.eventName || "",
              eventTypeId: detailedEvent.eventTypeId || "",
              eventDate: detailedEvent.eventDate ? dayjs(detailedEvent.eventDate) : dayjs(),
              description: detailedEvent.description || "",
              baseAmount: detailedEvent.baseAmount !== undefined && detailedEvent.baseAmount !== null && Number(detailedEvent.baseAmount) > 0 ? String(detailedEvent.baseAmount) : "",
              participantIds: pIds,
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
    const typeObj = eventTypes.find(t => t.eventTypeId === form.eventTypeId);
    if (!typeObj || !typeObj.eventTypeName?.toLowerCase().includes("birthday")) return "";

    let celebrators = [];
    if (form.participantIds && form.participantIds.length > 0) {
      celebrators = members.filter(m => form.participantIds.includes(m.memberId));
    } else {
      const targetMonth = dayjs(form.eventDate).month();
      celebrators = members.filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth);
    }

    const count = celebrators.length;
    if (count === 0) return "No birthdays in this month";

    const typeBase = Number(typeObj.baseAmount) || 0;
    const rate = typeBase > 0 ? typeBase : 500;
    const total = count * rate;
    const names = celebrators.map(c => c.name).join(", ");
    return `${names} celebrating birthday (${count} celebrant${count > 1 ? "s" : ""} × ₹${rate.toLocaleString()} = ₹${total.toLocaleString()})`;
  };

  const getBirthdayMembersList = () => {
    if (!isBirthday) return [];

    let celebrants = [];
    if (form.participantIds && form.participantIds.length > 0) {
      celebrants = members.filter(m => form.participantIds.includes(m.memberId));
    } else {
      const targetMonth = dayjs(form.eventDate).month();
      celebrants = members.filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth);
    }

    return [...celebrants].sort((a, b) => {
      const dayA = a.dateOfBirth ? dayjs(a.dateOfBirth).date() : 0;
      const dayB = b.dateOfBirth ? dayjs(b.dateOfBirth).date() : 0;
      return dayA - dayB;
    });
  };

  const birthdayMembersList = getBirthdayMembersList();

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
              const typeObj = eventTypes.find(t => t.eventTypeId === newTypeId);
              const isBday = Boolean(typeObj && typeObj.eventTypeName?.toLowerCase().includes("birthday"));
              let updatedParticipantIds = form.participantIds;
              
              if (isBday && (!updatedParticipantIds || updatedParticipantIds.length === 0)) {
                const targetMonth = dayjs(form.eventDate).month();
                const monthCelebrants = members
                  .filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === targetMonth)
                  .map(m => m.memberId);
                if (monthCelebrants.length > 0) {
                  updatedParticipantIds = monthCelebrants;
                }
              }

              const computedAmount = calculateBaseAmount(newTypeId, form.eventDate, updatedParticipantIds);
              setForm((current) => ({
                ...current,
                eventTypeId: newTypeId,
                participantIds: updatedParticipantIds,
                baseAmount: computedAmount
              }));
              if (errors.eventTypeId) setErrors((prev) => ({ ...prev, eventTypeId: "" }));
              if (errors.baseAmount) setErrors((prev) => ({ ...prev, baseAmount: "" }));
              if (errors.participantIds && updatedParticipantIds.length > 0) setErrors((prev) => ({ ...prev, participantIds: "" }));
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
              const typeObj = eventTypes.find(t => t.eventTypeId === form.eventTypeId);
              const isBday = Boolean(typeObj && typeObj.eventTypeName?.toLowerCase().includes("birthday"));
              
              let updatedParticipantIds = form.participantIds;
              if (isBday && newValue && dayjs(newValue).month() !== dayjs(form.eventDate).month()) {
                const newMonth = dayjs(newValue).month();
                const newMonthCelebrants = members
                  .filter(m => m.isActive && !m.isExited && dayjs(m.dateOfBirth).month() === newMonth)
                  .map(m => m.memberId);
                if (newMonthCelebrants.length > 0) {
                  updatedParticipantIds = newMonthCelebrants;
                }
              }

              const computedAmount = calculateBaseAmount(form.eventTypeId, newValue, updatedParticipantIds);
              setForm((current) => ({
                ...current,
                eventDate: newValue,
                participantIds: updatedParticipantIds,
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
              const newParticipantIds = e.target.value;
              const computedAmount = isBirthday 
                ? calculateBaseAmount(form.eventTypeId, form.eventDate, newParticipantIds)
                : form.baseAmount;
              setForm((current) => ({
                ...current,
                participantIds: newParticipantIds,
                baseAmount: isBirthday && computedAmount ? computedAmount : current.baseAmount
              }));
              if (errors.participantIds) setErrors((prev) => ({ ...prev, participantIds: "" }));
              if (errors.baseAmount && computedAmount) setErrors((prev) => ({ ...prev, baseAmount: "" }));
            }}
            options={memberOptions}
            error={!!errors.participantIds}
            helperText={errors.participantIds}
            required
          />
        </Grid>

        {isBirthday && (
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.3)" : "rgba(192, 38, 211, 0.2)",
                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.08)" : "rgba(192, 38, 211, 0.03)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: (theme) => theme.palette.mode === "dark" ? "#f0abfc" : "#86198f",
                    fontSize: "0.95rem",
                    letterSpacing: "0.01em",
                  }}
                >
                  Birthday Members
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    fontSize: "0.75rem",
                  }}
                >
                  {birthdayMembersList.length} celebrant{birthdayMembersList.length !== 1 ? "s" : ""}
                </Typography>
              </Box>

              <Box
                sx={{
                  borderBottom: "1px solid",
                  borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.25)" : "rgba(192, 38, 211, 0.15)",
                  mb: 1.5,
                }}
              />

              {birthdayMembersList.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 1 }}>
                  No birthday members selected
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {birthdayMembersList.map((m) => (
                    <Box
                      key={m.memberId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 0.8,
                        px: 1.5,
                        borderRadius: "6px",
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.7)",
                        border: "1px solid",
                        borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.15)" : "rgba(192, 38, 211, 0.08)",
                          transform: "translateX(2px)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        <Typography sx={{ fontSize: "1.1rem", lineHeight: 1 }}>🎂</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                          {m.name}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.35,
                          borderRadius: "12px",
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(192, 38, 211, 0.25)" : "rgba(192, 38, 211, 0.1)",
                          color: (theme) => theme.palette.mode === "dark" ? "#f5d0fe" : "#a21caf",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          fontFamily: "monospace, 'Outfit', sans-serif",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {m.dateOfBirth ? dayjs(m.dateOfBirth).format("D MMM") : "N/A"}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Grid>
        )}
      </Grid>
    </AppDialog>
  );
}
