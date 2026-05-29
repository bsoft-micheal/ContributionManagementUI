import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../services/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const cached = localStorage.getItem("teamContributionAuth");
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    if (authState) {
      localStorage.setItem("teamContributionAuth", JSON.stringify(authState));
    } else {
      localStorage.removeItem("teamContributionAuth");
    }
  }, [authState]);

  async function login(credentials) {
    const { data } = await apiClient.post("/auth/login", credentials);
    
    // Save fetched menu rights dynamically to local storage for immediate routing and access control enforcement
    if (data.rights && data.role) {
      const savedRights = localStorage.getItem("projectRightsConfig");
      let rightsMap = savedRights ? JSON.parse(savedRights) : {};
      
      rightsMap[data.role] = data.rights.map((r, idx) => ({
        id: idx + 1,
        module: r.module,
        subModule: r.subModule,
        page: r.page,
        access: r.access
      }));
      
      localStorage.setItem("projectRightsConfig", JSON.stringify(rightsMap));
    }

    setAuthState(data);
    return data;
  }

  function logout() {
    setAuthState(null);
  }

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
