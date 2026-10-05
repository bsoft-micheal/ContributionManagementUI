import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import logoImg from "../../assets/loader.png";

export default function AppPageLoader({ fullScreen = false, text = "Loading..." }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const purpleColor = isDark ? "#a78bfa" : "#4a3f6b";

  return (
    <Box
      sx={{
        position: fullScreen ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: fullScreen ? 9999 : 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "transparent",
        pointerEvents: "none",
        py: fullScreen ? 0 : 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        {/* 1. Static PNG Logo (width 200px, 70% opacity transparency, aspect ratio preserved) */}
        <Box
          component="img"
          src={logoImg}
          alt="Contribution Management Logo"
          sx={{
            width: { xs: 160, sm: 200 },
            height: "auto",
            objectFit: "contain",
            opacity: 0.70,
            userSelect: "none",
            pointerEvents: "none",
            display: "block",
          }}
        />

        {/* 2. Small Purple Spinner (22px) */}
        <CircularProgress
          size={22}
          thickness={4}
          sx={{
            color: purpleColor,
          }}
        />

        {/* 3. Small Loading Text */}
        {text && (
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(74, 63, 107, 0.7)",
              letterSpacing: "0.02em",
            }}
          >
            {text}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
