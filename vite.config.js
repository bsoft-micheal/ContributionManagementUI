import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_API_BASE_URL = "https://localhost:5200/tcms/api/v1";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredApiBaseUrl =
    env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  const apiUrl = new URL(configuredApiBaseUrl, DEFAULT_API_BASE_URL);
  const apiPath = apiUrl.pathname.replace(/\/+$/, "");
  const proxyContext = apiPath.replace(/\/v\d+$/i, "") || "/api";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        [proxyContext]: {
          target: apiUrl.origin,
          changeOrigin: true,
          secure: false,
        },
      },
      watch: {
        ignored: [
          "**/.vs/**",
          "**/.git/**",
          "**/src/.vs/**",
          "**/*.vsidx",
        ],
      },
    },
  };
});
