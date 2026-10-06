import React, { createContext, useContext, useState, useEffect } from "react";

const NavigationLoadingContext = createContext({
  isLoading: false,
  showLoader: () => { },
  hideLoader: () => { },
  setLoadingMessage: () => { },
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export function NavigationLoadingProvider({ children }) {
  const [customLoading, setCustomLoading] = useState(false);
  const [apiActiveCount, setApiActiveCount] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    const handleApiStart = () => setApiActiveCount((prev) => prev + 1);
    const handleApiEnd = () => setApiActiveCount((prev) => Math.max(0, prev - 1));

    window.addEventListener("app:api-start", handleApiStart);
    window.addEventListener("app:api-end", handleApiEnd);

    return () => {
      window.removeEventListener("app:api-start", handleApiStart);
      window.removeEventListener("app:api-end", handleApiEnd);
    };
  }, []);

  // Listen for route changes to show a brief loader on page navigation
  useEffect(() => {
    const currentPath = (window.location.pathname || "").toLowerCase();
    const isAuth = currentPath === "/login" || currentPath.startsWith("/forgot-password");

    if (!isAuth) {
      setRouteLoading(true);
      const timer = setTimeout(() => {
        setRouteLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [window.location.pathname]);

  const showLoader = (customMsg = "Loading...") => {
    setMessage(customMsg);
    setCustomLoading(true);
  };

  const hideLoader = () => {
    setCustomLoading(false);
  };

  const currentPath = (window.location.pathname || "").toLowerCase();
  const isAuthPage = currentPath === "/login" || currentPath.startsWith("/forgot-password");

  const isLoading = !isAuthPage && (customLoading || routeLoading || apiActiveCount > 0);

  return (
    <NavigationLoadingContext.Provider
      value={{
        isLoading,
        showLoader,
        hideLoader,
        setLoadingMessage: setMessage,
      }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export default NavigationLoadingContext;
