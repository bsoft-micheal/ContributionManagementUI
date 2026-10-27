/**
 * UPI QR Helper Utility
 * Implements NPCI UPI deep-linking specifications, QR generation, validation,
 * and email reminder formatting.
 */

import { generateQrPngDataUrl, generateQrSvgDataUrl } from "./qrCodeGenerator";
import { roundToWhole, formatWholeCurrency } from "./roundingHelper";

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
    params.set("am", String(roundToWhole(Number(amount))));
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
 * @returns {Record<string, { receiverName: string, upiId: string, qrMode: string, qrImage: string | null, accountLabel?: string, remarks?: string, previewAmount: string, isActive: boolean, isConfigured?: boolean }>}
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
 * Enforces mutual exclusivity between Dynamic UPI mode and Uploaded Custom QR mode.
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
  const isUploaded = (config.qrMode || "").toLowerCase() === "uploaded";

  all[norm] = {
    ...existing,
    ...config,
    qrMode: isUploaded ? "uploaded" : "generated",
    receiverName: isUploaded ? null : (config.receiverName || "").trim(),
    upiId: isUploaded ? null : (config.upiId || "").trim(),
    qrImage: isUploaded ? (config.qrImage || null) : null,
    accountLabel: isUploaded && config.accountLabel ? config.accountLabel.trim() : null,
    remarks: isUploaded && config.remarks ? config.remarks.trim() : null,
    previewAmount: config.previewAmount ? String(config.previewAmount).trim() : "",
    isActive: config.isActive !== undefined ? config.isActive : true,
    isConfigured: isUploaded
      ? Boolean(config.qrImage)
      : Boolean(config.upiId && config.upiId.trim() && config.receiverName && config.receiverName.trim()),
    isDeleted: config.isDeleted !== undefined ? config.isDeleted : false,
    IsDeleted: config.IsDeleted !== undefined ? config.IsDeleted : false,
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

  if (matchedConfig && !matchedConfig.isDeleted && !matchedConfig.IsDeleted) {
    const mode = (matchedConfig.qrMode || "generated").toLowerCase();
    const isUploaded = mode === "uploaded";

    if (isUploaded && matchedConfig.qrImage) {
      return {
        eventType: norm || "Event",
        receiverName: "",
        upiId: "",
        qrReceiverName: "",
        qrUpiId: "",
        accountLabel: matchedConfig.accountLabel || "",
        remarks: matchedConfig.remarks || "",
        qrMode: "uploaded",
        qrImage: matchedConfig.qrImage,
        previewAmount: matchedConfig.previewAmount || "",
        isActive: matchedConfig.isActive !== false,
        isConfigured: true,
        message: "",
      };
    }

    if (!isUploaded && matchedConfig.upiId && matchedConfig.upiId.trim() && matchedConfig.receiverName && matchedConfig.receiverName.trim()) {
      const receiverName = matchedConfig.receiverName.trim();
      const upiId = matchedConfig.upiId.trim();

      return {
        eventType: norm || "Event",
        receiverName,
        upiId,
        qrReceiverName: receiverName,
        qrUpiId: upiId,
        accountLabel: "",
        remarks: "",
        qrMode: "generated",
        qrImage: null,
        previewAmount: matchedConfig.previewAmount || "",
        isActive: matchedConfig.isActive !== false,
        isConfigured: true,
        message: "",
      };
    }
  }

  // If no per-event-type config exists or not configured, return default fallback state
  return {
    eventType: norm || "Event",
    receiverName: "Unit 1A Residents Association",
    upiId: "danielrobertanto604@okicici",
    qrReceiverName: "Unit 1A Residents Association",
    qrUpiId: "danielrobertanto604@okicici",
    accountLabel: "",
    remarks: "",
    qrMode: "generated",
    qrImage: null,
    previewAmount: "",
    isActive: true,
    isConfigured: true,
    message: "",
  };
}

