import { navigationItems } from "../config/menuConfig";

/**
 * Maps an action featureId to its parent page featureId.
 */
function getParentPageFeatureId(actionFeatureId) {
  const id = Number(actionFeatureId);
  if (id >= 25 && id <= 29) return 2;   // Users
  if (id >= 30 && id <= 34) return 4;   // Event
  if (id >= 35 && id <= 39) return 6;   // Gallery
  if (id >= 40 && id <= 41) return 8;   // Contribution
  if (id >= 42 && id <= 43) return 9;   // Payment History
  if (id >= 44 && id <= 45) return 10;  // Calculation
  if (id >= 46 && id <= 51) return 11;  // Expense
  if (id >= 52 && id <= 54) return 24;  // Payment Submission
  if (id >= 55 && id <= 60) return 12;  // Support Ticket
  if (id >= 61 && id <= 65) return 18;  // Budget Calculation
  if (id >= 66 && id <= 70) return 19;  // Types
  if (id >= 71 && id <= 75) return 20;  // Status
  if (id >= 76 && id <= 78) return 21;  // Exit Process
  if (id >= 79 && id <= 80) return 22;  // Settings
  if (id >= 81 && id <= 82) return 23;  // Reports
  if (id >= 83 && id <= 89) return 2;   // Users
  return null;
}

/**
 * Derives parent page featureId from an action name string if numeric featureId is omitted.
 */
function getParentFeatureIdFromActionName(actionName) {
  if (!actionName) return null;
  const str = String(actionName).toLowerCase();
  if (str.includes("expense")) return 11;
  if (str.includes("member") || str.includes("user")) return 2;
  if (str.includes("event")) return 4;
  if (str.includes("gallery") || str.includes("photo")) return 6;
  if (str.includes("contribution")) return 8;
  if (str.includes("payment submission") || str.includes("submit payment")) return 24;
  if (str.includes("payment history") || str.includes("payment")) return 9;
  if (str.includes("calculation")) return 10;
  if (str.includes("ticket") || str.includes("support")) return 12;
  if (str.includes("budget")) return 18;
  if (str.includes("type")) return 19;
  if (str.includes("status")) return 20;
  if (str.includes("exit")) return 21;
  if (str.includes("setting")) return 22;
  if (str.includes("report")) return 23;
  return null;
}

/**
 * Extract active role rights from localStorage with unified priority:
 * 1. rightsMap["current"]
 * 2. rightsMap[roleName]
 * 3. rightsMap[roleName.toLowerCase()]
 */
function getActiveRoleRights(roleName) {
  const savedRights = localStorage.getItem("projectRightsConfig");
  if (!savedRights) return null;
  try {
    const rightsMap = JSON.parse(savedRights);
    const roleLower = roleName ? String(roleName).toLowerCase() : "";
    const roleRights = rightsMap["current"] || (roleName && (rightsMap[roleName] || rightsMap[roleLower]));
    if (Array.isArray(roleRights) && roleRights.length > 0) {
      return roleRights;
    }
    return null;
  } catch {
    return null;
  }
}

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
  if (normalizedPath.startsWith("/events")) return 4;
  if (normalizedPath === "/calendar") return 5;
  if (normalizedPath === "/gallery") return 6;
  if (normalizedPath === "/payment-submission" || normalizedPath === "/confirm-payment") return 24;
  if (normalizedPath === "/payments") return 9;
  if (normalizedPath === "/contribution-calculation") return 10;
  if (normalizedPath === "/expense") return 11;
  if (normalizedPath === "/support-tickets") return 12;
  if (normalizedPath === "/users" || normalizedPath === "/members") return 2;
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
  const roleLower = roleName ? String(roleName).toLowerCase() : "";
  const isAdminOrOrg = roleLower === "admin" || roleLower === "organizer";
  const roleRights = getActiveRoleRights(roleName);

  if (!roleRights) {
    return { read: true, write: isAdminOrOrg, deny: false };
  }

  const numericFeatureId = Number(featureId);
  let matchedRight = null;

  if (numericFeatureId > 0) {
    matchedRight = roleRights.find(r => Number(r.featureId || r.featureID || r.FeatureID || r.FeatureId) === numericFeatureId);
  }

  if (!matchedRight) {
    return { read: true, write: isAdminOrOrg, deny: false };
  }

  let accessType = matchedRight.accessType ?? matchedRight.AccessType;
  if (accessType === undefined || accessType === null || isNaN(Number(accessType)) || Number(accessType) === 0) {
    const accessStr = String(matchedRight.access || matchedRight.Access || "").toLowerCase().replace(/[\s_-]/g, "");
    accessType = (accessStr === "deny" || accessStr === "3") ? 3 : ((accessStr === "readonly" || accessStr === "1") ? 1 : 2);
  }

  const val = Number(accessType);

  return {
    read: val === 1 || val === 2,  // 1 = ReadOnly, 2 = ReadWrite
    write: val === 2,              // 2 = ReadWrite
    deny: val === 3               // 3 = Deny
  };
}

/**
 * Resolves permissions for a URL path by finding its featureId and evaluating rights.
 */
export function getRightsForPath(path, roleName) {
  const featureId = getFeatureIdForPath(path);
  if (featureId) {
    return getRightsForFeatureId(featureId, roleName);
  }
  return getRightsForPage(path, roleName);
}

