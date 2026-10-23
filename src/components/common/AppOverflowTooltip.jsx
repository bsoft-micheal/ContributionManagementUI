import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tooltip, Typography } from "@mui/material";

/**
 * AppOverflowTooltip
 * Senior-developer grade component for conditional text overflow tooltips.
 * 
 * Behavior:
 * - If there is sufficient space (scrollWidth <= clientWidth), the full text/message is displayed and NO tooltip is shown.
 * - If there is no space (text actually overflows the container boundary), it truncates with ellipsis and enables the tooltip on hover.
 */
export default function AppOverflowTooltip({
  text,
  children,
  title,
  maxLines = 1,
  sx = {},
  tooltipSx = {},
  placement = "top",
  variant,
  component = "div",
  ...rest
}) {
  const textContent =
    text !== undefined && text !== null
      ? String(text)
      : typeof children === "string"
      ? children
      : "";

  const textRef = useRef(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    // Allow a 1px tolerance for subpixel rendering
    const horizontalOverflow = el.scrollWidth > el.clientWidth + 1;
    const verticalOverflow = el.scrollHeight > el.clientHeight + 1;
    const hasOverflow = maxLines === 1 ? horizontalOverflow : horizontalOverflow || verticalOverflow;
    setIsOverflowed(hasOverflow);
  }, [maxLines]);

  useEffect(() => {
    checkOverflow();
  }, [checkOverflow, textContent]);

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkOverflow, 50);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [checkOverflow]);

  const tooltipTitle = title || textContent;

  const content = (
    <Typography
      ref={textRef}
      variant={variant}
      component={component}
      onMouseEnter={checkOverflow}
      sx={{
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: maxLines === 1 ? "nowrap" : "normal",
        ...(maxLines > 1 && {
          display: "-webkit-box",
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: "vertical",
        }),
        ...sx,
      }}
      {...rest}
    >
      {children || textContent}
    </Typography>
  );

  return (
    <Tooltip
      title={isOverflowed && tooltipTitle ? tooltipTitle : ""}
      disableHoverListener={!isOverflowed || !tooltipTitle}
      disableFocusListener={!isOverflowed || !tooltipTitle}
      disableTouchListener={!isOverflowed || !tooltipTitle}
      arrow
      placement={placement}
      slotProps={{
        tooltip: {
          sx: {
            fontSize: "0.75rem",
            fontWeight: 500,
            maxWidth: 360,
            lineHeight: 1.35,
            p: 1,
            borderRadius: "6px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            ...tooltipSx,
          },
        },
      }}
    >
      {content}
    </Tooltip>
  );
}
