import React, { useState, useEffect, useMemo } from "react";
import {
  Grid,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  CakeRounded as CakeIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppMultiSelect from "../../components/common/AppMultiSelect";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import { validateForm } from "../../utils/validation";
import { useAppToast } from "../../components/common/AppToast";
import {
  CreateEventAsync,
  UpdateEventAsync,
  GetEventByIdAsync,
} from "../../services/eventService";
import { GetEventTypesAsync } from "../../services/eventTypeService";
import { GetMembersAsync } from "../../services/memberService";
import { GetBudgetCalculationsAsync } from "../../services/budgetCalculationService";
import { updateSystemSettings } from "../../services/settingsService";
import {
  getPaymentQrConfig,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
} from "../../utils/upiQrHelper";

// Standard calculation rules for Birthday events
const RULES = {
  cakeRate: 300,        // ₹300 per office birthday member
  puffsRate: 20,        // ₹20 per person / puff
  giftRate: 1000,       // ₹1,000 per birthday celebrant (Office + WFH)
  rounding: 1,          // Round up to ₹1
  puffsBasis: "office", // Per office birthday member
};

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

const getDefaultBirthdayExempt = () => {
  try {
    const saved = localStorage.getItem("cm_system_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.birthdayMembersExempt !== undefined) {
        return Boolean(parsed.birthdayMembersExempt);
      }
    }
  } catch (e) {
    console.warn("Could not read birthdayMembersExempt setting:", e);
  }
  return true;
};

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const toast = useAppToast();

  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [eventTypes, setEventTypes] = useState([]);
  const [members, setMembers] = useState([]);
  const [budgetItemsList, setBudgetItemsList] = useState([]);
  const [budgetRates, setBudgetRates] = useState(RULES);

  // Birthday-specific configuration states
  const [officeBirthdays, setOfficeBirthdays] = useState(1);
  const [wfhBirthdays, setWfhBirthdays] = useState(0);
  const [totalMembers, setTotalMembers] = useState(47);
  const [exempt, setExempt] = useState(getDefaultBirthdayExempt);

  // Active members count
  const activeMembers = useMemo(
    () => members.filter((m) => m.isActive && !m.isExited),
    [members]
  );

  // Load initial dropdown data and event details if in edit mode
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      setLoading(true);
      try {
        const [typesData, membersData, budgetData] = await Promise.all([
          GetEventTypesAsync(),
          GetMembersAsync(),
          GetBudgetCalculationsAsync().catch(() => []),
        ]);

        if (!isMounted) return;

        setEventTypes(typesData || []);
        setMembers(membersData || []);

        if (Array.isArray(budgetData) && budgetData.length > 0) {
          const activeItems = budgetData.filter((b) => b.isActive !== false);
          setBudgetItemsList(activeItems);
          const cakeItem = activeItems.find((b) => b.expenseItem?.toLowerCase().includes("cake"));
          const puffsItem = activeItems.find((b) => b.expenseItem?.toLowerCase().includes("puff") || b.expenseItem?.toLowerCase().includes("snack") || b.expenseItem?.toLowerCase().includes("roll"));
          const giftItem = activeItems.find((b) => b.expenseItem?.toLowerCase().includes("gift"));

          setBudgetRates((prev) => ({
            ...prev,
            cakeRate: cakeItem ? Number(cakeItem.rate) : prev.cakeRate,
            puffsRate: puffsItem ? Number(puffsItem.rate) : prev.puffsRate,
            giftRate: giftItem ? Number(giftItem.rate) : prev.giftRate,
          }));
        }

        const activeMems = (membersData || []).filter((m) => m.isActive && !m.isExited);
        const bdayType = (typesData || []).find((t) =>
          t.eventTypeName?.toLowerCase().includes("birthday")
        );
        const defaultTypeId = bdayType ? bdayType.eventTypeId : typesData?.[0]?.eventTypeId || "";

        if (id) {
          // Edit existing event
          const detailedEvent = await GetEventByIdAsync(id);
          if (!isMounted) return;

          const pIds =
            detailedEvent.participantIds ||
            (detailedEvent.participants ? detailedEvent.participants.map((p) => p.memberId) : []);

          const currentEventDate = detailedEvent.eventDate ? dayjs(detailedEvent.eventDate) : dayjs();
          const targetMonth = currentEventDate.month();
          const celebrantsInMonth = activeMems.filter(
            (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
          );
          const offCount = celebrantsInMonth.filter(
            (m) => (m.memberType || "Office").toLowerCase() === "office"
          ).length;
          const wfhCount = celebrantsInMonth.filter(
            (m) => (m.memberType || "Office").toLowerCase() === "wfh"
          ).length;

          setOfficeBirthdays(offCount > 0 ? offCount : 1);
          setWfhBirthdays(wfhCount);
          setTotalMembers(activeMems.length > 0 ? activeMems.length : 47);
          setExempt(true);

          setForm({
            eventId: detailedEvent.eventId || id,
            eventName: detailedEvent.eventName || "",
            eventTypeId: detailedEvent.eventTypeId || defaultTypeId,
            eventDate: currentEventDate,
            description: detailedEvent.description || "",
            baseAmount:
              detailedEvent.baseAmount !== undefined &&
                detailedEvent.baseAmount !== null &&
                Number(detailedEvent.baseAmount) > 0
                ? String(detailedEvent.baseAmount)
                : "",
            participantIds: pIds,
          });
        } else {
          // Creating a new event
          const defaultDate = dayjs().date() > 25 ? dayjs().add(1, "month").date(25) : dayjs().date(25);
          const targetMonth = defaultDate.month();
          const celebrantsInMonth = activeMems.filter(
            (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === targetMonth
          );
          const offCount = celebrantsInMonth.filter(
            (m) => (m.memberType || "Office").toLowerCase() === "office"
          ).length;
          const wfhCount = celebrantsInMonth.filter(
            (m) => (m.memberType || "Office").toLowerCase() === "wfh"
          ).length;

          setOfficeBirthdays(offCount > 0 ? offCount : 1);
          setWfhBirthdays(wfhCount);
          setTotalMembers(activeMems.length > 0 ? activeMems.length : 47);
          setExempt(getDefaultBirthdayExempt());

          setForm({
            eventName: `${defaultDate.format("MMMM")} Birthday Celebration`,
            eventTypeId: defaultTypeId,
            eventDate: defaultDate,
            description: "",
            baseAmount: "",
            participantIds: activeMems.map((m) => m.memberId),
          });
        }
      } catch (err) {
        console.error("Failed to load event form initial data:", err);
        toast.error("Failed to load event details");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const selectedType = eventTypes.find((t) => t.eventTypeId === form.eventTypeId);
  const isBirthday = Boolean(
    selectedType && selectedType.eventTypeName?.toLowerCase().includes("birthday")
  );

  // Detect month celebrants from active members (deduplicated by name + DOB or ID)
  const monthCelebrants = useMemo(() => {
    if (!form.eventDate) return [];
    const targetMonth = dayjs(form.eventDate).month();
    const seen = new Set();
    const list = [];
    for (const m of activeMembers) {
      if (!m.dateOfBirth) continue;
      const dob = dayjs(m.dateOfBirth);
      if (dob.month() !== targetMonth) continue;
      const normName = (m.name || "").toLowerCase().trim();
      const dobStr = dob.format("YYYY-MM-DD");
      const key = normName && dobStr ? `${normName}|${dobStr}` : `id:${m.memberId}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(m);
      }
    }
    return list;
  }, [form.eventDate, activeMembers]);

  // Birthday calculation math
  const office = Math.max(0, Number(officeBirthdays) || 0);
  const wfh = Math.max(0, Number(wfhBirthdays) || 0);
  const total = Math.max(0, Number(totalMembers) || 0);
  const bdays = office + wfh;
  const eligible = Math.max(0, total - (exempt ? bdays : 0));
  const puffsFactor = office > 0 ? office : 0;

  const computedBudgetItems = useMemo(() => {
    const items =
      budgetItemsList.length > 0
        ? budgetItemsList.filter((b) => b.isActive !== false)
        : [
            { expenseItem: "½ kg Cake", rate: 300 },
            { expenseItem: "Chicken Roll / Puffs", rate: 20 },
            { expenseItem: "Birthday Gift", rate: 1000 },
          ];

    return items.map((item) => {
      const name = (item.expenseItem || "").toLowerCase();
      const rate = Number(item.rate) || 0;
      let calcText = "";
      let amount = 0;
      let formulaPart = "";

      if (name.includes("cake")) {
        calcText = `${office} × ₹${rate.toLocaleString("en-IN")}`;
        amount = office * rate;
        formulaPart = `Cake (Office Celebrants × ₹${rate.toLocaleString("en-IN")})`;
      } else if (
        name.includes("gift") ||
        name.includes("present") ||
        name.includes("voucher") ||
        name.includes("memento")
      ) {
        calcText = `${bdays} × ₹${rate.toLocaleString("en-IN")}`;
        amount = bdays * rate;
        formulaPart = `Gift (Total Birthday Celebrants × ₹${rate.toLocaleString("en-IN")})`;
      } else {
        if (puffsFactor > 0) {
          calcText = `${total} × ₹${rate.toLocaleString("en-IN")}${
            puffsFactor > 1 ? ` × ${puffsFactor}` : ""
          }`;
          amount = total * rate * puffsFactor;
        } else {
          calcText = "WFH only → Not provided";
          amount = 0;
        }
        formulaPart = `${item.expenseItem} (Total Active Members × ₹${rate.toLocaleString(
          "en-IN"
        )})`;
      }

      return {
        ...item,
        rate,
        calcText,
        amount,
        formulaPart,
      };
    });
  }, [budgetItemsList, office, bdays, total, puffsFactor]);

  const plannedBudget = computedBudgetItems.reduce((acc, curr) => acc + curr.amount, 0);
  const rawPerMember = eligible > 0 ? plannedBudget / eligible : 0;
  const contributionPerMember =
    eligible > 0 ? Math.ceil(rawPerMember / RULES.rounding) * RULES.rounding : 0;
  const expectedCollection = contributionPerMember * eligible;
  const roundingSurplus = Math.max(0, expectedCollection - plannedBudget);

  const dynamicFormulaText = computedBudgetItems
    .map((i) => i.formulaPart)
    .filter(Boolean)
    .join(" + ");

  // Handle date change
  const handleDateChange = (newDate) => {
    if (!newDate) return;
    const oldMonth = dayjs(form.eventDate).month();
    const newMonth = dayjs(newDate).month();

    let newEventName = form.eventName;
    if (
      !isEdit &&
      (form.eventName.includes("Birthday Celebration") || !form.eventName.trim())
    ) {
      newEventName = `${dayjs(newDate).format("MMMM")} Birthday Celebration`;
    }

    if (oldMonth !== newMonth) {
      const celebrantsInNewMonth = activeMembers.filter(
        (m) => m.dateOfBirth && dayjs(m.dateOfBirth).month() === newMonth
      );
      const offCount = celebrantsInNewMonth.filter(
        (m) => (m.memberType || "Office").toLowerCase() === "office"
      ).length;
      const wfhCount = celebrantsInNewMonth.filter(
        (m) => (m.memberType || "Office").toLowerCase() === "wfh"
      ).length;
      setOfficeBirthdays(offCount > 0 ? offCount : 1);
      setWfhBirthdays(wfhCount);
    }

    setForm((c) => ({
      ...c,
      eventDate: newDate,
      eventName: newEventName,
    }));
    if (errors.eventDate) setErrors((p) => ({ ...p, eventDate: "" }));
  };

  const handleSubmit = async () => {
    const filed = "This field is required";
    const schema = {
      eventName: { required: true, min: 3, max: 100, label: filed },
      eventTypeId: { required: true, label: filed },
      eventDate: { required: true, label: filed },
    };

    if (!isBirthday) {
      schema.baseAmount = {
        required: true,
        type: "numberonly",
        label: filed,
        customValidate: (val) => {
          const num = Number(String(val).replace(/[^0-9]/g, ""));
          if (val === "" || val === undefined || val === null || num <= 0) {
            return filed;
          }
          return "";
        },
      };
      schema.participantIds = { required: true, label: filed };
    }

    const newErrors = validateForm(form, schema);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the required fields");
      return;
    }

    setSaving(true);
    try {
      let payload;

      if (isBirthday) {
        const celebrantIds = monthCelebrants.map((m) => m.memberId);
        const allActiveParticipantIds = activeMembers.map((m) => m.memberId);

        const contributionOverrides = [];
        if (exempt) {
          celebrantIds.forEach((cId) => {
            contributionOverrides.push({ memberId: cId, amount: 0 });
          });
          allActiveParticipantIds.forEach((mId) => {
            if (!celebrantIds.includes(mId)) {
              contributionOverrides.push({
                memberId: mId,
                amount: contributionPerMember,
              });
            }
          });
        } else {
          allActiveParticipantIds.forEach((mId) => {
            contributionOverrides.push({
              memberId: mId,
              amount: contributionPerMember,
            });
          });
        }

        const celebrantsSummary = monthCelebrants
          .map((c) => `${c.name} (${dayjs(c.dateOfBirth).format("D MMM")})`)
          .join(", ");

        payload = {
          eventName: form.eventName.trim(),
          eventTypeId: form.eventTypeId,
          eventDate: dayjs(form.eventDate).hour(12).toISOString(),
          description:
            form.description?.trim() ||
            `Birthday celebration (${office} Office, ${wfh} WFH)${celebrantsSummary ? ` for ${celebrantsSummary}` : ""
            }. Planned Budget: ₹${plannedBudget.toLocaleString(
              "en-IN"
            )}, Contribution/member: ₹${contributionPerMember}`,
          baseAmount: plannedBudget,
          participantIds:
            allActiveParticipantIds.length > 0
              ? allActiveParticipantIds
              : form.participantIds,
          contributionOverrides: contributionOverrides,
        };
      } else {
        payload = {
          ...form,
          baseAmount: Number(String(form.baseAmount).replace(/[^0-9]/g, "") || 0),
          eventDate: dayjs(form.eventDate).hour(12).toISOString(),
        };
      }

      if (isEdit) {
        await UpdateEventAsync(id, payload);
        toast.success("Saved successfully");
      } else {
        // Sync dynamic QR code with per-member contribution amount to backend settings before event creation
        try {
          const qrConfig = getPaymentQrConfig();
          const targetAmount = isBirthday
            ? contributionPerMember
            : payload.participantIds?.length > 0
              ? Math.round(Number(payload.baseAmount) / payload.participantIds.length)
              : 0;

          const eventUpiUri = buildUpiPaymentUri({
            upiId: qrConfig.qrUpiId,
            receiverName: qrConfig.qrReceiverName,
            amount: targetAmount > 0 ? targetAmount : undefined,
            note: `Contribution for ${payload.eventName}`,
          });

          const eventQrImage = getQrCodeApiUrl(eventUpiUri, 300);

          if (eventQrImage) {
            await updateSystemSettings({
              ...qrConfig,
              qrImage: eventQrImage,
            });
          }
        } catch (syncErr) {
          console.warn("Could not sync event dynamic QR to backend settings before creation:", syncErr);
        }

        const createdEvent = await CreateEventAsync(payload);
        toast.success("Saved successfully");
      }

      navigate("/events");
    } catch (error) {
      toast.error("Failed to save event");
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

  if (loading) {
    return (
      <div className="page-shell">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress sx={{ color: "#4a3f6b" }} />
            <Typography variant="body2" color="text.secondary">
              Loading event configuration...
            </Typography>
          </Stack>
        </Box>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Paper
        elevation={0}
        sx={{
          border:
            theme.palette.mode === "dark"
              ? `1px solid ${theme.palette.divider}`
              : "1px solid rgba(224, 224, 224, 1)",
          borderRadius: "8px",
          overflow: "hidden",
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* Top Header Banner */}
        <Box
          sx={{
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(90deg, #171b2d 0%, #1d2338 100%)"
                : "linear-gradient(90deg, #4a3f6b 0%, #5d528b 100%)",
            color: "#ffffff",
            px: { xs: 2, sm: 3 },
            py: 1.2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 48,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Tooltip title="Back to Events">
              <IconButton
                size="small"
                onClick={() => navigate("/events")}
                sx={{
                  color: "#ffffff",
                  p: 0.5,
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ fontSize: "0.95rem", letterSpacing: "0.02em", color: "#ffffff" }}
            >
              {isEdit ? "Edit Event" : "Add Event"}
            </Typography>
          </Box>
        </Box>

        {/* Form Body Container */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Birthday Event Setup */}
          {isBirthday ? (
            <Grid container spacing={3}>
              {/* Left Column: Event Configuration Card */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "14px",
                    overflow: "hidden",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#ffffff",
                    boxShadow: "0 3px 12px rgba(20,60,90,0.06)",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.6,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700}>
                      Event Configuration
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppSelect
                          label="Event Category"
                          value={form.eventTypeId}
                          onChange={(e) => {
                            setForm((c) => ({ ...c, eventTypeId: e.target.value }));
                            if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
                          }}
                          options={typeOptions}
                          error={!!errors.eventTypeId}
                          helperText={errors.eventTypeId}
                          required
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppInput
                          label="Event Name"
                          placeholder="Enter event name"
                          required
                          value={form.eventName}
                          onChange={(e) => {
                            setForm((c) => ({ ...c, eventName: e.target.value }));
                            if (errors.eventName) setErrors((p) => ({ ...p, eventName: "" }));
                          }}
                          error={!!errors.eventName}
                          helperText={errors.eventName}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppDateInput
                          label="Event Date"
                          required
                          value={form.eventDate}
                          onChange={handleDateChange}
                          error={!!errors.eventDate}
                          helperText={errors.eventDate}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppInput
                          label="Total Active Members"
                          placeholder="Enter count"
                          type="Text"
                          value={totalMembers}
                          onChange={(e) =>
                            setTotalMembers(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppInput
                          label="Office Birthday Members"
                          placeholder="Enter count"
                          type="Text"
                          value={officeBirthdays}
                          onChange={(e) =>
                            setOfficeBirthdays(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppInput
                          label="WFH Birthday Members"
                          placeholder="Enter count"
                          type="Text"
                          value={wfhBirthdays}
                          onChange={(e) =>
                            setWfhBirthdays(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                        />
                      </Grid>
                    </Grid>



                    {/* Celebrants detected for current month */}
                    {monthCelebrants.length > 0 && (
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: "8px",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(22, 119, 200, 0.04)",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color="text.secondary"
                          sx={{ display: "block", mb: 0.8 }}
                        >
                          Identified Celebrants in {dayjs(form.eventDate).format("MMMM")} ({monthCelebrants.length}):
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {monthCelebrants.map((m) => (
                            <Chip
                              key={m.memberId}
                              label={`${m.name} (${m.memberType || "Office"}) - ${m.dateOfBirth ? dayjs(m.dateOfBirth).format("D MMM") : ""
                                }`}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                bgcolor:
                                  (m.memberType || "Office").toLowerCase() === "wfh"
                                    ? "rgba(121, 87, 213, 0.1)"
                                    : "rgba(22, 119, 200, 0.1)",
                                color:
                                  (m.memberType || "Office").toLowerCase() === "wfh"
                                    ? "#7957d5"
                                    : "#1677c8",
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Right Column: Calculated Event Summary Card */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "14px",
                    overflow: "hidden",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#ffffff",
                    boxShadow: "0 3px 12px rgba(20,60,90,0.06)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.6,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700}>
                      Calculated Event Summary
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2.5,
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <MetricLine label="Birthday Members" value={bdays} />
                    <MetricLine label="Office / WFH" value={`${office} / ${wfh}`} />
                    <MetricLine label="Eligible Contributors" value={eligible} />
                    <MetricLine
                      label="Planned Budget"
                      value={`₹${plannedBudget.toLocaleString("en-IN")}`}
                    />
                    <MetricLine
                      label="Contribution / Member"
                      value={`₹${contributionPerMember.toLocaleString("en-IN")}`}
                      highlight
                    />
                    <MetricLine
                      label="Expected Collection"
                      value={`₹${expectedCollection.toLocaleString("en-IN")}`}
                    />
                    <MetricLine
                      label="Rounding Surplus"
                      value={`₹${roundingSurplus.toLocaleString("en-IN")}`}
                      isLast
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Bottom Card: Budget Breakdown */}
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "14px",
                    overflow: "hidden",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#ffffff",
                    boxShadow: "0 3px 12px rgba(20,60,90,0.06)",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.6,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        Budget Calculations
                      </Typography>
                      <Chip
                        label={`₹${plannedBudget.toLocaleString("en-IN")} Total Budget ÷ ${eligible} Members = ₹${contributionPerMember}/person`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(124, 58, 237, 0.15)"
                              : "rgba(74, 63, 107, 0.08)",
                          color: (theme) => (theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.78rem",
                        lineHeight: 1.5,
                        color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#1e293b"),
                        fontWeight: 600,
                        "& strong": {
                          fontWeight: 800,
                          color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
                        },
                      }}
                    >
                      Calculation: {dynamicFormulaText ? (
                        <span>{dynamicFormulaText}</span>
                      ) : (
                        <span>Calculation of active budget items</span>
                      )}. Total planned budget is divided equally among eligible contributing members.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2.5 }}>
                    {/* Header row */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1.5fr 1.2fr 1fr 1.1fr", sm: "2fr 1.4fr 1fr 1.2fr" },
                        gap: 2,
                        pb: 1.2,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "text.secondary",
                        alignItems: "center",
                      }}
                    >
                      <Box sx={{ textAlign: "left" }}>Expense Item</Box>
                      <Box sx={{ textAlign: "left" }}>Calculation</Box>
                      <Box sx={{ textAlign: "right" }}>Rate</Box>
                      <Box sx={{ textAlign: "right" }}>Amount</Box>
                    </Box>

                    {/* Dynamic Budget Calculation Rows */}
                    {computedBudgetItems.map((item, idx) => {
                      const isLast = idx === computedBudgetItems.length - 1;
                      return (
                        <Box
                          key={item.budgetCalculationId || item.expenseItem || idx}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1.5fr 1.2fr 1fr 1.1fr", sm: "2fr 1.4fr 1fr 1.2fr" },
                            gap: 2,
                            py: 1.4,
                            borderBottom: isLast ? "2px solid" : "1px solid",
                            borderColor: "divider",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} sx={{ textAlign: "left" }}>
                            {item.expenseItem}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "left" }}>
                            {item.calcText}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right" }}>
                            ₹{item.rate.toLocaleString("en-IN")}
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ textAlign: "right" }}>
                            ₹{item.amount.toLocaleString("en-IN")}
                          </Typography>
                        </Box>
                      );
                    })}

                    {/* Total Summary Row under Amount */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1.5fr 1.2fr 1fr 1.1fr", sm: "2fr 1.4fr 1fr 1.2fr" },
                        gap: 2,
                        pt: 1.6,
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        sx={{
                          gridColumn: "span 3",
                          textAlign: "right",
                          pr: 1,
                          color: "text.primary",
                          fontSize: "0.9rem",
                        }}
                      >
                        Total Amount:
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        fontWeight={900}
                        sx={{
                          textAlign: "right",
                          color: (theme) => (theme.palette.mode === "dark" ? "#c4b5fd" : "#4a3f6b"),
                          fontSize: "1.1rem",
                        }}
                      >
                        ₹{plannedBudget.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ) : (
            /* Non-Birthday Event Standard Form */
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppSelect
                  label="Event Category"
                  value={form.eventTypeId}
                  onChange={(e) => {
                    setForm((c) => ({ ...c, eventTypeId: e.target.value }));
                    if (errors.eventTypeId) setErrors((p) => ({ ...p, eventTypeId: "" }));
                  }}
                  options={typeOptions}
                  error={!!errors.eventTypeId}
                  helperText={errors.eventTypeId}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppInput
                  label="Event Name"
                  placeholder="Enter event name"
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
                <AppInput
                  label="Base Amount"
                  placeholder="Enter base amount (₹)"
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
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppDateInput
                  label="Event Date"
                  value={form.eventDate}
                  onChange={(newValue) => {
                    setForm((current) => ({ ...current, eventDate: newValue }));
                    if (errors.eventDate) setErrors((prev) => ({ ...prev, eventDate: "" }));
                  }}
                  error={!!errors.eventDate}
                  helperText={errors.eventDate}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AppMultiSelect
                  label="Participants"
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
              <Grid size={{ xs: 12, md: 6 }}>
                <AppTextArea
                  label="Description"
                  placeholder="Enter event description..."
                  minRows={2}
                  maxRows={4}
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                />
              </Grid>


            </Grid>
          )}

          {/* Bottom Action Footer */}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
            <AppButton
              variant="outlined"
              onClick={() => navigate("/events")}
              disabled={saving}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
              sx={{
                bgcolor: "#4a3f6b !important",
                "&:hover": { bgcolor: "#3b325c !important" },
              }}
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </AppButton>
          </Box>
        </Box>
      </Paper>
    </div>
  );
}

function MetricLine({ label, value, highlight, isLast }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.1,
        borderBottom: isLast ? "none" : "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.88rem" }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: highlight ? 900 : 700,
          fontSize: highlight ? "1.05rem" : "0.95rem",
          color: highlight ? "#1677c8" : "text.primary",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
