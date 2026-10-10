import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  CloudUploadOutlined as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  DeleteOutline as DeleteOutlineIcon,
  ReceiptLong as ReceiptLongIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppTextArea from "../common/AppTextArea";
import AppButton from "../common/AppButton";
import { useAppToast } from "../common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { createExpenseAsync, getExpensesAsync } from "../../services/expenseService";
import { getMembersAsync } from "../../services/memberService";
import { getUsersAsync } from "../../services/userService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { TOAST_MESSAGES, COMMON_STRINGS } from "../../constants";

const initialForm = {
  eventName: "",
  category: "",
  amount: "",
  expenseDate: dayjs(),
  description: "",
  submittedBy: "",
  status: "Pending",
  attachment: "",
  attachmentName: "",
};

export default function EventAddExpenseDialog({
  open,
  onClose,
  event,
  onExpenseSaved,
}) {
  const toast = useAppToast();
  const { authState } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [existingExpenses, setExistingExpenses] = useState([]);

  useEffect(() => {
    if (!open || !event) {
      setForm(initialForm);
      setErrors({});
      setSaving(false);
      return;
    }

    const initialCat =
      event.eventTypeName ||
      event.category ||
      event.categoryName ||
      (Array.isArray(event.eventTypeNames) && event.eventTypeNames[0]) ||
      "";

    const initialEventDate = event.eventDate ? dayjs(event.eventDate) : dayjs();

    const currentUserName =
      authState?.fullName ||
      authState?.name ||
      authState?.user?.fullName ||
      authState?.user?.name ||
      authState?.username ||
      "";

    setForm({
      eventName: event.eventName || "",
      category: initialCat,
      amount: "",
      expenseDate: initialEventDate.isValid() ? initialEventDate : dayjs(),
      description: "",
      submittedBy: currentUserName,
      status: "Pending",
      attachment: "",
      attachmentName: "",
    });
    setErrors({});

    let isMounted = true;
    const loadDependencies = async () => {
      setLoadingData(true);
      try {
        const [membersRes, usersRes, eventTypesRes, expensesRes] = await Promise.all([
          getMembersAsync().catch(() => []),
          getUsersAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
          getExpensesAsync().catch(() => []),
        ]);

        if (!isMounted) return;

        const combinedMembers = Array.isArray(membersRes) ? [...membersRes] : [];
        const existingIds = new Set(
          combinedMembers.map((m) => String(m.memberId || m.id || m.userId).toLowerCase()).filter(Boolean)
        );
        const existingNames = new Set(
          combinedMembers.map((m) => (m.name || m.fullName || "").toLowerCase().trim()).filter(Boolean)
        );

        if (Array.isArray(usersRes)) {
          usersRes.forEach((u) => {
            const uid = String(u.userId || u.id || "").toLowerCase();
            const uname = (u.fullName || u.name || "").toLowerCase().trim();
            if (uid && !existingIds.has(uid) && (!uname || !existingNames.has(uname))) {
              existingIds.add(uid);
              combinedMembers.push({
                memberId: u.userId || u.id,
                name: u.fullName || u.name,
                roleName: u.roleName || "Member",
              });
            }
          });
        }

        setMembersList(combinedMembers);
        setEventTypesList(Array.isArray(eventTypesRes) ? eventTypesRes : []);
        setExistingExpenses(Array.isArray(expensesRes) ? expensesRes : []);
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    loadDependencies();

    return () => {
      isMounted = false;
    };
  }, [open, event, authState]);

  // Compute budget details for the selected event
  const eventBudget = useMemo(() => {
    if (!event) return null;
    const expected = Number(
      event.totalExpectedAmount ??
      event.expectedAmount ??
      event.expectedCollection ??
      event.baseAmount ??
      event.valuation ??
      0
    );

    const targetEventName = (event.eventName || "").trim().toLowerCase();
    const spent = existingExpenses
      .filter((ex) => {
        const exEvent = (ex.eventName || "").trim().toLowerCase();
        return exEvent === targetEventName && (ex.status || "").toLowerCase() !== "rejected";
      })
      .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);

    const remaining = Math.max(0, expected - spent);
    return {
      expected,
      spent,
      remaining,
    };
  }, [event, existingExpenses]);

  // Member dropdown options
  const memberOptions = useMemo(() => {
    const list = [{ label: "Select Member", value: "" }];
    const unique = new Set();
    membersList.forEach((m) => {
      const name = m.name || m.fullName || m.memberName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({
          label: `${name}${m.roleName ? ` (${m.roleName})` : ""}`,
          value: name,
        });
      }
    });

    if (form.submittedBy && !unique.has(form.submittedBy)) {
      list.push({ label: form.submittedBy, value: form.submittedBy });
    }

    return list;
  }, [membersList, form.submittedBy]);

  // Category dropdown options
  const categoryOptions = useMemo(() => {
    const set = new Set();
    if (form.category) set.add(form.category);
    eventTypesList.forEach((et) => {
      if (et.eventTypeName) set.add(et.eventTypeName);
    });
    const items = Array.from(set);
    return items.map((c) => ({ label: c, value: c }));
  }, [eventTypesList, form.category]);

  const handleImageChange = (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file (PNG, JPG, JPEG).");
        return;
      }

      const MAX_SIZE = 3 * 1024 * 1024; // 3MB limit
      if (file.size > MAX_SIZE) {
        toast.error("Image size exceeds maximum limit of 3 MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        setForm((c) => ({
          ...c,
          attachment: uploadEvt.target.result,
          attachmentName: file.name,
        }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.attachment;
          return next;
        });
        toast.success(`Image "${file.name}" attached successfully!`);
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to process attachment");
    }
  };

  const handleRemoveAttachment = (e) => {
    if (e) e.stopPropagation();
    setForm((c) => ({
      ...c,
      attachment: "",
      attachmentName: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!form.eventName) newErrors.eventName = "Event Name is required";
    if (!form.category) newErrors.category = "Event Type is required";
    if (!form.amount || Number(form.amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    } else if (eventBudget && eventBudget.expected > 0 && Number(form.amount) > eventBudget.remaining) {
      newErrors.amount = COMMON_STRINGS.EXPENSES?.AMOUNT_EXCEEDS_BUDGET
        ? COMMON_STRINGS.EXPENSES.AMOUNT_EXCEEDS_BUDGET(eventBudget.remaining)
        : `Amount cannot exceed the remaining budget (₹${eventBudget.remaining.toLocaleString()})`;
    }
    if (!form.submittedBy) newErrors.submittedBy = "Submitted by is required";
    if (!form.attachment) {
      newErrors.attachment = "Attachment (1 Image) is required";
    }
    if (!form.description || !form.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.amount && eventBudget && eventBudget.expected > 0 && Number(form.amount) > eventBudget.remaining) {
        toast.error(newErrors.amount);
      } else {
        toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      }
      return;
    }

    try {
      setSaving(true);
      const payload = {
        eventName: form.eventName,
        category: form.category,
        amount: Number(form.amount),
        expenseDate: form.expenseDate ? form.expenseDate.toISOString() : new Date().toISOString(),
        status: "Pending",
        submittedBy: form.submittedBy,
        approvedBy: "-",
        description: form.description.trim(),
        fileName: form.attachmentName || "",
        fileData: form.attachment || null,
      };

      await createExpenseAsync(payload);
      toast.success(TOAST_MESSAGES.EXPENSES.CREATED_SUCCESS || "Expense added successfully!");
      if (onExpenseSaved) {
        onExpenseSaved();
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <AppDialog
      open={open}
      onClose={saving ? undefined : onClose}
      title={`Add Expense — ${event.eventName || "Event Name"}`}
      maxWidth="md"
      actions={
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end" sx={{ width: "100%" }}>
          <AppButton
            variant="outlined"
            onClick={onClose}
            disabled={saving}
            sx={{ minWidth: 90 }}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              minWidth: 110,
              bgcolor: "#342b54 !important",
              color: "#ffffff !important",
              "&:hover": { bgcolor: "#241d3b !important" },
            }}
          >
            {saving ? "Saving..." : "Save Expense"}
          </AppButton>
        </Stack>
      }
    >
      {loadingData ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
          <CircularProgress size={36} sx={{ color: "#7c3aed" }} />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ pt: 0.5 }}>
          {/* Row 1: Event Type and Event Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Type"
              placeholder="Select Event Type"
              value={form.category}
              onChange={(e) => {
                setForm((c) => ({ ...c, category: e.target.value }));
                if (errors.category) setErrors((p) => ({ ...p, category: "" }));
              }}
              options={categoryOptions}
              error={!!errors.category}
              helperText={errors.category}
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Event Name"
              value={form.eventName}
              disabled
              required
            />
          </Grid>

          {/* Budget Info Card for this Event */}
          {eventBudget && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(124, 58, 237, 0.08)" : "rgba(124, 58, 237, 0.04)"),
                  border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(124, 58, 237, 0.25)" : "rgba(124, 58, 237, 0.18)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    Expected Budget
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                    ₹{eventBudget.expected.toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    Already Spent
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "warning.main" }}>
                    ₹{eventBudget.spent.toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    Remaining Limit
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: eventBudget.remaining > 0 ? "success.main" : "error.main" }}>
                    ₹{eventBudget.remaining.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Row 2: Amount & Expense Date */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Amount"
              placeholder="₹ Enter expense amount"
              value={form.amount}
              onChange={(e) => {
                const val = e.target.value;
                setForm((c) => ({ ...c, amount: val }));
                if (eventBudget && eventBudget.expected > 0 && Number(val) > eventBudget.remaining) {
                  setErrors((p) => ({
                    ...p,
                    amount: `Amount cannot exceed remaining budget (₹${eventBudget.remaining.toLocaleString("en-IN")})`,
                  }));
                } else if (errors.amount) {
                  setErrors((p) => ({ ...p, amount: "" }));
                }
              }}
              restrictType="numberonly"
              error={!!errors.amount}
              helperText={
                errors.amount ||
                (eventBudget && eventBudget.expected > 0
                  ? `Max allowable: ₹${eventBudget.remaining.toLocaleString("en-IN")}`
                  : undefined)
              }
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateInput
              label="Expense Date"
              value={form.expenseDate}
              onChange={(newVal) => {
                setForm((c) => ({ ...c, expenseDate: newVal }));
                if (errors.expenseDate) setErrors((p) => ({ ...p, expenseDate: "" }));
              }}
              required
            />
          </Grid>

          {/* Row 3: Submitted By */}
          <Grid size={{ xs: 12 }}>
            <AppSelect
              label="Submitted By"
              placeholder="Select Member"
              value={form.submittedBy}
              onChange={(e) => {
                setForm((c) => ({ ...c, submittedBy: e.target.value }));
                if (errors.submittedBy) setErrors((p) => ({ ...p, submittedBy: "" }));
              }}
              options={memberOptions}
              error={!!errors.submittedBy}
              helperText={errors.submittedBy}
              required
            />
          </Grid>

          {/* Row 4: Attachment */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: (t) => (t.palette.mode === "dark" ? "#e2e8f0" : "#334155") }}>
                  Attachment (1 Image, Max 3MB) <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                {form.attachment && (
                  <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 700, fontSize: "0.7rem" }}>
                    ✓ Image Attached
                  </Typography>
                )}
              </Box>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageChange}
              />

              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: "1.5px dashed",
                  borderColor: errors.attachment
                    ? "error.main"
                    : form.attachment
                    ? "#16a34a"
                    : (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)"),
                  borderRadius: "8px",
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.02)"),
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#4a3f6b",
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.05)"),
                  },
                }}
              >
                {form.attachment ? (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        component="img"
                        src={form.attachment}
                        alt="Receipt Preview"
                        sx={{
                          width: 44,
                          height: 44,
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #16a34a",
                        }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                          {form.attachmentName || "Attached Receipt"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                          Click to replace image
                        </Typography>
                      </Box>
                    </Box>

                    <Tooltip title="Remove Image">
                      <IconButton
                        size="small"
                        onClick={handleRemoveAttachment}
                        sx={{
                          color: "error.main",
                          bgcolor: "rgba(239, 68, 68, 0.1)",
                          "&:hover": { bgcolor: "rgba(239, 68, 68, 0.2)" },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
                    <CloudUploadIcon sx={{ fontSize: 28, color: errors.attachment ? "error.main" : "#4a3f6b" }} />
                    <Box>
                      <Typography variant="caption" fontWeight={700} sx={{ color: errors.attachment ? "error.main" : "text.primary" }}>
                        Click to browse or upload receipt image
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.68rem" }}>
                        PNG, JPG, JPEG up to 3MB
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              {errors.attachment && (
                <Typography variant="caption" sx={{ color: "error.main", fontSize: "0.72rem", mt: 0.3 }}>
                  {errors.attachment}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Row 5: Description */}
          <Grid size={{ xs: 12 }}>
            <AppTextArea
              label="Description"
              placeholder="Enter expense description / vendor details..."
              value={form.description}
              onChange={(e) => {
                setForm((c) => ({ ...c, description: e.target.value }));
                if (errors.description) setErrors((p) => ({ ...p, description: "" }));
              }}
              error={!!errors.description}
              helperText={errors.description}
              required
              minRows={2}
              maxRows={3}
            />
          </Grid>
        </Grid>
      )}
    </AppDialog>
  );
}
