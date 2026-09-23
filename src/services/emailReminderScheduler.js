import dayjs from "dayjs";
import {
  getPaymentQrConfig,
  generateDynamicPaymentQr,
  buildUpiPaymentUri,
  getQrCodeApiUrl,
} from "../utils/upiQrHelper";
import { SendPaymentReminder } from "./contributionService";
import { GetContributionsAsync } from "./contributionService";
import { GetEventsAsync } from "./eventService";
import { GetMembersAsync } from "./memberService";
import { GetEventTypesAsync } from "./eventTypeService";

// LocalStorage keys
export const EMAIL_LOGS_STORAGE_KEY = "cm_email_reminder_logs";
export const SETTINGS_STORAGE_KEY = "cm_system_settings";

/**
 * Standard default templates per category
 */
export const DEFAULT_CATEGORY_TEMPLATES = {
  all: {
    initialSubject: "Contribution Notice - {categoryName}",
    initialDescription:
      "Dear {memberName},\n\nThis is a notification regarding your contribution for {categoryName} of {amount}, due by {dueDate}.\n\nPlease scan the attached dynamic UPI QR code or click the payment link to pay:\n{paymentLink}\n\n{qrCode}\n\nThank you,\n{orgName}",
    reminderSubject: "Payment Reminder: Pending Contribution for {categoryName}",
    reminderDescription:
      "Dear {memberName},\n\nThis is a friendly reminder that your contribution of {amount} for {categoryName} is still pending.\nDue Date: {dueDate}\n\nPlease complete your payment at your earliest convenience using UPI:\n{paymentLink}\n\n{qrCode}\n\nThank you,\n{orgName}",
  },
  birthday: {
    initialSubject: "Birthday Celebration Contribution - {categoryName}",
    initialDescription:
      "Dear {memberName},\n\nWe have upcoming birthdays this month in our team! Your planned contribution for {categoryName} is {amount}, due by {dueDate}.\n\nPlease scan the dynamic UPI QR code below or tap the payment link to contribute:\n{paymentLink}\n\n{qrCode}\n\nWarm regards,\n{orgName}",
    reminderSubject: "Gentle Reminder: Birthday Contribution Pending ({categoryName})",
    reminderDescription:
      "Dear {memberName},\n\nJust a quick follow-up regarding your pending birthday contribution of {amount} for {categoryName}.\nDue Date: {dueDate}\n\nPlease scan the QR code below or use the payment link:\n{paymentLink}\n\n{qrCode}\n\nThank you for celebrating our colleagues with us!\n{orgName}",
  },
  "team dinner": {
    initialSubject: "Team Dinner Contribution - {categoryName}",
    initialDescription:
      "Dear {memberName},\n\nWe are looking forward to our upcoming Team Dinner! Your contribution amount is {amount}, due on or before {dueDate}.\n\nPlease use the payment link or scan the dynamic UPI QR code:\n{paymentLink}\n\n{qrCode}\n\nBest regards,\n{orgName}",
    reminderSubject: "Reminder: Team Dinner Contribution ({categoryName})",
    reminderDescription:
      "Dear {memberName},\n\nThis is a reminder that your Team Dinner contribution of {amount} is currently pending.\nDue Date: {dueDate}\n\nPlease settle this via UPI so we can finalize bookings:\n{paymentLink}\n\n{qrCode}\n\nThank you,\n{orgName}",
  },
  farewell: {
    initialSubject: "Farewell Gathering Contribution - {categoryName}",
    initialDescription:
      "Dear {memberName},\n\nWe are organizing a farewell gathering for our colleagues. Your contribution for {categoryName} is {amount}, due by {dueDate}.\n\nPay via UPI link or scan the QR code:\n{paymentLink}\n\n{qrCode}\n\nWarm regards,\n{orgName}",
    reminderSubject: "Reminder: Farewell Contribution Pending ({categoryName})",
    reminderDescription:
      "Dear {memberName},\n\nThis is a quick reminder regarding your pending farewell contribution of {amount}.\nDue Date: {dueDate}\n\nPlease scan the dynamic UPI QR code or use the payment link:\n{paymentLink}\n\n{qrCode}\n\nThank you,\n{orgName}",
  },
};

/**
 * Reads configured category templates from system settings.
 */
