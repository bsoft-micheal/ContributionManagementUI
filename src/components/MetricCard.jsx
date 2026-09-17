import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function MetricCard({ label, value, helper, accent = "primary.main" }) {
  return (
    <Card 
      sx={{ 
        height: "100%", 
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
        "&:hover": { 
          transform: "translateY(-4px)",
          boxShadow: "0 20px 32px -10px rgba(15, 23, 42, 0.2)"
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderTop: `4px solid ${alpha("#7c3aed", 0.85)}`,
          pointerEvents: "none",
        },
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.05em", fontSize: "0.65rem" }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ color: accent, fontWeight: 900, mt: 0 }}>
              {value}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", lineHeight: 1.2 }}>
            {helper}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
