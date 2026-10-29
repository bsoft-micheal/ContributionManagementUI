/**
 * Settings Module Constants
 * Centralized configuration, storage keys, validation limits, and semantic defaults.
 */

export const SETTINGS_STORAGE_KEYS = Object.freeze({
  SYSTEM_SETTINGS: "cm_system_settings",
  EVENT_PAYMENT_QR: "cm_event_payment_qr_configs",
});

export const SETTINGS_VALIDATION_LIMITS = Object.freeze({
  ORG_NAME_MAX_LENGTH: 250,
  RECEIVER_NAME_MAX_LENGTH: 150,
  UPI_ID_MAX_LENGTH: 50,
  ACCOUNT_LABEL_MAX_LENGTH: 100,
  REMARKS_MAX_LENGTH: 150,
  MAX_QR_IMAGE_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  OTP_EXPIRY_MAX_LENGTH: 2,
  MAX_RETRY_MAX_LENGTH: 2,
  MAX_REMINDERS_MAX: 50,
  REMINDER_INTERVAL_MAX_LENGTH: 8,
});

export const SETTINGS_DEFAULTS = Object.freeze({
  REMINDER_INTERVAL_DAYS: "10",
  REMINDER_INTERVAL_VALUE: "10",
  REMINDER_INTERVAL_UNIT: "Days",
  MAX_REMINDERS: "3",
  OTP_EXPIRY: "10",
  MAX_RETRY: "3",
  PREVIEW_AMOUNT: 500,
  QR_MODE_GENERATED: "generated",
  QR_MODE_UPLOADED: "uploaded",
  FALLBACK_ORG_NAME: "Organization",
  FALLBACK_USER_NAME: "User",
  FALLBACK_CATEGORY_NAME: "Event",
});

