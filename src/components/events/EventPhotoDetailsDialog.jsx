import React, { useState, useEffect } from "react";
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
  Close as CloseIcon,
  Download as DownloadIcon,
  PhotoLibrary as PhotoLibraryIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";
import { useAppToast } from "../common/AppToast";
import { getGalleryPhotosAsync } from "../../services/galleryService";
import { extractImages, dataURLtoBlob } from "../../pages/gallery/GalleryPage";

export default function EventPhotoDetailsDialog({
  open,
  onClose,
  event,
  onAddPhotosClick,
}) {
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [eventPhotos, setEventPhotos] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [primaryDetails, setPrimaryDetails] = useState(null);

  useEffect(() => {
    if (!open || !event) {
      setActiveImageIndex(0);
      setEventPhotos([]);
      setAllImages([]);
      setPrimaryDetails(null);
      return;
    }

    let isMounted = true;
    const fetchEventPhotos = async () => {
      try {
        setLoading(true);
        const data = await getGalleryPhotosAsync();
        if (!isMounted) return;

        const eventNameNorm = (event.eventName || "").trim().toLowerCase();
        const eventIdNorm = String(event.eventId || "").trim().toLowerCase();

        // Find all gallery photo entries belonging to this event
        const matchingEntries = (data || []).filter((item) => {
          const itemEvent = (item.eventName || "").trim().toLowerCase();
          const itemId = String(item.eventId || "").trim().toLowerCase();
          return (
            (eventNameNorm && itemEvent === eventNameNorm) ||
            (eventIdNorm && itemId && itemId === eventIdNorm)
          );
        });

        // Collect all images attached to this event
        const imageList = [];
        const seenUrls = new Set();

        matchingEntries.forEach((entry) => {
          const imgs = extractImages(entry.imageUrl);
          imgs.forEach((img) => {
            if (img && !seenUrls.has(img)) {
              seenUrls.add(img);
              imageList.push(img);
            }
          });
        });

        const first = matchingEntries[0] || null;
        setEventPhotos(matchingEntries);
        setAllImages(imageList);
        setPrimaryDetails(first);
        setActiveImageIndex(0);
      } catch (err) {
        if (isMounted) {
          toast.error("Failed to load gallery photos for this event.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEventPhotos();

    return () => {
      isMounted = false;
    };
  }, [open, event]);

  if (!event) return null;

  const handleDownloadImage = async (imgUrl, suggestedName = "gallery-photo") => {
    if (!imgUrl) return;
    try {
      let blob;
      let ext = "jpg";

      if (imgUrl.startsWith("data:")) {
        const mimeMatch = imgUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/);
        if (mimeMatch) {
          ext = mimeMatch[1].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        }
        blob = dataURLtoBlob(imgUrl);
      } else {
        const response = await fetch(imgUrl);
        blob = await response.blob();
        if (blob.type) {
          ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        } else if (imgUrl.includes(".")) {
          const urlExt = imgUrl.split(".").pop().split(/[?#]/)[0];
          if (urlExt && urlExt.length <= 4) ext = urlExt;
        }
      }

      const cleanName = suggestedName.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (blob) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${cleanName}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("Image downloaded successfully");
      } else {
        const link = document.createElement("a");
        link.href = imgUrl;
        link.download = `${cleanName}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image downloaded successfully");
      }
    } catch {
      toast.error("Failed to download image");
    }
  };

  const currentImages = allImages;
  const activeImg = currentImages[activeImageIndex] || currentImages[0];
  const displayTitle =
    primaryDetails?.title || `${event.eventName || "Event"} Photos`;
  const displayEventName = event.eventName || primaryDetails?.eventName || "--";
  const displayCategory =
    event.eventTypeName || primaryDetails?.category || "General";
  const displayDate = event.eventDate
    ? dayjs(event.eventDate).format("DD MMMM YYYY")
    : primaryDetails?.takenDate
    ? dayjs(primaryDetails.takenDate).format("DD MMMM YYYY")
    : "--";

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Gallery Details"
      maxWidth="md"
      actions={
        <Stack
          direction="row"
          spacing={1.5}
          justifyContent="center"
          sx={{ width: "100%", flexWrap: "wrap", gap: 1 }}
        >
          {currentImages.length > 0 && activeImg && (
            <>
              <AppButton
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  handleDownloadImage(
                    activeImg,
                    `${displayTitle}-${activeImageIndex + 1}`
                  );
                }}
              >
                Download Current Photo
              </AppButton>
              {currentImages.length > 1 && (
                <AppButton
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    currentImages.forEach((img, i) => {
                      setTimeout(() => {
                        handleDownloadImage(
                          img,
                          `${displayTitle}-${i + 1}`
                        );
                      }, i * 350);
                    });
                  }}
                >
                  Download All ({currentImages.length})
                </AppButton>
              )}
            </>
          )}
          <AppButton variant="contained" onClick={onClose}>
            Close
          </AppButton>
        </Stack>
      }
    >
      {loading ? (
        <Box
          sx={{
            py: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={40} sx={{ color: "#4a3f6b" }} />
          <Typography variant="body2" color="text.secondary">
            Loading photos for {event.eventName}...
          </Typography>
        </Box>
      ) : currentImages.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Main Large Photo Showcase Area */}
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
              alt={`${displayTitle} preview`}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                transition: "opacity 0.2s ease",
              }}
            />

            {/* Top Right Controls: Download Button + Counter Badge */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 3,
              }}
            >
              <Tooltip title="Download this image">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadImage(
                      activeImg,
                      `${displayTitle}-${activeImageIndex + 1}`
                    );
                  }}
                  sx={{
                    bgcolor: "rgba(0, 0, 0, 0.75)",
                    backdropFilter: "blur(4px)",
                    color: "#ffffff",
                    width: 32,
                    height: 32,
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    "&:hover": {
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "#6366f1" : "#4a3f6b",
                      transform: "scale(1.08)",
                      color: "#ffffff",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <DownloadIcon sx={{ fontSize: "1.1rem" }} />
                </IconButton>
              </Tooltip>

              {/* Counter Badge */}
              <Chip
                icon={
                  <PhotoLibraryIcon
                    sx={{
                      fontSize: "14px !important",
                      color: "#ffffff !important",
                    }}
                  />
                }
                label={`${activeImageIndex + 1} of ${currentImages.length}`}
                size="small"
                sx={{
                  bgcolor: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(4px)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  height: 32,
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              />
            </Stack>

            {/* Navigation Arrows for multi-images */}
            {currentImages.length > 1 && (
              <>
                <IconButton
                  size="small"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
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
                    setActiveImageIndex((prev) =>
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

          {/* Filmstrip Thumbnails Row */}
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
                const isActive = idx === activeImageIndex;
                return (
                  <Box
                    key={idx}
                    sx={{
                      position: "relative",
                      flexShrink: 0,
                      "&:hover .thumb-download-btn": {
                        opacity: 1,
                      },
                    }}
                  >
                    <Box
                      onClick={() => setActiveImageIndex(idx)}
                      sx={{
                        width: 68,
                        height: 52,
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "pointer",
                        border: "2px solid",
                        borderColor: isActive
                          ? (t) =>
                              t.palette.mode === "dark" ? "#818cf8" : "#4a3f6b"
                          : "transparent",
                        opacity: isActive ? 1 : 0.6,
                        transform: isActive ? "scale(1.05)" : "scale(1)",
                        transition: "all 0.2s ease",
                        boxShadow: isActive
                          ? "0 2px 8px rgba(74,63,107,0.3)"
                          : "none",
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
                    <Tooltip title={`Download image ${idx + 1}`}>
                      <IconButton
                        className="thumb-download-btn"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(
                            imgUrl,
                            `${displayTitle}-${idx + 1}`
                          );
                        }}
                        sx={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          width: 22,
                          height: 22,
                          p: 0,
                          bgcolor: "rgba(0, 0, 0, 0.8)",
                          backdropFilter: "blur(2px)",
                          color: "#ffffff",
                          opacity: 0,
                          transition:
                            "opacity 0.2s ease, transform 0.2s ease",
                          "&:hover": {
                            bgcolor: "#4a3f6b",
                            transform: "scale(1.15)",
                          },
                        }}
                      >
                        <DownloadIcon sx={{ fontSize: "0.85rem" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Details Info Card */}
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.3 }}
                >
                  Title
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    color: (t) =>
                      t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                  }}
                >
                  {displayTitle}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.3 }}
                >
                  Event Name
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {displayEventName}
                </Typography>
              </Grid>

              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.3 }}
                >
                  Category
                </Typography>
                <Chip
                  label={displayCategory}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    bgcolor: (t) =>
                      t.palette.mode === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(74,63,107,0.08)",
                    color: (t) =>
                      t.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.3 }}
                >
                  Date
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {displayDate}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.3 }}
                >
                  Total Photos
                </Typography>
                <Chip
                  icon={
                    <PhotoLibraryIcon
                      sx={{
                        fontSize: "14px !important",
                        color: "#16a34a !important",
                      }}
                    />
                  }
                  label={`${currentImages.length} Photos Attached`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor: "rgba(22, 163, 74, 0.12)",
                    color: "#16a34a",
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Box>
      ) : (
        /* Empty State: No photos attached to this event */
        <Box
          sx={{
            py: 6,
            px: 3,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(74, 63, 107, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4a3f6b",
            }}
          >
            <PhotoLibraryIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              No Photos Uploaded Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There are currently no photos uploaded for{" "}
              <strong>{event.eventName}</strong>.
            </Typography>
          </Box>
        </Box>
      )}
    </AppDialog>
  );
}
