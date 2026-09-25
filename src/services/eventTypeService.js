import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetEventTypesAsync = async () => {
  return await getApi("/event-types/getAllEventTypeAsync");
};

export const CreateEventTypeAsync = async (data) => {
  return await postApi("/event-types/saveEventTypeAsync", data);
};

export const UpdateEventTypeAsync = async (id, data) => {
  return await putApi(`/event-types/updateEventTypeAsyncById/${id}`, data);
};

export const DeleteEventTypeAsync = async (id) => {
  return await deleteApi(`/event-types/deleteEventTypeAsyncById/${id}`);
};
