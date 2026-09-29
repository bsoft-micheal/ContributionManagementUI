import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useIdleTimer } from "../hooks/useIdleTimer";
import { getDeviceInfo } from "../utils/deviceInfo";

/**
 * Context for managing user authentication state, tokens, and active permissions.
 */
const AuthContext = createContext(null);

// ─── Idle timeout ─────────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 15*60*1000;

/**
 * Provider component wrapping the application to supply authentication state and methods.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState(() => {
    // 1. Check current browser tab session
    const sessionAuth = sessionStorage.getItem("teamContributionAuth");
    if (sessionAuth) {
      try {
        return JSON.parse(sessionAuth);
      } catch {
        sessionStorage.removeItem("teamContributionAuth");
      }
    }

    // 2. Check if user explicitly selected "Remember Password" in localStorage
    const rememberMe = localStorage.getItem("teamContributionRememberMe");
    if (rememberMe === "true") {
      const localAuth = localStorage.getItem("teamContributionAuth");
      if (localAuth) {
        try {
          const parsed = JSON.parse(localAuth);
          sessionStorage.setItem("teamContributionAuth", localAuth);
          return parsed;
        } catch {
          localStorage.removeItem("teamContributionAuth");
          localStorage.removeItem("teamContributionRememberMe");
        }
      }
    }

    return null;
  });

  // ── Sync auth state cleanup when logged out ──────────────────────────────────
  useEffect(() => {
    if (!authState) {
      sessionStorage.removeItem("teamContributionAuth");
      localStorage.removeItem("teamContributionAuth");
      localStorage.removeItem("teamContributionRememberMe");
    }
  }, [authState]);

  function getDeviceInfo() {
    let deviceId = localStorage.getItem("teamContributionDeviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem("teamContributionDeviceId", deviceId);
    }
    
    return {
      deviceId: deviceId,
      deviceName: "Web Browser",
      brand: "Unknown",
      model: "Unknown",
      os: navigator.platform || "Unknown",
      osVersion: "Unknown",
      systemName: navigator.userAgent.includes("Windows") ? "Windows" : navigator.userAgent.includes("Mac") ? "MacOS" : "Unknown",
      systemVersion: "Unknown",
      deviceType: 1, // 1 = Web Browser
      appVersion: "1.0.0",
      totalMemory: navigator.deviceMemory ? Math.round(navigator.deviceMemory * 1024 * 1024 * 1024) : 0,
      browser: navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Unknown",
      browserVersion: "Unknown"
    };
  }

  async function login(credentials, remember = false) {
    const payload = {
      ...credentials,
      deviceInfo: getDeviceInfo()
    };
    
    const { data: resData } = await apiClient.post("/auth/loginAsync", payload);
    const data = (resData && resData.data !== undefined) ? resData.data : resData;
    
    // Save fetched menu rights dynamically to local storage for immediate routing and access control enforcement
    if (data.rights && data.role) {
      const savedRights = localStorage.getItem("projectRightsConfig");
      let rightsMap = savedRights ? JSON.parse(savedRights) : {};

      const processedRights = data.rights.map((r, idx) => {
        let typeVal = r.accessType ?? r.AccessType;
        if (typeVal === undefined || typeVal === null || isNaN(Number(typeVal)) || Number(typeVal) === 0) {
          const str = String(r.access || r.Access || "").toLowerCase().replace(/[\s_-]/g, "");
          typeVal = (str === "deny" || str === "3") ? 3 : ((str === "readonly" || str === "1") ? 1 : 2);
        }
        return {
          id: idx + 1,
          featureId: r.featureID ?? r.featureId ?? r.FeatureID ?? r.FeatureId,
          module: r.module || r.Module || "",
          subModule: r.subModule || r.SubModule || "",
          action: r.action || r.Action || "",
          page: r.page || r.Page || "",
          access: r.access || r.Access || (Number(typeVal) === 3 ? "deny" : (Number(typeVal) === 1 ? "readOnly" : "readWrite")),
          accessType: Number(typeVal)
        };
      });

      rightsMap[data.role] = processedRights;
      rightsMap[data.role.toLowerCase()] = processedRights;
      localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));
    }

    if (data.token) {
      sessionStorage.setItem("teamContributionAuth", JSON.stringify(data));
      sessionStorage.removeItem("birthdayModalShownSession");
      if (remember) {
        localStorage.setItem("teamContributionAuth", JSON.stringify(data));
        localStorage.setItem("teamContributionRememberMe", "true");
      } else {
        localStorage.removeItem("teamContributionAuth");
        localStorage.removeItem("teamContributionRememberMe");
      }
    }

    setAuthState(data);
    return data;
  }

  const verifyTwoFactor = async (email, otp, remember = false) => {
    const payload = {
      email,
      otp,
      deviceInfo: getDeviceInfo()
    };

    const response = await apiClient.post("/auth/verify-2faAsync", payload);
    const resData = response.data;
    const data = (resData && resData.data !== undefined) ? resData.data : resData;

    if (data.rights && data.role) {
      const savedRights = localStorage.getItem("projectRightsConfig");
      let rightsMap = savedRights ? JSON.parse(savedRights) : {};

      rightsMap[data.role] = data.rights.map((r, idx) => ({
        id: idx + 1,
        featureId: r.featureID ?? r.featureId,
        module: r.module,
        subModule: r.subModule,
        action: r.action || r.Action || "",
        page: r.page,
        access: r.access,
        accessType: r.accessType ?? r.AccessType ?? (r.access === "deny" ? 3 : (r.access === "readOnly" ? 1 : 2))
      }));

      localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));
    }

    if (data.token) {
      sessionStorage.setItem("teamContributionAuth", JSON.stringify(data));
      sessionStorage.removeItem("birthdayModalShownSession");
      if (remember) {
        localStorage.setItem("teamContributionAuth", JSON.stringify(data));
        localStorage.setItem("teamContributionRememberMe", "true");
      } else {
        localStorage.removeItem("teamContributionAuth");
        localStorage.removeItem("teamContributionRememberMe");
      }
    }

    setAuthState(data);
    return data;
  };

  const logout = async () => {
    try {
      if (authState?.token) {
        await apiClient.post("/device-info/logoutCurrentSessionAsync");
      }
    } catch (error) {
      // Backend logout cleanup error ignored
    } finally {
      sessionStorage.removeItem("teamContributionAuth");
      sessionStorage.removeItem("birthdayModalShownSession");
      localStorage.removeItem("teamContributionAuth");
      localStorage.removeItem("teamContributionRememberMe");
      setAuthState(null);
    }
  };

  async function fetchProfile() {
    try {
      const { data: resData } = await apiClient.get("/users/getProfileAsync");
      const data = (resData && resData.data !== undefined) ? resData.data : resData;
      setAuthState((current) => {
        if (!current) return current;
        return {
          ...current,
          fullName: data.fullName || current.fullName,
          email: data.email || current.email,
          profileImage: data.profileImage,
          phone: data.phone,
          gender: data.gender,
          workType: data.workType || data.memberType || current.workType,
          memberType: data.workType || data.memberType || current.memberType,
          dateOfBirth: data.dateOfBirth,
          joiningDate: data.joiningDate,
          role: data.roleName || current.role,
        };
      });
      return data;
    } catch (err) {
      throw err;
    }
  }

  async function updateProfile(profileData) {
    const wtVal = profileData.workType || profileData.memberType;
    const payload = {
      fullName: profileData.fullName,
      email: profileData.email,
      profileImage: profileData.profileImage,
      password: profileData.password,
      phone: profileData.phone,
      gender: profileData.gender,
      workType: wtVal,
      memberType: wtVal,
      dateOfBirth: profileData.dateOfBirth,
      joiningDate: profileData.joiningDate,
      roleName: profileData.roleName,
    };

    const { data: resData } = await apiClient.put("/users/updateProfileAsync", payload);
    const data = (resData && resData.data !== undefined) ? resData.data : resData;

    setAuthState((current) => {
      if (!current) return current;
      const resolvedWt = data.workType !== undefined ? data.workType : (data.memberType !== undefined ? data.memberType : current.workType);
      const updated = {
        ...current,
        isFirstLogin: false,
        fullName: data.fullName || current.fullName,
        email: data.email || current.email,
        profileImage: data.profileImage,
        phone: data.phone !== undefined ? data.phone : current.phone,
        gender: data.gender !== undefined ? data.gender : current.gender,
        workType: resolvedWt,
        memberType: resolvedWt,
        dateOfBirth: data.dateOfBirth !== undefined ? data.dateOfBirth : current.dateOfBirth,
        joiningDate: data.joiningDate !== undefined ? data.joiningDate : current.joiningDate,
        role: data.roleName || current.role,
      };
      sessionStorage.setItem("teamContributionAuth", JSON.stringify(updated));
      if (localStorage.getItem("teamContributionRememberMe") === "true") {
        localStorage.setItem("teamContributionAuth", JSON.stringify(updated));
      }
      return updated;
    });
    return data;
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        verifyTwoFactor,
        logout,
        updateProfile,
        fetchProfile,
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
