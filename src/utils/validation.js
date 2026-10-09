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
    pattern: /^[0-9]*\.?[0-9]{0,2}$/,
    message: "Only numbers and decimal point (up to 2 decimal places) are allowed",
    sanitize: (val) => {
      let clean = String(val).replace(/[^0-9.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) {
        clean = parts[0] + "." + parts.slice(1).join("");
      }
      if (clean.includes(".")) {
        const [w, d] = clean.split(".");
        clean = w + "." + d.slice(0, 2);
      }
      if (clean.length > 10) {
        clean = clean.slice(0, 10);
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
  },
  username: {
    pattern: /^[A-Za-z][A-Za-z0-9._]{2,28}[A-Za-z0-9]$/,
    message: "Username can contain only letters, numbers, dot and underscore.",
    sanitize: (val) => val.replace(/[^A-Za-z0-9._]/g, "")
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

  // 2. Email format check
  if (email || config.type === "email") {
    const emailErr = validateEmail(strVal);
    if (emailErr) {
      return emailErr;
    }
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
    return "This field is required";
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
 * Comprehensive email validation ensuring standard email formatting,
 * no forbidden characters/patterns, valid domain structure, and max 250 characters.
 * @param {string} value The email address to validate.
 * @returns {string} Error message if invalid, or empty string if valid.
 */
export function validateEmail(value) {
  if (!value || !String(value).trim()) {
    return "";
  }
  const strVal = String(value).trim();

  // 1. Length constraint: maximum 250 characters
  if (strVal.length > 250) {
    return "Email cannot exceed 250 characters";
  }

  // 2. Spaces not allowed
  if (/\s/.test(strVal)) {
    return "Email cannot contain spaces";
  }

  // 3. Disallowed special characters: ", (, ), ,, :, ;, <, >, [, ], $, #, %, *
  const disallowedSpecialChars = /["(),:;<>[\\\]$#%*]/;
  if (disallowedSpecialChars.test(strVal)) {
    return "Email contains invalid special characters";
  }

  // 4. @ symbol checks
  const atParts = strVal.split("@");
  if (atParts.length === 1) {
    return "Email must contain an '@' symbol";
  }
  if (atParts.length > 2) {
    return "Email cannot contain multiple '@' symbols";
  }

  const [localPart, domainPart] = atParts;

  // 5. Local part (before @) checks
  if (!localPart) {
    return "Email is missing local part before '@'";
  }
  if (localPart.startsWith(".")) {
    return "Email cannot start with a dot";
  }
  if (localPart.endsWith(".")) {
    return "Email cannot end with a dot before '@'";
  }
  if (localPart.includes("..")) {
    return "Email cannot contain consecutive dots";
  }
  // Local part character allowance: letters, numbers, and standard safe punctuation . _ - +
  if (!/^[a-zA-Z0-9._+-]+$/.test(localPart)) {
    return "Email contains invalid characters";
  }

  // 6. Domain part (after @) checks
  if (!domainPart) {
    return "Email is missing domain after '@'";
  }
  if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
    return "Email domain cannot start or end with a dot";
  }
  if (domainPart.includes("..")) {
    return "Email domain cannot contain consecutive dots";
  }

  // Domain labels check
  const domainLabels = domainPart.split(".");
  if (domainLabels.length < 2) {
    return "Email domain must include a top-level domain (e.g., .com)";
  }

  // Check top-level domain (TLD) - last part after dot must be letters only and >= 2 chars
  const tld = domainLabels[domainLabels.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return "Email has an invalid top-level domain (e.g., .com, .org)";
  }

  // Check domain labels: letters, numbers, hyphens only. No underscores (exam_ple.com is invalid), no special chars
  for (const label of domainLabels) {
    if (!label) {
      return "Email domain format is invalid";
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return "Domain labels cannot start or end with a hyphen";
    }
    if (label.includes("_")) {
      return "Email domain cannot contain underscore ('_')";
    }
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return "Email domain contains invalid characters";
    }
  }

  // 7. Strict overall standard email regex check
  const strictEmailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!strictEmailRegex.test(strVal)) {
    return "Please enter a valid email address";
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

const COMMON_WEAK_PASSWORDS = new Set([
  "password@123",
  "12345678",
  "admin@123",
  "admin@1234",
  "password@1",
  "password123",
  "qwerty@123",
  "welcome@123",
  "p@ssword123",
  "p@ssw0rd123",
  "letmein@123",
  "pass@123",
]);

/**
 * Comprehensive username validation following application rules:
 * 1. Required: "Username is required."
 * 2. Minimum length 4: "Username must be at least 4 characters."
 * 3. Maximum length 30: "Username must not exceed 30 characters."
 * 4. Must start with a letter: "Username must start with a letter."
 * 5. Allowed characters: A-Z, a-z, 0-9, dot (.), underscore (_). "Username can contain only letters, numbers, dot and underscore."
 * 6. Spaces not allowed: "Username must not contain spaces."
 * 7. Must end with a letter or number: "Username must end with a letter or number."
 * 8. No consecutive special characters (.., __, ._, _.): "Username contains invalid consecutive special characters."
 * @param {string} value Raw username input.
 * @param {object} options Options including isRequired.
 * @returns {string} Error message or empty string if valid.
 */
export function validateUsername(value, options = {}) {
  const { isRequired = true } = options;

  if (value === undefined || value === null || String(value).trim() === "") {
    return isRequired ? "Username is required." : "";
  }

  const strVal = String(value).trim();

  // 1. Spaces not allowed anywhere
  if (/\s/.test(strVal)) {
    return "Username must not contain spaces.";
  }

  // 2. Minimum length: 4 characters
  if (strVal.length < 4) {
    return "Username must be at least 4 characters.";
  }

  // 3. Maximum length: 30 characters
  if (strVal.length > 30) {
    return "Username must not exceed 30 characters.";
  }

  // 4. Must start with a letter (A-Z, a-z)
  if (!/^[A-Za-z]/.test(strVal)) {
    return "Username must start with a letter.";
  }

  // 5. Allowed characters only: A-Z, a-z, 0-9, dot (.), underscore (_)
  if (/[^A-Za-z0-9._]/.test(strVal)) {
    return "Username can contain only letters, numbers, dot and underscore.";
  }

  // 6. Must end with a letter or number
  if (/[._]$/.test(strVal)) {
    return "Username must end with a letter or number.";
  }

  // 7. No consecutive special characters (.., __, ._, _.)
  if (/[._]{2,}/.test(strVal)) {
    return "Username contains invalid consecutive special characters.";
  }

  return "";
}

/**
 * Validates a password against comprehensive enterprise security requirements:
 * - Minimum 8 characters, maximum 64 characters
 * - At least 1 uppercase, 1 lowercase, 1 number, 1 special character
 * - No internal spaces (leading/trailing spaces trimmed)
 * - Cannot match username or email local-part
 * - Disallows common weak passwords
 * @param {string} rawPassword Raw input password.
 * @param {object} options Options including username, email, isRequired.
 * @returns {string} Validation error message or empty string if valid.
 */
export function validatePassword(rawPassword, options = {}) {
  const {
    username = "",
    email = "",
    isRequired = true,
  } = options;

  if (rawPassword === undefined || rawPassword === null || rawPassword === "") {
    return isRequired ? "Password is required." : "";
  }

  const trimmed = String(rawPassword).trim();
  if (!trimmed) {
    return isRequired ? "Password is required." : "";
  }

  // 1. Internal spaces
  if (/\s/.test(trimmed)) {
    return "Password must not contain spaces.";
  }

  // 2. Maximum length
  if (trimmed.length > 12) {
    return "Password must not exceed 12 characters.";
  }

  // 3. Minimum length
  if (trimmed.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  // 4. Uppercase letter
  if (!/[A-Z]/.test(trimmed)) {
    return "Include at least one uppercase letter.";
  }

  // 5. Lowercase letter
  if (!/[a-z]/.test(trimmed)) {
    return "Include at least one lowercase letter.";
  }

  // 6. Number
  if (!/[0-9]/.test(trimmed)) {
    return "Include at least one number.";
  }

  // 7. Special character
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return "Include at least one special character.";
  }

  // 8. Same as username
  if (username && String(username).trim()) {
    if (trimmed.toLowerCase() === String(username).trim().toLowerCase()) {
      return "Password must not be the same as the username.";
    }
  }

  // 9. Same as email local-part
  if (email && String(email).trim()) {
    const localPart = String(email).trim().split("@")[0].toLowerCase();
    if (localPart && trimmed.toLowerCase() === localPart) {
      return "Password must not be the same as the username.";
    }
  }

  // 10. Common weak passwords
  if (COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase())) {
    return "This password is too common or weak. Please choose a stronger password.";
  }

  return "";
}

/**
 * Validates confirm password against the password.
 * @param {string} rawConfirmPassword Raw confirm password input.
 * @param {string} rawPassword Raw password input.
 * @param {object} options Options including isRequired.
 * @returns {string} Error message or empty string.
 */
export function validateConfirmPassword(rawConfirmPassword, rawPassword, options = {}) {
  const { isRequired = true } = options;

  if (rawConfirmPassword === undefined || rawConfirmPassword === null || rawConfirmPassword === "") {
    return isRequired || (rawPassword && String(rawPassword).trim()) ? "Confirm password is required." : "";
  }

  const trimmedConfirm = String(rawConfirmPassword).trim();
  const trimmedPassword = String(rawPassword ?? "").trim();

  if (!trimmedConfirm) {
    return isRequired || trimmedPassword ? "Confirm password is required." : "";
  }

  if (trimmedConfirm !== trimmedPassword) {
    return "Password and confirm password do not match.";
  }

  return "";
}
