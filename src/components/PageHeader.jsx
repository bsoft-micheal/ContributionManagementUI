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
              fontWeight: 800, 
              color: "primary.main",
              letterSpacing: "0.1em",
              display: "block",
              mb: 0.5
            }}
          >
            {eyebrow}
          </Typography>
          <Typography variant="h4" sx={{ mb: 1 }}>{title}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.6 }}>{description}</Typography>
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
