/**
 * UPI QR Helper Utility
 * Implements NPCI UPI deep-linking specifications, QR generation, validation,
 * and email reminder formatting.
 */

import { generateQrPngDataUrl, generateQrSvgDataUrl } from "./qrCodeGenerator";

export { generateQrPngDataUrl, generateQrSvgDataUrl };

// UPI ID validation regex (e.g. name@upi, user@okhdfcbank, etc.)
const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * Validates whether a given string is a valid UPI ID.
 * @param {string} upiId 
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateUpiId(upiId) {
  if (!upiId || typeof upiId !== "string" || !upiId.trim()) {
    return { isValid: false, error: "UPI ID is required." };
  }
  const trimmed = upiId.trim();
  if (!trimmed.includes("@")) {
    return { isValid: false, error: "UPI ID must contain '@' (e.g. user@bank)." };
  }
  if (!UPI_ID_REGEX.test(trimmed)) {
    return { isValid: false, error: "Invalid UPI ID format. Example: receiver@okicici or name@upi" };
  }
  return { isValid: true };
}

/**
 * Constructs a standard NPCI UPI payment deep-link URI.
 * Spec: upi://pay?pa={upiId}&pn={receiverName}&am={amount}&cu=INR&tn={note}
 * 
 * @param {Object} params
 * @param {string} params.upiId - Payee VPA / UPI ID
 * @param {string} params.receiverName - Payee Name
 * @param {number|string} [params.amount] - Payment amount in INR (optional)
 * @param {string} [params.note] - Transaction description/note
 * @returns {string} Standard UPI URI
 */
