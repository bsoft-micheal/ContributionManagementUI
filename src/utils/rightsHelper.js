// Reusable Role-Based Access Control (RBAC) rights helper

export function getRightsForPath(path, roleName) {
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

    // Map URL path to target SubModule / Module label
    let targetName = "";
    if (path === "/") targetName = "Dashboard";
    else if (path === "/members") targetName = "Members";
    else if (path === "/exit-process") targetName = "Exit Process";
    else if (path === "/calendar") targetName = "Calendar";
    else if (path === "/events" || path.startsWith("/events/")) targetName = "Event";
    else if (path === "/event-types") targetName = "Event Types";
    else if (path === "/roles") targetName = "Roles";
    else if (path === "/contributions") targetName = "Contribution";
    else if (path === "/contribution-calculation") targetName = "Calculation";
    else if (path === "/reports/event-collection-audit" || path === "/reports") targetName = "Reports";
    else if (path === "/reports/member-velocity") targetName = "Reports";
    else if (path === "/reports/pending-dues") targetName = "Reports";
    else if (path === "/reports/member-category-paid") targetName = "Reports";
    else if (path === "/my-contributions") targetName = "Contribution";
    else if (path === "/payments") targetName = "Payment History";
    else if (path === "/expense") targetName = "Expense";
    else if (path === "/gallery") targetName = "Gallery";
    else if (path === "/support-tickets") targetName = "Support Ticket";
    else if (path === "/settings") targetName = "Settings";
    else if (path === "/user-rights") targetName = "User Rights";
    else if (path === "/users") targetName = "Users";

    const matchedRight = roleRights.find(r => {
      const sub = (r.subModule || r.SubModule || "").toLowerCase();
      const mod = (r.module || r.Module || "").toLowerCase();
      const target = targetName.toLowerCase();
      return sub === target || mod === target;
    });

    if (!matchedRight) {
      return { read: true, write: true, deny: false };
    }

    const access = matchedRight.access || matchedRight.Access || "readWrite";
    return {
      read: access !== "deny",
      write: access === "readWrite",
      deny: access === "deny"
    };
  } catch (error) {
    console.error("Error evaluating path rights:", error);
    return { read: true, write: true, deny: false };
  }
}

export function getRightsForPage(pageName, roleName) {
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

    const pageRight = roleRights.find(r => {
      const sub = (r.subModule || r.SubModule || "").toLowerCase();
      const mod = (r.module || r.Module || "").toLowerCase();
      const page = (r.page || r.Page || "").toLowerCase();
      const target = pageName.toLowerCase();
      return sub === target || mod === target || page === target;
    });

    if (!pageRight) {
      return { read: true, write: true, deny: false };
    }

    const access = pageRight.access || pageRight.Access || "readWrite";
    return {
      read: access !== "deny",
      write: access === "readWrite",
      deny: access === "deny"
    };
  } catch (error) {
    console.error("Error evaluating page rights:", error);
    return { read: true, write: true, deny: false };
  }
}
