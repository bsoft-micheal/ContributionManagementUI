import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getEventTypesAsync = async () => {
  return await getApi("/event-types/getAllEventTypeAsync");
};

export const createEventTypeAsync = async (data) => {
  return await postApi("/event-types/saveEventTypeAsync", data);
};

export const updateEventTypeAsync = async (id, data) => {
  return await putApi(`/event-types/updateEventTypeAsyncById/${id}`, data);
};

export const deleteEventTypeAsync = async (id) => {
  return await deleteApi(`/event-types/deleteEventTypeAsyncById/${id}`);
};
