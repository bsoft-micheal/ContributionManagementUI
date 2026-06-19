import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "teamContributionThemeMode";

const ThemeModeContext = createContext(null);

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "light";

    const savedMode = window.localStorage.getItem(STORAGE_KEY);
    if (savedMode === "light" || savedMode === "dark") return savedMode;

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode,
      toggleMode: () => setMode((current) => (current === "light" ? "dark" : "light")),
    }),
    [mode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }

  return context;
}
