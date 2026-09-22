import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  CloudUploadOutlined as CloudUploadIcon,
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
  getGalleryPhotos,
  createGalleryPhoto,
  deleteGalleryPhoto,
} from "../../services/galleryService";
import { GetEvents } from "../../services/eventService";
import { GetEventTypes } from "../../services/eventTypeService";

const initialForm = {
  title: "",
  eventName: "",
  category: "",
  takenDate: dayjs(),
  imageUrl: "",
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
      const data = await getGalleryPhotos();
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
        GetEvents().catch(() => []),
        GetEventTypes().catch(() => []),
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
      description: row.description || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDeleteRequest = (row) => {
    setPhotoToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!photoToDelete) return;
    const photoId = photoToDelete.photoId || photoToDelete.id;

    try {
      await deleteGalleryPhoto(photoId);
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
    if (!form.imageUrl || !form.imageUrl.trim()) newErrors.imageUrl = "Image URL or photo upload is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        title: form.title,
        eventName: form.eventName,
        category: form.category,
        imageUrl: form.imageUrl,
        takenDate: form.takenDate ? form.takenDate.toISOString() : new Date().toISOString(),
        description: form.description || "",
      };

      await createGalleryPhoto(payload);
      toast.success(editingPhoto ? "Photo updated successfully!" : "Photo added successfully!");
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
        title="Manage Gallery Photos"
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
        title={editingPhoto ? "Edit Gallery Photo" : "Add Gallery Photo"}
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
            <AppInput
              label="Image URL"
              placeholder="https://images.unsplash.com/..."
              value={form.imageUrl}
              onChange={(e) => {
                setForm((c) => ({ ...c, imageUrl: e.target.value }));
                if (errors.imageUrl) setErrors((p) => ({ ...p, imageUrl: "" }));
              }}
              error={!!errors.imageUrl}
              helperText={errors.imageUrl}
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
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5, display: "block" }}>
              Upload Image File
            </Typography>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
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
                      setForm((c) => ({ ...c, imageUrl: optimizedUrl }));
                      if (errors.imageUrl) setErrors((prev) => ({ ...prev, imageUrl: "" }));
                      toast.success(`Photo "${file.name}" attached successfully!`);
                    };
                    img.onerror = () => {
                      setForm((c) => ({ ...c, imageUrl: rawDataUrl }));
                      if (errors.imageUrl) setErrors((prev) => ({ ...prev, imageUrl: "" }));
                      toast.success(`Photo "${file.name}" attached successfully!`);
                    };
                    img.src = rawDataUrl;
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <Box
              sx={{
                border: "1.5px dashed",
                borderColor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(74,63,107,0.3)",
                borderRadius: "12px",
                p: 2,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(74,63,107,0.02)",
                "&:hover": {
                  borderColor: "#4a3f6b",
                  bgcolor: (t) =>
                    t.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(74,63,107,0.05)",
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadIcon sx={{ fontSize: 28, color: "#4a3f6b", mb: 0.5 }} />
              <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: (t) => t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
                Click to browse and upload image file from device
              </Typography>
              {form.imageUrl && (
                <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 700, mt: 0.5, display: "block" }}>
                  ✓ Image loaded ready to save
                </Typography>
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
