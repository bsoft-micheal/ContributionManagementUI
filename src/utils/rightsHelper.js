// Reusable Role-Based Access Control (RBAC) rights helper

export function getRightsForPath(path, roleName) {
  // If no role is active, deny by default
  if (!roleName) {
    return { read: false, write: false, deny: true };
  }

  // If user is Admin, they have full Read/Write rights by default
  if (roleName === "Admin") {
    return { read: true, write: true, deny: false };
  }

  const savedRights = localStorage.getItem("projectRightsConfig");
  if (!savedRights) {
    // Default fallback for other roles: read-only, no deny
    return { read: true, write: false, deny: false };
  }

  try {
    const rightsMap = JSON.parse(savedRights);
    const roleRights = rightsMap[roleName];
    if (!roleRights) {
      return { read: true, write: false, deny: false };
    }

    // Map current URL paths to standard page names defined in UserRightsPage
    let targetName = "";
    if (path === "/") targetName = "Dashboard";
    else if (path === "/members") targetName = "Members";
    else if (path === "/exit-process") targetName = "Exit Process";
    else if (path === "/calendar") targetName = "Calendar";
    else if (path === "/events" || path.startsWith("/events/")) targetName = "Events";
    else if (path === "/event-types") targetName = "Event Types";
    else if (path === "/roles") targetName = "Roles";
    else if (path === "/contributions") targetName = "Contributions";
    else if (path === "/contribution-calculation") targetName = "Calculation";
    else if (path === "/reports/event-collection-audit" || path === "/reports") targetName = "Event Audit";
    else if (path === "/reports/member-velocity") targetName = "Member Velocity";
    else if (path === "/reports/pending-dues") targetName = "Pending Dues";
    else if (path === "/reports/member-category-paid") targetName = "Member Category Paid";
    else if (path === "/my-contributions") targetName = "My Contributions";
    else if (path === "/payments") targetName = "Payments";
    else if (path === "/expense") targetName = "Expense";
    else if (path === "/gallery") targetName = "Gallery";
    else if (path === "/support-tickets") targetName = "Support Tickets";
    else if (path === "/budget-calculations") targetName = "Budget Calculations";
    else if (path === "/settings") targetName = "Settings";
    else if (path === "/user-rights") targetName = "User Rights"; // Admin-only
    else if (path === "/users") targetName = "Users";        // Admin & Manager only

    if (targetName === "User Rights" || targetName === "Users") {
      if (roleName === "Admin" || roleName === "Manager") {
        return { read: true, write: true, deny: false };
      }
      return { read: false, write: false, deny: true }; // strictly Admin & Manager-only
    }

    const pageRight = roleRights.find(
      r => r.page === targetName || r.subModule === targetName
    );
    if (!pageRight) {
      return { read: true, write: false, deny: false };
    }

    return {
      read: pageRight.access !== "deny",
      write: pageRight.access === "readWrite",
      deny: pageRight.access === "deny"
    };
  } catch (error) {
    console.error("Error evaluating path rights:", error);
    return { read: true, write: false, deny: false };
  }
}

export function getRightsForPage(pageName, roleName) {
  if (!roleName) {
    return { read: false, write: false, deny: true };
  }

  if (pageName.toLowerCase() === "user rights" || pageName.toLowerCase() === "users") {
    if (roleName === "Admin" || roleName === "Manager") {
      return { read: true, write: true, deny: false };
    }
    return { read: false, write: false, deny: true };
  }

  if (roleName === "Admin") {
    return { read: true, write: true, deny: false };
  }

  const savedRights = localStorage.getItem("projectRightsConfig");
  if (!savedRights) {
    return { read: true, write: false, deny: false };
  }

  try {
    const rightsMap = JSON.parse(savedRights);
    const roleRights = rightsMap[roleName];
    if (!roleRights) {
      return { read: true, write: false, deny: false };
    }

    const pageRight = roleRights.find(
      r => r.page.toLowerCase() === pageName.toLowerCase() ||
        r.subModule.toLowerCase() === pageName.toLowerCase() ||
        r.module.toLowerCase() === pageName.toLowerCase()
    );
    if (!pageRight) {
      return { read: true, write: false, deny: false };
    }

    return {
      read: pageRight.access !== "deny",
      write: pageRight.access === "readWrite",
      deny: pageRight.access === "deny"
    };
  } catch (error) {
    console.error("Error evaluating page rights:", error);
    return { read: true, write: false, deny: false };
  }
}