export function getCategoryTemplates() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.categoryTemplates && typeof parsed.categoryTemplates === "object") {
        return {
          all: { ...DEFAULT_CATEGORY_TEMPLATES.all, ...parsed.categoryTemplates.all },
          ...parsed.categoryTemplates,
        };
      }
    }
  } catch (e) {
    console.warn("Could not read categoryTemplates from settings:", e);
  }
  return { ...DEFAULT_CATEGORY_TEMPLATES };
}

/**
 * Resolves a template (Initial or Reminder) for a given Category ID or Name.
 * Falls back to "all" (Default) if specific category is not found.
 */
export function resolveCategoryTemplate(categoryId, categoryName, templateType = "initial") {
  const templates = getCategoryTemplates();
  const key = String(categoryId || "").toLowerCase().trim();
  const nameKey = String(categoryName || "").toLowerCase().trim();

  // Try finding by ID
  let match = templates[key] || templates[nameKey];

  // Try loose match by category name (e.g. "birthday", "dinner", "farewell")
  if (!match) {
    if (nameKey.includes("birthday")) match = templates["birthday"];
    else if (nameKey.includes("dinner")) match = templates["team dinner"];
    else if (nameKey.includes("farewell")) match = templates["farewell"];
  }

  // Fallback to "all" default
  const effective = match || templates.all || DEFAULT_CATEGORY_TEMPLATES.all;

  if (templateType === "reminder") {
    return {
      subject: effective.reminderSubject || DEFAULT_CATEGORY_TEMPLATES.all.reminderSubject,
      description: effective.reminderDescription || DEFAULT_CATEGORY_TEMPLATES.all.reminderDescription,
    };
  }

  return {
    subject: effective.initialSubject || DEFAULT_CATEGORY_TEMPLATES.all.initialSubject,
    description: effective.initialDescription || DEFAULT_CATEGORY_TEMPLATES.all.initialDescription,
  };
}

/**
 * Replaces all 7 supported dynamic placeholders:
 * {memberName}, {categoryName}, {amount}, {dueDate}, {orgName}, {paymentLink}, {qrCode}
 */
export function interpolatePlaceholders(text, data = {}) {
  if (!text) return "";
  const {
    memberName = "Member",
    categoryName = "Event Category",
    amount = 0,
    dueDate = "",
    orgName = "Unit 1A Residents Association",
    paymentLink = "",
    qrImageUrl = "",
  } = data;

  const formattedAmount = typeof amount === "number" ? `₹${amount.toLocaleString("en-IN")}` : `₹${amount}`;
  const effectiveDueDate = dueDate ? (dayjs(dueDate).isValid() ? dayjs(dueDate).format("DD/MM/YYYY") : dueDate) : "End of Month";

  const qrHtmlTag = qrImageUrl
    ? `<img src="${qrImageUrl}" alt="UPI Payment QR Code" width="220" height="220" style="display:block;margin:12px auto;border-radius:10px;border:1px solid #e2e8f0;" />`
    : "";

  return text
    .replace(/\{memberName\}/g, memberName)
    .replace(/\{categoryName\}/g, categoryName)
    .replace(/\{eventName\}/g, categoryName) // Backward compatibility
    .replace(/\{amount\}/g, formattedAmount)
    .replace(/\{dueDate\}/g, effectiveDueDate)
    .replace(/\{orgName\}/g, orgName)
    .replace(/\{paymentLink\}/g, paymentLink || "(Payment Link)")
    .replace(/\{qrCode\}/g, qrHtmlTag || "(QR Code Attached)");
}

/**
 * Retrieves all stored email sending logs (newest first).
 */
export function getEmailReminderLogs() {
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
      }
    }
  } catch (e) {
    console.warn("Could not read email reminder logs:", e);
  }
  return [];
}

/**
 * Saves a new email log entry.
 */
export function logEmailReminder(entry) {
  try {
    const existing = getEmailReminderLogs();
    const newRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sentDate: new Date().toISOString(),
      status: "Sent",
      ...entry,
    };
    const updated = [newRecord, ...existing].slice(0, 500); // keep last 500 logs
    localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(updated));
    return newRecord;
  } catch (e) {
    console.warn("Could not save email reminder log:", e);
    return null;
  }
}

/**
 * Clears email sending history.
 */
