// Centralized Toast Messages for Frontend Application

export const TOAST_MESSAGES = {
  GENERAL: {
    SAVED_SUCCESS: "Saved successfully",
    CREATED_SUCCESS: "Created successfully",
    UPDATED_SUCCESS: "Updated successfully",
    DELETED_SUCCESS: "Deleted successfully",
    STATUS_UPDATED_SUCCESS: "Status updated successfully",
    OPERATION_SUCCESS: "Operation completed successfully",
    SAVE_FAILED: "Failed to save",
    DELETE_FAILED: "Failed to delete",
    UPDATE_FAILED: "Failed to update",
    FETCH_FAILED: "Failed to load data",
    STATUS_UPDATE_FAILED: "Failed to update status",
    REQUIRED_FIELDS: "Please fill all the required fields",
    INVALID_FORM: "Please correct the errors in the form",
    UNAUTHORIZED: "You are not authorized to perform this action",
    SERVER_ERROR: "An unexpected error occurred. Please try again later.",
    NETWORK_ERROR: "Network error. Please check your connection."
  },
  AUTH: {
    LOGIN_SUCCESS: "Login successful",
    LOGIN_FAILED: "Invalid email or password",
    LOGOUT_SUCCESS: "Logged out successfully",
    SESSION_EXPIRED: "Session expired. Please log in again.",
    PASSWORD_RESET_SUCCESS: "Password has been reset successfully",
    PASSWORD_RESET_FAILED: "Failed to reset password",
    OTP_SENT: "OTP has been sent to your email",
    OTP_VERIFIED: "OTP verified successfully",
    OTP_INVALID: "Invalid or expired OTP",
    TWO_FACTOR_REQUIRED: "Two-factor authentication required",
    TWO_FACTOR_SUCCESS: "Two-factor authentication verified successfully",
    PROFILE_UPDATED: "Profile updated successfully"
  },
  MEMBERS: {
    SAVED_SUCCESS: "Member saved successfully",
    CREATED_SUCCESS: "Member created successfully",
    UPDATED_SUCCESS: "Member updated successfully",
    DELETED_SUCCESS: "Member deleted successfully",
    STATUS_UPDATED: "Member status updated successfully",
    EMAIL_EXISTS: "Member with this email already exists",
    IMPORT_SUCCESS: "Members imported successfully",
    IMPORT_FAILED: "Failed to import members",
    EXIT_PROCESS_SUCCESS: "Member exit processed successfully"
  },
  ROLES: {
    SAVED_SUCCESS: "Role saved successfully",
    CREATED_SUCCESS: "Role created successfully",
    UPDATED_SUCCESS: "Role updated successfully",
    DELETED_SUCCESS: "Role deleted successfully",
    NAME_EXISTS: "Role name already exists"
  },
  EVENT_TYPES: {
    SAVED_SUCCESS: "Saved successfully",
    CREATED_SUCCESS: "Category created successfully",
    UPDATED_SUCCESS: "Category updated successfully",
    DELETED_SUCCESS: "Deleted successfully",
    STATUS_UPDATED: "Category status updated successfully",
    STATUS_UPDATE_FAILED: "Failed to update status"
  },
  EVENTS: {
    SAVED_SUCCESS: "Event saved successfully",
    CREATED_SUCCESS: "Event created successfully",
    UPDATED_SUCCESS: "Event updated successfully",
    DELETED_SUCCESS: "Event deleted successfully",
    STATUS_UPDATED: "Event status updated successfully",
    PARTICIPANTS_UPDATED: "Participants updated successfully"
  },
  CONTRIBUTIONS: {
    SAVED_SUCCESS: "Contribution saved successfully",
    UPDATED_SUCCESS: "Contribution updated successfully",
    DELETED_SUCCESS: "Contribution deleted successfully",
    STATUS_UPDATED: "Payment status updated successfully",
    RECEIPT_DOWNLOADED: "Receipt downloaded successfully"
  },
  EXPENSES: {
    SAVED_SUCCESS: "Expense saved successfully",
    CREATED_SUCCESS: "Expense created successfully",
    UPDATED_SUCCESS: "Expense updated successfully",
    DELETED_SUCCESS: "Expense deleted successfully",
    STATUS_UPDATED: "Expense status updated successfully",
    APPROVED_SUCCESS: "Expense approved successfully",
    REJECTED_SUCCESS: "Expense rejected successfully",
    RECEIPT_UPLOADED: "Receipt uploaded successfully"
  },
  PAYMENTS: {
    SAVED_SUCCESS: "Payment transaction saved successfully",
    VERIFIED_SUCCESS: "Payment verified successfully",
    REJECTED_SUCCESS: "Payment rejected successfully",
    DELETED_SUCCESS: "Payment record deleted successfully"
  },
  SUPPORT: {
    SAVED_SUCCESS: "Support ticket saved successfully",
    CREATED_SUCCESS: "Support ticket created successfully",
    UPDATED_SUCCESS: "Support ticket updated successfully",
    DELETED_SUCCESS: "Support ticket deleted successfully",
    STATUS_UPDATED: "Ticket status updated successfully",
    RESOLVED_SUCCESS: "Ticket marked as resolved successfully"
  },
  SETTINGS: {
    SAVED_SUCCESS: "Settings saved successfully",
    UPDATED_SUCCESS: "Settings updated successfully",
    RESET_SUCCESS: "Settings reset to defaults"
  },
  GALLERY: {
    SAVED_SUCCESS: "Photo uploaded successfully",
    UPDATED_SUCCESS: "Photo details updated successfully",
    DELETED_SUCCESS: "Photo deleted successfully"
  },
  BUDGET: {
    SAVED_SUCCESS: "Budget calculation saved successfully",
    UPDATED_SUCCESS: "Budget calculation updated successfully",
    DELETED_SUCCESS: "Budget calculation deleted successfully"
  }
};

export default TOAST_MESSAGES;
