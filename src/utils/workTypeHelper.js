/**
 * Utility helper functions for identifying and managing Work Types across the application.
 * Normalizes work types such as "WFH", "Work From Home", "Work from Home", "Remote", "Home",
 * "Office", "Work From Office", "WFO", etc.
 */

/**
 * Checks whether a given workType string or member object represents Work From Home (WFH).
 * @param {string | object | null | undefined} valOrMember - WorkType string or member/user object
 * @returns {boolean}
 */
export function isWfhWorkType(valOrMember) {
  if (!valOrMember) return false;
  const str = (
    typeof valOrMember === "object"
      ? (valOrMember.workType || valOrMember.memberType || valOrMember.type || "")
      : String(valOrMember)
  )
    .trim()
    .toLowerCase();

  return (
    str === "wfh" ||
    str.includes("wfh") ||
    str.includes("home") ||
    str.includes("remote")
  );
}

/**
 * Checks whether a given workType string or member object represents Office / On-site.
 * Any member not matching WFH is treated as Office.
 * @param {string | object | null | undefined} valOrMember - WorkType string or member/user object
 * @returns {boolean}
 */
export function isOfficeWorkType(valOrMember) {
  return !isWfhWorkType(valOrMember);
}

/**
 * Alias for isWfhWorkType for clarity when operating on member objects in filter callbacks.
 */
export const isWfhMember = (member) => isWfhWorkType(member);

/**
 * Alias for isOfficeWorkType for clarity when operating on member objects in filter callbacks.
 */
export const isOfficeMember = (member) => isOfficeWorkType(member);

/**
 * Returns canonical display label for work type: "WFH" or "Office".
 * @param {string | object | null | undefined} valOrMember
 * @returns {"WFH" | "Office"}
 */
export function getWorkTypeBadgeLabel(valOrMember) {
  return isWfhWorkType(valOrMember) ? "WFH" : "Office";
}

