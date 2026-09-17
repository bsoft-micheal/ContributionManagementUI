import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import dayjs from "dayjs";
import AppDialog from "../common/AppDialog";
import AppButton from "../common/AppButton";

export default function MemberDetailsDialog({ open, onClose, member }) {
  if (!member) return null;

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Member Details"
      maxWidth="sm"
      actions={
        <AppButton 
          variant="outlined" 
          color="inherit" 
          onClick={onClose}
          sx={{
            borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "rgba(74, 63, 107, 0.4)",
            color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
            "&:hover": {
              borderColor: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b",
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(74, 63, 107, 0.04)",
            }
          }}
        >
          Close
        </AppButton>
      }
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
               Name
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#ffffff" : "#4a3f6b" }}>
              {member.name}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Role
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
              {member.roleName}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Email 
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {member.email}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Phone Number
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {member.phone || "--"}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Gender
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {member.gender}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" fontWeight={800}
                sx={{ 
                  color: member.isActive ? "#16a34a" : "#dc2626", 
                  bgcolor: member.isActive ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", 
                  px: 1.2, 
                  py: 0.3, 
                  borderRadius: "3px", 
                  fontSize: "0.7rem", 
                  letterSpacing: "0.04em",
                  display: "inline-block"
                }}
              >
                {member.isExited ? "Exited" : (member.isActive ? "Active" : "Inactive")}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Date of Birth
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {member.dateOfBirth ? dayjs(member.dateOfBirth).format("DD MMMM YYYY") : "--"}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              Joining Date
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {member.joiningDate ? dayjs(member.joiningDate).format("DD MMMM YYYY") : "--"}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </AppDialog>
  );
}
