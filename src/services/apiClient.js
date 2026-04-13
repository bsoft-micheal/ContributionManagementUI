import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5111/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const authState = localStorage.getItem("teamContributionAuth");
  if (authState) {
    const { token } = JSON.parse(authState);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("teamContributionAuth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
