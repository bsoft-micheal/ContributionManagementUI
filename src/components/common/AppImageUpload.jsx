import React, { useRef, useState } from "react";
import { Avatar, Box, IconButton, Typography, Tooltip } from "@mui/material";
import { PhotoCamera as UploadIcon, Delete as DeleteIcon } from "@mui/icons-material";

export default function AppImageUpload({
  value, // Base64 string or URL of current image
  onChange, // Callback when image is selected/removed: (base64String) => void
  nameInitials = "U",
  size = 100,
  error = false,
  helperText = "",
}) {
  const fileInputRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression and resizing (128x128 avatar is plenty)
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 128;
        const MAX_HEIGHT = 128;
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality PNG format
        const compressedBase64 = canvas.toDataURL("image/png");
        onChange(compressedBase64);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleUploadClick}
        sx={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          cursor: "pointer",
          border: error ? "2px solid #ef4444" : "2px solid rgba(74, 63, 107, 0.15)",
          boxShadow: "0 4px 12px rgba(74, 63, 107, 0.08)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "scale(1.03)",
            boxShadow: "0 6px 16px rgba(74, 63, 107, 0.15)",
            borderColor: "#4a3f6b",
          },
        }}
      >
        <Avatar
          src={value || undefined}
          sx={{
            width: "100%",
            height: "100%",
            fontSize: `${size * 0.38}px`,
            fontWeight: 800,
            bgcolor: "#4a3f6b",
            color: "#ffffff",
          }}
        >
          {nameInitials}
        </Avatar>

        {/* Hover Overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            bgcolor: "rgba(30, 26, 46, 0.65)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.25s ease-in-out",
            color: "#ffffff",
          }}
        >
          <UploadIcon sx={{ fontSize: "1.6rem", mb: 0.2 }} />
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.6rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Change
          </Typography>
        </Box>

        {/* Floating Delete Button */}
        {value && (
          <Tooltip title="Remove Image">
            <IconButton
              size="small"
              onClick={handleRemoveClick}
              sx={{
                position: "absolute",
                top: -2,
                right: -2,
                bgcolor: "#ef4444",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                p: 0.5,
                "&:hover": {
                  bgcolor: "#dc2626",
                  transform: "scale(1.1)",
                },
                transition: "all 0.2s ease",
              }}
            >
              <DeleteIcon sx={{ fontSize: "0.85rem" }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {helperText && (
        <Typography variant="caption" color={error ? "error" : "text.secondary"} sx={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 500 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
