import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getRightsForPath } from "../utils/rightsHelper";

/**
 * Custom hook to evaluate access permissions for the current route location.
 *
 * Converts database accessType permission into a UI authorization level:
 *
 * Database accessType values:
 *   1 = ReadOnly  (View allow ed, Edit forbidden)
 *   2 = ReadWrite (Full Edit & Creation allowed)
 *   3 = Deny      (Access completely forbidden)
 *
 * UI authorization levels returned:
 *   0 = Deny / No Access        (canView = false, canEdit = false, deny = true)
 *   1 = ReadOnly / View Only    (canView = true,  canEdit = false, readOnly = true)
 *   2 = ReadWrite / Full Edit   (canView = true,  canEdit = true,  readOnly = false)
 *
 * @returns {{
 *   isAuthorized: number,
 *   canView: boolean,
 *   canEdit: boolean,
 *   readOnly: boolean,
 *   deny: boolean
 * }} The UI authorization flags for the active route location.
 */
export function useAccessByLocation() {
  const location = useLocation();
  const { authState } = useAuth();

  const rights = getRightsForPath(location.pathname, authState?.role);

  let isAuthorized = 0; // Default DENY for unmapped / missing rights
  if (rights && !rights.deny) {
    if (rights.write) {
      isAuthorized = 2; // ReadWrite
    } else if (rights.read) {
      isAuthorized = 1; // ReadOnly
    }
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
