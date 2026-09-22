import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const GetEventsAsync = async (params) => {
  try {
    let apiParams = undefined;
    if (params && (params.month !== undefined || params.year !== undefined)) {
      apiParams = {
        month: params.month === 0 ? null : params.month,
        year: params.year === 0 ? null : params.year,
      };
    }
    const result = await getApi("/events", apiParams);
    return result || [];
  } catch (error) {
    console.error('Error fetching events:', error.response?.data || error.message);
    throw error;
  }
};

export const CreateEventAsync = async (data) => {
  try {
    const result = await postApi("/events", data);
    return result;
  } catch (error) {
    console.error('Error creating event:', error.response?.data || error.message);
    throw error;
  }
};

export const UpdateEventAsync = async (id, data) => {
  try {
    const result = await putApi(`/events/${id}`, data);
    return result;
  } catch (error) {
    console.error('Error updating event:', error.response?.data || error.message);
    throw error;
  }
};

export const DeleteEventAsync = async (id) => {
  try {
    const result = await deleteApi(`/events/${id}`);
    return result;
  } catch (error) {
    console.error('Error deleting event:', error.response?.data || error.message);
    throw error;
  }
};

export const GetEventByIdAsync = async (id) => {
  try {
    const result = await getApi(`/events/${id}`);
    return result;
  } catch (error) {
    console.error('Error fetching event by ID:', error.response?.data || error.message);
    throw error;
  }
};