export function getRightsForPage(pageName, roleName) {
  if (!roleName) {
    return { read: false, write: false, deny: true };
  }

  const featureId = getFeatureIdForPath(pageName);
  if (featureId) {
    return getRightsForFeatureId(featureId, roleName);
  }

  const roleLower = String(roleName).toLowerCase();
  const isAdminOrOrg = roleLower === "admin" || roleLower === "organizer";
  const roleRights = getActiveRoleRights(roleName);

  if (!roleRights) {
    return { read: true, write: isAdminOrOrg, deny: false };
  }

  const cleanTarget = (pageName || "").toLowerCase().trim();
  const matchedRight = roleRights.find(r => {
    const sub = (r.subModule || r.SubModule || "").toLowerCase().trim();
    const mod = (r.module || r.Module || "").toLowerCase().trim();
    const page = (r.page || r.Page || "").toLowerCase().trim();
    const act = (r.action || r.Action || "").toLowerCase().trim();
    return sub === cleanTarget || mod === cleanTarget || page === cleanTarget || act === cleanTarget;
  });

  if (!matchedRight) {
    return { read: true, write: isAdminOrOrg, deny: false };
  }

  let accessType = matchedRight.accessType ?? matchedRight.AccessType;
  if (accessType === undefined || accessType === null || isNaN(Number(accessType)) || Number(accessType) === 0) {
    const accessStr = String(matchedRight.access || matchedRight.Access || "").toLowerCase().replace(/[\s_-]/g, "");
    accessType = (accessStr === "deny" || accessStr === "3") ? 3 : ((accessStr === "readonly" || accessStr === "1") ? 1 : 2);
  }
  const val = Number(accessType);

  return {
    read: val === 1 || val === 2,  // 1 = ReadOnly, 2 = ReadWrite
    write: val === 2,              // 2 = ReadWrite
    deny: val === 3               // 3 = Deny
  };
}

/**
 * Evaluates permission for a specific action (e.g. "Add Event", "Edit Event", "Delete Event")
 *
 * @param {string} actionName - The action name (e.g. "Edit Event", "Delete Event")
 * @param {number|null} featureId - The featureId of the action (e.g. 31, 32, 33)
 * @param {string} roleName - The current user's role (e.g. "Organizer")
 * @returns {{ canView: boolean, canExecute: boolean, isDenied: boolean, readOnly: boolean }}
 */
export function hasActionPermission(actionName, featureId, roleName) {
  const roleRights = getActiveRoleRights(roleName);
  const roleLower = roleName ? String(roleName).toLowerCase() : "";
  const isAdminOrOrg = roleLower === "admin" || roleLower === "organizer";

  if (!roleRights) {
    return { canView: true, canExecute: isAdminOrOrg, isDenied: false, readOnly: !isAdminOrOrg };
  }

  const numericFeatureId = Number(featureId);
  let matchedRight = null;

  // 1. Try matching by action featureId
  if (numericFeatureId > 0) {
    matchedRight = roleRights.find(r => Number(r.featureId || r.featureID || r.FeatureID || r.FeatureId) === numericFeatureId);
  }

  // 2. Fallback matching by action / page / subModule / normalized combination name
  if (!matchedRight && actionName) {
    const cleanAction = String(actionName).toLowerCase().trim();
    matchedRight = roleRights.find(r => {
      const act = String(r.action || r.Action || "").toLowerCase().trim();
      const pg = String(r.page || r.Page || "").toLowerCase().trim();
      const sub = String(r.subModule || r.SubModule || "").toLowerCase().trim();
      const mod = String(r.module || r.Module || "").toLowerCase().trim();

      if (act === cleanAction || pg === cleanAction || sub === cleanAction) return true;
      if (act && sub && `${act} ${sub}`.toLowerCase() === cleanAction) return true;
      if (act && mod && `${act} ${mod}`.toLowerCase() === cleanAction) return true;
      if (act && cleanAction.startsWith(act) && (cleanAction.includes(sub) || cleanAction.includes(mod))) return true;
      return false;
    });
  }

  // 3. Parent Page Fallback if action featureId or name wasn't explicitly found
  if (!matchedRight) {
    let parentPageFeatureId = numericFeatureId > 0 ? getParentPageFeatureId(numericFeatureId) : null;
    if (!parentPageFeatureId && actionName) {
      parentPageFeatureId = getParentFeatureIdFromActionName(actionName);
    }
    if (parentPageFeatureId) {
      matchedRight = roleRights.find(r => Number(r.featureId || r.featureID || r.FeatureID || r.FeatureId) === parentPageFeatureId);
    }
  }

  if (!matchedRight) {
    // If unmapped, enforce strict protection (read allowed, write execution forbidden)
    return { canView: true, canExecute: false, isDenied: false, readOnly: true };
  }

  let accessType = matchedRight.accessType ?? matchedRight.AccessType;
  if (accessType === undefined || accessType === null || isNaN(Number(accessType)) || Number(accessType) === 0) {
    const accessStr = String(matchedRight.access || matchedRight.Access || "").toLowerCase().replace(/[\s_-]/g, "");
    accessType = (accessStr === "deny" || accessStr === "3") ? 3 : ((accessStr === "readonly" || accessStr === "1") ? 1 : 2);
  }

  const val = Number(accessType);
  const isDenied = val === 3;
  const canExecute = val === 2; // Only Read/Write (2) permits execution
  const canView = val === 1 || val === 2;
  const readOnly = val === 1;

  return {
    canView,
    canExecute,
    isDenied,
    readOnly,
  };
}

