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

export const getAvailableAmountInHandAsync = async () => {
  return await getApi("/events/getAvailableAmountInHandAsync");
};

