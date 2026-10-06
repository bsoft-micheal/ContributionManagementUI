import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getEventTypesAsync = async (includeInactive = false) => {
  const data = await getApi("/event-types/getAllEventTypeAsync");
  if (!includeInactive && Array.isArray(data)) {
    return data.filter(
      (t) =>
        t.isActive !== false &&
        t.status !== "Inactive" &&
        !t.isDeleted &&
        t.isDeleted !== true
    );
  }
  return data || [];
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
