import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useIdleTimer } from "../hooks/useIdleTimer";
import { getDeviceInfo } from "../utils/deviceInfo";

const AuthContext = createContext(null);

// ─── Idle timeout ─────────────────────────────────────────────────────────────
// Change this one value to adjust the inactivity timeout:
//   60_000          →  60 seconds  (current — for testing)
//   5  * 60 * 1000  →  5 minutes
//   15 * 60 * 1000  →  15 minutes  (recommended for production)
const IDLE_TIMEOUT_MS = 15*60*1000;

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState(() => {
    const cached = localStorage.getItem("teamContributionAuth");
    return cached ? JSON.parse(cached) : null;
  });

  // ── Persist auth state to localStorage ──────────────────────────────────────
  useEffect(() => {
    if (authState) {
      localStorage.setItem("teamContributionAuth", JSON.stringify(authState));
    } else {
      localStorage.removeItem("teamContributionAuth");
    }
  }, [authState]);

  // ── Check token expiry on app load ───────────────────────────────────────────
  // If the stored token has already expired (e.g. user left the tab overnight),
  // clear the session immediately so they land on the login page.
  useEffect(() => {
    if (authState?.expiresAtUtc) {
      const expiresAt = new Date(authState.expiresAtUtc);
      if (expiresAt <= new Date()) {
        // Token expired — silently clear without redirect toast
        setAuthState(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // ── Idle-timer logout ────────────────────────────────────────────────────────
  // Keep a stable ref so the hook callback never causes re-renders
  const handleIdleRef = useRef(null);
  handleIdleRef.current = () => {
    logout();
    // Navigate to login and pass a flag so LoginPage can show a toast
    navigate("/login", {
      replace: true,
      state: { sessionExpired: true },
    });
  };

  useIdleTimer({
    onIdle:  () => handleIdleRef.current?.(),
    timeout: IDLE_TIMEOUT_MS,
    enabled: Boolean(authState?.token),   // only runs when user is logged in
  });

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (credentials) => {
    // Append the device payload for tracking
    const payload = {
      ...credentials,
      deviceInfo: getDeviceInfo()
    };

    const response = await apiClient.post("/auth/login", payload);
    const data = response.data;

    if (data.requiresTwoFactor) {
      return data; // Return early, do not set authState yet
    }

    // Save fetched menu rights dynamically to local storage for immediate routing and access control enforcement
    if (data.rights && data.role) {
      const savedRights = localStorage.getItem("projectRightsConfig");
      let rightsMap = savedRights ? JSON.parse(savedRights) : {};

      rightsMap[data.role] = data.rights.map((r, idx) => ({
        id: idx + 1,
        module: r.module,
        subModule: r.subModule,
        page: r.page,
        access: r.access,
      }));

      localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));
    }

    setAuthState(data);
    return data;
  }

  const verifyTwoFactor = async (email, otp) => {
    const payload = {
      email,
      otp,
      deviceInfo: getDeviceInfo()
    };

    const response = await apiClient.post("/auth/verify-2fa", payload);
    const data = response.data;

    if (data.rights && data.role) {
      const savedRights = localStorage.getItem("projectRightsConfig");
      let rightsMap = savedRights ? JSON.parse(savedRights) : {};

      rightsMap[data.role] = data.rights.map((r, idx) => ({
        id: idx + 1,
        module: r.module,
        subModule: r.subModule,
        page: r.page,
        access: r.access,
      }));

      localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));
    }

    setAuthState(data);
    return data;
  }

  const logout = async () => {
    try {
      if (authState?.token) {
        await apiClient.post("/device-info/logout");
      }
    } catch (error) {
      console.error("Failed to logout from backend", error);
    } finally {
      setAuthState(null);
    }
  };

  async function updateProfile(profileData) {
    const payload = {
      fullName: profileData.fullName,
      email: profileData.email,
      profileImage: profileData.profileImage,
      password: profileData.password,
    };

    const { data } = await apiClient.put("/users/profile", payload);

    setAuthState((current) => {
      if (!current) return current;
      return {
        ...current,
        fullName: data.fullName || current.fullName,
        email: data.email || current.email,
        profileImage: data.profileImage,
      };
    });
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        verifyTwoFactor,
        logout,
        updateProfile,
        isAuthenticated: Boolean(authState?.token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
