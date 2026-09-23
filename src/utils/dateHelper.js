import dayjs from "dayjs";

/**
 * Centralized Date Format Constants
 * Changing DATE_FORMATS.GRID_DATE will automatically reflect across all table grids in the app.
 * Changing DATE_FORMATS.VIEW_DATE will automatically reflect across all view/details dialogs.
 */
export const DATE_FORMATS = {
  // Grid / Table display formats (e.g. 23/09/2026)
  GRID_DATE: "DD/MM/YYYY",
  GRID_DATETIME: "DD/MM/YYYY hh:mm A",

  // View / Details Modal display formats (e.g. 30 September 2008)
  VIEW_DATE: "DD MMMM YYYY",
  VIEW_DATETIME: "DD MMMM YYYY, hh:mm A",
};

/**
 * Format a date for Grids / Tables (Default: DD/MM/YYYY, e.g. 23/09/2026).
 * @param {string | Date | dayjs.Dayjs} date
 * @param {string} [placeholder="--"]
 * @returns {string}
 */
export function formatGridDate(date, placeholder = "--") {
  if (!date) return placeholder;
  const d = dayjs(date);
  return d.isValid() ? d.format(DATE_FORMATS.GRID_DATE) : placeholder;
}

/**
 * Format a date with time for Grids / Tables (Default: DD/MM/YYYY hh:mm A).
 * @param {string | Date | dayjs.Dayjs} date
 * @param {string} [placeholder="--"]
 * @returns {string}
 */
export function formatGridDateTime(date, placeholder = "--") {
  if (!date) return placeholder;
  const d = dayjs(date);
  return d.isValid() ? d.format(DATE_FORMATS.GRID_DATETIME) : placeholder;
}

/**
 * Format a date for View Modals / Details Dialogs (Default: DD MMMM YYYY, e.g. 30 September 2008).
 * @param {string | Date | dayjs.Dayjs} date
 * @param {string} [placeholder="--"]
 * @returns {string}
 */
export function formatViewDate(date, placeholder = "--") {
  if (!date) return placeholder;
  const d = dayjs(date);
  return d.isValid() ? d.format(DATE_FORMATS.VIEW_DATE) : placeholder;
}

/**
 * Format a date with time for View Modals / Details Dialogs (Default: DD MMMM YYYY, hh:mm A).
 * @param {string | Date | dayjs.Dayjs} date
 * @param {string} [placeholder="--"]
 * @returns {string}
 */
export function formatViewDateTime(date, placeholder = "--") {
  if (!date) return placeholder;
  const d = dayjs(date);
  return d.isValid() ? d.format(DATE_FORMATS.VIEW_DATETIME) : placeholder;
}

/**
 * Safely parse a date of birth (supports DD/MM/YYYY, ISO, and Dayjs)
 * @param {string | Date | dayjs.Dayjs} val
 * @returns {dayjs.Dayjs | null}
 */
export function parseMemberDob(val) {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split("/").map(Number);
      const parsed = dayjs(new Date(y, m - 1, d));
      if (parsed.isValid()) return parsed;
    }
    const parsed = dayjs(trimmed);
    if (parsed.isValid()) return parsed;
  }
  return null;
}
