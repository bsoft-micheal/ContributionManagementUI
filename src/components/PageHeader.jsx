import { Box, Stack, Typography } from "@mui/material";

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <Box
      sx={{
        py: { xs: 2, md: 3 },
        mb: 2,
        position: "relative",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={3}
      >
        <Box>
          <Typography 
            variant="overline" 
            sx={{ 
              fontWeight: 600, 
              color: "primary.main",
              letterSpacing: "0.06em",
              fontSize: "0.75rem",
              display: "block",
              mb: 0.5
            }}
          >
            {eyebrow}
          </Typography>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, fontSize: { xs: "1.5rem", sm: "1.625rem" }, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 720, fontSize: "0.875rem", lineHeight: 1.55 }}>
            {description}
          </Typography>
        </Box>
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center",
            gap: 2, 
          }}
        >
          {actions}
        </Box>
      </Stack>
    </Box>
  );
}
