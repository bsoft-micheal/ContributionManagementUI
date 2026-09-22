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
} from "@mui/icons-material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

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
        const mapped = data.map((item, idx) => ({
          id: item.photoId
            ? `PHT-${String(idx + 1).padStart(3, "0")}`
            : item.id || `PHT-${String(idx + 1).padStart(3, "0")}`,
          photoId: item.photoId || item.id,
          title: item.title || "",
          eventName: item.eventName || "",
          category: item.category || "",
          takenDate: item.takenDate ? dayjs(item.takenDate).format("YYYY-MM-DD") : "",
          imageUrl: item.imageUrl || "",
          description: item.description || "",
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
    setForm({
      title: row.title || "",
      eventName: row.eventName || "",
      category: row.category || "",
      takenDate: row.takenDate ? dayjs(row.takenDate) : dayjs(),
      imageUrl: row.imageUrl || "",
      imageUrls: row.imageUrl ? [row.imageUrl] : [],
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
          const maxDim = 1200;
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
          const optimizedUrl = canvas.toDataURL("image/jpeg", 0.82);
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
    const photoId = photoToDelete.photoId || photoToDelete.id;

    try {
      await deleteGalleryPhotoAsync(photoId);
      toast.success("Photo deleted successfully");
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
      if (editingPhoto) {
        const payload = {
          title: form.title,
          eventName: form.eventName,
          category: form.category,
          imageUrl: currentImages[0],
          takenDate: form.takenDate ? form.takenDate.toISOString() : new Date().toISOString(),
          description: form.description || "",
        };
        await createGalleryPhoto(payload);
        toast.success("Photo updated successfully!");
      } else {
        for (let i = 0; i < currentImages.length; i++) {
          const payload = {
            title: currentImages.length > 1 ? `${form.title} (${i + 1})` : form.title,
            eventName: form.eventName,
            category: form.category,
            imageUrl: currentImages[i],
            takenDate: form.takenDate ? form.takenDate.toISOString() : new Date().toISOString(),
            description: form.description || "",
          };
          await createGalleryPhoto(payload);
        }
        toast.success(
          currentImages.length > 1
            ? `${currentImages.length} photos added successfully!`
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
      label: "Photo",
      render: (row) => (
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "8px",
            overflow: "hidden",
            bgcolor: "#f1f5f9",
            border: (t) => `1px solid ${t.palette.divider}`,
            cursor: "pointer",
          }}
          onClick={() => {
            setSelectedPhoto(row);
            setViewDialogOpen(true);
          }}
        >
          <Box
            component="img"
            src={row.imageUrl}
            alt={row.title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "scale(1.1)" },
            }}
          />
        </Box>
      ),
    },
    {
      label: "Title",
      key: "title",
      render: (row) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: (t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b") }}>
          {row.title}
        </Typography>
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
      render: (row) => (row.takenDate ? dayjs(row.takenDate).format("DD/MM/YYYY") : "--"),
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
                  onChange={(e) => setFilterEvent(e.target.value)}
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
                  onChange={(e) => setFilterCategory(e.target.value)}
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
                onClick={() => {
                  setAppliedEvent(filterEvent);
                  setAppliedCategory(filterCategory);
                }}
                sx={{
                  bgcolor: "#4a3f6b !important",
                  color: "#ffffff",
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&:hover": { bgcolor: "#3b325c !important" },
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
                }}
                sx={{
                  height: 34,
                  mt: 2.2,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(74, 63, 107, 0.3)",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b"),
                  "&:hover": {
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(74, 63, 107, 0.04)",
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
          <Stack direction="row" spacing={1.5}>
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
              placeholder="e.g. Birthday Cake Cutting"
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
        content="Are you sure you want to delete this photo?"
      />

      {/* View Photo Details Dialog */}
      <AppDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedPhoto(null);
        }}
        title="Photo Details"
        maxWidth="sm"
        actions={
          <AppButton variant="contained" onClick={() => setViewDialogOpen(false)}>
            Close
          </AppButton>
        }
      >
        {selectedPhoto && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                width: "100%",
                height: 240,
                borderRadius: "10px",
                overflow: "hidden",
                bgcolor: "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                component="img"
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="subtitle2" fontWeight={800} color={(t) => (t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b")}>
                  {selectedPhoto.title}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedPhoto.category}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Event Name
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedPhoto.eventName}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body2">
                  {selectedPhoto.takenDate ? dayjs(selectedPhoto.takenDate).format("DD MMMM YYYY") : "--"}
                </Typography>
              </Grid>
              {selectedPhoto.description && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Description
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      p: 1.5,
                      borderRadius: "8px",
                      border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                  >
                    {selectedPhoto.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </AppDialog>
    </div>
  );
}
