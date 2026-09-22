import { getApi, postApi, putApi, deleteApi } from "./apiActions";

export const getSupportTicketsAsync = async (params) => {
  try {
    return await getApi("/support-tickets", params);
  } catch (error) {
    console.error("Error fetching support tickets:", error.response?.data || error.message);
    throw error;
  }
};

export const getSupportTicketByIdAsync = async (id) => {
  try {
    return await getApi(`/support-tickets/${id}`);
  } catch (error) {
    console.error("Error fetching support ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const createSupportTicketAsync = async (data) => {
  try {
    return await postApi("/support-tickets", data);
  } catch (error) {
    console.error("Error creating support ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const updateSupportTicketAsync = async (id, data) => {
  try {
    return await putApi(`/support-tickets/${id}`, data);
  } catch (error) {
    console.error("Error updating support ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const replySupportTicketAsync = async (id, data) => {
  try {
    return await postApi(`/support-tickets/${id}/reply`, data);
  } catch (error) {
    console.error("Error replying to ticket:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteSupportTicketAsync = async (id) => {
  try {
    return await deleteApi(`/support-tickets/${id}`);
  } catch (error) {
    console.error("Error deleting ticket:", error.response?.data || error.message);
    throw error;
  }
};
