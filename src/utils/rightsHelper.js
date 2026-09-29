import { navigationItems } from "../config/menuConfig";

/**
 * Resolves the database feature_id associated with a routing path based on menuConfig.
 *
 * @param {string} path - The active URL path route (e.g. "/support-tickets").
 * @returns {number|null} The numeric featureId associated with the path, or null if unmapped.
 */
export function getFeatureIdForPath(path) {
  if (!path) return null;
  const cleanPath = path.toLowerCase().trim();
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;

  for (const item of navigationItems) {
    if (item.path && (item.path.toLowerCase() === cleanPath || item.path.toLowerCase() === normalizedPath)) {
      return item.featureId;
    }
    if (item.path && item.path !== "/" && (cleanPath.startsWith(item.path.toLowerCase()) || normalizedPath.startsWith(item.path.toLowerCase()))) {
      return item.featureId;
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.path && (child.path.toLowerCase() === cleanPath || child.path.toLowerCase() === normalizedPath)) {
          return child.featureId;
        }
        if (child.path && child.path !== "/" && (cleanPath.startsWith(child.path.toLowerCase()) || normalizedPath.startsWith(child.path.toLowerCase()))) {
          return child.featureId;
        }
      }
    }
  }

  // Route path fallbacks
  if (normalizedPath === "/") return 1;
  // if (normalizedPath === "/members") return 2;
  if (normalizedPath.startsWith("/events")) return 4;
  if (normalizedPath === "/calendar") return 5;
  if (normalizedPath === "/gallery") return 6;
  if (normalizedPath === "/contributions" || normalizedPath === "/my-contributions") return 8;
  if (normalizedPath === "/payment-submission" || normalizedPath === "/confirm-payment") return 24;
  if (normalizedPath === "/payments") return 9;
  if (normalizedPath === "/contribution-calculation") return 10;
  if (normalizedPath === "/expense") return 11;
  if (normalizedPath === "/support-tickets") return 12;
  if (normalizedPath === "/users") return 14;
  if (normalizedPath === "/roles") return 15;
  if (normalizedPath === "/user-rights") return 16;
  if (normalizedPath === "/event-types") return 17;
  if (normalizedPath === "/budget-calculations") return 18;
  if (normalizedPath === "/types" || normalizedPath === "/ticket-types") return 19;
  if (normalizedPath === "/status") return 20;
  if (normalizedPath === "/exit-process") return 21;
  if (normalizedPath === "/settings") return 22;
  if (normalizedPath.startsWith("/reports")) return 23;

  return null;
}

/**
 * Resolves permissions for a given featureId and roleName.
 */
export function getRightsForFeatureId(featureId, roleName) {
  if (!roleName) {
    return { read: true, write: true, deny: false };
  }

  const roleLower = String(roleName).toLowerCase();
  if (roleLower === "admin" || roleLower === "superadmin") {
    return { read: true, write: true, deny: false };
  }

  const savedRights = localStorage.getItem("projectRightsConfig");
  if (!savedRights) {
    return { read: true, write: true, deny: false };
  }

  try {
    const rightsMap = JSON.parse(savedRights);
    const roleRights = rightsMap[roleName] || rightsMap[roleLower];
    if (!roleRights || !Array.isArray(roleRights)) {
      return { read: true, write: true, deny: false };
    }

    const numericFeatureId = Number(featureId);
    let matchedRight = null;

    if (numericFeatureId > 0) {
      matchedRight = roleRights.find(r => Number(r.featureId || r.featureID) === numericFeatureId);
    }

    if (!matchedRight) {
      return { read: true, write: true, deny: false };
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
  } catch {
    return { read: false, write: false, deny: true };
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
  if (!roleName) {
    return { read: false, write: false, deny: true };
  }

  const roleLower = String(roleName).toLowerCase();
  if (roleLower === "admin" || roleLower === "superadmin") {
    return { read: true, write: true, deny: false };
  }

  // 1. Try resolving via featureId matching first
  const featureId = getFeatureIdForPath(pageName);
  if (featureId) {
    return getRightsForFeatureId(featureId, roleName);
  }

  // 2. Fallback to direct localStorage matching by module / subModule / page name
  const savedRights = localStorage.getItem("projectRightsConfig");
  if (!savedRights) {
    return { read: false, write: false, deny: true };
  }

  try {
    const rightsMap = JSON.parse(savedRights);
    const roleRights = rightsMap[roleName];
    if (!roleRights || !Array.isArray(roleRights)) {
      return { read: false, write: false, deny: true };
    }

    const cleanTarget = (pageName || "").toLowerCase();
    const matchedRight = roleRights.find(r => {
      const sub = (r.subModule || r.SubModule || "").toLowerCase();
      const mod = (r.module || r.Module || "").toLowerCase();
      const page = (r.page || r.Page || "").toLowerCase();
      return sub === cleanTarget || mod === cleanTarget || page === cleanTarget;
    });

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
  } catch {
    return { read: false, write: false, deny: true };
  }
}