export function clearEmailReminderLogs() {
  try {
    localStorage.removeItem(EMAIL_LOGS_STORAGE_KEY);
  } catch (e) {}
}

/**
 * Checks if an email for this (contributionId, stage, cycleMonthYear) was already sent.
 * Prevents duplicates when scheduler runs multiple times.
 */
export function isDuplicateEmail(contributionId, stage, cycleMonthYear) {
  if (!contributionId) return false;
  const logs = getEmailReminderLogs();
  return logs.some(
    (log) =>
      String(log.contributionId) === String(contributionId) &&
      log.stage === stage &&
      log.cycleMonthYear === cycleMonthYear
  );
}

/**
 * Sends a Test Email using a category's template.
 */
export async function sendTestEmail({
  recipientEmail,
  categoryId,
  categoryName,
  templateType = "initial",
}) {
  const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  let orgName = "Unit 1A Residents Association";
  try {
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed.orgName) orgName = parsed.orgName;
    }
  } catch (e) {}

  const config = getPaymentQrConfig();
  const testAmount = 500;
  const { upiUri, qrImageUrl, receiverName, upiId } = generateDynamicPaymentQr({
    amount: testAmount,
    note: `Test Contribution for ${categoryName || "Category"}`,
    customConfig: config,
  });

  const template = resolveCategoryTemplate(categoryId, categoryName, templateType);

  const placeholderData = {
    memberName: "Alex Morgan",
    categoryName: categoryName || "Birthday",
    amount: testAmount,
    dueDate: dayjs().add(15, "day").format("DD/MM/YYYY"),
    orgName,
    paymentLink: upiUri,
    qrImageUrl,
  };

  const subject = interpolatePlaceholders(template.subject, placeholderData);
  const bodyText = interpolatePlaceholders(template.description, placeholderData);

  const formattedAmount = `₹${testAmount.toLocaleString("en-IN")}`;
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f6f9;margin:0;padding:24px;color:#1e293b;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg, #1e1a2e 0%, #4a3f6b 100%);padding:22px;text-align:center;color:#ffffff;">
      <span style="display:inline-block;padding:3px 10px;background:rgba(255,255,255,0.2);border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">TEST EMAIL PREVIEW</span>
      <h2 style="margin:0;font-size:19px;font-weight:700;">${subject}</h2>
      <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">Category: <strong>${categoryName || "Category"}</strong> | ${orgName}</p>
    </div>
    <div style="padding:26px 22px;">
      <div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-line;margin-bottom:20px;">
        ${bodyText}
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
        <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">Contribution Due</span>
        <span style="font-size:26px;font-weight:800;color:#0284c7;">${formattedAmount}</span>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;padding:10px;background:#ffffff;border:2px solid #0284c7;border-radius:12px;box-shadow:0 4px 12px rgba(2,132,199,0.1);">
          <img src="${qrImageUrl}" alt="Payment QR Code" width="180" height="180" style="display:block;margin:0 auto;" />
        </div>
        <p style="margin:6px 0 0 0;font-size:11px;color:#64748b;">UPI ID: <strong>${upiId}</strong> (${receiverName})</p>
      </div>
      <div style="text-align:center;">
        <a href="${upiUri}" style="background-color:#0284c7;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13px;display:inline-block;">Pay ${formattedAmount} via UPI</a>
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px;text-align:center;font-size:11px;color:#94a3b8;">
      This is a test notification generated from System Settings (${templateType === "initial" ? "Initial Template" : "Reminder Template"}).
    </div>
  </div>
