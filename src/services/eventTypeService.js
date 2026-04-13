import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetEventTypes = async () => {
  try {
    const result = await getApi("/event-types");
    return result;
  } catch (error) {
    console.error('Error fetching event types:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateEventType = async (data) => {
  try {
    const result = await postApi("/event-types", data);
    return result;
  } catch (error) {
    console.error('Error creating event type:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateEventType = async (id, data) => {
  try {
    const result = await putApi(`/event-types/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating event type:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteEventType = async (id) => {
  try {
    const result = await deleteApi(`/event-types/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting event type:', error.response?.data || error.message);
    throw error;
  }
};
