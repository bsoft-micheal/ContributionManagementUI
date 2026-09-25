import { navigationItems } from "../config/menuConfig";

/**
 * Resolves the DB feature_id associated with a routing path based on menuConfig.
 */
export function getFeatureIdForPath(path) {
  if (!path) return null;
  const cleanPath = path.toLowerCase();

  for (const item of navigationItems) {
    if (item.path && item.path.toLowerCase() === cleanPath) {
      return item.featureId;
    }
    if (item.path && item.path !== "/" && cleanPath.startsWith(item.path.toLowerCase())) {
      return item.featureId;
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.path && child.path.toLowerCase() === cleanPath) {
          return child.featureId;
        }
        if (child.path && child.path !== "/" && cleanPath.startsWith(child.path.toLowerCase())) {
          return child.featureId;
        }
      }
    }
  }

  // Route path fallbacks
  if (cleanPath === "/") return 1;
  if (cleanPath === "/members") return 2;
  if (cleanPath.startsWith("/events")) return 4;
  if (cleanPath === "/calendar") return 5;
  if (cleanPath === "/gallery") return 6;
  if (cleanPath === "/contributions" || cleanPath === "/my-contributions") return 8;
  if (cleanPath === "/payments") return 9;
  if (cleanPath === "/contribution-calculation") return 10;
  if (cleanPath === "/expense") return 11;
  if (cleanPath === "/support-tickets") return 12;
  if (cleanPath === "/users") return 14;
  if (cleanPath === "/roles") return 15;
  if (cleanPath === "/user-rights") return 16;
  if (cleanPath === "/event-types") return 17;
  if (cleanPath === "/budget-calculations") return 18;
  if (cleanPath === "/types" || cleanPath === "/ticket-types") return 19;
  if (cleanPath === "/status") return 20;
  if (cleanPath === "/exit-process") return 21;
  if (cleanPath === "/settings") return 22;
  if (cleanPath.startsWith("/reports")) return 23;

  return null;
}

/**
 * Resolves permissions for a given featureId and roleName.
 * 
 * AccessType mapping:
 *   1 = ReadOnly  -> read: true, write: false, deny: false
 *   2 = ReadWrite -> read: true, write: true, deny: false
 *   3 = Deny      -> read: false, write: false, deny: true
 */
export function getRightsForFeatureId(featureId, roleName) {
  if (!roleName) {
    return { read: false, write: false, deny: true };
  }

  const savedRights = localStorage.getItem("projectRightsConfig");
  if (!savedRights) {
    return { read: true, write: true, deny: false };
  }

  try {
    const rightsMap = JSON.parse(savedRights);
    const roleRights = rightsMap[roleName];
    if (!roleRights || !Array.isArray(roleRights)) {
      return { read: true, write: true, deny: false };
    }

    const numericFeatureId = Number(featureId);
    let matchedRight = null;

    if (numericFeatureId > 0) {
      matchedRight = roleRights.find(r => Number(r.featureId || r.featureID) === numericFeatureId);
    }

    if (!matchedRight) {
      return { read: false, write: false, deny: true };
    }

    let accessType = matchedRight.accessType ?? matchedRight.AccessType;
    if (accessType === undefined || accessType === null || isNaN(Number(accessType)) || Number(accessType) === 0) {
      const accessStr = (matchedRight.access || matchedRight.Access || "").toLowerCase();
      accessType = accessStr === "deny" ? 3 : (accessStr === "readonly" ? 1 : 2);
    }

    const val = Number(accessType);

    return {
      read: val === 1 || val === 2,  // 1 = ReadOnly, 2 = ReadWrite
      write: val === 2,              // 2 = ReadWrite
      deny: val === 3               // 3 = Deny
    };
  } catch (error) {
    console.error("Error evaluating featureId rights:", error);
    return { read: true, write: true, deny: false };
  }
}

/**
 * Resolves permissions for a URL path by finding its featureId and evaluating rights.
 */
export function getRightsForPath(path, roleName) {
  const featureId = getFeatureIdForPath(path);
  return getRightsForFeatureId(featureId, roleName);
}

export function getRightsForPage(pageName, roleName) {
  const featureId = getFeatureIdForPath(pageName);
  if (featureId) {
    return getRightsForFeatureId(featureId, roleName);
  }
  return getRightsForFeatureId(0, roleName);
}