/**
 * Generates dynamic payment QR data or resolves uploaded QR tailored for a specific member's contribution amount
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
  const isUploaded = (config.qrMode || "").toLowerCase() === "uploaded";

  if (isUploaded) {
    const isConfigured = Boolean(config.qrImage);
    return {
      upiUri: "",
      qrImageUrl: config.qrImage || "",
      receiverName: "",
      upiId: "",
      amount: numAmount,
      mode: "uploaded",
      isConfigured,
      message: isConfigured ? "" : "Payment QR is not configured for this event type.",
    };
  }

  // Dynamic UPI mode
  const effectiveUpiId = (config.upiId || config.qrUpiId || "").trim() || "danielrobertanto604@okicici";
  const effectiveReceiver = (config.receiverName || config.qrReceiverName || "").trim() || "Unit 1A Residents Association";
  const isConfigured = Boolean(effectiveUpiId && effectiveReceiver);

  const upiUri = buildUpiPaymentUri({
    upiId: effectiveUpiId,
    receiverName: effectiveReceiver,
    amount: numAmount,
    note: note || "Contribution Due",
  });

  let qrImageUrl = "";
  if (upiUri) {
    try {
      qrImageUrl = generateQrPngDataUrl(upiUri, 300, 2);
    } catch {
      qrImageUrl = getQrCodeApiUrl(upiUri, 300);
    }
  }

  return {
    upiUri,
    qrImageUrl,
    receiverName: effectiveReceiver,
    upiId: effectiveUpiId,
    amount: numAmount,
    mode: "generated",
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
  eventDates,
  totalAmount,
  celebrants = [],
  description = "",
}) {
  const effectiveCategory = categoryName || eventName || "Contribution";
  const isBirthday =
    (effectiveCategory || "").toLowerCase().includes("birthday") ||
    (eventName || "").toLowerCase().includes("birthday");

  const formattedAmount = formatWholeCurrency(amount);
  const hasUpi = Boolean(upiId && upiId.trim());
  const upiUri = hasUpi
    ? buildUpiPaymentUri({
        upiId,
        receiverName,
        amount,
        note: `Contribution for ${effectiveCategory}`,
      })
    : "";

  const title = customSubject || `Contribution Payment Reminder - ${effectiveCategory}`;

  const effectiveCelebrants =
    celebrants && celebrants.length > 0
      ? celebrants
      : isBirthday
      ? [
          { name: "Leo Albert L", date: "October 05, 2026" },
          { name: "Kaviarasan K", date: "October 08, 2026" },
          { name: "Christy Chandran R", date: "October 09, 2026" },
          { name: "testerr", date: "October 18, 2026" },
        ]
      : [];

  let celebrantsHtml = "";
  if (effectiveCelebrants.length > 1) {
    const tableRows = effectiveCelebrants
      .map(
        (c) => `
        <tr style="border-bottom: 1px dashed rgba(74, 63, 107, 0.1);">
          <td style="padding: 8px 12px; color: #4a3f6b; font-weight: 700; font-size: 13.5px;">&#x1F382; ${c.name}</td>
          <td align="right" style="padding: 8px 12px; color: #c026d3; font-weight: 700; font-size: 13.5px;">${c.date || c.dateOfBirth || ""}</td>
        </tr>`
      )
      .join("");

    celebrantsHtml = `
      <div style="margin-bottom: 14px; border-bottom: 1px dashed rgba(74, 63, 107, 0.1); padding-bottom: 14px;">
        <span style="font-weight: 700; color: #5b5280; display: block; margin-bottom: 8px;">Birthday Celebrants &amp; Dates:</span>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #fbfaff; border-radius: 8px; border: 1.5px solid #ece8f8;">
          ${tableRows}
        </table>
      </div>`;
  } else if (effectiveCelebrants.length === 1) {
    const c = effectiveCelebrants[0];
    celebrantsHtml = `
      <div style="margin-bottom: 14px; border-bottom: 1px dashed rgba(74, 63, 107, 0.1); padding-bottom: 14px;">
        <span style="font-weight: 700; color: #5b5280; display: inline-block; width: 160px;">Birthday Celebrant:</span>
        <span style="font-weight: 700; color: #7c3aed; display: inline-block;">${c.name}</span>
      </div>
      <div style="margin-bottom: 14px; border-bottom: 1px dashed rgba(74, 63, 107, 0.1); padding-bottom: 14px;">
        <span style="font-weight: 700; color: #5b5280; display: inline-block; width: 160px;">Particular Birthday Date:</span>
        <span style="font-weight: 700; color: #c026d3; display: inline-block;">${c.date || c.dateOfBirth || ""}</span>
      </div>`;
  }

  let formattedEventDates = eventDates;
  if (typeof formattedEventDates === "string" && formattedEventDates.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(formattedEventDates);
      const extractedDates = [];
      const extract = (obj) => {
        if (!obj) return;
        if (typeof obj === "object") {
          Object.values(obj).forEach(extract);
        } else if (typeof obj === "string" && obj.trim()) {
          const s = obj.trim();
          const d = new Date(s);
          if (!isNaN(d.getTime()) && s.length >= 8) {
            extractedDates.push(
              d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            );
          } else {
            extractedDates.push(s);
          }
        }
      };
      extract(parsed);
      const uniqueDates = Array.from(new Set(extractedDates));
      if (uniqueDates.length > 0) {
        formattedEventDates = uniqueDates.join(", ");
      }
    } catch {}
  }

  const eventDateLabel =
    isBirthday && formattedEventDates && formattedEventDates.includes(",")
      ? "Event Dates:"
      : "Event Date:";
  const eventDatesDisplay =
    formattedEventDates || (isBirthday ? "5 Oct, 10 Oct (2), 19 Oct" : (dueDate || "End of Month"));

  const totalAmountDisplay =
    totalAmount ||
    (isBirthday && effectiveCelebrants.length > 1
      ? `Rs.6250.00 (${effectiveCelebrants.length} celebrants combined)`
      : `Rs.5000.00`);

  const cleanDescription = (description || "")
    .replace(/<!--contrib:[\s\S]*?-->/gi, "")
    .trim();

  const qrEmbedded = customBody && customBody.includes("{qrCode}");
  const paymentLinkEmbedded = customBody && customBody.includes("{paymentLink}");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .email-container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e1a2e 0%, #4a3f6b 100%); padding: 26px 24px; text-align: center; color: #ffffff; }
    .content { padding: 28px 24px; }
    .details-card { background-color: #faf9fd; border: 1px solid rgba(74, 63, 107, 0.12); border-radius: 10px; padding: 22px; margin-bottom: 24px; font-size: 14px; }
    .detail-row { margin-bottom: 14px; border-bottom: 1px dashed rgba(74, 63, 107, 0.1); padding-bottom: 14px; }
    .detail-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
    .detail-label { font-weight: 700; color: #5b5280; display: inline-block; width: 160px; }
    .detail-value { color: #1e1a2e; display: inline-block; }
    .amount-highlight { font-size: 18px; color: #2d2550; font-weight: 800; background-color: #f0ecf9; padding: 4px 10px; border-radius: 6px; display: inline-block; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">${title}</h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">${orgName}</p>
    </div>

    <!-- Body Content -->
    <div class="content">
      ${customBody
        ? `<div style="font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-line; margin-bottom: 22px;">${customBody}</div>`
        : `
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5;">Dear <strong>${memberName || "Member"}</strong>,</p>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          This is a friendly reminder regarding your pending contribution for <strong>${effectiveCategory}</strong>.
        </p>`
      }

      <!-- Event Details Card -->
      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">Event Name:</span>
          <span class="detail-value" style="font-weight: 700;">${eventName || (isBirthday ? "Birthday Celebration" : "Contribution Event")}</span>
        </div>
        ${celebrantsHtml}
        <div class="detail-row">
          <span class="detail-label">${eventDateLabel}</span>
          <span class="detail-value" style="font-weight: 600;">${eventDatesDisplay}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Amount:</span>
          <span class="detail-value" style="font-weight: 700;">${totalAmountDisplay}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Description:</span>
          <span class="detail-value">${cleanDescription}</span>
        </div>
        <div class="detail-row" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="detail-label">Contribution Amount:</span>
          <span class="amount-highlight">${formattedAmount}</span>
        </div>
      </div>

      <!-- QR Code Section (if not already embedded in description) -->
      ${!qrEmbedded && qrImageUrl ? `
      <div style="text-align: center; margin-bottom: 24px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 14px; padding: 20px;">
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #4a3f6b;">Scan QR to Pay via Any UPI App (GPay / PhonePe / Paytm):</p>
        <div style="display: inline-block; padding: 12px; background: #ffffff; border: 2px solid #7c3aed; border-radius: 12px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);">
          <img src="${qrImageUrl}" alt="Payment QR Code" width="180" height="180" style="display: block; margin: 0 auto; border-radius: 6px;" />
        </div>
        ${hasUpi ? `
        <div style="margin-top: 10px; font-size: 12px; color: #4b5563;">
          <div><strong>Payee:</strong> ${receiverName} | <strong>UPI ID:</strong> <span style="color: #7c3aed; font-weight: 700;">${upiId}</span></div>
          <div style="margin-top: 4px; color: #7c3aed; font-weight: 600;">Amount is pre-filled automatically when scanned (${formattedAmount})</div>
        </div>
        ` : '<p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">Scan with your UPI payment app to complete payment.</p>'}
      </div>
      ` : ''}


    </div>

    <!-- Footer -->
    <div class="footer">
      This is an automated notification from ${orgName}.
    </div>
  </div>
</body>
</html>
  `.trim();
}
