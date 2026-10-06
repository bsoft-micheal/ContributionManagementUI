import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import logoImg from "../../assets/contribution loader.png";

export default function AppPageLoader({ fullScreen = false, text = "Loading..." }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const purpleColor = isDark ? "#a78bfa" : "#6355a4";

  return (
    <Box
      sx={{
        position: fullScreen ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: fullScreen ? "100vw" : "100%",
        height: fullScreen ? "100vh" : "100%",
        zIndex: fullScreen ? 99999 : 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: fullScreen
          ? (isDark ? "rgba(18, 22, 40, 0.4)" : "rgba(255, 255, 255, 0.4)")
          : "transparent",
        backdropFilter: fullScreen ? "blur(3px)" : "none",
        pointerEvents: "auto",
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        {/* 1. Relative Container: Spinner Ring wrapping AROUND the Logo */}
        <Box
          sx={{
            position: "relative",
            width: { xs: 110, sm: 125 },
            height: { xs: 110, sm: 125 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Subtle background track ring */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={125}
            thickness={1.8}
            sx={{
              color: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(99, 85, 164, 0.12)",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100% !important",
              height: "100% !important",
            }}
          />

          {/* Active spinning ring around the logo */}
          <CircularProgress
            size={125}
            thickness={2}
            sx={{
              color: purpleColor,
              position: "absolute",
              top: 0,
              left: 0,
              width: "100% !important",
              height: "100% !important",
            }}
          />

          {/* Centered Logo inside the spinning ring */}
          <Box
            component="img"
            src={logoImg}
            alt="Contribution Management Logo"
            sx={{
              width: { xs: 75, sm: 85 },
              height: { xs: 75, sm: 85 },
              objectFit: "contain",
              userSelect: "none",
              pointerEvents: "none",
              display: "block",
            }}
          />
        </Box>

        {/* 2. Loading Text */}
        {text && (
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: isDark ? "#e2e8f0" : "#4a3f6b",
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