export function buildUpiPaymentUri({ upiId, receiverName, amount, note }) {
  if (!upiId) return "";
  const cleanUpi = upiId.trim();
  const cleanName = (receiverName || "Contribution Management").trim();

  const params = new URLSearchParams();
  params.set("pa", cleanUpi);
  params.set("pn", cleanName);
  params.set("cu", "INR");

  if (amount !== undefined && amount !== null && amount !== "" && Number(amount) > 0) {
    params.set("am", Number(amount).toFixed(2));
  }

  if (note && note.trim()) {
    params.set("tn", note.trim());
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Returns a high-res QR code image URL via standard QR API.
 * This URL can be safely embedded in emails, displayed in <img> tags, and downloaded.
 * 
 * @param {string} text - The UPI URI or text to encode
 * @param {number} [size=250] - Pixel size (width & height)
 * @returns {string} Image URL
 */
export function getQrCodeApiUrl(text, size = 250) {
  if (!text) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(text)}`;
}

/**
 * Generates an SVG string representation of a QR Code or fallback placeholder.
 * 
 * @param {string} text - Text to encode
 * @param {number} [size=200]
 * @returns {string} SVG Data URL
 */
export function getQrCodeSvgDataUri(text, size = 200) {
  if (!text) return "";
  return getQrCodeApiUrl(text, size);
}

export const EVENT_QR_STORAGE_KEY = "cm_event_payment_qr_configs";

/**
 * Normalizes an event type string for key matching.
 * E.g., "teamouting" -> "Teamouting", "team outing" -> "Team Outing"
 */
export function normalizeEventTypeName(name) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed;
}

/**
 * Retrieves all stored per-event-type payment QR configurations.
 * Does not hardcode values; returns dynamically saved records.
 * @returns {Record<string, { receiverName: string, upiId: string, qrMode: string, qrImage: string | null, previewAmount: string, isActive: boolean }>}
 */
export function getAllPaymentQrConfigs() {
  try {
    const raw = localStorage.getItem(EVENT_QR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {
    // Read event payment QR configs error ignored
  }
  return {};
}

/**
 * Saves a payment QR configuration strictly for a single event type.
 * Guarantees that saving one event type will not overwrite others.
 * 
 * @param {string} eventType 
 * @param {Object} config 
 * @returns {Record<string, Object>} All updated configurations
 */
export function savePaymentQrConfigForEventType(eventType, config) {
  const norm = normalizeEventTypeName(eventType);
  if (!norm) return getAllPaymentQrConfigs();

  const all = getAllPaymentQrConfigs();
  const existing = all[norm] || {};

  all[norm] = {
    ...existing,
    ...config,
    receiverName: (config.receiverName || "").trim(),
    upiId: (config.upiId || "").trim(),
    qrMode: config.qrMode || "generated",
    qrImage: config.qrImage || null,
    previewAmount: config.previewAmount || "100",
    isActive: config.isActive !== undefined ? config.isActive : true,
  };

  try {
    localStorage.setItem(EVENT_QR_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Save event payment QR configs error ignored
  }

  return all;
}

/**
 * Fetches the Payment QR configuration for a specific event type.
 * If not configured, returns an unconfigured object with isConfigured: false.
 * 
 * @param {string|Object} [eventTypeOrEvent] - Event Type name or event object
 * @returns {Object} Configured QR settings with isConfigured boolean flag
 */
export function getPaymentQrConfig(eventTypeOrEvent) {
  let eventType = "";
  if (typeof eventTypeOrEvent === "string") {
    eventType = eventTypeOrEvent;
  } else if (eventTypeOrEvent && typeof eventTypeOrEvent === "object") {
    eventType =
      eventTypeOrEvent.eventTypeName ||
      eventTypeOrEvent.eventType ||
      eventTypeOrEvent.categoryName ||
      eventTypeOrEvent.name ||
      "";
  }

  const norm = normalizeEventTypeName(eventType);
  const all = getAllPaymentQrConfigs();

  // Try direct match or case-insensitive match
  let matchedConfig = null;
  if (norm && all[norm]) {
    matchedConfig = all[norm];
  } else if (norm) {
    const key = Object.keys(all).find((k) => k.toLowerCase() === norm.toLowerCase());
    if (key) matchedConfig = all[key];
  }

  // If found and has a valid UPI ID
  if (matchedConfig && matchedConfig.upiId && matchedConfig.upiId.trim()) {
    const receiverName = matchedConfig.receiverName || "";
    const upiId = matchedConfig.upiId.trim();
    const qrMode = matchedConfig.qrMode || "generated";
    const qrImage = matchedConfig.qrImage || null;

    return {
      eventType: norm,
      receiverName,
      upiId,
      qrReceiverName: receiverName,
      qrUpiId: upiId,
      qrMode,
      qrImage,
      previewAmount: matchedConfig.previewAmount || "100",
      isActive: matchedConfig.isActive !== false,
      isConfigured: true,
      message: "",
    };
  }

  // If no per-event-type config exists, return clean unconfigured state (no hardcoded credentials)
  return {
    eventType: norm || "Event",
    receiverName: "",
    upiId: "",
    qrReceiverName: "",
    qrUpiId: "",
    qrMode: "generated",
    qrImage: null,
    previewAmount: "100",
    isActive: false,
    isConfigured: false,
    message: "Payment QR is not configured for this event type.",
  };
}

/**
 * Generates a dynamic QR Code image URL tailored for a specific member's contribution amount
 * and specific event type.
 * 
 * @param {Object} params
 * @param {number} params.amount - Member's outstanding amount
 * @param {string} [params.note] - Event / Contribution note
 * @param {Object} [params.customConfig] - Optional custom QR config override
 * @param {string|Object} [params.eventType] - Event type to resolve config for
 * @returns {{ upiUri: string, qrImageUrl: string, receiverName: string, upiId: string, amount: number, mode: string, isConfigured: boolean, message: string }}
 */
export function generateDynamicPaymentQr({ amount, note, customConfig, eventType }) {
  const config = customConfig || getPaymentQrConfig(eventType);
  const numAmount = Number(amount) || 0;
  const isConfigured = Boolean(config.isConfigured || (config.upiId && config.upiId.trim()) || (config.qrUpiId && config.qrUpiId.trim()));
  const effectiveUpiId = config.upiId || config.qrUpiId || "";
  const effectiveReceiver = config.receiverName || config.qrReceiverName || "";

  if (!isConfigured || !effectiveUpiId) {
    return {
      upiUri: "",
      qrImageUrl: "",
      receiverName: effectiveReceiver,
      upiId: effectiveUpiId,
      amount: numAmount,
      mode: config.qrMode || "generated",
      isConfigured: false,
      message: "Payment QR is not configured for this event type.",
    };
  }

  const upiUri = buildUpiPaymentUri({
    upiId: effectiveUpiId,
    receiverName: effectiveReceiver,
    amount: numAmount,
    note: note || "Contribution Due",
  });

  const isUploadedMode = config.qrMode === "uploaded" && config.qrImage;
  const qrImageUrl = isUploadedMode
    ? config.qrImage
    : getQrCodeApiUrl(upiUri, 300);

  return {
    upiUri,
    qrImageUrl,
    receiverName: effectiveReceiver,
    upiId: effectiveUpiId,
    amount: numAmount,
    mode: isUploadedMode ? "uploaded" : "generated",
    isConfigured: true,
    message: "",
  };
}

/**
 * Generates an HTML email body for a member payment reminder with dynamic QR code embedded.
 * 
 * @param {Object} params
 * @param {string} params.memberName
 * @param {string} params.eventName
 * @param {number} params.amount
 * @param {string} params.dueDate
 * @param {string} params.upiId
 * @param {string} params.receiverName
 * @param {string} params.qrImageUrl
 * @returns {string} HTML email string
 */
export function buildPaymentReminderEmailHtml({
  memberName,
  categoryName,
  eventName,
  amount,
  dueDate,
  upiId,
  receiverName,
  qrImageUrl,
  customSubject,
  customBody,
  orgName = "Unit 1A Residents Association",
}) {
  const effectiveCategory = categoryName || eventName || "Contribution";
  const formattedAmount = `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  const upiUri = buildUpiPaymentUri({
    upiId,
    receiverName,
    amount,
    note: `Contribution for ${effectiveCategory}`,
  });

  const title = customSubject || `Contribution Payment Reminder - ${effectiveCategory}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e1a2e 0%, #4a3f6b 100%); padding: 24px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">${title}</h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">${orgName}</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px 24px;">
      ${customBody
      ? `<div style="font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-line; margin-bottom: 20px;">${customBody}</div>`
      : `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5;">Dear <strong>${memberName || "Member"}</strong>,</p>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        This is a friendly reminder regarding your pending contribution for <strong>${effectiveCategory}</strong>.
      </p>`
    }

      <!-- Amount Highlight Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Outstanding Amount</span>
        <span style="font-size: 28px; font-weight: 800; color: #0284c7;">${formattedAmount}</span>
        ${dueDate ? `<span style="font-size: 12px; color: #dc2626; display: block; margin-top: 4px;">Due Date: ${dueDate}</span>` : ""}
      </div>

      <!-- QR Code Section -->
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #334155;">Scan QR to Pay via Any UPI App (GPay / PhonePe / Paytm):</p>
        <div style="display: inline-block; padding: 12px; background: #ffffff; border: 2px solid #0284c7; border-radius: 12px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);">
          <img src="${qrImageUrl}" alt="Payment QR Code" width="180" height="180" style="display: block; margin: 0 auto;" />
        </div>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">Amount is pre-filled automatically when scanned.</p>
      </div>

      <!-- Payment Details Breakdown -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; background: #fdfdfd; border: 1px solid #f1f5f9; border-radius: 8px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Receiver Name</td>
          <td style="padding: 10px 12px; color: #1e293b; font-weight: 700; text-align: right;">${receiverName || "Daniel A"}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">UPI ID</td>
          <td style="padding: 10px 12px; color: #0284c7; font-weight: 700; text-align: right;">${upiId}</td>
        </tr>
      </table>

      <!-- Pay Button Link -->
      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${upiUri}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
          Pay ${formattedAmount} via UPI
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
      Please reply to this email or contact the association admin if you have already completed the payment.
    </div>
  </div>
</body>
</html>
  `.trim();
}
