import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getEventsAsync = async (params) => {
  let apiParams = undefined;
  if (params && (params.month !== undefined || params.year !== undefined)) {
    apiParams = {
      month: params.month === 0 ? null : params.month,
      year: params.year === 0 ? null : params.year,
    };
  }
  const result = await getApi("/events/getAllEventAsync", apiParams);
  return result || [];
};

export const createEventAsync = async (data) => {
  return await postApi("/events/saveEventAsync", data);
};

export const updateEventAsync = async (id, data) => {
  return await putApi(`/events/updateEventAsyncById/${id}`, data);
};

export const deleteEventAsync = async (id) => {
  return await deleteApi(`/events/deleteEventAsyncById/${id}`);
};

export const publishEventAsync = async (id) => {
  return await postApi(`/events/publishEventAsync/${id}`);
};

export const getEventByIdAsync = async (id) => {
  return await getApi(`/events/getEventAsyncById/${id}`);
};

export const sendEventRemindersAsync = async (eventId) => {
  return await postApi(`/events/sendRemindersAsync/${eventId}`);
};

export const sendRemindersForEventAsync = sendEventRemindersAsync;

export const previewContributionsAsync = async (data) => {
  return await postApi("/events/previewContributionsAsync", data);
};

export const getAvailableAmountInHandAsync = async (excludeEventId = null) => {
  const query = excludeEventId ? `?excludeEventId=${encodeURIComponent(excludeEventId)}` : "";
  return await getApi(`/events/getAvailableAmountInHandAsync${query}`);
};

export const getMonthlyRestrictionsAsync = async (month, year, excludeEventId = null) => {
  const params = { month, year };
  if (excludeEventId) params.excludeEventId = excludeEventId;
  return await getApi("/events/getMonthlyRestrictionsAsync", params);
};

/**
 * Checks whether an event has been published.
 * Draft / unpublished events return false.
 */
export const isEventPublished = (e) => {
  if (!e) return false;
  if (e.isDeleted) return false;

  const statusStr = String(e.status ?? "").trim().toLowerCase();

  // Explicit Draft check
  if (statusStr === "draft" || statusStr === "1") {
    return false;
  }

  // Explicit Published / Active / Completed / Planned status check
  if (
    statusStr === "published" ||
    statusStr === "active" ||
    statusStr === "completed" ||
    statusStr === "planned" ||
    statusStr === "6" ||
    statusStr === "3" ||
    statusStr === "4" ||
    statusStr === "2"
  ) {
    return true;
  }

  // If publishedAt timestamp is set and valid
  if (e.publishedAt && !String(e.publishedAt).includes("0001-01-01")) {
    return true;
  }

  // Non-empty status that is not draft
  return statusStr !== "" && statusStr !== "draft" && statusStr !== "1";
};

