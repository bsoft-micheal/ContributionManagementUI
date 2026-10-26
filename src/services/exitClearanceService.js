import { getApi, postApi } from "./apiActions";

/**
 * Fetches the exit clearance queue with dynamic KPIs and optional filters.
 *
 * @param {object} params - Query filters (search, eventId, clearanceStatus, paymentStatus, fromDate, toDate).
 * @returns {Promise<object>} Response with { items, totalCount, kpis }.
 */
export const getExitClearanceQueueAsync = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.eventId) query.append("eventId", params.eventId);
  if (params.clearanceStatus) query.append("clearanceStatus", params.clearanceStatus);
  if (params.paymentStatus) query.append("paymentStatus", params.paymentStatus);
  if (params.fromDate) query.append("fromDate", params.fromDate);
  if (params.toDate) query.append("toDate", params.toDate);

  const qs = query.toString();
  return await getApi(`/exit-clearance${qs ? `?${qs}` : ""}`);
};

/**
 * Fetches the event-wise dues breakdown and payment history for a specific member clearance.
 *
 * @param {string} id - Exit clearance ID.
 * @returns {Promise<object>} Dues details with eventDues and paymentHistory.
 */
export const getExitClearanceDuesAsync = async (id) => {
  return await getApi(`/exit-clearance/${id}/dues`);
};

/**
 * Final Admin approval of a member's exit clearance.
 *
 * @param {string} id - Exit clearance ID.
 * @param {object} data - Payload containing approvalRemarks.
 * @returns {Promise<object>} Approved clearance summary.
 */
export const approveExitClearanceAsync = async (id, data = {}) => {
  return await postApi(`/exit-clearance/${id}/approve`, data);
};

/**
 * Fetches approved exit clearance history records.
 *
 * @param {object} params - Query filters (search, eventId, approvedBy, fromDate, toDate).
 * @returns {Promise<Array>} List of historical approval records.
 */
export const getExitClearanceHistoryAsync = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.eventId) query.append("eventId", params.eventId);
  if (params.approvedBy) query.append("approvedBy", params.approvedBy);
  if (params.fromDate) query.append("fromDate", params.fromDate);
  if (params.toDate) query.append("toDate", params.toDate);

  const qs = query.toString();
  return await getApi(`/exit-clearance/history${qs ? `?${qs}` : ""}`);
};

/**
 * Fetches snapshot details for a single exit history record.
 *
 * @param {string} id - Exit history ID.
 * @returns {Promise<object>} Historical snapshot details.
 */
export const getExitClearanceHistoryDetailAsync = async (id) => {
  return await getApi(`/exit-clearance/history/${id}`);
};
