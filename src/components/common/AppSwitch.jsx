import React from "react";
import { Switch, FormControlLabel, Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const CustomSwitch = styled(Switch)(({ theme }) => ({
  width: 44,
  height: 24,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 2,
    "&.Mui-checked": {
      transform: "translateX(20px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: theme.palette.mode === "dark" ? "#10b981" : "#16a34a", // emerald green when active
      },
    },
  },
  "& .MuiSwitch-thumb": {
    width: 20,
    height: 20,
    borderRadius: 10,
    boxShadow: "0 2px 4px 0 rgba(0, 35, 11, 0.2)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 12,
    opacity: 1,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(74, 63, 107, 0.15)",
    boxSizing: "border-box",
  },
}));

export default function AppSwitch({
  label,
  checked,
  onChange,
  required = false,
  labelPlacement = "start",
  disabled = false,
  ...props
}) {
  return (
    <FormControlLabel
      labelPlacement={labelPlacement}
      disabled={disabled}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        m: 0,
        gap: 2,
      }}
      control={
        <CustomSwitch
          checked={checked}
          onChange={onChange}
          {...props}
        />
      }
      label={
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              fontSize: "0.82rem",
            }}
          >
            {label}
          </Typography>
          {required && (
            <Box component="span" sx={{ color: "#d32f2f", ml: 0.5, fontSize: "1rem", lineHeight: 0 }}>
              *
            </Box>
          )}
        </Box>
      }
    />
  );
}
