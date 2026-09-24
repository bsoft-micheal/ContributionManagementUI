import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  CloudUploadOutlined as CloudUploadIcon,
  DeleteOutline as DeleteOutlineIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PhotoLibrary as PhotoLibraryIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatGridDate, formatViewDate } from "../../utils/dateHelper";

import { useAppToast } from "../../components/common/AppToast";
import { useAuth } from "../../contexts/AuthContext";
import { getRightsForPage } from "../../utils/rightsHelper";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppDateInput from "../../components/common/AppDateInput";
import AppTextArea from "../../components/common/AppTextArea";
import AppButton from "../../components/common/AppButton";
import AppDataTable from "../../components/common/AppDataTable";
import AppDialog from "../../components/common/AppDialog";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import {
  getGalleryPhotosAsync,
  createGalleryPhotoAsync,
  deleteGalleryPhotoAsync,
} from "../../services/galleryService";
import { GetEventsAsync } from "../../services/eventService";
import { GetEventTypesAsync } from "../../services/eventTypeService";

// Helper to safely extract an array of image URLs/data from any format
export const extractImages = (rawImageUrl) => {
  if (!rawImageUrl) return [];
  if (Array.isArray(rawImageUrl)) return rawImageUrl.filter(Boolean);
  if (typeof rawImageUrl === "string") {
    const trimmed = rawImageUrl.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {
        // fallback
      }
    }
    if (trimmed.includes("|||")) {
      return trimmed.split("|||").map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

const initialForm = {
  title: "",
  eventName: "",
  category: "",
  takenDate: dayjs(),
  imageUrl: "",
  imageUrls: [],
  description: "",
};

export default function GalleryPage() {
  const { authState } = useAuth();
  const rights = getRightsForPage("Gallery", authState?.role);
  const hasWriteAccess = rights?.write !== undefined ? rights.write : true;
  const toast = useAppToast();
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeViewImageIndex, setActiveViewImageIndex] = useState(0);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  // Filter state inside AppDataTable filterPanel
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [appliedEvent, setAppliedEvent] = useState("ALL");
  const [appliedCategory, setAppliedCategory] = useState("ALL");

  const fetchPhotosFromDb = async () => {
    try {
      setLoading(true);
      const data = await getGalleryPhotosAsync();
      if (Array.isArray(data)) {
        // Group items if they were saved with Title (1), Title (2) under same event/date
        const groupedMap = new Map();

        data.forEach((item, idx) => {
          const rawTitle = (item.title || "").trim();
          // Check if title ends with (1), (2), etc.
          const match = rawTitle.match(/^(.*?)\s*\(\d+\)$/);
          const baseTitle = match ? match[1].trim() : rawTitle;

          const eventName = (item.eventName || "").trim();
          const category = (item.category || "").trim();
          const dateStr = item.takenDate ? dayjs(item.takenDate).format("YYYY-MM-DD") : "";

          // Key to group legacy multiple entries of the same upload
          const groupKey = `${baseTitle.toLowerCase()}___${eventName.toLowerCase()}___${category.toLowerCase()}___${dateStr}`;

          const itemImages = extractImages(item.imageUrl);
          const pid = item.photoId || item.id;

          if (groupedMap.has(groupKey)) {
            const existing = groupedMap.get(groupKey);
            if (pid && !existing.allPhotoIds.includes(pid)) {
              existing.allPhotoIds.push(pid);
            }
            itemImages.forEach((img) => {
              if (img && !existing.images.includes(img)) {
                existing.images.push(img);
              }
            });
            if (!existing.description && item.description) {
              existing.description = item.description;
            }
          } else {
            groupedMap.set(groupKey, {
              id: pid ? `PHT-${String(idx + 1).padStart(3, "0")}` : `PHT-${String(idx + 1).padStart(3, "0")}`,
              photoId: pid,
              allPhotoIds: pid ? [pid] : [],
              title: baseTitle || rawTitle || "Untitled Moment",
              eventName: item.eventName || "",
              category: item.category || "",
              takenDate: dateStr,
              description: item.description || "",
              images: itemImages,
              imageUrl: itemImages[0] || item.imageUrl || "",
            });
          }
        });

        const mapped = Array.from(groupedMap.values()).map((entry, idx) => ({
          ...entry,
          id: `PHT-${String(idx + 1).padStart(3, "0")}`,
        }));

        setPhotos(mapped);
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.error("Failed to load gallery photos from database:", err);
      toast.error("Could not load gallery photos from database");
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [eventsRes, eventTypesRes] = await Promise.all([
        GetEventsAsync().catch(() => []),
        GetEventTypesAsync().catch(() => []),
      ]);
      if (Array.isArray(eventsRes)) setEventsList(eventsRes);
      if (Array.isArray(eventTypesRes)) setEventTypesList(eventTypesRes);
    } catch (err) {
      console.warn("Failed to load events or event types lookup data:", err);
    }
  };

  useEffect(() => {
    fetchPhotosFromDb();
    fetchLookupData();
  }, []);

  // Dynamically derive event options from DB events + existing photos
  const eventOptions = useMemo(() => {
    const list = [{ label: "All Events", value: "ALL" }];
    const unique = new Set();
    eventsList.forEach((e) => {
      const name = e.name || e.eventName;
      if (name && !unique.has(name)) {
        unique.add(name);
        list.push({ label: name, value: name });
      }
    });
    photos.forEach((p) => {
      if (p.eventName && !unique.has(p.eventName)) {
        unique.add(p.eventName);
        list.push({ label: p.eventName, value: p.eventName });
      }
    });
    return list;
  }, [eventsList, photos]);

  // Dynamically derive category options from DB event_types table and recorded photos
  const categoryOptions = useMemo(() => {
    const set = new Set();
    eventTypesList.forEach((et) => {
      if (et.eventTypeName) set.add(et.eventTypeName);
    });
    photos.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    const items = Array.from(set);
    return [
      { label: "All Categories", value: "ALL" },
      ...items.map((c) => ({ label: c, value: c })),
    ];
  }, [eventTypesList, photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((item) => {
      if (appliedEvent !== "ALL" && item.eventName !== appliedEvent) return false;
      if (appliedCategory !== "ALL" && item.category !== appliedCategory) return false;
      return true;
    });
  }, [photos, appliedEvent, appliedCategory]);

  const handleEditPhoto = (row) => {
    setEditingPhoto(row);
    const rowImages = row.images?.length > 0 ? row.images : (row.imageUrl ? [row.imageUrl] : []);
    setForm({
      title: row.title || "",
      eventName: row.eventName || "",
      category: row.category || "",
      takenDate: row.takenDate ? dayjs(row.takenDate) : dayjs(),
      imageUrl: rowImages[0] || "",
      imageUrls: rowImages,
      description: row.description || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleMultipleImageUpload = (files) => {
    if (!files || files.length === 0) return;

    const currentImages = form.imageUrls || (form.imageUrl ? [form.imageUrl] : []);
    const availableSlots = 5 - currentImages.length;

    if (availableSlots <= 0) {
      toast.error("Maximum 5 images allowed. Please remove an image before adding more.");
      return;
    }

    const fileList = Array.from(files);

    // Only allow up to available slots
    let filesToProcess = fileList;
    if (fileList.length > availableSlots) {
      toast.warning(`Maximum limit is 5 images. Selecting first ${availableSlots} image(s).`);
      filesToProcess = fileList.slice(0, availableSlots);
    }

    // Validate image format and total size (Max 10MB)
    const MAX_BATCH_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    let totalSize = 0;

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not a supported image file.`);
        return;
      }
      if (file.size > MAX_BATCH_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 10MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        return;
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_BATCH_SIZE_BYTES) {
      toast.error(`Selected images total ${(totalSize / (1024 * 1024)).toFixed(1)}MB, which exceeds the 10MB limit.`);
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
        const merged = [...existing, ...newUrls].slice(0, 5);
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
    e.stopPropagation();
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
    e.stopPropagation();
    setForm((prev) => ({
      ...prev,
      imageUrls: [],
      imageUrl: "",
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteRequest = (row) => {
    setPhotoToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!photoToDelete) return;
    const idsToDelete = photoToDelete.allPhotoIds?.length
      ? photoToDelete.allPhotoIds
      : [photoToDelete.photoId || photoToDelete.id];

    try {
      for (const pid of idsToDelete) {
        if (pid) {
          await deleteGalleryPhotoAsync(pid);
        }
      }
      toast.success("Gallery entry deleted successfully");
      await fetchPhotosFromDb();
    } catch (err) {
      console.error("Backend delete photo call failed:", err);
      toast.error("Failed to delete photo from database");
    } finally {
      setDeleteConfirmOpen(false);
      setPhotoToDelete(null);
    }
  };

  const handleSavePhoto = async () => {
    const newErrors = {};
    if (!form.title || !form.title.trim()) newErrors.title = "Title is required";
    if (!form.eventName) newErrors.eventName = "Event is required";
    if (!form.category) newErrors.category = "Category is required";
    
    const currentImages = (form.imageUrls && form.imageUrls.length > 0)
      ? form.imageUrls
      : (form.imageUrl ? [form.imageUrl] : []);

    if (currentImages.length === 0) {
      newErrors.imageUrl = "Please upload at least 1 image file (up to 5 images, max 10MB)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        eventName: form.eventName,
        category: form.category,
        imageUrl: currentImages.length > 1 ? JSON.stringify(currentImages) : (currentImages[0] || ""),
        takenDate: form.takenDate ? form.takenDate.toISOString() : new Date().toISOString(),
        description: form.description || "",
      };

      if (editingPhoto) {
        const idsToDelete = editingPhoto.allPhotoIds?.length
          ? editingPhoto.allPhotoIds
          : [editingPhoto.photoId || editingPhoto.id];

        for (const pid of idsToDelete) {
          if (pid) {
            try {
              await deleteGalleryPhotoAsync(pid);
            } catch (delErr) {
              console.warn("Failed to delete old record during update:", pid, delErr);
            }
          }
        }

        await createGalleryPhotoAsync(payload);
        toast.success("Gallery entry updated successfully!");
      } else {
        await createGalleryPhotoAsync(payload);
        toast.success(
          currentImages.length > 1
            ? `Gallery entry with ${currentImages.length} photos added successfully!`
            : "Photo added successfully!"
        );
      }

      setDialogOpen(false);
      setEditingPhoto(null);
      setForm(initialForm);
      setErrors({});
      await fetchPhotosFromDb();
    } catch (err) {
      console.error("Failed to save gallery photo:", err);
      toast.error(err.response?.data?.message || "Failed to save photo to database");
    }
  };

  const columns = [
    {
      label: "Action",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => {
                setSelectedPhoto(row);
                setActiveViewImageIndex(0);
                setViewDialogOpen(true);
              }}
            >
              <ViewIcon
                sx={{
                  fontSize: "1.05rem",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Edit" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleEditPhoto(row)}
              >
                <EditIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      hasWriteAccess
                        ? theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "#4a3f6b"
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.3)"
                          : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hasWriteAccess ? "Delete" : ""}>
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.3 }}
                disabled={!hasWriteAccess}
                onClick={() => handleDeleteRequest(row)}
              >
                <DeleteIcon
                  sx={{
                    fontSize: "1.05rem",
                    color: (theme) =>
                      hasWriteAccess
                        ? theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "#4a3f6b"
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.3)"
                          : "#cbd5e1",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
    {
      label: "Title",
      key: "title",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" fontWeight={700} sx={{ color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") }}>
            {row.title}
          </Typography>
          {row.images && row.images.length > 1 && (
            <Chip
              label={`${row.images.length} photos`}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74,63,107,0.08)",
                color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              }}
            />
          )}
        </Box>
      ),
    },
    {
      label: "Event Name",
      key: "eventName",
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>
          {row.eventName}
        </Typography>
      ),
    },
    {
      label: "Category",
      key: "category",
      render: (row) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            bgcolor: (t) =>
              t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74,63,107,0.08)",
            color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
            px: 1.2,
            py: 0.3,
            borderRadius: "4px",
            fontSize: "0.75rem",
          }}
        >
          {row.category}
        </Typography>
      ),
    },
    {
      label: "Date",
      key: "takenDate",
      render: (row) => formatGridDate(row.takenDate),
    },
    {
      label: "Created By",
      key: "createdBy",
      render: (row) => row.createdBy || row.CreatedBy || "--",
    },
  ];

  return (
    <div className="page-shell">
      <AppDataTable
        title="Gallery"
        columns={columns}
        data={filteredPhotos}
        loading={loading}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppButton
              variant="contained"
              size="small"
              disabled={!hasWriteAccess}
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingPhoto(null);
                setForm(initialForm);
                setErrors({});
                setDialogOpen(true);
              }}
            >
              Add
            </AppButton>
          </Stack>
        }
        filterPanel={
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 220 }}>
                <AppSelect
                  label="Select Event"
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value);
                  }}
                  options={eventOptions}
                  size="small"
                  placeholder="Select Event"
                  required
                  fullWidth
                />
              </Box>
              <Box sx={{ minWidth: 180 }}>
                <AppSelect
                  label="Select Category"
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                  }}
                  options={categoryOptions}
                  size="small"
                  placeholder="Select Category"
                  required
                  fullWidth
                />
              </Box>
              <AppButton
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setAppliedEvent(filterEvent);
                  setAppliedCategory(filterCategory);
                  toast.success("Filters applied");
                }}
                sx={{
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                }}
              >
                Filter
              </AppButton>
              <AppButton
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilterEvent("ALL");
                  setFilterCategory("ALL");
                  setAppliedEvent("ALL");
                  setAppliedCategory("ALL");
                  toast.success("Filters cleared");
                }}
                sx={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  "&:hover": {
                    borderColor: "#ef4444",
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                  },
                }}
              >
                Clear Filter
              </AppButton>
            </Grid>
          </Grid>
        }
      />

      {/* Add / Edit Photo Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPhoto(null);
          setErrors({});
        }}
        title={editingPhoto ? "Edit Photo" : "Add Photos"}
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ width: "100%" }}>
            <AppButton
              variant="outlined"
              onClick={() => {
                setDialogOpen(false);
                setEditingPhoto(null);
                setErrors({});
              }}
            >
              Cancel
            </AppButton>
            <AppButton variant="contained" onClick={handleSavePhoto}>
              {editingPhoto ? "Update" : "Save"}
            </AppButton>
          </Stack>
        }
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppInput
              label="Photo Title"
              placeholder="Enter the Title"
              value={form.title}
              onChange={(e) => {
                setForm((c) => ({ ...c, title: e.target.value }));
                if (errors.title) setErrors((p) => ({ ...p, title: "" }));
              }}
              error={!!errors.title}
              helperText={errors.title}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Event Name"
              placeholder="Select Event"
              value={form.eventName}
              onChange={(e) => {
                setForm((c) => ({ ...c, eventName: e.target.value }));
                if (errors.eventName) setErrors((p) => ({ ...p, eventName: "" }));
              }}
              options={eventOptions.filter((o) => o.value !== "ALL")}
              error={!!errors.eventName}
              helperText={errors.eventName}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppSelect
              label="Category"
              placeholder="Select Category"
              value={form.category}
              onChange={(e) => {
                setForm((c) => ({ ...c, category: e.target.value }));
                if (errors.category) setErrors((p) => ({ ...p, category: "" }));
              }}
              options={categoryOptions.filter((o) => o.value !== "ALL")}
              error={!!errors.category}
              helperText={errors.category}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateInput
              label="Photo Date"
              value={form.takenDate}
              onChange={(newVal) => {
                setForm((c) => ({ ...c, takenDate: newVal }));
              }}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <AppTextArea
              label="Description"
              placeholder="Enter photo or moment description..."
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              minRows={2}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: errors.imageUrl ? "error.main" : "text.secondary" }}>
                Upload Images (Max 5 images, up to 10MB) <Box component="span" sx={{ color: "error.main" }}>*</Box>
              </Typography>
              {form.imageUrls && form.imageUrls.length > 0 && (
                <Chip
                  label={`${form.imageUrls.length} of 5 uploaded`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    bgcolor: form.imageUrls.length === 5 ? "rgba(22, 163, 74, 0.12)" : "rgba(74, 63, 107, 0.12)",
                    color: form.imageUrls.length === 5 ? "#16a34a" : "#4a3f6b",
                  }}
                />
              )}
            </Box>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                handleMultipleImageUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <Box
              sx={{
                border: "1.5px dashed",
                borderColor: errors.imageUrl
                  ? "error.main"
                  : (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)"),
                borderRadius: "12px",
                p: form.imageUrls && form.imageUrls.length > 0 ? 1.5 : 2.5,
                textAlign: "center",
                cursor: form.imageUrls && form.imageUrls.length > 0 ? "default" : "pointer",
                transition: "all 0.2s ease",
                bgcolor: errors.imageUrl
                  ? "rgba(239, 68, 68, 0.04)"
                  : (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.02)"),
                "&:hover": {
                  borderColor: errors.imageUrl ? "error.main" : "#4a3f6b",
                  bgcolor: (t) =>
                    t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.05)",
                },
              }}
              onClick={() => {
                if (!form.imageUrls || form.imageUrls.length === 0) {
                  fileInputRef.current?.click();
                }
              }}
            >
              {form.imageUrls && form.imageUrls.length > 0 ? (
                <Box sx={{ width: "100%", position: "relative" }}>
                  {/* Top Bar inside control */}
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
                      Preview Uploaded Images ({form.imageUrls.length}/5)
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {form.imageUrls.length < 5 && (
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
                          Add More ({5 - form.imageUrls.length} left)
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

                  {/* Thumbnails Grid within control */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, 1fr)",
                        sm: form.imageUrls.length === 1 ? "1fr" : "repeat(3, 1fr)",
                        md: `repeat(${Math.min(form.imageUrls.length + (form.imageUrls.length < 5 ? 1 : 0), 4)}, 1fr)`,
                      },
                      gap: 1.5,
                    }}
                  >
                    {form.imageUrls.map((url, idx) => (
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

                        {/* Number Index Badge */}
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

                        {/* Individual Delete Button */}
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

                    {/* Add More Tile if < 5 */}
                    {form.imageUrls.length < 5 && (
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        sx={{
                          border: "1.5px dashed",
                          borderColor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(74,63,107,0.3)"),
                          borderRadius: "10px",
                          aspectRatio: "4 / 3",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          p: 1,
                          bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.02)"),
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: "#4a3f6b",
                            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(74,63,107,0.06)"),
                          },
                        }}
                      >
                        <AddPhotoAlternateIcon sx={{ fontSize: 26, color: "#4a3f6b", mb: 0.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.7rem", color: "text.primary" }}>
                          Add Photo
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.62rem" }}>
                          {5 - form.imageUrls.length} slot(s) left
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{ color: "#10b981", fontWeight: 700, mt: 1.2, display: "block" }}
                  >
                    ✓ {form.imageUrls.length} photo(s) selected and ready to save (Max 5 images, up to 10MB)
                  </Typography>
                </Box>
              ) : (
                <>
                  <CloudUploadIcon sx={{ fontSize: 36, color: errors.imageUrl ? "error.main" : "#4a3f6b", mb: 0.5 }} />
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700, fontSize: "0.8rem", color: errors.imageUrl ? "error.main" : (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                    Click to browse or drop images from device
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block", mt: 0.4 }}>
                    Select up to 5 images • Maximum 10MB total • JPG, PNG, WebP
                  </Typography>
                  {errors.imageUrl && (
                    <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700, mt: 0.6, display: "block" }}>
                      {errors.imageUrl}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </AppDialog>

      {/* Confirm Delete Dialog */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPhotoToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Confirm"
        content="Are you sure you want to delete this gallery entry and all attached photos?"
      />

      {/* View Photo Details Dialog */}
      <AppDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedPhoto(null);
          setActiveViewImageIndex(0);
        }}
        title="Gallery Details"
        maxWidth="md"
        actions={
          <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ width: "100%" }}>
            <AppButton
              variant="contained"
              onClick={() => {
                setViewDialogOpen(false);
                setSelectedPhoto(null);
                setActiveViewImageIndex(0);
              }}
            >
              Close
            </AppButton>
          </Stack>
        }
      >
        {selectedPhoto && (() => {
          const currentImages = selectedPhoto.images && selectedPhoto.images.length > 0
            ? selectedPhoto.images
            : (selectedPhoto.imageUrl ? [selectedPhoto.imageUrl] : []);
          const activeImg = currentImages[activeViewImageIndex] || currentImages[0];

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {/* Image Showcase Area */}
              {currentImages.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {/* Main Large Display */}
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      height: { xs: 260, sm: 340, md: 380 },
                      borderRadius: "12px",
                      overflow: "hidden",
                      bgcolor: "#090d16",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    }}
                  >
                    <Box
                      component="img"
                      src={activeImg}
                      alt={`${selectedPhoto.title} preview`}
                      sx={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        display: "block",
                        userSelect: "none",
                        transition: "opacity 0.2s ease",
                      }}
                    />

                    {/* Counter Badge */}
                    <Chip
                      icon={<PhotoLibraryIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
                      label={`${activeViewImageIndex + 1} of ${currentImages.length}`}
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        bgcolor: "rgba(0, 0, 0, 0.75)",
                        backdropFilter: "blur(4px)",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    />

                    {/* Navigation Arrows for multi-images */}
                    {currentImages.length > 1 && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setActiveViewImageIndex((prev) =>
                              prev > 0 ? prev - 1 : currentImages.length - 1
                            )
                          }
                          sx={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            bgcolor: "rgba(0,0,0,0.6)",
                            color: "#ffffff",
                            "&:hover": {
                              bgcolor: "rgba(0,0,0,0.85)",
                              transform: "translateY(-50%) scale(1.1)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <ChevronLeftIcon sx={{ fontSize: 28 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setActiveViewImageIndex((prev) =>
                              prev < currentImages.length - 1 ? prev + 1 : 0
                            )
                          }
                          sx={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            bgcolor: "rgba(0,0,0,0.6)",
                            color: "#ffffff",
                            "&:hover": {
                              bgcolor: "rgba(0,0,0,0.85)",
                              transform: "translateY(-50%) scale(1.1)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <ChevronRightIcon sx={{ fontSize: 28 }} />
                        </IconButton>
                      </>
                    )}
                  </Box>

                  {/* Thumbnail Filmstrip */}
                  {currentImages.length > 1 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        overflowX: "auto",
                        py: 0.5,
                        px: 0.5,
                        "&::-webkit-scrollbar": { height: 6 },
                        "&::-webkit-scrollbar-thumb": {
                          bgcolor: "rgba(0,0,0,0.2)",
                          borderRadius: 3,
                        },
                      }}
                    >
                      {currentImages.map((imgUrl, idx) => {
                        const isActive = idx === activeViewImageIndex;
                        return (
                          <Box
                            key={idx}
                            onClick={() => setActiveViewImageIndex(idx)}
                            sx={{
                              flexShrink: 0,
                              width: 68,
                              height: 52,
                              borderRadius: "8px",
                              overflow: "hidden",
                              cursor: "pointer",
                              border: "2px solid",
                              borderColor: isActive
                                ? (t) => (t.palette.mode === "dark" ? "#818cf8" : "#4a3f6b")
                                : "transparent",
                              opacity: isActive ? 1 : 0.6,
                              transform: isActive ? "scale(1.05)" : "scale(1)",
                              transition: "all 0.2s ease",
                              boxShadow: isActive ? "0 2px 8px rgba(74,63,107,0.3)" : "none",
                              "&:hover": {
                                opacity: 1,
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            <Box
                              component="img"
                              src={imgUrl}
                              alt={`Thumbnail ${idx + 1}`}
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              ) : null}

              {/* Details Info Grid */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "10px",
                  bgcolor: (t) =>
                    t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                  border: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                      Title
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") }}
                    >
                      {selectedPhoto.title}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                      Event Name
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedPhoto.eventName || "--"}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                      Category
                    </Typography>
                    <Chip
                      label={selectedPhoto.category || "General"}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(74,63,107,0.08)",
                        color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                      Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedPhoto.takenDate
                        ? dayjs(selectedPhoto.takenDate).format("DD MMMM YYYY")
                        : "--"}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                      Total Photos
                    </Typography>
                    <Chip
                      icon={<PhotoLibraryIcon sx={{ fontSize: "14px !important" }} />}
                      label={`${currentImages.length} Photo${currentImages.length === 1 ? "" : "s"} Attached`}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(16, 185, 129, 0.12)",
                        color: "#10b981",
                      }}
                    />
                  </Grid>

                  {selectedPhoto.description && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                        Description
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          bgcolor: (t) =>
                            t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#ffffff",
                          p: 1.5,
                          borderRadius: "8px",
                          border: (t) => `1px solid ${t.palette.divider}`,
                          whiteSpace: "pre-line",
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedPhoto.description}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Box>
          );
        })()}
      </AppDialog>
    </div>
  );
}
