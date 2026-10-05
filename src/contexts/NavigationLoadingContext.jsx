import React, { createContext, useContext, useState } from "react";
import AppPageLoader from "../components/common/AppPageLoader";

const NavigationLoadingContext = createContext({
  isLoading: false,
  showLoader: () => {},
  hideLoader: () => {},
  setLoadingMessage: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export function NavigationLoadingProvider({ children }) {
  const [customLoading, setCustomLoading] = useState(false);
  const [apiActiveCount, setApiActiveCount] = useState(0);
  const [message, setMessage] = useState("Loading...");

  React.useEffect(() => {
    const handleApiStart = () => setApiActiveCount((prev) => prev + 1);
    const handleApiEnd = () => setApiActiveCount((prev) => Math.max(0, prev - 1));

    window.addEventListener("app:api-start", handleApiStart);
    window.addEventListener("app:api-end", handleApiEnd);

    return () => {
      window.removeEventListener("app:api-start", handleApiStart);
      window.removeEventListener("app:api-end", handleApiEnd);
    };
  }, []);

  const showLoader = (customMsg = "Loading...") => {
    setMessage(customMsg);
    setCustomLoading(true);
  };

  const hideLoader = () => {
    setCustomLoading(false);
  };

  const isLoading = customLoading || apiActiveCount > 0;

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
      {/* Global fullScreen loader disabled so pages with table loaders do not display dual loaders */}
      {/* {isLoading && <AppPageLoader text={message} fullScreen />} */}
    </NavigationLoadingContext.Provider>
  );
}

export default NavigationLoadingContext;
