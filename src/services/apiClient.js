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
      const { token } = JSON.parse(authState);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
    } else if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.["retry-after"];
      const backendMsg = error.response.data?.message;
      let toastMsg = backendMsg || "Too many requests. Please slow down and try again later.";
      if (retryAfter && !toastMsg.includes("second")) {
        toastMsg += ` (Retry after ${retryAfter}s)`;
      }
      showAppToast(toastMsg, "warning");
    } else if (!error.response) {
      showAppToast("Unable to reach the server. Please check your network connection.", "error");
    }
    return Promise.reject(error);
  }
);

export const getImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http:") || path.startsWith("https:")) return path;

  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://localhost:5112/api/v1";
  const backendBaseUrl = baseUrl.replace(/\/api\/v\d+$/i, "").replace(/\/api$/i, "");

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${backendBaseUrl}${cleanPath}`;
};

export default apiClient;
