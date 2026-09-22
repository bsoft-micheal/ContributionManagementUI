import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      // Exclude Visual Studio lock files that cause EBUSY crash on Windows
      ignored: ["**/.vs/**", "**/src/.vs/**"],
    },
  },
});
