/**
 * Utility to determine whether any filter in a filter state object is active (non-default).
 * Used across the application to automatically enable/disable Clear Filter buttons.
 *
 * @param {Record<string, any>} filters - Filter state object (e.g. { year, month, eventType, ... })
 * @param {Record<string, any>} [defaultValues={}] - Optional map of baseline/default values for specific keys
 * @returns {boolean} - true if at least one filter has a non-default active selection, false otherwise.
 */
export function hasActiveFilters(filters, defaultValues = {}) {
  if (!filters || typeof filters !== "object") return false;

  return Object.entries(filters).some(([key, val]) => {
    // 1. Explicit baseline/default comparison if defined for this key
    if (defaultValues && Object.prototype.hasOwnProperty.call(defaultValues, key)) {
      const def = defaultValues[key];
      if (val === def) return false;
      if (typeof val === "string" && typeof def === "string") {
        return val.trim().toLowerCase() !== def.trim().toLowerCase();
      }
      return val !== def;
    }

    // 2. Null or undefined is considered empty / inactive
    if (val === null || val === undefined) return false;

    // 3. String values: empty string or "ALL" / "All ..." are inactive
    if (typeof val === "string") {
      const trimmed = val.trim().toLowerCase();
      if (!trimmed) return false;
      if (trimmed === "all" || trimmed.startsWith("all ")) return false;
      return true;
    }

    // 4. Numeric values: 0 is considered inactive ("All")
    if (typeof val === "number") {
      if (isNaN(val)) return false;
      return val !== 0;
    }

    // 5. Array values (multi-select): empty or containing only 0 / "ALL" is inactive
    if (Array.isArray(val)) {
      if (val.length === 0) return false;
      return val.some((item) => {
        if (item === null || item === undefined || item === 0) return false;
        if (typeof item === "string") {
          const t = item.trim().toLowerCase();
          return t !== "" && t !== "all" && !t.startsWith("all ");
        }
        return true;
      });
    }

    // 6. Boolean values: true is active
    if (typeof val === "boolean") {
      return val === true;
    }

    // 7. Dayjs or Date objects
    if (val && typeof val.isValid === "function") {
      return val.isValid();
    }
    if (val instanceof Date) {
      return !isNaN(val.getTime());
    }

    return Boolean(val);
  });
}
