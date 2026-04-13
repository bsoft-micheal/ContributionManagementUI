import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export default function MetricCard({ label, value, helper, accent = "primary.main" }) {
  return (
    <Card 
      sx={{ 
        height: "100%", 
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": { 
          transform: "translateY(-4px)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
        }
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.65rem" }}>
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
