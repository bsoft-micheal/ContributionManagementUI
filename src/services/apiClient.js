import axios from "axios";
import { showAppToast } from "../components/common/AppToast";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://localhost:5112/api/v1",
});

let lastRateLimitToastTime = 0;
let rateLimitLockoutUntil = 0;

apiClient.interceptors.request.use((config) => {
  const url = (config.url || "").toLowerCase();
  const currentPath = (window.location.pathname || "").toLowerCase();

  // If a mutation is attempted during an active lockout from Retry-After, prevent immediate redundant failure
  const now = Date.now();
  if (rateLimitLockoutUntil > now && config.method && config.method.toLowerCase() !== "get") {
    const remainingSec = Math.max(1, Math.ceil((rateLimitLockoutUntil - now) / 1000));
    const rateLimitError = new Error(`Rate limit in effect. Please wait ${remainingSec}s before retrying.`);
    rateLimitError.response = {
      status: 429,
      data: { message: `Rate limit in effect. Please wait ${remainingSec}s before retrying.` },
      headers: { "retry-after": String(remainingSec) },
    };
    rateLimitError.isRateLimit = true;
    return Promise.reject(rateLimitError);
  }

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
    } else if (error.response?.status === 429 || error.isRateLimit) {
      error.isRateLimit = true;
      const retryAfterHeader = error.response?.headers?.["retry-after"];
      const retryAfterSeconds = parseInt(retryAfterHeader, 10) || 60;

      // Update lockout timestamp
      rateLimitLockoutUntil = Date.now() + (retryAfterSeconds * 1000);

      // Debounce toast: only trigger 1 toast within 3 seconds even if multiple concurrent calls hit 429
      const now = Date.now();
      if (now - lastRateLimitToastTime > 3000) {
        lastRateLimitToastTime = now;
        const backendMsg = error.response?.data?.message;
        let toastMsg = backendMsg || "Too many requests. Please slow down and try again.";
        if (retryAfterSeconds && !toastMsg.includes("second") && !toastMsg.includes(`${retryAfterSeconds}s`)) {
          toastMsg += ` (Retry after ${retryAfterSeconds}s)`;
        }
        showAppToast(toastMsg, "warning");
      }
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