</body>
</html>
  `.trim();

  // Dispatch via SendPaymentReminder API
  const res = await SendPaymentReminder({
    memberId: "test-preview-id",
    memberName: "Alex Morgan (Test)",
    recipientEmail: recipientEmail || "admin@example.com",
    categoryName: categoryName || "Birthday",
    amount: testAmount,
    upiId,
    receiverName,
    upiUri,
    qrImageUrl,
    emailHtml: htmlContent,
    isTest: true,
  });

  // Log in email reminder logs
  logEmailReminder({
    contributionId: "test",
    memberId: "test-preview-id",
    memberName: "Alex Morgan",
    recipientEmail: recipientEmail || "admin@example.com",
    categoryName: categoryName || "Birthday",
    eventName: "Test Event",
    amount: testAmount,
    stage: templateType === "initial" ? "Initial Email (Test)" : "Reminder (Test)",
    templateType,
    subject,
    status: "Delivered (Test)",
    cycleMonthYear: dayjs().format("YYYY-MM"),
  });

  return res;
}

/**
 * Automated Scheduler Runner:
 * 1. Initial Email -> Day 1 of every month to users with pending contributions
 * 2. Reminders every 10 days:
 *    - Reminder 1 -> Day 11
 *    - Reminder 2 -> Day 21
 *    - Reminder 3 -> Day 31
 * 3. Max reminders = 3
 * 4. Stop if contribution is Paid
 * 5. Deduplication: does not send duplicate emails if run multiple times.
 */
export async function evaluateAndRunScheduler(forcedDay = null) {
  const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  let settings = {
    enableMonthlyEmail: true,
    enableReminderEmail: true,
    reminderIntervalDays: 10,
    maxReminders: 3,
    orgName: "Unit 1A Residents Association",
  };

  try {
    if (rawSettings) {
      settings = { ...settings, ...JSON.parse(rawSettings) };
    }
  } catch (e) {}

  const today = dayjs();
  const currentDay = forcedDay !== null ? Number(forcedDay) : today.date();
  const currentMonthYear = today.format("YYYY-MM");

  // Determine stage based on day
  let targetStage = null;
  if (currentDay === 1) {
    targetStage = "Initial";
  } else if (currentDay >= 11 && currentDay < 21) {
    targetStage = "Reminder 1";
  } else if (currentDay >= 21 && currentDay < 31) {
    targetStage = "Reminder 2";
  } else if (currentDay >= 31 || currentDay === today.daysInMonth()) {
    targetStage = "Reminder 3";
  }

  // If no target stage matches (e.g. Day 5) and not forced, return early
  if (!targetStage) {
    return {
      status: "idle",
      message: `Scheduler checked: Day ${currentDay} is not an email dispatch day (Dispatches on Day 1, 11, 21, 31).`,
      processed: 0,
      dispatched: 0,
      skippedPaid: 0,
      skippedDuplicate: 0,
    };
  }

  if (targetStage === "Initial" && settings.enableMonthlyEmail === false) {
    return {
      status: "disabled",
      message: "Monthly Initial Email is disabled in Settings.",
      processed: 0,
      dispatched: 0,
      skippedPaid: 0,
      skippedDuplicate: 0,
    };
  }

  if (targetStage.startsWith("Reminder") && settings.enableReminderEmail === false) {
    return {
      status: "disabled",
      message: "Automated Reminders are disabled in Settings.",
      processed: 0,
      dispatched: 0,
      skippedPaid: 0,
      skippedDuplicate: 0,
    };
  }

  // Fetch active contributions, events, and members
  let allContributions = [];
  let allEvents = [];
  let allMembers = [];
  let allEventTypes = [];

  try {
    const [cRes, eRes, mRes, tRes] = await Promise.all([
      GetContributionsAsync().catch(() => []),
      GetEventsAsync().catch(() => []),
      GetMembersAsync().catch(() => []),
      GetEventTypesAsync().catch(() => []),
    ]);
    allContributions = Array.isArray(cRes) ? cRes : [];
    allEvents = Array.isArray(eRes) ? eRes : [];
    allMembers = Array.isArray(mRes) ? mRes : [];
    allEventTypes = Array.isArray(tRes) ? tRes : [];
  } catch (err) {
    console.error("Scheduler failed to fetch system data:", err);
  }

  // Maps for fast category lookup
  const eventMap = new Map(allEvents.map((e) => [String(e.eventId), e]));
  const memberMap = new Map(allMembers.map((m) => [String(m.memberId), m]));
  const eventTypeMap = new Map(allEventTypes.map((t) => [String(t.eventTypeId), t]));

  const qrConfig = getPaymentQrConfig();

  let dispatched = 0;
  let skippedPaid = 0;
  let skippedDuplicate = 0;

  for (const c of allContributions) {
    // 1. Skip if paid
    if (c.paymentStatus === "Paid") {
      skippedPaid++;
      continue;
    }

    const contributionId = c.contributionId;
    // 2. Prevent duplicate email in the current cycle
    if (isDuplicateEmail(contributionId, targetStage, currentMonthYear)) {
      skippedDuplicate++;
      continue;
    }

    // 3. Resolve Category
    const evt = eventMap.get(String(c.eventId));
    let categoryId = evt?.eventTypeId || c.eventTypeId || "";
    let categoryName = c.categoryName || evt?.eventTypeName || "";

    if (!categoryName && categoryId) {
      categoryName = eventTypeMap.get(String(categoryId))?.eventTypeName || "";
    }
    if (!categoryName) {
      categoryName = "General Contribution";
    }

    // 4. Resolve Member & Amount
    const mem = memberMap.get(String(c.memberId));
    const memberName = c.memberName || mem?.name || "Member";
    const recipientEmail =
      mem?.email || c.memberEmail || `${memberName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    const amount = Number(c.amount || c.totalAccumulated || 0);

    if (amount <= 0) continue;

    // 5. Generate Dynamic UPI URI & QR
    const { upiUri, qrImageUrl, receiverName, upiId } = generateDynamicPaymentQr({
      amount,
      note: `Contribution for ${categoryName}`,
      customConfig: qrConfig,
    });

    // 6. Resolve Category-Based Template
    const templateType = targetStage === "Initial" ? "initial" : "reminder";
    const template = resolveCategoryTemplate(categoryId, categoryName, templateType);

    const placeholderData = {
      memberName,
      categoryName,
      amount,
      dueDate: evt?.eventDate || dayjs().endOf("month").format("DD/MM/YYYY"),
      orgName: settings.orgName,
      paymentLink: upiUri,
      qrImageUrl,
    };

    const subject = interpolatePlaceholders(template.subject, placeholderData);
    const bodyText = interpolatePlaceholders(template.description, placeholderData);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f6f9;margin:0;padding:24px;color:#1e293b;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg, #1e1a2e 0%, #4a3f6b 100%);padding:22px;text-align:center;color:#ffffff;">
      <h2 style="margin:0;font-size:19px;font-weight:700;">${subject}</h2>
      <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">${settings.orgName}</p>
    </div>
    <div style="padding:26px 22px;">
      <div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-line;margin-bottom:20px;">
        ${bodyText}
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
        <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">Pending Amount</span>
        <span style="font-size:26px;font-weight:800;color:#0284c7;">₹${amount.toLocaleString("en-IN")}</span>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;padding:10px;background:#ffffff;border:2px solid #0284c7;border-radius:12px;box-shadow:0 4px 12px rgba(2,132,199,0.1);">
          <img src="${qrImageUrl}" alt="Payment QR Code" width="180" height="180" style="display:block;margin:0 auto;" />
        </div>
        <p style="margin:6px 0 0 0;font-size:11px;color:#64748b;">UPI ID: <strong>${upiId}</strong> (${receiverName})</p>
      </div>
      <div style="text-align:center;">
        <a href="${upiUri}" style="background-color:#0284c7;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13px;display:inline-block;">Pay ₹${amount.toLocaleString("en-IN")} via UPI</a>
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px;text-align:center;font-size:11px;color:#94a3b8;">
      Please ignore this email if you have already completed payment.
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      await SendPaymentReminder({
        memberId: c.memberId,
        memberName,
        recipientEmail,
        categoryId,
        categoryName,
        eventId: c.eventId,
        eventName: evt?.eventName || categoryName,
        amount,
        upiId,
        receiverName,
        upiUri,
        qrImageUrl,
        emailHtml,
        stage: targetStage,
      });

      logEmailReminder({
        contributionId,
        memberId: c.memberId,
        memberName,
        recipientEmail,
        categoryId,
        categoryName,
        eventName: evt?.eventName || categoryName,
        amount,
        stage: targetStage,
        templateType,
        subject,
        status: "Sent",
        cycleMonthYear: currentMonthYear,
      });

      dispatched++;
    } catch (e) {
      console.error(`Failed to send email to ${memberName}:`, e);
    }
  }

  return {
    status: "completed",
    stage: targetStage,
    currentDay,
    cycleMonthYear: currentMonthYear,
    totalContributions: allContributions.length,
    dispatched,
    skippedPaid,
    skippedDuplicate,
    message: `Scheduler finished for Day ${currentDay} (${targetStage}): ${dispatched} emails sent, ${skippedPaid} skipped (paid), ${skippedDuplicate} skipped (duplicate/already sent).`,
  };
}
