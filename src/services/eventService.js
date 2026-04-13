import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetEvents = async (params) => {
  try {
    const result = await getApi("/events", params);
    return result;
  } catch (error) {
    console.error('Error fetching events:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateEvent = async (data) => {
  try {
    const result = await postApi("/events", data);
    return result;
  } catch (error) {
    console.error('Error creating event:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateEvent = async (id, data) => {
  try {
    const result = await putApi(`/events/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating event:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteEvent = async (id) => {
  try {
    const result = await deleteApi(`/events/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting event:', error.response?.data || error.message);
    throw error;
  }
};
