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
  AUTH: {
    SIGN_IN_TITLE: "Sign In",
    SIGN_IN_SUBTITLE: "Enter your credentials to access the system.",
    USERNAME_OR_EMAIL_LABEL: "Username or Email Address",
    USERNAME_OR_EMAIL_PLACEHOLDER: "Enter Username or Email",
    PASSWORD_LABEL: "Password",
    PASSWORD_PLACEHOLDER: "Enter Password",
    FORGOT_PASSWORD: "Forgot Password ?",
    LOGIN_BUTTON: "LOGIN",
    WELCOME_TITLE: "Welcome to Contribution Management !!",
    WELCOME_SUBTITLE: "Log in to track social collections, manage event budgets, calculate allocations, and celebrate corporate milestones with full transparency."
  },
  DASHBOARD: {
    MONTH_LABEL: "Month",
    YEAR_LABEL: "Year",
    EVENT_TYPE_LABEL: "Event Type",
    EVENT_LABEL: "Event",
    ALL_EVENT_TYPES: "All Event Types",
    ALL_EVENTS: "All Events",
    FILTER_BUTTON: "Filter",
    CLEAR_FILTER_BUTTON: "Clear Filter",
    TOTAL_EXPECTED: "TOTAL EXPECTED",
    TOTAL_COLLECTIONS: "TOTAL COLLECTIONS",
    TOTAL_PENDING: "TOTAL PENDING",
    TOTAL_EXPENSES: "TOTAL EXPENSES",
    TOTAL_EVENTS: "TOTAL EVENTS",
    REMAINING_AMOUNT: "REMAINING AMOUNT",
  },
  EXPENSES: {
    EXPECTED_BUDGET: "Expected Budget",
    ALREADY_SPENT: "Already Spent",
    REMAINING_LIMIT: "Remaining Limit",
    NO_BUDGET_ALLOCATED: "No expected budget allocated for this event",
    AMOUNT_EXCEEDS_BUDGET: (remaining) => `Amount cannot exceed the remaining budget (₹${Number(remaining).toLocaleString()})`,
  },
  VALIDATION: {
    REQUIRED: "This field is required",
    REQUIRED_FIELD: "This field is required",
    USERNAME_OR_EMAIL_REQUIRED: "This field is required",
    PASSWORD_REQUIRED: "This field is required",
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
