import React from "react";
import { Box, keyframes } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import logoImg from "../../assets/app_loader_logo.png";

// Continuous smooth spin for the dotted circle loader under the image
const spinDotted = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Opacity / transparency breathing pulse for the static logo while loading
const logoOpacityPulse = keyframes`
  0% {
    opacity: 0.35;
    filter: drop-shadow(0 2px 8px rgba(124, 58, 237, 0.2)) brightness(0.9);
  }
  50% {
    opacity: 1;
    filter: drop-shadow(0 8px 24px rgba(147, 51, 234, 0.55)) brightness(1.06);
  }
  100% {
    opacity: 0.35;
    filter: drop-shadow(0 2px 8px rgba(124, 58, 237, 0.2)) brightness(0.9);
  }
`;

export default function AppPageLoader({ fullScreen = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Dot specifications matching the user's uploaded image (varying radii & positions along a circle)
  const dotCount = 8;
  const radius = 17;
  const center = 24;
  const dotSizes = [5.2, 4.4, 3.8, 3.2, 2.7, 2.2, 1.8, 1.4];

  return (
    <Box
      sx={{
        position: fullScreen ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: isDark
          ? "rgba(10, 12, 20, 0.16)"
          : "rgba(255, 255, 255, 0.16)",
        backdropFilter: "blur(1.5px)",
        WebkitBackdropFilter: "blur(1.5px)",
        transition: "all 0.2s ease-in-out",
        pointerEvents: "all",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2.2,
        }}
      >
        {/* 1. 3D Purple Logo — Clean without any outer rings, with breathing opacity effect */}
        <Box
          component="img"
          src={logoImg}
          alt="Contribution Management Loading..."
          sx={{
            width: { xs: 150, sm: 185 },
            height: "auto",
            maxHeight: 130,
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
            animation: `${logoOpacityPulse} 1.6s ease-in-out infinite`,
          }}
        />

        {/* 2. Dotted Circular Spinner Underneath the Image */}
        <Box
          component="svg"
          viewBox="0 0 48 48"
          sx={{
            width: { xs: 34, sm: 40 },
            height: { xs: 34, sm: 40 },
            animation: `${spinDotted} 0.95s linear infinite`,
            overflow: "visible",
            display: "block",
          }}
        >
          {dotSizes.map((r, i) => {
            const angle = (i * 360) / dotCount - 90; // Start largest dot at top
            const rad = (angle * Math.PI) / 180;
            const cx = center + radius * Math.cos(rad);
            const cy = center + radius * Math.sin(rad);

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill={isDark ? "#a78bfa" : "#7c3aed"}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
