/**
 * Regular expressions and validation rules for input sanitization and verification.
 */
export const VALIDATION_PATTERNS = {
  letteronly: {
    pattern: /^[A-Za-z\s]*$/,
    message: "Only letters and spaces are allowed",
    sanitize: (val) => val.replace(/[^A-Za-z\s]/g, "")
  },
  numberonly: {
    pattern: /^[0-9]*$/,
    message: "Only numbers are allowed",
    sanitize: (val) => val.replace(/[^0-9]/g, "")
  },
  decimalonly: {
    pattern: /^[0-9]*\.?[0-9]*$/,
    message: "Only numbers and decimal point are allowed",
    sanitize: (val) => {
      const clean = String(val).replace(/[^0-9.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) {
        return parts[0] + "." + parts.slice(1).join("");
      }
      return clean;
    }
  },
  letterandnumber: {
    pattern: /^[A-Za-z0-9\s]*$/,
    message: "Only letters, numbers, and spaces are allowed",
    sanitize: (val) => val.replace(/[^A-Za-z0-9\s]/g, "")
  },
  numberspecialcharacter: {
    pattern: /^[^A-Za-z]*$/,
    message: "Only numbers and special characters are allowed (no letters)",
    sanitize: (val) => val.replace(/[A-Za-z]/g, "")
  },
  letterspecialcharacteronly: {
    pattern: /^[^0-9]*$/,
    message: "Only letters and special characters are allowed (no numbers)",
    sanitize: (val) => val.replace(/[0-9]/g, "")
  },
  phone: {
    pattern: /^[0-9]*$/,
    message: "Only numbers are allowed",
    sanitize: (val) => val.replace(/[^0-9]/g, "")
  }
};

/**
 * Sanitizes input text in real-time based on the restriction type.
 * @param {string} value The raw input value.
 * @param {string} type One of the validation keys from VALIDATION_PATTERNS.
 * @returns {string} The filtered/sanitized value.
 */
export function sanitizeInput(value, type) {
  if (value === undefined || value === null) return "";
  const rule = VALIDATION_PATTERNS[type];
  if (rule && typeof rule.sanitize === "function") {
    return rule.sanitize(String(value));
  }
  return String(value);
}

/**
 * Validates a single field against a set of constraints.
 * @param {any} value The field value.
 * @param {object} config Configuration for validation.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateField(value, config = {}) {
  const {
    required = false,
    type,
    min,
    max,
    label,
    customValidate,
    email = false
  } = config;

  const displayLabel = label && label !== "This field is required" ? label : "Field";
  const strVal = String(value ?? "").trim();

  // 1. Required Check: when empty and required, return standard required message
  if (required && !strVal) {
    return config.requiredMessage || "This field is required";
  }

  if (!strVal) return ""; // Not required and empty: valid

  // 2. Email format check
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
    return "Please enter a valid email address";
  }

  // 2.1. Mobile format check (strictly 10 digits starting with 6–9)
  if (config.phone || config.indianMobile) {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(strVal)) {
      if (strVal.length !== 10) {
        return "Mobile number must be exactly 10 digits";
      }
      if (!/^[6-9]/.test(strVal)) {
        return "Mobile number must start with 6, 7, 8, or 9";
      }
      return "Enter a valid 10-digit mobile number starting with 6–9";
    }
  }

  // 3. Pattern / Character check
  if (type && VALIDATION_PATTERNS[type]) {
    const rule = VALIDATION_PATTERNS[type];
    if (!rule.pattern.test(strVal)) {
      return rule.message;
    }
  }

  // 4. Min/Max bounds check
  const isNumericValCheck = (type === "numberonly" || type === "decimalonly") && (
    min === 0 || 
    (max !== undefined && max > 100) || 
    /amount|price|fee|cost|contribution|value/i.test(displayLabel || "") ||
    config.isNumericValue === true
  );

  if (isNumericValCheck) {
    const numVal = parseFloat(strVal);
    if (min !== undefined && numVal < min) {
      return `${displayLabel} must be at least ${min}`;
    }
    if (max !== undefined && numVal > max) {
      return `${displayLabel} must be at most ${max}`;
    }
  } else {
    if (min !== undefined && strVal.length < min) {
      if (type === "numberonly" && min === max) {
        return `Must be exactly ${min} digits`;
      }
      return `${displayLabel} must be at least ${min} characters`;
    }
    if (max !== undefined && strVal.length > max) {
      if (type === "numberonly" && min === max) {
        return `Must be at most ${max} digits`;
      }
      return `${displayLabel} must be at most ${max} characters`;
    }
  }

  // 5. Custom validate function
  if (customValidate && typeof customValidate === "function") {
    return customValidate(value);
  }

  return "";
}

/**
 * Validates an Indian mobile number (strictly 10 digits starting with 6–9).
 * @param {string} value The mobile number string.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateIndianMobile(value) {
  if (!value || !String(value).trim()) {
    return "Mobile number is required";
  }
  const strVal = String(value).trim();
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(strVal)) {
    if (strVal.length !== 10) {
      return "Mobile number must be exactly 10 digits";
    }
    if (!/^[6-9]/.test(strVal)) {
      return "Mobile number must start with 6, 7, 8, or 9";
    }
    return "Enter a valid 10-digit mobile number starting with 6–9";
  }
  return "";
}

/**
 * Runs validation for a whole form object and returns an errors object.
 * @param {object} formData The form values.
 * @param {object} schema Map of field names to validateField configs.
 * @returns {object} Map of field names to error messages.
 */
export function validateForm(formData, schema = {}) {
  const errors = {};
  Object.keys(schema).forEach((key) => {
    const errorMsg = validateField(formData[key], schema[key]);
    if (errorMsg) {
      errors[key] = errorMsg;
    }
  });
  return errors;
}
