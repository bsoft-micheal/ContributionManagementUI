import React, { useState, useEffect, useRef } from "react";
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
  DeleteOutline as DeleteOutlineIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppInput from "../common/AppInput";
import AppSelect from "../common/AppSelect";
import AppDateInput from "../common/AppDateInput";
import AppTextArea from "../common/AppTextArea";
import AppButton from "../common/AppButton";
import { useAppToast } from "../common/AppToast";
import { getGalleryPhotosAsync, createGalleryPhotoAsync } from "../../services/galleryService";
import { getEventTypesAsync } from "../../services/eventTypeService";
import { extractImages } from "../../pages/gallery/GalleryPage";
import { TOAST_MESSAGES } from "../../constants";

const initialForm = {
  title: "",
  eventName: "",
  category: "",
  takenDate: dayjs(),
  imageUrl: "",
  imageUrls: [],
  description: "",
};

export default function EventAddPhotoDialog({
  open,
  onClose,
  event,
  onPhotosSaved,
}) {
  const toast = useAppToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [existingEventPhotoCount, setExistingEventPhotoCount] = useState(0);
  const [eventTypesList, setEventTypesList] = useState([]);

  useEffect(() => {
    if (!open || !event) {
      setForm(initialForm);
      setErrors({});
      setSaving(false);
      setExistingEventPhotoCount(0);
      return;
    }

    const initialCat =
      event.eventTypeName ||
      event.category ||
      event.categoryName ||
      (Array.isArray(event.eventTypeNames) && event.eventTypeNames[0]) ||
      "Birthday";

    const initialEventDate = event.eventDate ? dayjs(event.eventDate) : dayjs();

    const rawDefaultTitle = `${event.eventName || "Event"} Celebration Photos`;
    const cleanDefaultTitle = rawDefaultTitle.replace(/[^A-Za-z\s]/g, "").slice(0, 50);

    setForm({
      title: cleanDefaultTitle,
      eventName: event.eventName || "",
      category: initialCat,
      takenDate: initialEventDate.isValid() ? initialEventDate : dayjs(),
      imageUrl: "",
      imageUrls: [],
      description: "",
    });
    setErrors({});

    let isMounted = true;
    const fetchEventData = async () => {
      setLoadingData(true);
      try {
        const [photosData, typesData] = await Promise.all([
          getGalleryPhotosAsync().catch(() => []),
          getEventTypesAsync().catch(() => []),
        ]);

        if (!isMounted) return;

        setEventTypesList(Array.isArray(typesData) ? typesData : []);

        const targetEventName = (event.eventName || "").trim().toLowerCase();
        let totalExisting = 0;

        (photosData || []).forEach((photo) => {
          const photoEvent = (photo.eventName || "").trim().toLowerCase();
          if (photoEvent && photoEvent === targetEventName) {
            const extracted = extractImages(photo.imageUrl);
            totalExisting += Math.max(extracted.length, 1);
          }
        });

        setExistingEventPhotoCount(totalExisting);
      } catch {
        // Handle gracefully
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchEventData();

    return () => {
      isMounted = false;
    };
  }, [open, event]);

  const maxAllowedForEvent = Math.max(0, 5 - existingEventPhotoCount);

  const handleMultipleImageUpload = (files) => {
    if (!files || files.length === 0) return;

    if (maxAllowedForEvent <= 0) {
      toast.error(
        `Event "${event?.eventName}" has already reached the maximum limit of 5 photos. Cannot add more photos.`
      );
      return;
    }

    const currentImages = form.imageUrls || (form.imageUrl ? [form.imageUrl] : []);
    const availableSlots = maxAllowedForEvent - currentImages.length;

    if (availableSlots <= 0) {
      toast.error(
        `Maximum limit is ${maxAllowedForEvent} photo(s) for this entry (Event already has ${existingEventPhotoCount} photo(s), max 5 per event).`
      );
      return;
    }

    const fileList = Array.from(files);
    let filesToProcess = fileList;
    if (fileList.length > availableSlots) {
      toast.warning(
        `Event already has ${existingEventPhotoCount} photo(s). Only ${availableSlots} more photo(s) allowed (Max 5 per event). Selecting first ${availableSlots} photo(s).`
      );
      filesToProcess = fileList.slice(0, availableSlots);
    }

    const MAX_BATCH_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    let totalSize = 0;

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not a supported image file.`);
        return;
      }
      if (file.size > MAX_BATCH_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 10MB size limit.`);
        return;
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_BATCH_SIZE_BYTES) {
      toast.error(`Selected images total exceeds 10MB limit.`);
      return;
    }

    let processedCount = 0;
    const optimizedUrls = [];

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const rawDataUrl = uploadEvt.target.result;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedUrl = canvas.toDataURL("image/jpeg", 0.78);
          optimizedUrls.push(optimizedUrl);
          processedCount++;
          if (processedCount === filesToProcess.length) {
            appendOptimizedImages(optimizedUrls);
          }
        };
        img.onerror = () => {
          optimizedUrls.push(rawDataUrl);
          processedCount++;
          if (processedCount === filesToProcess.length) {
            appendOptimizedImages(optimizedUrls);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });

    const appendOptimizedImages = (newUrls) => {
      setForm((prev) => {
        const existing = prev.imageUrls || (prev.imageUrl ? [prev.imageUrl] : []);
        const merged = [...existing, ...newUrls].slice(0, maxAllowedForEvent);
        return {
          ...prev,
          imageUrls: merged,
          imageUrl: merged[0] || "",
        };
      });
      if (errors.imageUrl) setErrors((prev) => ({ ...prev, imageUrl: "" }));
      toast.success(`${newUrls.length} image(s) attached successfully!`);
    };
  };

  const handleRemoveImageIndex = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    setForm((prev) => {
      const updated = (prev.imageUrls || []).filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated[0] || "",
      };
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearAllImages = (e) => {
    if (e) e.stopPropagation();
    setForm((prev) => ({
      ...prev,
      imageUrls: [],
      imageUrl: "",
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const filed = "This field is required";
    const newErrors = {};

    if (!form.title || !form.title.trim()) {
      newErrors.title = filed;
    } else if (!/^[A-Za-z\s]+$/.test(form.title.trim())) {
      newErrors.title = "Only letters and spaces are allowed";
    } else if (form.title.trim().length > 50) {
      newErrors.title = "Title must be at most 50 characters";
    }

    if (!form.category) newErrors.category = "Event Type is required";
    if (!form.eventName) newErrors.eventName = "Event Name is required";

    if (maxAllowedForEvent === 0) {
      toast.error(
        `Event "${event?.eventName}" already has the maximum limit of 5 photos. Cannot add more photos.`
      );
      return;
    }

    const currentImages =
      form.imageUrls && form.imageUrls.length > 0
        ? form.imageUrls
        : form.imageUrl
        ? [form.imageUrl]
        : [];

    if (currentImages.length === 0) {
      newErrors.imageUrl =
        maxAllowedForEvent > 0
          ? `Please upload at least 1 image file (up to ${maxAllowedForEvent} photo(s))`
          : "Event limit reached (Max 5 photos per event)";
    } else if (currentImages.length > maxAllowedForEvent) {
      newErrors.imageUrl = `You can only upload up to ${maxAllowedForEvent} photo(s) (Event already has ${existingEventPhotoCount} photos, total max 5 per event).`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(TOAST_MESSAGES.GENERAL.REQUIRED_FIELDS);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        eventName: form.eventName,
        category: form.category,
        imageUrl:
          currentImages.length > 1
            ? JSON.stringify(currentImages)
            : currentImages[0] || "",
        takenDate: form.takenDate
          ? form.takenDate.toISOString()
          : new Date().toISOString(),
        description: form.description || "",
      };

      await createGalleryPhotoAsync(payload);
      toast.success(
        currentImages.length > 1
          ? `Gallery entry with ${currentImages.length} photos added successfully!`
          : "Photo uploaded successfully!"
      );

      if (onPhotosSaved) {
        onPhotosSaved();
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || TOAST_MESSAGES.GENERAL.SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  const currentSelectedImages = form.imageUrls || (form.imageUrl ? [form.imageUrl] : []);

  return (
    <AppDialog
      open={open}
      onClose={saving ? undefined : onClose}
      title={`Add Photos — ${event.eventName || "Event"}`}
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
            disabled={saving || maxAllowedForEvent <= 0}
            sx={{
              minWidth: 110,
              bgcolor: "#342b54 !important",
              color: "#ffffff !important",
              "&:hover": { bgcolor: "#241d3b !important" },
            }}
          >
            {saving ? "Uploading..." : "Save Photos"}
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
          {/* Row 1: Title */}
          <Grid size={{ xs: 12 }}>
            <AppInput
              label="Title"
              placeholder="e.g. Birthday celebration moments"
              value={form.title}
              maxLength={50}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 50);
                setForm((c) => ({ ...c, title: sanitized }));
                if (errors.title) setErrors((p) => ({ ...p, title: "" }));
              }}
              error={!!errors.title}
              helperText={errors.title}
              required
            />
          </Grid>

          {/* Row 2: Event Type and Event Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Event Type"
              value={form.category}
              disabled
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

          {/* Row 3: Taken Date */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateInput
              label="Taken Date"
              value={form.takenDate}
              onChange={(newVal) => {
                setForm((c) => ({ ...c, takenDate: newVal }));
              }}
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ pt: 2.8 }}>
              <Chip
                label={`Photos for Event: ${existingEventPhotoCount + currentSelectedImages.length} / 5 max`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  bgcolor:
                    existingEventPhotoCount >= 5
                      ? "rgba(239, 68, 68, 0.12)"
                      : "rgba(124, 58, 237, 0.12)",
                  color: existingEventPhotoCount >= 5 ? "#ef4444" : "#7c3aed",
                  border: "1px solid",
                  borderColor:
                    existingEventPhotoCount >= 5
                      ? "rgba(239, 68, 68, 0.25)"
                      : "rgba(124, 58, 237, 0.25)",
                }}
              />
            </Box>
          </Grid>

          {/* Row 4: Multi-Photo Upload Area */}
          <Grid size={{ xs: 12 }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={(e) => {
                handleMultipleImageUpload(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />

            {maxAllowedForEvent <= 0 ? (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: "10px",
                  bgcolor: "rgba(239, 68, 68, 0.08)",
                  border: "1px dashed #ef4444",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" sx={{ color: "error.main", fontWeight: 700 }}>
                  Event "{event.eventName}" has reached the maximum photo limit (5 / 5 photos).
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  To add new photos, delete existing photos from the Gallery first.
                </Typography>
              </Box>
            ) : (
              <Box
                onClick={() => {
                  if (currentSelectedImages.length === 0) {
                    fileInputRef.current?.click();
                  }
                }}
                sx={{
                  border: "1.5px dashed",
                  borderColor: errors.imageUrl
                    ? "error.main"
                    : currentSelectedImages.length > 0
                    ? "#10b981"
                    : (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)"),
                  borderRadius: "10px",
                  p: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.02)"),
                  cursor: currentSelectedImages.length === 0 ? "pointer" : "default",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#4a3f6b",
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(74,63,107,0.04)"),
                  },
                }}
              >
                {currentSelectedImages.length > 0 ? (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1.5,
                        pb: 1,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
                        Selected Photos ({currentSelectedImages.length}/{maxAllowedForEvent})
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {currentSelectedImages.length < maxAllowedForEvent && (
                          <AppButton
                            size="small"
                            variant="outlined"
                            startIcon={<AddPhotoAlternateIcon sx={{ fontSize: 16 }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            sx={{ fontSize: "0.72rem", height: 26, py: 0, px: 1 }}
                          >
                            Add More ({maxAllowedForEvent - currentSelectedImages.length} left)
                          </AppButton>
                        )}
                        <AppButton
                          size="small"
                          variant="text"
                          color="error"
                          onClick={handleClearAllImages}
                          sx={{ fontSize: "0.72rem", height: 26, minWidth: "auto", p: 0.5 }}
                        >
                          Clear All
                        </AppButton>
                      </Box>
                    </Box>

                    {/* Thumbnails Grid */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "repeat(2, 1fr)",
                          sm: "repeat(3, 1fr)",
                          md: `repeat(${Math.min(currentSelectedImages.length + (currentSelectedImages.length < maxAllowedForEvent ? 1 : 0), 4)}, 1fr)`,
                        },
                        gap: 1.5,
                      }}
                    >
                      {currentSelectedImages.map((url, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            position: "relative",
                            borderRadius: "10px",
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            aspectRatio: "4 / 3",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Box
                            component="img"
                            src={url}
                            alt={`Uploaded Photo ${idx + 1}`}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />

                          <Chip
                            label={`#${idx + 1}`}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 6,
                              left: 6,
                              height: 18,
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              bgcolor: "rgba(0,0,0,0.7)",
                              color: "#ffffff",
                            }}
                          />

                          <Tooltip title="Remove photo">
                            <IconButton
                              size="small"
                              onClick={(e) => handleRemoveImageIndex(idx, e)}
                              sx={{
                                position: "absolute",
                                top: 5,
                                right: 5,
                                bgcolor: "rgba(239, 68, 68, 0.9)",
                                color: "#ffffff",
                                p: 0.4,
                                "&:hover": {
                                  bgcolor: "#dc2626",
                                  transform: "scale(1.1)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}

                      {currentSelectedImages.length < maxAllowedForEvent && (
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          sx={{
                            border: "1.5px dashed",
                            borderColor: (t) =>
                              t.palette.mode === "dark"
                                ? "rgba(255,255,255,0.25)"
                                : "rgba(74,63,107,0.3)",
                            borderRadius: "10px",
                            aspectRatio: "4 / 3",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            p: 1,
                            bgcolor: (t) =>
                              t.palette.mode === "dark"
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(74,63,107,0.02)",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: "#4a3f6b",
                              bgcolor: (t) =>
                                t.palette.mode === "dark"
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(74,63,107,0.06)",
                            },
                          }}
                        >
                          <AddPhotoAlternateIcon sx={{ fontSize: 26, color: "#4a3f6b", mb: 0.5 }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.7rem", color: "text.primary" }}>
                            Add Photo
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.62rem" }}>
                            {maxAllowedForEvent - currentSelectedImages.length} slot(s) left
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{ color: "#10b981", fontWeight: 700, mt: 1.2, display: "block" }}
                    >
                      ✓ {currentSelectedImages.length} photo(s) selected (Total Event Photos: {existingEventPhotoCount + currentSelectedImages.length}/5)
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center", py: 2 }}>
                    <CloudUploadIcon
                      sx={{
                        fontSize: 36,
                        color: errors.imageUrl ? "error.main" : "#4a3f6b",
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: errors.imageUrl
                          ? "error.main"
                          : (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                      }}
                    >
                      Click to browse or drop images from device
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block", mt: 0.4 }}
                    >
                      Select up to {maxAllowedForEvent} image(s) • Max 5 photos per event • Maximum 10MB total • JPG, PNG, WebP
                    </Typography>
                    {errors.imageUrl && (
                      <Typography
                        variant="caption"
                        sx={{ color: "error.main", fontWeight: 700, mt: 0.6, display: "block" }}
                      >
                        {errors.imageUrl}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Grid>

          {/* Row 5: Description */}
          <Grid size={{ xs: 12 }}>
            <AppTextArea
              label="Description"
              placeholder="Optional photo caption or memory details..."
              value={form.description}
              onChange={(e) => {
                setForm((c) => ({ ...c, description: e.target.value }));
              }}
              minRows={2}
              maxRows={3}
            />
          </Grid>
        </Grid>
      )}
    </AppDialog>
  );
}
