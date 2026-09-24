import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Chip,
  LinearProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { launchCelebrationBlast, launchPaperBlast } from "./PaperBlast";

/**
 * Big Celebratory Birthday Pop-up Modal with Paper Blast Confetti and Auto-Hide.
 * 
 * @param {boolean} open - Whether the modal is visible
 * @param {Function} onClose - Handler called when modal closes
 * @param {Array<Object>} celebrants - Array of celebrants: [{ name, type, formattedDate, ... }]
 * @param {number} [autoCloseSeconds=6] - Auto-hide timeout in seconds (0 to disable)
 */
export default function BirthdayCelebrationModal({
  open,
  onClose,
  celebrants = [],
  autoCloseSeconds = 0,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Auto-hide countdown state
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds);

  // Normalize celebrant names
  const celebrantList = Array.isArray(celebrants)
    ? celebrants
    : celebrants
    ? [celebrants]
    : [];

  const names = celebrantList
    .map((c) => (typeof c === "string" ? c : c?.name || c?.memberName || "Celebrant"))
    .filter(Boolean);

  let formattedNames = "Someone Special";
  if (names.length === 1) {
    formattedNames = names[0];
  } else if (names.length === 2) {
    formattedNames = `${names[0]} & ${names[1]}`;
  } else if (names.length > 2) {
    formattedNames = `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  }

  // Trigger grand confetti paper blast; remain static unless autoCloseSeconds is set (> 0)
  useEffect(() => {
    if (!open || celebrantList.length === 0) return;

    setTimeLeft(autoCloseSeconds);

    // Initial paper blast explosion
    const blastTimer = setTimeout(() => {
      launchCelebrationBlast();
    }, 150);

    let closeTimer;
    let intervalTimer;

    // Only set auto-close timer if explicitly configured (> 0)
    if (autoCloseSeconds > 0) {
      closeTimer = setTimeout(() => {
        onClose?.();
      }, autoCloseSeconds * 1000);

      // Second-by-second countdown for progress bar
      intervalTimer = setInterval(() => {
        setTimeLeft((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }

    return () => {
      clearTimeout(blastTimer);
      if (closeTimer) clearTimeout(closeTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [open, celebrantList.length, autoCloseSeconds, onClose]);

  if (!open || celebrantList.length === 0) return null;

  const progressPercent = autoCloseSeconds > 0 ? (timeLeft / autoCloseSeconds) * 100 : 0;

  const handleBlastAgain = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    launchPaperBlast(rect.x + rect.width / 2, rect.y, 80);
    setTimeout(() => {
      launchPaperBlast(window.innerWidth * 0.5, window.innerHeight * 0.4, 90);
    }, 180);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? "rgba(10, 14, 26, 0.78)" : "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
          bgcolor: isDark ? "#171a2e" : "#ffffff",
          border: "2px solid",
          borderColor: isDark ? "rgba(236, 72, 153, 0.5)" : "rgba(139, 92, 246, 0.4)",
          boxShadow: isDark
            ? "0 25px 70px rgba(0, 0, 0, 0.75), 0 0 35px rgba(236, 72, 153, 0.3)"
            : "0 25px 65px rgba(74, 63, 107, 0.28), 0 0 35px rgba(139, 92, 246, 0.25)",
          textAlign: "center",
          p: 0,
        },
      }}
    >
      {/* ── Top Festive Banner with Shimmering Gradient ───────────────── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)",
          pt: 4,
          pb: 3,
          px: 3,
          position: "relative",
          color: "#ffffff",
        }}
      >
        {/* Close Button Top Right */}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "rgba(255,255,255,0.85)",
            bgcolor: "rgba(0,0,0,0.18)",
            backdropFilter: "blur(4px)",
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.35)",
              color: "#ffffff",
            },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: "1.2rem" }} />
        </IconButton>

        {/* Floating Animated Birthday Cake Icon */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 84,
            height: 84,
            borderRadius: "50%",
            bgcolor: "#ffffff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25), 0 0 20px rgba(255,255,255,0.6)",
            mb: 1.5,
            position: "relative",
            animation: "bouncePopper 3s infinite ease-in-out",
          }}
        >
          <CakeRoundedIcon
            sx={{
              fontSize: 52,
              color: "#ec4899",
            }}
          />
          {/* Party sparkle icon */}
          <Box
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "#f59e0b",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.5)",
              animation: "sparkleGlint 2s infinite ease-in-out",
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: "#ffffff" }} />
          </Box>
        </Box>

        {/* Small Festive Ribbon Pill */}
        <Box sx={{ mb: 1 }}>
          <Chip
            icon={<CelebrationRoundedIcon sx={{ "&&": { color: "#ffffff", fontSize: "1rem" } }} />}
            label="TODAY'S BIRTHDAY CELEBRATION"
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.22)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              border: "1px solid rgba(255,255,255,0.45)",
              backdropFilter: "blur(4px)",
              py: 0.5,
              px: 0.8,
            }}
          />
        </Box>

        <Typography
          variant="h4"
          fontWeight={900}
          sx={{
            letterSpacing: "-0.02em",
            textShadow: "0 2px 10px rgba(0,0,0,0.25)",
            fontSize: { xs: "1.6rem", sm: "2rem" },
          }}
        >
          Happy Birthday! 🎂
        </Typography>
      </Box>

      {/* ── Dialog Content Area ────────────────────────────────────────── */}
      <DialogContent sx={{ p: { xs: 3, sm: 4 }, pt: { xs: 3, sm: 3.5 } }}>
        {/* Main description sentence */}
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            mb: 1.5,
            color: isDark ? "#ffffff" : "#1e1b4b",
            lineHeight: 1.3,
            fontSize: { xs: "1.25rem", sm: "1.55rem" },
          }}
        >
          Today is{" "}
          <Box
            component="span"
            sx={{
              background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 900,
              display: "inline-block",
            }}
          >
            {formattedNames}'s
          </Box>{" "}
          Birthday!
        </Typography>

        {/* Warm Celebratory Greeting Box */}
        <Box
          sx={{
            p: 2.25,
            mb: 3,
            borderRadius: 3,
            bgcolor: isDark ? alpha("#8b5cf6", 0.08) : alpha("#8b5cf6", 0.05),
            border: `1px dashed ${alpha("#8b5cf6", 0.35)}`,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: isDark ? "#cbd5e1" : "#475569",
              lineHeight: 1.6,
              fontWeight: 500,
              fontSize: { xs: "0.92rem", sm: "1rem" },
            }}
          >
            🎉 Wishing {names.length > 1 ? "our wonderful members" : formattedNames} an amazing
            day filled with happiness, wonderful smiles, and great achievements! Have a delightful
            celebration! 🎈🥳
          </Typography>

          {/* Celebrant details pills */}
          {celebrantList.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              flexWrap="wrap"
              sx={{ mt: 1.75, gap: 1 }}
            >
              {celebrantList.map((c, idx) => (
                <Chip
                  key={c.memberId || idx}
                  label={`🎂 ${c.name || c.memberName || formattedNames}${
                    c.type ? ` • ${c.type}` : ""
                  }`}
                  size="small"
                  sx={{
                    bgcolor: isDark ? alpha("#ec4899", 0.18) : alpha("#ec4899", 0.1),
                    color: isDark ? "#f472b6" : "#be185d",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    border: `1px solid ${alpha("#ec4899", 0.3)}`,
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Buttons / Actions */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="center"
          alignItems="center"
        >
          <Button
            variant="outlined"
            onClick={handleBlastAgain}
            startIcon={<CelebrationRoundedIcon />}
            sx={{
              borderRadius: 2.5,
              px: 3,
              py: 1.1,
              fontWeight: 800,
              borderColor: alpha("#ec4899", 0.5),
              color: isDark ? "#f472b6" : "#be185d",
              "&:hover": {
                borderColor: "#ec4899",
                bgcolor: alpha("#ec4899", 0.08),
                transform: "scale(1.02)",
              },
              transition: "all 0.18s ease",
            }}
          >
            Blast More! 🎊
          </Button>

          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              borderRadius: 2.5,
              px: 3.5,
              py: 1.1,
              fontWeight: 800,
              background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              boxShadow: "0 6px 20px rgba(124, 58, 237, 0.35)",
              color: "#ffffff",
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9 0%, #db2777 100%)",
                boxShadow: "0 8px 24px rgba(124, 58, 237, 0.5)",
                transform: "scale(1.02)",
              },
              transition: "all 0.18s ease",
            }}
          >
            Celebrate! 🥳
          </Button>
        </Stack>
      </DialogContent>

      {/* ── Auto-Hide Countdown Progress Bar ────────────────────────────── */}
      {autoCloseSeconds > 0 && (
        <Box sx={{ width: "100%", position: "relative" }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 5,
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)",
                transition: "transform 1s linear",
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              display: "block",
              py: 0.6,
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "text.secondary",
              bgcolor: isDark ? "#131626" : "#f8fafc",
            }}
          >
            {`Auto-closing in ${timeLeft > 0 ? timeLeft : 1}s...`}
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
