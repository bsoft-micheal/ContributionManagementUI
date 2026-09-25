// Centralized Common UI Strings and Text Constants

export const COMMON_STRINGS = {
  ACTIONS: {
    ADD: "Add",
    EDIT: "Edit",
    DELETE: "Delete",
    SAVE: "Save",
    CANCEL: "Cancel",
    CONFIRM: "Confirm",
    OK: "OK",
    SEARCH: "Search",
    FILTER: "Filter",
    RESET: "Reset",
    EXPORT: "Export",
    IMPORT: "Import",
    CLOSE: "Close",
    VIEW: "View",
    SUBMIT: "Submit",
    REFRESH: "Refresh",
    ACTIVATE: "Activate",
    DEACTIVATE: "Deactivate",
    VERIFY: "Verify",
    APPROVE: "Approve",
    REJECT: "Reject",
    DOWNLOAD: "Download"
  },
  DIALOGS: {
    CONFIRM_TITLE: "Confirm",
    DELETE_CONFIRM_MSG: "Are you sure you want to delete?",
    DELETE_CONFIRM: "Are you sure you want to delete?",
    STATUS_CONFIRM_MSG: (action, item = "record") => `Are you sure you want to ${action} this ${item}?`,
    UNSAVED_CHANGES: "You have unsaved changes. Are you sure you want to leave?",
    EXIT_CONFIRM: "Are you sure you want to proceed with this action?"
  },
  VALIDATION: {
    REQUIRED_FIELD: "This field is required",
    INVALID_EMAIL: "Please enter a valid email address",
    INVALID_PHONE: "Please enter a valid phone number",
    INVALID_NUMBER: "Please enter a valid number",
    MAX_AMOUNT_EXCEEDED: (max = "1,000,000") => `Amount cannot exceed ${max}`,
    MIN_LENGTH: (len) => `Must be at least ${len} characters`,
    MAX_LENGTH: (len) => `Cannot exceed ${len} characters`,
    PASSWORD_MISMATCH: "Passwords do not match"
  },
  TABLE: {
    NO_DATA: "No records found",
    LOADING: "Loading data...",
    ACTION_COL: "Action",
    CREATED_BY_COL: "Created By",
    CREATED_ON_COL: "Created On",
    MODIFIED_BY_COL: "Modified By",
    MODIFIED_ON_COL: "Modified On",
    STATUS_COL: "Status",
    ACTIVE: "Active",
    INACTIVE: "Inactive"
  },
  DEFAULTS: {
    EMPTY_VALUE: "--",
    SELECT_ALL: "All",
    SELECT_OPTION: "Select an option"
  }
};

COMMON_STRINGS.DIALOG = COMMON_STRINGS.DIALOGS;

export default COMMON_STRINGS;
