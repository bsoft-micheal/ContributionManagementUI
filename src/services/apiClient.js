import axios from "axios";
import { showAppToast } from "../components/common/AppToast";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://localhost:5112/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const url = (config.url || "").toLowerCase();
  const currentPath = (window.location.pathname || "").toLowerCase();

  const isAuthPageOrEndpoint =
    Boolean(config.hideLoader) ||
    currentPath === "/login" ||
    currentPath.startsWith("/forgot-password") ||
    url.includes("/auth/login") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/verify-2fa") ||
    url.includes("/logout") ||
    url.includes("switchrole") ||
    url.includes("switchroleasync");

  if (isAuthPageOrEndpoint) {
    config.hideLoader = true;
  }

  if (!config.hideLoader) {
    window.dispatchEvent(new CustomEvent("app:api-start"));
  }

  const authState = sessionStorage.getItem("teamContributionAuth") || localStorage.getItem("teamContributionAuth");
  if (authState) {
    try {
      const parsed = JSON.parse(authState);
      if (parsed.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
      const activeRole = parsed.role || parsed.activeRole;
      if (activeRole) {
        config.headers["X-Active-Role"] = activeRole;
      }
    } catch {
      // ignore parse error
    }
  }

  return config;
}, (error) => {
  window.dispatchEvent(new CustomEvent("app:api-end"));
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => {
    if (!response.config?.hideLoader) {
      window.dispatchEvent(new CustomEvent("app:api-end"));
    }
    return response;
  },
  (error) => {
    if (!error.config?.hideLoader) {
      window.dispatchEvent(new CustomEvent("app:api-end"));
    }
    if (error.response?.status === 401) {
      sessionStorage.removeItem("teamContributionAuth");
      localStorage.removeItem("teamContributionAuth");
      localStorage.removeItem("teamContributionRememberMe");
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/forgot-password") && currentPath !== "/login") {
        window.location.href = "/login";
      }
    } else if (!error.response) {
      showAppToast("Unable to reach the server. Please check your network connection.", "error");
    }
    return Promise.reject(error);
  }
);

export const getBackendBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://localhost:5112/api/v1";
  return baseUrl.replace(/\/api\/v\d+$/i, "").replace(/\/api$/i, "");
};

export const getImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http:") || path.startsWith("https:")) return path;

  const backendBaseUrl = getBackendBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${backendBaseUrl}${cleanPath}`;
};

export const getHangfireDashboardUrl = () => {
  const customUrl = import.meta.env.VITE_HANGFIRE_DASHBOARD_URL;
  if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
    const trimmed = customUrl.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${getBackendBaseUrl()}${cleanPath}`;
  }
  return `${getBackendBaseUrl()}/hangfire`;
};

export default apiClient;
