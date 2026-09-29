import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppPageLoader from "../components/common/AppPageLoader";

const NavigationLoadingContext = createContext({
  isLoading: false,
  showLoader: () => {},
  hideLoader: () => {},
  setLoadingMessage: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export function NavigationLoadingProvider({ children }) {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [message, setMessage] = useState("Loading...");

  // Trigger smooth transition loader whenever route changes
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 420); // Smooth 420ms transition window for crisp UX

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  const showLoader = (customMsg = "Loading...") => {
    setMessage(customMsg);
    setCustomLoading(true);
  };

  const hideLoader = () => {
    setCustomLoading(false);
  };

  const isLoading = isNavigating || customLoading;

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
      {isLoading && <AppPageLoader message={message} fullScreen />}
    </NavigationLoadingContext.Provider>
  );
}

export default NavigationLoadingContext;
