import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getRightsForPath } from "../utils/rightsHelper";

/**
 * Custom hook to get access permissions for the current route location.
 * 
 * Access levels:
 *   0 = No Access / Deny (isAuthorized = 0, canEdit = false)
 *   1 = View Only       (isAuthorized = 1, canEdit = false)
 *   2 = Full Edit       (isAuthorized = 2, canEdit = true)
 */
export function useAccessByLocation() {
  const location = useLocation();
  const { authState } = useAuth();

  const rights = getRightsForPath(location.pathname, authState?.role);

  let isAuthorized = 2; // Default full access
  if (rights.deny) {
    isAuthorized = 0;
  } else if (!rights.write) {
    isAuthorized = 1;
  }

  return {
    isAuthorized, // 0, 1, or 2
    canView: isAuthorized > 0,
    canEdit: isAuthorized === 2,
    readOnly: isAuthorized === 1,
    deny: isAuthorized === 0,
  };
}

export default useAccessByLocation;
