import React, { useState, useMemo } from "react";
import { Box, Typography, Stack, useTheme, Chip } from "@mui/material";

const COLOR_PALETTE = [
  "#7c3aed", // Vibrant Violet
  "#3b82f6", // Vivid Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Amber Orange
  "#f43f5e", // Rose Pink
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#eab308", // Golden Yellow
  "#64748b", // Slate
];

const polarToCartesian = (cx, cy, radius, angleInRadians) => ({
  x: cx + radius * Math.cos(angleInRadians),
  y: cy + radius * Math.sin(angleInRadians),
});

const describeDonutSlice = (cx, cy, rInner, rOuter, startAngle, endAngle) => {
  const isFullCircle = endAngle - startAngle >= 2 * Math.PI - 0.001;

  if (isFullCircle) {
    return [
      `M ${cx} ${cy - rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter}`,
      `M ${cx} ${cy - rInner}`,
      `A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner}`,
      `A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner}`,
      "Z",
    ].join(" ");
  }

  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
};

export default function AppPieChart({
  items = [],
  valueKey = "value",
  labelKey = "label",
  maxSlices = 7,
  innerRadiusRatio = 0.58,
}) {
  const theme = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // 1. Filter, sort, and aggregate small slices into "Others"
  const { processedData, totalValue } = useMemo(() => {
    const validItems = items
      .map((item) => ({
        label: String(item[labelKey] || "Unknown"),
        value: Math.max(0, Number(item[valueKey]) || 0),
        raw: item,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = validItems.reduce((sum, d) => sum + d.value, 0);

    if (validItems.length <= maxSlices) {
      return { processedData: validItems, totalValue: total };
    }

    const topItems = validItems.slice(0, maxSlices - 1);
    const otherItems = validItems.slice(maxSlices - 1);
    const otherSum = otherItems.reduce((sum, d) => sum + d.value, 0);

    return {
      processedData: [
        ...topItems,
        { label: `Others (${otherItems.length})`, value: otherSum, isOthers: true },
      ],
      totalValue: total,
    };
  }, [items, valueKey, labelKey, maxSlices]);

  // 2. Compute slice angles
  const slices = useMemo(() => {
    if (totalValue <= 0 || processedData.length === 0) return [];

    let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)
    return processedData.map((item, idx) => {
      const fraction = item.value / totalValue;
      const angleDelta = fraction * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleDelta;
      currentAngle = endAngle;

      const percentage = (fraction * 100).toFixed(1);
      const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

      return {
        ...item,
        startAngle,
        endAngle,
        percentage,
        color,
        index: idx,
      };
    });
  }, [processedData, totalValue]);

  if (processedData.length === 0 || totalValue <= 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No chart data available to visualize.
        </Typography>
      </Box>
    );
  }

  const cx = 130;
  const cy = 130;
  const outerR = 110;
  const innerR = outerR * innerRadiusRatio;

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 3, md: 4 },
        py: 1,
      }}
    >
      {/* Interactive Pie / Donut SVG */}
      <Box
        sx={{
          position: "relative",
          width: 260,
          height: 260,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="260"
          height="260"
          viewBox="0 0 260 260"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
            </filter>
          </defs>

          {slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;
            const rOuterCurrent = isHovered ? outerR + 6 : outerR;
            const rInnerCurrent = isHovered ? Math.max(0, innerR - 2) : innerR;
            const pathData = describeDonutSlice(
              cx,
              cy,
              rInnerCurrent,
              rOuterCurrent,
              slice.startAngle,
              slice.endAngle
            );

            return (
              <path
                key={slice.label + idx}
                d={pathData}
                fill={slice.color}
                stroke={theme.palette.mode === "dark" ? "#1e1a2e" : "#ffffff"}
                strokeWidth={slices.length > 1 ? 2.5 : 0}
                filter={isHovered ? "url(#pie-glow)" : undefined}
                style={{
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Donut Center Display */}
        <Box
          sx={{
            position: "absolute",
            width: innerR * 1.8,
            height: innerR * 1.8,
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pointerEvents: "none",
            px: 1,
          }}
        >
          {activeSlice ? (
            <>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: activeSlice.color,
                  lineHeight: 1.2,
                  maxWidth: "90%",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {activeSlice.label}
              </Typography>
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: "1.05rem",
                  color: "text.primary",
                  lineHeight: 1.2,
                  mt: 0.25,
                }}
              >
                ₹{activeSlice.value.toLocaleString()}
              </Typography>
              <Chip
                size="small"
                label={`${activeSlice.percentage}%`}
                sx={{
                  mt: 0.5,
                  height: 18,
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  bgcolor: `${activeSlice.color}22`,
                  color: activeSlice.color,
                  border: `1px solid ${activeSlice.color}55`,
                }}
              />
            </>
          ) : (
            <>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                Total
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: "1.15rem",
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                ₹{totalValue.toLocaleString()}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                {slices.length} {slices.length === 1 ? "entry" : "entries"}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Legend & Breakdown */}
      <Stack
        spacing={1}
        sx={{
          flex: 1,
          width: "100%",
          maxHeight: 280,
          overflowY: "auto",
          pr: 0.5,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(124, 58, 237, 0.2)",
            borderRadius: 4,
          },
        }}
      >
        {slices.map((slice, idx) => {
          const isHovered = hoveredIndex === idx;

          return (
            <Box
              key={slice.label + idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              sx={{
                display: "grid",
                gridTemplateColumns: "16px 1fr auto auto",
                alignItems: "center",
                gap: 1.5,
                p: 0.75,
                borderRadius: "8px",
                cursor: "pointer",
                bgcolor: isHovered
                  ? theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(124, 58, 237, 0.08)"
                  : "transparent",
                border: "1px solid",
                borderColor: isHovered ? slice.color : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              {/* Color Dot */}
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: slice.color,
                  boxShadow: isHovered ? `0 0 8px ${slice.color}` : "none",
                  transition: "transform 0.2s ease",
                  transform: isHovered ? "scale(1.2)" : "scale(1)",
                }}
              />

              {/* Label */}
              <Typography
                variant="body2"
                fontWeight={isHovered ? 800 : 600}
                sx={{
                  fontSize: "0.82rem",
                  color: isHovered ? slice.color : "text.primary",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
                title={slice.label}
              >
                {slice.label}
              </Typography>

              {/* Amount */}
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: "0.85rem",
                  color: "text.primary",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                ₹{slice.value.toLocaleString()}
              </Typography>

              {/* Percentage Badge */}
              <Chip
                size="small"
                label={`${slice.percentage}%`}
                sx={{
                  height: 20,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  bgcolor: `${slice.color}18`,
                  color: slice.color,
                  border: `1px solid ${slice.color}40`,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
