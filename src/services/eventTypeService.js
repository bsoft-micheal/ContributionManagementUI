import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetEventTypesAsync = async () => {
  try {
    const result = await getApi("/event-types");
    return result;
  } catch (error) {
    console.error('Error fetching event types:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateEventTypeAsync = async (data) => {
  try {
    const result = await postApi("/event-types", data);
    return result;
  } catch (error) {
    console.error('Error creating event type:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateEventTypeAsync = async (id, data) => {
  try {
    const result = await putApi(`/event-types/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating event type:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteEventTypeAsync = async (id) => {
  try {
    const result = await deleteApi(`/event-types/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting event type:', error.response?.data || error.message);
    throw error;
  }
};
